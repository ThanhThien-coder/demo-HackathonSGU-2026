import {
  CONFIG,
  type AnalyzeOverviewRequest,
  type AnalyzeOverviewResponse,
  type RepoOverviewRaw,
  type RepoOverviewView,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { getSessionStaticResult, verifySessionOwnership } from "@/server/session";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 7, Muc 6.6: POST /api/analyze-overview -> AnalyzeOverviewResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<AnalyzeOverviewRequest>;
    try {
      body = (await request.json()) as Partial<AnalyzeOverviewRequest>;
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (isLocalMockEnabled()) {
      return new Response(JSON.stringify(mockDevStore.analyzeOverview(sessionId)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // 1. Kiem tra quyen so huu phien (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);

    // 2. Lay StaticEngineResult cua phien (03 Muc 4)
    const graph = await getSessionStaticResult(session, user.id);

    // 3. Kiem tra tinh san sang cua cac ban phan tich node (03 Muc 6.6)
    const failedNodeRows = await sql<Array<{ node_id: string }>>`
      SELECT node_id
      FROM node_progress
      WHERE session_id = ${session.id} AND analysis_failed = true
    `;
    const failedNodeIds = new Set(failedNodeRows.map((r) => r.node_id));

    const requiredNodes = graph.nodes.filter((n) => !failedNodeIds.has(n.id));

    if (requiredNodes.length > 0) {
      const cachePrefix = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|`;
      const cachedCountRows = await sql<Array<{ count: string | number }>>`
        SELECT COUNT(*)::int AS count
        FROM ai_cache
        WHERE cache_key LIKE ${cachePrefix + "%"}
      `;
      const cachedCount = Number(cachedCountRows[0]?.count ?? 0);

      if (cachedCount < requiredNodes.length) {
        throw new ApiHttpError("ERR_OVERVIEW_NOT_READY");
      }
    }

    // 4. Khoa cache overview (03 Muc 3.3)
    const cacheKey = `ov|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

    const cachedRows = await sql<Array<{ payload: RepoOverviewRaw | string }>>`
      SELECT payload
      FROM ai_cache
      WHERE cache_key = ${cacheKey}
      LIMIT 1
    `;

    let aiOverview: RepoOverviewRaw | null = null;
    if (cachedRows.length > 0) {
      const rawPayload = cachedRows[0].payload;
      aiOverview = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
    }

    // 5. Dung facts do code tinh (AI-19, AI-20)
    const rootNodes = graph.nodes.filter((n) => !n.prerequisites || n.prerequisites.length === 0);
    const rootNodeIds = rootNodes.map((n) => n.id);
    const mainPathNodeIds = graph.nodes.slice(0, Math.min(graph.nodes.length, 5)).map((n) => n.id);

    const facts: RepoOverviewView["facts"] = {
      archetype: graph.fingerprint.archetype,
      framework: graph.fingerprint.detected_framework ?? null,
      tech_stack: graph.fingerprint.tech_stack ?? [],
      root_node_ids: rootNodeIds,
      main_path_node_ids: mainPathNodeIds,
    };

    const overview: RepoOverviewView = {
      facts,
      ai: aiOverview,
    };

    const responseBody: AnalyzeOverviewResponse = {
      overview,
      tokens_used: session.tokens_used,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
