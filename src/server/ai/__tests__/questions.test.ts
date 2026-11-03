import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type GeneratedQuestionRaw,
  type NodeAnalysis,
  type NodeAnalysisRaw,
  type QuestionPlanItem,
  type SessionRow,
  type StaticEngineResult,
} from "@/contracts";
import { ApiHttpError } from "@/server/errors";

vi.mock("../gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gemini")>();
  return {
    ...actual,
    callLLMOnce: vi.fn(),
    retryDelay: vi.fn(),
  };
});

vi.mock("../guard/log", () => ({
  logGuardBlock: vi.fn(),
}));

vi.mock("@/server/quota", () => ({
  checkTokenQuota: vi.fn(),
}));

import { checkTokenQuota } from "@/server/quota";
import { callLLMOnce, retryDelay } from "../gemini";
import { checkAnalysis } from "../guard/analysis";
import { logGuardBlock } from "../guard/log";
import { checkQuestions } from "../guard/questions";
import { generateQuestions, type QuestionsUsage } from "../questions";

const shopApiFixturePath = resolve(
  __dirname,
  "../../engine/__fixtures__/shop-api.json",
);
const analysisN3FixturePath = resolve(
  __dirname,
  "../__fixtures__/analysis-n3.json",
);
const questionsN3FixturePath = resolve(
  __dirname,
  "../__fixtures__/questions-n3.json",
);

const graph: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8"),
);

const nodeN3 = graph.nodes.find((n) => n.id === "slice-product-list");
if (!nodeN3) throw new Error("Không tìm thấy node slice-product-list");

const rawN3: NodeAnalysisRaw = JSON.parse(
  readFileSync(analysisN3FixturePath, "utf-8"),
);

const analysisN3: NodeAnalysis = checkAnalysis(rawN3, nodeN3, graph)!;
if (!analysisN3) throw new Error("checkAnalysis trả null cho analysisN3");

const questionsFixture: GeneratedQuestionRaw[] = JSON.parse(
  readFileSync(questionsN3FixturePath, "utf-8"),
);

const planN3: QuestionPlanItem[] = [
  {
    question_index: 1,
    skill: "DB_OPTIMIZATION",
    tier: "NOVICE",
    focus: "WEAKNESS",
    step_indices: [2],
  },
  {
    question_index: 2,
    skill: "LAYERED_SEPARATION",
    tier: "NOVICE",
    focus: "FLOW",
    step_indices: [1, 2, 3],
  },
];

const session: SessionRow = {
  id: "test-session-id",
  user_id: "test-user-id",
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 1000,
};

