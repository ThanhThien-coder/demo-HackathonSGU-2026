/**
 * src/server/ai/guard/explain.ts
 *
 * Kiểm lời giải thích đoạn chọn (21 GUARD-23, D-82). Không gọi lại, không so với câu hỏi đang mở.
 */

import { SWE_SKILLS, type ExplainSelectionRaw, type GuardIssue, type SWESkill } from "@/contracts";
import { findForbidden } from "./forbidden";
import { invalidLineRefs } from "./lines";
import { checkNames, type NameScope } from "./names";
import { firstSentences } from "./text";

const KINDS: readonly string[] = ["KEYWORD", "NAME", "CODE"];

/**
 * 1. kind ngoài danh sách, what rỗng, here rỗng ⇒ E1 (analogy được rỗng).
 * 2. skill không thuộc SWE_SKILLS ⇒ null, không chặn.
 * 3. Cắt: what ≤ 3 câu, here ≤ 2 câu, analogy ≤ 1 câu.
 * 4. Chữ (what, here, analogy): E2 tên sai · E3 từ cấm · E4 có số dòng.
 * Có mã lỗi ⇒ thêm GuardIssue rồi null. Không mutate raw.
 */
export function checkExplain(
  raw: ExplainSelectionRaw,
  scope: NameScope,
  forbidden: string[],
  issues: GuardIssue[] = [],
): ExplainSelectionRaw | null {
  const found: GuardIssue[] = [];
  const what = firstSentences(raw.what.trim(), 3);
  const here = firstSentences(raw.here.trim(), 2);
  const analogy = firstSentences(raw.analogy.trim(), 1);

  if (!KINDS.includes(raw.kind) || what.length === 0 || here.length === 0) found.push({ code: "E1" });
  const skill: SWESkill | null =
    raw.skill !== null && (SWE_SKILLS as readonly string[]).includes(raw.skill) ? raw.skill : null;

  const texts = [what, here, analogy].filter((t) => t.length > 0);
  for (const name of checkNames(texts, scope)) found.push({ code: "E2", name });
  for (const name of findForbidden(texts, forbidden)) found.push({ code: "E3", name });
  if (texts.some((t) => invalidLineRefs(t, new Set<number>()).length > 0)) found.push({ code: "E4" });

  if (found.length > 0) {
    issues.push(...found);
    return null;
  }
  return { kind: raw.kind, what, here, analogy, skill };
}
