import {
  CONFIG,
  type HybridArchitecturalNode,
  type IngestResponse,
  type IngestSource,
  type NodeAnalysis,
  type NodeAnalysisView,
  type StaticEngineResult,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { runEngine, toClientResult } from "@/server/engine";
import { IngestionError } from "@/server/engine/ingest/types";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { logger } from "@/server/log";
import { getSessionProgress } from "@/server/progress";
import { toAnalysisView } from "@/server/ai/analyze";
import {
  createOrResumeSession,
  getSessionStaticResult,
  ingestionSemaphore,
  restartSession,
  verifySessionOwnership,
} from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * B4: Boc loi engine va ap dung semaphore MAX_CONCURRENT_INGESTIONS (D-31).
 * IngestionError doi thanh ApiHttpError giu nguyen code va details,
 * khong truyen err.message (de ApiHttpError tu lay thong diep theo 02 Muc 9).
 * Loi khac nem tiep, khong gan ma ingest.
 */
async function executeEngine(
  source: IngestSource,
  signal?: AbortSignal
): Promise<StaticEngineResult> {
  const release = await ingestionSemaphore.acquire();
  try {
    return await runEngine(source, signal);
  } catch (err: unknown) {
    if (err instanceof IngestionError) {
      throw new ApiHttpError(err.code, undefined, err.details);
    }
    throw err;
  } finally {
    release();
  }
}

/**
 * Doc phan tich co san tu ai_cache (03 Muc 6.6, A-05).
 * Chi doc ai_cache: khong goi AI, khong kiem quota, khong ghi ai_usage,
 * khong doi tokens_used, khong sua analysis_failed.
 */
async function loadCachedAnalyses(
  staticResult: StaticEngineResult
): Promise<Record<string, NodeAnalysisView>> {
  if (!staticResult.nodes || staticResult.nodes.length === 0) {
    return {};
  }

  const nodeByKey = new Map<string, HybridArchitecturalNode>();
  for (const node of staticResult.nodes) {
    const cacheKey = `na|${staticResult.snapshot.source}|${staticResult.snapshot.snapshot_id}|${staticResult.snapshot.subdir}|${staticResult.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
    nodeByKey.set(cacheKey, node);
  }

  const keys = Array.from(nodeByKey.keys());
  if (keys.length === 0) {
    return {};
  }

  const rows = await sql<Array<{ cache_key: string; payload: NodeAnalysis | string }>>`
    SELECT cache_key, payload FROM ai_cache WHERE cache_key IN ${sql(keys)}
  `;

  const analyses: Record<string, NodeAnalysisView> = {};
  for (const row of rows) {
    const node = nodeByKey.get(row.cache_key);
    if (!node) continue;

    try {
      const rawPayload = row.payload;
      const cachedAnalysis: NodeAnalysis =
        typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
      analyses[node.id] = toAnalysisView(cachedAnalysis, node, staticResult);
    } catch {
      logger.warn({ node_id: node.id });
    }
  }

  return analyses;
}

/** Dung IngestResponse chung cho moi nhanh (03 Muc 6.6). */
async function buildResponse(
  sessionId: string,
  userId: string,
  staticResult: StaticEngineResult,
  resumed: boolean,
  fromCache: boolean
): Promise<Response> {
  const progress = await getSessionProgress(sessionId, userId);
  const analyses = await loadCachedAnalyses(staticResult);

  const body: IngestResponse = {
    session_id: sessionId,
    result: toClientResult(staticResult), // API-03: bo symbol_whitelist, suspicious_instruction_files
    progress,
    analyses,
    resumed,
    from_cache: fromCache,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Chay engine cho nguon moi (link GitHub / zip) roi tao hoac mo lai phien trung khoa. */
async function ingestNewSource(source: IngestSource, userId: string, signal: AbortSignal) {
  const engineResult = await executeEngine(source, signal);
  const { session, result, resumed, from_cache } = await createOrResumeSession(
    userId,
    engineResult
  );
  return buildResponse(session.id, userId, result, resumed, from_cache);
}

// 03_API_VA_LUU_TRU Muc 2 dong 5, Muc 6.6: POST /api/ingest -> IngestResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    const contentType = request.headers.get("content-type") ?? "";

    // B3: Upload .zip qua multipart/form-data (truong "archive", "subdir" tuy chon)
    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        throw new ApiHttpError("ERR_UPLOAD_INVALID");
      }

      const archive = formData.get("archive");
      if (!(archive instanceof Blob)) {
        throw new ApiHttpError("ERR_UPLOAD_INVALID");
      }

      // D-27: tran upload chung
      if (archive.size > CONFIG.MAX_UPLOAD_BYTES) {
        throw new ApiHttpError("ERR_STREAM_QUOTA_EXCEEDED");
      }

      const rawSubdir = formData.get("subdir");
      const subdir = typeof rawSubdir === "string" ? rawSubdir.trim() : "";

      const source: IngestSource = {
        kind: "ZIP_UPLOAD",
        file_name: archive instanceof File ? archive.name : "upload.zip",
        bytes: new Uint8Array(await archive.arrayBuffer()),
        subdir_override: subdir || null,
      };
      return await ingestNewSource(source, user.id, request.signal);
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      throw new ApiHttpError("ERR_INVALID_GITHUB_URL");
    }

    // B2: Mo lai phien { session_id, restart? } — doc snapshot CSDL, khong tai lai, khong chay engine
    if (typeof body.session_id === "string" && body.session_id.trim() !== "") {
      const sessionId = body.session_id.trim();

      if (body.restart === true) {
        // "Hoc lai tu dau" (D-42): phien moi cung snapshot, node_progress trong
        const { session, staticResult } = await restartSession(sessionId, user.id);
        return await buildResponse(session.id, user.id, staticResult, false, true);
      }

      const session = await verifySessionOwnership(sessionId, user.id);
      // getSessionStaticResult nem ERR_SESSION_ENGINE_OUTDATED khi engine_version lech
      const staticResult = await getSessionStaticResult(session, user.id);

      await sql`
        UPDATE learning_sessions
        SET last_active_at = now()
        WHERE id = ${session.id}
      `;

      return await buildResponse(session.id, user.id, staticResult, true, true);
    }

    // B1: Link GitHub { repo_url, subdir_override? }
    if (typeof body.repo_url === "string" && body.repo_url.trim() !== "") {
      const subdirOverride =
        typeof body.subdir_override === "string" && body.subdir_override.trim() !== ""
          ? body.subdir_override.trim()
          : null;

      const source: IngestSource = {
        kind: "GITHUB_URL",
        repo_url: body.repo_url.trim(),
        subdir_override: subdirOverride,
      };
      return await ingestNewSource(source, user.id, request.signal);
    }

    throw new ApiHttpError("ERR_INVALID_GITHUB_URL");
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
