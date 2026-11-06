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
import { selectiveFetch } from "./selective";
import {
  listEntries,
  listEntriesStreaming,
  inflateSelected,
  decodeAndFilter,
} from "./unzip";
import { classifyEntry, DEFAULT_LANGUAGE_REGISTRY } from "./prune";
import { selectFiles } from "./priority";
import { rememberScope } from "./rescope";
import {
  detectScope,
  buildFingerprint,
  buildProjectText,
  pickReadmeEntry,
  assertNotEmpty,
} from "./fingerprint";
import { extractNotebook, extractSfcScript } from "./special";
import { hasInjectionText, redactAndMaskCode } from "./secrets";

export * from "./types";
export * from "./url";
export * from "./probe";
export * from "./refs";
export * from "./download";
export * from "./snapshot";
export * from "./selective";
export * from "./unzip";
export * from "./prune";
export * from "./priority";
export * from "./special";
export * from "./secrets";
export * from "./fingerprint";
export * from "./rescope";

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

  let owner = "";
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
    const resolvedRef = await resolveRef(probe.owner, probe.repo, probe.head_zip);

    owner = probe.owner;
    repo_name = probe.repo;
    repo_key = `${probe.owner}/${probe.repo}`;
    ref = resolvedRef.ref;
    ref_label = resolvedRef.ref_label;
    explicit_subdir = src.subdir_override ?? "";
    downloadUrl = resolvedRef.download_url;
  } else if (src.kind === "GITHUB_COMMIT") {
    owner = src.owner;
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
  let readmeText: string | null = null; // ING-123; đường tải chọn lọc không có README (nằm ngoài phần đã tải)
  let snapshot: RepoSnapshotKey | null = null;
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
    let timeoutId = setTimeout(() => {
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

      let selectiveSuccess = false;
      if (rawArchive.stream_cut && isGitHub && owner && repo_name) {
        // Hủy timer STREAM_TIMEOUT_MS của attemptController trước khi chạy selectiveFetch (Mục 4A có trần SELECTIVE_TIMEOUT_MS riêng)
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onParentAbort);

        const selectiveRes = await selectiveFetch({
          owner,
          repo: repo_name,
          ref,
          ref_label,
          explicit_subdir,
          report,
          signal,
        });

        if (selectiveRes) {
          selectiveSuccess = true;
          report.selective_fetch = true;
          snapshot = selectiveRes.snapshot;
          entryMetas = selectiveRes.entryMetas;
          classifiedEntries = selectiveRes.classifiedEntries;
          scopeDecision = selectiveRes.scopeDecision;
          rawCodeMap = selectiveRes.rawCodeMap;
          manifests = selectiveRes.manifests;
          inflated_cap_hit = selectiveRes.inflated_cap_hit;
        } else {
          // ING-49 Lùi: cảnh báo + khôi phục timer để đọc zip đã giữ
          const warn = "Không lấy được danh sách file, có thể thiếu thư mục chính.";
          if (!report.warnings.includes(warn)) {
            report.warnings.push(warn);
          }
          timeoutId = setTimeout(() => {
            attemptTimedOut = true;
            attemptController.abort();
          }, CONFIG.STREAM_TIMEOUT_MS);
          signal?.addEventListener("abort", onParentAbort);
        }
      }

      if (!selectiveSuccess) {
        // Đọc mục lục zip: zip bị cắt (stream_cut) phải đọc bằng listEntriesStreaming (chỉ entry trọn vẹn), ING-49 lùi về đọc zip đã giữ
        entryMetas = rawArchive.stream_cut
          ? listEntriesStreaming(rawArchive.bytes, attemptController.signal, report)
          : listEntries(rawArchive, attemptController.signal, report);

        if (entryMetas.length === 0) {
          if (rawArchive.source === "GITHUB") {
            throw new IngestionError(
              "ERR_STREAM_CORRUPTED",
              "No valid zip entries found in GitHub archive"
            );
          } else {
            throw new IngestionError(
              "ERR_UPLOAD_INVALID",
              "No valid zip entries found in uploaded archive"
            );
          }
        }

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

        // README (ING-123): giải nén riêng, không vào code hay manifests, không tính số file
        readmeText = null;
        const readmeEntry = pickReadmeEntry(classifiedEntries, scopeDecision);
        if (readmeEntry) {
          const scratch = structuredClone(report);
          const res = inflateSelected(
            rawArchive.bytes,
            { manifests: [readmeEntry], ordered_candidates: [] },
            scratch,
            attemptController.signal
          );
          readmeText = res.manifests.get(readmeEntry.path) ?? null;
        }

        // Định danh phiên bản Snapshot (Mục 5)
        snapshot = computeSnapshot(rawArchive, {
          repo_key,
          ref,
          ref_label,
          explicit_subdir,
        });
      }

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
    !manifests ||
    !snapshot
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

  // Warning khi GitHub rơi vào ARCHIVE_HASH (T-ING-33)
  if (
    !report.selective_fetch &&
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
    if (!report.selective_fetch) {
      const warn = `Repository lớn — chỉ phân tích ${rawCodeMap.size} tệp mã nguồn được ưu tiên.`;
      if (!report.warnings.includes(warn)) {
        report.warnings.push(warn);
      }
    }
  }

  // 8. Định dạng đặc biệt (Mục 10: .ipynb, .vue, .svelte)
  const codeMap = new Map<string, string>();
  const source_map = new Map<string, VirtualFileOrigin>();
  const file_language = new Map<string, LanguageId>();

  // Mục 9 ý 4.6: file SPECIAL được B03 giải nén không kiểm minified ⇒ kiểm trên code ảo sau trích xuất.
  // decodeAndFilter tự cộng skipped.oversized khi bị loại.
  const passesMinifiedCheck = (code: string): boolean =>
    decodeAndFilter(new TextEncoder().encode(code), report, { check_minified: true }) !== null;
  const languageByPath = new Map(classifiedEntries.map((c) => [c.path, c.language] as const));

  for (const [filePath, rawContent] of rawCodeMap.entries()) {
    if (filePath.endsWith(".ipynb")) {
      const nbRes = extractNotebook(filePath, rawContent, report);
      if (nbRes && passesMinifiedCheck(nbRes.code)) {
        codeMap.set(nbRes.virtual_path, nbRes.code);
        source_map.set(nbRes.virtual_path, nbRes.origin);
        file_language.set(nbRes.virtual_path, "PYTHON");
      }
    } else if (filePath.endsWith(".vue") || filePath.endsWith(".svelte")) {
      const sfcRes = extractSfcScript(filePath, rawContent);
      if (sfcRes && passesMinifiedCheck(sfcRes.code)) {
        codeMap.set(sfcRes.virtual_path, sfcRes.code);
        source_map.set(sfcRes.virtual_path, sfcRes.origin);
        file_language.set(sfcRes.virtual_path, sfcRes.language);
      }
    } else {
      // Ứng viên code luôn có language từ classifyEntry (ING-76); không có thì bỏ, không đoán.
      const language = languageByPath.get(filePath);
      if (!language) continue;
      codeMap.set(filePath, rawContent);
      file_language.set(filePath, language);
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
    DEFAULT_LANGUAGE_REGISTRY,
    file_language
  );

  // Mô tả dự án cho tổng quan (ING-123)
  const projectText = buildProjectText(readmeText, manifests, scopeDecision, report);

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
    readme_excerpt: projectText.readme_excerpt,
    manifest_description: projectText.manifest_description,
  };

  rememberScope(out, classifiedEntries, scopeDecision);

  assertNotEmpty(out, {
    stream_cut: rawArchive.stream_cut,
    inflated_cap_hit,
    has_submodules,
    unsupported_ratio,
    top_unsupported,
  });

  return out;
}
