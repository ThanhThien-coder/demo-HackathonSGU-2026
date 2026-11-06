// 10 Mục 0, 4A, 13 — runIngest: IngestSource ⇒ IngestOutput (code sạch trong RAM + vân tay).
import { CONFIG } from "@/contracts/config";
import type {
  IngestOutput, IngestSource, IngestionReport, LanguageId, RepoSnapshotKey, VirtualFileOrigin,
} from "@/contracts";
import { maskSensitiveWithCount } from "@/lib/moderation";
import { fail } from "../../errors";
import { buildFingerprint } from "./fingerprint";
import { downloadArchive, probeRepo, resolveRef } from "./github";
import { type ClassifiedEntry, type ScopeDecision, classifyEntry, detectScope, normalizeSubdir, selectFiles } from "./prune";
import { hasInjectionText, redactSecrets } from "./secrets";
import { autoScopeOffset, fetchBlobs, listTree } from "./selective";
import { extractNotebook, extractSfcScript } from "./special";
import { type ZipEntryMeta, computeArchiveHash, decodeAndFilter, looksLikeZip, readArchive, readEocdComment } from "./zip";
import { parseGithubUrl } from "./url";

const SHA40 = /^[0-9a-f]{40}$/;

/** ING-49: không dùng được đường tải chọn lọc ⇒ phân tích phần zip đã giữ. */
const WARN_NO_LISTING = "Không lấy được danh sách file, có thể thiếu thư mục chính.";

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
  /** ING-42: zip chỉ còn `MAX_STREAM_BYTES` byte đầu (không có mục lục, không có EOCD) — đọc tuần tự, snapshot theo ING-52. */
  stream_cut?: boolean;
  /** Cảnh báo đặt đầu danh sách (ING-49). */
  extra_warnings?: string[];
}

// ---------- Mục 6–9 (phần chọn): phân loại ⇒ phạm vi ⇒ xếp ứng viên ⇒ quota — dùng chung cho zip và tải chọn lọc ----------
interface Plan {
  entries: ClassifiedEntry[];   // đã phân loại, bỏ GARBAGE
  explicit: string | null;      // scope tường minh đã chuẩn hóa
  scope: ScopeDecision;
  manifests: ClassifiedEntry[]; // manifest được nhận
  chosen: ClassifiedEntry[];    // ứng viên được nhận, theo FPS giảm dần
  cap_hit: boolean;             // inflated_cap_hit
  has_submodules: boolean;
}

function planIngest(metas: ZipEntryMeta[], explicitSubdir: string | null, report: IngestionReport, selective: boolean): Plan {
  const entries: ClassifiedEntry[] = [];
  let hasSubmodules = false;
  for (const m of metas) {
    const c = classifyEntry(m);
    if (m.path === ".gitmodules") hasSubmodules = true;
    if (c.cls === "GARBAGE") { if (!m.is_dir) report.skipped.garbage++; continue; }
    if (c.cls === "NO_GRAMMAR") report.skipped.unsupported_lang++;
    entries.push({ ...m, ...c });
  }

  const explicit = explicitSubdir ? normalizeSubdir(explicitSubdir) : null;
  if (explicit) {
    const any = entries.some((e) => (e.cls === "CODE" || e.cls === "SPECIAL") && e.path.toLowerCase().startsWith(explicit.toLowerCase()));
    if (!any) return fail("ERR_NO_SOURCE_FILES_FOUND", { subdir: explicit, hint: "empty_subdir" }); // ING-80
  }
  const scope = detectScope(entries, explicit);
  report.warnings.push(...scope.warnings);
  if (selective && !explicit && scope.root_dir_offset === "") { // ING-47
    const offset = autoScopeOffset(entries);
    if (offset) {
      scope.root_dir_offset = offset;
      report.warnings.push(`Repo lớn — đang phân tích ${offset}; có thể chọn thư mục khác.`);
    }
  }
  const sel = selectFiles(entries, scope, report);

  // Mục 9: manifest trước, rồi ứng viên theo quota / trần byte; vượt trần byte ⇒ dừng toàn bộ, giữ file đã nhận
  const off = scope.root_dir_offset;
  let inflatedTotal = 0;
  const manifests = sel.manifests.filter((m) => {
    if (selective && m.path.includes("/") && !(off !== "" && m.path.startsWith(off))) return false; // ING-48: chỉ manifest ở gốc hoặc trong scope
    if (m.size > CONFIG.MAX_MANIFEST_BYTES) { report.warnings.push(`Manifest ${m.path} quá lớn, bỏ qua`); return false; }
    inflatedTotal += m.size;
    return true;
  });
  const chosen: ClassifiedEntry[] = [];
  let capHit = false;
  const cands = sel.ordered_candidates;
  for (let i = 0; i < cands.length; i++) {
    const e = cands[i];
    if (chosen.length >= CONFIG.MAX_CLEAN_FILES) { report.skipped.quota += cands.length - i; break; }
    if (inflatedTotal + e.size > CONFIG.MAX_INFLATED_BYTES) { capHit = true; report.skipped.quota += cands.length - i; break; }
    inflatedTotal += e.size;
    chosen.push(e);
  }
  return { entries, explicit, scope, manifests, chosen, cap_hit: capHit, has_submodules: hasSubmodules };
}

