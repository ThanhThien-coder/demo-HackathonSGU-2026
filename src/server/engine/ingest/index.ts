// 10 Mục 0, 13 — runIngest: IngestSource ⇒ IngestOutput (code sạch trong RAM + vân tay).
import { CONFIG } from "@/contracts/config";
import type {
  IngestOutput, IngestSource, IngestionReport, LanguageId, RepoSnapshotKey, VirtualFileOrigin,
} from "@/contracts";
import { maskSensitiveWithCount } from "@/lib/moderation";
import { fail } from "../../errors";
import { buildFingerprint } from "./fingerprint";
import { downloadArchive, probeRepo, resolveRef } from "./github";
import { ClassifiedEntry, classifyEntry, detectScope, normalizeSubdir, selectFiles } from "./prune";
import { hasInjectionText, redactSecrets } from "./secrets";
import { extractNotebook, extractSfcScript } from "./special";
import { computeArchiveHash, decodeAndFilter, inflateEntries, listEntries, looksLikeZip, readEocdComment } from "./zip";
import { parseGithubUrl } from "./url";

const SHA40 = /^[0-9a-f]{40}$/;

export const newReport = (): IngestionReport => ({
  truncated: false, selective_fetch: false, code_file_count: 0, manifest_count: 0, omitted_node_count: 0,
  skipped: { garbage: 0, binary: 0, oversized: 0, unsupported_lang: 0, quota: 0, parse_error: 0 },
  warnings: [], degraded_mode: null, redacted_secret_count: 0, engine_ms: 0, ingest_ms: 0, suspicious_instruction_files: [],
});

export interface ArchiveContext {
  repo_name: string;
  repo_key: string;
  source: "GITHUB" | "ZIP";
  ref: string | null;
  ref_label: string | null;
  explicit_subdir: string | null;
}

