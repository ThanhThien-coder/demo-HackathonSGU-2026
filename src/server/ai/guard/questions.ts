/**
 * src/server/ai/guard/questions.ts
 *
 * Cổng gác kiểm duyệt câu hỏi đặt ra (GUARD-12) theo spec 21 Mục 5.
 */

import {
  CONFIG,
  type GeneratedQuestionRaw,
  type GuardIssue,
  type HybridArchitecturalNode,
  type NodeAnalysis,
  type QuestionPlanItem,
  type StaticEngineResult,
} from "@/contracts";
import { findForbidden, forbiddenKeywords } from "./forbidden";
import { invalidLineRefs, stepLines } from "./lines";
import { checkNames, nodeScope } from "./names";
import {
  backticks,
  IDENT_RE,
  identWords,
  LANGUAGE_WORDS,
  nodeCodeText,
  norm,
  normText,
} from "./text";

// nội bộ — kết quả kiểm tra từng câu hỏi
export interface QuestionCheck {
  item: QuestionPlanItem;
  question: GeneratedQuestionRaw | null;
  issues: GuardIssue[];
}

/**
 * Đếm số bước được nhắc đến trong câu trả lời theo góc FLOW (GUARD-12).
 * `common` = từ có trong code MỌI bước của `step_indices` (khi có ≥ 2 bước).
 * Bước `s` được tính khi có chuỗi backtick `b` trong `reference_answer` sao cho:
 * `b` là file của bước `s` (f === b hoặc f.endsWith("/" + b)),
 * HOẶC một từ dạng tên (không thuộc `LANGUAGE_WORDS`) của `b` nằm trong `identWords(function_name + snippet của s) \ common`.
 */
