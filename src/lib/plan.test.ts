import { describe, expect, it } from "vitest";
import type { CognitiveSkillState, NodeAnalysis, SWESkill } from "@/contracts";
import { deriveNodeStates } from "./derive";
import { nodeStatusFromRuns, planNodeQuestions } from "./plan";
import { similarity, validateAnswerLength } from "./similarity";

const T0 = 1_774_000_000_000;
const sk = (p: number, n = 0): CognitiveSkillState =>
  ({ skill: "DB_OPTIMIZATION", p_mastery: p, last_practiced_at: T0, practice_count: n, correct_count: n });
const skills = (o: Partial<Record<SWESkill, number>>, n = 1) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sk(v as number, n)]));

const analysis = (
  s: Array<[SWESkill, number]>, weak: Array<[SWESkill, number]>, strengths: number[], patterns: NodeAnalysis["architecture"]["patterns"],
): NodeAnalysis => ({
  node_id: "n", skeleton_only: false,
  skills: s.map(([skill, step]) => ({ skill, step, symbol: "x", reason: "r" })),
  architecture: { patterns, summary: "s" }, steps: [],
  strengths: strengths.map((step) => ({ step, text: "t" })),
  weak_points: weak.map(([skill, step]) => ({ skill, step, symbol: "x", what: "w", consequence: "c" })),
});

const N3 = analysis([["DB_OPTIMIZATION", 2], ["LAYERED_SEPARATION", 1]], [["DB_OPTIMIZATION", 2]], [1], ["LAYERED", "REPOSITORY"]);
const N2 = analysis([["AUTH_SECURITY", 2], ["HTTP_ROUTING", 1]], [["AUTH_SECURITY", 2]], [2], ["MIDDLEWARE_CHAIN", "LAYERED"]);
const N5 = analysis(
  [["TRANSACTION_INTEGRITY", 3], ["DB_OPTIMIZATION", 3], ["HTTP_ROUTING", 1]],
  [["TRANSACTION_INTEGRITY", 3], ["DB_OPTIMIZATION", 3]], [2], ["LAYERED", "MIDDLEWARE_CHAIN"],
);
const X = analysis([["HTTP_ROUTING", 1], ["DTO_VALIDATION", 1], ["ERROR_HANDLING", 2]], [], [1], ["LAYERED"]);
const Xp = { ...X, strengths: [], architecture: { patterns: ["OTHER" as const], summary: "s" } };
const brief = (r: ReturnType<typeof planNodeQuestions>) =>
  r.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices]);

describe("T-PLAN", () => {
  it("P-A", () => expect(brief(planNodeQuestions(N3, {}, T0, 3))).toEqual([
    [1, "DB_OPTIMIZATION", "NOVICE", "WEAKNESS", [2]], [2, "LAYERED_SEPARATION", "NOVICE", "FLOW", [1, 2, 3]]]));
  it("P-B", () => expect(brief(planNodeQuestions(N2, skills({ HTTP_ROUTING: 0.5767 }), T0, 3))).toEqual([
    [1, "AUTH_SECURITY", "NOVICE", "WEAKNESS", [2]], [2, "HTTP_ROUTING", "PRACTITIONER", "ARCHITECTURE", [1, 2]]]));
  it("P-C", () => expect(brief(planNodeQuestions(N5,
    skills({ HTTP_ROUTING: 0.9532, DTO_VALIDATION: 0.9532, AUTH_SECURITY: 0.9532, DB_OPTIMIZATION: 0.8413, TRANSACTION_INTEGRITY: 0.5767 }),
    T0, 3))).toEqual([
    [1, "TRANSACTION_INTEGRITY", "PRACTITIONER", "WEAKNESS", [3]], [2, "DB_OPTIMIZATION", "ARCHITECT", "WEAKNESS", [3]]]));
  it("P-D đã thạo ⇒ 1 câu ARCHITECT", () => expect(brief(planNodeQuestions(N5,
    skills({ HTTP_ROUTING: 0.95, DB_OPTIMIZATION: 0.95, TRANSACTION_INTEGRITY: 0.95 }), T0, 3))).toEqual([
    [1, "TRANSACTION_INTEGRITY", "ARCHITECT", "WEAKNESS", [3]]]));
  it("P-D2 không rỗng (D-34)", () => expect(brief(planNodeQuestions(N3,
    skills({ DB_OPTIMIZATION: 0.96, LAYERED_SEPARATION: 0.93 }), T0, 3))).toEqual([
    [1, "LAYERED_SEPARATION", "ARCHITECT", "CHANGE", [1, 2, 3]]]));
  const mid = skills({ HTTP_ROUTING: 0.65, DTO_VALIDATION: 0.65, ERROR_HANDLING: 0.65 });
  it("P-G1 xoay góc", () => expect(brief(planNodeQuestions(X, mid, T0, 2))).toEqual([
    [1, "HTTP_ROUTING", "PRACTITIONER", "ARCHITECTURE", [1]],
    [2, "DTO_VALIDATION", "PRACTITIONER", "CHANGE", [1, 2]],
    [3, "ERROR_HANDLING", "PRACTITIONER", "FLOW", [1, 2]]]));
  it("P-G2 thiếu ARCHITECTURE", () => expect(brief(planNodeQuestions(Xp, mid, T0, 2))).toEqual([
    [1, "HTTP_ROUTING", "PRACTITIONER", "CHANGE", [1, 2]],
    [2, "DTO_VALIDATION", "PRACTITIONER", "FLOW", [1, 2]],
    [3, "ERROR_HANDLING", "PRACTITIONER", "CHANGE", [1, 2]]]));
});

