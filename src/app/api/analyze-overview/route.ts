/**
 * src/app/api/analyze-overview/route.ts
 *
 * POST /api/analyze-overview -> AnalyzeOverviewResponse
 * Theo spec 03 Mục 2 dòng 7, Mục 6.6 và spec 02 Mục 8.
 */

import {
  CONFIG,
  type AnalyzeOverviewResponse,
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
import type postgres from "postgres";
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
    // Gọi ngay sau khi quét, không chờ analyze-node, không gửi code (20 AI-19, D-83)
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
          const overview = await analyzeOverview(session, graph, usage);
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
        // Truyền đối tượng qua sql.json: không JSON.stringify + ::jsonb (driver mã hóa 2 lần, DB lưu thành chuỗi)
        const payload: postgres.JSONValue = JSON.parse(JSON.stringify(overview));
        await sql`
          INSERT INTO ai_cache (
            cache_key, kind, payload, model, prompt_version, tokens_in, tokens_out
          )
          VALUES (
            ${cacheKey},
            'REPO_OVERVIEW',
            ${sql.json(payload)},
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
