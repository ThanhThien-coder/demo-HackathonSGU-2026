// 03 Mục 6.1 — enrich-node: tạo run, lưu câu hỏi + đáp án (D-36). Idempotent khi đã có run chưa xong.
import type { EnrichNodeRequest, EnrichNodeResponse, RunStepRef, StaticEngineResult } from "@/contracts";
import { generateQuestions } from "./ai/questions";
import { forbiddenKeywords, nodeCodeText } from "./ai/guard/text";
import { analysisKey } from "./cache";
import { fail } from "./errors";
import { loadNodeState, toQuestionViews } from "./progress";
import { getSessionStaticResult } from "./session";
import { planNodeQuestions } from "@/lib/plan";
import type { NodeAnalysis } from "@/contracts";
import { sql } from "./db";
import { RunRow, SessionFull, createRun, dbRead, findOpenRun, getCache, getOwnedSession, loadProfile, touchSession } from "./store";

async function buildEnrichResponse(session: SessionFull, run: RunRow): Promise<EnrichNodeResponse> {
  const [state, tok] = await dbRead(() => Promise.all([
    loadNodeState(sql, session, run.node_id),
    sql<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${session.id}`,
  ]));
  if (!state) return fail("ERR_NODE_NOT_AVAILABLE");
  return { node_id: run.node_id, run_id: run.id, mode: run.mode, questions: toQuestionViews(run), node_state: state, tokens_used: tok[0]?.tokens_used ?? 0 };
}

export const toStepRefs = (graph: StaticEngineResult, nodeId: string): RunStepRef[] => {
  const n = graph.nodes.find((x) => x.id === nodeId)!;
  return n.trace_steps.map((s) => ({ step_index: s.step_number, layer: s.layer, file_path: s.file_path, function_name: s.function_name }));
};

export async function enrichNode(req: EnrichNodeRequest, userId: string): Promise<EnrichNodeResponse> {
  const now = Date.now();
  const session = await getOwnedSession(req.session_id, userId);
  const open = await dbRead(() => findOpenRun(sql, session.id, req.node_id));
  if (open) return buildEnrichResponse(session, open); // idempotent (tải lại trang, tab khác)

  const state = await dbRead(() => loadNodeState(sql, session, req.node_id));
  if (!state || state.status !== "AVAILABLE") return fail("ERR_NODE_NOT_AVAILABLE");
  const graph = await getSessionStaticResult(session);
  const node = graph.nodes.find((n) => n.id === req.node_id);
  if (!node) return fail("ERR_NODE_NOT_AVAILABLE");
  const analysis = await getCache<NodeAnalysis>(analysisKey(session.snapshot, session.engine_version, node.id));
  if (!analysis) return fail("ERR_ANALYSIS_NOT_READY");

  const profile = await dbRead(() => loadProfile(sql, userId, now));
  const plan = planNodeQuestions(analysis, profile.skills, now, node.trace_steps.length); // luôn ≥ 1 câu (D-34)
  if (plan.length === 0) return fail("ERR_ANALYSIS_NOT_READY");
  const questions = await generateQuestions(session, graph, node, analysis, plan);
  if (questions.every((q) => q.ended_by === "DROPPED")) return fail("ERR_AI_REJECTED"); // không tạo run

  const forbidden = forbiddenKeywords(graph.fingerprint, nodeCodeText(node));
  const created = await dbRead(() => createRun(sql, session.id, node.id, req.mode, questions, toStepRefs(graph, node.id), forbidden));
  const run = created === "CONFLICT"
    ? (await dbRead(() => findOpenRun(sql, session.id, node.id))) ?? fail("ERR_PERSISTENCE_UNAVAILABLE")
    : created;
  await dbRead(() => touchSession(sql, session.id));
  return buildEnrichResponse(session, run);
}
