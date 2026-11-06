import * as path from "node:path";
import { CONFIG } from "@/contracts";
import type { IngestionReport } from "@/contracts";
import type {
  ClassifiedEntry,
  ScopeDecision,
  ZipEntryMeta,
} from "./types";

const ROLE_NAMES = new Set([
  "controller",
  "controllers",
  "route",
  "routes",
  "router",
  "routers",
  "handler",
  "handlers",
  "service",
  "services",
  "usecase",
  "usecases",
  "repository",
  "repositories",
  "repo",
  "repos",
  "model",
  "models",
  "entity",
  "entities",
  "schema",
  "schemas",
  "middleware",
  "middlewares",
  "api",
  "main",
  "app",
  "server",
  "index",
  "screen",
  "screens",
  "page",
  "pages",
  "view",
  "views",
  "activity",
  "activities",
  "fragment",
  "fragments",
  "command",
  "commands",
]);

const TEST_SEGMENTS = new Set([
  "test",
  "tests",
  "__tests__",
  "spec",
  "specs",
  "example",
  "examples",
  "demo",
  "demos",
  "e2e",
  "fixtures",
  "mocks",
  "__mocks__",
  "migrations",
  "seeds",
  "docs",
  "scripts",
  "testdata",
  "bench",
  "benches",
  "benchmark",
  "benchmarks",
]);

/**
 * Tách một chuỗi camelCase thành mảng các từ
 * Ví dụ: "apiClient" -> ["api", "Client"]
 */
function splitCamelCase(str: string): string[] {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean);
}

// Chỉ tính khi là segment đầu đường dẫn: src/integration/ thường là nghiệp vụ thật
const ROOT_TEST_SEGMENTS = new Set(["integration", "sample", "samples"]);

/** Đường dẫn có mang cờ test ING-87 không. Nơi duy nhất giữ luật này. */
export function isTestPath(filePath: string): boolean {
  const segments = filePath.split("/");
  // Từ src/main/ trở xuống là mã chạy thật: package như com/example/demo (mặc định của Spring Initializr)
  // không phải cờ test, chỉ xét tên file bên dưới (lỗi B-42)
  const mainIdx = segments.findIndex((seg, i) => i > 0 && seg === "main" && segments[i - 1] === "src");
  for (const [i, seg] of segments.entries()) {
    if (mainIdx >= 0 && i >= mainIdx) break;
    const lower = seg.toLowerCase();
    if (TEST_SEGMENTS.has(lower)) return true;
    if (i === 0 && ROOT_TEST_SEGMENTS.has(lower)) return true;
    if (seg.startsWith(".") && seg !== "." && seg !== "..") return true;
    if (lower.endsWith("_src")) return true;
  }

  const basename = segments[segments.length - 1] ?? "";
  const dotIdx = basename.lastIndexOf(".");
  const stem = (dotIdx > 0 ? basename.slice(0, dotIdx) : basename).toLowerCase();
  return (
    stem.endsWith(".test") ||
    stem.endsWith(".spec") ||
    stem.endsWith("_test") ||
    stem.startsWith("test_")
  );
}

/**
 * Tính điểm ưu tiên file FilePriorityScore (FPS) theo docs/spec/10_ENGINE_INGEST.md Mục 8 (ING-84, ING-87)
 */
