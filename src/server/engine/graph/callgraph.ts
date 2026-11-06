// 11 Mục 3–4 — đồ thị gọi hàm (RESOLVED / INFERRED), call site ngoài, route đăng ký, entry (ENG-30..35, ENG-40..).
import type { FunctionCallEdge } from "@/contracts";
import type {
  CallSite, EntryPoint, ExternalCall, FunctionInfo, ImportBinding, RouteBinding, SymbolIndex, SyntaxNode,
} from "./model";
import { cmp, field, row1, rowEnd1, stripQuotes, walk } from "./model";
import { register, resolveClassName, resolveExported } from "./symbols";
import { hasRoleName } from "../ingest/prune";

export interface CallGraph {
  edges: FunctionCallEdge[];
  sites: CallSite[];
  external: ExternalCall[];
  bindings: RouteBinding[];
  entries: EntryPoint[];
  file_graph: Map<string, Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>>;
}

const VERBS = new Set(["get", "post", "put", "patch", "delete", "all", "options", "head"]);
const ROUTER_FACTORIES = new Set(["express", "Router", "fastify", "Koa", "Hono", "express.Router"]);
const ROUTER_NAMES = /^(app|router|server|fastify|api|route|routes)$|Router$/;

// ---------- DATA_SINK / OUTPUT (ENG-81 mục 4) ----------
const SINK_METHOD = /^(save|insert\w*|update\w*|delete\w*|remove|find\w*|create|upsert|query|execute|exec|aggregate|count|get|add|commit)$/;
const SINK_RECEIVER = /(repository|repo|model|dao|entity|db|database|prisma|knex|pool|conn|connection|client|session|cursor|collection|datasource|manager|tx|trx|jdbcTemplate)$/i;
const SINK_IMPORTS = new Set(["pg", "mysql", "mysql2", "mongodb", "mongoose", "sequelize", "typeorm", "@prisma/client", "sqlite3", "better-sqlite3",
  "redis", "ioredis", "knex", "sqlalchemy", "psycopg2", "pymongo", "database/sql", "gorm.io/gorm"]);

export function isDataSink(e: { receiver_chain: string[]; method: string; import_source: string | null }, techStack: string[]): boolean {
  const chain = e.receiver_chain.filter((c) => c !== "this" && c !== "self");
  if (SINK_METHOD.test(e.method) && chain.length > 0) {
    if (SINK_RECEIVER.test(chain[chain.length - 1]) || chain.some((c) => ["prisma", "tx", "trx"].includes(c))) return true;
  }
  if (e.import_source && SINK_IMPORTS.has(e.import_source) && chain.length > 0) return true;
  const orm = techStack.some((t) => ["mongoose", "sequelize", "typeorm"].includes(t));
  if (orm && chain.length === 1 && /^[A-Z]/.test(chain[0]) && SINK_METHOD.test(e.method)) return true;
  return false;
}

const OUT_METHODS = new Set(["json", "send", "status", "render", "redirect", "end", "sendStatus"]);
export function isOutput(e: { receiver_chain: string[]; method: string }): boolean {
  const last = e.receiver_chain[e.receiver_chain.length - 1];
  if (!last) return /^(print|jsonify|Response|HttpResponse)$/.test(e.method) || e.method === "next";
  if (last === "res" || last === "reply" || last === "response") return OUT_METHODS.has(e.method);
  if (last === "console" || last === "logger" || last === "logging") return false;
  if (e.method === "fetch" || last === "axios") return true;
  return false;
}

// ---------- helpers ----------
interface CalleeShape { bare: string | null; chain: string[]; method: string; unknownReceiver: boolean }

function chainOfTs(n: SyntaxNode | null): { chain: string[]; unknown: boolean } {
  if (!n) return { chain: [], unknown: true };
  if (n.type === "identifier") return { chain: [n.text], unknown: false };
  if (n.type === "this") return { chain: ["this"], unknown: false };
  if (n.type === "member_expression" || n.type === "attribute") {
    const prop = field(n, "property") ?? field(n, "attribute");
    const inner = chainOfTs(field(n, "object"));
    return { chain: [...inner.chain, prop?.text ?? ""], unknown: inner.unknown };
  }
  if (n.type === "parenthesized_expression" || n.type === "await_expression" || n.type === "non_null_expression" || n.type === "as_expression") {
    return chainOfTs(n.namedChildren[0] ?? null);
  }
  return { chain: [], unknown: true };
}

