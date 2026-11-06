/**
 * src/app/api/explain-selection/route.ts
 *
 * POST /api/explain-selection -> ExplainSelectionResponse
 * Theo spec 03 Mục 2 dòng 15, Mục 6.9, spec 02 Mục 8 và spec 20 Mục 8 (AI-38).
 */

import {
  CONFIG,
  type StaticEngineResult,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import {
  getSessionStaticResult,
  verifySessionOwnership,
} from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hàm nội bộ trong route cắt và kiểm tra tính hợp lệ của vùng chọn (AI-38).
 * 03 Mục 6.9 & 20 Mục explain-selection:
 * - Không có node hoặc bước ⇒ ERR_SELECTION_INVALID
 * - Tìm vị trí dòng bằng snippet_line_map. Dòng không có trong map ⇒ ERR_SELECTION_INVALID.
 *   Số 0 trong map là marker, không bao giờ khớp.
 * - Các dòng từ line_start tới line_end phải liền nhau trong snippet. Có marker xen giữa ⇒ ERR_SELECTION_INVALID.
 * - Cột tính từ 1, col_end loại trừ. Vùng ra ngoài dòng hoặc rỗng ⇒ ERR_SELECTION_INVALID.
 * - Đoạn cắt khác selected_text (so sau khi bỏ khoảng trắng 2 đầu) ⇒ ERR_SELECTION_INVALID.
 * - Dài hơn CONFIG.EXPLAIN_SELECTION_MAX_CHARS ký tự ⇒ ERR_SELECTION_INVALID.
 */
function extractAndValidateSelection(
  graph: StaticEngineResult,
  req: {
    node_id: string;
    step_number: number;
    range: { line_start: number; col_start: number; line_end: number; col_end: number };
    selected_text: string;
  }
): string {
  const node = graph.nodes.find((n) => n.id === req.node_id);
  if (!node) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  const step = node.trace_steps.find((s) => s.step_number === req.step_number);
  if (!step) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  const map = step.snippet_line_map;
  if (!Array.isArray(map) || map.length === 0) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  const { line_start, col_start, line_end, col_end } = req.range;

  // Số dòng gốc tính từ 1, không được <= 0, line_start <= line_end
  if (line_start <= 0 || line_end <= 0 || line_start > line_end) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  // Tìm vị trí dòng trong snippet_line_map (0 là marker, không bao giờ khớp)
  const startIdx = map.indexOf(line_start);
  const endIdx = map.indexOf(line_end);

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  // Các dòng từ line_start tới line_end phải liền nhau trong snippet
  // và không được có marker (0) xen giữa
  if (endIdx - startIdx !== line_end - line_start) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  for (let i = startIdx; i <= endIdx; i++) {
    if (map[i] === 0 || map[i] !== line_start + (i - startIdx)) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }
  }

  const snippetLines = step.snippet.replace(/\r\n/g, "\n").split("\n");
  if (startIdx >= snippetLines.length || endIdx >= snippetLines.length) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  let extracted = "";

  if (startIdx === endIdx) {
    const lineStr = snippetLines[startIdx];
    // Cột tính từ 1, col_end loại trừ. Vùng ra ngoài dòng hoặc rỗng ⇒ ERR_SELECTION_INVALID
    if (
      col_start < 1 ||
      col_end < 1 ||
      col_start >= col_end ||
      col_start > lineStr.length + 1 ||
      col_end > lineStr.length + 1
    ) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }
    extracted = lineStr.slice(col_start - 1, col_end - 1);
  } else {
    const startLine = snippetLines[startIdx];
    const endLine = snippetLines[endIdx];

    if (
      col_start < 1 ||
      col_start > startLine.length + 1 ||
      col_end < 1 ||
      col_end > endLine.length + 1
    ) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    const parts: string[] = [];
    parts.push(startLine.slice(col_start - 1));
    for (let i = startIdx + 1; i < endIdx; i++) {
      parts.push(snippetLines[i]);
    }
    parts.push(endLine.slice(0, col_end - 1));
    extracted = parts.join("\n");
  }

  // Vùng rỗng
  if (extracted.trim().length === 0) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  // So sánh sau khi bỏ khoảng trắng 2 đầu
  if (extracted.trim() !== req.selected_text.trim()) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  // Dài hơn CONFIG.EXPLAIN_SELECTION_MAX_CHARS ký tự
  if (
    extracted.length > CONFIG.EXPLAIN_SELECTION_MAX_CHARS ||
    req.selected_text.length > CONFIG.EXPLAIN_SELECTION_MAX_CHARS
  ) {
    throw new ApiHttpError("ERR_SELECTION_INVALID");
  }

  return extracted;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      body =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : {};
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const sessionId =
      typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    // Thiếu trường hoặc sai kiểu ở node_id, step_number, range, selected_text ⇒ ERR_SELECTION_INVALID
    if (typeof body.node_id !== "string" || body.node_id.trim().length === 0) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    if (
      typeof body.step_number !== "number" ||
      !Number.isInteger(body.step_number) ||
      body.step_number <= 0
    ) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    if (
      !body.range ||
      typeof body.range !== "object" ||
      Array.isArray(body.range)
    ) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    const range = body.range as Record<string, unknown>;
    if (
      typeof range.line_start !== "number" ||
      !Number.isInteger(range.line_start) ||
      typeof range.col_start !== "number" ||
      !Number.isInteger(range.col_start) ||
      typeof range.line_end !== "number" ||
      !Number.isInteger(range.line_end) ||
      typeof range.col_end !== "number" ||
      !Number.isInteger(range.col_end)
    ) {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    if (typeof body.selected_text !== "string") {
      throw new ApiHttpError("ERR_SELECTION_INVALID");
    }

    // Kiểm chủ phiên (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);

    // Đọc StaticEngineResult bằng getSessionStaticResult (03 Mục 4, D-59)
    const graph = await getSessionStaticResult(session, user.id);

    // Cắt và kiểm tra vùng chọn (11)
    extractAndValidateSelection(graph, {
      node_id: body.node_id,
      step_number: body.step_number,
      range: {
        line_start: range.line_start,
        col_start: range.col_start,
        line_end: range.line_end,
        col_end: range.col_end,
      },
      selected_text: body.selected_text,
    });

    // Chờ C-11: thay bằng explainSelection (20 Mục explain-selection).
    throw new ApiHttpError("ERR_AI_UNAVAILABLE");
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
