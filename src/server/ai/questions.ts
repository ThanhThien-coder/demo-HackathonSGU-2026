// 20 Mục 6 (AI-22) — đặt câu hỏi Feynman. Không cache (D-37); câu hỏng ⇒ gọi lại riêng 1 lần ⇒ vẫn hỏng ⇒ DROPPED.
import { CONFIG } from "@/contracts/config";
import type {
  GeneratedQuestionRaw, GuardIssue, HybridArchitecturalNode, NodeAnalysis, QuestionPlanItem, RunQuestion, SessionRow, StaticEngineResult,
} from "@/contracts";
import { fail } from "../errors";
import { assertQuota } from "../quota";
import { loadMissedPoints } from "../store";
import { callLLMOnce, retryDelay, type LlmRequest } from "./gemini";
import { checkQuestions, type QuestionCheck } from "./guard/checks";
import { logGuardBlock } from "./guard/followup";
import { withGuardFeedback } from "./prompts/common";
import { questionsSystem, questionsUser } from "./prompts/questions";
import { questionsSchema } from "./schemas";

const parseQuestions = (j: unknown): { questions: GeneratedQuestionRaw[] } | null => {
  const o = j as { questions?: unknown } | null;
  return o && Array.isArray(o.questions) ? (o as { questions: GeneratedQuestionRaw[] }) : null;
};

export async function generateQuestions(
  session: SessionRow, graph: StaticEngineResult, node: HybridArchitecturalNode, analysis: NodeAnalysis, plan: QuestionPlanItem[],
): Promise<RunQuestion[]> {
  await assertQuota(session.id);
  const missed = await loadMissedPoints(session.user_id, [...new Set(plan.map((p) => p.skill))]);
  const mk = (items: QuestionPlanItem[]): LlmRequest<{ questions: GeneratedQuestionRaw[] }> => ({
    kind: "QUESTIONS", system: questionsSystem(node, graph), user: questionsUser(node, graph, analysis, items, missed),
    schema: questionsSchema(items), sessionId: session.id, parse: parseQuestions,
  });

  // request 1: mọi item; TRANSIENT / INVALID_JSON ⇒ gọi lại cả lô (không kèm lý do)
  let checks: QuestionCheck[] | null = null;
  let prev: { retry_after_ms?: number } | null = null;
  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    if (i > 0 && !(await retryDelay(prev))) break;
    const r = await callLLMOnce(mk(plan));
    if (r.ok) { checks = checkQuestions(r.value, plan, node, graph, analysis); break; }
    prev = r;
    if (r.kind === "FATAL") break;
  }
  if (!checks) return fail("ERR_AI_UNAVAILABLE");

  const result = new Map<number, GeneratedQuestionRaw | null>();
  for (const c of checks) result.set(c.item.question_index, c.question);
  const failed = checks.filter((c) => c.question === null);
  failed.forEach((c) => logGuardBlock("questions", 1, node.id, c.issues));

  if (failed.length > 0) { // request 2 chỉ item hỏng, kèm lý do của đúng các item đó (question = vị trí trong request 2)
    const items2 = failed.map((c) => c.item);
    const issues2: GuardIssue[] = failed.flatMap((c, k) => c.issues.map((x) => ({ ...x, question: k + 1 })));
    await retryDelay(null);
    const r = await callLLMOnce(withGuardFeedback(mk(items2), issues2));
    if (r.ok) {
      const c2 = checkQuestions(r.value, items2, node, graph, analysis);
      for (const c of c2) {
        if (c.question) result.set(c.item.question_index, c.question);
        else logGuardBlock("questions", 2, node.id, c.issues);
      }
    }
  }

  return plan.map((p): RunQuestion => {
    const q = result.get(p.question_index) ?? null;
    const base = { ...p, attempts_used: 0, disputed: false, p_before: null, p_after: null, last_answer: null };
    if (!q) return { ...base, feynman_question: "", reference_answer: "", must_have_points: [], fix: "", finished: true, outcome: null, ended_by: "DROPPED" };
    return { ...base, feynman_question: q.feynman_question, reference_answer: q.reference_answer, must_have_points: q.must_have_points, fix: q.fix, finished: false, outcome: null, ended_by: null };
  });
}
