/**
 * src/server/report.ts
 *
 * POST /api/report-wrong — nut "Bao sai" (03 Muc 6.4, D-22, 21 GUARD-17).
 * Chi cho cau outcome FAILED, ended_by ANSWER, chua disputed. 0 token.
 * DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE, khong doi gi (D-40).
 */

import {
  CONFIG,
  type CognitiveSkillState,
  type DbTx,
  type ReportWrongRequest,
  type ReportWrongResponse,
  type SkillChange,
  type SWESkill,
} from "@/contracts";
import { revertSkillChange } from "@/lib/bkt-engine";
import { maskSensitive } from "@/lib/moderation";
import { nodeStatusFromRuns } from "@/lib/plan";
import { db, type TransactionSql } from "./db";
import { redactSecrets } from "./engine/ingest/secrets";
import { ApiHttpError } from "./errors";
import { findQuestion, readRunQuestion } from "./evaluate";
import { logger } from "./log";
import {
  loadNodeState,
  lockRun,
  saveRunQuestions,
  toQuestionState,
  withDbRetry,
} from "./progress";
import type { RunRecord } from "./session";

// DbTx = unknown o contracts (02 Muc 7); tang luu tru that la TransactionSql cua driver postgres
const asTx = (tx: DbTx): TransactionSql => tx as TransactionSql;

/** Body JSON tho => ReportWrongRequest; truong sai kieu thanh gia tri rong de buoc doc bat loi. */
export function toReportWrongRequest(body: unknown): ReportWrongRequest {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    session_id: typeof b.session_id === "string" ? b.session_id.trim() : "",
    run_id: typeof b.run_id === "string" ? b.run_id.trim() : "",
    question_index: typeof b.question_index === "number" ? b.question_index : Number.NaN,
    note: typeof b.note === "string" ? b.note : "",
  };
}

/**
 * Che ghi chu theo maskSensitive(redactSecrets(note).code) (03 Muc 6.4 buoc 4, D-65).
 * Client da gioi han CONFIG.REPORT_NOTE_MAX_CHARS (30 UI); nhan che co the dai hon gia tri bi che
 * nen cat theo code point de khong vi pham check char_length(note) cua dispute_reports.
 */
export function cleanReportNote(note: string): string {
  const masked = maskSensitive(redactSecrets(note).code);
  return [...masked].slice(0, CONFIG.REPORT_NOTE_MAX_CHARS).join("");
}

interface SkillStateDbRow {
  skill: SWESkill;
  p_mastery: number | string;
  last_practiced_at: string | Date;
  practice_count: number | string;
  correct_count: number | string;
}

/**
 * Hoan diem ky nang (22 BKT-63): chi khi p_mastery hien tai van bang p_after cua cau (sai so BKT_REVERT_EPSILON).
 * Dat p_mastery = p_before, practice_count − 1; giu last_practiced_at va correct_count. Khong hoan ⇒ null.
 */
async function revertSkillIfUnchanged(
  tx: DbTx,
  userId: string,
  change: SkillChange
): Promise<SkillChange | null> {
  const t = asTx(tx);
  const rows = await t<SkillStateDbRow[]>`
    SELECT skill, p_mastery, last_practiced_at, practice_count, correct_count
    FROM skill_states
    WHERE user_id = ${userId} AND skill = ${change.skill}
    FOR UPDATE
  `;
  if (rows.length === 0) return null;

  const state: CognitiveSkillState = {
    skill: rows[0].skill,
    p_mastery: Number(rows[0].p_mastery),
    last_practiced_at: new Date(rows[0].last_practiced_at).getTime(),
    practice_count: Number(rows[0].practice_count),
    correct_count: Number(rows[0].correct_count),
  };
  const reverted = revertSkillChange(state, change);
  if (!reverted) return null;

  await t`
    UPDATE skill_states
    SET p_mastery = ${reverted.next.p_mastery},
        practice_count = ${reverted.next.practice_count}
    WHERE user_id = ${userId} AND skill = ${change.skill}
  `;
  return reverted.change;
}

/**
 * Tinh lai mau node khi run da chot (03 Muc 6.4 buoc 5, 22 Muc 8): cau disputed bi bo qua.
 * Run chua chot ⇒ khong ghi; mau se tinh khi finalizeRunIfDone.
 */
async function recolorNode(tx: DbTx, run: RunRecord): Promise<void> {
  if (!run.finished_at) return;
  const status = nodeStatusFromRuns([
    {
      mode: run.mode,
      started_at: new Date(run.started_at).getTime(),
      finished_at: new Date(run.finished_at).getTime(),
      questions: run.questions,
    },
  ]);
  if (!status) return;

  await asTx(tx)`
    INSERT INTO node_progress (session_id, node_id, status, updated_at)
    VALUES (${run.session_id}, ${run.node_id}, ${status}, now())
    ON CONFLICT (session_id, node_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function reportWrong(
  req: ReportWrongRequest,
  userId: string
): Promise<ReportWrongResponse> {
  const cleanNote = cleanReportNote(req.note);

  // Doc khong khoa: run thuoc session_id cua userId, question_index 1..n (API-05); DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE
  const { run } = await readRunQuestion(req, userId);

  const result = await withDbRetry(() =>
    db.tx(async (tx) => {
      // 1. Khoa run; cau phai FAILED + ANSWER + chua disputed
      const run2 = await lockRun(tx, run.id);
      const q2 = findQuestion(run2, req.question_index);
      if (!q2) throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
      if (q2.outcome !== "FAILED" || q2.ended_by !== "ANSWER" || q2.disputed) {
        throw new ApiHttpError("ERR_REPORT_NOT_ALLOWED");
      }

      // 2. Danh dau 🚩
      q2.disputed = true;

      // 3. Hoan diem neu chua bi cap nhat lai (BKT-63)
      let skillChange: SkillChange | null = null;
      if (q2.p_before !== null && q2.p_after !== null) {
        skillChange = await revertSkillIfUnchanged(tx, userId, {
          skill: q2.skill,
          p_before: q2.p_before,
          p_after: q2.p_after,
          outcome: "FAILED",
        });
      }

      // 4. Ghi dispute_reports voi ghi chu da che
      await tx`
        INSERT INTO dispute_reports (user_id, run_id, question_index, note)
        VALUES (${userId}, ${run2.id}, ${q2.question_index}, ${cleanNote})
      `;

      await saveRunQuestions(tx, run2);

      // 5. Tinh lai mau node, bo qua cau disputed
      await recolorNode(tx, run2);
      const nodeState = await loadNodeState(tx, run2);

      // 6. Map tuong minh (API-03)
      return {
        question: toQuestionState(q2),
        skill_change: skillChange,
        node_state: nodeState,
      };
    })
  );

  // D-22: ghi log cho nhom (khong ghi noi dung ghi chu)
  logger.info({
    msg: "Bao sai",
    run_id: run.id,
    question_index: req.question_index,
    reverted: result.skill_change !== null,
  });
  return result;
}
