import type { HybridArchitecturalNode } from "@/contracts";

export interface StepRange {
  step: number;
  startLine: number; // 1-based line number trong toàn bộ văn bản text
  endLine: number;   // 1-based line number kết thúc bước
}

export interface SliceModel {
  text: string;
  lineMap: number[]; // lineMap[i] = số dòng gốc của dòng 0-based i trong text (0 nếu tiêu đề/trống/marker)
  stepRanges: Record<number, StepRange>;
}

/**
 * Xây dựng mô hình lát cắt (Slice Model) cho Monaco Editor và Code Viewer
 * Tuân thủ quy chuẩn spec/30_UI.md Mục 5 & Test UI-31 / T22:
 * - Mỗi bước bắt đầu bằng tiêu đề chuẩn: `// ── Bước {k} · {layer} · {file_path} · {function_name}`
 * - Số dòng gốc (lineNumbers): tiêu đề bước, dòng trống, marker (0) và DTO không hiện số dòng (lineMap = 0).
 * - Đầu snippet bước 2 của node N3 shop-api có số dòng là 14.
 */
export function buildSliceModel(node: HybridArchitecturalNode | null | undefined): SliceModel {
  if (!node || !node.trace_steps || node.trace_steps.length === 0) {
    return {
      text: "",
      lineMap: [],
      stepRanges: {},
    };
  }

  const isPython = node.languages?.includes("PYTHON") || node.files?.[0]?.endsWith(".py");
  const commentPrefix = isPython ? "#" : "//";

  const allLines: string[] = [];
  const lineMap: number[] = [];
  const stepRanges: Record<number, StepRange> = {};

  node.trace_steps.forEach((step, idx) => {
    // 1-based start line của bước
    const stepStartLine = allLines.length + 1;

    // 1. Tiêu đề bước (không có số dòng -> lineMap = 0)
    const originPart = step.origin_note ? ` · ${step.origin_note}` : "";
    const headerLine = `${commentPrefix} ── Bước ${step.step_number} · ${step.layer} · ${step.file_path} · ${step.function_name}${originPart}`;
    allLines.push(headerLine);
    lineMap.push(0);

    // 2. Từng dòng trong snippet
    const snippetLines = (step.snippet || "").split("\n");
    snippetLines.forEach((codeLine, lineIdx) => {
      allLines.push(codeLine);

      // Lấy số dòng gốc từ snippet_line_map
      const origLine = step.snippet_line_map?.[lineIdx] ?? 0;
      // Dòng marker hoặc dòng rỗng được gán 0
      const isMarker = codeLine.trim().startsWith("// ...") || codeLine.trim().startsWith("# ...");
      lineMap.push(isMarker ? 0 : origLine);
    });

    const stepEndLine = allLines.length;
    stepRanges[step.step_number] = {
      step: step.step_number,
      startLine: stepStartLine,
      endLine: stepEndLine,
    };

    // Dòng trống phân cách giữa các bước (lineMap = 0)
    if (idx < node.trace_steps.length - 1) {
      allLines.push("");
      lineMap.push(0);
    }
  });

  // 3. Khối kiểu dữ liệu liên quan (dto_snippet) nếu có
  if (node.dto_snippet && node.dto_snippet.trim().length > 0) {
    allLines.push("");
    lineMap.push(0);

    allLines.push(`${commentPrefix} ── Kiểu dữ liệu liên quan (DTO / Interface)`);
    lineMap.push(0);

    const dtoLines = node.dto_snippet.split("\n");
    dtoLines.forEach((dtoLine) => {
      allLines.push(dtoLine);
      lineMap.push(0); // DTO không mang số dòng gốc của file
    });
  }

  return {
    text: allLines.join("\n"),
    lineMap,
    stepRanges,
  };
}
