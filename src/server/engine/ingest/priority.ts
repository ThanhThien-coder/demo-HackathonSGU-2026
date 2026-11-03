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
  let isTest = false;
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (TEST_SEGMENTS.has(lower)) {
      isTest = true;
      break;
    }
    if (seg.startsWith(".") && seg !== "." && seg !== "..") {
      isTest = true;
      break;
    }
    if (lower.endsWith("_src")) {
      isTest = true;
      break;
    }
  }

  if (!isTest) {
    const lowerStem = stem.toLowerCase();
    if (
      lowerStem.endsWith(".test") ||
      lowerStem.endsWith(".spec") ||
      lowerStem.endsWith("_test") ||
      lowerStem.startsWith("test_")
    ) {
      isTest = true;
    }
  }

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
