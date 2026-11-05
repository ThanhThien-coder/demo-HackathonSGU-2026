// 11 Mục 8–9 — lát cắt xuyên file từ 1 entry (ENG-80..89) và node thuật toán (ENG-90, 91).
import { CONFIG } from "@/contracts/config";
import type { ArchitecturalLayer, ExecutionTraceStep, HybridArchitecturalNode, VirtualFileOrigin } from "@/contracts";
import type { CallGraph } from "./callgraph";
import { isDataSink, isOutput } from "./callgraph";
import type { FunctionInfo, ParsedFile, SymbolIndex, SyntaxNode } from "./model";
import { cmp, field, row1, rowEnd1, walk } from "./model";
import { adapterById } from "./registry";
import { originNoteFor } from "../ingest/special";
import { splitStem } from "../ingest/prune";

export interface EngineContext {
  idx: SymbolIndex;
  cg: CallGraph;
  techStack: string[];
  sourceMap: Map<string, VirtualFileOrigin>;
  fileRank: Map<string, number>;
  scope: string;
  sinkByFn: Map<string, boolean>;
  extByFn: Map<string, CallGraph["external"]>;
  sitesByFn: Map<string, CallGraph["sites"]>;
  throwsByFn: Map<string, boolean>;
}

export type CandidateKind = "SLICE" | "ALGO" | "VNODE";
export interface Candidate extends Pick<HybridArchitecturalNode,
  "id" | "node_type" | "entry_symbol" | "trace_steps" | "dto_snippet" | "cognitive_complexity" | "rank_score" | "title_source" | "title_evidence"> {
  kind: CandidateKind;
  order_key: string;
  functions: string[];
  binding: import("./model").RouteBinding | null;
  base_title: string;
  files: string[];
  languages: string[];
  /** hàm chung với lát cắt khác + đường gọi (cho ENG-112) */
  resolved_paths: Map<string, boolean>;
}

export function makeContext(idx: SymbolIndex, cg: CallGraph, techStack: string[], sourceMap: Map<string, VirtualFileOrigin>,
  fileRank: Map<string, number>, scope: string): EngineContext {
  const extByFn = new Map<string, CallGraph["external"]>();
  for (const e of cg.external) { const l = extByFn.get(e.caller) ?? []; l.push(e); extByFn.set(e.caller, l); }
  const sitesByFn = new Map<string, CallGraph["sites"]>();
  for (const s of cg.sites) { const l = sitesByFn.get(s.caller) ?? []; l.push(s); sitesByFn.set(s.caller, l); }
  const sinkByFn = new Map<string, boolean>();
  const throwsByFn = new Map<string, boolean>();
  for (const fn of idx.functions.values()) {
    sinkByFn.set(fn.key, (extByFn.get(fn.key) ?? []).some((e) => isDataSink(e, techStack)));
    let t = false;
    if (fn.body && !fn.is_module) walk(fn.body, (n) => { if (n.type === "throw_statement" || n.type === "raise_statement") t = true; });
    throwsByFn.set(fn.key, t);
  }
  return { idx, cg, techStack, sourceMap, fileRank, scope, sinkByFn, extByFn, sitesByFn, throwsByFn };
}

const pos = (n: SyntaxNode) => n.startPosition.row * 100000 + n.startPosition.column;

function subtreeHasSink(ctx: EngineContext, key: string, seen = new Set<string>()): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  if (ctx.sinkByFn.get(key)) return true;
  return (ctx.sitesByFn.get(key) ?? []).some((s) => subtreeHasSink(ctx, s.callee, seen));
}

const valueUsed = (call: SyntaxNode): boolean => {
  let p = call.parent;
  while (p && (p.type === "await_expression" || p.type === "parenthesized_expression")) p = p.parent;
  return !!p && p.type !== "expression_statement";
};

// ---------- cấu trúc câu lệnh ----------
interface Stmt {
  node: SyntaxNode;
  start: number; end: number;           // hàng 1-based
  parent: Stmt | null;
  children: Stmt[];
  headerEnd: number;                    // hàng cuối của phần header (tới khối lồng đầu tiên)
  compound: boolean;
  defs: Set<string>;
  uses: Set<string>;
}

const BLOCKS = new Set(["statement_block", "block", "switch_body", "class_body"]);
const NON_STMT = new Set(["comment", "decorator"]);