export function filePriorityScore(
  filePath: string,
  size: number,
  scope: string
): number {
  const inScope = scope !== "" && filePath.startsWith(scope) ? 1 : 0;

  const segments = filePath.split("/");
  const depth = segments.length - 1;
  const depthTerm = 1 / (depth + 1);

  const dirSegments = segments.slice(0, segments.length - 1);
  const basename = segments[segments.length - 1];

  // 1. Kiểm tra vai trò
  // File trong scope chỉ xét các segment thư mục nằm sau offset scope (Mục 8 ý 7)
  let roleDirSegments: string[];
  if (inScope === 1) {
    const normalizedScope = scope.endsWith("/") ? scope : scope + "/";
    const afterScope = filePath.startsWith(normalizedScope)
      ? filePath.slice(normalizedScope.length)
      : filePath.slice(scope.length).replace(/^\//, "");
    const subSegments = afterScope.split("/");
    roleDirSegments = subSegments.slice(0, subSegments.length - 1);
  } else {
    roleDirSegments = dirSegments;
  }

  const dirMatchesRole = roleDirSegments.some((d) =>
    ROLE_NAMES.has(d.toLowerCase())
  );

  let stemMatchesRole = false;
  const ext = path.posix.extname(basename);
  const stem = ext ? basename.slice(0, -ext.length) : basename;

  // Tách stem theo dấu . _ -
  const rawParts = stem.split(/[._-]/).filter(Boolean);
  const tokens: string[] = [];
  for (const part of rawParts) {
    tokens.push(...splitCamelCase(part));
  }

  const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : "";
  if (
    ROLE_NAMES.has(stem.toLowerCase()) ||
    (lastToken && ROLE_NAMES.has(lastToken.toLowerCase()))
  ) {
    stemMatchesRole = true;
  }

  const hasRole = dirMatchesRole || stemMatchesRole;
  const roleScore = hasRole ? CONFIG.FPS_ROLE_NAME : 0;

  // 2. Cờ test (ING-87)
  const isTest = isTestPath(filePath);

  const testPenalty = isTest ? CONFIG.FPS_TEST_PENALTY : 0;

  // 3. Phạt file quá nhỏ (tiny)
  const tinyPenalty = size < CONFIG.FPS_TINY_BYTES ? CONFIG.FPS_TINY_PENALTY : 0;

  return (
    CONFIG.FPS_IN_SCOPE * inScope +
    roleScore +
    depthTerm +
    testPenalty +
    tinyPenalty
  );
}

function toZipEntryMeta(e: ClassifiedEntry): ZipEntryMeta {
  return {
    path: e.path,
    compressed_size: e.compressed_size,
    size: e.size,
    method: e.method,
    local_offset: e.local_offset,
    is_dir: e.is_dir,
    is_symlink: e.is_symlink,
    is_encrypted: e.is_encrypted,
  };
}

/**
 * Xếp ứng viên và lọc quá khổ theo docs/spec/10_ENGINE_INGEST.md Mục 8 (ING-88)
 */
// ING-02: so sánh theo mã UTF-16 như Array.prototype.sort mặc định; không dùng localeCompare (phụ thuộc locale máy).
function cmpUtf16(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function selectFiles(
  entries: ClassifiedEntry[],
  scope: ScopeDecision,
  report?: IngestionReport
): { manifests: ZipEntryMeta[]; ordered_candidates: ZipEntryMeta[] } {
  const manifests = entries
    .filter((e) => e.cls === "MANIFEST")
    .map(toZipEntryMeta);
  manifests.sort((a, b) => cmpUtf16(a.path, b.path));

  const codeCandidates = entries.filter(
    (e) => e.cls === "CODE" || e.cls === "SPECIAL"
  );

  const validCandidates: ZipEntryMeta[] = [];
  for (const c of codeCandidates) {
    const isNotebook = c.path.endsWith(".ipynb");
    const maxBytes = isNotebook
      ? CONFIG.MAX_NOTEBOOK_BYTES
      : CONFIG.MAX_SINGLE_FILE_BYTES;

    const exceedsSize = c.size > maxBytes;
    const exceedsRatio =
      c.compressed_size > 0 &&
      c.size / c.compressed_size > CONFIG.MAX_COMPRESSION_RATIO;

    if (exceedsSize || exceedsRatio) {
      if (report) {
        report.skipped.oversized++;
      }
      continue;
    }

    validCandidates.push(toZipEntryMeta(c));
  }

  const scored = validCandidates.map((entry) => ({
    entry,
    score: filePriorityScore(entry.path, entry.size, scope.root_dir_offset),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return cmpUtf16(a.entry.path, b.entry.path);
  });

  const ordered_candidates = scored.map((s) => s.entry);

  return { manifests, ordered_candidates };
}