describe("T-RUN nodeStatusFromRuns", () => {
  const q = (skill: SWESkill, outcome: "FAILED" | "PASS_FIRST" | null, ended_by: "ANSWER" | "DROPPED", disputed = false) =>
    ({ question_index: 1, skill, focus: "WEAKNESS" as const, outcome, ended_by, disputed });
  const run = (questions: ReturnType<typeof q>[]) => [{ mode: "LEARN" as const, started_at: 1, finished_at: 2, questions }];
  it("FAILED", () => expect(nodeStatusFromRuns(run([q("AUTH_SECURITY", "FAILED", "ANSWER"), q("HTTP_ROUTING", "PASS_FIRST", "ANSWER")]))).toBe("FAILED"));
  it("disputed ⇒ COMPLETED", () => expect(nodeStatusFromRuns(run([q("AUTH_SECURITY", "FAILED", "ANSWER", true), q("HTTP_ROUTING", "PASS_FIRST", "ANSWER")]))).toBe("COMPLETED"));
  it("DROPPED ⇒ COMPLETED", () => expect(nodeStatusFromRuns(run([q("AUTH_SECURITY", null, "DROPPED"), q("HTTP_ROUTING", "PASS_FIRST", "ANSWER")]))).toBe("COMPLETED"));
  it("không có run ⇒ null", () => expect(nodeStatusFromRuns([])).toBeNull());
});

describe("deriveNodeStates (03 Mục 5.1)", () => {
  const sk3 = [
    { node_id: "a", title: "A", prerequisites: [], is_capstone: false },
    { node_id: "b", title: "B", prerequisites: ["a"], is_capstone: false },
    { node_id: "c", title: "C", prerequisites: ["b"], is_capstone: true },
  ];
  it("gốc AVAILABLE, còn lại LOCKED", () => {
    const r = deriveNodeStates(sk3, []);
    expect([r.a.status, r.b.status, r.c.status]).toEqual(["AVAILABLE", "LOCKED", "LOCKED"]);
  });
  it("cha FAILED vẫn mở con kèm cảnh báo", () => {
    const r = deriveNodeStates(sk3, [{ node_id: "a", status: "FAILED", analysis_failed: false }]);
    expect(r.b.status).toBe("AVAILABLE");
    expect(r.b.has_warning).toBe(true);
  });
  it("phân tích lỗi mở node con (D-03)", () => {
    const r = deriveNodeStates(sk3, [{ node_id: "a", status: null, analysis_failed: true }]);
    expect(r.b.status).toBe("AVAILABLE");
    expect(r.b.has_warning).toBe(true);
  });
});

describe("similarity (GUARD-16)", () => {
  it("độ dài", () => {
    expect(validateAnswerLength("ok")).toBe("ERR_ANSWER_TOO_SHORT");
    expect(validateAnswerLength("x".repeat(2001))).toBe("ERR_ANSWER_TOO_LONG");
    expect(validateAnswerLength("Vì có 200 sản phẩm nên dữ liệu nhiều.")).toBeNull();
  });
  it("T6: trùng lần trước", () =>
    expect(similarity("Vì có 200 sản phẩm nên dữ liệu nhiều.", "Vì có 200 sản phẩm nên dữ liệu nhiều")).toBeGreaterThanOrEqual(0.8));
});
