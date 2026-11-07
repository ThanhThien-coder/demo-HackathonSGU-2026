/**
 * src/server/ai/guard/names.ts
 *
 * Chốt tên (GUARD-04, GUARD-05, D-19) theo spec 21 Mục 2.
 */

import type {
  GradeContext,
  HybridArchitecturalNode,
  StaticEngineResult,
} from "@/contracts";
import {
  IDENT_RE,
  LANGUAGE_WORDS,
  backticks,
  identWords,
  nodeCodeText,
  norm,
} from "./text";

export interface NameScope {
  files: readonly string[];
  words: Set<string>;
  extra: Set<string>;
  relaxed: boolean;
} // nội bộ

/**
 * Phạm vi tên cho analyze-node và enrich-node (đặt câu hỏi).
 */
export function nodeScope(
  node: HybridArchitecturalNode,
  graph: StaticEngineResult
): NameScope {
  const code = nodeCodeText(node);
  const words = identWords(
    [...graph.symbol_whitelist, ...graph.file_index, code].join("\n")
  );
  return {
    files: graph.file_index,
    words,
    extra: new Set<string>(),
    relaxed: node.support_tier === "STRUCTURAL",
  };
}

/**
 * Phạm vi tên cho analyze-overview (tổng quan repo).
 */
export function repoScope(graph: StaticEngineResult): NameScope {
  const allCode = graph.nodes.map(nodeCodeText).join("\n");
  const words = identWords(
    [...graph.symbol_whitelist, ...graph.file_index, allCode].join("\n")
  );
  const extra = new Set<string>(graph.nodes.flatMap((n) => [n.id, n.title]));
  const relaxed = graph.nodes.some((n) => n.support_tier === "STRUCTURAL");
  return {
    files: graph.file_index,
    words,
    extra,
    relaxed,
  };
}

/**
 * Phạm vi tên khi giải thích đoạn chọn (explain-selection, 21 GUARD-23, D-82):
 * code của bước, dto_snippet, tên ở references, file của node.
 */
export function explainScope(
  node: HybridArchitecturalNode,
  stepNumber: number,
  refNames: string[],
  graph: StaticEngineResult
): NameScope {
  void graph; // giữ chữ ký theo spec 21; phạm vi không lấy tên toàn repo
  const step = node.trace_steps.find((s) => s.step_number === stepNumber);
  const words = identWords(
    [step ? `${step.function_name}\n${step.snippet}` : "", node.dto_snippet, ...refNames, ...node.files].join("\n")
  );
  return {
    files: node.files,
    words,
    extra: new Set<string>(refNames),
    relaxed: node.support_tier === "STRUCTURAL",
  };
}

/**
 * Phạm vi tên khi chấm bài (evaluate-feynman, D-36).
 */
export function gradeScope(t: GradeContext, answer: string): NameScope {
  const stepTexts = t.steps
    .map((s) => `${s.function_name}\n${s.file_path}`)
    .join("\n");
  const words = identWords(
    [stepTexts, t.feynman_question, t.reference_answer, answer].join("\n")
  );
  return {
    files: t.steps.map((s) => s.file_path),
    words,
    extra: new Set<string>(),
    relaxed: false,
  };
}

/**
 * Kiểm tra một chuỗi tên có hợp lệ trong phạm vi NameScope hay không.
 * - Tên file / id, title node => true
 * - Chuỗi literal trong '' "" => bỏ qua
 * - Từ khóa ngôn ngữ, số, toán tử => true
 * - Relaxed: ít nhất 1 từ dạng tên có trong phạm vi
 * - Strict: mọi từ dạng tên phải có trong phạm vi
 */
export function isValidName(s: string, sc: NameScope): boolean {
  const t = s.trim().replace(/^\.\//, "");
  if (sc.files.some((f) => f === t || f.endsWith("/" + t)) || sc.extra.has(t)) {
    return true; // tên file / id, title node
  }
  const ws = (
    t.replace(/(['"])(?:\\.|(?!\1).)*\1/g, " ").match(IDENT_RE) ?? []
  ).filter((w) => !LANGUAGE_WORDS.has(w.toLowerCase()));
  if (ws.length === 0) return true; // số, toán tử, từ khóa
  const inScope = (w: string) => sc.words.has(norm(w));
  return sc.relaxed ? ws.some(inScope) : ws.every(inScope); // GUARD-05
}

/**
 * Kiểm tra danh sách chuỗi: chỉ chuỗi trong backtick bị kiểm (GUARD-04).
 * Trả về mảng các tên sai ([] = qua).
 */
export const checkNames = (texts: string[], sc: NameScope): string[] =>
  texts.flatMap(backticks).filter((b) => !isValidName(b, sc));
