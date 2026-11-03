import {
  CONFIG,
  type LearningSessionSummary,
  type SessionsResponse,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { toErrorResponse } from "@/server/errors";

export const dynamic = "force-dynamic";

interface SessionDbRow {
  session_id: string;
  source: "GITHUB" | "ZIP";
  repo_key: string;
  snapshot_id: string;
  snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";
  subdir: string;
  ref_label: string | null;
  repo_name: string;
  engine_version: string;
  created_at: string | Date;
  last_active_at: string | Date;
  total_nodes: number | string;
  completed_count: number | string;
  failed_count: number | string;
}

// 03_API_VA_LUU_TRU Muc 2: GET /api/sessions -> SessionsResponse
// Dung dung mot cau truy van SQL (jsonb_array_length, LEFT JOIN ... GROUP BY, khong lap N+1)
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    const rows = await sql<SessionDbRow[]>`
      SELECT
        s.id AS session_id,
        s.source,
        s.repo_key,
        s.snapshot_id,
        s.snapshot_id_kind,
        s.subdir,
        s.ref_label,
        s.repo_name,
        s.engine_version,
        s.created_at,
        s.last_active_at,
        jsonb_array_length(s.graph_skeleton) AS total_nodes,
        COUNT(CASE WHEN np.status = 'COMPLETED' THEN 1 END)::int AS completed_count,
        COUNT(CASE WHEN np.status = 'FAILED' THEN 1 END)::int AS failed_count
      FROM learning_sessions s
      LEFT JOIN node_progress np ON np.session_id = s.id
      WHERE s.user_id = ${user.id}
      GROUP BY s.id
      ORDER BY s.last_active_at DESC
    `;

    const sessions: LearningSessionSummary[] = rows.map((row) => {
      const isEngineMatch = row.engine_version === CONFIG.ENGINE_VERSION;
      return {
        session_id: row.session_id,
        snapshot: {
          source: row.source,
          repo_key: row.repo_key,
          snapshot_id: row.snapshot_id,
          snapshot_id_kind: row.snapshot_id_kind,
          subdir: row.subdir,
          ref_label: row.ref_label ?? null,
        },
        repo_name: row.repo_name,
        engine_version: row.engine_version,
        created_at: new Date(row.created_at).getTime(),
        last_active_at: new Date(row.last_active_at).getTime(),
        completed_count: Number(row.completed_count),
        failed_count: Number(row.failed_count),
        total_nodes: Number(row.total_nodes),
        can_resume: isEngineMatch,
        resume_blocker: isEngineMatch ? null : "ENGINE_UPDATED",
      };
    });

    const responseBody: SessionsResponse = {
      sessions,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
