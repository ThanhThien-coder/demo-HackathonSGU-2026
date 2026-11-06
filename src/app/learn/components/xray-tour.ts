import type {
  ArchitecturalLayer,
  HybridArchitecturalNode,
  NodeAnalysisView,
} from "@/contracts";

/** D12 — logic thuần của tour X-Ray (UI-42). Không phụ thuộc React để test được. */

export type XrayStage = "ROLE" | "TOUR" | "SUMMARY";

export interface TourPosition {
  stage: XrayStage;
  step: number;
}

export const LAYER_LABELS: Record<ArchitecturalLayer, string> = {
  ENTRY_POINT: "Nhận yêu cầu",
  MIDDLEWARE: "Kiểm tra trung gian",
  BUSINESS_LOGIC: "Xử lý nghiệp vụ",
  DATA_ACCESS: "Truy cập dữ liệu",
  ALGO_SETUP: "Khởi tạo",
  ALGO_EXECUTION: "Vòng lặp chính",
  ALGO_TERMINATION: "Điều kiện dừng",
};

export function layerLabel(layer: ArchitecturalLayer): string {
  return LAYER_LABELS[layer] ?? layer;
}

export interface TourStepModel {
  step: number;
  layer: ArchitecturalLayer;
  file_path: string;
  line_start: number;
  line_end: number;
  /** `steps[k].text`; null ⇒ tên hàm (`function_name`). */
  text: string;
  hasWeakPoint: boolean;
  /** true ⇒ chưa có bản phân tích, tour dựng từ `trace_steps` và hiện shimmer. */
  pending: boolean;
}

/**
 * Dựng danh sách bước của tour.
 * - Có bản phân tích: theo `analysis.steps`, `text` null ⇒ `function_name`.
 * - Chưa có (null / "PENDING" / "FAILED"): dựng từ `node.trace_steps`.
 */
export function buildTourSteps(
  node: HybridArchitecturalNode | null | undefined,
  analysis: NodeAnalysisView | "PENDING" | "FAILED" | null | undefined
): TourStepModel[] {
  const trace = node?.trace_steps ?? [];
  const nameOf = (step: number) =>
    trace.find((t) => t.step_number === step)?.function_name ?? "";

  if (analysis && typeof analysis === "object" && analysis.steps?.length) {
    return analysis.steps.map((st) => ({
      step: st.step,
      layer: st.layer,
      file_path: st.file_path,
      line_start: st.line_start,
      line_end: st.line_end,
      text: st.text ?? nameOf(st.step),
      hasWeakPoint: analysis.weak_points?.some((wp) => wp.step === st.step) ?? false,
      pending: false,
    }));
  }

  return trace.map((t) => ({
    step: t.step_number,
    layer: t.layer,
    file_path: t.file_path,
    line_start: t.line_start,
    line_end: t.line_end,
    text: t.function_name,
    hasWeakPoint: false,
    pending: analysis !== "FAILED",
  }));
}

/** → : Thẻ vai trò ⇒ Bước đầu ⇒ … ⇒ Bước cuối ⇒ Tóm tắt (đứng yên). */
export function tourForward(pos: TourPosition, stepNumbers: number[]): TourPosition {
  if (stepNumbers.length === 0) return pos;
  if (pos.stage === "SUMMARY") return pos;
  if (pos.stage === "ROLE") return { stage: "TOUR", step: stepNumbers[0] };
  const idx = stepNumbers.indexOf(pos.step);
  if (idx < 0) return { stage: "TOUR", step: stepNumbers[0] };
  if (idx >= stepNumbers.length - 1) {
    return { stage: "SUMMARY", step: stepNumbers[stepNumbers.length - 1] };
  }
  return { stage: "TOUR", step: stepNumbers[idx + 1] };
}

/** ← : Tóm tắt ⇒ Bước cuối ⇒ … ⇒ Bước đầu ⇒ Thẻ vai trò (đứng yên). */
export function tourBackward(pos: TourPosition, stepNumbers: number[]): TourPosition {
  if (stepNumbers.length === 0) return pos;
  if (pos.stage === "ROLE") return pos;
  if (pos.stage === "SUMMARY") {
    return { stage: "TOUR", step: stepNumbers[stepNumbers.length - 1] };
  }
  const idx = stepNumbers.indexOf(pos.step);
  if (idx <= 0) return { stage: "ROLE", step: stepNumbers[0] };
  return { stage: "TOUR", step: stepNumbers[idx - 1] };
}

export interface KeyTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
}

/**
 * Phím ← → không chạy khi đang gõ trong ô nhập hoặc đang mở cửa sổ (UI 6.1).
 * Ô nhập chỉ đọc (vd. textarea ẩn của Monaco) không tính là đang gõ.
 */
export function shouldIgnoreTourKey(
  target: KeyTargetLike | null | undefined,
  dialogOpen: boolean
): boolean {
  if (dialogOpen) return true;
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return !target.readOnly;
  }
  return false;
}
