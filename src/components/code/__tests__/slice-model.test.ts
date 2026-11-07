import { describe, it, expect } from "vitest";
import {
  buildDtoModel,
  buildFileTabs,
  buildStepModel,
  findStep,
  hlToModelRanges,
  stepGapAbove,
  stepHl,
  toOriginalSelection,
  weakPointHl,
} from "../slice-model";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import type { ExecutionTraceStep, HybridArchitecturalNode, NodeAnalysisView } from "@/contracts";

function makeStep(
  step_number: number,
  file_path: string,
  line_start: number,
  snippet: string,
  snippet_line_map: number[]
): ExecutionTraceStep {
  return {
    step_number,
    layer: "BUSINESS_LOGIC",
    file_path,
    function_name: `ham${step_number}`,
    line_start,
    line_end: line_start + snippet_line_map.length - 1,
    snippet,
    snippet_line_map,
  };
}

// Bài 3 file; file b.ts có 2 bước (bước 2, 3) để kiểm "tab giữ, code đổi theo bước".
const threeFileNode = {
  files: ["src/a.ts", "src/b.ts", "src/c.ts"],
  dto_snippet: "interface Dto {\n  id: string;\n}",
  trace_steps: [
    makeStep(1, "src/a.ts", 1, "a1();\na2();", [1, 2]),
    makeStep(2, "src/b.ts", 10, "b1();\n// … (3 dòng)\nb2();", [10, 0, 14]),
    makeStep(3, "src/b.ts", 40, "b3();", [40]),
    makeStep(4, "src/c.ts", 7, "c1();", [7]),
  ],
} as unknown as HybridArchitecturalNode;

const weakOnStep3 = {
  weak_points: [{ step: 3, what: "Gọi lặp trong vòng for" }],
} as unknown as NodeAnalysisView;

