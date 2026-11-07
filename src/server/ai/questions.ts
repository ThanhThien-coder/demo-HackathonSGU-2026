/**
 * src/server/ai/questions.ts
 *
 * Lời gọi enrich-node: đặt câu hỏi Feynman (AI-22, AI-23, AI-25, AI-37).
 */

import {
  type GeneratedQuestionRaw,
  type GuardIssue,
  type HybridArchitecturalNode,
  type NodeAnalysis,
  type QuestionPlanItem,
  type RunQuestion,
  type SessionRow,
  type StaticEngineResult,
} from "@/contracts";
import { ApiHttpError } from "@/server/errors";
import { checkTokenQuota } from "@/server/quota";
import { callLLMOnce, retryDelay } from "./gemini";
import { logGuardBlock } from "./guard/log";
import { checkQuestions, type QuestionCheck } from "./guard/questions";
import { withGuardFeedback } from "./prompts/common";
import { loadMissedPoints } from "./history";
import { questionsRequest } from "./prompts/questions";

// nội bộ — thống kê token và số lượt request của generateQuestions
export interface QuestionsUsage {
  tokens_in: number;
  tokens_out: number;
  requests: number;
}

/**
 * Sinh câu hỏi Feynman cho một node học theo kế hoạch (AI-22).
 * Không cache (D-37), không ghi DB.
 */
export async function generateQuestions(
  session: SessionRow,
  graph: StaticEngineResult,
  node: HybridArchitecturalNode,
  analysis: NodeAnalysis,
  plan: QuestionPlanItem[],
  usage?: QuestionsUsage,
): Promise<RunQuestion[]> {
  // Quota: checkTokenQuota(session.tokens_used) thay assertQuota (AI-06)
  checkTokenQuota(session.tokens_used);

  if (plan.length === 0) {
    return [];
  }

  const questionResults = new Map<number, GeneratedQuestionRaw | null>();

  // A5b (D-74): ý người học đã hụt ở các kỹ năng trong kế hoạch; DB lỗi ⇒ {} (bỏ khối)
  const missed = await loadMissedPoints(session.user_id, [...new Set(plan.map((p) => p.skill))]);

  // Request 1: gửi mọi item
  const req1 = questionsRequest(session, graph, node, analysis, plan, missed);
  const r1 = await callLLMOnce(req1);

  if (usage) {
    usage.tokens_in += r1.tokens_in;
    usage.tokens_out += r1.tokens_out;
    usage.requests += 1;
  }

  if (!r1.ok) {
    if (r1.kind === "FATAL") {
      throw new ApiHttpError("ERR_AI_UNAVAILABLE");
    }

    // TRANSIENT hoặc INVALID_JSON: retryDelay rồi request 2 gửi lại cả lô, KHÔNG kèm guard_feedback
    if (!(await retryDelay(r1))) {
      throw new ApiHttpError("ERR_AI_UNAVAILABLE"); // Google bắt chờ quá CONFIG.LLM_RETRY_DELAY_MAX_MS (D-74 R1)
    }
    const req2 = questionsRequest(session, graph, node, analysis, plan, missed);
    const r2 = await callLLMOnce(req2);

    if (usage) {
      usage.tokens_in += r2.tokens_in;
      usage.tokens_out += r2.tokens_out;
      usage.requests += 1;
    }

    if (!r2.ok) {
      // Cả hai request đều không ok
      throw new ApiHttpError("ERR_AI_UNAVAILABLE");
    }

    const checks2 = checkQuestions(r2.value, plan, node, graph, analysis);
    for (const c of checks2) {
      if (c.issues.length > 0) {
        logGuardBlock("questions", 2, node.id, c.issues);
        questionResults.set(c.item.question_index, null); // DROPPED (hết lượt)
      } else {
        questionResults.set(c.item.question_index, c.question);
      }
    }
  } else {
    // Request 1 ok: kiểm cổng gác
    const checks1 = checkQuestions(r1.value, plan, node, graph, analysis);
    const failedChecks: QuestionCheck[] = [];

    for (const c of checks1) {
      if (c.issues.length > 0) {
        logGuardBlock("questions", 1, node.id, c.issues);
        failedChecks.push(c);
      } else {
        questionResults.set(c.item.question_index, c.question);
      }
    }

    if (failedChecks.length > 0) {
      // Có item hỏng và còn lượt: request 2 chỉ gồm các item hỏng
      const retryItems = failedChecks.map((fc) => fc.item);
      const retryIssues: GuardIssue[] = [];

      failedChecks.forEach((fc, idx) => {
        const questionPos = idx + 1; // vị trí item trong request 2 (tính từ 1)
        for (const iss of fc.issues) {
          retryIssues.push({
            ...iss,
            question: questionPos,
          });
        }
      });

      const req2Base = questionsRequest(
        session,
        graph,
        node,
        analysis,
        retryItems,
        missed,
      );
      const req2 = withGuardFeedback(req2Base, retryIssues);
      const r2 = await callLLMOnce(req2);

      if (usage) {
        usage.tokens_in += r2.tokens_in;
        usage.tokens_out += r2.tokens_out;
        usage.requests += 1;
      }

      if (!r2.ok) {
        // Request 2 không ok ⇒ các item đó DROPPED
        for (const item of retryItems) {
          questionResults.set(item.question_index, null);
        }
      } else {
        const checks2 = checkQuestions(
          r2.value,
          retryItems,
          node,
          graph,
          analysis,
        );
        for (const c of checks2) {
          if (c.issues.length > 0) {
            logGuardBlock("questions", 2, node.id, c.issues);
            questionResults.set(c.item.question_index, null); // DROPPED (hết lượt)
          } else {
            questionResults.set(c.item.question_index, c.question);
          }
        }
      }
    }
  }

  // Dựng RunQuestion[] theo đúng thứ tự của plan
  const resultQuestions: RunQuestion[] = plan.map((planItem) => {
    const q = questionResults.get(planItem.question_index);
    if (q) {
      return {
        ...planItem,
        feynman_question: q.feynman_question,
        reference_answer: q.reference_answer,
        must_have_points: q.must_have_points,
        fix: q.fix,
        attempts_used: 0,
        finished: false,
        outcome: null,
        ended_by: null,
        disputed: false,
        p_before: null,
        p_after: null,
        last_answer: null,
      };
    }

    return {
      ...planItem,
      feynman_question: "",
      reference_answer: "",
      must_have_points: [],
      fix: "",
      attempts_used: 0,
      finished: true,
      outcome: null,
      ended_by: "DROPPED",
      disputed: false,
      p_before: null,
      p_after: null,
      last_answer: null,
    };
  });

  if (
    resultQuestions.length > 0 &&
    resultQuestions.every((rq) => rq.ended_by === "DROPPED")
  ) {
    throw new ApiHttpError("ERR_AI_REJECTED");
  }

  return resultQuestions;
}
