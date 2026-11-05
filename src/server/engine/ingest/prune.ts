// 10 Mục 7–8 — phân loại entry, phạm vi (monorepo), điểm ưu tiên file (FPS), chọn file.
import { CONFIG } from "@/contracts/config";
import type { IngestionReport, LanguageId } from "@/contracts";
import { KNOWN_NO_GRAMMAR, adapterByExt, allManifestFiles, extOf } from "../graph/registry";
import type { ZipEntryMeta } from "./zip";

export type EntryClass = "GARBAGE" | "MANIFEST" | "CODE" | "SPECIAL" | "NO_GRAMMAR" | "OTHER";
export interface ClassifiedEntry extends ZipEntryMeta { cls: EntryClass; language: LanguageId | null }

const GARBAGE_DIRS = new Set(("node_modules .git .github dist build out .next .nuxt .turbo coverage vendor venv .venv env __pycache__ " +
  ".pytest_cache .mypy_cache target obj .gradle .idea .vscode Pods .dart_tool __macosx").split(" "));
const GARBAGE_NAME = /(\.min\.(js|css)|\.d\.ts|\.map|\.lock|-lock\.json|\.pb\.go|_pb2\.py|\.generated\.\w+|\.g\.dart|\.freezed\.dart)$/i;
const GARBAGE_EXT = new Set("png jpg jpeg gif webp ico svg mp4 mov mp3 wav pdf zip gz jar exe dll so woff woff2 ttf psd class pyc".split(" "));
const MANIFEST_NAMES = new Set(["package.json", "tsconfig.json", "jsconfig.json", "requirements.txt", "pyproject.toml", "setup.py",
  "Pipfile", "pom.xml", "build.gradle", "build.gradle.kts", "go.mod", "pubspec.yaml", "Cargo.toml", "composer.json", "Gemfile"]);

export function classifyEntry(e: ZipEntryMeta): { cls: EntryClass; language: LanguageId | null } {
  if (e.is_dir) return { cls: "GARBAGE", language: null };
  const segs = e.path.split("/");
  const base = segs[segs.length - 1];
  const dirs = segs.slice(0, -1).map((s) => s.toLowerCase());
  if (dirs.some((d) => GARBAGE_DIRS.has(d))) return { cls: "GARBAGE", language: null }; // ING-71
  const ext = extOf(e.path);
  if (dirs.includes("bin") && !adapterByExt(ext)) return { cls: "GARBAGE", language: null }; // ING-72
  if (GARBAGE_NAME.test(base) || GARBAGE_EXT.has(ext.slice(1))) return { cls: "GARBAGE", language: null }; // ING-73
  const manifests = allManifestFiles();
  if ((MANIFEST_NAMES.has(base) || manifests.has(base)) && dirs.length <= CONFIG.MAX_MANIFEST_DEPTH) return { cls: "MANIFEST", language: null }; // ING-74
  if (ext === ".ipynb") return { cls: "SPECIAL", language: "PYTHON" }; // ING-75
  if (ext === ".vue" || ext === ".svelte") return { cls: "SPECIAL", language: null };
  const ad = adapterByExt(ext);
  if (ad) return { cls: "CODE", language: ad.id }; // ING-76
  if (KNOWN_NO_GRAMMAR[ext]) return { cls: "NO_GRAMMAR", language: KNOWN_NO_GRAMMAR[ext] }; // ING-77
  return { cls: "OTHER", language: null };
}

// ---------- vai trò, cờ test, FPS ----------
const ROLE_NAMES = new Set(("controller controllers route routes router routers handler handlers service services usecase usecases repository " +
  "repositories repo repos model models entity entities schema schemas middleware middlewares api main app server index screen screens " +
  "page pages view views activity activities fragment fragments command commands").split(" "));
const TEST_SEGS = new Set(("test tests __tests__ spec specs example examples demo demos e2e fixtures integration sample samples mocks " +
  "__mocks__ migrations seeds docs scripts testdata bench benches benchmark benchmarks").split(" "));

