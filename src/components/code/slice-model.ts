import type {
  ExecutionTraceStep,
  ExplainSelectionRequest,
  HybridArchitecturalNode,
  NodeAnalysisView,
} from "@/contracts";
import { norm } from "@/server/ai/guard/text";
import type { HlRange } from "@/store/workbench";

export interface StepModel {
  text: string;
  lineMap: number[]; // lineMap[i] = số dòng gốc của dòng 0-based i trong text (0 nếu marker hoặc DTO)
}

export interface FileTab {
  path: string;
  name: string; // basename
  weak: boolean; // file có bước nằm trong analysis.weak_points
  firstStep: number | null; // bước đầu thuộc file, null nếu file không có bước nào
}

export interface ModelHlRange {
  startLine: number; // Dòng trong model, tính từ 1
  endLine: number;
  kind: HlRange["kind"];
}

export interface OriginalSelection {
  range: ExplainSelectionRequest["range"];
  selected_text: string;
}

/** Thỏa thuận với D19: bôi đen trong code của bước, bỏ chọn ⇒ `onSelect(null)`. */
export interface CodeSelection extends OriginalSelection {
  step_number: number;
  rect: DOMRect;
}

// Chỉ các trường cần đọc, trùng hình với Selection của Monaco (dòng, cột tính từ 1).
export interface ModelSelection {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

const EMPTY_MODEL: StepModel = { text: "", lineMap: [] };

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

/** Bước đang xem: đúng `activeStep`, không có thì rơi về bước đầu. */
export function findStep(
  node: HybridArchitecturalNode | null | undefined,
  activeStep: number | null | undefined
): ExecutionTraceStep | null {
  const steps = node?.trace_steps;
  if (!steps || steps.length === 0) return null;
  return steps.find((s) => s.step_number === activeStep) ?? steps[0];
}

/**
 * Model của 1 bước (spec/30 Mục 5): chỉ `snippet` của bước đang xem, không nối các bước.
 * Số dòng gốc lấy từ `snippet_line_map`, marker không có số (UI-31).
 */
export function buildStepModel(
  node: HybridArchitecturalNode | null | undefined,
  activeStep: number | null | undefined
): StepModel {
  const step = findStep(node, activeStep);
  if (!step) return EMPTY_MODEL;

  const lines = splitLines(step.snippet || "");
  return {
    text: lines.join("\n"),
    lineMap: lines.map((_, i) => step.snippet_line_map?.[i] ?? 0),
  };
}

/** Model của tab "Kiểu dữ liệu": không có số dòng. */
export function buildDtoModel(node: HybridArchitecturalNode | null | undefined): StepModel {
  if (!node?.dto_snippet) return EMPTY_MODEL;
  const lines = splitLines(node.dto_snippet);
  return { text: lines.join("\n"), lineMap: lines.map(() => 0) };
}

/** Mỗi file 1 tab, thêm file của bước nếu thiếu trong `node.files` để tab đang mở luôn tồn tại. */
export function buildFileTabs(
  node: HybridArchitecturalNode | null | undefined,
  analysis: NodeAnalysisView | null | undefined
): FileTab[] {
  if (!node) return [];
  const steps = node.trace_steps ?? [];
  const weakSteps = new Set(analysis?.weak_points?.map((wp) => wp.step));
  const paths = new Set([...(node.files ?? []), ...steps.map((s) => s.file_path)]);

  return [...paths].map((path) => {
    const fileSteps = steps.filter((s) => s.file_path === path);
    return {
      path,
      name: path.split("/").pop() ?? path,
      weak: fileSteps.some((s) => weakSteps.has(s.step_number)),
      firstStep: fileSteps[0]?.step_number ?? null,
    };
  });
}

/** Dòng phía trên code, bỏ khi hàm bắt đầu ở dòng 1. */
export function stepGapAbove(step: ExecutionTraceStep | null | undefined): string | null {
  if (!step || step.line_start <= 1) return null;
  return `⋯ dòng 1–${step.line_start - 1} không thuộc bài học`;
}

/** Cả bước, dùng cho điểm hay (`strengths` không có `symbol`). */
export function stepHl(
  step: ExecutionTraceStep | null | undefined,
  kind: HlRange["kind"]
): HlRange[] {
  if (!step) return [];
  return [{ line_start: step.line_start, line_end: step.line_end, kind }];
}

/** Dòng gốc đầu tiên trong `snippet` chứa `symbol`, so như `20` AI-18; không thấy ⇒ cả bước. */
export function weakPointHl(
  step: ExecutionTraceStep | null | undefined,
  symbol: string
): HlRange[] {
  if (!step) return [];
  const target = norm(symbol);
  const lines = splitLines(step.snippet || "");
  const index = target
    ? lines.findIndex((line, i) => step.snippet_line_map?.[i] > 0 && norm(line).includes(target))
    : -1;
  if (index < 0) return stepHl(step, "BAD");
  const line = step.snippet_line_map[index];
  return [{ line_start: line, line_end: line, kind: "BAD" }];
}

/** Đổi dải theo số dòng gốc sang dòng model qua `lineMap`; dải không nằm trong code đang xem bị bỏ. */
export function hlToModelRanges(model: StepModel, hl: HlRange[]): ModelHlRange[] {
  return hl.flatMap(({ line_start, line_end, kind }) => {
    const inRange = (original: number) =>
      original > 0 && original >= line_start && original <= line_end;
    const first = model.lineMap.findIndex(inRange);
    if (first < 0) return [];
    const last = model.lineMap.findLastIndex(inRange);
    return [{ startLine: first + 1, endLine: last + 1, kind }];
  });
}

/**
 * Đổi vùng chọn trong model sang số dòng gốc, cùng luật với `POST /api/explain-selection`:
 * mọi dòng phải có số gốc liền nhau. Vùng rỗng, chỉ khoảng trắng, chạm marker hoặc ở tab
 * "Kiểu dữ liệu" ⇒ null. Riêng trần `CONFIG.EXPLAIN_SELECTION_MAX_CHARS` không chặn ở đây:
 * UI-34 cần giữ vùng chọn để hiện nút tắt.
 */
export function toOriginalSelection(
  model: StepModel,
  selection: ModelSelection
): OriginalSelection | null {
  const lines = model.text.split("\n");
  const { startLineNumber, startColumn } = selection;
  let { endLineNumber, endColumn } = selection;

  // Kéo chọn hết dòng làm vùng dừng ở cột 1 của dòng sau; dòng đó không có ký tự nào được chọn.
  if (endColumn === 1 && endLineNumber > startLineNumber) {
    endLineNumber -= 1;
    endColumn = (lines[endLineNumber - 1]?.length ?? 0) + 1;
  }

  const firstOriginal = model.lineMap[startLineNumber - 1];
  for (let line = startLineNumber; line <= endLineNumber; line++) {
    const original = model.lineMap[line - 1];
    if (!original || original !== firstOriginal + (line - startLineNumber)) return null;
  }

  const picked = lines.slice(startLineNumber - 1, endLineNumber);
  picked[picked.length - 1] = picked[picked.length - 1].slice(0, endColumn - 1);
  picked[0] = picked[0].slice(startColumn - 1);
  const selected_text = picked.join("\n");
  if (selected_text.trim().length === 0) return null;

  return {
    range: {
      line_start: firstOriginal,
      col_start: startColumn,
      line_end: firstOriginal + (endLineNumber - startLineNumber),
      col_end: endColumn,
    },
    selected_text,
  };
}