function calleeShape(call: SyntaxNode): CalleeShape | null {
  const fn = field(call, "function") ?? field(call, "constructor");
  if (!fn) return null;
  if (fn.type === "identifier") return { bare: fn.text, chain: [], method: fn.text, unknownReceiver: false };
  if (fn.type === "member_expression" || fn.type === "attribute") {
    const prop = field(fn, "property") ?? field(fn, "attribute");
    const inner = chainOfTs(field(fn, "object"));
    return { bare: null, chain: inner.chain, method: prop?.text ?? "", unknownReceiver: inner.unknown };
  }
  return null;
}

const isCallNode = (n: SyntaxNode) => n.type === "call_expression" || n.type === "call";

function findMethod(idx: SymbolIndex, classKey: string, name: string, seen = new Set<string>()): { cls: string; fn: string } | null {
  if (seen.has(classKey)) return null;
  seen.add(classKey);
  const ci = idx.classes.get(classKey);
  if (!ci) return null;
  const m = ci.methods.get(name);
  if (m) return { cls: classKey, fn: m };
  for (const p of ci.extends_names) for (const pk of resolveClassName(idx, ci.file, p)) { const r = findMethod(idx, pk, name, seen); if (r) return r; }
  return null;
}

function fieldType(idx: SymbolIndex, classKey: string, name: string, seen = new Set<string>()): string | null {
  if (seen.has(classKey)) return null;
  seen.add(classKey);
  const ci = idx.classes.get(classKey);
  if (!ci) return null;
  const t = ci.fields.get(name);
  if (t) return t;
  for (const p of ci.extends_names) for (const pk of resolveClassName(idx, ci.file, p)) { const r = fieldType(idx, pk, name, seen); if (r) return r; }
  return null;
}

interface Target { key: string; confidence: "RESOLVED" | "INFERRED"; ambiguous: boolean }

/** ENG-32: method của INTERFACE/abstract ⇒ implementor. */
function viaImpl(idx: SymbolIndex, hit: { cls: string; fn: string } | null, method: string): Target[] | null {
  if (!hit) return null;
  const ci = idx.classes.get(hit.cls)!;
  if (ci.kind === "INTERFACE" || (ci.kind === "ABSTRACT" && !idx.functions.has(hit.fn))) {
    const impls = (idx.implMap.get(hit.cls) ?? []).map((k) => findMethod(idx, k, method)).filter((x): x is { cls: string; fn: string } => !!x && idx.functions.has(x.fn));
    if (impls.length === 0) return idx.functions.has(hit.fn) ? [{ key: hit.fn, confidence: "RESOLVED", ambiguous: false }] : null;
    return impls.map((i) => ({ key: i.fn, confidence: "RESOLVED" as const, ambiguous: impls.length > 1 }));
  }
  return idx.functions.has(hit.fn) ? [{ key: hit.fn, confidence: "RESOLVED", ambiguous: false }] : null;
}

function resolveBinding(idx: SymbolIndex, file: string, b: ImportBinding, name: string): string | null {
  if (!b.file) return null;
  if (b.kind === "named") return resolveExported(idx, b.file, b.imported ?? name, 0);
  if (b.kind === "default") return resolveExported(idx, b.file, "default", 0) ?? resolveExported(idx, b.file, name, 0);
  void file;
  return null;
}

function resolveTypeToMethod(idx: SymbolIndex, fromFile: string, tname: string, method: string): Target[] | null {
  const keys = resolveClassName(idx, fromFile, tname);
  const out: Target[] = [];
  for (const ck of keys) {
    const t = viaImpl(idx, findMethod(idx, ck, method), method);
    if (t) out.push(...t);
  }
  if (out.length === 0) return null;
  const amb = out.length > 1;
  return out.map((t) => ({ ...t, ambiguous: t.ambiguous || amb }));
}