// ---------- Mục 9 (giải mã, che secret), 10, 12, 13: nội dung đã có trong RAM ⇒ IngestOutput ----------
interface BuildFlags {
  /** zip tải về bị cắt (ING-42); vẫn true khi tải chọn lọc thay thế cho nó */
  stream_cut: boolean;
  /** nội dung lấy bằng tải chọn lọc (ING-48) */
  selective: boolean;
}

function buildOutput(
  plan: Plan, raw: Map<string, Uint8Array>, ctx: ArchiveContext,
  snap: { snapshot_id: string; kind: RepoSnapshotKey["snapshot_id_kind"] },
  report: IngestionReport, t0: number, flags: BuildFlags,
): IngestOutput {
  const { entries, scope, chosen } = plan;
  const code = new Map<string, string>();
  const fileLanguage = new Map<string, LanguageId>();
  const sourceMap = new Map<string, VirtualFileOrigin>();
  const manifests = new Map<string, string>();
  const langBytes = new Map<LanguageId, number>();
  let redacted = 0;
  const suspicious: string[] = [];

  for (const m of plan.manifests) {
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
  report.selective_fetch = flags.selective;
  report.truncated = flags.stream_cut || plan.cap_hit || report.skipped.quota > 0; // Mục 9.5
  if (report.truncated) {
    const totalCode = entries.filter((e) => e.cls === "CODE" || e.cls === "SPECIAL").length;
    report.warnings.push(flags.selective
      ? `Repository lớn — chỉ phân tích ${sortedCode.size}/${totalCode} tệp mã nguồn được ưu tiên.` // ING-48
      : `Repository lớn — chỉ phân tích ${sortedCode.size} tệp mã nguồn được ưu tiên.`);
  }

  // Mục 13: ING-131, xét theo thứ tự
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
  if (sortedCode.size === 0 && (flags.stream_cut || plan.cap_hit)) return fail("ERR_STREAM_QUOTA_EXCEEDED"); // (1)
  if (ratio > CONFIG.UNSUPPORTED_LANGUAGE_RATIO) return fail("ERR_UNSUPPORTED_LANGUAGE", { language: topUnsupported ?? "?" }); // (2)
  if (ratio > 0 && sortedCode.size > 0) report.warnings.push(`Repo có code ${topUnsupported} chưa hỗ trợ, chỉ phân tích phần còn lại.`);
  if (sortedCode.size === 0) { // (3)
    const hint = plan.has_submodules ? "submodule" : noGrammarTotal > 0 ? "only_unsupported" : manifests.size > 0 ? "only_manifests" : "no_code";
    return fail("ERR_NO_SOURCE_FILES_FOUND", { hint });
  }

  const { fingerprint, module_info } = buildFingerprint(entries, manifests, scope, report, langBytes);
  report.ingest_ms = Math.round(performance.now() - t0);

  return {
    repo_name: ctx.repo_name,
    snapshot: {
      source: ctx.source, repo_key: ctx.repo_key, snapshot_id: snap.snapshot_id, snapshot_id_kind: snap.kind,
      subdir: plan.explicit ?? "", ref_label: ctx.ref_label,
    },
    fingerprint, report, code: sortedCode, file_language: sortedLang, manifests, source_map: sourceMap, module_info,
  };
}

/** Tầng 0 thuần (không mạng): zip bytes ⇒ IngestOutput. Dùng cho test và cho runIngest. */
export function processArchive(bytes: Uint8Array, ctx: ArchiveContext): IngestOutput {
  const t0 = performance.now();
  const report = newReport();
  if (ctx.extra_warnings) report.warnings.push(...ctx.extra_warnings);
  const cut = ctx.stream_cut === true;

  // Mục 5: snapshot (ING-50..52). Zip bị cắt không có EOCD ⇒ ING-52, băm đúng phần đã giữ.
  let snapshot_id = "";
  let kind: RepoSnapshotKey["snapshot_id_kind"] = "ARCHIVE_HASH";
  if (ctx.source === "GITHUB") {
    if (ctx.ref && SHA40.test(ctx.ref)) { snapshot_id = ctx.ref; kind = "COMMIT_SHA"; }
    else if (!cut) {
      const c = readEocdComment(bytes);
      if (c && SHA40.test(c)) { snapshot_id = c; kind = "COMMIT_SHA"; }
    }
  }
  if (!snapshot_id) {
    snapshot_id = computeArchiveHash(bytes);
    if (ctx.source === "GITHUB") report.warnings.push("Không đọc được mã commit của repo — dùng mã băm của file zip để nhận diện phiên bản.");
  }

  // Mục 6: mục lục (đọc tuần tự khi zip bị cắt hoặc mục lục hỏng) ⇒ chọn ⇒ giải nén
  const reader = readArchive(bytes, report, { force_streaming: cut });
  if (!reader) return ctx.source === "ZIP" ? fail("ERR_UPLOAD_INVALID") : fail("ERR_STREAM_CORRUPTED"); // ING-63
  const plan = planIngest(reader.entries, ctx.explicit_subdir, report, false);
  const raw = reader.inflate([...plan.manifests, ...plan.chosen]);
  return buildOutput(plan, raw, ctx, { snapshot_id, kind }, report, t0, { stream_cut: cut, selective: false });
}

// ---------- GitHub ----------
interface GithubTarget {
  owner: string;
  repo: string;
  url: string;                 // địa chỉ tải zip
  ref: string | null;          // nhánh / SHA; null ⇒ HEAD
  ref_label: string | null;
  explicit_subdir: string | null;
}

/** Mục 4A: danh sách cây + tải riêng từng file được chọn, trong hạn SELECTIVE_TIMEOUT_MS. null ⇒ lùi (ING-49). */
async function runSelective(g: GithubTarget, ctx: ArchiveContext): Promise<IngestOutput | null> {
  const t0 = performance.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CONFIG.SELECTIVE_TIMEOUT_MS);
  try {
    const listing = await listTree(g.owner, g.repo, g.ref, ctl.signal);
    if (!listing) return null;
    const report = newReport();
    const plan = planIngest(listing.entries, ctx.explicit_subdir, report, true);
    const raw = await fetchBlobs(g.owner, g.repo, listing.sha, [...plan.manifests, ...plan.chosen].map((e) => e.path), ctl.signal);
    if (!raw) return null;
    return buildOutput(plan, raw, ctx, { snapshot_id: listing.sha, kind: "COMMIT_SHA" }, report, t0, { stream_cut: true, selective: true });
  } finally {
    clearTimeout(timer);
  }
}

