/**
 * src/server/ai/guard/lines.ts
 *
 * Kiểm tra số dòng (GUARD-08) và bằng chứng nằm đúng bước (GUARD-09) theo spec 21 Mục 2.
 */

import type { ExecutionTraceStep, HybridArchitecturalNode } from "@/contracts";
import { IDENT_RE, LANGUAGE_WORDS, identWords, norm } from "./text";

export const LINE_RE =
  /\b(?:dòng|dong|line|lines)\s+(\d+)(?:\s*(?:[–—-]|đến|den|to)\s*(\d+))?/giu;

/**
 * Tập hợp các số dòng gốc hợp lệ của các bước chỉ định trong node.
 */
export const stepLines = (
  node: HybridArchitecturalNode,
  idx: number[]
): Set<number> =>
  new Set(
    idx.flatMap((i) => {
      const step = node.trace_steps[i - 1];
      return step ? step.snippet_line_map.filter((n) => n > 0) : [];
    })
  );

/**
 * Kiểm tra nhắc dòng trong văn bản AI:
 * - Mỗi mốc phải thuộc allowed
 * - Nếu là khoảng: đầu <= cuối và cả 2 mốc đều phải thuộc allowed
 * Trả về mảng các cụm dòng vi phạm ([] = qua).
 */
export function invalidLineRefs(text: string, allowed: Set<number>): string[] {
  const invalid: string[] = [];
  const matches = text.matchAll(new RegExp(LINE_RE.source, LINE_RE.flags));
  for (const m of matches) {
    const full = m[0];
    const start = parseInt(m[1], 10);
    const end = m[2] !== undefined ? parseInt(m[2], 10) : undefined;

    let valid = allowed.has(start);
    if (end !== undefined) {
      if (start > end || !allowed.has(end)) {
        valid = false;
      }
    }
    if (!valid) {
      invalid.push(full);
    }
  }
  return invalid;
}

/**
 * Kiểm tra symbol có nằm trong code của bước hay không (GUARD-09).
 * - Tách các từ định danh không thuộc LANGUAGE_WORDS
 * - Tất cả các từ đó phải xuất hiện trong code của bước (function_name + snippet).
 */
export function symbolInStep(
  symbol: string,
  step: ExecutionTraceStep
): boolean {
  const ws = (symbol.match(IDENT_RE) ?? []).filter(
    (w) => !LANGUAGE_WORDS.has(w.toLowerCase())
  );
  const code = identWords(`${step.function_name}\n${step.snippet}`);
  return ws.length > 0 && ws.every((w) => code.has(norm(w)));
}