/** ENG-31: phân giải 1 call site. null ⇒ ExternalCall. */
function resolveCall(idx: SymbolIndex, caller: FunctionInfo, shape: CalleeShape): { targets: Target[]; importSource: string | null } {
  const file = caller.file;
  const imports = idx.imports.get(file) ?? new Map<string, ImportBinding>();
  const locals = idx.locals.get(caller.key) ?? new Set<string>();
  const res = (targets: Target[], importSource: string | null = null) => ({ targets, importSource });

  if (shape.bare !== null) {
    const name = shape.bare;
    const sameFile = `${file}#${name}`;
    if (!locals.has(name) || idx.functions.get(sameFile)?.kind === "FUNCTION") {
      const fi = idx.functions.get(sameFile);
      if (fi && !fi.is_module) return res([{ key: sameFile, confidence: "RESOLVED", ambiguous: false }]);
    }
    const b = imports.get(name);
    if (b) {
      const k = resolveBinding(idx, file, b, name);
      if (k && idx.functions.has(k)) return res([{ key: k, confidence: "RESOLVED", ambiguous: false }]);
      return res([], b.file ? null : b.source);
    }
    return res([]);
  }

  const chain = shape.chain;
  const root = chain[0];
  const method = shape.method;
  if (!root || shape.unknownReceiver) return fallback(idx, caller, shape, null);

  // this/self
  if ((root === "this" || root === "self") && caller.class_key) {
    if (chain.length === 1) {
      const t = viaImpl(idx, findMethod(idx, caller.class_key, method), method);
      if (t) return res(t);
    } else if (chain.length === 2) {
      const ty = fieldType(idx, caller.class_key, chain[1]);
      if (ty) { const t = resolveTypeToMethod(idx, file, ty, method); if (t) return res(t); }
    }
    return fallback(idx, caller, shape, null);
  }

  if (chain.length === 1) {
    // tham số có kiểu
    const pty = idx.paramTypes.get(caller.key)?.get(root);
    if (pty) { const t = resolveTypeToMethod(idx, file, pty, method); if (t) return res(t); }
    // biến module có kiểu (new T())
    const vt = idx.varTypes.get(file)?.get(root);
    if (vt && !locals.has(root)) { const t = resolveTypeToMethod(idx, file, vt, method); if (t) return res(t); }
    const b = imports.get(root);
    if (b) {
      if (b.file) {
        if (b.kind === "namespace" || b.kind === "module") {
          const k = resolveExported(idx, b.file, method, 0);
          if (k && idx.functions.has(k)) return res([{ key: k, confidence: "RESOLVED", ambiguous: false }]);
        } else {
          const sym = resolveBinding(idx, file, b, root);
          if (sym) {
            if (idx.classes.has(sym)) { const t = viaImpl(idx, findMethod(idx, sym, method), method); if (t) return res(t); }
            // biến import có kiểu
            const symFile = sym.slice(0, sym.indexOf("#"));
            const vname = sym.slice(sym.indexOf("#") + 1);
            const ty = idx.varTypes.get(symFile)?.get(vname);
            if (ty) { const t = resolveTypeToMethod(idx, symFile, ty, method); if (t) return res(t); }
          }
        }
        return fallback(idx, caller, shape, null, b);
      }
      return res([], b.source); // gói ngoài
    }
    // lớp cùng file: C.m()
    if (idx.classes.has(`${file}#${root}`)) {
      const t = viaImpl(idx, findMethod(idx, `${file}#${root}`, method), method);
      if (t) return res(t);
    }
    if (locals.has(root)) return fallback(idx, caller, shape, null);
    return fallback(idx, caller, shape, null);
  }
  const b = imports.get(root);
  return fallback(idx, caller, shape, b?.file ? null : (b?.source ?? null), b);
}

// chỉ mục method theo tên ngắn, dựng 1 lần cho mỗi SymbolIndex (tránh quét mọi hàm ở từng call site không rõ kiểu)
const methodIndex = new WeakMap<SymbolIndex, Map<string, string[]>>();
function methodsNamed(idx: SymbolIndex, method: string): string[] {
  let m = methodIndex.get(idx);
  if (!m) {
    m = new Map();
    for (const [k, fi] of idx.functions) {
      if (fi.kind !== "METHOD" || fi.is_module || fi.is_anon) continue;
      const short = fi.name.slice(fi.name.lastIndexOf(".") + 1);
      const l = m.get(short);
      if (l) l.push(k); else m.set(short, [k]);
    }
    methodIndex.set(idx, m);
  }
  return m.get(method) ?? [];
}

