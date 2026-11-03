import type {
  AnswerIntent,
  AttemptHistoryItem,
  HistoryResponse,
  RunMode,
  SWESkill,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { withDbRead } from "@/server/progress";
import { verifySessionOwnership } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next 15: params cua route dong luon la Promise
type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AttemptDbRow {
  node_id: string;
  mode: RunMode;
  question_index: number;
  skill: SWESkill;
  attempt_number: number;
  core_accuracy: number;
  is_passed: boolean;
  intent: AnswerIntent;
  student_answer: string;
  created_at: string | Date;
}

// 03_API_VA_LUU_TRU Muc 2 dong 4: GET /api/sessions/{session_id}/history -> HistoryResponse
// Chi doc DB (question_attempts + node_runs + graph_skeleton); phien engine cu van xem duoc lich su.
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    const { id: sessionId } = await context.params;
    if (!UUID_RE.test(sessionId)) throw new ApiHttpError("ERR_SESSION_NOT_FOUND");

    // API-05: phien phai thuoc nguoi goi; DB loi ⇒ ERR_PERSISTENCE_UNAVAILABLE
    const session = await withDbRead(() => verifySessionOwnership(sessionId, user.id));

    const rows = await withDbRead(() => sql<AttemptDbRow[]>`
      SELECT r.node_id, r.mode, a.question_index, a.skill, a.attempt_number,
             a.core_accuracy, a.is_passed, a.intent, a.student_answer, a.created_at
      FROM question_attempts a
      JOIN node_runs r ON r.id = a.run_id
      WHERE r.session_id = ${session.id}
      ORDER BY a.created_at ASC, a.id ASC
    `);

    const skeleton =
      typeof session.graph_skeleton === "string"
        ? (JSON.parse(session.graph_skeleton) as typeof session.graph_skeleton)
        : session.graph_skeleton ?? [];
    const titleById = new Map(skeleton.map((n) => [n.node_id, n.title]));

    // Map tuong minh (API-03): student_answer da che luc ghi (D-65)
    const items: AttemptHistoryItem[] = rows.map((r) => ({
      node_id: r.node_id,
      node_title: titleById.get(r.node_id) ?? r.node_id,
      mode: r.mode,
      question_index: Number(r.question_index),
      skill: r.skill,
      attempt_number: Number(r.attempt_number),
      core_accuracy: Number(r.core_accuracy),
      is_passed: Boolean(r.is_passed),
      intent: r.intent,
      student_answer: r.student_answer,
      created_at: new Date(r.created_at).getTime(),
    }));

    const responseBody: HistoryResponse = { items };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
