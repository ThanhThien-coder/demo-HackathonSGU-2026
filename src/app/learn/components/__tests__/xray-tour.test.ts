import { describe, it, expect, beforeEach } from "vitest";
import { useWorkbenchStore } from "@/store/workbench";
import type { HybridArchitecturalNode, NodeAnalysisView } from "@/contracts";
import {
  buildTourSteps,
  layerLabel,
  shouldIgnoreTourKey,
} from "../xray-tour";

const STEPS = [1, 2, 3];

function resetTour(stage: "ROLE" | "TOUR" | "SUMMARY" = "TOUR", step = 1) {
  const s = useWorkbenchStore.getState();
  useWorkbenchStore.setState({
    active_node_id: "n1",
    active_tab: "XRAY",
    active_step: step,
    ui: { ...s.ui, xray_stage: stage },
  });
}

function pos() {
  const s = useWorkbenchStore.getState();
  return { stage: s.ui.xray_stage, step: s.active_step };
}

describe("T-UI-04 — Tour X-Ray: phím → / ← chuyển bước", () => {
  beforeEach(() => resetTour("TOUR", 1));

  it("Bài 3 bước: → 3 lần rồi ← 1 lần: Bước 1 ⇒ 2 ⇒ 3 ⇒ Tóm tắt ⇒ Bước 3", () => {
    const { tourNext, tourPrev } = useWorkbenchStore.getState();

    expect(pos()).toEqual({ stage: "TOUR", step: 1 });
    tourNext(STEPS);
    expect(pos()).toEqual({ stage: "TOUR", step: 2 });
    tourNext(STEPS);
    expect(pos()).toEqual({ stage: "TOUR", step: 3 });
    tourNext(STEPS);
    expect(pos().stage).toBe("SUMMARY");
    tourPrev(STEPS);
    expect(pos()).toEqual({ stage: "TOUR", step: 3 });
  });

  it("→ ở Tóm tắt không đi tiếp; ← ở Bước 1 về thẻ vai trò; → ở thẻ vai trò vào Bước 1", () => {
    const { tourNext, tourPrev } = useWorkbenchStore.getState();

    resetTour("SUMMARY", 3);
    tourNext(STEPS);
    expect(pos().stage).toBe("SUMMARY");

    resetTour("TOUR", 1);
    tourPrev(STEPS);
    expect(pos().stage).toBe("ROLE");

    tourNext(STEPS);
    expect(pos()).toEqual({ stage: "TOUR", step: 1 });
  });

  it("goToStep(n) mở lại bước n trong tour, kể cả khi đang ở Tóm tắt", () => {
    resetTour("SUMMARY", 3);
    useWorkbenchStore.getState().goToStep(2);
    expect(pos()).toEqual({ stage: "TOUR", step: 2 });
    expect(useWorkbenchStore.getState().active_tab).toBe("XRAY");
  });

  it("Chọn bài mới ⇒ quay về thẻ vai trò, bước 1", () => {
    resetTour("SUMMARY", 3);
    useWorkbenchStore.getState().setActiveNode("n2");
    expect(pos()).toEqual({ stage: "ROLE", step: 1 });
  });

  it("Đang gõ trong ô nhập hoặc đang mở cửa sổ ⇒ phím không đổi bước", () => {
    expect(shouldIgnoreTourKey({ tagName: "TEXTAREA" }, false)).toBe(true);
    expect(shouldIgnoreTourKey({ tagName: "INPUT" }, false)).toBe(true);
    expect(shouldIgnoreTourKey({ tagName: "DIV", isContentEditable: true }, false)).toBe(true);
    expect(shouldIgnoreTourKey({ tagName: "DIV" }, true)).toBe(true);
    // Ô nhập ẩn chỉ đọc của Monaco không tính là đang gõ
    expect(shouldIgnoreTourKey({ tagName: "TEXTAREA", readOnly: true }, false)).toBe(false);
    expect(shouldIgnoreTourKey({ tagName: "BODY" }, false)).toBe(false);
    expect(shouldIgnoreTourKey(null, false)).toBe(false);
  });
});

describe("buildTourSteps — dựng bước tour", () => {
  const node = {
    id: "n1",
    trace_steps: [
      { step_number: 1, layer: "ENTRY_POINT", file_path: "a.ts", function_name: "listProducts", line_start: 1, line_end: 5, snippet: "", snippet_line_map: [] },
      { step_number: 2, layer: "DATA_ACCESS", file_path: "b.ts", function_name: "findAll", line_start: 10, line_end: 20, snippet: "", snippet_line_map: [] },
    ],
  } as unknown as HybridArchitecturalNode;

  const analysis = {
    node_id: "n1",
    skills: [],
    architecture: { patterns: [], summary: "" },
    steps: [
      { step: 1, layer: "ENTRY_POINT", file_path: "a.ts", line_start: 1, line_end: 5, text: "Nhận yêu cầu." },
      { step: 2, layer: "DATA_ACCESS", file_path: "b.ts", line_start: 10, line_end: 20, text: null },
    ],
    strengths: [],
    weak_points: [{ skill: "ASYNC", step: 2, symbol: "findAll", what: "x", consequence: "y", file_path: "b.ts", line_start: 10, line_end: 20 }],
    shared_files: [],
    skeleton_only: false,
  } as unknown as NodeAnalysisView;

  it("Có bản phân tích: lấy chữ từ steps, text null ⇒ tên hàm, bước có điểm dở có cờ", () => {
    const steps = buildTourSteps(node, analysis);
    expect(steps.map((s) => s.step)).toEqual([1, 2]);
    expect(steps[0].text).toBe("Nhận yêu cầu.");
    expect(steps[1].text).toBe("findAll");
    expect(steps[0].hasWeakPoint).toBe(false);
    expect(steps[1].hasWeakPoint).toBe(true);
    expect(steps[0].pending).toBe(false);
  });

  it("Chưa có bản phân tích (PENDING / null): dựng từ trace_steps, đánh dấu đang phân tích", () => {
    for (const a of ["PENDING", null, "FAILED"] as const) {
      const steps = buildTourSteps(node, a);
      expect(steps.map((s) => s.step)).toEqual([1, 2]);
      expect(steps[0].text).toBe("listProducts");
      expect(steps[0].file_path).toBe("a.ts");
      expect(steps[0].pending).toBe(a !== "FAILED");
    }
  });

  it("Tên tầng tiếng Việt theo UI-42", () => {
    expect(layerLabel("ENTRY_POINT")).toBe("Nhận yêu cầu");
    expect(layerLabel("MIDDLEWARE")).toBe("Kiểm tra trung gian");
    expect(layerLabel("BUSINESS_LOGIC")).toBe("Xử lý nghiệp vụ");
    expect(layerLabel("DATA_ACCESS")).toBe("Truy cập dữ liệu");
    expect(layerLabel("ALGO_SETUP")).toBe("Khởi tạo");
    expect(layerLabel("ALGO_EXECUTION")).toBe("Vòng lặp chính");
    expect(layerLabel("ALGO_TERMINATION")).toBe("Điều kiện dừng");
  });
});