/** (6): receiver không rõ kiểu ⇒ mọi ứng viên cùng tên method trong file import / cùng file — INFERRED. */
function fallback(idx: SymbolIndex, caller: FunctionInfo, shape: CalleeShape, importSource: string | null, binding?: ImportBinding): { targets: Target[]; importSource: string | null } {
  const method = shape.method;
  if (!method) return { targets: [], importSource };
  if (binding && !binding.file) return { targets: [], importSource: binding.source };
  const files = new Set<string>([caller.file]);
  for (const b of idx.imports.get(caller.file)?.values() ?? []) if (b.file) files.add(b.file);
  if (binding?.file) { files.clear(); files.add(binding.file); }
  const cands: string[] = [];
  for (const k of methodsNamed(idx, method)) {
    const fi = idx.functions.get(k)!;
    if (!files.has(fi.file) || k === caller.key) continue;
    cands.push(k);
  }
  cands.sort(cmp);
  // chỉ nhận khi root là tên cục bộ/tham số không rõ kiểu hoặc không phải gói ngoài
  if (cands.length === 0) return { targets: [], importSource };
  const root = shape.chain[0];
  if (root && !(idx.locals.get(caller.key)?.has(root)) && !binding && !idx.varTypes.get(caller.file)?.has(root) && root !== "this" && root !== "self") {
    return { targets: [], importSource };
  }
  return { targets: cands.map((k) => ({ key: k, confidence: "INFERRED" as const, ambiguous: cands.length > 1 })), importSource };
}

// ---------- routes ----------
function enclosingStatement(n: SyntaxNode): SyntaxNode {
  let cur = n;
  while (cur.parent && cur.parent.type !== "program" && cur.parent.type !== "statement_block" && cur.parent.type !== "module" && cur.parent.type !== "block") cur = cur.parent;
  return cur;
}

const isFuncLiteral = (n: SyntaxNode) => ["arrow_function", "function_expression", "function"].includes(n.type);

function staticString(n: SyntaxNode | undefined | null): string | null {
  if (!n) return null;
  if (n.type === "string" || n.type === "template_string") {
    if (n.type === "template_string" && n.descendantsOfType("template_substitution").length > 0) return null;
    return stripQuotes(n.text);
  }
  return null;
}

function routerVarsOf(f: SyntaxNode): Set<string> {
  const vars = new Set<string>();
  walk(f, (n) => {
    if (n.type === "variable_declarator") {
      const name = field(n, "name"), v = field(n, "value");
      if (name?.type === "identifier" && v) {
        const callee = v.type === "new_expression" ? field(v, "constructor") : v.type === "call_expression" ? field(v, "function") : null;
        if (callee && ROUTER_FACTORIES.has(callee.text)) vars.add(name.text);
      }
    }
  });
  return vars;
}

