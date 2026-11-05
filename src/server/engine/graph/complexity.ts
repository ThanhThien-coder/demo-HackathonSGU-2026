// 11 Mục 7 — Cognitive Complexity (SonarQube) theo loại node AST, không đếm ngoặc. ENG-71.
import type { SyntaxNode } from "./model";
import { field } from "./model";

const TS_FUNC = new Set(["function_declaration", "function_expression", "function", "arrow_function", "generator_function_declaration",
  "generator_function", "method_definition"]);
const PY_FUNC = new Set(["function_definition", "lambda"]);
const TS_LOOPS = new Set(["for_statement", "for_in_statement", "while_statement", "do_statement"]);
const PY_LOOPS = new Set(["for_statement", "while_statement"]);
const LOGICAL = new Set(["&&", "||", "??", "and", "or"]);

/** Điểm cho 1 thân hàm / cho câu lệnh cấp cao của <module> (caller loại trừ định nghĩa). */
export function cognitiveComplexity(root: SyntaxNode, isPy: boolean, selfName?: string): number {
  let score = 0;
  const funcTypes = isPy ? PY_FUNC : TS_FUNC;
  const loops = isPy ? PY_LOOPS : TS_LOOPS;
  let selfRecursion = false;

  const logicalRuns = (n: SyntaxNode): { runs: number; leaves: SyntaxNode[] } => {
    // đếm đoạn toán tử logic cùng loại liền nhau trong 1 chuỗi; trả các toán hạng lá để duyệt tiếp
    const ops: string[] = [];
    const leaves: SyntaxNode[] = [];
    const collect = (x: SyntaxNode) => {
      if (x.type === "binary_expression" || x.type === "boolean_operator") {
        const op = field(x, "operator")?.text ?? x.children.find((c) => !c.isNamed && LOGICAL.has(c.type))?.type;
        if (op && LOGICAL.has(op)) {
          const l = field(x, "left"), r = field(x, "right");
          if (l) collect(l);
          ops.push(op);
          if (r) collect(r);
          return;
        }
      }
      leaves.push(x);
    };
    collect(n);
    let runs = 0, prev = "";
    for (const o of ops) { if (o !== prev) runs++; prev = o; }
    return { runs, leaves };
  };

  const visit = (n: SyntaxNode, nest: number, isElseIf = false): void => {
    const t = n.type;
    if (t === "if_statement") {
      score += isElseIf ? 1 : 1 + nest;
      const cond = field(n, "condition");
      if (cond) visit(cond, nest);
      const cons = field(n, "consequence");
      if (cons) visit(cons, nest + 1);
      if (isPy) {
        for (const c of n.children) {
          if (c.type === "elif_clause") {
            score += 1;
            const cc = field(c, "condition"); if (cc) visit(cc, nest);
            const cb = field(c, "consequence"); if (cb) visit(cb, nest + 1);
          } else if (c.type === "else_clause") {
            score += 1;
            const b = field(c, "body"); if (b) visit(b, nest + 1);
          }
        }
      } else {
        const alt = field(n, "alternative");
        if (alt) {
          const inner = alt.namedChildren[0];
          if (inner && inner.type === "if_statement") visit(inner, nest, true);
          else { score += 1; if (inner) visit(inner, nest + 1); }
        }
      }
      return;
    }
    if (loops.has(t) || t === "switch_statement" || t === "match_statement" || t === "catch_clause" || t === "except_clause"
      || t === "ternary_expression" || t === "conditional_expression") {
      score += 1 + nest;
      for (const c of n.namedChildren) visit(c, nest + 1);
      return;
    }
    if (t === "binary_expression" || t === "boolean_operator") {
      const { runs, leaves } = logicalRuns(n);
      if (runs > 0) {
        score += runs;
        for (const l of leaves) visit(l, nest);
        return;
      }
    }
    if (funcTypes.has(t)) { // hàm / lambda lồng
      for (const c of n.namedChildren) visit(c, nest + 1);
      return;
    }
    if ((t === "break_statement" || t === "continue_statement") && n.namedChildren.length > 0 && !isPy) score += 1;
    if (selfName && (t === "call_expression" || t === "call")) {
      const f = field(n, "function");
      if (f && f.type === "identifier" && f.text === selfName) selfRecursion = true;
    }
    for (const c of n.namedChildren) visit(c, nest);
  };

  visit(root, 0);
  return score + (selfRecursion ? 1 : 0);
}