describe("T-UI-05 — Tab file và model theo bước (spec/30 Mục 5)", () => {
  it("sang bước ở file 2: tab file 2 mở, chỉ có snippet của bước đó", () => {
    const step = findStep(threeFileNode, 2);
    expect(step?.file_path).toBe("src/b.ts");

    const model = buildStepModel(threeFileNode, 2);
    expect(model.text).toBe("b1();\n// … (3 dòng)\nb2();");
    expect(model.text).not.toContain("a1();");
    expect(model.text).not.toContain("b3();");
    expect(model.text).not.toContain("c1();");
  });

  it("bấm tab file 3: active_step = bước đầu của file 3", () => {
    const tabs = buildFileTabs(threeFileNode, null);
    expect(tabs.map((t) => t.path)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(tabs.map((t) => t.name)).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(tabs[2].firstStep).toBe(4);
  });

  it("file có 2 bước: tab giữ nguyên, code đổi theo bước", () => {
    expect(findStep(threeFileNode, 2)?.file_path).toBe(findStep(threeFileNode, 3)?.file_path);
    expect(buildStepModel(threeFileNode, 3).text).toBe("b3();");
    expect(buildStepModel(threeFileNode, 3).text).not.toBe(buildStepModel(threeFileNode, 2).text);
    expect(buildFileTabs(threeFileNode, null)[1].firstStep).toBe(2);
  });

  it("chấm đỏ cho file có bước nằm trong weak_points", () => {
    expect(buildFileTabs(threeFileNode, weakOnStep3).map((t) => t.weak)).toEqual([false, true, false]);
    expect(buildFileTabs(threeFileNode, null).some((t) => t.weak)).toBe(false);
  });

  it("file không có bước nào: tab không có firstStep để bấm", () => {
    const node = { ...threeFileNode, files: [...threeFileNode.files, "src/khong-buoc.ts"] };
    expect(buildFileTabs(node, null)[3]).toMatchObject({ name: "khong-buoc.ts", firstStep: null });
  });

  it("bước ở file ngoài node.files vẫn có tab, để tab đang mở luôn tồn tại", () => {
    const node = { ...threeFileNode, files: ["src/a.ts"] };
    expect(buildFileTabs(node, null).map((t) => t.path)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("active_step lạ hoặc null: rơi về bước đầu", () => {
    expect(findStep(threeFileNode, null)?.step_number).toBe(1);
    expect(findStep(threeFileNode, 99)?.step_number).toBe(1);
    expect(findStep(null, 1)).toBeNull();
  });
});

describe("UI-31 — Số dòng gốc", () => {
  it("lineMap lấy từ snippet_line_map, marker = 0", () => {
    expect(buildStepModel(threeFileNode, 2).lineMap).toEqual([10, 0, 14]);
  });

  it("comment thật bắt đầu bằng // ... vẫn giữ số dòng gốc", () => {
    const node = {
      ...threeFileNode,
      trace_steps: [makeStep(1, "src/a.ts", 5, "// ...keep\na();", [5, 6])],
    } as unknown as HybridArchitecturalNode;
    expect(buildStepModel(node, 1).lineMap).toEqual([5, 6]);
  });

  it("đầu snippet bước 2 của slice-product-list có số 14", () => {
    const nodes = shopApiFixture.nodes as unknown as HybridArchitecturalNode[];
    const node = nodes.find((n) => n.id === "slice-product-list");
    expect(buildStepModel(node, 2).lineMap[0]).toBe(14);
  });

  it("snippet CRLF không để lại ký tự thừa, số dòng khớp lineMap", () => {
    const node = {
      ...threeFileNode,
      trace_steps: [makeStep(1, "src/a.ts", 1, "a();\r\nb();", [1, 2])],
    } as unknown as HybridArchitecturalNode;
    const model = buildStepModel(node, 1);
    expect(model.text).toBe("a();\nb();");
    expect(model.lineMap).toHaveLength(2);
  });

  it("dòng phía trên code: bỏ khi line_start = 1", () => {
    expect(stepGapAbove(findStep(threeFileNode, 1))).toBeNull();
    expect(stepGapAbove(findStep(threeFileNode, 2))).toBe("⋯ dòng 1–9 không thuộc bài học");
  });

  it("tab Kiểu dữ liệu không có số dòng", () => {
    const model = buildDtoModel(threeFileNode);
    expect(model.text).toBe("interface Dto {\n  id: string;\n}");
    expect(model.lineMap).toEqual([0, 0, 0]);
  });

  it("node rỗng trả model rỗng", () => {
    expect(buildStepModel(null, 1)).toEqual({ text: "", lineMap: [] });
    expect(buildDtoModel(null)).toEqual({ text: "", lineMap: [] });
  });
});

describe("T-UI-06, T-UI-07 — Tô đúng dòng (UI-32, UI-44)", () => {
  const nodes = shopApiFixture.nodes as unknown as HybridArchitecturalNode[];
  const n3 = nodes.find((n) => n.id === "slice-product-list");
  const step2 = findStep(n3, 2);
  const n3Model = buildStepModel(n3, 2);

  it("T-UI-06: kỹ năng symbol findById ở bước 2 ⇒ FOCUS tô dòng 17", () => {
    expect(hlToModelRanges(n3Model, [{ line_start: 17, line_end: 17, kind: "FOCUS" }])).toEqual([
      { startLine: 4, endLine: 4, kind: "FOCUS" },
    ]);
  });

  it("T-UI-07: điểm dở ⇒ BAD đúng dòng symbol", () => {
    expect(weakPointHl(step2, "findById")).toEqual([{ line_start: 17, line_end: 17, kind: "BAD" }]);
  });

  it("T-UI-07: so symbol như AI-18, bỏ gạch nối và hoa thường", () => {
    expect(weakPointHl(step2, "category_repo.find_by_id")).toEqual([
      { line_start: 17, line_end: 17, kind: "BAD" },
    ]);
  });

  it("T-UI-07: symbol không có trong snippet ⇒ BAD cả bước", () => {
    expect(weakPointHl(step2, "khongCoTrongBuoc")).toEqual([
      { line_start: 14, line_end: 20, kind: "BAD" },
    ]);
  });

  it("T-UI-07: điểm hay ⇒ GOOD cả bước", () => {
    const hl = stepHl(step2, "GOOD");
    expect(hl).toEqual([{ line_start: 14, line_end: 20, kind: "GOOD" }]);
    expect(hlToModelRanges(n3Model, hl)).toEqual([{ startLine: 1, endLine: 7, kind: "GOOD" }]);
  });

  it("symbol nằm ngay dòng marker thì bỏ qua marker, lấy dòng code", () => {
    const node = {
      ...threeFileNode,
      trace_steps: [makeStep(1, "src/a.ts", 10, "// … save (2 dòng)\nsave();", [0, 13])],
    } as unknown as HybridArchitecturalNode;
    expect(weakPointHl(findStep(node, 1), "save")).toEqual([
      { line_start: 13, line_end: 13, kind: "BAD" },
    ]);
  });

  it("dải có marker xen giữa vẫn phủ liền từ dòng đầu tới dòng cuối", () => {
    expect(
      hlToModelRanges(buildStepModel(threeFileNode, 2), [{ line_start: 10, line_end: 14, kind: "BAD" }])
    ).toEqual([{ startLine: 1, endLine: 3, kind: "BAD" }]);
  });

  it("dải nằm ngoài code đang xem hoặc tab Kiểu dữ liệu ⇒ không tô", () => {
    const hl = [{ line_start: 999, line_end: 999, kind: "FOCUS" as const }];
    expect(hlToModelRanges(n3Model, hl)).toEqual([]);
    expect(
      hlToModelRanges(buildDtoModel(n3), [{ line_start: 1, line_end: 5, kind: "FOCUS" }])
    ).toEqual([]);
  });

  it("bước không tồn tại ⇒ hl rỗng", () => {
    expect(weakPointHl(null, "findById")).toEqual([]);
    expect(stepHl(null, "GOOD")).toEqual([]);
  });
});

describe("Thỏa thuận onSelect — vùng bôi đen theo số dòng gốc (D-82)", () => {
  const model = buildStepModel(
    {
      ...threeFileNode,
      trace_steps: [makeStep(1, "src/a.ts", 10, "const a = 1;\nconst b = 2;\n// … (1 dòng)\nconst c = 3;", [10, 11, 0, 14])],
    } as unknown as HybridArchitecturalNode,
    1
  );

  it("đổi dòng model sang dòng gốc, cột giữ nguyên, col_end không tính", () => {
    expect(
      toOriginalSelection(model, { startLineNumber: 2, startColumn: 7, endLineNumber: 2, endColumn: 8 })
    ).toEqual({
      range: { line_start: 11, col_start: 7, line_end: 11, col_end: 8 },
      selected_text: "b",
    });
  });

  it("chọn nhiều dòng: selected_text nối bằng xuống dòng", () => {
    expect(
      toOriginalSelection(model, { startLineNumber: 1, startColumn: 7, endLineNumber: 2, endColumn: 8 })
    ).toEqual({
      range: { line_start: 10, col_start: 7, line_end: 11, col_end: 8 },
      selected_text: "a = 1;\nconst b",
    });
  });

  it("kết thúc ở cột 1 của dòng sau: lùi về cuối dòng trước", () => {
    expect(
      toOriginalSelection(model, { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 1 })
    ).toEqual({
      range: { line_start: 10, col_start: 1, line_end: 10, col_end: 13 },
      selected_text: "const a = 1;",
    });
  });

  it("vùng rỗng, chỉ khoảng trắng, chạm marker ⇒ null", () => {
    expect(
      toOriginalSelection(model, { startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 3 })
    ).toBeNull();
    expect(
      toOriginalSelection(model, { startLineNumber: 1, startColumn: 6, endLineNumber: 1, endColumn: 7 })
    ).toBeNull();
    expect(
      toOriginalSelection(model, { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 5 })
    ).toBeNull();
    expect(
      toOriginalSelection(model, { startLineNumber: 2, startColumn: 1, endLineNumber: 4, endColumn: 6 })
    ).toBeNull();
  });

  it("tab Kiểu dữ liệu không chọn được", () => {
    expect(
      toOriginalSelection(buildDtoModel(threeFileNode), {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 10,
      })
    ).toBeNull();
  });
});
