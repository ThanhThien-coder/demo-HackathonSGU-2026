/**
 * Lệnh chạy:
 * node --env-file=<file env của người chạy> node_modules/vite-node/vite-node.mjs --config vitest.config.ts scripts/review-run.ts
 *
 * Chú thích: Script chỉ làm phần phân tích + tổng quan; phần hỏi câu theo kịch bản và chấm 3 lần của GUARD-18 bước 1 chưa có, làm sau khi Lát dọc 2 thông.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import postgres from "postgres";
import {
  CONFIG,
  type AnalyzeNodeRequest,
  type AnalyzeNodeResponse,
  type AnalyzeOverviewRequest,
  type AnalyzeOverviewResponse,
  type ApiError,
  type IngestRequest,
  type IngestResponse,
  type NodeAnalysisView,
  type RepoOverviewView,
} from "@/contracts";

interface ReviewNodeResult {
  node_id: string;
  analysis: NodeAnalysisView | null;
  session_tokens_after: number | null;
  error_code: string | null;
}

interface ReviewRunOutput {
  snapshot_id: string;
  llm_model: string;
  prompt_version: string;
  tokens_used: number;
  nodes: ReviewNodeResult[];
  overview: RepoOverviewView | null;
  overview_error_code: string | null;
}

const REQUIRED_ENV_VARS = [
  "REVIEW_BASE_URL",
  "REVIEW_ACCESS_TOKEN",
  "REVIEW_REPO_URL",
  "DATABASE_URL",
] as const;

async function run(): Promise<void> {
  for (const envName of REQUIRED_ENV_VARS) {
    if (!process.env[envName]) {
      console.error(`Thiếu biến môi trường: ${envName}`);
      process.exit(1);
    }
  }

  const baseUrl = process.env.REVIEW_BASE_URL!.replace(/\/+$/, "");
  const accessToken = process.env.REVIEW_ACCESS_TOKEN!;
  const repoUrl = process.env.REVIEW_REPO_URL!;
  const databaseUrl = process.env.DATABASE_URL!;

  const sql = postgres(databaseUrl, { prepare: false });

  const exitWithError = async (message: string): Promise<never> => {
    console.error(message);
    await sql.end().catch(() => {});
    process.exit(1);
  };

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    const initialIngestBody: IngestRequest = { repo_url: repoUrl };
    let initialIngestRes: Response;
    try {
      initialIngestRes = await fetch(`${baseUrl}/api/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify(initialIngestBody),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return await exitWithError(`Ingest ban đầu thất bại do lỗi mạng: ${msg}`);
    }

    if (!initialIngestRes.ok) {
      let errCode = `HTTP_${initialIngestRes.status}`;
      try {
        const errData = (await initialIngestRes.json()) as ApiError;
        if (errData?.error?.code) {
          errCode = errData.error.code;
        }
      } catch {
        // Không thể parse JSON lỗi
      }
      return await exitWithError(`Ingest ban đầu thất bại với mã lỗi: ${errCode}`);
    }

    let initialIngestData: IngestResponse;
    try {
      initialIngestData = (await initialIngestRes.json()) as IngestResponse;
    } catch {
      return await exitWithError("Ingest ban đầu trả về dữ liệu không phải JSON hợp lệ");
    }

    let currentSessionId = initialIngestData.session_id;
    const snapshotId = initialIngestData.result?.snapshot?.snapshot_id;
    const nodes = initialIngestData.result?.nodes ?? [];

    if (!currentSessionId || !snapshotId) {
      return await exitWithError("Ingest ban đầu thiếu session_id hoặc snapshot_id");
    }

    const reviewDir = path.resolve(process.cwd(), "review");
    await fs.mkdir(reviewDir, { recursive: true });

    for (let runNumber = 1; runNumber <= 3; runNumber++) {
      const restartBody: IngestRequest = {
        session_id: currentSessionId,
        restart: true,
      };

      let restartRes: Response;
      try {
        restartRes = await fetch(`${baseUrl}/api/ingest`, {
          method: "POST",
          headers,
          body: JSON.stringify(restartBody),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return await exitWithError(`Ingest restart lần ${runNumber} thất bại do lỗi mạng: ${msg}`);
      }

      if (!restartRes.ok) {
        let errCode = `HTTP_${restartRes.status}`;
        try {
          const errData = (await restartRes.json()) as ApiError;
          if (errData?.error?.code) {
            errCode = errData.error.code;
          }
        } catch {
          // Không thể parse JSON lỗi
        }
        return await exitWithError(`Ingest restart lần ${runNumber} thất bại với mã lỗi: ${errCode}`);
      }

      let restartData: IngestResponse;
      try {
        restartData = (await restartRes.json()) as IngestResponse;
      } catch {
        return await exitWithError(`Ingest restart lần ${runNumber} trả về dữ liệu không phải JSON hợp lệ`);
      }

      if (!restartData.session_id) {
        return await exitWithError(`Ingest restart lần ${runNumber} thiếu session_id`);
      }

      currentSessionId = restartData.session_id;
      const initialTokens = restartData.progress?.tokens_used ?? 0;
      let lastSuccessfulTokensUsed = initialTokens;

      const cacheKeyPattern = `%|${snapshotId}|%`;
      await sql`delete from ai_cache where cache_key like ${cacheKeyPattern}`;

      const runNodes = restartData.result?.nodes ?? nodes;
      const nodeResults: ReviewNodeResult[] = [];

      for (const node of runNodes) {
        const nodeReq: AnalyzeNodeRequest = {
          session_id: currentSessionId,
          node_id: node.id,
        };

        try {
          const nodeRes = await fetch(`${baseUrl}/api/analyze-node`, {
            method: "POST",
            headers,
            body: JSON.stringify(nodeReq),
          });

          if (!nodeRes.ok) {
            let code = `HTTP_${nodeRes.status}`;
            try {
              const errData = (await nodeRes.json()) as ApiError;
              if (errData?.error?.code) {
                code = errData.error.code;
              }
            } catch {
              // Không thể parse JSON lỗi
            }
            nodeResults.push({
              node_id: node.id,
              analysis: null,
              session_tokens_after: null,
              error_code: code,
            });
            continue;
          }

          const nodeData = (await nodeRes.json()) as AnalyzeNodeResponse;
          const sessionTokens = typeof nodeData.tokens_used === "number" ? nodeData.tokens_used : null;
          if (sessionTokens !== null) {
            lastSuccessfulTokensUsed = sessionTokens;
          }

          nodeResults.push({
            node_id: nodeData.node_id || node.id,
            analysis: nodeData.analysis,
            session_tokens_after: sessionTokens,
            error_code: null,
          });
        } catch {
          nodeResults.push({
            node_id: node.id,
            analysis: null,
            session_tokens_after: null,
            error_code: "NETWORK_ERROR",
          });
        }
      }

      let overviewView: RepoOverviewView | null = null;
      let overviewErrorCode: string | null = null;

      const overviewReq: AnalyzeOverviewRequest = {
        session_id: currentSessionId,
      };

      try {
        const overviewRes = await fetch(`${baseUrl}/api/analyze-overview`, {
          method: "POST",
          headers,
          body: JSON.stringify(overviewReq),
        });

        if (!overviewRes.ok) {
          let code = `HTTP_${overviewRes.status}`;
          try {
            const errData = (await overviewRes.json()) as ApiError;
            if (errData?.error?.code) {
              code = errData.error.code;
            }
          } catch {
            // Không thể parse JSON lỗi
          }
          overviewErrorCode = code;
        } else {
          const overviewData = (await overviewRes.json()) as AnalyzeOverviewResponse;
          overviewView = overviewData.overview;
          if (typeof overviewData.tokens_used === "number") {
            lastSuccessfulTokensUsed = overviewData.tokens_used;
          }
        }
      } catch {
        overviewErrorCode = "NETWORK_ERROR";
      }

      const runOutput: ReviewRunOutput = {
        snapshot_id: snapshotId,
        llm_model: CONFIG.LLM_MODEL,
        prompt_version: CONFIG.PROMPT_VERSION,
        tokens_used: lastSuccessfulTokensUsed - initialTokens,
        nodes: nodeResults,
        overview: overviewView,
        overview_error_code: overviewErrorCode,
      };

      const filePath = path.join(reviewDir, `run-${runNumber}.json`);
      await fs.writeFile(filePath, JSON.stringify(runOutput, null, 2), "utf-8");
    }
  } finally {
    await sql.end().catch(() => {});
  }
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Lỗi thực thi review-run: ${message}`);
  process.exit(1);
});