export const splitStem = (name: string): string[] =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s._-]+/).filter(Boolean).map((s) => s.toLowerCase());

export function hasRoleName(path: string): boolean {
  const segs = path.split("/");
  const base = segs[segs.length - 1];
  const stem = base.slice(0, base.lastIndexOf(".") > 0 ? base.lastIndexOf(".") : undefined);
  if (segs.slice(0, -1).some((s) => ROLE_NAMES.has(s.toLowerCase()))) return true;
  const toks = splitStem(stem);
  return toks.length > 0 && (ROLE_NAMES.has(toks[toks.length - 1]) || ROLE_NAMES.has(toks.join("")));
}

/** ING-87 */
export function isTestPath(path: string): boolean {
  const segs = path.split("/");
  const base = segs[segs.length - 1];
  const stem = base.slice(0, base.lastIndexOf(".") > 0 ? base.lastIndexOf(".") : undefined);
  if (segs.slice(0, -1).some((s) => TEST_SEGS.has(s.toLowerCase()) || s.startsWith(".") || s.endsWith("_src"))) return true;
  return /\.(test|spec)$/.test(stem) || /_test$/.test(stem) || stem.startsWith("test_");
}

export function filePriorityScore(path: string, size: number, scope: string): number {
  const depth = path.split("/").length - 1;
  return CONFIG.FPS_IN_SCOPE * (scope !== "" && path.startsWith(scope) ? 1 : 0)
    + CONFIG.FPS_ROLE_NAME * (hasRoleName(path) ? 1 : 0)
    + 1 / (depth + 1)
    + CONFIG.FPS_TEST_PENALTY * (isTestPath(path) ? 1 : 0)
    + CONFIG.FPS_TINY_PENALTY * (size < CONFIG.FPS_TINY_BYTES ? 1 : 0);
}

// ---------- phạm vi / monorepo ----------
export interface ScopeDecision { root_dir_offset: string; is_monorepo: boolean; candidates: string[]; explicit: boolean; warnings: string[] }
const SERVER_NAMES = new Set(["server", "backend", "api"]);
const CLIENT_NAMES = new Set(["client", "frontend", "web", "ui", "mobile", "webapp", "app-web"]);

const underDir = (e: ClassifiedEntry, d: string) => e.path.startsWith(d);
const sumBytes = (entries: ClassifiedEntry[], d: string) =>
  entries.filter((e) => (e.cls === "CODE" || e.cls === "SPECIAL") && underDir(e, d)).reduce((a, e) => a + e.size, 0);

export function normalizeSubdir(s: string): string {
  const t = s.trim().replace(/\\/g, "/").replace(/^\.?\/+/, "").replace(/\/+$/, "");
  return t ? `${t}/` : "";
}

