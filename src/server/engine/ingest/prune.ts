import * as path from "node:path";
import { CONFIG } from "@/contracts";
import type { IngestionReport, LanguageId } from "@/contracts";
import {
  LANGUAGE_REGISTRY,
  KNOWN_NO_GRAMMAR,
} from "../graph/registry";
import type {
  ZipEntryMeta,
  EntryClass,
  LanguageRegistry,
} from "./types";

export const DEFAULT_LANGUAGE_REGISTRY: LanguageRegistry = {
  adapters: LANGUAGE_REGISTRY,
  known_no_grammar: KNOWN_NO_GRAMMAR,
};

const GARBAGE_DIR_SET = new Set([
  "node_modules",
  ".git",
  ".github",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
  "vendor",
  "venv",
  ".venv",
  "env",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "target",
  "obj",
  ".gradle",
  ".idea",
  ".vscode",
  "pods",
  ".dart_tool",
]);

const GARBAGE_PATTERN =
  /(\.min\.(js|css)|\.d\.ts|\.map|\.lock|-lock\.json|\.pb\.go|_pb2\.py|\.generated\.\w+|\.g\.dart|\.freezed\.dart)$/i;

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "svg",
  "mp4",
  "mov",
  "mp3",
  "wav",
  "pdf",
  "zip",
  "gz",
  "jar",
  "exe",
  "dll",
  "so",
  "woff",
  "woff2",
  "ttf",
  "psd",
  "class",
  "pyc",
]);

const BASE_MANIFEST_BASENAMES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "Pipfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "pubspec.yaml",
  "Cargo.toml",
  "composer.json",
  "Gemfile",
];

/**
 * Phân loại entry theo docs/spec/10_ENGINE_INGEST.md Mục 7 (ING-70..77)
 */
export function classifyEntry(
  e: ZipEntryMeta,
  registry: LanguageRegistry = DEFAULT_LANGUAGE_REGISTRY,
  report?: IngestionReport
): { cls: EntryClass; language: LanguageId | null } {
  // ING-70
  if (e.is_dir || e.is_symlink) {
    if (report) {
      report.skipped.garbage++;
    }
    return { cls: "GARBAGE", language: null };
  }

  if (e.is_encrypted || (e.method !== 0 && e.method !== 8)) {
    if (report) {
      report.skipped.binary++;
    }
    return { cls: "GARBAGE", language: null };
  }

  const segments = e.path.split("/");
  const dirSegments = segments.slice(0, segments.length - 1);
  const basename = segments[segments.length - 1];

  // ING-71: Thư mục rác
  for (const dir of dirSegments) {
    if (GARBAGE_DIR_SET.has(dir.toLowerCase())) {
      if (report) {
        report.skipped.garbage++;
      }
      return { cls: "GARBAGE", language: null };
    }
  }

  // Chuẩn bị extension map & manifest basenames từ registry
  const extensionMap = new Map<string, LanguageId>();
  const manifestSet = new Set<string>(BASE_MANIFEST_BASENAMES);

  for (const adapter of registry.adapters) {
    for (const ext of adapter.extensions) {
      extensionMap.set(ext.toLowerCase(), adapter.id);
    }
    for (const mf of adapter.manifest_files) {
      manifestSet.add(mf);
    }
  }

  const ext = path.posix.extname(basename).toLowerCase();
  const extWithoutDot = ext.startsWith(".") ? ext.slice(1) : ext;

  // ING-72: Segment bin và đuôi không thuộc Language Registry
  const hasBinSegment = dirSegments.some((d) => d.toLowerCase() === "bin");
  if (hasBinSegment && !extensionMap.has(ext)) {
    if (report) {
      report.skipped.garbage++;
    }
    return { cls: "GARBAGE", language: null };
  }

  // ING-73: Minified, lock, generated hoặc binary media/archive
  if (GARBAGE_PATTERN.test(basename)) {
    if (report) {
      report.skipped.garbage++;
    }
    return { cls: "GARBAGE", language: null };
  }

  if (BINARY_EXTENSIONS.has(extWithoutDot)) {
    if (report) {
      report.skipped.binary++;
    }
    return { cls: "GARBAGE", language: null };
  }

  // ING-74: Manifest file
  if (
    manifestSet.has(basename) &&
    dirSegments.length <= CONFIG.MAX_MANIFEST_DEPTH
  ) {
    return { cls: "MANIFEST", language: null };
  }

  // ING-75: Định dạng đặc biệt
  if (ext === ".ipynb") {
    return { cls: "SPECIAL", language: "PYTHON" };
  }
  if (ext === ".vue" || ext === ".svelte") {
    return { cls: "SPECIAL", language: null };
  }

  // ING-76: Code thuộc Language Registry
  if (extensionMap.has(ext)) {
    return { cls: "CODE", language: extensionMap.get(ext)! };
  }

  // ING-77: Đuôi không có grammar
  if (registry.known_no_grammar[ext]) {
    if (report) {
      report.skipped.unsupported_lang++;
    }
    return { cls: "NO_GRAMMAR", language: registry.known_no_grammar[ext] };
  }

  // Còn lại
  return { cls: "OTHER", language: null };
}
