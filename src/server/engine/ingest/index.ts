import { CONFIG } from "@/contracts";
import type {
  IngestionReport,
  IngestOutput,
  IngestSource,
  LanguageId,
  RepoSnapshotKey,
  VirtualFileOrigin,
} from "@/contracts";
import { IngestionError } from "./types";
import type {
  ClassifiedEntry,
  RawArchive,
  ScopeDecision,
  ZipEntryMeta,
} from "./types";
import { parseGithubUrl } from "./url";
import { probeRepo } from "./probe";
import { resolveRef } from "./refs";
import { downloadArchive } from "./download";
import { computeSnapshot } from "./snapshot";
import { listEntries, inflateSelected } from "./unzip";
import { classifyEntry, DEFAULT_LANGUAGE_REGISTRY } from "./prune";
import { selectFiles } from "./priority";
import { detectScope, buildFingerprint, assertNotEmpty } from "./fingerprint";
import { extractNotebook, extractSfcScript } from "./special";
import { hasInjectionText, redactAndMaskCode } from "./secrets";

export * from "./types";
export * from "./url";
export * from "./probe";
export * from "./refs";
export * from "./download";
export * from "./snapshot";
export * from "./unzip";
export * from "./prune";
export * from "./priority";
export * from "./special";
export * from "./secrets";
export * from "./fingerprint";

/**
 * Điều phối toàn bộ quy trình Ingest Tầng 0 theo docs/spec/10_ENGINE_INGEST.md Mục 0..13
 */