export function detectScope(entries: ClassifiedEntry[], explicitSubdir: string | null): ScopeDecision {
  const code = entries.filter((e) => e.cls === "CODE" || e.cls === "SPECIAL");
  const dirsLower = new Map<string, string>(); // lowercase ⇒ tên thật
  for (const e of entries) {
    const segs = e.path.split("/").slice(0, -1);
    for (let i = 1; i <= segs.length; i++) { const d = `${segs.slice(0, i).join("/")}/`; dirsLower.set(d.toLowerCase(), d); }
  }
  const warnings: string[] = [];
  const manifestDirs = new Set(entries.filter((e) => e.cls === "MANIFEST").map((e) => e.path.split("/").slice(0, -1).join("/") + "/"));
  const hasManifest = (d: string) => manifestDirs.has(d);

  const candidates: Array<{ dir: string; kind: "server" | "client" }> = [];
  const topDirs = new Set(code.map((e) => e.path.split("/")[0]).filter((s) => code.some((c) => c.path.startsWith(`${s}/`))));
  for (const t of topDirs) {
    const lower = t.toLowerCase();
    if (SERVER_NAMES.has(lower)) candidates.push({ dir: `${t}/`, kind: "server" });
    if (CLIENT_NAMES.has(lower) || /-(web|client|ui|mobile)$/.test(lower)) candidates.push({ dir: `${t}/`, kind: "client" });
  }
  for (const group of ["apps", "packages", "services"]) {
    const subs = new Set(code.filter((e) => e.path.startsWith(`${group}/`)).map((e) => e.path.split("/")[1]).filter(Boolean));
    for (const s of subs) {
      const dir = `${group}/${s}/`;
      const lower = s.toLowerCase();
      const isServer = SERVER_NAMES.has(lower) || /-(api|server|backend)$/.test(lower);
      const isClient = CLIENT_NAMES.has(lower) || /-(web|client|ui|mobile)$/.test(lower);
      if (group === "services" && hasManifest(dir)) candidates.push({ dir, kind: "server" });
      else if (isServer && hasManifest(dir)) candidates.push({ dir, kind: "server" });
      else if (isClient && group !== "services") candidates.push({ dir, kind: "client" });
    }
  }

  const servers = candidates.filter((c) => c.kind === "server").sort((a, b) => sumBytes(entries, b.dir) - sumBytes(entries, a.dir) || (a.dir < b.dir ? -1 : 1));
  const clients = candidates.filter((c) => c.kind === "client");
  const total = code.reduce((a, e) => a + e.size, 0);

  let offset = "";
  let mono = false;
  if (explicitSubdir !== null && explicitSubdir !== "") {
    const real = dirsLower.get(explicitSubdir.toLowerCase()) ?? explicitSubdir;
    offset = real;
    mono = (clients.length >= 1 && servers.length >= 1) || servers.length >= 2;
    return { root_dir_offset: offset, is_monorepo: mono, candidates: candidates.map((c) => c.dir), explicit: true, warnings };
  }
  if ((clients.length >= 1 && servers.length >= 1) || servers.length >= 2) {
    mono = true;
    offset = servers[0]?.dir ?? "";
  } else if (servers.length === 1 && clients.length === 0 && total > 0 && sumBytes(entries, servers[0].dir) / total > CONFIG.MONOREPO_DOMINANT_RATIO) {
    offset = servers[0].dir;
  }
  if (servers.length >= 2) {
    warnings.push(`Phát hiện nhiều thư mục backend: ${servers.map((s) => s.dir).join(", ")}. Đang phân tích ${offset}; có thể chọn thư mục khác.`);
  }
  return { root_dir_offset: offset, is_monorepo: mono, candidates: [...servers, ...clients].map((c) => c.dir), explicit: false, warnings };
}

export interface FileSelection { manifests: ClassifiedEntry[]; ordered_candidates: ClassifiedEntry[] }

/** ING-88: bỏ file quá lớn / nén bất thường; sắp FPS giảm dần, hòa ⇒ path tăng dần. */
export function selectFiles(entries: ClassifiedEntry[], scope: ScopeDecision, report: IngestionReport): FileSelection {
  const manifests = entries.filter((e) => e.cls === "MANIFEST").sort((a, b) => (a.path < b.path ? -1 : 1));
  const cands: ClassifiedEntry[] = [];
  for (const e of entries) {
    if (e.cls !== "CODE" && e.cls !== "SPECIAL") continue;
    const cap = e.path.endsWith(".ipynb") ? CONFIG.MAX_NOTEBOOK_BYTES : CONFIG.MAX_SINGLE_FILE_BYTES;
    if (e.size > cap || (e.compressed_size > 0 && e.size / e.compressed_size > CONFIG.MAX_COMPRESSION_RATIO)) {
      report.skipped.oversized++;
      continue;
    }
    cands.push(e);
  }
  cands.sort((a, b) => {
    const d = filePriorityScore(b.path, b.size, scope.root_dir_offset) - filePriorityScore(a.path, a.size, scope.root_dir_offset);
    return d !== 0 ? d : a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });
  return { manifests, ordered_candidates: cands };
}
