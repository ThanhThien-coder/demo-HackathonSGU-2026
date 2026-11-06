// Tính Cognitive Complexity theo chuẩn SonarQube và chọn hàm VIP — spec 11 Mục 7 (ENG-71, ENG-74).
import type { Node } from "web-tree-sitter";
import { CONFIG, type SymbolDefinition } from "@/contracts";
import type { FunctionInfo, ParsedFile } from "./types";

// Trích xuất toán tử logic từ node
function getLogicalOperator(n: Node): string | null {
  if (n.type === "binary_expression") {
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child && (child.text === "&&" || child.text === "||")) {
        return child.text;
      }
    }
  } else if (n.type === "boolean_operator") {
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child && (child.text === "and" || child.text === "or")) {
        return child.text;
      }
    }
  }
  return null;
}

// Kiểm tra xem node có phải là else if không
function isElseIfNode(n: Node): boolean {
  if (n.type !== "if_statement") return false;
  const parent = n.parent;
  if (!parent) return false;
  if (parent.type === "else_clause") return true;
  if (parent.type === "if_statement") {
    const alt = parent.childForFieldName("alternative");
    if (alt && alt.id === n.id) return true;
  }
  return false;
}

// Tìm AST node tương ứng với định nghĩa hàm
function findFunctionNode(root: Node, fn: SymbolDefinition): Node | null {
  if (fn.name === "<module>") {
    return root;
  }

  let bestNode: Node | null = null;
  let minSpan = Infinity;

  function search(n: Node): void {
    const isFnType =
      n.type === "function_declaration" ||
      n.type === "function_expression" ||
      n.type === "arrow_function" ||
      n.type === "method_definition" ||
      n.type === "function_definition";

    if (isFnType) {
      const endLine = n.endPosition.row + 1;
      const startLine = n.startPosition.row + 1;
      // Khớp chính xác dòng kết thúc
      if (endLine === fn.line_end) {
        bestNode = n;
        return;
      }
      // Bao phủ dòng hàm
      if (startLine <= fn.line_start && endLine >= fn.line_end) {
        const span = endLine - startLine;
        if (span < minSpan) {
          minSpan = span;
          bestNode = n;
        }
      }
    }

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) search(child);
    }
  }

  search(root);
  return bestNode ?? root;
}

// Kiểm tra hàm có tự gọi chính mình không (đệ quy trực tiếp)
function checkDirectRecursion(fnNode: Node, fnName: string): boolean {
  if (!fnName || fnName === "<module>") return false;
  // fnName có thể là "Class.method" hoặc "method", lấy phần tên hàm
  const shortName = fnName.includes(".")
    ? fnName.split(".").pop()!
    : fnName;

  let found = false;
  function walk(n: Node): void {
    if (found) return;
    if (n.type === "call_expression" || n.type === "call") {
      const funcNode =
        n.childForFieldName("function") ?? n.child(0);
      if (funcNode) {
        if (
          funcNode.type === "identifier" &&
          funcNode.text === shortName
        ) {
          found = true;
          return;
        }
        if (
          (funcNode.type === "member_expression" ||
            funcNode.type === "attribute") &&
          funcNode.childForFieldName("property")?.text === shortName
        ) {
          found = true;
          return;
        }
      }
    }

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) walk(child);
    }
  }

  walk(fnNode);
  return found;
}

