/**
 * src/server/ai/guard/log.ts
 *
 * Ghi log khi cổng gác chặn (GUARD-22, D-51) theo spec 21 Mục 6.
 */

import {
  CONFIG,
  type GuardCall,
  type GuardCode,
  type GuardIssue,
  type GuardLogEntry,
} from "@/contracts";
import { logGuardBlocked, logger } from "@/server/log";
import type { WeakPointStats } from "./analysis";

export function logGuardBlock(
  call: GuardCall,
  attempt: number,
  nodeId: string | null,
  issues: GuardIssue[]
): void {
  const codes: GuardCode[] = [];
  for (const issue of issues) {
    if (!codes.includes(issue.code)) {
      codes.push(issue.code);
    }
  }

  const entry: GuardLogEntry = {
    event: "guard_blocked",
    call,
    attempt,
    node_id: nodeId,
    codes,
    prompt_version: CONFIG.PROMPT_VERSION,
    llm_model: CONFIG.LLM_MODEL,
  };

  logGuardBlocked(entry);
}

/**
 * Ghi 1 dòng log khi cổng gác lọc bớt điểm dở mà bản phân tích vẫn đạt (lỗi C-06, C-09).
 * Chỉ ghi số theo lý do, không ghi tên, bước, văn bản AI (GUARD-22).
 */
export function logWeakPointsFiltered(attempt: number, nodeId: string, stats: WeakPointStats): void {
  logger.info(
    {
      event: "weak_points_filtered",
      attempt,
      node_id: nodeId,
      prompt_version: CONFIG.PROMPT_VERSION,
      llm_model: CONFIG.LLM_MODEL,
      ...stats,
    },
    "weak_points_filtered",
  );
}
