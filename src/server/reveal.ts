import {
  type QuestionReveal,
  type QuestionState,
  type RevealRequest,
  type RevealResponse,
  type SkillChange,
} from "@/contracts";
import { computeSkillChange } from "@/lib/bkt-engine";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { finalizeRunIfDone, getSessionProgress } from "./progress";
import { verifyRunOwnership } from "./session";

/**
 * 03_API_VA_LUU_TRU.md Muc 6.3: reveal — "Bo qua cau nay"
 * 1. Doc run theo run_id, question_index
 * 2. Cau phai chua xong, nguoc lai ERR_QUESTION_FINISHED
 * 3. Dat finished = true, outcome = FAILED, ended_by = SKIP
 * 4. applyBkt(FAILED)
 * 5. finalizeRunIfDone, roi tra RevealResponse kem reveal
 * 0 token.
 */
export async function revealQuestion(
  req: RevealRequest,
  userId: string
): Promise<RevealResponse> {
  const now = Date.now();
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

  // Dat finished = true, outcome = FAILED, ended_by = SKIP
  q.finished = true;
  q.outcome = "FAILED";
  q.ended_by = "SKIP";

  // applyBkt(FAILED)
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

  const bktResult = computeSkillChange(
    q.skill,
    prevSkill,
    "FAILED",
    now
  );
  const skillChange: SkillChange = bktResult.change;
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

  // Luu questions moi vao node_runs
  await sql`
    UPDATE node_runs
    SET questions = ${sql.json(run.questions as any)}
    WHERE id = ${run.id}
  `;

  // finalizeRunIfDone
  const finalizeRes = await finalizeRunIfDone(
    session.id,
    run.node_id,
    run.id,
    run.questions,
    userId
  );

  const updatedProgress = await getSessionProgress(session.id, userId);
  const updatedNodeState = updatedProgress.nodes[run.node_id];

  const revealData: QuestionReveal = {
    reference_answer: q.reference_answer ?? "",
    must_have_points: q.must_have_points ?? [],
    fix: q.fix ?? "",
  };

  const questionState: QuestionState = {
    question_index: q.question_index,
    feynman_question: q.feynman_question,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    attempts_used: q.attempts_used ?? 0,
    finished: true,
    outcome: "FAILED",
    ended_by: "SKIP",
    disputed: Boolean(q.disputed),
    reveal: revealData,
  };

  return {
    question: questionState,
    skill_change: skillChange,
    node_state: updatedNodeState,
    unlocked_node_ids: finalizeRes.unlocked_node_ids,
  };
}
