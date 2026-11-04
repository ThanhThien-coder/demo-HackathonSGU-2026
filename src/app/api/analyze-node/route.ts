import {
  CONFIG,
  type AnalyzeNodeResponse,
  type NodeAnalysis,
  type NodeAnalysisView,
  type NodeStatus,
} from "@/contracts";
import { deriveNodeStates } from "@/lib/derive";
import {
  analyzeNode,
  toAnalysisView,
  type AnalyzeUsage,
} from "@/server/ai/analyze";
import { aiCostUsd } from "@/server/ai/gemini";
import { authenticateRequest } from "@/server/auth";
import {
  deleteInFlightPromise,
  getInFlightPromise,
  setInFlightPromise,
} from "@/server/cache";
import { sql } from "@/server/db";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { logger } from "@/server/log";
import { getSessionProgress } from "@/server/progress";
import { addSessionTokens, checkTokenQuota } from "@/server/quota";
import {
  getSessionStaticResult,
  verifySessionOwnership,
} from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InFlightAnalysisResult {
  analysis: NodeAnalysis | null;
  usage: AnalyzeUsage;
  initiatorSessionId: string;
}

// 03_API_VA_LUU_TRU Muc 2 dong 6, Muc 6.6: POST /api/analyze-node -> AnalyzeNodeResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const nodeId = typeof body.node_id === "string" ? body.node_id.trim() : "";

    if (!sessionId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    if (!nodeId) {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    // Kiem tra quyen so huu phien (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);

    // Lay ket qua tinh cua phien (03 Muc 4, D-59)
    const graph = await getSessionStaticResult(session, user.id);

    // Tim node trong do thi
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    // Khoa cache AI (03 Muc 3.3)
    const cacheKey = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

    // Tra cuu ai_cache trong Postgres
    const cachedRows = await sql<Array<{ payload: NodeAnalysis | string }>>`
      SELECT payload
      FROM ai_cache
      WHERE cache_key = ${cacheKey}
      LIMIT 1
    `;

    // TRUONG HOP 1: TRUNG CACHE (03 Muc 6.6, X-13, ca D7)
    // Tinh 0 token, khong ghi ai_usage, khong kiem quota (ca D7 van tra)
    if (cachedRows.length > 0) {
      const rawPayload = cachedRows[0].payload;
      const cachedAnalysis: NodeAnalysis =
        typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;

      const analysisView: NodeAnalysisView = toAnalysisView(cachedAnalysis, node, graph);

      // Xoa co analysis_failed neu truoc do node tung bi loi
      await sql`
        UPDATE node_progress
        SET analysis_failed = false, updated_at = now()
        WHERE session_id = ${session.id} AND node_id = ${node.id} AND analysis_failed = true
      `;

      const progress = await getSessionProgress(session.id, user.id);
      const nodeState = progress.nodes[node.id];

      const resBody: AnalyzeNodeResponse = {
        node_id: node.id,
        analysis: analysisView,
        node_state: nodeState,
        unlocked_node_ids: [],
        tokens_used: progress.tokens_used,
      };

      return new Response(JSON.stringify(resBody), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // TRUONG HOP 2: TRUOT CACHE
    // 2.1 Kiem tra han muc token truoc khi goi AI (AI-06, API-06, ca D7)
    checkTokenQuota(session.tokens_used);

    // Doc trang thai cu de tinh unlocked_node_ids neu phan tich that bai
    const oldProgressRows = await sql<
      Array<{
        node_id: string;
        status: Exclude<NodeStatus, "LOCKED"> | null;
        analysis_failed: boolean;
      }>
    >`
      SELECT node_id, status, analysis_failed
      FROM node_progress
      WHERE session_id = ${session.id}
    `;
    const oldDerived = deriveNodeStates(session.graph_skeleton, oldProgressRows);

    // 2.2 Dung chung promise qua in-flight map (03 Muc 3.3, 20 AI-08)
    let inFlight = getInFlightPromise<InFlightAnalysisResult>(cacheKey);
    let isInitiator = false;

    if (!inFlight) {
      isInitiator = true;
      const usage: AnalyzeUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
      inFlight = (async () => {
        try {
          const analysis = await analyzeNode(session, graph, node, usage);
          return { analysis, usage, initiatorSessionId: session.id };
        } finally {
          deleteInFlightPromise(cacheKey);
        }
      })();
      setInFlightPromise(cacheKey, inFlight);
    }

    const { analysis, usage } = await inFlight;

    // Cong token cho phien khoi tao
    if (isInitiator && (usage.tokens_in > 0 || usage.tokens_out > 0)) {
      await addSessionTokens(session.id, usage.tokens_in, usage.tokens_out);
    }

    if (analysis !== null) {
      // Phan tich thanh cong:
      // - Ghi ai_cache (03 Muc 3.3, D-15)
      if (isInitiator) {
        await sql`
          INSERT INTO ai_cache (
            cache_key, kind, payload, model, prompt_version, tokens_in, tokens_out
          )
          VALUES (
            ${cacheKey},
            'NODE_ANALYSIS',
            ${JSON.stringify(analysis)}::text::jsonb,
            ${CONFIG.LLM_MODEL},
            ${CONFIG.PROMPT_VERSION},
            ${usage.tokens_in},
            ${usage.tokens_out}
          )
          ON CONFLICT (cache_key) DO NOTHING
        `;

        // - B2: Ghi ai_usage ngoai transaction (03 Muc 6, X-13, D-66)
        try {
          const costUsd = aiCostUsd(usage.tokens_in, usage.tokens_out);
          await sql`
            INSERT INTO ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
            VALUES (${session.id}, 'ANALYZE', ${usage.tokens_in}, ${usage.tokens_out}, ${costUsd})
          `;
        } catch (err: unknown) {
          logger.warn({
            msg: "Ghi ai_usage thất bại",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Xoa co analysis_failed neu co
      await sql`
        UPDATE node_progress
        SET analysis_failed = false, updated_at = now()
        WHERE session_id = ${session.id} AND node_id = ${node.id} AND analysis_failed = true
      `;

      const analysisView: NodeAnalysisView = toAnalysisView(analysis, node, graph);
      const progress = await getSessionProgress(session.id, user.id);
      const nodeState = progress.nodes[node.id];

      const resBody: AnalyzeNodeResponse = {
        node_id: node.id,
        analysis: analysisView,
        node_state: nodeState,
        unlocked_node_ids: [],
        tokens_used: progress.tokens_used,
      };

      return new Response(JSON.stringify(resBody), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Phan tich that bai (analysis === null):
    // - Khong ghi ai_cache, khong ghi ai_usage
    // - Ghi nhan co analysis_failed = true vao node_progress (03 Muc 6.6, D-03 #20)
    await sql`
      INSERT INTO node_progress (session_id, node_id, status, analysis_failed, updated_at)
      VALUES (${session.id}, ${node.id}, NULL, true, now())
      ON CONFLICT (session_id, node_id)
      DO UPDATE SET analysis_failed = true, updated_at = now()
    `;

    const progress = await getSessionProgress(session.id, user.id);
    const nodeState = progress.nodes[node.id];

    // Tinh node con duoc mo khoa nho analysis_failed (D-03)
    const unlockedNodeIds: string[] = [];
    for (const item of session.graph_skeleton) {
      const wasLocked = oldDerived[item.node_id]?.status === "LOCKED";
      const nowAvailable = progress.nodes[item.node_id]?.status === "AVAILABLE";
      if (wasLocked && nowAvailable) {
        unlockedNodeIds.push(item.node_id);
      }
    }

    const resBody: AnalyzeNodeResponse = {
      node_id: node.id,
      analysis: null,
      node_state: nodeState,
      unlocked_node_ids: unlockedNodeIds,
      tokens_used: progress.tokens_used,
    };

    return new Response(JSON.stringify(resBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