describe("questions (C07 / AI-22, AI-23, AI-25, AI-37, GUARD-12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GUARD-12: kiểm cổng gác checkQuestions", () => {
    it("GUARD-12: fixture 2.3 cả 2 câu qua", () => {
      const checks = checkQuestions(
        { questions: questionsFixture },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks).toHaveLength(2);
      expect(checks[0].issues).toEqual([]);
      expect(checks[0].question).not.toBeNull();
      expect(checks[1].issues).toEqual([]);
      expect(checks[1].question).not.toBeNull();
    });

    it("GUARD-12: Q1 reference_answer có 'Redis' ⇒ Q1 hỏng mã Q5", () => {
      const badQ1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        reference_answer:
          questionsFixture[0].reference_answer + " Dùng Redis để cache.",
      };
      const checks = checkQuestions(
        { questions: [badQ1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks[0].issues.some((i) => i.code === "Q5")).toBe(true);
      expect(checks[0].issues.find((i) => i.code === "Q5")?.name).toBe("redis");
    });

    it("GUARD-12: Q1 không có findById ở câu hỏi lẫn đáp án ⇒ hỏng mã Q6", () => {
      const noFindByIdQ1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        feynman_question:
          "Trang danh sách có 200 sản phẩm. Vì sao càng nhiều sản phẩm thì trang càng chậm?",
        reference_answer:
          "Sau khi lấy danh sách 1 lần, vòng lặp query từng sản phẩm để lấy category. Nên trang bị chậm.",
      };
      const checks = checkQuestions(
        { questions: [noFindByIdQ1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks[0].issues.some((i) => i.code === "Q6")).toBe(true);
    });

    it("GUARD-12: Q1 có 'dòng 9' hoặc 'dòng 30' ⇒ hỏng Q4, 'dòng 16–18' ⇒ qua", () => {
      // Dòng 9 ngoài bước [2] ⇒ hỏng Q4
      const line9Q1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        reference_answer:
          questionsFixture[0].reference_answer + " Xem ở dòng 9.",
      };
      const checks9 = checkQuestions(
        { questions: [line9Q1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks9[0].issues.some((i) => i.code === "Q4")).toBe(true);

      // Dòng 30 không có trong bước 2 ⇒ hỏng Q4
      const line30Q1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        reference_answer:
          questionsFixture[0].reference_answer + " Xem ở dòng 30.",
      };
      const checks30 = checkQuestions(
        { questions: [line30Q1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks30[0].issues.some((i) => i.code === "Q4")).toBe(true);

      // Dòng 16–18 thuộc bước 2 (14..20) ⇒ qua Q4
      const line1618Q1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        reference_answer:
          questionsFixture[0].reference_answer + " Xem ở dòng 16–18.",
      };
      const checks1618 = checkQuestions(
        { questions: [line1618Q1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks1618[0].issues.some((i) => i.code === "Q4")).toBe(false);
    });

    it("GUARD-12: Q2 đáp án chỉ có `findOne` ⇒ 1 bước < 2 ⇒ hỏng Q7", () => {
      const findOneOnlyQ2: GeneratedQuestionRaw = {
        ...questionsFixture[1],
        reference_answer:
          "Hàm `findOne` được gọi để tìm loại hàng cho sản phẩm rồi trả về.",
      };
      const checks = checkQuestions(
        { questions: [questionsFixture[0], findOneOnlyQ2] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks[1].issues.some((i) => i.code === "Q7")).toBe(true);
    });

    it("GUARD-12: câu CHANGE không nêu file ⇒ hỏng Q8; nêu `product.controller.ts` ⇒ qua", () => {
      const changePlan: QuestionPlanItem = {
        question_index: 1,
        skill: "HTTP_ROUTING",
        tier: "NOVICE",
        focus: "CHANGE",
        step_indices: [1, 2, 3],
      };

      const noFileChange: GeneratedQuestionRaw = {
        skill: "HTTP_ROUTING",
        feynman_question: "Khi đổi đường dẫn route thì sửa ở đâu?",
        reference_answer:
          "Sửa đường dẫn trong hàm router get thành /api/v1/products.",
        must_have_points: [
          "Sửa đường dẫn trong route",
          "Không cần sửa service hay repository",
        ],
        fix: "Không có lỗi cần sửa ở góc này.",
      };

      const checksNoFile = checkQuestions(
        { questions: [noFileChange] },
        [changePlan],
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checksNoFile[0].issues.some((i) => i.code === "Q8")).toBe(true);

      const withFileChange: GeneratedQuestionRaw = {
        ...noFileChange,
        reference_answer:
          "Sửa file `product.controller.ts` để đổi đường dẫn thành /api/v1/products.",
      };

      const checksWithFile = checkQuestions(
        { questions: [withFileChange] },
        [changePlan],
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checksWithFile[0].issues.some((i) => i.code === "Q8")).toBe(false);
    });

    it("GUARD-12: 1 ý bắt buộc ⇒ hỏng Q2", () => {
      const onePointQ1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        must_have_points: ["Chỉ có một ý bắt buộc duy nhất"],
      };
      const checks = checkQuestions(
        { questions: [onePointQ1, questionsFixture[1]] },
        planN3,
        nodeN3,
        graph,
        analysisN3,
      );
      expect(checks[0].issues.some((i) => i.code === "Q2")).toBe(true);
    });
  });

  describe("AI-22 / D4: luồng xử lý câu trượt gác", () => {
    it("AI-22 / D4: Q2 trượt gác cả 2 lần ⇒ request 2 chỉ có 1 câu trong questions_plan, Q2 ended_by = 'DROPPED', Q1 giữ nguyên", async () => {
      const badQ2: GeneratedQuestionRaw = {
        ...questionsFixture[1],
        reference_answer: "Chỉ gọi `findOne` ở repo.", // hỏng Q7
      };

      // Request 1: trả Q1 đúng, Q2 hỏng
      // Request 2: trả Q2 vẫn hỏng
      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[0], badQ2] },
          tokens_in: 500,
          tokens_out: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [badQ2] },
          tokens_in: 300,
          tokens_out: 100,
        });

      const results = await generateQuestions(
        session,
        graph,
        nodeN3,
        analysisN3,
        planN3,
      );

      expect(callLLMOnce).toHaveBeenCalledTimes(2);

      // Kiểm tra request 2 chỉ có 1 câu trong questions_plan
      const req2UserPrompt = vi.mocked(callLLMOnce).mock.calls[1][0].user;
      expect(req2UserPrompt).toContain("<questions_plan>");
      expect(req2UserPrompt).toContain(
        "1. skill=LAYERED_SEPARATION · tier=NOVICE · focus=FLOW · buoc=1,2,3",
      );
      expect(req2UserPrompt).not.toContain("skill=DB_OPTIMIZATION");

      // Q1 thành công
      expect(results[0].finished).toBe(false);
      expect(results[0].ended_by).toBeNull();
      expect(results[0].feynman_question).toBe(
        questionsFixture[0].feynman_question,
      );
      expect(results[0].must_have_points).toEqual(
        questionsFixture[0].must_have_points,
      );

      // Q2 bị DROPPED
      expect(results[1].finished).toBe(true);
      expect(results[1].ended_by).toBe("DROPPED");
      expect(results[1].feynman_question).toBe("");
      expect(results[1].reference_answer).toBe("");
      expect(results[1].must_have_points).toEqual([]);
      expect(results[1].fix).toBe("");

      // Log cổng gác được gọi cho cả 2 lượt
      expect(logGuardBlock).toHaveBeenCalledWith(
        "questions",
        1,
        nodeN3.id,
        expect.any(Array),
      );
      expect(logGuardBlock).toHaveBeenCalledWith(
        "questions",
        2,
        nodeN3.id,
        expect.any(Array),
      );
    });

    it("AI-22 / D4: cả 2 câu trượt 2 lần ⇒ ném ApiHttpError mã ERR_AI_REJECTED", async () => {
      const badQ1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        must_have_points: ["1 ý"], // Q2
      };
      const badQ2: GeneratedQuestionRaw = {
        ...questionsFixture[1],
        must_have_points: ["1 ý"], // Q2
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [badQ1, badQ2] },
          tokens_in: 500,
          tokens_out: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [badQ1, badQ2] },
          tokens_in: 500,
          tokens_out: 200,
        });

      const err = await generateQuestions(session, graph, nodeN3, analysisN3, planN3).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiHttpError);
      expect((err as ApiHttpError).code).toBe("ERR_AI_REJECTED");
    });
  });

  describe("AI-37 / D5: gọi lại kèm lý do phản hồi cổng gác", () => {
    it("AI-37 / D5: Q2 có 'Redis' ở lần 1 ⇒ request 2 có <guard_feedback> chứa dòng Q5 · câu 1 và chỉ có câu đó trong questions_plan; lần 2 sạch ⇒ cả 2 qua", async () => {
      const redisQ2: GeneratedQuestionRaw = {
        ...questionsFixture[1],
        reference_answer:
          questionsFixture[1].reference_answer + " Lưu Redis cache.",
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[0], redisQ2] },
          tokens_in: 500,
          tokens_out: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[1]] },
          tokens_in: 300,
          tokens_out: 120,
        });

      const results = await generateQuestions(
        session,
        graph,
        nodeN3,
        analysisN3,
        planN3,
      );

      expect(callLLMOnce).toHaveBeenCalledTimes(2);

      // Request 2 phải có <guard_feedback> chứa Q5 · câu 1
      const req2User = vi.mocked(callLLMOnce).mock.calls[1][0].user;
      expect(req2User).toContain("<guard_feedback>");
      expect(req2User).toMatch(/Q5 · câu 1/);
      expect(req2User).toContain(
        "1. skill=LAYERED_SEPARATION · tier=NOVICE · focus=FLOW · buoc=1,2,3",
      );

      // Cả 2 câu đều qua
      expect(results).toHaveLength(2);
      expect(results[0].finished).toBe(false);
      expect(results[0].ended_by).toBeNull();
      expect(results[1].finished).toBe(false);
      expect(results[1].ended_by).toBeNull();
      expect(results[1].feynman_question).toBe(
        questionsFixture[1].feynman_question,
      );
    });
  });

  describe("AI-23: kiểm tra bước gửi AI trong <code_data>", () => {
    it("AI-23: request của plan N3 có <code_data> gồm bước 1–3; request 2 chỉ có Q1 ([2]) ⇒ <code_data> chỉ có bước 2", async () => {
      const badQ1: GeneratedQuestionRaw = {
        ...questionsFixture[0],
        must_have_points: ["1 ý"], // Q2
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [badQ1, questionsFixture[1]] },
          tokens_in: 500,
          tokens_out: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[0]] },
          tokens_in: 300,
          tokens_out: 100,
        });

      await generateQuestions(session, graph, nodeN3, analysisN3, planN3);

      // Request 1: plan N3 có Q1 [2], Q2 [1, 2, 3] => hợp lại là 1, 2, 3
      const req1User = vi.mocked(callLLMOnce).mock.calls[0][0].user;
      expect(req1User).toContain("### Bước 1");
      expect(req1User).toContain("### Bước 2");
      expect(req1User).toContain("### Bước 3");

      // Request 2: chỉ có Q1 ([2]) => <code_data> chỉ có bước 2
      const req2User = vi.mocked(callLLMOnce).mock.calls[1][0].user;
      expect(req2User).not.toContain("### Bước 1");
      expect(req2User).toContain("### Bước 2");
      expect(req2User).not.toContain("### Bước 3");
    });
  });

  describe("Lỗi mạng & phân loại", () => {
    it("Lỗi mạng: request 1 TRANSIENT 503 ⇒ retryDelay được gọi, request 2 gửi cả lô, không có <guard_feedback>", async () => {
      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: false,
          kind: "TRANSIENT",
          status: 503,
          tokens_in: 10,
          tokens_out: 0,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: questionsFixture },
          tokens_in: 500,
          tokens_out: 200,
        });

      const results = await generateQuestions(
        session,
        graph,
        nodeN3,
        analysisN3,
        planN3,
      );

      expect(retryDelay).toHaveBeenCalledTimes(1);
      expect(callLLMOnce).toHaveBeenCalledTimes(2);

      // Request 2 không có <guard_feedback>
      const req2User = vi.mocked(callLLMOnce).mock.calls[1][0].user;
      expect(req2User).not.toContain("<guard_feedback>");
      expect(req2User).toContain("1. skill=DB_OPTIMIZATION");
      expect(req2User).toContain("2. skill=LAYERED_SEPARATION");

      expect(results).toHaveLength(2);
      expect(results[0].finished).toBe(false);
      expect(results[1].finished).toBe(false);
    });

    it("Lỗi mạng: FATAL ⇒ ném ERR_AI_UNAVAILABLE, chỉ 1 request", async () => {
      vi.mocked(callLLMOnce).mockResolvedValueOnce({
        ok: false,
        kind: "FATAL",
        status: 403,
        tokens_in: 0,
        tokens_out: 0,
      });

      const err = await generateQuestions(session, graph, nodeN3, analysisN3, planN3).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiHttpError);
      expect((err as ApiHttpError).code).toBe("ERR_AI_UNAVAILABLE");

      expect(callLLMOnce).toHaveBeenCalledTimes(1);
      expect(retryDelay).not.toHaveBeenCalled();
    });
  });

  describe("Usage & Quota", () => {
    it("usage cộng đúng qua 2 request; checkTokenQuota được gọi", async () => {
      const usage: QuestionsUsage = {
        tokens_in: 0,
        tokens_out: 0,
        requests: 0,
      };

      const badQ2: GeneratedQuestionRaw = {
        ...questionsFixture[1],
        must_have_points: ["1 ý"],
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[0], badQ2] },
          tokens_in: 450,
          tokens_out: 180,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: { questions: [questionsFixture[1]] },
          tokens_in: 250,
          tokens_out: 90,
        });

      await generateQuestions(
        session,
        graph,
        nodeN3,
        analysisN3,
        planN3,
        usage,
      );

      expect(checkTokenQuota).toHaveBeenCalledWith(session.tokens_used);
      expect(usage.tokens_in).toBe(450 + 250);
      expect(usage.tokens_out).toBe(180 + 90);
      expect(usage.requests).toBe(2);
    });
  });
});
