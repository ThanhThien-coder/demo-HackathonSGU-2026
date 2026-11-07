/**
 * Test các hàm thuần của history.ts (C-08: D-74 A5b, M1).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIG, type StaticEngineResult } from "@/contracts";
import { findReferencedSteps, pickMissed } from "../history";

const graph: StaticEngineResult = JSON.parse(
  readFileSync(resolve(__dirname, "../../engine/__fixtures__/shop-api.json"), "utf-8"),
);

describe("C-08 — history (D-74)", () => {
  it("AI-25 (A5b): chỉ lấy ý hụt ở lượt cuối của câu đã hết lượt, mới nhất trước, tối đa HISTORY_MISSED_POINTS_MAX mỗi kỹ năng", () => {
    const max = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
    const rows = [
      { skill: "DB_OPTIMIZATION" as const, attempt_number: max, is_passed: false, points_covered: [false, true, false], points: ["a1", "a2", "a3"] },
      { skill: "DB_OPTIMIZATION" as const, attempt_number: 1, is_passed: false, points_covered: [false], points: ["chưa hết lượt"] },
      { skill: "DB_OPTIMIZATION" as const, attempt_number: max, is_passed: false, points_covered: [false, false], points: ["b1", "b2"] },
      { skill: "HTTP_ROUTING" as const, attempt_number: 2, is_passed: true, points_covered: [true], points: ["đạt"] },
    ];
    const m = pickMissed(rows);
    expect(m.DB_OPTIMIZATION).toEqual(["a1", "a3", "b1"].slice(0, CONFIG.HISTORY_MISSED_POINTS_MAX));
    expect(m.HTTP_ROUTING).toBeUndefined();
  });

  it("AI-28 (M1): tên hàm của bài khác trong câu trả lời; bài điều kiện xếp trước; bỏ tên đã có trong bài; chỉ tên, không code", () => {
    const own = graph.nodes.find((n) => n.id === "slice-order-checkout")!;
    const ownNames = new Set(own.trace_steps.map((s) => s.function_name));
    const refs = findReferencedSteps(graph, own.id, "Giống ở bài trước, findById hỏi database từng lần", ownNames);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.length).toBeLessThanOrEqual(CONFIG.GRADE_REFERENCED_MAX);
    expect(refs[0]).toMatchObject({ function_name: "CategoryRepo.findById", conditional: true });
    expect(Object.keys(refs[0]).sort()).toEqual(["conditional", "file_path", "function_name", "title"]);
    expect(findReferencedSteps(graph, own.id, "không nhắc tên nào", ownNames)).toEqual([]);
  });
});
