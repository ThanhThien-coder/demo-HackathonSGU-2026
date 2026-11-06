/**
 * Test lời gọi explain-selection (20 AI-38, AI-39, D-82).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG, type ExplainSelectionRaw, type ExplainSelectionRequest, type StaticEngineResult } from "@/contracts";

const state = vi.hoisted(() => ({ cache: [] as unknown[], used: 0, queries: [] as string[] }));
vi.mock("../../db", () => {
  const sql = Object.assign(
    vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = strings.join("?");
      state.queries.push(q);
      if (q.includes("SELECT payload FROM ai_cache")) return String(values[0]).startsWith("se|") ? state.cache : [];
      if (q.includes("count(*)")) return [{ n: state.used }];
      return [];
    }),
    { json: (v: unknown) => v },
  );
  return { sql };
});
vi.mock("../../quota", () => ({ addSessionTokens: vi.fn(async () => 777), checkTokenQuota: vi.fn() }));
vi.mock("../gemini", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../gemini")>()),
  callLLMWithRetry: vi.fn(),
}));
vi.mock("../guard/log", () => ({ logGuardBlock: vi.fn(), logWeakPointsFiltered: vi.fn() }));

import { addSessionTokens } from "../../quota";
import { explainSelection, findSelectionReferences } from "../explain";
import { callLLMWithRetry } from "../gemini";
import { logGuardBlock } from "../guard/log";
import { explainRequest } from "../prompts/explain";

const graph: StaticEngineResult = JSON.parse(
  readFileSync(resolve(__dirname, "../../engine/__fixtures__/shop-api.json"), "utf-8"),
);
const n3 = graph.nodes.find((n) => n.id === "slice-product-list")!;
const session = {
  id: "s-explain",
  source: "GITHUB" as const,
  snapshot_id: "abc",
  subdir: "",
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 100,
};
// N3 bước 2, dòng 17 "    p.category = await categoryRepo.findById(p.categoryId);" ⇒ await ở cột 18–23
const req: ExplainSelectionRequest = {
  session_id: session.id,
  node_id: n3.id,
  step_number: 2,
  range: { line_start: 17, col_start: 18, line_end: 17, col_end: 23 },
  selected_text: "await",
};
const good: ExplainSelectionRaw = {
  kind: "KEYWORD",
  what: "`await` bắt hàm chờ việc bất đồng bộ xong rồi mới chạy tiếp.",
  here: "Vòng lặp chờ `categoryRepo.findById` cho từng sản phẩm.",
  analogy: "",
  skill: "ASYNC_CONCURRENCY",
};

describe("C-11 — explain-selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.cache = [];
    state.used = 0;
    state.queries = [];
  });

  it("AI-39: chỉ code bước 2; <flow> có tên bước 1, 3 không có code; không có câu hỏi, đáp án, câu trả lời", () => {
    const user = explainRequest(session.id, graph, { node: n3, req, references: [], analysis: null }).user;
    expect(user).toContain("### Bước 2");
    expect(user).not.toContain("### Bước 1");
    expect(user).not.toContain("### Bước 3");
    expect(user).toContain("Trước: router.get('/products')");
    expect(user).toContain("Sau: CategoryRepo.findById");
    for (const s of n3.trace_steps.filter((x) => x.step_number !== 2)) {
      for (const line of s.snippet.split("\n").filter((l) => l.trim().length > 15)) {
        expect(user).not.toContain(line);
      }
    }
    for (const tag of ["<question>", "<reference_answer>", "<student_answer>"]) {
      expect(user).not.toContain(tag);
    }
    expect(user).toContain("await · dòng 17, cột 18 – dòng 17, cột 23");
    expect(user).toContain("<step_info>\nBước 2/3 · ");
    expect(user).not.toContain("<dto_data>"); // await không phải tên trong DTO
    const withDto = explainRequest(session.id, graph, {
      node: n3,
      req: { ...req, selected_text: "p.categoryId" },
      references: [],
      analysis: null,
    }).user;
    expect(withDto).toContain("<dto_data>");
  });

  it("AI-39: tên trùng phần cuối function_name của bước ở node khác ⇒ references, sort node_id, tối đa GRADE_REFERENCED_MAX; bỏ node đang mở", () => {
    expect(findSelectionReferences(graph, "slice-order-checkout", "categoryRepo.findById(p.categoryId)")).toEqual([
      { node_id: "slice-product-list", step_number: 3, name: "findById" },
    ]);
    expect(findSelectionReferences(graph, n3.id, "findById")).toEqual([]);
    const many = findSelectionReferences(graph, "x", "addItem checkout listProducts getProfile register findById");
    expect(many.length).toBeGreaterThan(0);
    expect(many.length).toBeLessThanOrEqual(CONFIG.GRADE_REFERENCED_MAX);
    expect(many.map((r) => r.node_id)).toEqual([...many.map((r) => r.node_id)].sort());
  });

  it("AI-38: trúng cache ⇒ 0 token, không gọi AI, không tính lượt", async () => {
    state.cache = [{ payload: good }];
    const r = await explainSelection(session, graph, req);
    expect(r).toEqual({ explanation: good, references: [], tokens_used: 100 });
    expect(callLLMWithRetry).not.toHaveBeenCalled();
    expect(addSessionTokens).not.toHaveBeenCalled();
  });

  it("AI-38: đã gọi AI EXPLAIN_MAX_PER_SESSION lần ⇒ ERR_EXPLAIN_LIMIT, không gọi AI", async () => {
    state.used = CONFIG.EXPLAIN_MAX_PER_SESSION;
    await expect(explainSelection(session, graph, req)).rejects.toMatchObject({ code: "ERR_EXPLAIN_LIMIT" });
    expect(callLLMWithRetry).not.toHaveBeenCalled();
  });

  it("AI-38: trượt cổng gác ⇒ explanation null, không ghi cache, 1 log guard_blocked, không có request 2", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      ok: true,
      value: { ...good, here: "Gọi `verifyToken`." },
      tokens_in: 900,
      tokens_out: 120,
    });
    const r = await explainSelection(session, graph, req);
    expect(r.explanation).toBeNull();
    expect(r.tokens_used).toBe(777);
    expect(callLLMWithRetry).toHaveBeenCalledTimes(1);
    expect(logGuardBlock).toHaveBeenCalledTimes(1);
    expect(logGuardBlock).toHaveBeenCalledWith(
      "explain",
      1,
      n3.id,
      expect.arrayContaining([expect.objectContaining({ code: "E2" })]),
    );
    expect(state.queries.some((q) => q.includes("INSERT INTO ai_cache"))).toBe(false);
  });

  it("AI-38: qua cổng gác ⇒ ghi cache SELECTION_EXPLAIN và ai_usage EXPLAIN, cộng token", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({ ok: true, value: good, tokens_in: 900, tokens_out: 120 });
    const r = await explainSelection(session, graph, req);
    expect(r.explanation).toEqual(good);
    expect(addSessionTokens).toHaveBeenCalledWith(session.id, 900, 120);
    expect(state.queries.some((q) => q.includes("INSERT INTO ai_cache") && q.includes("'SELECTION_EXPLAIN'"))).toBe(true);
    expect(state.queries.some((q) => q.includes("INSERT INTO ai_usage") && q.includes("'EXPLAIN'"))).toBe(true);
  });

  it("AI-38: AI hỏng sau thử lại ⇒ ERR_AI_UNAVAILABLE", async () => {
    vi.mocked(callLLMWithRetry).mockResolvedValueOnce({
      ok: false,
      code: "ERR_AI_UNAVAILABLE",
      tokens_in: 0,
      tokens_out: 0,
    });
    await expect(explainSelection(session, graph, req)).rejects.toMatchObject({ code: "ERR_AI_UNAVAILABLE" });
  });
});
