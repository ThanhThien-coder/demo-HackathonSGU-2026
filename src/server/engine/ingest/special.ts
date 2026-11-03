import type { IngestionReport, LanguageId, VirtualFileOrigin } from "@/contracts";

interface RawNotebookCell {
  cell_type?: string;
  source?: string | string[];
  input?: string | string[];
}

interface RawNotebook {
  metadata?: {
    kernelspec?: {
      language?: string;
    };
    language_info?: {
      name?: string;
    };
  };
  cells?: RawNotebookCell[];
  worksheets?: Array<{
    cells?: RawNotebookCell[];
  }>;
}

/**
 * Trích xuất file ảo từ notebook (.ipynb) theo docs/spec/10_ENGINE_INGEST.md Mục 10 (ING-100)
 */
export function extractNotebook(
  filePath: string,
  jsonText: string,
  report: IngestionReport
): { virtual_path: string; code: string; origin: VirtualFileOrigin } | null {
  let parsed: RawNotebook;
  try {
    parsed = JSON.parse(jsonText) as RawNotebook;
  } catch {
    const warn = `Notebook ${filePath} bị hỏng định dạng`;
    if (!report.warnings.includes(warn)) {
      report.warnings.push(warn);
    }
    return null;
  }

  // (2) Kiểm tra ngôn ngữ (mặc định python)
  const rawLang =
    parsed.metadata?.kernelspec?.language ??
    parsed.metadata?.language_info?.name ??
    "python";

  const lang = typeof rawLang === "string" ? rawLang.trim().toLowerCase() : "";
  if (lang !== "python") {
    report.skipped.unsupported_lang++;
    return null;
  }

  // (3) Lấy danh sách cells (v4: cells, v3: worksheets[0].cells)
  const allCells: RawNotebookCell[] = Array.isArray(parsed.cells)
    ? parsed.cells
    : Array.isArray(parsed.worksheets?.[0]?.cells)
      ? parsed.worksheets[0].cells
      : [];

  const generatedLines: string[] = [];
  const lineOrigin: string[] = [];

  for (let idx = 0; idx < allCells.length; idx++) {
    const cell = allCells[idx];
    const cellNumber = idx + 1; // 1-based index trong toàn bộ danh sách cell

    if (cell.cell_type !== "code") {
      continue;
    }

    const rawSource = cell.source ?? cell.input ?? "";
    const sourceText = Array.isArray(rawSource)
      ? rawSource.join("")
      : typeof rawSource === "string"
        ? rawSource
        : String(rawSource);

    // Header của cell
    const cellLabel = `cell ${cellNumber}`;
    generatedLines.push(`# %% [cell ${cellNumber}]`);
    lineOrigin.push(cellLabel);

    // Xử lý từng dòng code trong cell
    const cellLines = sourceText.split(/\r?\n/);
    for (const rawLine of cellLines) {
      let processedLine = rawLine;
      if (/^\s*[%!]/.test(rawLine)) {
        processedLine = `# [magic] ${rawLine}`;
      }
      generatedLines.push(processedLine);
      lineOrigin.push(cellLabel);
    }
  }

  if (generatedLines.length === 0) {
    return null;
  }

  const virtual_path = `${filePath}.py`;
  const code = generatedLines.join("\n");
  const origin: VirtualFileOrigin = {
    kind: "NOTEBOOK",
    original_path: filePath,
    line_origin: lineOrigin,
  };

  return {
    virtual_path,
    code,
    origin,
  };
}

const SCRIPT_REGEX = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * Trích xuất script từ SFC (.vue, .svelte) theo docs/spec/10_ENGINE_INGEST.md Mục 10 (ING-101)
 */
export function extractSfcScript(
  filePath: string,
  rawText: string
): {
  virtual_path: string;
  code: string;
  language: LanguageId;
  origin: VirtualFileOrigin;
} | null {
  const matches = Array.from(rawText.matchAll(SCRIPT_REGEX));
  if (matches.length === 0) {
    return null;
  }

  let isTs = false;
  const scriptRanges: Array<{ start: number; end: number }> = [];

  for (const m of matches) {
    const attrs = m[1] ?? "";
    if (/\blang\s*=\s*["'](?:ts|typescript)["']/i.test(attrs)) {
      isTs = true;
    }

    const matchStart = m.index;
    const fullMatch = m[0];
    const openTagEnd = fullMatch.indexOf(">") + 1;
    const closeTagStart = fullMatch.lastIndexOf("</script");

    const contentStart = matchStart + openTagEnd;
    const contentEnd = matchStart + closeTagStart;
    if (contentEnd >= contentStart) {
      scriptRanges.push({ start: contentStart, end: contentEnd });
    }
  }

  const language: LanguageId = isTs ? "TYPESCRIPT" : "JAVASCRIPT";
  const virtual_path = `${filePath}.${isTs ? "ts" : "js"}`;

  // Chuẩn hóa dòng: Ký tự ngoài nội dung <script> bị xóa nhưng giữ \n
  const outChars: string[] = [];
  const insideFlags: boolean[] = [];

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const isInside = scriptRanges.some((r) => i >= r.start && i < r.end);

    if (isInside) {
      outChars.push(char);
      insideFlags.push(true);
    } else {
      if (char === "\n") {
        outChars.push("\n");
        insideFlags.push(false);
      } else if (char === "\r") {
        // bỏ \r để giữ thống nhất \n
      }
    }
  }

  const code = outChars.join("");
  const codeLines = code.split("\n");

  // Gán nhãn từng dòng ảo: "<script>" nếu dòng nằm trong khối script, "" cho dòng khác
  // Ta dò vị trí dòng trong rawText
  const lineOrigin: string[] = [];
  let charIdx = 0;
  for (let l = 0; l < codeLines.length; l++) {
    const lineLen = codeLines[l].length;
    let hasScriptChar = false;
    for (let c = 0; c < lineLen; c++) {
      if (insideFlags[charIdx + c]) {
        hasScriptChar = true;
        break;
      }
    }
    lineOrigin.push(hasScriptChar ? "<script>" : "");
    charIdx += lineLen + 1; // +1 cho \n
  }

  const origin: VirtualFileOrigin = {
    kind: "SFC",
    original_path: filePath,
    line_origin: lineOrigin,
  };

  return {
    virtual_path,
    code,
    language,
    origin,
  };
}

/**
 * Xác định ghi chú nguồn gốc (origin_note) cho lát cắt theo docs/spec/10_ENGINE_INGEST.md Mục 10 (ING-102)
 */
export function originNoteFor(
  origin: VirtualFileOrigin,
  lines: number[]
): string | undefined {
  const validLines = lines.filter((line) => line > 0);
  if (validLines.length === 0) {
    return undefined;
  }

  const labels = validLines
    .map((l) => (l <= origin.line_origin.length ? origin.line_origin[l - 1] : ""))
    .filter((label) => Boolean(label && label.trim() !== ""));

  if (labels.length === 0) {
    return undefined;
  }

  if (origin.kind === "SFC") {
    return labels.includes("<script>") ? "<script>" : undefined;
  }

  if (origin.kind === "NOTEBOOK") {
    const cellNumbers = new Set<number>();
    for (const lbl of labels) {
      const match = lbl.match(/^cell\s+(\d+)$/);
      if (match) {
        cellNumbers.add(parseInt(match[1], 10));
      }
    }

    if (cellNumbers.size === 0) {
      return undefined;
    }

    const sorted = Array.from(cellNumbers).sort((a, b) => a - b);
    if (sorted.length === 1) {
      return `cell ${sorted[0]}`;
    }

    return `cell ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  return undefined;
}