export function findRoutes(idx: SymbolIndex): RouteBinding[] {
  const bindings: RouteBinding[] = [];
  const filePrefix = new Map<string, string>();      // file đích ⇒ tiền tố mount
  const varPrefix = new Map<string, string>();       // `${file}|${var}` ⇒ tiền tố
  const files = [...idx.files.values()].sort((a, b) => cmp(a.path, b.path));

  // --- 1. mount (app.use('/p', router)) ---
  for (const f of files) {
    if (f.is_py) continue;
    walk(f.tree.rootNode, (n) => {
      if (n.type !== "call_expression") return;
      const fn = field(n, "function");
      if (fn?.type !== "member_expression" || field(fn, "property")?.text !== "use") return;
      const args = field(n, "arguments")?.namedChildren ?? [];
      const prefix = staticString(args[0]);
      const target = args[1];
      if (prefix === null || !target) return;
      const mount = (p: string) => (p === "/" ? "" : p.replace(/\/$/, ""));
      let tFile: string | null = null;
      if (target.type === "identifier") {
        const b = idx.imports.get(f.path)?.get(target.text);
        if (b?.file) tFile = b.file; else varPrefix.set(`${f.path}|${target.text}`, mount(prefix));
      } else if (target.type === "call_expression" && field(target, "function")?.text === "require") {
        const src = stripQuotes(field(target, "arguments")?.namedChildren[0]?.text ?? "");
        const b = [...(idx.imports.get(f.path)?.values() ?? [])].find((x) => x.source === src);
        tFile = b?.file ?? null;
      }
      if (tFile) filePrefix.set(tFile, mount(prefix));
    });
  }

  const resolveHandler = (n: SyntaxNode, f: { path: string }, ctx: FunctionInfo, anonName: string, stmt: SyntaxNode): string | null => {
    if (isFuncLiteral(n)) {
      const key = `${f.path}#${anonName}`;
      const info = register(idx, {
        key, file: f.path, name: anonName, class_key: null, kind: "FUNCTION", node: n, body: field(n, "body"),
        line_start: row1(stmt), line_end: rowEnd1(stmt), params: [], complexity: 0, is_exported: false, is_module: false, is_anon: true, stmt_node: stmt,
      }, false, field(n, "parameters"));
      idx.functions.get(info.key)!.complexity = 0;
      return info.key;
    }
    if (n.type === "identifier") {
      const same = `${f.path}#${n.text}`;
      if (idx.functions.has(same)) return same;
      const b = idx.imports.get(f.path)?.get(n.text);
      if (b) { const k = resolveBinding(idx, f.path, b, n.text); if (k && idx.functions.has(k)) return k; }
      return null;
    }
    if (n.type === "member_expression") {
      const shape = calleeShape({ childForFieldName: (x: string) => (x === "function" ? n : null) } as unknown as SyntaxNode);
      if (shape) { const r = resolveCall(idx, ctx, shape); if (r.targets[0]) return r.targets[0].key; }
      return null;
    }
    if (n.type === "call_expression") { // wrapper asyncHandler(fn) hoặc factory validate(schema)
      const args = field(n, "arguments")?.namedChildren ?? [];
      for (const a of args) if (isFuncLiteral(a) || a.type === "identifier" || a.type === "member_expression") { const r = resolveHandler(a, f, ctx, anonName, stmt); if (r) return r; }
      const callee = field(n, "function");
      if (callee?.type === "identifier") return resolveHandler(callee, f, ctx, anonName, stmt);
    }
    return null;
  };

  const handlerLike = (n: SyntaxNode) => isFuncLiteral(n) || n.type === "identifier" || n.type === "member_expression" || n.type === "call_expression";

  // --- 2. Express / Koa / Fastify, Next.js ---
  for (const f of files) {
    if (f.is_py) continue;
    const root = f.tree.rootNode;
    const rvars = routerVarsOf(root);
    const modFn = idx.functions.get(`${f.path}#<module>`)!;
    const routerish = (chain: string[], params: Set<string>) => {
      const r = chain[0];
      if (!r) return false;
      if (rvars.has(r)) return true;
      return ROUTER_NAMES.test(chain[chain.length - 1] ?? "") || ROUTER_NAMES.test(r) || (params.has(r) && ROUTER_NAMES.test(r));
    };
    walk(root, (n) => {
      if (n.type !== "call_expression") return;
      const fnNode = field(n, "function");
      if (fnNode?.type !== "member_expression") return;
      const verb = field(fnNode, "property")?.text ?? "";
      const args = field(n, "arguments")?.namedChildren ?? [];
      let recvChain: string[] = [];
      let path: string | null = null;
      let handlers: SyntaxNode[] = [];
      const method = verb.toUpperCase();
      const recvNode = field(fnNode, "object");
      if (VERBS.has(verb) && recvNode) {
        if (recvNode.type === "call_expression" && field(recvNode, "function")?.type === "member_expression" && field(field(recvNode, "function")!, "property")?.text === "route") {
          // R.route(path).verb(...fns)
          const rr = field(recvNode, "function")!;
          recvChain = chainOfTs(field(rr, "object")).chain;
          path = staticString(field(recvNode, "arguments")?.namedChildren[0]);
          handlers = args;
        } else {
          recvChain = chainOfTs(recvNode).chain;
          path = staticString(args[0]);
          handlers = args.slice(1);
          if (path === null) return;
        }
      } else return;
      if (handlers.length === 0 || !handlers.every(handlerLike)) return;
      const encl = enclosingFunctionOf(idx, n, modFn);
      const params = new Set(encl.params);
      if (!routerish(recvChain, params)) return;
      if (handlers[handlers.length - 1].type === "call_expression" && !isFuncLiteral(handlers[handlers.length - 1])) {
        // lời gọi bọc: chấp nhận khi tìm được hàm bên trong
      }
      const stmt = enclosingStatement(n);
      const prefix = (varPrefix.get(`${f.path}|${recvChain[0]}`) ?? "") + (filePrefix.get(f.path) ?? "");
      const full = `${prefix}${path ?? ""}` || "/";
      const anonName = path !== null ? `<${method} ${full}>` : `<anon@L${row1(n)}>`;
      const hKey = resolveHandler(handlers[handlers.length - 1], f, encl, anonName, stmt);
      if (!hKey) return;
      const mws: string[] = [];
      for (const m of handlers.slice(0, -1)) { const k = resolveHandler(m, f, encl, `<anon@L${row1(m)}>`, stmt); if (k) mws.push(k); }
      bindings.push({
        file_path: f.path, line_start: row1(stmt), line_end: rowEnd1(stmt), kind: "HTTP", method, path: path === null ? null : full,
        handler: hKey, middlewares: mws, display_name: `${recvChain.join(".")}.${verb}('${path ?? ""}')`,
      });
    });

    // Next.js route handlers
    const rm = /(?:^|\/)app\/(.*)route\.(?:ts|js)$/.exec(f.path);
    if (rm) {
      const segs = rm[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s));
      const p = `/${segs.join("/")}`;
      for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
        const k = `${f.path}#${m}`;
        const fi = idx.functions.get(k);
        if (fi) bindings.push({ file_path: f.path, line_start: fi.line_start, line_end: fi.line_end, kind: "HTTP", method: m, path: p, handler: k, middlewares: [], display_name: `${m} ${p}` });
      }
    }
    const pm = /(?:^|\/)pages\/api\/(.*)\.(?:ts|js)$/.exec(f.path);
    if (pm) {
      const def = [...idx.functions.values()].find((x) => x.file === f.path && !x.is_module && x.is_exported);
      if (def) bindings.push({ file_path: f.path, line_start: def.line_start, line_end: def.line_end, kind: "HTTP", method: null, path: `/api/${pm[1].replace(/\/index$/, "")}`, handler: def.key, middlewares: [], display_name: `/api/${pm[1]}` });
    }
  }

  // --- 3. NestJS ---
  const nestMw: Record<string, [string, string]> = { UseGuards: ["canActivate", "guard"], UseInterceptors: ["intercept", "interceptor"], UsePipes: ["transform", "pipe"] };
  for (const ci of [...idx.classes.values()].sort((a, b) => cmp(a.key, b.key))) {
    const ctl = ci.decorators.find((d) => d.name === "Controller");
    if (!ctl) continue;
    const prefix = stripQuotes(ctl.args[0] ?? "").replace(/^\/|\/$/g, "");
    const classMw = ci.decorators.filter((d) => nestMw[d.name]);
    for (const [mname, fnKey] of ci.methods) {
      const decos = idx.decorators.get(fnKey) ?? [];
      const route = decos.find((d) => ["Get", "Post", "Put", "Patch", "Delete", "All"].includes(d.name));
      if (!route) continue;
      const sub = stripQuotes(route.args[0] ?? "").replace(/^\/|\/$/g, "");
      const path = `/${[prefix, sub].filter(Boolean).join("/")}`;
      const mws: string[] = [];
      for (const d of [...classMw.map((x) => ({ name: x.name, args: x.args })), ...decos.filter((x) => nestMw[x.name])]) {
        for (const a of d.args) {
          const hit = resolveTypeToMethod(idx, ci.file, a, nestMw[d.name][0]);
          if (hit) mws.push(hit[0].key);
        }
      }
      const fi = idx.functions.get(fnKey)!;
      bindings.push({
        file_path: ci.file, line_start: fi.line_start, line_end: fi.line_end, kind: "HTTP", method: route.name.toUpperCase(), path,
        handler: fnKey, middlewares: mws, display_name: `${ci.name}.${mname}`,
      });
    }
  }

  // --- 4. Flask / FastAPI / Click-Typer ---
  const prefixOfPyVar = new Map<string, string>();
  for (const f of files) {
    if (!f.is_py) continue;
    walk(f.tree.rootNode, (n) => {
      if (n.type !== "assignment") return;
      const l = field(n, "left"), r = field(n, "right");
      if (l?.type === "identifier" && r?.type === "call") {
        const fnName = field(r, "function")?.text ?? "";
        if (/(APIRouter|Blueprint|Flask|FastAPI)$/.test(fnName)) {
          const kw = (field(r, "arguments")?.namedChildren ?? []).find((a) => a.type === "keyword_argument" && /^(prefix|url_prefix)$/.test(field(a, "name")?.text ?? ""));
          if (kw) prefixOfPyVar.set(`${f.path}|${l.text}`, stripQuotes(field(kw, "value")?.text ?? ""));
        }
      }
    });
  }
  for (const [fnKey, decos] of [...idx.decorators.entries()].sort((a, b) => cmp(a[0], b[0]))) {
    const fi = idx.functions.get(fnKey);
    if (!fi) continue;
    const isPy = idx.files.get(fi.file)?.is_py;
    if (!isPy) continue;
    const route = decos.find((d) => d.chain.length >= 2 && (VERBS.has(d.name) || d.name === "route"));
    if (route) {
      let method = route.name === "route" ? "GET" : route.name.toUpperCase();
      const m = /methods\s*=\s*\[([^\]]*)\]/.exec(route.args.join(","));
      if (route.name === "route" && m) method = stripQuotes(m[1].split(",")[0].trim()).toUpperCase() || "GET";
      const subPath = stripQuotes(route.args.find((a) => /^["']/.test(a)) ?? "");
      const prefix = prefixOfPyVar.get(`${fi.file}|${route.chain[0]}`) ?? "";
      const path = `${prefix}${subPath}` || "/";
      const mws: string[] = [];
      for (const d of decos) {
        if (d === route) continue;
        const k = `${fi.file}#${d.name}`;
        const same = idx.functions.get(k);
        if (same) mws.push(same.key);
        else { const b = idx.imports.get(fi.file)?.get(d.name); const rk = b ? resolveBinding(idx, fi.file, b, d.name) : null; if (rk && idx.functions.has(rk)) mws.push(rk); }
      }
      // Depends(fn)
      for (const mm of fi.node.text.slice(0, fi.node.text.indexOf(":\n") > 0 ? fi.node.text.indexOf(":\n") : 400).matchAll(/Depends\(\s*([A-Za-z_][A-Za-z0-9_.]*)/g)) {
        const nm = mm[1].split(".").pop()!;
        const same = idx.functions.get(`${fi.file}#${nm}`);
        if (same) mws.push(same.key);
        else { const b = idx.imports.get(fi.file)?.get(nm); const rk = b ? resolveBinding(idx, fi.file, b, nm) : null; if (rk && idx.functions.has(rk)) mws.push(rk); }
      }
      bindings.push({
        file_path: fi.file, line_start: fi.line_start, line_end: fi.line_end, kind: "HTTP", method, path, handler: fnKey,
        middlewares: [...new Set(mws)], display_name: `@${route.chain.join(".")}(${route.args[0] ?? ""})`,
      });
    }
    const cmd = decos.find((d) => d.name === "command" && d.chain.length >= 2);
    if (cmd) {
      bindings.push({ file_path: fi.file, line_start: fi.line_start, line_end: fi.line_end, kind: "COMMAND", method: null, path: stripQuotes(cmd.args[0] ?? fi.name), handler: fnKey, middlewares: [], display_name: fi.name });
    }
  }

  return bindings.sort((a, b) => cmp(a.file_path, b.file_path) || a.line_start - b.line_start || cmp(a.handler, b.handler));
}

function enclosingFunctionOf(idx: SymbolIndex, n: SyntaxNode, fallbackFn: FunctionInfo): FunctionInfo {
  for (let p: SyntaxNode | null = n; p; p = p.parent) {
    const k = idx.functionByNode.get(p.id);
    if (k) return idx.functions.get(k)!;
  }
  return fallbackFn;
}

// ---------- đồ thị ----------
export function buildCallGraph(idx: SymbolIndex, techStack: string[], packageEntryFiles: string[]): CallGraph {
  void techStack;
  const bindings = findRoutes(idx);

  const sites: CallSite[] = [];
  const external: ExternalCall[] = [];
  const merged = new Map<string, FunctionCallEdge>();

  const addEdge = (caller: string, t: Target, count = 1) => {
    if (caller === t.key) { /* đệ quy giữ ở đồ thị hàm */ }
    const k = `${caller}\u0000${t.key}`;
    const e = merged.get(k);
    if (e) {
      e.call_count += count;
      if (t.confidence === "RESOLVED") e.confidence = "RESOLVED";
      e.ambiguous = e.ambiguous || t.ambiguous;
    } else merged.set(k, { caller, callee: t.key, confidence: t.confidence, ambiguous: t.ambiguous, call_count: count });
  };

  for (const f of [...idx.files.values()].sort((a, b) => cmp(a.path, b.path))) {
    const modFn = idx.functions.get(`${f.path}#<module>`)!;
    walk(f.tree.rootNode, (n) => {
      if (!isCallNode(n)) return;
      const shape = calleeShape(n);
      if (!shape) return;
      const caller = enclosingFunctionOf(idx, n, modFn);
      // đăng ký route: lời gọi R.verb(...) thuộc ENG-34, vẫn xử lý bình thường (R không phải hàm nội bộ)
      const r = resolveCall(idx, caller, shape);
      if (r.targets.length > 0) {
        for (const t of r.targets) { addEdge(caller.key, t); sites.push({ caller: caller.key, callee: t.key, node: n, confidence: t.confidence, ambiguous: t.ambiguous }); }
      } else {
        external.push({
          caller: caller.key, line: row1(n), receiver_chain: shape.bare ? [] : shape.chain, method: shape.method,
          import_source: r.importSource, node: n,
        });
      }
    });
  }

  // ENG-34: cạnh đăng ký route
  for (const b of bindings) {
    const f = idx.functions.get(b.handler);
    if (!f) continue;
    const owner = f.is_anon ? `${b.file_path}#<module>` : (idx.functions.get(b.handler)?.class_key ? b.handler : `${b.file_path}#<module>`);
    if (owner === b.handler) continue;
    if (idx.functions.has(owner)) {
      // hàm chứa lệnh đăng ký có thể là hàm khác (reg(app)); tìm theo vị trí
      const container = [...idx.functions.values()].filter((x) => x.file === b.file_path && !x.is_anon && x.line_start <= b.line_start && x.line_end >= b.line_end && !x.is_module)
        .sort((a, c) => (c.line_start - a.line_start))[0]?.key ?? owner;
      addEdge(container, { key: b.handler, confidence: "RESOLVED", ambiguous: false });
      for (const m of b.middlewares) addEdge(container, { key: m, confidence: "RESOLVED", ambiguous: false });
    }
  }

  const edges = [...merged.values()].sort((a, b) => cmp(a.caller, b.caller) || cmp(a.callee, b.callee));

  // ENG-35: đồ thị file
  const fileGraph = new Map<string, Map<string, { weight: number; confidence: "RESOLVED" | "INFERRED" }>>();
  for (const f of idx.files.keys()) fileGraph.set(f, new Map());
  for (const e of edges) {
    const fa = idx.functions.get(e.caller)?.file, fb = idx.functions.get(e.callee)?.file;
    if (!fa || !fb || fa === fb) continue;
    const m = fileGraph.get(fa)!;
    const cur = m.get(fb);
    if (cur) { cur.weight += e.call_count; if (e.confidence === "RESOLVED") cur.confidence = "RESOLVED"; }
    else m.set(fb, { weight: e.call_count, confidence: e.confidence });
  }

  const entries = findEntries(idx, bindings, fileGraph, packageEntryFiles);
  return { edges, sites, external, bindings, entries, file_graph: fileGraph };
}

// ---------- entry (Mục 4) ----------
function findEntries(idx: SymbolIndex, bindings: RouteBinding[], fg: CallGraph["file_graph"], packageEntryFiles: string[]): EntryPoint[] {
  const entries: EntryPoint[] = [];
  const seen = new Set<string>();
  const add = (e: EntryPoint) => { const k = `${e.source}|${e.key}`; if (!seen.has(k)) { seen.add(k); entries.push(e); } };
  for (const b of bindings) add({ key: b.handler, binding: b, source: "REGISTERED" });

  // GENERIC (D-58): file vai trò + in-degree 0 trong đồ thị file ⇒ hàm/method export
  const indeg = new Map<string, number>();
  for (const [, m] of fg) for (const t of m.keys()) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const registeredFiles = new Set(bindings.map((b) => b.file_path));
  if (bindings.length === 0 || true) {
    for (const f of [...idx.files.keys()].sort(cmp)) {
      if (registeredFiles.has(f)) continue;
      if (!hasRoleName(f) || (indeg.get(f) ?? 0) > 0) continue;
      const base = f.slice(f.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "").toLowerCase();
      if (/^(index|main|app|server)$/.test(base)) continue; // bootstrap, không phải entry nghiệp vụ
      for (const fi of [...idx.functions.values()].filter((x) => x.file === f && !x.is_module && !x.is_anon && x.is_exported && x.kind !== "VARIABLE").sort((a, b) => cmp(a.key, b.key))) {
        if (fi.class_key && fi.name.endsWith(".constructor")) continue;
        add({ key: fi.key, binding: null, source: "GENERIC" });
      }
    }
  }

  // PROGRAM (D-58)
  for (const fi of [...idx.functions.values()].sort((a, b) => cmp(a.key, b.key))) {
    const isPy = idx.files.get(fi.file)?.is_py;
    if (!fi.is_module && fi.name === "main" && fi.body && fi.kind === "FUNCTION") add({ key: fi.key, binding: null, source: "PROGRAM" });
    if (fi.is_module && isPy && /if\s+__name__\s*==\s*["']__main__["']/.test(idx.files.get(fi.file)!.source)) add({ key: fi.key, binding: null, source: "PROGRAM" });
    if (fi.is_module && packageEntryFiles.some((p) => fi.file.endsWith(p.replace(/^\.\//, "")))) add({ key: fi.key, binding: null, source: "PROGRAM" });
  }
  return entries.sort((a, b) => cmp(a.key, b.key));
}

export type { FunctionInfo };
