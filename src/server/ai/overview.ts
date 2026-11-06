/**
 * src/server/ai/overview.ts
 *
 * Lời gọi analyze-overview và tính facts cho tổng quan repo (AI-19, AI-20).
 */

import {
  CONFIG,
  type GuardIssue,
  type NodeAnalysis,
  type RepoOverviewRaw,
  type RepoOverviewView,
  type SessionRow,
  type StaticEngineResult,
} from "@/contracts";
import { mainPath } from "@/server/engine/graph/whitelist";
import { checkTokenQuota } from "@/server/quota";
import { callLLMOnce, retryDelay } from "./gemini";
import { logGuardBlock } from "./guard/log";
import { checkOverview } from "./guard/overview";
import { withGuardFeedback } from "./prompts/common";
import { overviewRequest } from "./prompts/overview";

/**
 * Thống kê token và số lượt request của analyzeOverview // nội bộ.
 */
export interface OverviewUsage {
  tokens_in: number;
  tokens_out: number;
  requests: number;
}

/**
 * Tính phần facts của RepoOverviewView do code xác định từ StaticEngineResult (AI-19, 20 Mục 5 View):
 * - archetype
 * - framework = detected_framework (null nếu rỗng)
 * - tech_stack
 * - root_node_ids: node không có prerequisites, sort id
 * - main_path_node_ids = mainPath(graph)
 */
export function overviewFacts(
  graph: StaticEngineResult,
): RepoOverviewView["facts"] {
  const fp = graph.fingerprint;
  const rootNodeIds = graph.nodes
    .filter((n) => n.prerequisites.length === 0)
    .map((n) => n.id)
    .sort();

  return {
    archetype: fp.archetype,
    framework:
      fp.detected_framework && fp.detected_framework.trim().length > 0
        ? fp.detected_framework
        : null,
    tech_stack: fp.tech_stack ?? [],
    root_node_ids: rootNodeIds,
    main_path_node_ids: mainPath(graph),
  };
}

/**
 * Gọi AI sinh tổng quan kiến trúc repo (AI-19).
 * - Kiểm tra quota trước bằng checkTokenQuota(session.tokens_used).
 * - Tối đa 1 + CONFIG.LLM_MAX_RETRIES request.
 * - r.ok: kiểm tra qua checkOverview.
 *   - Hợp lệ: trả về bản đã kiểm.
 *   - Bị chặn (null): ghi logGuardBlock("overview", i + 1, null, issues),
 *     lần sau gọi lại kèm withGuardFeedback(req, issues).
 * - Lỗi mạng / JSON hỏng: await retryDelay(r) rồi gọi lại không kèm lý do.
 * - FATAL: dừng ngay.
 * - Hết lượt: trả về null.
 */
export async function analyzeOverview(
  session: SessionRow,
  graph: StaticEngineResult,
  analyses: Record<string, NodeAnalysis>,
  failedIds: Set<string>,
  usage?: OverviewUsage,
): Promise<RepoOverviewRaw | null> {
  checkTokenQuota(session.tokens_used); // AI-06

  let issues: GuardIssue[] = [];

  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    const baseReq = overviewRequest(session, graph, analyses, failedIds);
    const req = withGuardFeedback(baseReq, issues);
    const r = await callLLMOnce(req);

    if (usage) {
      usage.tokens_in += r.tokens_in;
      usage.tokens_out += r.tokens_out;
      usage.requests += 1;
    }

    issues = []; // reset sau mỗi request

    if (r.ok) {
      const g = checkOverview(r.value, graph, analyses, issues);
      if (g) {
        return g;
      }
      logGuardBlock("overview", i + 1, null, issues);
    }

    if (!r.ok && r.kind === "FATAL") {
      break;
    }

    if (i < CONFIG.LLM_MAX_RETRIES && !r.ok && !(await retryDelay(r))) {
      break; // Google bắt chờ quá CONFIG.LLM_RETRY_DELAY_MAX_MS ⇒ không gọi lại (D-74 R1)
    }
  }

  return null;
}