function collectStmts(body: SyntaxNode, isModule: boolean): Stmt[] {
  const all: Stmt[] = [];
  const DEF_TYPES = new Set(["function_declaration", "class_declaration", "abstract_class_declaration", "interface_declaration", "type_alias_declaration",
    "function_definition", "class_definition", "decorated_definition", "import_statement", "import_from_statement"]);
  const visitContainer = (container: SyntaxNode, parent: Stmt | null, out: Stmt[]) => {
    for (const c of container.namedChildren) {
      if (NON_STMT.has(c.type)) continue;
      if (isModule && parent === null && (DEF_TYPES.has(c.type) || c.type === "export_statement")) continue;
      const nested = nestedBlocks(c);
      const s: Stmt = {
        node: c, start: row1(c), end: rowEnd1(c), parent, children: [], compound: nested.length > 0,
        headerEnd: nested.length > 0 ? Math.max(row1(c), row1(nested[0])) : rowEnd1(c), defs: new Set(), uses: new Set(),
      };
      if (nested.length > 0 && row1(nested[0]) === row1(c)) s.headerEnd = row1(c);
      out.push(s);
      all.push(s);
      for (const b of nested) visitContainer(b, s, s.children);
    }
  };
  const first = BLOCKS.has(body.type) || body.type === "program" || body.type === "module" ? body : null;
  if (first) visitContainer(first, null, []);
  return all;
}

/** Các khối lồng trực tiếp của 1 câu lệnh (không đi vào thân hàm literal; thân 1 câu không ngoặc thuộc về câu lệnh cha). */
function nestedBlocks(n: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  const t = n.type;
  const pushField = (f: string) => { const x = field(n, f); if (x && BLOCKS.has(x.type)) out.push(x); };
  if (["if_statement", "for_statement", "for_in_statement", "while_statement", "do_statement", "with_statement", "labeled_statement"].includes(t)) {
    pushField("consequence"); pushField("body");
    for (const c of n.namedChildren) if (c.type === "elif_clause" || c.type === "else_clause") out.push(...nestedAlt(c));
  } else if (t === "try_statement") {
    pushField("body");
    for (const c of n.namedChildren) if (["catch_clause", "finally_clause", "except_clause", "else_clause"].includes(c.type)) out.push(...nestedAlt(c));
  } else if (t === "switch_statement" || t === "match_statement") {
    const b = field(n, "body"); if (b) out.push(b);
  } else if (t === "switch_case" || t === "switch_default" || t === "case_clause") {
    out.push(n);
  }
  return out;
}

function nestedAlt(alt: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (const c of alt.namedChildren) if (BLOCKS.has(c.type)) out.push(c);
  if (alt.namedChildren.some((c) => c.type === "if_statement")) out.push(alt); // else if (...) { … }
  return out;
}

const identTypes = new Set(["identifier", "shorthand_property_identifier"]);

function analyzeNames(s: Stmt, childNodeIds: Set<number>, isPy: boolean): void {
  const visit = (n: SyntaxNode, header: boolean) => {
    if (header && childNodeIds.has(n.id) && n !== s.node) return;
    if (identTypes.has(n.type)) {
      const p = n.parent;
      const isProp = p && ((p.type === "attribute" && field(p, "attribute")?.id === n.id) || (p.type === "keyword_argument" && field(p, "name")?.id === n.id));
      if (!isProp) s.uses.add(n.text);
    }
    if (n.type === "variable_declarator") { const nm = field(n, "name"); if (nm) walk(nm, (x) => { if (identTypes.has(x.type) || x.type === "shorthand_property_identifier_pattern") s.defs.add(x.text); }); }
    if (n.type === "assignment_expression" || n.type === "augmented_assignment_expression" || (isPy && (n.type === "assignment" || n.type === "augmented_assignment"))) {
      const l = field(n, "left");
      if (l) { let r = l; while (r.type === "member_expression" || r.type === "subscript_expression" || r.type === "attribute" || r.type === "subscript") r = field(r, "object") ?? r.namedChildren[0] ?? r; if (r.type === "identifier") s.defs.add(r.text); else walk(l, (x) => { if (x.type === "identifier") s.defs.add(x.text); }); }
    }
    if (n.type === "for_in_statement" || (isPy && n.type === "for_statement")) { const l = field(n, "left"); if (l) walk(l, (x) => { if (x.type === "identifier") s.defs.add(x.text); }); }
    if (n.type === "catch_clause") { const pm = field(n, "parameter"); if (pm) s.defs.add(pm.text); }
    if (n.type === "call_expression" || n.type === "call") { // v.push(...) định nghĩa/đổi v
      const fn = field(n, "function");
      if (fn && (fn.type === "member_expression" || fn.type === "attribute")) {
        const obj = field(fn, "object");
        const m = field(fn, "property") ?? field(fn, "attribute");
        if (obj?.type === "identifier" && m && /^(push|append|add|set|extend|unshift|insert|update)$/.test(m.text)) s.defs.add(obj.text);
      }
    }
    for (const c of n.namedChildren) visit(c, header);
  };
  visit(s.node, true);
}

