import { CONFIG } from "@/contracts/config";
import type { ErrorCode } from "@/contracts/errors";
import { ERROR_MESSAGES } from "@/lib/messages";

export interface SelectionRange {
  line_start: number;
  col_start: number;
  line_end: number;
  col_end: number;
}

export interface ExplainButtonState {
  visible: boolean;
  disabled: boolean;
  tooltip: string | null;
}

/**
 * Tạo khóa định danh duy nhất cho vùng chọn trong bước của bài học (D-82, UI-34, D19).
 * Định dạng: "{node_id}:{step_number}:{line_start}:{col_start}-{line_end}:{col_end}"
 */
export function explanationKey(
  nodeId: string,
  stepNumber: number,
  range: SelectionRange
): string {
  return `${nodeId}:${stepNumber}:${range.line_start}:${range.col_start}-${range.line_end}:${range.col_end}`;
}

/**
 * Trạng thái hiển thị của nút "Giải thích" theo vùng chọn và chế độ offline (D-82, UI-34, D19).
 * - Offline hoặc text.trim() rỗng ⇒ visible = false
 * - text.length > CONFIG.EXPLAIN_SELECTION_MAX_CHARS ⇒ disabled = true, tooltip "Chọn đoạn ngắn hơn"
 * - Còn lại bật, tooltip null
 */
export function explainButtonState(
  text: string,
  offline: boolean
): ExplainButtonState {
  if (offline || !text || text.trim() === "") {
    return {
      visible: false,
      disabled: false,
      tooltip: null,
    };
  }

  if (text.length > CONFIG.EXPLAIN_SELECTION_MAX_CHARS) {
    return {
      visible: true,
      disabled: true,
      tooltip: "Chọn đoạn ngắn hơn",
    };
  }

  return {
    visible: true,
    disabled: false,
    tooltip: null,
  };
}

/**
 * Rút gọn đoạn chọn thành tiêu đề popover (D-82, UI-34, D19):
 * Gộp khoảng trắng thành 1 dấu cách, dài hơn 40 ký tự ⇒ 40 ký tự đầu + "…".
 */
export function shortSelection(text: string): string {
  if (!text) return "";
  const collapsed = text.trim().replace(/\s+/g, " ");
  if (collapsed.length > 40) {
    return collapsed.slice(0, 40) + "…";
  }
  return collapsed;
}

/**
 * Chuyển mã lỗi thành câu thông điệp hiển thị trong popover giải thích đoạn chọn (spec/30_UI.md Mục 10, D19).
 * - ERR_AI_UNAVAILABLE ⇒ "AI đang bận — chưa giải thích được đoạn này."
 * - ERR_SELECTION_INVALID, ERR_EXPLAIN_LIMIT ⇒ ERROR_MESSAGES[code]
 * - Mã khác ⇒ ERROR_MESSAGES[code] hoặc "Chưa giải thích được đoạn này."
 */
export function explainErrorText(code?: ErrorCode | string | null): string {
  if (code === "ERR_AI_UNAVAILABLE") {
    return "AI đang bận — chưa giải thích được đoạn này.";
  }

  if (code === "ERR_SELECTION_INVALID") {
    return ERROR_MESSAGES.ERR_SELECTION_INVALID;
  }

  if (code === "ERR_EXPLAIN_LIMIT") {
    return ERROR_MESSAGES.ERR_EXPLAIN_LIMIT;
  }

  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }

  return "Chưa giải thích được đoạn này.";
}
