// Chọn chế độ suy biến và xử lý PROCEDURAL — spec 11 Mục 5 (ENG-51), Mục 10 (ENG-102).
import type { Node } from "web-tree-sitter";
import {
  CONFIG,
  type ArchitecturalLayer,
  type DegradedMode,
  type ExecutionTraceStep,
} from "@/contracts";
import { getAdapter } from "./registry";
import { buildSlice } from "./slicing";
import { cognitiveComplexity } from "./complexity";
import { hash6, normalizeTokens } from "./naming";
import type {
  Candidate,
  EngineContext,
  EntryPoint,
  FunctionInfo,
  ParsedFile,
} from "./types";

// ENG-51: Chọn chế độ theo bảng quyết định
export function chooseMode(
  entries: EntryPoint[],
  parsedInScope: number
): DegradedMode | null {
  // 1. Có entry REGISTERED hoặc GENERIC ⇒ NORMAL (null)
  const hasRegisteredOrGeneric = entries.some(
    (e) => e.source === "REGISTERED" || e.source === "GENERIC"
  );
  if (hasRegisteredOrGeneric) {
    return null;
  }

  // 2. Không có entry và n <= CONFIG.PROCEDURAL_MAX_FILES ⇒ PROCEDURAL
  if (parsedInScope <= CONFIG.PROCEDURAL_MAX_FILES) {
    return "PROCEDURAL";
  }

  // 3. Còn lại ⇒ NORMAL (null) (với các entry PROGRAM nếu có; không có entry ⇒ null)
  return null;
}

type ProceduralLabel = "INPUT" | "VALIDATE" | "COMPUTE_OUTPUT" | "DATA";

