import type { AttemptHistoryItem, HistoryResponse, GraphSkeletonNode } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { toErrorResponse } from "@/server/errors";
import { verifySessionOwnership } from "@/server/session";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface AttemptDbRow {
  node_id: string;
  mode: "LEARN";
  question_index: number;
  skill: string;
  attempt_number: number;
  core_accuracy: number;
  is_passed: boolean;
  intent: "ANSWER" | "GIVE_UP" | "OFF_TOPIC";
  student_answer: string;
  created_at: string | Date;
}

// 03_API_VA_LUU_TRU Muc 2 dong 4: GET /api/sessions/{session_id}/history -> HistoryResponse
export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    const { id: sessionId } = await context.params;

    if (isLocalMockEnabled()) {
      return new Response(JSON.stringify(mockDevStore.getHistory(sessionId)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Kiem tra quyen so huu phien (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);
    const skeleton = (session.graph_skeleton as GraphSkeletonNode[]) ?? [];

    const titleMap = new Map<string, string>();
    for (const n of skeleton) {
      titleMap.set(n.node_id, n.title);
    }

    // Doc cac luot tra loi cua phien
    const rows = await sql<AttemptDbRow[]>`
      SELECT
        r.node_id,
        r.mode,
        qa.question_index,
        qa.skill,
        qa.attempt_number,
        qa.core_accuracy,
        qa.is_passed,
        qa.intent,
        qa.student_answer,
        qa.created_at
      FROM question_attempts qa
      JOIN node_runs r ON r.id = qa.run_id
      WHERE r.session_id = ${sessionId}
      ORDER BY qa.created_at DESC
    `;

    const items: AttemptHistoryItem[] = rows.map((row) => ({
      node_id: row.node_id,
      node_title: titleMap.get(row.node_id) ?? row.node_id,
      mode: row.mode,
      question_index: Number(row.question_index),
      skill: row.skill as any,
      attempt_number: Number(row.attempt_number),
      core_accuracy: Number(row.core_accuracy),
      is_passed: Boolean(row.is_passed),
      intent: row.intent,
      student_answer: row.student_answer,
      created_at: new Date(row.created_at).getTime(),
    }));

    const responseBody: HistoryResponse = {
      items,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