const TERMINAL = /^(return_statement|throw_statement|raise_statement|continue_statement|break_statement)$/;
function isGuard(s: Stmt): boolean {
  if (s.node.type !== "if_statement") return false;
  const cons = field(s.node, "consequence");
  if (!cons) return false;
  const last = cons.namedChildren.filter((c) => c.type !== "comment").pop() ?? cons;
  if (TERMINAL.test(last.type) || TERMINAL.test(cons.type)) return true;
  return /\bsys\.exit\b|res\.status\(\s*[45]\d\d/.test(last.text);
}

// ---------- dựng snippet cho 1 hàm ----------
interface StepDraft {
  fn: FunctionInfo;
  hop: number;
  parent: string | null;
  layer: ArchitecturalLayer;
  protected_: boolean;
  seeds: Set<number>;            // node.id của các node hạt giống (call tới callee giữ, sink, output)
  maxLines: number;
  rows: number[];
  prefix_rows: number[];
  mark_row: number | null;
  criterion_row: number | null;
  stmts: Stmt[];
}

function regionOf(fn: FunctionInfo): { start: number; end: number; sigEnd: number; closeStart: number; exprBody: boolean } {
  const stmt = fn.stmt_node ?? fn.node;
  const start = fn.is_anon ? row1(stmt) : Math.min(fn.line_start, row1(stmt));
  const end = rowEnd1(stmt);
  const body = fn.body;
  if (!body) return { start, end, sigEnd: end, closeStart: end + 1, exprBody: true };
  const isBlock = BLOCKS.has(body.type);
  if (!isBlock) return { start, end, sigEnd: end, closeStart: end + 1, exprBody: true };
  const py = body.type === "block";
  const bStart = row1(body);
  const sigEnd = py ? Math.max(row1(fn.node), bStart === row1(fn.node) ? bStart : bStart - 1) : bStart;
  return { start, end, sigEnd, closeStart: py ? end + 1 : rowEnd1(body), exprBody: false };
}

function draftRows(ctx: EngineContext, f: ParsedFile, d: StepDraft, isPy: boolean): void {
  const fn = d.fn;
  const reg = regionOf(fn);
  const keep = new Set<number>();
  const range = (a: number, b: number) => { for (let r = a; r <= b; r++) keep.add(r); };
  range(reg.start, reg.sigEnd);
  if (reg.closeStart <= reg.end) range(reg.closeStart, reg.end);
  if (reg.exprBody || !fn.body) { range(reg.start, reg.end); d.rows = [...keep].sort((a, b) => a - b); return; }

  const stmts = fn.is_module ? collectStmts(fn.body, true) : collectStmts(fn.body, false);
  d.stmts = stmts;
  const childIds = new Set<number>();
  for (const s of stmts) for (const c of s.children) childIds.add(c.node.id);
  for (const s of stmts) analyzeNames(s, childIds, isPy);

  const inner = (n: SyntaxNode): Stmt | null => {
    let best: Stmt | null = null;
    for (const s of stmts) if (s.node.startIndex <= n.startIndex && s.node.endIndex >= n.endIndex) if (!best || (s.node.endIndex - s.node.startIndex) <= (best.node.endIndex - best.node.startIndex)) best = s;
    return best;
  };

  const kept = new Set<Stmt>();
  const compoundKept = new Set<Stmt>();
  const seedStmts: Stmt[] = [];
  walk(fn.body, (n) => {
    if (d.seeds.has(n.id)) { const s = inner(n); if (s) seedStmts.push(s); }
    if (/^(return_statement|throw_statement|raise_statement)$/.test(n.type) || n.type === "yield_expression" || n.type === "yield") {
      const s = inner(n); if (s) seedStmts.push(s);
    }
    // gắn thêm vào tham số (VD req.user = jwt.verify(...)): tác dụng phụ quan sát được ở bước sau
    if (n.type === "assignment_expression" || n.type === "assignment") {
      const l = field(n, "left");
      if (l && (l.type === "member_expression" || l.type === "attribute" || l.type === "subscript_expression")) {
        let r: SyntaxNode = l;
        while (r.type === "member_expression" || r.type === "attribute" || r.type === "subscript_expression") r = field(r, "object") ?? r;
        if (r.type === "identifier" && fn.params.includes(r.text)) { const s = inner(n); if (s) seedStmts.push(s); }
      }
    }
  });
  const markSeed = (s: Stmt) => { kept.add(s); };
  seedStmts.forEach(markSeed);

  // def-use lùi tới bất động
  const queue = [...kept];
  const keepHeader = (s: Stmt) => { if (s.compound) compoundKept.add(s); else if (!kept.has(s)) { kept.add(s); queue.push(s); } };
  const inLoop = (s: Stmt) => { for (let p: Stmt | null = s.parent; p; p = p.parent) if (/for|while|do_statement/.test(p.node.type)) return p; return null; };
  while (queue.length) {
    const k = queue.pop()!;
    for (const v of k.uses) {
      for (const s of stmts) {
        if (!s.defs.has(v) || s === k) continue;
        const loop = inLoop(k);
        if (s.start < k.start || (loop && s.start >= loop.start && s.end <= loop.end)) {
          if (s.compound) { if (!compoundKept.has(s)) { compoundKept.add(s); } }
          else if (!kept.has(s)) { kept.add(s); queue.push(s); }
        }
      }
    }
  }
  void keepHeader;

  // điều khiển: header + đóng của mọi câu lệnh ghép bao câu lệnh giữ; else/catch/finally
  const addHeader = (a: Stmt) => {
    range(a.start, a.headerEnd);
    if (!isPy) keep.add(a.end);
  };
  const addAncestors = (s: Stmt) => {
    for (let a: Stmt | null = s.parent; a; a = a.parent) {
      addHeader(a);
      // nhánh else / catch / finally / case chứa s
      for (const c of a.node.namedChildren) {
        if (["else_clause", "elif_clause", "catch_clause", "finally_clause", "except_clause", "switch_case", "switch_default", "case_clause"].includes(c.type)) {
          if (c.startIndex <= s.node.startIndex && c.endIndex >= s.node.endIndex) keep.add(row1(c));
        }
      }
      const alt = field(a.node, "alternative");
      if (alt && alt.startIndex <= s.node.startIndex && alt.endIndex >= s.node.endIndex) keep.add(row1(alt));
    }
  };
  for (const s of kept) { range(s.start, s.end); addAncestors(s); }
  for (const s of compoundKept) { addHeader(s); addAncestors(s); }
  // guard clause: `if` đứng trước câu lệnh giữ, thân kết thúc bằng return/throw/…
  for (const s of kept) {
    const siblings = s.parent ? s.parent.children : stmts.filter((x) => x.parent === null);
    for (let a: Stmt | null = s; a; a = a.parent) {
      const sib = a.parent ? a.parent.children : stmts.filter((x) => x.parent === null);
      for (const g of sib) if (g.end < a.start && isGuard(g)) range(g.start, g.end);
    }
    void siblings;
  }

  // biến module cùng file được dùng ⇒ giữ dòng khai báo (ngoài hàm)
  const mvars = ctx.idx.module_vars.get(fn.file);
  const used = new Set<string>();
  for (const s of kept) s.uses.forEach((u) => used.add(u));
  const prefix: number[] = [];
  if (mvars && !fn.is_module) for (const u of [...used].sort()) {
    const mv = mvars.get(u);
    if (mv && !ctx.idx.locals.get(fn.key)?.has(u) && (mv.line_end < reg.start || mv.line_start > reg.end)) {
      for (let r = mv.line_start; r <= mv.line_end; r++) prefix.push(r);
    }
  }
  d.prefix_rows = [...new Set(prefix)].sort((a, b) => a - b);

  // mốc cho Hard Clamp
  const firstSeed = seedStmts.sort((a, b) => a.start - b.start)[0];
  d.mark_row = d.criterion_row ?? (firstSeed ? firstSeed.start : null);
  void f;
  d.rows = [...keep].filter((r) => r >= reg.start && r <= reg.end).sort((a, b) => a - b);
}

function renderRows(f: ParsedFile, rows: number[], prefix: number[], commentPrefix: string): { snippet: string; map: number[] } {
  const all = [...new Set([...prefix, ...rows])].sort((a, b) => a - b);
  const lines: string[] = [];
  const map: number[] = [];
  let prev = 0;
  for (const r of all) {
    if (prev > 0 && r > prev + 1) {
      const omitted = [];
      for (let x = prev + 1; x < r; x++) if ((f.lines[x - 1] ?? "").trim() !== "") omitted.push(x);
      if (omitted.length > 0) {
        const indent = /^\s*/.exec(f.lines[omitted[0] - 1] ?? "")![0];
        lines.push(`${indent}${commentPrefix} … (${omitted.length} dòng)`);
        map.push(0);
      }
    }
    lines.push(f.lines[r - 1] ?? "");
    map.push(r);
    prev = r;
  }
  return { snippet: lines.join("\n"), map };
}

/** ENG-87 Hard Clamp: bước dài hơn maxLines ⇒ giữ chữ ký, dòng đóng, cửa sổ quanh mốc. */
function clampRows(d: StepDraft, f: ParsedFile, cp: string, maxLines: number): { snippet: string; map: number[]; rows: number[] } {
  const reg = regionOf(d.fn);
  let rows = d.rows;
  let r = renderRows(f, rows, d.prefix_rows, cp);
  if (r.map.length <= maxLines) return { ...r, rows };
  const sig = rows.filter((x) => x <= reg.sigEnd);
  const close = rows.filter((x) => x >= reg.closeStart);
  const body = rows.filter((x) => x > reg.sigEnd && x < reg.closeStart);
  let S = sig;
  let W = Math.min(CONFIG.CLAMP_WINDOW_LINES, maxLines - S.length - close.length - 2);
  if (W < 1) { S = sig.slice(0, 1); W = Math.max(1, Math.min(CONFIG.CLAMP_WINDOW_LINES, maxLines - 1 - close.length - 2)); }
  const mark = d.mark_row ?? body[Math.floor(body.length / 2)] ?? 0;
  let idx = body.findIndex((x) => x >= mark);
  if (idx < 0) idx = Math.max(0, body.length - 1);
  let a = Math.max(0, idx - Math.floor(W / 2));
  const b = Math.min(body.length, a + W);
  a = Math.max(0, b - W);
  rows = [...S, ...body.slice(a, b), ...close];
  r = renderRows(f, rows, [], cp);
  // phòng thủ: vẫn dài ⇒ cắt cửa sổ thêm
  while (r.map.length > maxLines && rows.length > S.length + close.length + 1) {
    const i = rows.length - close.length - 1;
    rows.splice(i, 1);
    r = renderRows(f, rows, [], cp);
  }
  return { ...r, rows };
}

const LAYER_ROLE = new Set(["repository", "repositories", "repo", "repos", "dao", "daos", "model", "models", "entity", "entities"]);
function isDataRoleFile(path: string): boolean {
  const segs = path.split("/");
  const base = segs[segs.length - 1];
  const stem = base.slice(0, base.lastIndexOf(".") > 0 ? base.lastIndexOf(".") : undefined);
  const toks = splitStem(stem);
  return segs.slice(0, -1).some((s) => LAYER_ROLE.has(s.toLowerCase())) || (toks.length > 0 && LAYER_ROLE.has(toks[toks.length - 1]));
}

export interface SliceResult {
  steps: ExecutionTraceStep[];
  functions: string[];
  dto_snippet: string;
  criterion_fn: string | null;
  resolved_chain: Map<string, boolean>;
}

/** Lát cắt cho 1 entry (D-06). `bindingMws` = middleware của route. */
export function buildSlice(entryKey: string, middlewares: string[], ctx: EngineContext): SliceResult | null {
  const { idx } = ctx;
  const entry = idx.functions.get(entryKey);
  if (!entry || !entry.body) return null;

  const order: StepDraft[] = [];
  const visited = new Set<string>();
  const parentOf = new Map<string, string | null>();
  const resolvedPath = new Map<string, boolean>();

  const callSitesOf = (key: string) => {
    const bySite = new Map<number, typeof ctx.cg.sites>();
    for (const s of ctx.sitesByFn.get(key) ?? []) { const l = bySite.get(s.node.id) ?? []; l.push(s); bySite.set(s.node.id, l); }
    const picked: Array<{ callee: string; node: SyntaxNode; confidence: "RESOLVED" | "INFERRED" }> = [];
    for (const [, list] of bySite) {
      const caller = idx.functions.get(key)!;
      const common = (p: string) => { let i = 0; while (i < p.length && i < caller.file.length && p[i] === caller.file[i]) i++; return i; };
      const best = [...list].sort((a, b) => common(idx.functions.get(b.callee)?.file ?? "") - common(idx.functions.get(a.callee)?.file ?? "") || cmp(a.callee, b.callee))[0];
      picked.push({ callee: best.callee, node: best.node, confidence: best.confidence });
    }
    return picked.sort((a, b) => pos(a.node) - pos(b.node) || cmp(a.callee, b.callee));
  };

  const add = (key: string, hop: number, parent: string | null, layer: ArchitecturalLayer, prot: boolean, chainResolved: boolean) => {
    const fn = idx.functions.get(key);
    if (!fn || visited.has(key)) return false;
    visited.add(key);
    parentOf.set(key, parent);
    resolvedPath.set(key, chainResolved);
    order.push({ fn, hop, parent, layer, protected_: prot, seeds: new Set(), maxLines: CONFIG.STEP_MAX_LINES, rows: [], prefix_rows: [], mark_row: null, criterion_row: null, stmts: [] });
    return true;
  };

  const dfs = (key: string, hop: number, chainResolved: boolean) => {
    if (hop >= CONFIG.SLICE_MAX_HOPS) return;
    for (const s of callSitesOf(key)) {
      if (visited.has(s.callee)) continue;
      const g = idx.functions.get(s.callee);
      if (!g || g.is_module || !g.body) continue;
      // ENG-81: lọc liên quan
      const keep = subtreeHasSink(ctx, s.callee) || valueUsed(s.node) || ctx.throwsByFn.get(s.callee);
      if (!keep) continue;
      const cr = chainResolved && s.confidence === "RESOLVED";
      add(s.callee, hop + 1, key, "BUSINESS_LOGIC", false, cr);
      dfs(s.callee, hop + 1, cr);
    }
  };

  add(entryKey, 0, null, "ENTRY_POINT", true, true);
  for (const m of middlewares) {
    if (add(m, 1, entryKey, "MIDDLEWARE", true, true)) dfs(m, 1, true);
  }
  dfs(entryKey, 0, true);

  // layer (ENG-82)
  const stepKeys = new Set(order.map((o) => o.fn.key));
  for (const d of order) {
    if (d.layer === "ENTRY_POINT" || d.layer === "MIDDLEWARE") continue;
    const callsOther = (ctx.sitesByFn.get(d.fn.key) ?? []).some((s) => stepKeys.has(s.callee) && idx.functions.get(s.callee)?.file !== d.fn.file);
    if (isDataRoleFile(d.fn.file)) d.layer = "DATA_ACCESS";
    else if (ctx.sinkByFn.get(d.fn.key) && !callsOther) d.layer = "DATA_ACCESS";
    else d.layer = "BUSINESS_LOGIC";
  }

  // hạt giống cho từng bước
  for (const d of order) {
    for (const s of ctx.sitesByFn.get(d.fn.key) ?? []) if (stepKeys.has(s.callee)) d.seeds.add(s.node.id);
    for (const e of ctx.extByFn.get(d.fn.key) ?? []) if (isDataSink(e, ctx.techStack) || isOutput(e)) d.seeds.add(e.node.id);
  }

  // criterion (mục 5): DATA_SINK đầu tiên theo (thứ tự bước, dòng) — không có ⇒ OUTPUT cuối của entry …
  let criterionFn: string | null = null;
  for (const d of order) {
    const sinks = (ctx.extByFn.get(d.fn.key) ?? []).filter((e) => isDataSink(e, ctx.techStack)).sort((a, b) => pos(a.node) - pos(b.node));
    if (sinks.length > 0) { d.criterion_row = row1(sinks[0].node); criterionFn = d.fn.key; break; }
  }
  if (!criterionFn) {
    const e0 = order[0];
    const outs = (ctx.extByFn.get(e0.fn.key) ?? []).filter((e) => isOutput(e)).sort((a, b) => pos(b.node) - pos(a.node));
    if (outs[0]) { e0.criterion_row = row1(outs[0].node); criterionFn = e0.fn.key; }
  }

  // render
  const renderAll = () => order.map((d) => {
    const f = idx.files.get(d.fn.file)!;
    const adapter = adapterById(f.language);
    const cp = adapter?.comment_prefix ?? "//";
    draftRows(ctx, f, d, f.is_py);
    const r = clampRows(d, f, cp, d.maxLines);
    d.rows = r.rows;
    return { d, f, r };
  });
  let rendered = renderAll();
  const totals = () => {
    const lines = rendered.reduce((a, x) => a + x.r.map.length, 0);
    const chars = rendered.reduce((a, x) => a + x.r.snippet.length, 0);
    return { lines, tokens: Math.ceil(chars / CONFIG.CHARS_PER_TOKEN) };
  };
  // protected: entry, middleware, hàm trên đường tới criterion
  if (criterionFn) for (let k: string | null = criterionFn; k; k = parentOf.get(k) ?? null) { const d = order.find((o) => o.fn.key === k); if (d) d.protected_ = true; }
  let guard = 0;
  while ((totals().lines > CONFIG.NODE_MAX_LINES || totals().tokens > CONFIG.NODE_MAX_CODE_TOKENS) && guard++ < 200) {
    const hasChild = (k: string) => order.some((o) => o.parent === k);
    const leaves = order.filter((o) => !o.protected_ && !hasChild(o.fn.key));
    if (leaves.length > 0) {
      leaves.sort((a, b) => b.hop - a.hop || order.indexOf(b) - order.indexOf(a));
      order.splice(order.indexOf(leaves[0]), 1);
      rendered = renderAll();
      continue;
    }
    const longest = [...order].sort((a, b) => b.rows.length - a.rows.length)[0];
    if (!longest || longest.maxLines <= 3) break;
    longest.maxLines = Math.max(3, longest.maxLines - 1);
    rendered = renderAll();
  }

  const steps: ExecutionTraceStep[] = rendered.map(({ d, f, r }, i) => {
    const nz = r.map.filter((x) => x > 0);
    const origin = ctx.sourceMap.get(d.fn.file);
    const step: ExecutionTraceStep = {
      step_number: i + 1, layer: d.layer, file_path: d.fn.file, function_name: d.fn.name,
      line_start: nz.length ? Math.min(...nz) : d.fn.line_start, line_end: nz.length ? Math.max(...nz) : d.fn.line_end,
      snippet: r.snippet, snippet_line_map: r.map,
    };
    if (origin) { const note = originNoteFor(origin, r.map); if (note) step.origin_note = note; }
    void f;
    return step;
  });

  return {
    steps,
    functions: order.map((o) => o.fn.key),
    dto_snippet: buildDto(ctx, order.map((o) => o.fn), steps),
    criterion_fn: criterionFn,
    resolved_chain: resolvedPath,
  };
}

// ---------- ENG-89: dto_snippet ----------
const DTO_SUFFIX = /(Dto|DTO|Request|Response|Input|Payload|Schema|Model|Entity)$/;
function buildDto(ctx: EngineContext, fns: FunctionInfo[], steps: ExecutionTraceStep[]): string {
  const { idx } = ctx;
  const text = steps.map((s) => s.snippet).join("\n");
  const stepClasses = new Set(fns.map((f) => f.class_key).filter(Boolean) as string[]);
  const names: string[] = [];
  for (const m of text.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) if (!names.includes(m[0])) names.push(m[0]);
  const defs: Array<{ file: string; a: number; b: number }> = [];
  for (const n of names) {
    for (const fn of fns) {
      const sameFile = `${fn.file}#${n}`;
      const imp = idx.imports.get(fn.file)?.get(n);
      const keys = [sameFile, ...(imp?.file ? [`${imp.file}#${imp.imported ?? n}`, `${imp.file}#${n}`] : [])];
      const sym = keys.map((k) => idx.symbols.get(k)).find(Boolean);
      if (!sym || stepClasses.has(sym.key)) continue;
      const ci = idx.classes.get(sym.key);
      const dataLike = sym.kind === "INTERFACE" || sym.kind === "TYPE" ||
        (sym.kind === "CLASS" && (DTO_SUFFIX.test(sym.name) || (ci && ci.fields.size > ci.methods.size) || /BaseModel/.test(ci?.extends_names.join(",") ?? "")));
      if (!dataLike) continue;
      if (!defs.some((d) => d.file === sym.file_path && d.a === sym.line_start)) defs.push({ file: sym.file_path, a: sym.line_start, b: sym.line_end });
      break;
    }
  }
  if (defs.length === 0) return "";
  const lines: string[] = [];
  for (const d of defs) {
    const src = idx.files.get(d.file)?.lines ?? [];
    for (let r = d.a; r <= d.b; r++) {
      if (lines.length >= CONFIG.STEP_MAX_LINES) { lines.push("// …"); return lines.join("\n"); }
      lines.push(src[r - 1] ?? "");
    }
  }
  return lines.join("\n");
}

// ---------- Node thuật toán (ENG-91) ----------
export function buildAlgoSteps(fnKey: string, ctx: EngineContext): { steps: ExecutionTraceStep[]; dto: string } | null {
  const fn = ctx.idx.functions.get(fnKey);
  if (!fn || !fn.body || fn.is_module) return null;
  const f = ctx.idx.files.get(fn.file)!;
  const cp = adapterById(f.language)?.comment_prefix ?? "//";
  const reg = regionOf(fn);
  const stmts = collectStmts(fn.body, false).filter((s) => s.parent === null);
  if (stmts.length === 0) return null;
  // câu chính = vòng lặp cấp 1 nhiều dòng nhất; thiếu ⇒ câu có điểm phức tạp lớn nhất
  const loops = stmts.filter((s) => /for|while|do_statement/.test(s.node.type));
  const main = (loops.length ? loops : stmts).slice().sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)[0];
  const mi = stmts.indexOf(main);
  const hasControl = loops.length > 0 || stmts.some((s) => s.compound);
  const parts: Array<{ layer: ArchitecturalLayer; rows: number[]; mark: number }> = [];
  const rowsOf = (list: Stmt[]) => list.flatMap((s) => Array.from({ length: s.end - s.start + 1 }, (_, i) => s.start + i));
  const sig = Array.from({ length: reg.sigEnd - reg.start + 1 }, (_, i) => reg.start + i);
  const clos = reg.closeStart <= reg.end ? Array.from({ length: reg.end - reg.closeStart + 1 }, (_, i) => reg.closeStart + i) : [];
  if (hasControl) {
    const pre = stmts.slice(0, mi), post = stmts.slice(mi + 1);
    if (pre.length || sig.length) parts.push({ layer: "ALGO_SETUP", rows: [...sig, ...rowsOf(pre)], mark: pre[0]?.start ?? main.start });
    parts.push({ layer: "ALGO_EXECUTION", rows: rowsOf([main]), mark: main.start });
    if (post.length || clos.length) parts.push({ layer: "ALGO_TERMINATION", rows: [...rowsOf(post), ...clos], mark: post[0]?.start ?? main.end });
  } else {
    parts.push({ layer: "ALGO_SETUP", rows: [...sig, ...rowsOf(stmts.slice(0, -1))], mark: stmts[0].start });
    parts.push({ layer: "ALGO_TERMINATION", rows: [...rowsOf(stmts.slice(-1)), ...clos], mark: stmts[stmts.length - 1].start });
  }
  const steps: ExecutionTraceStep[] = [];
  for (const p of parts) {
    const rows = [...new Set(p.rows)].sort((a, b) => a - b);
    if (rows.length === 0) continue;
    const d: StepDraft = { fn, hop: 0, parent: null, layer: p.layer, protected_: true, seeds: new Set(), maxLines: CONFIG.STEP_MAX_LINES, rows, prefix_rows: [], mark_row: p.mark, criterion_row: null, stmts: [] };
    const r = clampRows(d, f, cp, CONFIG.STEP_MAX_LINES);
    const nz = r.map.filter((x) => x > 0);
    steps.push({
      step_number: steps.length + 1, layer: p.layer, file_path: fn.file, function_name: fn.name,
      line_start: Math.min(...nz), line_end: Math.max(...nz), snippet: r.snippet, snippet_line_map: r.map,
      ...(ctx.sourceMap.get(fn.file) ? { origin_note: originNoteFor(ctx.sourceMap.get(fn.file)!, r.map) } : {}),
    });
  }
  // trần node
  let guard = 0;
  while (guard++ < 50 && steps.reduce((a, s) => a + s.snippet_line_map.length, 0) > CONFIG.NODE_MAX_LINES) {
    const i = steps.reduce((bi, s, k) => (s.snippet_line_map.length > steps[bi].snippet_line_map.length ? k : bi), 0);
    const s = steps[i];
    const body = s.snippet.split("\n");
    const cut = Math.max(3, Math.floor(body.length * 0.8));
    s.snippet = body.slice(0, cut).join("\n");
    s.snippet_line_map = s.snippet_line_map.slice(0, cut);
  }
  return { steps, dto: buildDto(ctx, [fn], steps) };
}

export { rowEnd1 };
