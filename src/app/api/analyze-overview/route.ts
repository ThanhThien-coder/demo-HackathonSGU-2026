/**
 * src/app/api/analyze-overview/route.ts
 *
 * POST /api/analyze-overview -> AnalyzeOverviewResponse
 * Theo spec 03 Mục 2 dòng 7, Mục 6.6 và spec 02 Mục 8.
 */

import {
  CONFIG,
  type AnalyzeOverviewResponse,
  type NodeAnalysis,
  type RepoOverviewRaw,
} from "@/contracts";
import { aiCostUsd } from "@/server/ai/gemini";
import {
  analyzeOverview,
  overviewFacts,
  type OverviewUsage,
} from "@/server/ai/overview";
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

interface InFlightOverviewResult {
  overview: RepoOverviewRaw | null;
  usage: OverviewUsage;
  initiatorSessionId: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      body =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {};
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const sessionId =
      typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    // Kiểm tra quyền sở hữu phiên (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);

    // Lấy kết quả tĩnh của phiên (03 Mục 4, D-59)
    const graph = await getSessionStaticResult(session, user.id);
    const facts = overviewFacts(graph);

    // Khóa cache AI (03 Mục 3.3)
    const cacheKey = `ov|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

    // Tra cứu ai_cache trong Postgres
    const cachedRows = await sql<Array<{ payload: RepoOverviewRaw | string }>>`
      SELECT payload
      FROM ai_cache
      WHERE cache_key = ${cacheKey}
      LIMIT 1
    `;

    // TRƯỜNG HỢP 1: TRÚNG CACHE
    // Trả ngay facts + ai, 0 token, không kiểm quota, không ghi ai_usage
    if (cachedRows.length > 0) {
      const rawPayload = cachedRows[0].payload;
      const cachedOverview: RepoOverviewRaw =
        typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;

      const progress = await getSessionProgress(session.id, user.id);
      const resBody: AnalyzeOverviewResponse = {
        overview: {
          facts,
          ai: cachedOverview,
        },
        tokens_used: progress.tokens_used,
      };

      return new Response(JSON.stringify(resBody), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // TRƯỜNG HỢP 2: TRƯỢT CACHE
    // 2.1 Đọc node_progress.analysis_failed của phiên ⇒ failedIds
    const progressRows = await sql<
      Array<{ node_id: string; analysis_failed: boolean }>
    >`
      SELECT node_id, analysis_failed
      FROM node_progress
      WHERE session_id = ${session.id}
    `;
    const failedIds = new Set<string>(
      progressRows.filter((r) => r.analysis_failed).map((r) => r.node_id)
    );

    // Với mọi node KHÔNG thuộc failedIds, đọc bản phân tích từ ai_cache theo khóa na|…
    const nodesToAnalyze = graph.nodes.filter((n) => !failedIds.has(n.id));
    const analyses: Record<string, NodeAnalysis> = {};

    if (nodesToAnalyze.length > 0) {
      const nodeKeyMap = new Map<string, string>();
      for (const n of nodesToAnalyze) {
        const naKey = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${n.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
        nodeKeyMap.set(naKey, n.id);
      }
      const nodeCacheKeys = Array.from(nodeKeyMap.keys());

      const analysisRows = await sql<
        Array<{ cache_key: string; payload: NodeAnalysis | string }>
      >`
        SELECT cache_key, payload
        FROM ai_cache
        WHERE cache_key IN ${sql(nodeCacheKeys)}
      `;

      if (analysisRows.length < nodesToAnalyze.length) {
        throw new ApiHttpError("ERR_OVERVIEW_NOT_READY");
      }

      for (const row of analysisRows) {
        const nodeId = nodeKeyMap.get(row.cache_key);
        if (!nodeId) continue;
        const parsedPayload =
          typeof row.payload === "string"
            ? (JSON.parse(row.payload) as NodeAnalysis)
            : row.payload;
        analyses[nodeId] = parsedPayload;
      }

      for (const n of nodesToAnalyze) {
        if (!analyses[n.id]) {
          throw new ApiHttpError("ERR_OVERVIEW_NOT_READY");
        }
      }
    }

    // 2.2 Kiểm tra hạn mức token trước khi gọi AI (AI-06, API-06)
    checkTokenQuota(session.tokens_used);

    // 2.3 Gọi analyzeOverview qua in-flight map (03 Mục 3.3, 20 AI-08)
    let inFlight = getInFlightPromise<InFlightOverviewResult>(cacheKey);
    let isInitiator = false;

    if (!inFlight) {
      isInitiator = true;
      const usage: OverviewUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
      inFlight = (async () => {
        try {
          const overview = await analyzeOverview(
            session,
            graph,
            analyses,
            failedIds,
            usage
          );
          return { overview, usage, initiatorSessionId: session.id };
        } finally {
          deleteInFlightPromise(cacheKey);
        }
      })();
      setInFlightPromise(cacheKey, inFlight);
    }

    const { overview, usage } = await inFlight;

    // Cộng token cho phiên khởi tạo
    if (isInitiator && (usage.tokens_in > 0 || usage.tokens_out > 0)) {
      await addSessionTokens(session.id, usage.tokens_in, usage.tokens_out);
    }

    if (overview !== null) {
      if (isInitiator) {
        await sql`
          INSERT INTO ai_cache (
            cache_key, kind, payload, model, prompt_version, tokens_in, tokens_out
          )
          VALUES (
            ${cacheKey},
            'REPO_OVERVIEW',
            ${JSON.stringify(overview)}::text::jsonb,
            ${CONFIG.LLM_MODEL},
            ${CONFIG.PROMPT_VERSION},
            ${usage.tokens_in},
            ${usage.tokens_out}
          )
          ON CONFLICT (cache_key) DO NOTHING
        `;

        try {
          const costUsd = aiCostUsd(usage.tokens_in, usage.tokens_out);
          await sql`
            INSERT INTO ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
            VALUES (${session.id}, 'OVERVIEW', ${usage.tokens_in}, ${usage.tokens_out}, ${costUsd})
          `;
        } catch (err: unknown) {
          logger.warn({
            msg: "Ghi ai_usage thất bại",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const progress = await getSessionProgress(session.id, user.id);

    const resBody: AnalyzeOverviewResponse = {
      overview: {
        facts,
        ai: overview,
      },
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
