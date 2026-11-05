// 03 Mục 6.2 — evaluate-feynman: kiểm ⇒ chấm (ngoài transaction) ⇒ khóa ⇒ ghi. (D-18, D-40)
import { CONFIG } from "@/contracts/config";
import type { EvaluateFeynmanRequest, EvaluateFeynmanResponse, GradeContext, GradingRaw, SkillChange, StaticEngineResult } from "@/contracts";
import { decideFollowUp, decidePass, coveredFlags, gradeWithAI, injectionGrading } from "./ai/grade";
import { isInjection } from "./ai/guard/followup";
import type { GradeExtras } from "./ai/prompts/grade";
import { outcomeOf } from "@/lib/bkt-engine";
import { hasInappropriateWords, maskSensitive } from "@/lib/moderation";
import { similarity, validateAnswerLength } from "@/lib/similarity";
import { sql } from "./db";
import { fail } from "./errors";
import { redactSecrets } from "./engine/ingest/secrets";
import { applyBkt, finalizeRunIfDone, loadNodeStates, toQuestionState } from "./progress";
import { getSessionStaticResult } from "./session";
import { asQ, dbRead, getOwnedSession, getRunOwned, insertAttempt, lastAttemptOfQuestion, saveRunQuestions, withDbRetry } from "./store";

/** M1: tra tối đa GRADE_REFERENCED_MAX tên hàm của node khác có trong câu trả lời (chỉ tên, không code — D-36). */
async function referencedSteps(graph: StaticEngineResult | null, nodeId: string, answer: string, ownNames: Set<string>): Promise<GradeExtras["referenced"]> {
  if (!graph) return [];
  const words = new Set(answer.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
  const cur = graph.nodes.find((n) => n.id === nodeId);
  const found: NonNullable<GradeExtras["referenced"]> = [];
  for (const n of graph.nodes) {
    if (n.id === nodeId) continue;
    for (const s of n.trace_steps) {
      const short = s.function_name.split(".").pop() ?? s.function_name;
      if (!words.has(short) || ownNames.has(s.function_name) || found.some((f) => f.function_name === s.function_name)) continue;
      found.push({ function_name: s.function_name, file_path: s.file_path, title: n.title, conditional: !!cur && cur.prerequisites.includes(n.id) });
    }
  }
  found.sort((a, b) => Number(b.conditional) - Number(a.conditional));
  return found.slice(0, CONFIG.GRADE_REFERENCED_MAX);
}

export async function evaluateFeynman(req: EvaluateFeynmanRequest, userId: string): Promise<EvaluateFeynmanResponse> {
  const now = Date.now();
  // 1. đầu vào (0 token, 0 DB)
  const bad = validateAnswerLength(req.student_answer ?? "");
  if (bad) return fail(bad);
  if (hasInappropriateWords(req.student_answer)) return fail("ERR_ANSWER_INAPPROPRIATE");
  const cleanAnswer = maskSensitive(redactSecrets(req.student_answer).code);

  // 2. đọc KHÔNG khóa
  const session = await getOwnedSession(req.session_id, userId);
  const run = await dbRead(() => getRunOwned(sql, req.run_id, session.id));
  const q = run.questions[req.question_index - 1];
  if (!q || !Number.isInteger(req.question_index)) return fail("ERR_SESSION_NOT_FOUND");
  if (run.finished_at || q.finished) return fail("ERR_QUESTION_FINISHED");
  if (req.attempt_number !== q.attempts_used + 1) return fail("ERR_ATTEMPT_OUT_OF_SYNC");
  if (q.last_answer && similarity(cleanAnswer, q.last_answer) >= CONFIG.ANSWER_DUPLICATE_SIMILARITY) return fail("ERR_ANSWER_DUPLICATE");

  const maxAttempts = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
  const t: GradeContext = { ...q, steps: run.steps, forbidden_external_keywords: run.forbidden_external_keywords };

  const extras: GradeExtras = {};
  if (req.attempt_number >= 2) { // A5a
    const prev = await dbRead(() => lastAttemptOfQuestion(sql, run.id, req.question_index));
    if (prev) extras.previous = { answer: prev.student_answer, points: prev.points_covered };
  }

  // 3. chấm (ngoài transaction, gửi cleanAnswer đã che)
  let grading: GradingRaw;
  if (isInjection(cleanAnswer)) grading = injectionGrading(q);
  else {
    let graph: StaticEngineResult | null = null;
    try { graph = await getSessionStaticResult(session); } catch { graph = null; } // lỗi snapshot ⇒ bỏ qua M1
    extras.referenced = await referencedSteps(graph, run.node_id, cleanAnswer, new Set(run.steps.map((s) => s.function_name)));
    grading = await gradeWithAI(t, cleanAnswer, req.attempt_number, maxAttempts, session, extras);
  }
  const isPassed = decidePass(grading, q.must_have_points, cleanAnswer);
  const followUp = decideFollowUp(grading, req.attempt_number, maxAttempts, isPassed, t, cleanAnswer);
  const pointsCovered = coveredFlags(grading, q.must_have_points, cleanAnswer);

  // 4. transaction ngắn
  return withDbRetry(() => sql.begin(async (tx) => {
    const db = asQ(tx);
    const run2 = await getRunOwned(db, run.id, session.id, true);
    const q2 = run2.questions[req.question_index - 1];
    if (q2.finished || run2.finished_at || q2.attempts_used !== req.attempt_number - 1) return fail("ERR_ATTEMPT_OUT_OF_SYNC");
    await insertAttempt(db, {
      run_id: run2.id, question_index: req.question_index, attempt_number: req.attempt_number, skill: q2.skill,
      core_accuracy: grading.core_accuracy, simplicity: grading.simplicity, intent: grading.intent, is_passed: isPassed,
      points_covered: pointsCovered, student_answer: cleanAnswer,
    });
    q2.attempts_used += 1;
    q2.last_answer = cleanAnswer;
    let skillChange: SkillChange | null = null;
    if (isPassed || q2.attempts_used === maxAttempts) { // câu xong
      q2.finished = true;
      q2.ended_by = "ANSWER";
      q2.outcome = outcomeOf(isPassed, q2.attempts_used);
      skillChange = await applyBkt(db, userId, q2.skill, q2.outcome, now);
      q2.p_before = skillChange.p_before;
      q2.p_after = skillChange.p_after;
    }
    await saveRunQuestions(db, run2.id, run2.questions);
    const unlocked = await finalizeRunIfDone(db, session, { ...run2 });
    const states = await loadNodeStates(db, session);
    const tok = await db<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${session.id}`;
    return {
      question_index: req.question_index, attempt_number: req.attempt_number,
      core_accuracy: grading.core_accuracy, simplicity: grading.simplicity, intent: grading.intent, is_passed: isPassed,
      points_covered: pointsCovered, feedback: grading.feedback, detected_jargons: grading.detected_jargons,
      follow_up: q2.finished ? null : followUp, question: toQuestionState(q2), skill_change: skillChange,
      node_state: states[run2.node_id], unlocked_node_ids: unlocked, tokens_used: tok[0]?.tokens_used ?? 0,
    } satisfies EvaluateFeynmanResponse;
  }));
}
