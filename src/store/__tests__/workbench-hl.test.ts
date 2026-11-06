import { beforeEach, describe, expect, it } from "vitest";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { useWorkbenchStore, type HlRange } from "../workbench";

const FOCUS: HlRange[] = [{ line_start: 17, line_end: 17, kind: "FOCUS" }];

describe("D14 — ui.hl (UI-32, UI-33)", () => {
  beforeEach(() => {
    const state = useWorkbenchStore.getState();
    useWorkbenchStore.setState({
      result: { nodes: shopApiFixture.nodes } as never,
      active_node_id: "slice-product-list",
      active_step: 1,
      ui: { ...state.ui, hl: [] },
    });
  });

  it("showWeakPoint: active_step = step rồi BAD đúng dòng symbol", () => {
    useWorkbenchStore.getState().showWeakPoint({ step: 2, symbol: "findById" });
    const state = useWorkbenchStore.getState();
    expect(state.active_step).toBe(2);
    expect(state.ui.hl).toEqual([{ line_start: 17, line_end: 17, kind: "BAD" }]);
  });

  it("showStrength: active_step = step rồi GOOD cả bước", () => {
    useWorkbenchStore.getState().showStrength(2);
    const state = useWorkbenchStore.getState();
    expect(state.active_step).toBe(2);
    expect(state.ui.hl).toEqual([{ line_start: 14, line_end: 20, kind: "GOOD" }]);
  });

  it("đổi bước ⇒ ui.hl = [], kể cả khi hàm khác gán thẳng active_step", () => {
    useWorkbenchStore.getState().setHl(FOCUS);
    useWorkbenchStore.getState().setActiveStep(2);
    expect(useWorkbenchStore.getState().ui.hl).toEqual([]);

    useWorkbenchStore.getState().setHl(FOCUS);
    useWorkbenchStore.setState({ active_step: 3 });
    expect(useWorkbenchStore.getState().ui.hl).toEqual([]);
  });

  it("giữ nguyên bước thì ui.hl không mất", () => {
    useWorkbenchStore.getState().setHl(FOCUS);
    useWorkbenchStore.getState().setActiveStep(1);
    expect(useWorkbenchStore.getState().ui.hl).toEqual(FOCUS);
  });

  it("đổi bài ⇒ ui.hl = []", () => {
    useWorkbenchStore.getState().showStrength(1);
    useWorkbenchStore.getState().setActiveNode("slice-cart");
    expect(useWorkbenchStore.getState().ui.hl).toEqual([]);
  });

  it("không có bài đang mở ⇒ không tô, không đổi bước", () => {
    useWorkbenchStore.setState({ active_node_id: null });
    useWorkbenchStore.getState().showStrength(2);
    const state = useWorkbenchStore.getState();
    expect(state.active_step).toBe(1);
    expect(state.ui.hl).toEqual([]);
  });
});