export function flowSteps(
  referenceAnswer: string,
  stepIndices: number[],
  node: HybridArchitecturalNode,
): number {
  if (stepIndices.length === 0) return 0;

  const stepsMap = new Map<number, (typeof node.trace_steps)[number]>();
  const wordsByStep = new Map<number, Set<string>>();

  for (const idx of stepIndices) {
    const step = node.trace_steps.find((s) => s.step_number === idx);
    if (step) {
      stepsMap.set(idx, step);
      wordsByStep.set(
        idx,
        identWords(`${step.function_name}\n${step.snippet}`),
      );
    } else {
      wordsByStep.set(idx, new Set());
    }
  }

  let common = new Set<string>();
  if (stepIndices.length >= 2) {
    const firstSet = wordsByStep.get(stepIndices[0]) ?? new Set();
    common = new Set(
      [...firstSet].filter((w) =>
        stepIndices.every((idx) => wordsByStep.get(idx)?.has(w)),
      ),
    );
  }

  const bts = backticks(referenceAnswer);
  let countedSteps = 0;

  for (const idx of stepIndices) {
    const step = stepsMap.get(idx);
    if (!step) continue;

    const stepWords = wordsByStep.get(idx) ?? new Set();
    const filePath = step.file_path.trim().replace(/^\.\//, "");

    const isStepCounted = bts.some((b) => {
      const cleanB = b.trim().replace(/^\.\//, "");
      if (filePath === cleanB || filePath.endsWith("/" + cleanB)) {
        return true;
      }

      const wordsInB = (cleanB.match(IDENT_RE) ?? []).filter(
        (w) => !LANGUAGE_WORDS.has(w.toLowerCase()),
      );
      return wordsInB.some((w) => {
        const nw = norm(w);
        return stepWords.has(nw) && !common.has(nw);
      });
    });

    if (isStepCounted) {
      countedSteps++;
    }
  }

  return countedSteps;
}

/**
 * Kiểm tra các câu hỏi do AI sinh ra theo GUARD-12 spec 21 Mục 5.
 * Câu thứ i của raw ứng với items[i] (theo vị trí).
 */
export function checkQuestions(
  raw: { questions: GeneratedQuestionRaw[] },
  items: QuestionPlanItem[],
  node: HybridArchitecturalNode,
  graph: StaticEngineResult,
  analysis: NodeAnalysis,
): QuestionCheck[] {
  const results: QuestionCheck[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const issues: GuardIssue[] = [];
    const q: GeneratedQuestionRaw | null = raw.questions?.[i] ?? null;

    // Q1: Có câu ở vị trí i và skill === items[i].skill (câu thừa bị bỏ qua)
    if (!q) {
      issues.push({ code: "Q1" });
      results.push({ item, question: null, issues });
      continue;
    }

    if (q.skill !== item.skill) {
      issues.push({ code: "Q1" });
    }

    // Q2: feynman_question, reference_answer, fix khác rỗng;
    // must_have_points có từ MUST_HAVE_POINTS_MIN tới MUST_HAVE_POINTS_MAX ý, ý khác rỗng, không trùng (so normText)
    const isNonEmpty = (s: unknown): boolean =>
      typeof s === "string" && s.trim().length > 0;

    let q2Ok =
      isNonEmpty(q.feynman_question) &&
      isNonEmpty(q.reference_answer) &&
      isNonEmpty(q.fix);

    if (q2Ok) {
      if (!Array.isArray(q.must_have_points)) {
        q2Ok = false;
      } else if (
        q.must_have_points.length < CONFIG.MUST_HAVE_POINTS_MIN ||
        q.must_have_points.length > CONFIG.MUST_HAVE_POINTS_MAX
      ) {
        q2Ok = false;
      } else if (q.must_have_points.some((p) => !isNonEmpty(p))) {
        q2Ok = false;
      } else {
        const normPoints = q.must_have_points.map(normText);
        if (new Set(normPoints).size !== normPoints.length) {
          q2Ok = false;
        }
      }
    }

    if (!q2Ok) {
      issues.push({ code: "Q2" });
    }

    // Q3: checkNames([feynman_question, reference_answer, ...must_have_points], nodeScope) rỗng
    const textsForQ3 = [
      q.feynman_question,
      q.reference_answer,
      ...(Array.isArray(q.must_have_points) ? q.must_have_points : []),
    ];
    const invalidNames = checkNames(textsForQ3, nodeScope(node, graph));
    for (const name of invalidNames) {
      issues.push({ code: "Q3", name });
    }

    // Q4: Số dòng trong 3 trường trên ∈ stepLines(node, item.step_indices)
    const allowedLines = stepLines(node, item.step_indices);
    const hasInvalidLine = textsForQ3.some(
      (t) => invalidLineRefs(t, allowedLines).length > 0,
    );
    if (hasInvalidLine) {
      issues.push({ code: "Q4" });
    }

    // Q5: findForbidden trên feynman_question, reference_answer, must_have_points, fix rỗng
    const textsForQ5 = [...textsForQ3, q.fix];
    const forbiddenKeywordsList = forbiddenKeywords(
      graph.fingerprint,
      nodeCodeText(node),
    );
    const foundForbidden = findForbidden(textsForQ5, forbiddenKeywordsList);
    for (const forbidden of foundForbidden) {
      issues.push({ code: "Q5", name: forbidden });
    }

    // Q6: WEAKNESS: lấy điểm dở cùng skill; từ cuối của symbol (sau norm) ∈ identWords(feynman_question + reference_answer).
    // Không có điểm dở cùng kỹ năng ⇒ hỏng
    if (item.focus === "WEAKNESS") {
      const matchingWeak =
        analysis.weak_points?.filter((w) => w.skill === item.skill) ?? [];
      if (matchingWeak.length === 0) {
        issues.push({ code: "Q6" });
      } else {
        const combinedWords = identWords(
          `${q.feynman_question}\n${q.reference_answer}`,
        );
        const matches = matchingWeak.some((w) => {
          const symWords = w.symbol.match(IDENT_RE) ?? [];
          const lastWord =
            symWords.length > 0
              ? norm(symWords[symWords.length - 1])
              : norm(w.symbol);
          return lastWord && combinedWords.has(lastWord);
        });
        if (!matches) {
          issues.push({ code: "Q6" });
        }
      }
    }

    // Q7: FLOW: flowSteps(reference_answer) ≥ min(CONFIG.FLOW_ANSWER_MIN_STEPS, item.step_indices.length)
    if (item.focus === "FLOW") {
      const minRequired = Math.min(
        CONFIG.FLOW_ANSWER_MIN_STEPS,
        item.step_indices.length,
      );
      if (
        flowSteps(q.reference_answer, item.step_indices, node) < minRequired
      ) {
        issues.push({ code: "Q7" });
      }
    }

    // Q8: CHANGE: ≥ 1 chuỗi backtick trong reference_answer là file của node (f === b hoặc f.endsWith("/" + b), f ∈ node.files)
    if (item.focus === "CHANGE") {
      const bts = backticks(q.reference_answer);
      const hasNodeFile = bts.some((b) => {
        const cleanB = b.trim().replace(/^\.\//, "");
        return node.files.some((f) => {
          const cleanF = f.trim().replace(/^\.\//, "");
          return cleanF === cleanB || cleanF.endsWith("/" + cleanB);
        });
      });
      if (!hasNodeFile) {
        issues.push({ code: "Q8" });
      }
    }

    results.push({
      item,
      question: q,
      issues,
    });
  }

  return results;
}
