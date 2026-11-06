import { describe, it, expect, beforeEach } from "vitest";
import { useWorkbenchStore } from "@/store/workbench";
import { conceptCardOf } from "@/lib/concept-cards";
import {
  skillFocusRange,
  popoverPosition,
  shouldClosePopoverOnKey,
} from "../concept-popover";

describe("T-UI-06 — Thẻ khái niệm: Xem dòng · Esc", () => {
  // Chip DB_OPTIMIZATION ở bước 2, symbol = findById, dòng 17
  const skill = {
    skill: "DB_OPTIMIZATION",
    step: 2,
    symbol: "findById",
    reason: "Gọi findById trong vòng lặp.",
    file_path: "src/services/product.service.ts",
    line_start: 17,
    line_end: 17,
  };

  beforeEach(() => {
    const s = useWorkbenchStore.getState();
    useWorkbenchStore.setState({ ui: { ...s.ui, hl: [] } });
  });

  it("'Xem dòng' ⇒ ui.hl = line_start–line_end của skills[i], kind FOCUS (tô dòng 17)", () => {
    expect(skillFocusRange(skill)).toEqual([
      { line_start: 17, line_end: 17, kind: "FOCUS" },
    ]);
    useWorkbenchStore.getState().setHl(skillFocusRange(skill));
    expect(useWorkbenchStore.getState().ui.hl).toEqual([
      { line_start: 17, line_end: 17, kind: "FOCUS" },
    ]);
  });

  it("Mở thẻ là việc cục bộ: 0 token, 0 request (chỉ đọc bảng thẻ tĩnh)", () => {
    const before = JSON.stringify(useWorkbenchStore.getState().ui.pending);
    const card = conceptCardOf(skill.skill);
    expect(card?.title).toBe("Tối ưu truy vấn database");
    expect(JSON.stringify(useWorkbenchStore.getState().ui.pending)).toBe(before);
  });

  it("Esc đóng thẻ; phím khác không đóng", () => {
    expect(shouldClosePopoverOnKey("Escape")).toBe(true);
    expect(shouldClosePopoverOnKey("ArrowRight")).toBe(false);
    expect(shouldClosePopoverOnKey("Enter")).toBe(false);
  });

  it("Vị trí thẻ: nằm dưới chip, kẹp trong khung nhìn, lật lên trên khi tràn đáy", () => {
    const viewport = { width: 400, height: 600 };
    const size = { width: 300, height: 200 };

    // Chip gần mép phải ⇒ kẹp trái để không tràn
    const nearRight = popoverPosition(
      { left: 380, top: 100, bottom: 120 },
      size,
      viewport
    );
    expect(nearRight.left).toBe(400 - 300 - 12);
    expect(nearRight.top).toBe(120 + 8);

    // Chip gần đáy ⇒ lật lên trên chip
    const nearBottom = popoverPosition(
      { left: 20, top: 500, bottom: 520 },
      size,
      viewport
    );
    expect(nearBottom.left).toBe(20);
    expect(nearBottom.top).toBe(500 - 200 - 8);
  });
});
