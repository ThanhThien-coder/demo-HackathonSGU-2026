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
import { logGuardBlocked } from "@/server/log";

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