export async function runIngest(
  src: IngestSource,
  signal?: AbortSignal
): Promise<IngestOutput> {
  const startTime = performance.now();

  const report: IngestionReport = {
    truncated: false,
    selective_fetch: false,
    code_file_count: 0,
    manifest_count: 0,
    omitted_node_count: 0,
    skipped: {
      garbage: 0,
      binary: 0,
      oversized: 0,
      unsupported_lang: 0,
      quota: 0,
      parse_error: 0,
    },
    warnings: [],
    degraded_mode: null,
    redacted_secret_count: 0,
    engine_ms: 0,
    ingest_ms: 0,
    suspicious_instruction_files: [],
  };

  let repo_name = "";
  let repo_key = "";
  let ref: string | null = null;
  let ref_label: string | null = null;
  let explicit_subdir = "";
  let downloadUrl = "";

  // 1. Phân giải thông tin ban đầu theo src.kind (Mục 1–3)
  if (src.kind === "GITHUB_URL") {
    const repoInfo = parseGithubUrl(src.repo_url);
    const probe = await probeRepo(repoInfo);
    const resolvedRef = await resolveRef(probe.owner, probe.repo);

    repo_name = probe.repo;
    repo_key = `${probe.owner}/${probe.repo}`;
    ref = resolvedRef.ref;
    ref_label = resolvedRef.ref_label;
    explicit_subdir = src.subdir_override ?? "";
    downloadUrl = resolvedRef.download_url;
  } else if (src.kind === "GITHUB_COMMIT") {
    repo_name = src.repo;
    repo_key = `${src.owner}/${src.repo}`;
    ref = src.sha;
    ref_label = null;
    explicit_subdir = src.subdir ?? "";
    downloadUrl = `https://codeload.github.com/${src.owner}/${src.repo}/zip/${src.sha}`;
  } else if (src.kind === "ZIP_UPLOAD") {
    repo_name = src.file_name.replace(/\.zip$/i, "");
    repo_key = repo_name;
    ref = null;
    ref_label = null;
    explicit_subdir = src.subdir_override ?? "";
  }

  // 2. Hẹn giờ và thử lại (ING-40, ING-44)
  const isGitHub = src.kind === "GITHUB_URL" || src.kind === "GITHUB_COMMIT";
  const maxAttempts = isGitHub ? 2 : 1;

  let rawArchive: RawArchive | null = null;
  let entryMetas: ZipEntryMeta[] | null = null;
  let classifiedEntries: ClassifiedEntry[] | null = null;
  let scopeDecision: ScopeDecision | null = null;
  let rawCodeMap: Map<string, string> | null = null;
  let manifests: Map<string, string> | null = null;
  let inflated_cap_hit = false;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.STREAM_RETRY_DELAY_MS)
      );
      // Reset số đo tạm để không cộng dồn giữa các lần thử
      report.skipped.garbage = 0;
      report.skipped.binary = 0;
      report.skipped.oversized = 0;
      report.skipped.unsupported_lang = 0;
      report.skipped.quota = 0;
      report.skipped.parse_error = 0;
      report.warnings = [];
    }

    const attemptController = new AbortController();
    let attemptTimedOut = false;
    const timeoutId = setTimeout(() => {
      attemptTimedOut = true;
      attemptController.abort();
    }, CONFIG.STREAM_TIMEOUT_MS);

    const onParentAbort = () => attemptController.abort();
    signal?.addEventListener("abort", onParentAbort);

    try {
      if (src.kind === "ZIP_UPLOAD") {
        rawArchive = {
          bytes: src.bytes,
          stream_cut: false,
          source: "ZIP",
        };
      } else {
        try {
          rawArchive = await downloadArchive(downloadUrl, attemptController.signal);
        } catch (dlErr) {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onParentAbort);
          if (attemptTimedOut) {
            throw new IngestionError(
              "ERR_STREAM_TIMEOUT",
              `Stream timeout downloading archive (${CONFIG.STREAM_TIMEOUT_MS}ms)`
            );
          }
          // downloadArchive (B02) đã tự thử lại 1 lần bên trong; lỗi từ downloadArchive ném thẳng (ING-44)
          throw dlErr;
        }
      }

      // Đọc mục lục zip: nếu zip hỏng ném ERR_STREAM_CORRUPTED (ING-63)
      // Đúng chữ ký: listEntries(a, signal, report)
      entryMetas = listEntries(rawArchive, attemptController.signal, report);

      // Phân loại entry (Mục 7)
      classifiedEntries = entryMetas.map((e) => {
        const { cls, language } = classifyEntry(
          e,
          DEFAULT_LANGUAGE_REGISTRY,
          report
        );
        return {
          ...e,
          cls,
          language,
        };
      });

      // Phạm vi monorepo & xếp file (Mục 8)
      scopeDecision = detectScope(
        classifiedEntries,
        explicit_subdir || null,
        report
      );

      const plan = selectFiles(classifiedEntries, scopeDecision, report);

      // Giải nén trong cùng lượt thử và dùng attemptController.signal (ING-40)
      const inflated = inflateSelected(
        rawArchive.bytes,
        plan,
        report,
        attemptController.signal
      );

      rawCodeMap = inflated.code;
      manifests = inflated.manifests;
      inflated_cap_hit = inflated.inflated_cap_hit;

      if (attemptTimedOut) {
        throw new IngestionError(
          "ERR_STREAM_TIMEOUT",
          `Stream timeout processing archive (${CONFIG.STREAM_TIMEOUT_MS}ms)`
        );
      }

      // Thành công cả lượt
      break;
    } catch (err) {
      lastError = err;

      if (signal?.aborted) {
        throw err;
      }

      if (err instanceof IngestionError) {
        if (
          err.code === "ERR_BRANCH_NOT_FOUND" ||
          err.code === "ERR_GITHUB_RATE_LIMIT_CDN" ||
          err.code === "ERR_REPO_UNAVAILABLE_451" ||
          err.code === "ERR_PREFLIGHT_404_OR_PRIVATE" ||
          err.code === "ERR_INVALID_GITHUB_URL" ||
          err.code === "ERR_EMPTY_REPOSITORY"
        ) {
          throw err;
        }
      }

      if (attemptTimedOut) {
        lastError = new IngestionError(
          "ERR_STREAM_TIMEOUT",
          `Stream timeout downloading or reading archive (${CONFIG.STREAM_TIMEOUT_MS}ms)`
        );
      }

      if (attempt >= maxAttempts - 1) {
        if (lastError instanceof IngestionError) {
          throw lastError;
        }
        throw new IngestionError(
          "ERR_STREAM_CORRUPTED",
          lastError instanceof Error
            ? lastError.message
            : "Archive corrupted or failed to process"
        );
      }
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onParentAbort);
    }
  }

  if (
    !rawArchive ||
    !entryMetas ||
    !classifiedEntries ||
    !scopeDecision ||
    !rawCodeMap ||
    !manifests
  ) {
    if (lastError instanceof IngestionError) {
      throw lastError;
    }
    throw new IngestionError(
      "ERR_STREAM_CORRUPTED",
      lastError instanceof Error
        ? lastError.message
        : "Archive corrupted or failed to download"
    );
  }

  // 3. Định danh phiên bản Snapshot (Mục 5)
  const snapshot: RepoSnapshotKey = computeSnapshot(rawArchive, {
    repo_key,
    ref,
    ref_label,
    explicit_subdir,
  });

  // Warning khi GitHub rơi vào ARCHIVE_HASH (T-ING-33)
  if (
    rawArchive.source === "GITHUB" &&
    snapshot.snapshot_id_kind === "ARCHIVE_HASH"
  ) {
    // Cau tam, spec chua co cau chu, cho nguoi giu spec chot
    const warn =
      "Kho lưu trữ GitHub không có commit SHA xác định; sử dụng mã băm nội dung làm khóa phiên.";
    if (!report.warnings.includes(warn)) {
      report.warnings.push(warn);
    }
  }

  // 4. Kiểm tra submodule cờ nội bộ (Mục 7)
  const has_submodules = entryMetas.some(
    (e) => e.path === ".gitmodules" || e.path === "/.gitmodules"
  );

  // Cập nhật truncated: stream_cut ∨ inflated_cap_hit ∨ skipped.quota > 0 (Mục 9 ý 5)
  if (rawArchive.stream_cut || inflated_cap_hit || report.skipped.quota > 0) {
    report.truncated = true;
    const warn = `Repository lớn — chỉ phân tích ${rawCodeMap.size} tệp mã nguồn được ưu tiên.`;
    if (!report.warnings.includes(warn)) {
      report.warnings.push(warn);
    }
  }

  // 8. Định dạng đặc biệt (Mục 10: .ipynb, .vue, .svelte)
  const codeMap = new Map<string, string>();
  const source_map = new Map<string, VirtualFileOrigin>();
  const file_language = new Map<string, LanguageId>();

  for (const [filePath, rawContent] of rawCodeMap.entries()) {
    if (filePath.endsWith(".ipynb")) {
      const nbRes = extractNotebook(filePath, rawContent, report);
      if (nbRes) {
        codeMap.set(nbRes.virtual_path, nbRes.code);
        source_map.set(nbRes.virtual_path, nbRes.origin);
        file_language.set(nbRes.virtual_path, "PYTHON");
      }
    } else if (filePath.endsWith(".vue") || filePath.endsWith(".svelte")) {
      const sfcRes = extractSfcScript(filePath, rawContent);
      if (sfcRes) {
        codeMap.set(sfcRes.virtual_path, sfcRes.code);
        source_map.set(sfcRes.virtual_path, sfcRes.origin);
        file_language.set(sfcRes.virtual_path, sfcRes.language);
      }
    } else {
      codeMap.set(filePath, rawContent);
      const matched = classifiedEntries.find((c) => c.path === filePath);
      if (matched?.language) {
        file_language.set(filePath, matched.language);
      } else {
        file_language.set(filePath, "TYPESCRIPT");
      }
    }
  }

  // 9. Che secret & gắn cờ injection (Mục 11)
  const suspiciousFilesSet = new Set<string>();

  for (const [filePath, content] of Array.from(codeMap.entries())) {
    if (hasInjectionText(content)) {
      suspiciousFilesSet.add(filePath);
    }

    const sanitized = redactAndMaskCode(content);
    if (!sanitized.linePreserved) {
      // Cau tam, spec chua co cau chu, cho nguoi giu spec chot
      report.warnings.push(
        `Tệp ${filePath} bị lệch dòng sau khi che bí mật nên bị loại bỏ.`
      );
      codeMap.delete(filePath);
      file_language.delete(filePath);
      source_map.delete(filePath);
      continue;
    }

    report.redacted_secret_count += sanitized.count;
    codeMap.set(filePath, sanitized.code);
  }

  // ING-113, ING-02: sort UTF-16 mặc định (không dùng localeCompare vì phụ thuộc locale)
  report.suspicious_instruction_files = Array.from(suspiciousFilesSet).sort();

  // 10. Vân tay dự án (Mục 12)
  const { fingerprint, module_info } = buildFingerprint(
    classifiedEntries,
    manifests,
    scopeDecision,
    report,
    DEFAULT_LANGUAGE_REGISTRY
  );

  // 11. Kiểm tra kết quả rỗng (Mục 13)
  const scopeCodeEntries = classifiedEntries.filter((e) => {
    const inScope =
      scopeDecision!.root_dir_offset === "" ||
      e.path.startsWith(scopeDecision!.root_dir_offset);
    return inScope && (e.cls === "CODE" || e.cls === "SPECIAL" || e.cls === "NO_GRAMMAR");
  });

  const totalScopeBytes = scopeCodeEntries.reduce((sum, e) => sum + e.size, 0);
  const noGrammarEntries = scopeCodeEntries.filter((e) => e.cls === "NO_GRAMMAR");
  const noGrammarBytes = noGrammarEntries.reduce((sum, e) => sum + e.size, 0);
  const unsupported_ratio =
    totalScopeBytes > 0 ? noGrammarBytes / totalScopeBytes : 0;

  let top_unsupported: LanguageId | null = null;
  if (noGrammarEntries.length > 0) {
    const bytesByNoGrammar = new Map<LanguageId, number>();
    for (const e of noGrammarEntries) {
      if (e.language) {
        bytesByNoGrammar.set(
          e.language,
          (bytesByNoGrammar.get(e.language) ?? 0) + e.size
        );
      }
    }
    let maxB = -1;
    for (const [lang, b] of bytesByNoGrammar.entries()) {
      if (b > maxB) {
        maxB = b;
        top_unsupported = lang;
      }
    }
  }

  // Đảm bảo tất định (ING-02): Sort Map theo key tăng dần (mặc định UTF-16)
  const sortedCode = new Map<string, string>();
  for (const k of Array.from(codeMap.keys()).sort()) {
    sortedCode.set(k, codeMap.get(k)!);
  }

  const sortedFileLanguage = new Map<string, LanguageId>();
  for (const k of Array.from(file_language.keys()).sort()) {
    sortedFileLanguage.set(k, file_language.get(k)!);
  }

  const sortedManifests = new Map<string, string>();
  for (const k of Array.from(manifests.keys()).sort()) {
    sortedManifests.set(k, manifests.get(k)!);
  }

  const sortedSourceMap = new Map<string, VirtualFileOrigin>();
  for (const k of Array.from(source_map.keys()).sort()) {
    sortedSourceMap.set(k, source_map.get(k)!);
  }

  report.code_file_count = sortedCode.size;
  report.manifest_count = sortedManifests.size;
  report.ingest_ms = Math.round(performance.now() - startTime);

  const out: IngestOutput = {
    repo_name,
    snapshot,
    fingerprint,
    report,
    code: sortedCode,
    file_language: sortedFileLanguage,
    manifests: sortedManifests,
    source_map: sortedSourceMap,
    module_info,
  };

  assertNotEmpty(out, {
    stream_cut: rawArchive.stream_cut,
    inflated_cap_hit,
    has_submodules,
    unsupported_ratio,
    top_unsupported,
  });

  return out;
}