const DATA_SINK_REGEX =
  /\b(cursor\.(execute|executemany)|(db|database|session|repo|repository|connection|conn|prisma)\.(query|execute|save|find|insert|update|delete)|open\s*\(.*['"][wa]|writeFile)\b/i;

const INPUT_REGEX =
  /\b(req\.(body|params|query)|request\.(json|args|form|values|GET|POST)|input\s*\(|sys\.argv|process\.argv|parse_args|Scanner\s*\(|cin\b)/i;

const VALIDATE_REGEX =
  /\b(assert\b|\.validate\(|\.parse\(|if\b[^\n]*(throw|return|sys\.exit|raise|process\.exit|continue|break))\b/i;

/**
 * Phân loại một câu lệnh cấp 1 của hàm M theo 4 nhãn của Mục 10 ý 2.
 */
function classifyStatement(text: string): ProceduralLabel {
  if (DATA_SINK_REGEX.test(text)) return "DATA";
  if (VALIDATE_REGEX.test(text)) return "VALIDATE";
  if (INPUT_REGEX.test(text)) return "INPUT";
  return "COMPUTE_OUTPUT";
}

/**
 * Tính điểm Cognitive Complexity cho một AST statement theo ENG-71.
 */
function calculateStmtComplexity(n: Node): number {
  let score = 0;
  function walk(curr: Node, nesting: number): void {
    const type = curr.type;
    const isControl =
      type === "if_statement" ||
      type === "for_statement" ||
      type === "for_in_statement" ||
      type === "for_of_statement" ||
      type === "while_statement" ||
      type === "do_statement" ||
      type === "switch_statement" ||
      type === "match_statement" ||
      type === "catch_clause" ||
      type === "except_clause" ||
      type === "ternary_expression" ||
      type === "conditional_expression";

    if (isControl) {
      score += 1 + nesting;
      for (let i = 0; i < curr.childCount; i++) {
        const child = curr.child(i);
        if (child) walk(child, nesting + 1);
      }
      return;
    }

    if (type === "else_clause" || type === "elif_clause") {
      score += 1;
      for (let i = 0; i < curr.childCount; i++) {
        const child = curr.child(i);
        if (child) walk(child, nesting);
      }
      return;
    }

    for (let i = 0; i < curr.childCount; i++) {
      const child = curr.child(i);
      if (child) walk(child, nesting);
    }
  }
  walk(n, 0);
  return Math.max(1, score);
}

/**
 * Chế độ suy biến PROCEDURAL (Mục 10).
 */
export function buildProceduralCandidates(
  files: ParsedFile[],
  ctx: EngineContext
): Candidate[] {
  // 1. P1: Entry giả = mọi hàm (cả <module>) có >= 1 câu lệnh trong file scope
  const p1Candidates: Candidate[] = [];
  const scopeFiles = new Set(files.map((f) => f.path));

  for (const [, fn] of ctx.idx.functions) {
    if (!scopeFiles.has(fn.file_path)) continue;
    if (fn.line_end < fn.line_start) continue;

    const fakeEntry: EntryPoint = {
      key: fn.key,
      binding: null,
      source: "PROGRAM",
    };

    try {
      const slice = buildSlice(fakeEntry, ctx);
      p1Candidates.push(slice);
    } catch {
      // Bỏ qua nếu lỗi cắt lát
    }
  }

  // Đếm số cạnh giữa các candidate P1
  let edgeCount = 0;
  for (let i = 0; i < p1Candidates.length; i++) {
    for (let j = i + 1; j < p1Candidates.length; j++) {
      const fnsA = p1Candidates[i]!.functions;
      const fnsB = p1Candidates[j]!.functions;
      const hasOverlap = fnsA.some((fa) => fnsB.includes(fa));
      if (hasOverlap) edgeCount++;
    }
  }

  // Tìm hàm dài nhất M
  let longestFn: FunctionInfo | null = null;
  let maxLines = -1;

  for (const [, fn] of ctx.idx.functions) {
    if (!scopeFiles.has(fn.file_path)) continue;
    const lines = fn.line_end - fn.line_start + 1;
    if (lines > maxLines) {
      maxLines = lines;
      longestFn = fn;
    } else if (lines === maxLines && longestFn && fn.key < longestFn.key) {
      longestFn = fn;
    }
  }

  // Điều kiện kích hoạt P2:
  // < CONFIG.FUNCTION_GRAPH_MIN_NODES candidate, 0 cạnh, hoặc hàm dài nhất > CONFIG.LONG_FUNCTION_LINES dòng
  const needP2 =
    p1Candidates.length < CONFIG.FUNCTION_GRAPH_MIN_NODES ||
    edgeCount === 0 ||
    maxLines > CONFIG.LONG_FUNCTION_LINES;

  if (!needP2 || !longestFn) {
    return p1Candidates;
  }

  // 2. Chạy P2 trên hàm M
  const m = longestFn;
  const mFile = ctx.files.get(m.file_path);
  if (!mFile) return p1Candidates;

  if (m.complexity === 0) {
    m.complexity = cognitiveComplexity(m, mFile);
  }

  const mSourceLines = mFile.source.split(/\r?\n/);
  const commentPrefix = getAdapter(mFile.language)?.comment_prefix ?? "//";

  // Thu thập các câu lệnh cấp 1 của M
  interface StmtGroup {
    label: ProceduralLabel;
    startLine: number;
    endLine: number;
    lines: string[];
    complexity: number;
  }

  const labelStatements = new Map<ProceduralLabel, StmtGroup[]>();
  labelStatements.set("INPUT", []);
  labelStatements.set("VALIDATE", []);
  labelStatements.set("COMPUTE_OUTPUT", []);
  labelStatements.set("DATA", []);

  // Tìm các AST node câu lệnh cấp 1 trong thân của M
  let bodyNode: Node | null = null;
  if (m.name === "<module>") {
    bodyNode = mFile.tree.rootNode;
  } else {
    // Tìm node của hàm bằng cách duyệt tìm node function có span bao phủ m.line_start .. m.line_end
    let bestNode: Node | null = null;
    let minSpan = Infinity;
    const searchFn = (n: Node): void => {
      const isFn =
        n.type === "function_definition" ||
        n.type === "function_declaration" ||
        n.type === "function_expression" ||
        n.type === "arrow_function" ||
        n.type === "method_definition";
      if (isFn) {
        const s = n.startPosition.row + 1;
        const e = n.endPosition.row + 1;
        if (s <= m.line_start && e >= m.line_end) {
          const span = e - s;
          if (span < minSpan) {
            minSpan = span;
            bestNode = n;
          }
        }
      }
      for (let i = 0; i < n.childCount; i++) {
        const c = n.child(i);
        if (c) searchFn(c);
      }
    };
    searchFn(mFile.tree.rootNode);
    if (bestNode) {
      bodyNode = (bestNode as Node).childForFieldName("body") ?? (bestNode as Node);
    }
  }

  if (bodyNode) {
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (!child) continue;
      // Bỏ qua comment, import và ngoặc ở cấp 1
      if (
        child.type === "comment" ||
        child.type === "import_statement" ||
        child.type === "import_from_statement" ||
        child.type === "{" ||
        child.type === "}"
      ) {
        continue;
      }

      const sLine = child.startPosition.row + 1;
      const eLine = child.endPosition.row + 1;
      const stmtText = mSourceLines.slice(sLine - 1, eLine).join("\n");
      const label = classifyStatement(stmtText);

      // Tính complexity cho câu lệnh này
      let stmtComp = 1;
      try {
        stmtComp = calculateStmtComplexity(child);
      } catch {
        stmtComp = 1;
      }

      labelStatements.get(label)!.push({
        label,
        startLine: sLine,
        endLine: eLine,
        lines: mSourceLines.slice(sLine - 1, eLine),
        complexity: stmtComp,
      });
    }
  }

  // Đếm số nhãn có ít nhất 1 câu lệnh
  const activeLabels: { label: ProceduralLabel; firstLine: number; groups: StmtGroup[] }[] = [];
  for (const [lbl, groups] of labelStatements) {
    if (groups.length > 0) {
      const firstLine = Math.min(...groups.map((g) => g.startLine));
      activeLabels.push({ label: lbl, firstLine, groups });
    }
  }

  // < 2 nhãn ⇒ bỏ P2, giữ P1
  if (activeLabels.length < 2) {
    return p1Candidates;
  }

  // Sắp xếp các nhãn theo dòng đầu tiên xuất hiện (chuỗi thứ tự của M)
  activeLabels.sort((a, b) => a.firstLine - b.firstLine);

  // Dựng node ảo cho từng nhãn (ENG-102)
  const vnodes: Candidate[] = [];
  const mRank = ctx.rank.get(m.file_path) ?? 0;

  // Lấy chữ ký của M
  const signatureLine = m.name === "<module>" ? "" : (mSourceLines[m.line_start - 1] ?? "");
  const closeLine = m.name === "<module>" ? "" : (mSourceLines[m.line_end - 1] ?? "");

  const stem = m.file_path.replace(/\\/g, "/").split("/").pop() ?? m.file_path;
  const mTitleTokens = normalizeTokens(m.name === "<module>" ? stem.replace(/\.[^.]+$/, "") : m.name);
  const mBaseTitle = mTitleTokens.length > 0 ? mTitleTokens.join(" ") : "Main";

  for (const item of activeLabels) {
    const lbl = item.label;
    const groups = item.groups;

    let layer: ArchitecturalLayer = "BUSINESS_LOGIC";
    let stageTitle = "Compute & Output";
    if (lbl === "INPUT") {
      layer = "ENTRY_POINT";
      stageTitle = "Input";
    } else if (lbl === "VALIDATE") {
      layer = "MIDDLEWARE";
      stageTitle = "Validation";
    } else if (lbl === "DATA") {
      layer = "DATA_ACCESS";
      stageTitle = "Data Access";
    }

    // Ghép snippet cho nhãn
    const snippetLines: string[] = [];
    const lineMap: number[] = [];

    if (signatureLine) {
      snippetLines.push(signatureLine);
      lineMap.push(m.line_start);
    }

    let prevEnd = m.line_start;
    for (const g of groups) {
      if (g.startLine > prevEnd + 1) {
        const omitted = g.startLine - prevEnd - 1;
        snippetLines.push(`  ${commentPrefix} … (${omitted} dòng)`);
        lineMap.push(0);
      }
      for (let l = g.startLine; l <= g.endLine; l++) {
        snippetLines.push(mSourceLines[l - 1] ?? "");
        lineMap.push(l);
      }
      prevEnd = g.endLine;
    }

    if (closeLine && m.name !== "<module>") {
      if (m.line_end > prevEnd + 1) {
        const omitted = m.line_end - prevEnd - 1;
        snippetLines.push(`  ${commentPrefix} … (${omitted} dòng)`);
        lineMap.push(0);
      }
      snippetLines.push(closeLine);
      lineMap.push(m.line_end);
    }

    // Hard clamp nếu > CONFIG.STEP_MAX_LINES (30)
    let finalSnippet = snippetLines.join("\n");
    let finalMap = lineMap;
    if (snippetLines.length > CONFIG.STEP_MAX_LINES) {
      const kept = snippetLines.slice(0, CONFIG.STEP_MAX_LINES - 1);
      const omitted = snippetLines.length - kept.length;
      kept.push(`  ${commentPrefix} … (${omitted} dòng)`);
      finalSnippet = kept.join("\n");
      finalMap = lineMap.slice(0, CONFIG.STEP_MAX_LINES);
    }

    // Đảm bảo import cognitiveComplexity được dùng nếu cần tính tổng thể hàm
    const totalComp = groups.reduce((sum, g) => sum + g.complexity, 0);
    const vnodeId = `vnode-${hash6(`${m.file_path}#${lbl}`)}`;

    const step: ExecutionTraceStep = {
      step_number: 1,
      layer,
      file_path: m.file_path,
      function_name: m.name,
      line_start: item.firstLine,
      line_end: Math.max(...groups.map((g) => g.endLine)),
      snippet: finalSnippet,
      snippet_line_map: finalMap,
    };

    const cand: Candidate = {
      id: vnodeId,
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: null,
      trace_steps: [step],
      dto_snippet: "",
      cognitive_complexity: totalComp,
      rank_score: mRank,
      title_source: "VIRTUAL",
      title_evidence: lbl,
      kind: "VNODE",
      order_key: hash6(`${m.file_path}#${lbl}`),
      functions: [],
      binding: null,
      base_title: `${mBaseTitle}: ${stageTitle}`,
    };

    vnodes.push(cand);
  }

  // Kết quả = node ảo của M + candidate P1 không chứa M
  const otherP1Candidates = p1Candidates.filter(
    (c) => !c.functions.includes(m.key) && c.entry_symbol !== m.key
  );

  return [...vnodes, ...otherP1Candidates];
}
