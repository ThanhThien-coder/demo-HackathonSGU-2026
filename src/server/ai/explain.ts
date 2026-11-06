/**
 * src/server/ai/explain.ts
 *
 * Lời gọi explain-selection (20 Mục 8, AI-38, D-82). Vùng chọn đã được route cắt và kiểm (bước 1, ERR_SELECTION_INVALID).
 * Hàm này làm bước 2–6: tên xuyên bài, cache SELECTION_EXPLAIN, giới hạn lượt của phiên, gọi AI, cổng gác.
 */

import type postgres from "postgres";
import {
  CONFIG,
  type ExplainSelectionRaw,
  type ExplainSelectionRequest,
  type ExplainSelectionResponse,
  type GuardIssue,
  type NodeAnalysis,
  type StaticEngineResult,
} from "@/contracts";
import { sql } from "../db";
import { ApiHttpError } from "../errors";
import { logger } from "../log";
import { addSessionTokens, checkTokenQuota } from "../quota";
import type { SessionRecord } from "../session";
import { aiCostUsd, callLLMWithRetry } from "./gemini";
import { checkExplain } from "./guard/explain";
import { forbiddenKeywords } from "./guard/forbidden";
import { logGuardBlock } from "./guard/log";
import { explainScope } from "./guard/names";
import { IDENT_RE } from "./guard/text";
import { explainRequest, stepCodeText } from "./prompts/explain";

type Session = Pick<
  SessionRecord,
  "id" | "source" | "snapshot_id" | "subdir" | "engine_version" | "tokens_used"
>;

const shortName = (f: string) => f.split(".").pop() ?? f;

/**
 * AI-38 bước 2 (0 token): bước của node khác có phần cuối function_name trùng 1 tên trong vùng chọn;
 * sort node_id rồi step_number; tối đa CONFIG.GRADE_REFERENCED_MAX.
 */
export function findSelectionReferences(
  graph: StaticEngineResult,
  nodeId: string,
  selectedText: string,
): ExplainSelectionResponse["references"] {
  const words = new Set(selectedText.match(IDENT_RE) ?? []);
  if (words.size === 0) return [];
  const out: ExplainSelectionResponse["references"] = [];
  const nodes = [...graph.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const n of nodes) {
    if (n.id === nodeId) continue;
    for (const s of [...n.trace_steps].sort((a, b) => a.step_number - b.step_number)) {
      const name = shortName(s.function_name);
      if (words.has(name)) out.push({ node_id: n.id, step_number: s.step_number, name });
    }
  }
  return out.slice(0, CONFIG.GRADE_REFERENCED_MAX);
}

/** Khóa cache SELECTION_EXPLAIN (03 Mục 3.3). */
export function explainCacheKey(session: Session, req: ExplainSelectionRequest): string {
  const r = req.range;
  return `se|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${req.node_id}|${req.step_number}|${r.line_start}:${r.col_start}-${r.line_end}:${r.col_end}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
}

/** Bản phân tích của bài nếu đã có trong cache; chưa có hoặc lỗi ⇒ null (chỉ gửi tên ở <flow>). */
async function loadAnalysisOrNull(session: Session, nodeId: string): Promise<NodeAnalysis | null> {
  const key = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${nodeId}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
  try {
    const rows = await sql<Array<{ payload: NodeAnalysis | string }>>`
      SELECT payload FROM ai_cache WHERE cache_key = ${key} LIMIT 1
    `;
    if (rows.length === 0) return null;
    const p = rows[0].payload;
    return typeof p === "string" ? (JSON.parse(p) as NodeAnalysis) : p;
  } catch {
    return null;
  }
}

export async function explainSelection(
  session: Session,
  graph: StaticEngineResult,
  req: ExplainSelectionRequest,
): Promise<ExplainSelectionResponse> {
  const node = graph.nodes.find((n) => n.id === req.node_id);
  if (!node || !node.trace_steps.some((s) => s.step_number === req.step_number)) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  // 2. Tên xuyên bài
  const references = findSelectionReferences(graph, node.id, req.selected_text);

  // 3. Cache
  const cacheKey = explainCacheKey(session, req);
  const cached = await sql<Array<{ payload: ExplainSelectionRaw | string }>>`
    SELECT payload FROM ai_cache WHERE cache_key = ${cacheKey} LIMIT 1
  `;
  if (cached.length > 0) {
    const p = cached[0].payload;
    const explanation = typeof p === "string" ? (JSON.parse(p) as ExplainSelectionRaw) : p;
    return { explanation, references, tokens_used: session.tokens_used };
  }

  // 4. Giới hạn lượt của phiên, rồi quota (AI-06)
  const used = await sql<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM ai_usage WHERE session_id = ${session.id} AND call_kind = 'EXPLAIN'
  `;
  if ((used[0]?.n ?? 0) >= CONFIG.EXPLAIN_MAX_PER_SESSION) {
    throw new ApiHttpError("ERR_EXPLAIN_LIMIT");
  }
  checkTokenQuota(session.tokens_used);

  // 5. Gọi AI (AI-11, AI-12)
  const analysis = await loadAnalysisOrNull(session, node.id);
  const llm = await callLLMWithRetry(explainRequest(session.id, graph, { node, req, references, analysis }));
  const tokensUsed = await addSessionTokens(session.id, llm.tokens_in, llm.tokens_out);
  if (!llm.ok) {
    throw new ApiHttpError(llm.code);
  }

  try {
    await sql`
      INSERT INTO ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
      VALUES (${session.id}, 'EXPLAIN', ${llm.tokens_in}, ${llm.tokens_out}, ${aiCostUsd(llm.tokens_in, llm.tokens_out)})
    `;
  } catch (err: unknown) {
    logger.warn({ event: "ai_usage_failed", call: "EXPLAIN", err_name: err instanceof Error ? err.name : typeof err });
  }

  // 6. Cổng gác (GUARD-23): trượt ⇒ null, không gọi lại, không cache
  const issues: GuardIssue[] = [];
  const scope = explainScope(node, req.step_number, references.map((r) => r.name), graph);
  const forbidden = forbiddenKeywords(graph.fingerprint, stepCodeText(node, req.step_number));
  const explanation = checkExplain(llm.value, scope, forbidden, issues);
  if (!explanation) {
    logGuardBlock("explain", 1, node.id, issues);
    return { explanation: null, references, tokens_used: tokensUsed };
  }

  const payload: postgres.JSONValue = JSON.parse(JSON.stringify(explanation));
  try {
    await sql`
      INSERT INTO ai_cache (cache_key, kind, payload, model, prompt_version, tokens_in, tokens_out)
      VALUES (${cacheKey}, 'SELECTION_EXPLAIN', ${sql.json(payload)}, ${CONFIG.LLM_MODEL}, ${CONFIG.PROMPT_VERSION}, ${llm.tokens_in}, ${llm.tokens_out})
      ON CONFLICT (cache_key) DO NOTHING
    `;
  } catch (err: unknown) {
    logger.warn({ event: "ai_cache_failed", call: "EXPLAIN", err_name: err instanceof Error ? err.name : typeof err });
  }
  return { explanation, references, tokens_used: tokensUsed };
}
