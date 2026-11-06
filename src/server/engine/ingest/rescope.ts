import type { IngestOutput } from "@/contracts";
import { buildFingerprint } from "./fingerprint";
import { DEFAULT_LANGUAGE_REGISTRY } from "./prune";
import type { ClassifiedEntry, ScopeDecision } from "./types";

/**
 * Đường lùi khi scope tự chọn không dựng được bài (spec 10 Mục 8 ý 3, lỗi B-17).
 * Giữ danh sách entry đã phân loại và quyết định scope theo từng kết quả Ingest, trong tiến trình,
 * để `runEngine` thử ứng viên kế tiếp mà không tải lại zip.
 */
const scopeState = new WeakMap<
  IngestOutput,
  { entries: ClassifiedEntry[]; scope: ScopeDecision }
>();

export function rememberScope(
  out: IngestOutput,
  entries: ClassifiedEntry[],
  scope: ScopeDecision
): void {
  scopeState.set(out, { entries, scope });
}

/**
 * Các offset còn lại để thử, theo thứ tự: ứng viên (server rồi client, bytes giảm dần), cuối cùng "".
 * Rỗng khi scope là tường minh (người dùng đã chọn) hoặc không có thông tin.
 */
export function getScopeFallbacks(out: IngestOutput): string[] {
  const state = scopeState.get(out);
  if (!state || state.scope.explicit) return [];
  const current = state.scope.root_dir_offset;
  const list = state.scope.candidates.filter((c) => c !== current);
  if (current !== "") list.push("");
  return list;
}

/**
 * Dựng lại kết quả Ingest với scope khác, dùng lại code đã tải. Chỉ vân tay (ngôn ngữ, archetype,
 * framework tính trong scope) đổi; tập file đã nạp giữ nguyên.
 */
export function rescopeIngest(out: IngestOutput, offset: string): IngestOutput {
  const state = scopeState.get(out);
  if (!state) return out;

  const scope: ScopeDecision = { ...state.scope, root_dir_offset: offset };
  const report = structuredClone(out.report);
  const { fingerprint, module_info } = buildFingerprint(
    state.entries,
    out.manifests,
    scope,
    report,
    DEFAULT_LANGUAGE_REGISTRY
  );

  const next: IngestOutput = { ...out, fingerprint, module_info, report };
  scopeState.set(next, { entries: state.entries, scope });
  return next;
}
