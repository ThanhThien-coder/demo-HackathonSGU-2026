/**
 * src/server/evaluate.ts
 *
 * POST /api/evaluate-feynman: kiem => cham => khoa => ghi (03 Muc 6.2, D-18).
 * Thu tu: (1) dau vao 0 token 0 DB ⇒ (2) doc DB khong khoa ⇒ (3) cham ngoai transaction
 * ⇒ (4) transaction ngan: khoa run, ghi luot, BKT, finalizeRunIfDone.
 */

import {
  CONFIG,
  type EvaluateFeynmanRequest,
  type EvaluateFeynmanResponse,
  type GradeContext,
  type GradingRaw,
  type RunQuestion,
  type SkillChange,
} from "@/contracts";
import { outcomeOf } from "@/lib/bkt-engine";
import { hasInappropriateWords, maskSensitive } from "@/lib/moderation";
import { similarity, validateAnswerLength } from "@/lib/similarity";
import { aiCostUsd } from "./ai/gemini";
import {
  coveredFlags,
  decidePass,
  gradeWithAI,
  injectionGrading,
  toEvaluateResponse,
  type GradeUsage,
} from "./ai/grade";
import { isInjection } from "./ai/guard/injection";
import { db, sql } from "./db";
import { redactSecrets } from "./engine/ingest/secrets";
import { ApiHttpError } from "./errors";
import { logger } from "./log";
import {
  applyBkt,
  finalizeRunIfDone,
  loadNodeState,
  lockRun,
  normalizeRunRecord,
  saveRunQuestions,
  toQuestionState,
  withDbRead,
  withDbRetry,
} from "./progress";
import { addSessionTokens } from "./quota";
import { verifyRunOwnership, type RunRecord, type SessionRecord } from "./session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Body JSON tho => EvaluateFeynmanRequest; truong sai kieu thanh gia tri rong de cac buoc kiem bat loi. */
export function toEvaluateRequest(body: unknown): EvaluateFeynmanRequest {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    session_id: typeof b.session_id === "string" ? b.session_id.trim() : "",
    run_id: typeof b.run_id === "string" ? b.run_id.trim() : "",
    question_index: typeof b.question_index === "number" ? b.question_index : Number.NaN,
    student_answer: typeof b.student_answer === "string" ? b.student_answer : "",
    attempt_number: typeof b.attempt_number === "number" ? b.attempt_number : Number.NaN,
  };
}

/**
 * Buoc 1 (0 token, 0 DB): do dai (GUARD-16) ⇒ tu xau (D-65) ⇒ che secret + PII.
 * Tra cau tra loi da che, dung de cham, kiem trung va luu DB (04 Muc 13 y 5).
 */
export function checkAnswerInput(studentAnswer: string): string {
  const lengthError = validateAnswerLength(studentAnswer);
  if (lengthError) throw new ApiHttpError(lengthError);
  if (hasInappropriateWords(studentAnswer)) throw new ApiHttpError("ERR_ANSWER_INAPPROPRIATE");

  const cleanAnswer = maskSensitive(redactSecrets(studentAnswer).code);
  // Nhan <REDACTED_SECRET> co the dai hon gia tri bi che: khong cat cau tra loi (21 Muc 8),
  // nhung khong de vuot check char_length(student_answer) cua question_attempts.
  if (validateAnswerLength(cleanAnswer) === "ERR_ANSWER_TOO_LONG") {
    throw new ApiHttpError("ERR_ANSWER_TOO_LONG");
  }
  return cleanAnswer;
}

/**
 * Doc run + phien + cau hoi KHONG khoa (03 Muc 6.2 buoc 2, 6.3 buoc 1).
 * run phai thuoc session_id cua userId, question_index trong 1..n; sai ⇒ ERR_SESSION_NOT_FOUND (API-05).
 * DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE.
 */
export async function readRunQuestion(
  req: { session_id: string; run_id: string; question_index: number },
  userId: string
): Promise<{ run: RunRecord; session: SessionRecord; question: RunQuestion }> {
  if (!UUID_RE.test(req.session_id) || !UUID_RE.test(req.run_id)) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const owned = await withDbRead(() => verifyRunOwnership(req.run_id, userId));
  if (owned.run.session_id !== req.session_id) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const run = normalizeRunRecord(owned.run);
  const question = findQuestion(run, req.question_index);
  if (!question) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }
  return { run, session: owned.session, question };
}

/** Cau theo question_index (1..n) trong run; khong co ⇒ undefined. */
export function findQuestion(run: RunRecord, questionIndex: number): RunQuestion | undefined {
  if (!Number.isInteger(questionIndex) || questionIndex < 1 || questionIndex > run.questions.length) {
    return undefined;
  }
  return run.questions.find((q) => q.question_index === questionIndex);
}

/**
 * Cong token cua loi goi cham vao learning_sessions.tokens_used (API-06) va ghi 1 dong ai_usage (D-66),
 * ngoai transaction hoc. Token da tieu thi cong ca khi AI loi. Loi ghi DB o day chi log canh bao.
 */
