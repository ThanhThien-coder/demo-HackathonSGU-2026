// 20 Mục 4–5 — analyze-node (AI-15) và analyze-overview (AI-19); toAnalysisView (AI-18).
import { CONFIG } from "@/contracts/config";
import type {
  GuardIssue, HybridArchitecturalNode, NodeAnalysis, NodeAnalysisRaw, NodeAnalysisView, RepoOverviewRaw, SessionRow,
  StaticEngineResult,
} from "@/contracts";
import { assertQuota } from "../quota";
import { callLLMOnce, retryDelay, type LlmRequest } from "./gemini";
import { checkAnalysis, checkOverview } from "./guard/checks";
import { logGuardBlock } from "./guard/followup";
import { IDENT_RE, identWords, norm } from "./guard/text";
import { analyzeSystem, analyzeUser } from "./prompts/analyze";
import { overviewSystem, overviewUser } from "./prompts/overview";
import { withGuardFeedback } from "./prompts/common";
import { ANALYZE_SCHEMA, OVERVIEW_SCHEMA } from "./schemas";

const isArr = (x: unknown) => Array.isArray(x);
const parseAnalysis = (j: unknown): NodeAnalysisRaw | null => {
  const o = j as Partial<NodeAnalysisRaw> | null;
  if (!o || typeof o !== "object" || !isArr(o.skills) || !o.architecture || !isArr(o.steps) || !isArr(o.strengths) || !isArr(o.weak_points)) return null;
  return o as NodeAnalysisRaw;
};
const parseOverview = (j: unknown): RepoOverviewRaw | null => {
  const o = j as Partial<RepoOverviewRaw> | null;
  if (!o || typeof o !== "object" || typeof o.summary !== "string" || !isArr(o.layers) || !isArr(o.notes)) return null;
  return o as RepoOverviewRaw;
};

const better = (a: NodeAnalysis | null, b: NodeAnalysis | null): NodeAnalysis | null => {
  const rank = (x: NodeAnalysis | null) => (x === null ? 0 : x.skeleton_only ? 1 : 2);
  return rank(b) > rank(a) ? b : a; // bằng nhau ⇒ giữ bản đến trước
};

/** null ⇒ analysis_failed (D-03); skeleton_only ⇒ vẫn cache. */
export async function analyzeNode(session: SessionRow, graph: StaticEngineResult, node: HybridArchitecturalNode): Promise<NodeAnalysis | null> {
  await assertQuota(session.id);
  let best: NodeAnalysis | null = null;
  let issues: GuardIssue[] = [];
  let prev: { retry_after_ms?: number } | null = null;
  const base: LlmRequest<NodeAnalysisRaw> = {
    kind: "ANALYZE", system: analyzeSystem(node, graph), user: analyzeUser(node, graph), schema: ANALYZE_SCHEMA, sessionId: session.id, parse: parseAnalysis,
  };
  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    if (i > 0 && !(await retryDelay(prev))) break;
    const r = await callLLMOnce(withGuardFeedback(base, issues));
    issues = []; // lỗi mạng, JSON hỏng ⇒ request sau không có lý do
    prev = null;
    if (r.ok) {
      const g = checkAnalysis(r.value, node, graph, issues);
      if (!g || g.skeleton_only) logGuardBlock("analyze", i + 1, node.id, issues);
      best = better(best, g);
    } else prev = r;
    if ((best && !best.skeleton_only) || (!r.ok && r.kind === "FATAL")) break;
  }
  return best;
}

/** AI-18 */
export function toAnalysisView(a: NodeAnalysis, node: HybridArchitecturalNode, graph: StaticEngineResult): NodeAnalysisView {
  const stepOf = (k: number) => node.trace_steps[k - 1];
  const lineOfSymbol = (stepNo: number, symbol: string): { line_start: number; line_end: number } => {
    const s = stepOf(stepNo);
    if (!s) return { line_start: 0, line_end: 0 };
    const words = (symbol.match(IDENT_RE) ?? []).map(norm);
    const last = words[words.length - 1];
    if (last) {
      const lines = s.snippet.split("\n");
      for (let i = 0; i < lines.length; i++) if (s.snippet_line_map[i] > 0 && identWords(lines[i]).has(last)) return { line_start: s.snippet_line_map[i], line_end: s.snippet_line_map[i] };
    }
    return { line_start: s.line_start, line_end: s.line_end };
  };
  const shared = new Map<string, string[]>();
  for (const f of node.files) {
    const ids = graph.nodes.filter((n) => n.id !== node.id && n.files.includes(f)).map((n) => n.id).sort();
    if (ids.length) shared.set(f, ids);
  }
  return {
    node_id: a.node_id,
    skills: a.skills.map((s) => ({ ...s, file_path: stepOf(s.step)?.file_path ?? "", ...lineOfSymbol(s.step, s.symbol) })),
    architecture: a.architecture,
    steps: node.trace_steps.map((s) => ({
      step: s.step_number, layer: s.layer, file_path: s.file_path, line_start: s.line_start, line_end: s.line_end,
      text: a.skeleton_only ? null : (a.steps.find((x) => x.step === s.step_number)?.text ?? null),
    })),
    strengths: a.strengths,
    weak_points: a.weak_points.map((w) => ({ ...w, file_path: stepOf(w.step)?.file_path ?? "", line_start: stepOf(w.step)?.line_start ?? 0, line_end: stepOf(w.step)?.line_end ?? 0 })),
    shared_files: [...shared.entries()].map(([file_path, node_ids]) => ({ file_path, node_ids })),
    skeleton_only: a.skeleton_only,
  };
}

/** null ⇒ ai = null (vẫn có facts), không cache. */
export async function analyzeOverview(session: SessionRow, graph: StaticEngineResult, analyses: Record<string, NodeAnalysis>, failedIds: Set<string>): Promise<RepoOverviewRaw | null> {
  await assertQuota(session.id);
  let issues: GuardIssue[] = [];
  let prev: { retry_after_ms?: number } | null = null;
  const base: LlmRequest<RepoOverviewRaw> = {
    kind: "OVERVIEW", system: overviewSystem(graph), user: overviewUser(graph, analyses, failedIds), schema: OVERVIEW_SCHEMA, sessionId: session.id, parse: parseOverview,
  };
  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    if (i > 0 && !(await retryDelay(prev))) break;
    const r = await callLLMOnce(withGuardFeedback(base, issues));
    issues = []; prev = null;
    if (r.ok) {
      const g = checkOverview(r.value, graph, analyses, issues);
      if (g) return g;
      logGuardBlock("overview", i + 1, null, issues);
    } else { prev = r; if (r.kind === "FATAL") break; }
  }
  return null;
}
