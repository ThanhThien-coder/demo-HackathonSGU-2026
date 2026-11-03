import {
  CONFIG,
  type QuestionReveal,
  type QuestionState,
  type ReportWrongRequest,
  type ReportWrongResponse,
  type SkillChange,
} from "@/contracts";
import { revertSkillChange } from "@/lib/bkt-engine";
import { maskSensitive } from "@/lib/moderation";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { finalizeRunIfDone, getSessionProgress } from "./progress";
import { verifyRunOwnership } from "./session";

/**
 * 03_API_VA_LUU_TRU.md Muc 6.4: report-wrong — "Bao sai" (D-22)
 * 1. Cau phai co outcome = FAILED, ended_by = ANSWER, disputed = false; nguoc lai ERR_REPORT_NOT_ALLOWED
 * 2. Dat disputed = true
 * 3. Hoan tac BKT neu p_mastery khop p_after (revertSkillChange)
 * 4. Insert dispute_reports
 * 5. Tinh lai mau node (finalizeRunIfDone, cau disputed bi bo qua)
 * 6. Tra ReportWrongResponse
 */
export async function reportWrong(
  req: ReportWrongRequest,
  userId: string
): Promise<ReportWrongResponse> {
  const { run, session } = await verifyRunOwnership(req.run_id, userId);

  if (
    req.question_index < 1 ||
    req.question_index > (run.questions?.length ?? 0)
  ) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const q = run.questions[req.question_index - 1];

  // 1. Kiem tra dieu kien bao sai
  if (q.outcome !== "FAILED" || q.ended_by !== "ANSWER" || q.disputed) {
    throw new ApiHttpError("ERR_REPORT_NOT_ALLOWED");
  }

  // 2. Dat disputed = true
  q.disputed = true;

  // 3. Hoan tac BKT neu p_mastery khop p_after
  let revertedSkillChange: SkillChange | null = null;
  if (q.p_before !== null && q.p_after !== null) {
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

    if (skillRows.length > 0) {
      const currentState = {
        skill: q.skill,
        p_mastery: Number(skillRows[0].p_mastery),
        last_practiced_at: new Date(skillRows[0].last_practiced_at).getTime(),
        practice_count: Number(skillRows[0].practice_count),
        correct_count: Number(skillRows[0].correct_count),
      };

      const change: SkillChange = {
        skill: q.skill,
        p_before: q.p_before,
        p_after: q.p_after,
        outcome: "FAILED",
      };

      const revertResult = revertSkillChange(currentState, change);
      if (revertResult) {
        revertedSkillChange = revertResult.change;
        await sql`
          UPDATE skill_states
          SET
            p_mastery = ${revertResult.next.p_mastery},
            practice_count = ${revertResult.next.practice_count}
          WHERE user_id = ${userId} AND skill = ${q.skill}
        `;
      }
    }
  }

  // 4. Insert dispute_reports
  const cleanNote = maskSensitive(req.note || "").slice(0, CONFIG.REPORT_NOTE_MAX_CHARS);
  await sql`
    INSERT INTO dispute_reports (user_id, run_id, question_index, note)
    VALUES (${userId}, ${run.id}, ${req.question_index}, ${cleanNote})
  `;

  // Luu questions moi vao node_runs
  await sql`
    UPDATE node_runs
    SET questions = ${sql.json(run.questions as any)}
    WHERE id = ${run.id}
  `;

  // 5. Tinh lai mau node (finalizeRunIfDone bo qua cau disputed)
  await finalizeRunIfDone(
    session.id,
    run.node_id,
    run.id,
    run.questions,
    userId
  );

  const updatedProgress = await getSessionProgress(session.id, userId);
  const updatedNodeState = updatedProgress.nodes[run.node_id];

  const revealData: QuestionReveal | null = q.finished && q.reference_answer ? {
    reference_answer: q.reference_answer,
    must_have_points: q.must_have_points ?? [],
    fix: q.fix ?? "",
  } : null;

  const questionState: QuestionState = {
    question_index: q.question_index,
    feynman_question: q.feynman_question,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    attempts_used: q.attempts_used ?? 0,
    finished: Boolean(q.finished),
    outcome: q.outcome ?? null,
    ended_by: q.ended_by ?? null,
    disputed: true,
    reveal: revealData,
  };

  return {
    question: questionState,
    skill_change: revertedSkillChange,
    node_state: updatedNodeState,
  };
}