function ingestGithub(g: GithubTarget): Promise<IngestOutput> {
  const ctx: ArchiveContext = {
    repo_name: g.repo, repo_key: `${g.owner}/${g.repo}`.toLowerCase(), source: "GITHUB",
    ref: g.ref, ref_label: g.ref_label, explicit_subdir: g.explicit_subdir,
  };
  return downloadArchive(g.url, async (a) => {
    if (!a.stream_cut) return processArchive(a.bytes, ctx);
    const picked = await runSelective(g, ctx);
    if (picked) return picked;
    return processArchive(a.bytes, { ...ctx, stream_cut: true, extra_warnings: [WARN_NO_LISTING] });
  });
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
    return ingestGithub({
      owner: src.owner, repo: src.repo, url: `https://codeload.github.com/${src.owner}/${src.repo}/zip/${src.sha}`,
      ref: src.sha, ref_label: null, explicit_subdir: src.subdir || null,
    });
  }
  const info = parseGithubUrl(src.repo_url);
  const probe = await probeRepo(info);
  const ref = await resolveRef(probe.owner, probe.repo, probe.head_zip);
  return ingestGithub({
    owner: probe.owner, repo: probe.repo, url: ref.download_url,
    ref: ref.ref, ref_label: ref.ref_label, explicit_subdir: src.subdir_override,
  });
}