/** Tầng 0 thuần (không mạng): zip bytes ⇒ IngestOutput. Dùng cho test và cho runIngest. */
export function processArchive(bytes: Uint8Array, ctx: ArchiveContext): IngestOutput {
  const t0 = performance.now();
  const report = newReport();

  // Mục 5: snapshot (ING-50..52)
  let snapshot_id = "";
  let kind: RepoSnapshotKey["snapshot_id_kind"] = "ARCHIVE_HASH";
  if (ctx.source === "GITHUB") {
    if (ctx.ref && SHA40.test(ctx.ref)) { snapshot_id = ctx.ref; kind = "COMMIT_SHA"; }
    else {
      const c = readEocdComment(bytes);
      if (c && SHA40.test(c)) { snapshot_id = c; kind = "COMMIT_SHA"; }
    }
  }
  if (!snapshot_id) {
    snapshot_id = computeArchiveHash(bytes);
    if (ctx.source === "GITHUB") report.warnings.push("Không đọc được mã commit của repo — dùng mã băm của file zip để nhận diện phiên bản.");
  }

  // Mục 6–8
  const metas = listEntries(bytes, report);
  if (metas.length === 0) return ctx.source === "ZIP" ? fail("ERR_UPLOAD_INVALID") : fail("ERR_STREAM_CORRUPTED");
  const entries: ClassifiedEntry[] = [];
  let hasSubmodules = false;
  for (const m of metas) {
    const c = classifyEntry(m);
    if (m.path === ".gitmodules") hasSubmodules = true;
    if (c.cls === "GARBAGE") { if (!m.is_dir) report.skipped.garbage++; continue; }
    if (c.cls === "NO_GRAMMAR") report.skipped.unsupported_lang++;
    entries.push({ ...m, ...c });
  }

  const explicit = ctx.explicit_subdir ? normalizeSubdir(ctx.explicit_subdir) : null;
  if (explicit) {
    const any = entries.some((e) => (e.cls === "CODE" || e.cls === "SPECIAL") && e.path.toLowerCase().startsWith(explicit.toLowerCase()));
    if (!any) return fail("ERR_NO_SOURCE_FILES_FOUND", { subdir: explicit, hint: "empty_subdir" }); // ING-80
  }
  const scope = detectScope(entries, explicit);
  report.warnings.push(...scope.warnings);
  const sel = selectFiles(entries, scope, report);

  // Mục 9: chọn theo quota / trần byte rồi giải nén
  const chosen: ClassifiedEntry[] = [];
  let inflatedTotal = 0;
  let capHit = false;
  for (const e of sel.ordered_candidates) {
    if (chosen.length >= CONFIG.MAX_CLEAN_FILES) { report.skipped.quota++; continue; }
    if (inflatedTotal + e.size > CONFIG.MAX_INFLATED_BYTES) { capHit = true; report.skipped.quota++; continue; }
    inflatedTotal += e.size;
    chosen.push(e);
  }
  const manifestEntries = sel.manifests.filter((m) => {
    if (m.size > CONFIG.MAX_MANIFEST_BYTES) { report.warnings.push(`Manifest ${m.path} quá lớn, bỏ qua`); return false; }
    return true;
  });
  const raw = inflateEntries(bytes, [...manifestEntries, ...chosen]);

  const code = new Map<string, string>();
  const fileLanguage = new Map<string, LanguageId>();
  const sourceMap = new Map<string, VirtualFileOrigin>();
  const manifests = new Map<string, string>();
  const langBytes = new Map<LanguageId, number>();
  let redacted = 0;
  const suspicious: string[] = [];

  for (const m of manifestEntries) {
    const buf = raw.get(m.path);
    if (!buf) continue;
    const t = decodeAndFilter(buf, report, { check_minified: false });
    if (t !== null) manifests.set(m.path, t);
  }

  const addFile = (path: string, text: string, language: LanguageId, origin?: VirtualFileOrigin) => {
    const r = redactSecrets(text);
    const masked = maskSensitiveWithCount(r.code);
    if ((r.code.match(/\n/g)?.length ?? 0) !== (text.match(/\n/g)?.length ?? 0)) {
      report.warnings.push(`File ${path} bị bỏ vì không che được secret an toàn`);
      return;
    }
    redacted += r.count + masked.count;
    if (hasInjectionText(text)) suspicious.push(path);
    code.set(path, masked.text);
    fileLanguage.set(path, language);
    langBytes.set(language, (langBytes.get(language) ?? 0) + masked.text.length);
    if (origin) sourceMap.set(path, origin);
  };

  for (const e of chosen) { // chosen đã theo FPS; Map chèn theo path tăng dần ở bước sắp xếp cuối
    const buf = raw.get(e.path);
    if (!buf) continue;
    const isSpecial = e.cls === "SPECIAL";
    const t = decodeAndFilter(buf, report, { check_minified: !isSpecial });
    if (t === null) continue;
    if (isSpecial) {
      if (e.path.endsWith(".ipynb")) {
        const nb = extractNotebook(e.path, t, report);
        if (nb) { addFile(nb.virtual_path, nb.code, "PYTHON", nb.origin); }
      } else {
        const sfc = extractSfcScript(e.path, t);
        if (sfc) addFile(sfc.virtual_path, sfc.code, sfc.language, sfc.origin);
      }
      continue;
    }
    addFile(e.path, t, e.language!);
  }

  // ING-02: Map chèn theo path tăng dần
  const sortedCode = new Map([...code.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  const sortedLang = new Map([...fileLanguage.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));

  report.code_file_count = sortedCode.size;
  report.manifest_count = manifests.size;
  report.redacted_secret_count = redacted;
  report.suspicious_instruction_files = [...new Set(suspicious)].sort();
  report.truncated = capHit || report.skipped.quota > 0;
  if (report.truncated) report.warnings.push(`Repository lớn — chỉ phân tích ${sortedCode.size} tệp mã nguồn được ưu tiên.`);

  // Mục 13: ING-131
  const off = scope.root_dir_offset;
  const inScope = (p: string) => off === "" || p.startsWith(off);
  const noGrammarBytes = new Map<LanguageId, number>();
  let codeBytes = 0;
  for (const e of entries) {
    if (!inScope(e.path)) continue;
    if (e.cls === "NO_GRAMMAR") noGrammarBytes.set(e.language!, (noGrammarBytes.get(e.language!) ?? 0) + e.size);
    if (e.cls === "CODE" || e.cls === "SPECIAL" || e.cls === "NO_GRAMMAR") codeBytes += e.size;
  }
  const noGrammarTotal = [...noGrammarBytes.values()].reduce((a, b) => a + b, 0);
  const topUnsupported = [...noGrammarBytes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const ratio = codeBytes > 0 ? noGrammarTotal / codeBytes : 0;
  if (ratio > CONFIG.UNSUPPORTED_LANGUAGE_RATIO) return fail("ERR_UNSUPPORTED_LANGUAGE", { language: topUnsupported ?? "?" });
  if (ratio > 0 && sortedCode.size > 0) report.warnings.push(`Repo có code ${topUnsupported} chưa hỗ trợ, chỉ phân tích phần còn lại.`);
  if (sortedCode.size === 0) {
    const hint = hasSubmodules ? "submodule" : noGrammarTotal > 0 ? "only_unsupported" : manifests.size > 0 ? "only_manifests" : "no_code";
    return fail("ERR_NO_SOURCE_FILES_FOUND", { hint });
  }

  const { fingerprint, module_info } = buildFingerprint(entries, manifests, scope, report, langBytes);
  report.ingest_ms = Math.round(performance.now() - t0);

  return {
    repo_name: ctx.repo_name,
    snapshot: {
      source: ctx.source, repo_key: ctx.repo_key, snapshot_id, snapshot_id_kind: kind,
      subdir: explicit ?? "", ref_label: ctx.ref_label,
    },
    fingerprint, report, code: sortedCode, file_language: sortedLang, manifests, source_map: sourceMap, module_info,
  };
}

export async function runIngest(src: IngestSource): Promise<IngestOutput> {
  if (src.kind === "ZIP_UPLOAD") {
    if (src.bytes.byteLength > CONFIG.MAX_UPLOAD_BYTES) return fail("ERR_STREAM_QUOTA_EXCEEDED"); // ING-45
    if (!looksLikeZip(src.bytes)) return fail("ERR_UPLOAD_INVALID");
    const name = src.file_name.replace(/\.zip$/i, "");
    return processArchive(src.bytes, {
      repo_name: name, repo_key: src.file_name, source: "ZIP", ref: null, ref_label: null, explicit_subdir: src.subdir_override,
    });
  }
  if (src.kind === "GITHUB_COMMIT") {
    const bytes = await downloadArchive(`https://codeload.github.com/${src.owner}/${src.repo}/zip/${src.sha}`);
    return processArchive(bytes, {
      repo_name: src.repo, repo_key: `${src.owner}/${src.repo}`.toLowerCase(), source: "GITHUB", ref: src.sha,
      ref_label: null, explicit_subdir: src.subdir || null,
    });
  }
  const info = parseGithubUrl(src.repo_url);
  const probe = await probeRepo(info);
  const ref = await resolveRef(probe.owner, probe.repo, probe.head_zip);
  const bytes = await downloadArchive(ref.download_url);
  return processArchive(bytes, {
    repo_name: probe.repo, repo_key: `${probe.owner}/${probe.repo}`.toLowerCase(), source: "GITHUB", ref: ref.ref,
    ref_label: ref.ref_label, explicit_subdir: src.subdir_override,
  });
}