async function recordGradeUsage(session: SessionRecord, usage: GradeUsage): Promise<number> {
  const spent = usage.tokens_in + usage.tokens_out;
  if (spent <= 0) return session.tokens_used;

  let tokensUsed = session.tokens_used + spent;
  try {
    tokensUsed = await addSessionTokens(session.id, usage.tokens_in, usage.tokens_out);
  } catch (err: unknown) {
    logger.warn({
      msg: "Cong tokens_used that bai",
      err_name: err instanceof Error ? err.name : typeof err,
    });
  }

  try {
    await sql`
      INSERT INTO ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
      VALUES (${session.id}, 'GRADE', ${usage.tokens_in}, ${usage.tokens_out}, ${aiCostUsd(usage.tokens_in, usage.tokens_out)})
    `;
  } catch (err: unknown) {
    logger.warn({
      msg: "Ghi ai_usage that bai",
      err_name: err instanceof Error ? err.name : typeof err,
    });
  }
  return tokensUsed;
}

export async function evaluateFeynman(
  req: EvaluateFeynmanRequest,
  userId: string,
  now: number = Date.now()
): Promise<EvaluateFeynmanResponse> {
  // 1. Dau vao (0 token, 0 DB) — khong tinh luot
  const cleanAnswer = checkAnswerInput(req.student_answer);

  // 2. Doc khong khoa — DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE, khong goi AI
  const { run, session, question: q } = await readRunQuestion(req, userId);
  if (run.finished_at || q.finished) throw new ApiHttpError("ERR_QUESTION_FINISHED");
  if (req.attempt_number !== (q.attempts_used ?? 0) + 1) throw new ApiHttpError("ERR_ATTEMPT_OUT_OF_SYNC");
  if (
    q.last_answer &&
    similarity(cleanAnswer, q.last_answer) >= CONFIG.ANSWER_DUPLICATE_SIMILARITY
  ) {
    throw new ApiHttpError("ERR_ANSWER_DUPLICATE");
  }

  // 3. Cham ngoai transaction, gui cau tra loi da che (D-36: khong code_context)
  const maxAttempts = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
  const t: GradeContext = {
    ...q,
    steps: run.steps,
    forbidden_external_keywords: run.forbidden_external_keywords,
  };

  let grading: GradingRaw;
  let tokensUsed = session.tokens_used;
  if (isInjection(cleanAnswer)) {
    grading = injectionGrading(q); // AI-33: 0 diem, OFF_TOPIC, khong goi y, 0 token — van tinh 1 luot
  } else {
    const usage: GradeUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
    try {
      // Het quota ⇒ ERR_TOKEN_QUOTA_EXCEEDED; AI hong ⇒ ERR_AI_UNAVAILABLE; ca hai khong tinh luot
      grading = await gradeWithAI(t, cleanAnswer, req.attempt_number, maxAttempts, session, {
        usage,
        nodeId: run.node_id,
      });
    } finally {
      tokensUsed = await recordGradeUsage(session, usage);
    }
  }

  const isPassed = decidePass(grading, q.must_have_points, cleanAnswer); // D-13
  const pointsCovered = coveredFlags(grading, q.must_have_points, cleanAnswer);

  // 4. Transaction ngan — DB loi sau CONFIG.DB_RETRY_DELAYS_MS ⇒ ERR_PERSISTENCE_UNAVAILABLE, bo ket qua cham (D-40)
  const written = await withDbRetry(() =>
    db.tx(async (tx) => {
      const run2 = await lockRun(tx, run.id);
      const q2 = findQuestion(run2, req.question_index);
      if (
        !q2 ||
        run2.finished_at ||
        q2.finished ||
        (q2.attempts_used ?? 0) !== req.attempt_number - 1
      ) {
        throw new ApiHttpError("ERR_ATTEMPT_OUT_OF_SYNC"); // Tab khac vua nop: bo ket qua cham (D-18)
      }

      await tx`
        INSERT INTO question_attempts (
          run_id, question_index, attempt_number, skill, core_accuracy, simplicity,
          intent, is_passed, points_covered, student_answer
        )
        VALUES (
          ${run2.id}, ${q2.question_index}, ${req.attempt_number}, ${q2.skill},
          ${grading.core_accuracy}, ${grading.simplicity}, ${grading.intent}, ${isPassed},
          ${pointsCovered}::boolean[], ${cleanAnswer}
        )
      `;

      q2.attempts_used = (q2.attempts_used ?? 0) + 1;
      q2.last_answer = cleanAnswer;

      let skillChange: SkillChange | null = null;
      if (isPassed || q2.attempts_used >= maxAttempts) {
        q2.finished = true;
        q2.ended_by = "ANSWER";
        q2.outcome = outcomeOf(isPassed, q2.attempts_used); // 22 BKT-60
        skillChange = await applyBkt(tx, userId, q2.skill, q2.outcome, now); // 22 BKT-62
        q2.p_before = skillChange.p_before;
        q2.p_after = skillChange.p_after;
      }

      await saveRunQuestions(tx, run2);
      const unlocked = await finalizeRunIfDone(tx, run2, now); // 03 Muc 6.5
      const nodeState = await loadNodeState(tx, run2);
      return { questionState: toQuestionState(q2), skillChange, unlocked, nodeState };
    })
  );

  // Ham map tuong minh (API-03): khong misconception, khong quote, reveal chi khi cau xong
  return toEvaluateResponse(grading, t, cleanAnswer, req.attempt_number, maxAttempts, {
    questionState: written.questionState,
    skillChange: written.skillChange,
    nodeState: written.nodeState,
    unlockedNodeIds: written.unlocked,
    tokensUsed,
  });
}
