import {
  CONFIG,
  type EvaluateFeynmanRequest,
  type EvaluateFeynmanResponse,
  type GradeContext,
  type QuestionState,
  type RunQuestion,
  type SkillChange,
} from "@/contracts";
import { computeSkillChange, outcomeOf } from "@/lib/bkt-engine";
import { hasInappropriateWords, maskSensitive } from "@/lib/moderation";
import { similarity, validateAnswerLength } from "@/lib/similarity";
import {
  decidePass,
  gradeWithAI,
  injectionGrading,
  toEvaluateResponse,
} from "./ai/grade";
import { isInjection } from "./ai/guard/injection";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { finalizeRunIfDone, getSessionProgress } from "./progress";
import { verifyRunOwnership } from "./session";

/**
 * 03_API_VA_LUU_TRU.md Muc 6.2: evaluate-feynman — kiem => cham => khoa => ghi (D-18)
 */
export async function evaluateFeynman(
  req: EvaluateFeynmanRequest,
  userId: string
): Promise<EvaluateFeynmanResponse> {
  const now = Date.now();

  // 1. Dau vao (0 token, 0 DB)
  const lenError = validateAnswerLength(req.student_answer);
  if (lenError) {
    throw new ApiHttpError(lenError);
  }

  if (hasInappropriateWords(req.student_answer)) {
    throw new ApiHttpError("ERR_ANSWER_INAPPROPRIATE");
  }

  const cleanAnswer = maskSensitive(req.student_answer);

  // 2. Doc KHONG khoa
  const { run, session } = await verifyRunOwnership(req.run_id, userId);

  if (
    req.question_index < 1 ||
    req.question_index > (run.questions?.length ?? 0)
  ) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const q = run.questions[req.question_index - 1];
  if (run.finished_at || q.finished) {
    throw new ApiHttpError("ERR_QUESTION_FINISHED");
  }

  const expectedAttempt = (q.attempts_used ?? 0) + 1;
  if (req.attempt_number !== expectedAttempt) {
    throw new ApiHttpError("ERR_ATTEMPT_OUT_OF_SYNC");
  }

  if (
    q.last_answer &&
    similarity(cleanAnswer, q.last_answer) >= CONFIG.ANSWER_DUPLICATE_SIMILARITY
  ) {
    throw new ApiHttpError("ERR_ANSWER_DUPLICATE");
  }

  // 3. Cham (ngoai transaction, gui cleanAnswer da che)
  const maxAttempts = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
  const gradeContext: GradeContext = {
    ...q,
    steps: run.steps ?? [],
    forbidden_external_keywords: run.forbidden_external_keywords ?? [],
  };

  const isInj = isInjection(cleanAnswer);
  const grading = isInj
    ? injectionGrading(q)
    : await gradeWithAI(gradeContext, cleanAnswer, req.attempt_number, maxAttempts, session);

  const isPassed = decidePass(grading, q.must_have_points ?? [], cleanAnswer);

  // 4. Cap nhat ket qua vao Database
  // 4.1. Ghi question_attempts
  const pointsCoveredArray = grading.points.map((p) => p.covered);
  await sql`
    INSERT INTO question_attempts (
      run_id, question_index, attempt_number, skill, core_accuracy, simplicity,
      intent, is_passed, points_covered, student_answer
    )
    VALUES (
      ${run.id},
      ${req.question_index},
      ${req.attempt_number},
      ${q.skill},
      ${grading.core_accuracy},
      ${grading.simplicity},
      ${grading.intent},
      ${isPassed},
      ${pointsCoveredArray},
      ${cleanAnswer}
    )
  `;

  // 4.2. Cap nhat cau hoi trong run
  q.attempts_used = req.attempt_number;
  q.last_answer = cleanAnswer;

  let skillChange: SkillChange | null = null;

  // 4.3. Neu cau hoan thanh (isPassed hoac het luot)
  if (isPassed || q.attempts_used === maxAttempts) {
    q.finished = true;
    q.ended_by = "ANSWER";
    q.outcome = outcomeOf(isPassed, q.attempts_used);

    // Doc skill_states hien tai de tinh BKT
    const skillRows = await sql<
      Array<{
        p_mastery: number;
        last_practiced_at: string;
        practice_count: number;
        correct_count: number;
      }>
    >`
      SELECT p_mastery, last_practiced_at, practice_count, correct_count
      FROM skill_states
      WHERE user_id = ${userId} AND skill = ${q.skill}
      LIMIT 1
    `;

    const prevSkill = skillRows[0]
      ? {
          skill: q.skill,
          p_mastery: Number(skillRows[0].p_mastery),
          last_practiced_at: new Date(skillRows[0].last_practiced_at).getTime(),
          practice_count: Number(skillRows[0].practice_count),
          correct_count: Number(skillRows[0].correct_count),
        }
      : undefined;

    const bktResult = computeSkillChange(q.skill, prevSkill, q.outcome, now);
    skillChange = bktResult.change;
    q.p_before = skillChange.p_before;
    q.p_after = skillChange.p_after;

    // Ghi cap nhat vao skill_states
    await sql`
      INSERT INTO skill_states (
        user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count
      )
      VALUES (
        ${userId},
        ${q.skill},
        ${bktResult.next.p_mastery},
        ${new Date(now)},
        ${bktResult.next.practice_count},
        ${bktResult.next.correct_count}
      )
      ON CONFLICT (user_id, skill) DO UPDATE SET
        p_mastery = EXCLUDED.p_mastery,
        last_practiced_at = EXCLUDED.last_practiced_at,
        practice_count = EXCLUDED.practice_count,
        correct_count = EXCLUDED.correct_count
    `;
  }

  // 4.4. Luu questions moi vao node_runs
  await sql`
    UPDATE node_runs
    SET questions = ${sql.json(run.questions as any)}
    WHERE id = ${run.id}
  `;

  // 4.5. Finalize run neu moi cau da xong
  const finalizeRes = await finalizeRunIfDone(
    session.id,
    run.node_id,
    run.id,
    run.questions,
    userId
  );

  const updatedProgress = await getSessionProgress(session.id, userId);
  const updatedNodeState = updatedProgress.nodes[run.node_id];

  const questionState: QuestionState = {
    question_index: q.question_index,
    feynman_question: q.feynman_question,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    attempts_used: q.attempts_used,
    finished: Boolean(q.finished),
    outcome: q.outcome ?? null,
    ended_by: q.ended_by ?? null,
    disputed: Boolean(q.disputed),
    reveal: q.finished && q.reference_answer ? {
      reference_answer: q.reference_answer,
      must_have_points: q.must_have_points ?? [],
      fix: q.fix ?? "",
    } : null,
  };

  return toEvaluateResponse(
    grading,
    gradeContext,
    cleanAnswer,
    req.attempt_number,
    maxAttempts,
    {
      questionState,
      skillChange,
      nodeState: updatedNodeState,
      unlockedNodeIds: finalizeRes.unlocked_node_ids,
      tokensUsed: session.tokens_used,
    }
  );
}
