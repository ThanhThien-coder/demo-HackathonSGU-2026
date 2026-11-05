import { describe, expect, it } from "vitest";
import type { HybridArchitecturalNode } from "@/contracts";
import { buildSliceModel, stepAtLine } from "./slice-model";

const node = {
  languages: ["TYPESCRIPT"], dto_snippet: "interface P { id: number }",
  trace_steps: [
    { step_number: 1, layer: "ENTRY_POINT", file_path: "a.ts", function_name: "h", snippet: "router.get('/p', async () => {\n  x();\n});", snippet_line_map: [8, 9, 11], line_start: 8, line_end: 11 },
    { step_number: 2, layer: "BUSINESS_LOGIC", file_path: "s.ts", function_name: "S.list", snippet: "async list() {\n  // … (3 dòng)\n  return y;\n}", snippet_line_map: [14, 0, 19, 20], line_start: 14, line_end: 20 },
  ],
} as unknown as HybridArchitecturalNode;

describe("UI-31 số dòng gốc", () => {
  const m = buildSliceModel(node);
  it("tiêu đề / dòng trống / marker / kiểu dữ liệu không có số", () => {
    expect(m.lineMap[0]).toBe(0);          // tiêu đề bước 1
    expect(m.lineMap.slice(1, 4)).toEqual([8, 9, 11]);
    expect(m.lineMap[4]).toBe(0);          // dòng trống
    expect(m.lineMap[5]).toBe(0);          // tiêu đề bước 2
    expect(m.lineMap[6]).toBe(14);
    expect(m.lineMap[7]).toBe(0);          // marker
    expect(m.lineMap[m.lineMap.length - 1]).toBe(0); // kiểu dữ liệu
  });
  it("UI-33 bấm dòng ⇒ bước chứa dòng đó", () => {
    expect(stepAtLine(m, 2)).toBe(1);
    expect(stepAtLine(m, 9)).toBe(2);
    expect(stepAtLine(m, m.lineMap.length)).toBeNull();
  });
  it("tiêu đề có tên file và hàm", () => expect(m.text).toContain("// ── Bước 2 · BUSINESS_LOGIC · s.ts · S.list"));
});
