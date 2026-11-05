// 03 Mục 6.6 — analyze-node / analyze-overview.
import type {
  AnalyzeNodeRequest, AnalyzeNodeResponse, AnalyzeOverviewRequest, AnalyzeOverviewResponse, NodeAnalysis, RepoOverviewRaw, RepoOverviewView,
} from "@/contracts";
import { analyzeNode, analyzeOverview, toAnalysisView } from "./ai/analyze";
import { analysisKey, once, overviewKey } from "./cache";
import { sql } from "./db";
import { mainPath } from "./engine";
import { fail } from "./errors";
import { loadNodeStates } from "./progress";
import { getSessionStaticResult } from "./session";
import { dbRead, getCache, getCacheMany, getOwnedSession, putCache, upsertProgress } from "./store";

export async function analyzeNodeService(req: AnalyzeNodeRequest, userId: string): Promise<AnalyzeNodeResponse> {
  const session = await getOwnedSession(req.session_id, userId);
  const graph = await getSessionStaticResult(session);
  const node = graph.nodes.find((n) => n.id === req.node_id);
  if (!node) return fail("ERR_NODE_NOT_AVAILABLE");
  const before = await dbRead(() => loadNodeStates(sql, session));
  const key = analysisKey(session.snapshot, session.engine_version, node.id);

  let analysis = await getCache<NodeAnalysis>(key);
  if (!analysis) {
    analysis = await once(key, async () => {
      const a = await analyzeNode(session, graph, node); // quota, gọi AI, cổng gác
      if (a) await putCache(key, "NODE_ANALYSIS", a, 0, 0);
      return a;
    });
  }
  await dbRead(() => upsertProgress(sql, session.id, node.id, { analysis_failed: analysis === null })); // thành công ⇒ xóa cờ
  const after = await dbRead(() => loadNodeStates(sql, session));
  const unlocked = Object.values(after).filter((n) => n.status !== "LOCKED" && before[n.node_id]?.status === "LOCKED").map((n) => n.node_id).sort();
  const tok = await dbRead(() => sql<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${session.id}`);
  return {
    node_id: node.id, analysis: analysis ? toAnalysisView(analysis, node, graph) : null, node_state: after[node.id],
    unlocked_node_ids: unlocked, tokens_used: tok[0]?.tokens_used ?? 0,
  };
}

export async function analyzeOverviewService(req: AnalyzeOverviewRequest, userId: string): Promise<AnalyzeOverviewResponse> {
  const session = await getOwnedSession(req.session_id, userId);
  const graph = await getSessionStaticResult(session);
  const states = await dbRead(() => loadNodeStates(sql, session));
  const failed = new Set(Object.values(states).filter((s) => s.analysis_failed).map((s) => s.node_id));
  const keys = graph.nodes.map((n) => [n.id, analysisKey(session.snapshot, session.engine_version, n.id)] as const);
  const cached = await getCacheMany<NodeAnalysis>(keys.map((k) => k[1]));
  const analyses: Record<string, NodeAnalysis> = {};
  for (const [id, k] of keys) { const a = cached.get(k); if (a) analyses[id] = a; }
  if (graph.nodes.some((n) => !failed.has(n.id) && !analyses[n.id])) return fail("ERR_OVERVIEW_NOT_READY");

  const facts: RepoOverviewView["facts"] = {
    archetype: graph.fingerprint.archetype, framework: graph.fingerprint.detected_framework, tech_stack: graph.fingerprint.tech_stack,
    root_node_ids: graph.nodes.filter((n) => n.prerequisites.length === 0).map((n) => n.id).sort(),
    main_path_node_ids: mainPath(graph.nodes, graph.edges),
  };
  const okey = overviewKey(session.snapshot, session.engine_version);
  let ai = await getCache<RepoOverviewRaw>(okey);
  if (!ai) {
    ai = await once(okey, async () => {
      const r = await analyzeOverview(session, graph, analyses, failed);
      if (r) await putCache(okey, "REPO_OVERVIEW", r, 0, 0);
      return r;
    });
  }
  const tok = await dbRead(() => sql<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${session.id}`);
  return { overview: { facts, ai }, tokens_used: tok[0]?.tokens_used ?? 0 };
}