export function cognitiveComplexity(
  fn: SymbolDefinition,
  file: ParsedFile
): number {
  const targetNode = findFunctionNode(file.tree.rootNode, fn);
  if (!targetNode) return 0;

  let score = 0;

  // Đệ quy trực tiếp: tối đa +1 điểm cho cả hàm
  if (checkDirectRecursion(targetNode, fn.name)) {
    score += 1;
  }

  // Duyệt AST tính điểm Cognitive Complexity
  function walk(
    n: Node,
    nesting: number,
    isTopLevelModule: boolean
  ): void {
    // Nếu là <module>, bỏ qua định nghĩa hàm/lớp cấp cao
    if (isTopLevelModule && n !== targetNode) {
      if (
        n.type === "function_declaration" ||
        n.type === "class_declaration" ||
        n.type === "method_definition" ||
        n.type === "function_definition"
      ) {
        return;
      }
    }

    const type = n.type;

    // 1. Nhóm B1: if (không phải else if), switch/match, for/while, catch/except, ternary (+1 + nesting)
    if (
      (type === "if_statement" && !isElseIfNode(n)) ||
      type === "ternary_expression" ||
      type === "conditional_expression" ||
      type === "switch_statement" ||
      type === "match_statement" ||
      type === "for_statement" ||
      type === "for_in_statement" ||
      type === "for_of_statement" ||
      type === "while_statement" ||
      type === "do_statement" ||
      type === "catch_clause" ||
      type === "except_clause"
    ) {
      score += 1 + nesting;

      // Duyệt các con với mức lồng thích hợp
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (!child) continue;

        // Thân cấu trúc tăng nesting
        const isBodyChild =
          child.type === "statement_block" ||
          child.type === "block" ||
          child.type === "switch_body" ||
          child.type === "match_block" ||
          n.childForFieldName("consequence")?.id === child.id ||
          n.childForFieldName("body")?.id === child.id;

        // Nhánh alternative của if hoặc condition không tăng nesting trực tiếp tại đây
        const isAlt =
          n.childForFieldName("alternative")?.id === child.id;
        const isCond =
          n.childForFieldName("condition")?.id === child.id;

        let childNesting = nesting;
        if (isBodyChild) {
          childNesting = nesting + 1;
        } else if (isAlt || isCond) {
          childNesting = nesting;
        }

        walk(child, childNesting, false);
      }
      return;
    }

    // 2. Nhóm B2: else if / elif, else (+1, KHÔNG cộng mức lồng)
    if (isElseIfNode(n) || type === "elif_clause") {
      score += 1;

      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (!child) continue;

        const isBodyChild =
          child.type === "statement_block" ||
          child.type === "block" ||
          n.childForFieldName("consequence")?.id === child.id ||
          n.childForFieldName("body")?.id === child.id;

        const isAlt =
          n.childForFieldName("alternative")?.id === child.id;

        let childNesting = nesting;
        if (isBodyChild) {
          childNesting = nesting + 1;
        } else if (isAlt) {
          childNesting = nesting;
        }

        walk(child, childNesting, false);
      }
      return;
    }

    if (type === "else_clause") {
      // Nếu else_clause chứa if_statement thì nó là else if, không cộng điểm tại đây
      const hasIfChild = Array.from({ length: n.childCount }).some(
        (_, i) => n.child(i)?.type === "if_statement"
      );

      if (!hasIfChild) {
        score += 1; // +1 không cộng nesting
      }

      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (!child) continue;
        const isBody =
          child.type === "statement_block" ||
          child.type === "block" ||
          n.childForFieldName("body")?.id === child.id;
        walk(child, isBody ? nesting + 1 : nesting, false);
      }
      return;
    }

    // 3. Nhóm B3: Toán tử logic (&&, ||, and, or)
    const logOp = getLogicalOperator(n);
    if (logOp) {
      const parentLogOp = n.parent ? getLogicalOperator(n.parent) : null;
      if (parentLogOp !== logOp) {
        score += 1;
      }
    }

    // 4. Nhóm B4: goto, break/continue có nhãn
    if (type === "goto_statement") {
      score += 1;
    } else if (type === "break_statement" || type === "continue_statement") {
      // Kiểm tra có nhãn không
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (child && child.type === "identifier") {
          score += 1;
          break;
        }
      }
    }

    // 5. Hàm/lambda lồng: tăng nesting cho con bên trong
    const isNestedFunction =
      n !== targetNode &&
      (type === "arrow_function" ||
        type === "function_expression" ||
        type === "function_declaration" ||
        type === "lambda" ||
        type === "function_definition");

    const nextNesting = isNestedFunction ? nesting + 1 : nesting;

    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) {
        walk(child, nextNesting, false);
      }
    }
  }

  // Bắt đầu duyệt từ thân của targetNode nếu có, hoặc từ targetNode
  if (fn.name === "<module>") {
    walk(targetNode, 0, true);
  } else {
    const bodyNode =
      targetNode.childForFieldName("body") ?? targetNode;
    // Duyệt từ bodyNode (hoặc targetNode nếu là arrow expression)
    walk(bodyNode, 0, false);
  }

  return score;
}

const FUNCTION_NODE_TYPES = new Set([
  "function_declaration",
  "function_expression",
  "arrow_function",
  "method_definition",
  "function_definition",
]);

function hasJsx(n: Node): boolean {
  if (n.type.startsWith("jsx_")) return true;
  for (let i = 0; i < n.childCount; i++) {
    const child = n.child(i);
    if (child && hasJsx(child)) return true;
  }
  return false;
}

// Có câu `return` của chính hàm trả JSX. Bỏ qua hàm lồng (D-86).
function hasJsxReturn(n: Node): boolean {
  for (let i = 0; i < n.childCount; i++) {
    const child = n.child(i);
    if (!child || FUNCTION_NODE_TYPES.has(child.type)) continue;
    if (child.type === "return_statement" ? hasJsx(child) : hasJsxReturn(child)) return true;
  }
  return false;
}

/** Hàm trả JSX không là ứng viên node thuật toán (ENG-90, D-86). */
export function returnsJsx(fn: SymbolDefinition, file: ParsedFile): boolean {
  const root = file.tree.rootNode;
  const node = findFunctionNode(root, fn);
  if (!node || node.id === root.id) return false;
  const body = node.childForFieldName("body");
  if (!body) return false;
  return body.type === "statement_block" ? hasJsxReturn(body) : hasJsx(body);
}

export function pickVipFunctions(
  fns: FunctionInfo[],
  rank: Map<string, number>
): FunctionInfo[] {
  const sortFns = (a: FunctionInfo, b: FunctionInfo) => {
    if (b.complexity !== a.complexity) {
      return b.complexity - a.complexity;
    }
    const rankA = rank.get(a.file_path) ?? 0;
    const rankB = rank.get(b.file_path) ?? 0;
    if (rankB !== rankA) {
      return rankB - rankA;
    }
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  };

  // 1. VIP = complexity > CONFIG.VIP_COMPLEXITY_MIN
  const vips = fns.filter((fn) => fn.complexity > CONFIG.VIP_COMPLEXITY_MIN);
  if (vips.length > 0) {
    return vips.sort(sortFns);
  }

  // 2. Dự phòng ENG-74
  const fallbacks = fns
    .filter((fn) => fn.complexity >= CONFIG.VIP_FALLBACK_MIN_SCORE)
    .sort(sortFns);

  return fallbacks.slice(0, CONFIG.VIP_FALLBACK_TOP_K);
}
