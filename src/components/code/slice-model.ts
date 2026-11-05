// 30 Mục 5 — dựng model Monaco cho 1 node: tiêu đề từng bước + snippet, số dòng gốc (UI-31).
import type { HybridArchitecturalNode } from "@/contracts";

export interface SliceModel {
  text: string;
  lineMap: number[];                                   // lineMap[i] = số dòng gốc của dòng editor i+1 (0 ⇒ không số)
  stepRanges: Array<{ step: number; start: number; end: number; header: number }>; // dòng editor 1-based
}

const MONACO_LANG: Record<string, string> = {
  TYPESCRIPT: "typescript", TSX: "typescript", JAVASCRIPT: "javascript", JSX: "javascript", PYTHON: "python", DART: "dart",
  KOTLIN: "kotlin", SWIFT: "swift", JAVA: "java", GO: "go", RUST: "rust", CSHARP: "csharp", PHP: "php", RUBY: "ruby", C: "c", CPP: "cpp",
};
export const monacoLanguage = (node: HybridArchitecturalNode | null): string => (node ? MONACO_LANG[node.languages[0]] ?? "plaintext" : "plaintext");

export function buildSliceModel(node: HybridArchitecturalNode): SliceModel {
  const cp = node.languages[0] === "PYTHON" ? "#" : "//";
  const lines: string[] = [];
  const lineMap: number[] = [];
  const stepRanges: SliceModel["stepRanges"] = [];
  node.trace_steps.forEach((s, i) => {
    if (i > 0) { lines.push(""); lineMap.push(0); }
    const header = lines.length + 1;
    lines.push(`${cp} ── Bước ${s.step_number} · ${s.layer} · ${s.file_path} · ${s.function_name}${s.origin_note ? ` · ${s.origin_note}` : ""}`);
    lineMap.push(0);
    const snip = s.snippet.split("\n");
    snip.forEach((l, k) => { lines.push(l); lineMap.push(s.snippet_line_map[k] ?? 0); });
    stepRanges.push({ step: s.step_number, start: header, end: lines.length, header });
  });
  if (node.dto_snippet.trim()) {
    lines.push(""); lineMap.push(0);
    lines.push(`${cp} ── Kiểu dữ liệu`); lineMap.push(0);
    for (const l of node.dto_snippet.split("\n")) { lines.push(l); lineMap.push(0); }
  }
  return { text: lines.join("\n"), lineMap, stepRanges };
}

/** UI-33: dòng editor ⇒ bước chứa dòng đó (null nếu ngoài mọi bước). */
export const stepAtLine = (m: SliceModel, line: number): number | null =>
  m.stepRanges.find((r) => line >= r.start && line <= r.end)?.step ?? null;
