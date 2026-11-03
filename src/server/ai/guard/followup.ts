/**
 * src/server/ai/guard/followup.ts
 *
 * Kiểm tra gợi ý và nhận xét khi chấm bài (GUARD-13, GUARD-14, D-13) theo spec 21 Mục 6.
 */

import type { GradeContext, GradingRaw } from "@/contracts";
import {
  IDENT_RE,
  LANGUAGE_WORDS,
  LOC_RE,
  backticks,
  identWords,
  norm,
  normText,
} from "./text";
import { LINE_RE } from "./lines";
import { checkNames, gradeScope } from "./names";
import { findForbidden } from "./forbidden";

const nums = (s: string): Set<string> => new Set(s.match(/\d+/g) ?? []);

/**
 * Kiểm tra lộ con số (GUARD-13 spec 21 Mục 6):
 * Lộ con số = số có trong đáp án / ý bắt buộc, KHÔNG có trong câu hỏi và KHÔNG có trong câu trả lời.
 */
export function leaksNumbers(
  text: string,
  t: GradeContext,
  answer: string
): boolean {
  const ansAndMust = new Set([
    ...nums(t.reference_answer),
    ...t.must_have_points.flatMap((p) => [...nums(p)]),
  ]);
  const allowedNums = new Set([
    ...nums(t.feynman_question),
    ...nums(answer),
  ]);
  const forbiddenNums = new Set(
    [...ansAndMust].filter((n) => !allowedNums.has(n))
  );

  const textNums = nums(text);
  for (const n of textNums) {
    if (forbiddenNums.has(n)) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra đầu ra chấm: follow_up_question và feedback (GUARD-13 spec 21 Mục 6).
 */
export function verifyFollowUp(
  g: GradingRaw,
  t: GradeContext,
  answer: string,
  isPassed: boolean
): { follow_up_ok: boolean; feedback_ok: boolean } {
  // 1. Kiểm tra follow_up_ok
  let follow_up_ok = false;
  const q = g.follow_up_question;

  if (
    q !== null &&
    q.trim() !== "" &&
    (g.follow_up_type === "CONCEPT" || g.follow_up_type === "CODE_POINTER")
  ) {
    // Điều kiện 2: không từ cấm và tên hợp lệ
    const forbidden = findForbidden([q], t.forbidden_external_keywords);
    const invalidNames = checkNames([q], gradeScope(t, answer));

    if (forbidden.length === 0 && invalidNames.length === 0) {
      if (g.follow_up_type === "CONCEPT") {
        // Điều kiện 3: CONCEPT — không lộ vị trí
        const noBackticks = backticks(q).length === 0;
        const noLoc = !LOC_RE.test(q);

        const fileBasenames = t.steps
          .map((s) => s.file_path.split(/[/\\]/).pop()?.toLowerCase())
          .filter((b): b is string => Boolean(b));
        const lowerQ = q.toLowerCase();
        const noBasename = !fileBasenames.some((base) => lowerQ.includes(base));

        const qIdents = identWords(q);
        const noFunctionName = !t.steps.some((s) => {
          const parts = s.function_name.split(/[^A-Za-z0-9_$]+/).filter(Boolean);
          const lastPart = parts[parts.length - 1];
          return lastPart ? qIdents.has(norm(lastPart)) : false;
        });

        const noLeakedNums = !leaksNumbers(q, t, answer);

        if (
          noBackticks &&
          noLoc &&
          noBasename &&
          noFunctionName &&
          noLeakedNums
        ) {
          follow_up_ok = true;
        }
      } else if (g.follow_up_type === "CODE_POINTER") {
        // Điều kiện 4: CODE_POINTER
        const stepValid =
          g.follow_up_step_index !== null &&
          Number.isInteger(g.follow_up_step_index) &&
          t.step_indices.includes(g.follow_up_step_index);

        const qPrime = q
          .replace(new RegExp(LOC_RE.source, "giu"), "")
          .replace(new RegExp(LINE_RE.source, "giu"), "");
        const noLeakedNums = !leaksNumbers(qPrime, t, answer);

        if (stepValid && noLeakedNums) {
          follow_up_ok = true;
        }
      }
    }
  }

  // 2. Kiểm tra feedback_ok
  let feedback_ok = false;
  const f = g.feedback;

  if (f !== null && f.trim() !== "") {
    const forbidden = findForbidden([f], t.forbidden_external_keywords);
    const invalidNames = checkNames([f], gradeScope(t, answer));

    if (forbidden.length === 0 && invalidNames.length === 0) {
      if (isPassed) {
        feedback_ok = true;
      } else {
        // Chưa đạt: phải thỏa mãn cả 3 điều kiện (a), (b), (c)
        // (a) mọi từ dạng tên trong backtick của f ∈ identWords(answer)
        const answerWords = identWords(answer);
        const btStrings = backticks(f);
        const btOk = btStrings.every((bt) => {
          const ws = (bt.match(IDENT_RE) ?? []).filter(
            (w) => !LANGUAGE_WORDS.has(w.toLowerCase())
          );
          return ws.every((w) => answerWords.has(norm(w)));
        });

        // (b) LOC_RE khớp ⇒ cụm khớp (sau normText) phải có trong câu trả lời
        let locOk = true;
        const locMatches = f.match(new RegExp(LOC_RE.source, "giu"));
        if (locMatches) {
          const normAns = normText(answer);
          for (const m of locMatches) {
            if (!normAns.includes(normText(m))) {
              locOk = false;
              break;
            }
          }
        }

        // (c) !leaksNumbers(f)
        const noLeakedNums = !leaksNumbers(f, t, answer);

        if (btOk && locOk && noLeakedNums) {
          feedback_ok = true;
        }
      }
    }
  }

  return { follow_up_ok, feedback_ok };
}
