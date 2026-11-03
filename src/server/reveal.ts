/**
 * src/server/reveal.ts
 *
 * POST /api/reveal — nut "Bo qua cau nay" (03 Muc 6.3, D-03).
 * 0 token. Cau chua xong ⇒ FAILED, ended_by SKIP, BKT FAILED, finalizeRunIfDone, tra reveal.
 * DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE, khong doi gi (D-40).
 */

import type { RevealRequest, RevealResponse } from "@/contracts";
import { db } from "./db";
import { ApiHttpError } from "./errors";
import { findQuestion, readRunQuestion } from "./evaluate";
import {
  applyBkt,
  finalizeRunIfDone,
  loadNodeState,
  lockRun,
  saveRunQuestions,
  toQuestionState,
  withDbRetry,
} from "./progress";

/** Body JSON tho => RevealRequest; truong sai kieu thanh gia tri rong de buoc doc bat loi. */
export function toRevealRequest(body: unknown): RevealRequest {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    session_id: typeof b.session_id === "string" ? b.session_id.trim() : "",
    run_id: typeof b.run_id === "string" ? b.run_id.trim() : "",
    question_index: typeof b.question_index === "number" ? b.question_index : Number.NaN,
  };
}

export async function revealQuestion(
  req: RevealRequest,
  userId: string,
  now: number = Date.now()
): Promise<RevealResponse> {
  // 1. Doc run theo run_id, question_index nhu 03 Muc 6.2 buoc 2
  const { run, question } = await readRunQuestion(req, userId);
  if (run.finished_at || question.finished) throw new ApiHttpError("ERR_QUESTION_FINISHED");

  return withDbRetry(() =>
    db.tx(async (tx) => {
      // 2. Khoa run; cau phai chua xong
      const run2 = await lockRun(tx, run.id);
      const q2 = findQuestion(run2, req.question_index);
      if (!q2) throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
      if (run2.finished_at || q2.finished) throw new ApiHttpError("ERR_QUESTION_FINISHED");

      // 3. finished, FAILED, SKIP
      q2.finished = true;
      q2.outcome = "FAILED";
      q2.ended_by = "SKIP";

      // 4. BKT FAILED (22 Muc 7)
      const skillChange = await applyBkt(tx, userId, q2.skill, "FAILED", now);
      q2.p_before = skillChange.p_before;
      q2.p_after = skillChange.p_after;

      await saveRunQuestions(tx, run2);

      // 5. finalizeRunIfDone, roi tra RevealResponse kem reveal (map tuong minh, API-03)
      const unlocked = await finalizeRunIfDone(tx, run2, now);
      const nodeState = await loadNodeState(tx, run2);
      return {
        question: toQuestionState(q2),
        skill_change: skillChange,
        node_state: nodeState,
        unlocked_node_ids: unlocked,
      };
    })
  );
}
