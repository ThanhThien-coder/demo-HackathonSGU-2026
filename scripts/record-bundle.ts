/**
 * Lệnh chạy:
 * node --env-file=<file env của người chạy> node_modules/vite-node/vite-node.mjs --config vitest.config.ts scripts/record-bundle.ts
 *
 * Chú thích: Script gọi API thật theo kịch bản demo sau khi đã duyệt tay (GUARD-19), đóng băng vào public/demo/mock_bundle.json.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  CONFIG,
  type AnalyzeNodeRequest,
  type AnalyzeNodeResponse,
  type AnalyzeOverviewRequest,
  type AnalyzeOverviewResponse,
  type ApiError,
  type EnrichNodeRequest,
  type EnrichNodeResponse,
  type EvaluateFeynmanRequest,
  type EvaluateFeynmanResponse,
  type IngestRequest,
  type IngestResponse,
  type NodeAnalysisView,
  type OfflineMockBundle,
  type PersonaMode,
  type PersonaRequest,
  type PersonaResponse,
  type RevealRequest,
  type RevealResponse,
} from "@/contracts";

// nội bộ
export interface RecordScenario {
  repo_url: string;
  personas: Array<{
    persona: PersonaMode;
    nodes: Array<{
      node_id: string;
      questions: Array<{
        question_index: number;
        answers: string[];
        reveal?: boolean;
      }>;
    }>;
  }>;
}

// nội bộ
export type ApiCall = <T>(path: string, body: unknown) => Promise<T>;

// nội bộ
export function createApiCall(baseUrl: string, token: string): ApiCall {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return async <T>(apiPath: string, body: unknown): Promise<T> => {
    const cleanPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
    const url = `${cleanBase}${cleanPath}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errCode = `HTTP_${res.status}`;
      try {
        const errData = (await res.json()) as ApiError;
        if (errData?.error?.code) {
          errCode = errData.error.code;
        }
      } catch {
        // Body không phải JSON hợp lệ hoặc rỗng
      }
      throw new Error(`POST ${cleanPath} thất bại với mã lỗi: ${errCode}`);
    }

    return (await res.json()) as T;
  };
}

export async function recordBundle(
  api: ApiCall,
  scenario: RecordScenario,
  now: number
): Promise<OfflineMockBundle> {
  // 1. POST /api/ingest { repo_url } ⇒ ingest (giữ làm bundle.ingest), session_id, snapshot_id
  const ingest = await api<IngestResponse>("/api/ingest", {
    repo_url: scenario.repo_url,
  } satisfies IngestRequest);

  const initialSessionId = ingest.session_id;
  const snapshotId = ingest.result?.snapshot?.snapshot_id;
  if (!initialSessionId || !snapshotId) {
    throw new Error("Ingest ban đầu thiếu session_id hoặc snapshot_id");
  }

  let currentTokens = ingest.progress?.tokens_used ?? 0;
  const analyses: Record<string, NodeAnalysisView> = {};

  // 2. Mỗi node trong ingest.result.nodes: POST /api/analyze-node
  const nodes = ingest.result?.nodes ?? [];
  for (const node of nodes) {
    const nodeRes = await api<AnalyzeNodeResponse>("/api/analyze-node", {
      session_id: initialSessionId,
      node_id: node.id,
    } satisfies AnalyzeNodeRequest);

    if (nodeRes.tokens_used > currentTokens) {
      throw new Error(`node ${node.id} chưa có trong ai_cache — chạy duyệt trước`);
    }
    if (!nodeRes.analysis) {
      throw new Error(`node ${node.id} phân tích thất bại (analysis là null)`);
    }

    currentTokens = nodeRes.tokens_used;
    analyses[node.id] = nodeRes.analysis;
  }

  // 3. POST /api/analyze-overview ⇒ cùng cách kiểm tokens_used không tăng; lưu overview
  const overviewRes = await api<AnalyzeOverviewResponse>("/api/analyze-overview", {
    session_id: initialSessionId,
  } satisfies AnalyzeOverviewRequest);

  if (overviewRes.tokens_used > currentTokens) {
    throw new Error("overview chưa có trong ai_cache — chạy duyệt trước");
  }
  currentTokens = overviewRes.tokens_used;
  const overview = overviewRes.overview;

  // 4. Mỗi persona trong kịch bản, theo thứ tự
  const enrich: Record<string, EnrichNodeResponse> = {};
  const scriptedAnswers: Record<string, Array<{ answer: string; response: EvaluateFeynmanResponse }>> = {};
  const reveals: Record<string, RevealResponse> = {};

  for (const p of scenario.personas) {
    // POST /api/demo/persona { mode }
    await api<PersonaResponse>("/api/demo/persona", {
      mode: p.persona,
    } satisfies PersonaRequest);

    // POST /api/ingest { session_id: <phiên gốc>, restart: true } ⇒ phiên mới cho persona
    const restartRes = await api<IngestResponse>("/api/ingest", {
      session_id: initialSessionId,
      restart: true,
    } satisfies IngestRequest);
    const personaSessionId = restartRes.session_id;

    // Mỗi node của persona, theo thứ tự
    for (const pNode of p.nodes) {
      const R = `${pNode.node_id}:LEARN:${p.persona}`;
      const enrichRes = await api<EnrichNodeResponse>("/api/enrich-node", {
        session_id: personaSessionId,
        node_id: pNode.node_id,
        mode: "LEARN",
      } satisfies EnrichNodeRequest);
      enrich[R] = enrichRes;
      const runId = enrichRes.run_id;

      // Mỗi câu trong kịch bản
      for (const q of pNode.questions) {
        let isQuestionDone = false;

        for (let k = 0; k < q.answers.length; k++) {
          const answer = q.answers[k];
          const attemptNumber = k + 1;

          const evalRes = await api<EvaluateFeynmanResponse>("/api/evaluate-feynman", {
            session_id: personaSessionId,
            run_id: runId,
            question_index: q.question_index,
            student_answer: answer,
            attempt_number: attemptNumber,
          } satisfies EvaluateFeynmanRequest);

          const scriptKey = `${R}:${q.question_index}:${attemptNumber}`;
          scriptedAnswers[scriptKey] = [{ answer, response: evalRes }];

          if (evalRes.is_passed || evalRes.question?.finished) {
            isQuestionDone = true;
            break;
          }
        }

        // reveal: true và câu chưa xong ⇒ POST /api/reveal
        if (q.reveal && !isQuestionDone) {
          const revealRes = await api<RevealResponse>("/api/reveal", {
            session_id: personaSessionId,
            run_id: runId,
            question_index: q.question_index,
          } satisfies RevealRequest);
          const revealKey = `${R}:${q.question_index}`;
          reveals[revealKey] = revealRes;
        }
      }
    }
  }

  // 5. recorded_from & bundle_version
  return {
    bundle_version: "1.0.0",
    recorded_from: {
      repo: scenario.repo_url,
      snapshot_id: snapshotId,
      engine_version: CONFIG.ENGINE_VERSION,
      prompt_version: CONFIG.PROMPT_VERSION,
      model: CONFIG.LLM_MODEL,
      recorded_at: now,
    },
    ingest,
    analyses,
    overview,
    enrich,
    scripted_answers: scriptedAnswers,
    reveals,
  };
}

const REQUIRED_ENV_VARS = [
  "RECORD_BASE_URL",
  "RECORD_ACCESS_TOKEN",
  "RECORD_SCENARIO",
] as const;

export async function main(): Promise<void> {
  for (const envName of REQUIRED_ENV_VARS) {
    if (!process.env[envName]) {
      console.error(`Thiếu biến môi trường: ${envName}`);
      process.exit(1);
    }
  }

  const baseUrl = process.env.RECORD_BASE_URL!;
  const accessToken = process.env.RECORD_ACCESS_TOKEN!;
  const scenarioPath = path.resolve(process.cwd(), process.env.RECORD_SCENARIO!);

  const scenarioRaw = await fs.readFile(scenarioPath, "utf-8");
  const scenario = JSON.parse(scenarioRaw) as RecordScenario;

  const api = createApiCall(baseUrl, accessToken);
  const bundle = await recordBundle(api, scenario, Date.now());

  const targetPath = path.resolve(process.cwd(), "public/demo/mock_bundle.json");
  const tempPath = path.resolve(
    process.cwd(),
    `public/demo/mock_bundle.json.tmp.${Date.now()}`
  );

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(bundle, null, 2), "utf-8");
  await fs.rename(tempPath, targetPath);
}

if (!process.env.VITEST) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Lỗi thực thi record-bundle: ${msg}`);
    process.exit(1);
  });
}
