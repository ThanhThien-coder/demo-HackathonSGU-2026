// Luồng phân tích lát cắt analyze-node (AI-15, AI-18).
import {
  CONFIG,
  type GuardIssue,
  type HybridArchitecturalNode,
  type NodeAnalysis,
  type NodeAnalysisView,
  type SessionRow,
  type StaticEngineResult,
} from "@/contracts";
import { checkTokenQuota } from "@/server/quota";
import { callLLMOnce, retryDelay } from "./gemini";
import { checkAnalysis } from "./guard/analysis";
import { logGuardBlock } from "./guard/log";
import { norm } from "./guard/text";
import { analyzeRequest } from "./prompts/analyze";
import { withGuardFeedback } from "./prompts/common";

/**
 * Thống kê token và số lượt request của analyzeNode (nội bộ).
 * Caller truyền vào để cộng dồn ghi DB/log L1 (D-66).
 */
export interface AnalyzeUsage {
  tokens_in: number;
  tokens_out: number;
  requests: number;
}

/**
 * So sánh hai bản phân tích: đầy đủ > skeleton_only > null; bằng nhau giữ bản đến trước.
 */
export function better(
  a: NodeAnalysis | null,
  b: NodeAnalysis | null,
): NodeAnalysis | null {
  const score = (x: NodeAnalysis | null): number => {
    if (!x) return 0;
    return x.skeleton_only ? 1 : 2;
  };
  const scoreA = score(a);
  const scoreB = score(b);
  if (scoreB > scoreA) return b;
  return a;
}

/**
 * Phân tích một lát cắt node qua Gemini (AI-15).
 * Kiểm tra quota trước; tối đa 1 + LLM_MAX_RETRIES request.
 */
export async function analyzeNode(
  session: SessionRow,
  graph: StaticEngineResult,
  node: HybridArchitecturalNode,
  usage?: AnalyzeUsage,
): Promise<NodeAnalysis | null> {
  checkTokenQuota(session.tokens_used); // AI-06

  let best: NodeAnalysis | null = null;
  let issues: GuardIssue[] = [];

  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    const req = withGuardFeedback(analyzeRequest(session, graph, node), issues);
    const r = await callLLMOnce(req);

    if (usage) {
      usage.tokens_in += r.tokens_in;
      usage.tokens_out += r.tokens_out;
      usage.requests += 1;
    }

    issues = []; // reset sau mỗi request

    if (r.ok) {
      const g = checkAnalysis(r.value, node, graph, issues);
      if (!g || g.skeleton_only) {
        logGuardBlock("analyze", i + 1, node.id, issues);
      }
      best = better(best, g);
    }

    if ((best && !best.skeleton_only) || (!r.ok && r.kind === "FATAL")) {
      break;
    }

    if (i < CONFIG.LLM_MAX_RETRIES && !r.ok) {
      await retryDelay(r);
    }
  }

  return best;
}

function findSymbolLine(
  step: HybridArchitecturalNode["trace_steps"][number],
  symbol: string,
): { line_start: number; line_end: number } {
  const normalizedSymbol = norm(symbol);
  if (normalizedSymbol && step.snippet && step.snippet_line_map) {
    const lines = step.snippet.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const origLine = step.snippet_line_map[i];
      if (origLine && origLine > 0) {
        if (norm(lines[i]).includes(normalizedSymbol)) {
          return { line_start: origLine, line_end: origLine };
        }
      }
    }
  }
  return { line_start: step.line_start, line_end: step.line_end };
}

/**
 * Chuyển bản phân tích đã qua kiểm thành bản hiển thị gửi trình duyệt (AI-18).
 */
export function toAnalysisView(
  analysis: NodeAnalysis,
  node: HybridArchitecturalNode,
  graph: StaticEngineResult,
): NodeAnalysisView {
  const skills = analysis.skills.map((s) => {
    const step = node.trace_steps.find((st) => st.step_number === s.step);
    const file_path = step ? step.file_path : "";
    const { line_start, line_end } = step
      ? findSymbolLine(step, s.symbol)
      : { line_start: 0, line_end: 0 };
    return {
      ...s,
      file_path,
      line_start,
      line_end,
    };
  });

  const steps = node.trace_steps.map((st) => {
    let text: string | null = null;
    if (!analysis.skeleton_only) {
      const found = analysis.steps.find((item) => item.step === st.step_number);
      text = found ? found.text : null;
    }
    return {
      step: st.step_number,
      layer: st.layer,
      file_path: st.file_path,
      line_start: st.line_start,
      line_end: st.line_end,
      text,
    };
  });

  const weak_points = analysis.weak_points.map((w) => {
    const step = node.trace_steps.find((st) => st.step_number === w.step);
    return {
      ...w,
      file_path: step ? step.file_path : "",
      line_start: step ? step.line_start : 0,
      line_end: step ? step.line_end : 0,
    };
  });

  const shared_files: Array<{ file_path: string; node_ids: string[] }> = [];
  for (const f of node.files) {
    const otherNodeIds = graph.nodes
      .filter((other) => other.id !== node.id && other.files.includes(f))
      .map((other) => other.id)
      .sort();
    if (otherNodeIds.length > 0) {
      shared_files.push({ file_path: f, node_ids: otherNodeIds });
    }
  }

  return {
    node_id: analysis.node_id,
    skills,
    architecture: analysis.architecture,
    steps,
    strengths: analysis.strengths,
    weak_points,
    shared_files,
    skeleton_only: analysis.skeleton_only,
  };
}
