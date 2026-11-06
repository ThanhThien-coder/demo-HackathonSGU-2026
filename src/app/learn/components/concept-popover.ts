import type { HlRange } from "@/store/workbench";

/** D13 — logic thuần của thẻ khái niệm (UI-43). Không phụ thuộc React để test được. */

export interface SkillRangeLike {
  line_start: number;
  line_end: number;
}

/** "Xem dòng" ⇒ `ui.hl` = line_start–line_end của skills[i] (số dòng gốc), kind FOCUS. */
export function skillFocusRange(skill: SkillRangeLike): HlRange[] {
  return [
    { line_start: skill.line_start, line_end: skill.line_end, kind: "FOCUS" },
  ];
}

/** Esc đóng thẻ. */
export function shouldClosePopoverOnKey(key: string): boolean {
  return key === "Escape";
}

const EDGE = 12;
const GAP = 8;

/**
 * Vị trí thẻ cạnh chip: dưới chip, kẹp trong khung nhìn;
 * tràn đáy thì lật lên trên chip nếu đủ chỗ, không thì dán sát đáy.
 */
export function popoverPosition(
  anchor: { left: number; top: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): { left: number; top: number } {
  const left = Math.min(
    Math.max(EDGE, anchor.left),
    viewport.width - size.width - EDGE
  );
  let top = anchor.bottom + GAP;
  if (top + size.height > viewport.height - EDGE) {
    top =
      anchor.top - size.height - GAP >= EDGE
        ? anchor.top - size.height - GAP
        : Math.max(EDGE, viewport.height - size.height - EDGE);
  }
  return { left, top };
}
