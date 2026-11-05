// 11 Mục 2 — bảng symbol, import, kiểu field, quan hệ implement, resolver TS/JS + Python (ENG-20..27).
import { posix } from "node:path";
import { CONFIG } from "@/contracts/config";
import type { SymbolDefinition } from "@/contracts";
import { cognitiveComplexity } from "./complexity";
import type {
  ClassInfo, Decorator, FunctionInfo, ImportBinding, ParsedFile, SymbolIndex, SyntaxNode,
} from "./model";
import { cmp, field, row1, rowEnd1, stripQuotes, walk } from "./model";

const newIndex = (): SymbolIndex => ({
  symbols: new Map(), functions: new Map(), functionByNode: new Map(), files: new Map(), imports: new Map(),
  reexports: new Map(), classes: new Map(), classByName: new Map(), implMap: new Map(), varTypes: new Map(),
  locals: new Map(), paramTypes: new Map(), decorators: new Map(), fieldNames: new Set(), module_vars: new Map(),
});

/** ENG-20: trùng khóa ⇒ hậu tố ~2, ~3. */
function uniqueKey(idx: SymbolIndex, key: string): string {
  if (!idx.symbols.has(key) && !idx.functions.has(key)) return key;
  for (let i = 2; ; i++) { const k = `${key}~${i}`; if (!idx.symbols.has(k) && !idx.functions.has(k)) return k; }
}

const typeName = (t: string): string => {
  // ": Promise<Foo>" → "Foo"; ": IRepo" → "IRepo"; "Foo | null" → "Foo"
  const s = t.replace(/^\s*:\s*/, "").replace(/\bPromise<(.*)>/, "$1").replace(/\|\s*(null|undefined)/g, "").trim();
  const m = /[A-Za-z_$][A-Za-z0-9_$]*/.exec(s);
  return m ? m[0] : "";
};

function paramInfo(params: SyntaxNode | null, isPy: boolean): { names: string[]; types: Map<string, string>; accessorFields: Map<string, string> } {
  const names: string[] = [];
  const types = new Map<string, string>();
  const accessorFields = new Map<string, string>();
  if (!params) return { names, types, accessorFields };
  for (const p of params.namedChildren) {
    if (isPy) {
      if (p.type === "identifier") names.push(p.text);
      else if (p.type === "typed_parameter" || p.type === "typed_default_parameter" || p.type === "default_parameter") {
        const id = p.namedChildren.find((c) => c.type === "identifier") ?? field(p, "name");
        if (id) {
          names.push(id.text);
          const ty = field(p, "type");
          if (ty) types.set(id.text, typeName(ty.text));
        }
      }
      continue;
    }
    // TS/JS
    if (p.type === "identifier") { names.push(p.text); continue; }
    const pat = field(p, "pattern") ?? p.namedChildren.find((c) => c.type === "identifier" || c.type.endsWith("pattern"));
    if (!pat) continue;
    const ids: string[] = [];
    if (pat.type === "identifier") ids.push(pat.text);
    else walk(pat, (n) => { if (n.type === "identifier" || n.type === "shorthand_property_identifier_pattern") ids.push(n.text); });
    names.push(...ids);
    const ta = p.namedChildren.find((c) => c.type === "type_annotation");
    if (ta && pat.type === "identifier") {
      const tn = typeName(ta.text);
      if (tn) types.set(pat.text, tn);
      if (p.namedChildren.some((c) => c.type === "accessibility_modifier" || c.text === "readonly") && tn) accessorFields.set(pat.text, tn);
    }
  }
  return { names, types, accessorFields };
}

function collectLocals(fn: FunctionInfo, params: string[], isPy: boolean): Set<string> {
  const set = new Set(params);
  if (!fn.body) return set;
  walk(fn.body, (n) => {
    if (n.type === "variable_declarator") {
      const nm = field(n, "name");
      if (nm) walk(nm, (x) => { if (x.type === "identifier" || x.type === "shorthand_property_identifier_pattern") set.add(x.text); });
    } else if (isPy && (n.type === "assignment" || n.type === "for_statement" || n.type === "with_item" || n.type === "as_pattern")) {
      const l = field(n, "left");
      if (l) walk(l, (x) => { if (x.type === "identifier") set.add(x.text); });
    } else if (n.type === "catch_clause") {
      const pm = field(n, "parameter"); if (pm) set.add(pm.text);
    } else if (n.type === "for_in_statement") {
      const l = field(n, "left"); if (l) walk(l, (x) => { if (x.type === "identifier") set.add(x.text); });
    }
  });
  return set;
}

// ---------- decorators ----------
function parseDecorator(d: SyntaxNode): Decorator {
  const expr = d.namedChildren[0];
  let chain: string[] = [];
  let args: string[] = [];
  const chainOf = (n: SyntaxNode | null): string[] => {
    if (!n) return [];
    if (n.type === "identifier") return [n.text];
    if (n.type === "member_expression" || n.type === "attribute") {
      const obj = field(n, "object"); const prop = field(n, "property") ?? field(n, "attribute");
      return [...chainOf(obj), prop?.text ?? ""];
    }
    return [n.text];
  };
  if (expr && (expr.type === "call_expression" || expr.type === "call")) {
    chain = chainOf(field(expr, "function"));
    const a = field(expr, "arguments");
    args = (a?.namedChildren ?? []).map((x) => x.text);
  } else chain = chainOf(expr ?? null);
  return { name: chain[chain.length - 1] ?? "", chain, args, line: row1(d) };
}

// ---------- đăng ký ----------
export function register(idx: SymbolIndex, fn: FunctionInfo, isPy: boolean, paramNode: SyntaxNode | null): FunctionInfo {
  fn.key = uniqueKey(idx, fn.key);
  const pi = paramInfo(paramNode, isPy);
  fn.params = pi.names;
  idx.functions.set(fn.key, fn);
  idx.functionByNode.set(fn.node.id, fn.key);
  idx.paramTypes.set(fn.key, pi.types);
  if (!fn.is_module) {
    idx.symbols.set(fn.key, {
      key: fn.key, kind: fn.kind, name: fn.name.split(".").pop() ?? fn.name, file_path: fn.file,
      line_start: fn.line_start, line_end: fn.line_end, is_exported: fn.is_exported,
    });
  }
  idx.locals.set(fn.key, collectLocals(fn, fn.params, isPy));
  return fn;
}

const addSymbol = (idx: SymbolIndex, s: SymbolDefinition) => { s.key = uniqueKey(idx, s.key); idx.symbols.set(s.key, s); return s.key; };

function addClass(idx: SymbolIndex, ci: ClassInfo) {
  idx.classes.set(ci.key, ci);
  const l = idx.classByName.get(ci.name) ?? [];
  l.push(ci.key); l.sort(cmp);
  idx.classByName.set(ci.name, l);
}

// ---------- TS / JS ----------
function extractTs(f: ParsedFile, idx: SymbolIndex): void {
  const root = f.tree.rootNode;
  const imports = new Map<string, ImportBinding>();
  idx.imports.set(f.path, imports);
  const vtypes = new Map<string, string>();
  idx.varTypes.set(f.path, vtypes);
  const mvars = new Map<string, { line_start: number; line_end: number }>();
  idx.module_vars.set(f.path, mvars);
  const reexp: Array<{ from: string | null; names: Array<[string, string]> | "*"; spec?: string }> = [];
  idx.reexports.set(f.path, reexp as never);

  const addFn = (key: string, name: string, node: SyntaxNode, body: SyntaxNode | null, exported: boolean, kind: FunctionInfo["kind"],
    classKey: string | null, startRow: number, stmt: SyntaxNode | null = null) =>
    register(idx, {
      key, file: f.path, name, class_key: classKey, kind, node, body, line_start: startRow, line_end: rowEnd1(node),
      params: [], complexity: 0, is_exported: exported, is_module: false, is_anon: false, stmt_node: stmt,
    }, false, field(node, "parameters"));

  const handleClass = (node: SyntaxNode, exported: boolean, classDecorators: SyntaxNode[]) => {
    const nameNode = field(node, "name");
    if (!nameNode) return;
    const cname = nameNode.text;
    const ckey = uniqueKey(idx, `${f.path}#${cname}`);
    const heritage = node.namedChildren.find((c) => c.type === "class_heritage");
    const ext: string[] = [], impl: string[] = [];
    if (heritage) {
      for (const h of heritage.namedChildren) {
        const names = [...h.descendantsOfType(["identifier", "type_identifier"])].map((x) => x.text);
        if (h.type === "extends_clause") ext.push(...names.slice(0, 1)); else if (h.type === "implements_clause") impl.push(...names);
      }
      if (!heritage.namedChildren.some((h) => h.type === "extends_clause" || h.type === "implements_clause")) {
        ext.push(...heritage.descendantsOfType(["identifier", "type_identifier"]).map((x) => x.text).slice(0, 1)); // JS: class A extends B
      }
    }
    const ci: ClassInfo = {
      key: ckey, file: f.path, name: cname, kind: node.type === "abstract_class_declaration" ? "ABSTRACT" : "CLASS",
      extends_names: ext, implements_names: impl, methods: new Map(), fields: new Map(),
      decorators: classDecorators.map((d) => { const p = parseDecorator(d); return { name: p.name, args: p.args }; }),
      line_start: row1(node), line_end: rowEnd1(node),
    };
    addClass(idx, ci);
    addSymbol(idx, { key: ckey, kind: "CLASS", name: cname, file_path: f.path, line_start: row1(node), line_end: rowEnd1(node), is_exported: exported });
    const body = field(node, "body");
    let pending: SyntaxNode[] = [];
    if (body) for (const m of body.namedChildren) {
      if (m.type === "decorator") { pending.push(m); continue; }
      if (m.type === "method_definition") {
        const mname = field(m, "name")?.text ?? "<anon>";
        const key = `${f.path}#${cname}.${mname}`;
        const startRow = pending.length > 0 ? row1(pending[0]) : row1(m);
        const info = addFn(key, `${cname}.${mname}`, m, field(m, "body"), exported, "METHOD", ckey, startRow);
        info.line_start = startRow;
        ci.methods.set(mname, info.key);
        if (pending.length > 0) idx.decorators.set(info.key, pending.map(parseDecorator));
        if (mname === "constructor") {
          const pi = paramInfo(field(m, "parameters"), false);
          for (const [n, t] of pi.accessorFields) { ci.fields.set(n, t); idx.fieldNames.add(n); }
          // this.x = new T() / this.x = param
          const ptypes = pi.types;
          if (info.body) walk(info.body, (n) => {
            if (n.type === "assignment_expression") {
              const l = field(n, "left"), r = field(n, "right");
              if (l?.type === "member_expression" && field(l, "object")?.text === "this" && r) {
                const fname = field(l, "property")?.text;
                if (!fname) return;
                if (r.type === "new_expression") { const c = field(r, "constructor"); if (c) ci.fields.set(fname, typeName(c.text)); }
                else if (r.type === "identifier" && ptypes.has(r.text)) ci.fields.set(fname, ptypes.get(r.text)!);
              }
            }
          });
        }
      } else if (m.type === "public_field_definition") {
        const fname = field(m, "name")?.text;
        if (fname) {
          idx.fieldNames.add(fname);
          const ta = m.namedChildren.find((c) => c.type === "type_annotation");
          const val = field(m, "value");
          if (ta) ci.fields.set(fname, typeName(ta.text));
          else if (val?.type === "new_expression") { const c = field(val, "constructor"); if (c) ci.fields.set(fname, typeName(c.text)); }
          if (val && (val.type === "arrow_function" || val.type === "function_expression")) {
            const key = `${f.path}#${cname}.${fname}`;
            const info = addFn(key, `${cname}.${fname}`, val, field(val, "body"), exported, "METHOD", ckey, row1(m));
            ci.methods.set(fname, info.key);
          }
        }
      }
      pending = [];
    }
  };

  const handleVarDecl = (decl: SyntaxNode, exported: boolean) => {
    for (const d of decl.namedChildren.filter((c) => c.type === "variable_declarator")) {
      const nameNode = field(d, "name");
      const val = field(d, "value");
      if (!nameNode || nameNode.type !== "identifier") continue;
      const name = nameNode.text;
      if (val && (val.type === "arrow_function" || val.type === "function_expression" || val.type === "function")) {
        addFn(`${f.path}#${name}`, name, val, field(val, "body"), exported, "FUNCTION", null, row1(decl), decl);
      } else {
        addSymbol(idx, { key: `${f.path}#${name}`, kind: "VARIABLE", name, file_path: f.path, line_start: row1(decl), line_end: rowEnd1(decl), is_exported: exported });
        mvars.set(name, { line_start: row1(decl), line_end: rowEnd1(decl) });
        if (val?.type === "new_expression") { const c = field(val, "constructor"); if (c) vtypes.set(name, typeName(c.text)); }
        const ta = d.namedChildren.find((c) => c.type === "type_annotation");
        if (ta && !vtypes.has(name)) vtypes.set(name, typeName(ta.text));
        // const x = require('y')
        if (val?.type === "call_expression" && field(val, "function")?.text === "require") {
          const arg = field(val, "arguments")?.namedChildren[0];
          if (arg) imports.set(name, { kind: "module", source: stripQuotes(arg.text), imported: null, file: null });
        }
      }
    }
    // const { a } = require('x')
    for (const d of decl.namedChildren.filter((c) => c.type === "variable_declarator")) {
      const nameNode = field(d, "name"), val = field(d, "value");
      if (nameNode?.type === "object_pattern" && val?.type === "call_expression" && field(val, "function")?.text === "require") {
        const src = stripQuotes(field(val, "arguments")?.namedChildren[0]?.text ?? "");
        for (const sp of nameNode.namedChildren) {
          const id = sp.type === "shorthand_property_identifier_pattern" ? sp.text : field(sp, "value")?.text;
          const imported = sp.type === "shorthand_property_identifier_pattern" ? sp.text : field(sp, "key")?.text ?? null;
          if (id) imports.set(id, { kind: "named", source: src, imported, file: null });
        }
      }
    }
  };

  const handleImport = (s: SyntaxNode) => {
    const srcNode = field(s, "source");
    if (!srcNode) return;
    const source = stripQuotes(srcNode.text);
    const clause = s.namedChildren.find((c) => c.type === "import_clause");
    if (!clause) return;
    for (const c of clause.namedChildren) {
      if (c.type === "identifier") imports.set(c.text, { kind: "default", source, imported: "default", file: null });
      else if (c.type === "namespace_import") { const id = c.namedChildren.find((x) => x.type === "identifier"); if (id) imports.set(id.text, { kind: "namespace", source, imported: null, file: null }); }
      else if (c.type === "named_imports") {
        for (const sp of c.namedChildren.filter((x) => x.type === "import_specifier")) {
          const nameN = field(sp, "name"), alias = field(sp, "alias");
          if (nameN) imports.set((alias ?? nameN).text, { kind: "named", source, imported: nameN.text, file: null });
        }
      }
    }
  };

  const handleTop = (s: SyntaxNode, exported: boolean, decorators: SyntaxNode[]) => {
    switch (s.type) {
      case "export_statement": {
        const decos = s.namedChildren.filter((c) => c.type === "decorator");
        const src = field(s, "source");
        const decl = field(s, "declaration");
        if (src) { // export { a } from './x'  |  export * from './x'
          const clause = s.namedChildren.find((c) => c.type === "export_clause");
          const spec = stripQuotes(src.text);
          if (clause) {
            const names: Array<[string, string]> = clause.namedChildren.filter((x) => x.type === "export_specifier").map((sp) => {
              const n = field(sp, "name")!.text; const a = field(sp, "alias")?.text ?? n; return [a, n] as [string, string];
            });
            (reexp as Array<{ from: string | null; names: Array<[string, string]> | "*"; spec?: string }>).push({ from: null, names, spec });
          } else (reexp as Array<{ from: string | null; names: "*"; spec?: string }>).push({ from: null, names: "*", spec });
          return;
        }
        if (decl) handleTop(decl, true, decos);
        else {
          const clause = s.namedChildren.find((c) => c.type === "export_clause");
          if (clause) for (const sp of clause.namedChildren) { const n = field(sp, "name")?.text; const sym = n ? idx.symbols.get(`${f.path}#${n}`) : undefined; if (sym) sym.is_exported = true; }
          const val = field(s, "value");
          if (val?.type === "identifier") (reexp as Array<{ from: string | null; names: Array<[string, string]>; spec?: string }>).push({ from: f.path, names: [["default", val.text]] });
        }
        return;
      }
      case "function_declaration": case "generator_function_declaration": {
        const n = field(s, "name")?.text; if (n) addFn(`${f.path}#${n}`, n, s, field(s, "body"), exported, "FUNCTION", null, row1(s));
        return;
      }
      case "class_declaration": case "abstract_class_declaration": handleClass(s, exported, decorators); return;
      case "interface_declaration": {
        const n = field(s, "name")?.text; if (!n) return;
        const key = uniqueKey(idx, `${f.path}#${n}`);
        const ci: ClassInfo = { key, file: f.path, name: n, kind: "INTERFACE", extends_names: [], implements_names: [], methods: new Map(), fields: new Map(), decorators: [], line_start: row1(s), line_end: rowEnd1(s) };
        const body = field(s, "body");
        for (const m of body?.namedChildren ?? []) {
          const mn = field(m, "name")?.text;
          if (mn) { ci.methods.set(mn, `${key}.${mn}`); idx.fieldNames.add(mn); }
        }
        const ext = s.namedChildren.find((c) => c.type === "extends_type_clause");
        if (ext) ci.extends_names.push(...ext.descendantsOfType("type_identifier").map((x) => x.text));
        addClass(idx, ci);
        addSymbol(idx, { key, kind: "INTERFACE", name: n, file_path: f.path, line_start: row1(s), line_end: rowEnd1(s), is_exported: exported });
        return;
      }
      case "type_alias_declaration": {
        const n = field(s, "name")?.text; if (!n) return;
        const key = addSymbol(idx, { key: `${f.path}#${n}`, kind: "TYPE", name: n, file_path: f.path, line_start: row1(s), line_end: rowEnd1(s), is_exported: exported });
        s.descendantsOfType(["property_signature"]).forEach((p) => { const pn = field(p, "name")?.text; if (pn) idx.fieldNames.add(pn); });
        void key; return;
      }
      case "lexical_declaration": case "variable_declaration": handleVarDecl(s, exported); return;
      case "import_statement": handleImport(s); return;
      default: return;
    }
  };

  for (const s of root.namedChildren) handleTop(s, false, []);
  // <module>
  const mod = register(idx, {
    key: `${f.path}#<module>`, file: f.path, name: "<module>", class_key: null, kind: "FUNCTION", node: root, body: root,
    line_start: 1, line_end: rowEnd1(root), params: [], complexity: 0, is_exported: false, is_module: true, is_anon: false, stmt_node: null,
  }, false, null);
  void mod;
}

// ---------- Python ----------
function extractPy(f: ParsedFile, idx: SymbolIndex): void {
  const root = f.tree.rootNode;
  const imports = new Map<string, ImportBinding>();
  idx.imports.set(f.path, imports);
  const vtypes = new Map<string, string>();
  idx.varTypes.set(f.path, vtypes);
  const mvars = new Map<string, { line_start: number; line_end: number }>();
  idx.module_vars.set(f.path, mvars);
  idx.reexports.set(f.path, []);

  const addFn = (key: string, name: string, node: SyntaxNode, startRow: number, kind: FunctionInfo["kind"], classKey: string | null) =>
    register(idx, {
      key, file: f.path, name, class_key: classKey, kind, node, body: field(node, "body"), line_start: startRow, line_end: rowEnd1(node),
      params: [], complexity: 0, is_exported: !name.split(".").pop()!.startsWith("_"), is_module: false, is_anon: false, stmt_node: null,
    }, true, field(node, "parameters"));

  const handleClass = (node: SyntaxNode, startRow: number) => {
    const cname = field(node, "name")!.text;
    const ckey = uniqueKey(idx, `${f.path}#${cname}`);
    const bases = (field(node, "superclasses")?.namedChildren ?? []).map((b) => b.text);
    const abstractish = bases.some((b) => /(^|\.)(ABC|Protocol)$/.test(b));
    const ci: ClassInfo = {
      key: ckey, file: f.path, name: cname, kind: abstractish ? "ABSTRACT" : "CLASS", extends_names: bases, implements_names: [],
      methods: new Map(), fields: new Map(), decorators: [], line_start: startRow, line_end: rowEnd1(node),
    };
    addClass(idx, ci);
    addSymbol(idx, { key: ckey, kind: "CLASS", name: cname, file_path: f.path, line_start: startRow, line_end: rowEnd1(node), is_exported: !cname.startsWith("_") });
    for (const m of field(node, "body")?.namedChildren ?? []) {
      let def = m, start = row1(m);
      let decos: SyntaxNode[] = [];
      if (m.type === "decorated_definition") { def = field(m, "definition")!; start = row1(m); decos = m.namedChildren.filter((c) => c.type === "decorator"); }
      if (def?.type === "function_definition") {
        const mn = field(def, "name")!.text;
        const info = addFn(`${f.path}#${cname}.${mn}`, `${cname}.${mn}`, def, start, "METHOD", ckey);
        info.line_start = start;
        ci.methods.set(mn, info.key);
        if (decos.length) idx.decorators.set(info.key, decos.map(parseDecorator));
        if (mn === "__init__") {
          const ptypes = idx.paramTypes.get(info.key) ?? new Map();
          if (info.body) walk(info.body, (n) => {
            if (n.type === "assignment") {
              const l = field(n, "left"), r = field(n, "right");
              if (l?.type === "attribute" && field(l, "object")?.text === "self" && r) {
                const fname = field(l, "attribute")?.text; if (!fname) return;
                idx.fieldNames.add(fname);
                if (r.type === "call") { const fn = field(r, "function"); if (fn) ci.fields.set(fname, typeName(fn.text.split(".").pop()!)); }
                else if (r.type === "identifier" && ptypes.has(r.text)) ci.fields.set(fname, ptypes.get(r.text)!);
              }
            }
          });
        }
      } else if (m.type === "expression_statement") {
        const a = m.namedChildren[0];
        if (a?.type === "assignment") { const l = field(a, "left"); const ty = field(a, "type"); if (l && ty) { ci.fields.set(l.text, typeName(ty.text)); idx.fieldNames.add(l.text); } }
      }
    }
  };

  const handleImport = (s: SyntaxNode) => {
    if (s.type === "import_statement") {
      for (const c of s.namedChildren) {
        if (c.type === "dotted_name") imports.set(c.text.split(".")[0], { kind: "module", source: c.text, imported: null, file: null });
        else if (c.type === "aliased_import") { const n = field(c, "name")!.text; const a = field(c, "alias")!.text; imports.set(a, { kind: "module", source: n, imported: null, file: null }); }
      }
    } else {
      const modNode = field(s, "module_name");
      const source = modNode ? modNode.text : "";
      for (const c of s.namedChildren) {
        if (c === modNode) continue;
        if (c.type === "dotted_name") imports.set(c.text, { kind: "named", source, imported: c.text, file: null });
        else if (c.type === "aliased_import") { const n = field(c, "name")!.text; const a = field(c, "alias")!.text; imports.set(a, { kind: "named", source, imported: n, file: null }); }
      }
    }
  };

  for (const s of root.namedChildren) {
    if (s.type === "import_statement" || s.type === "import_from_statement") handleImport(s);
    else if (s.type === "function_definition") { const n = field(s, "name")!.text; addFn(`${f.path}#${n}`, n, s, row1(s), "FUNCTION", null); }
    else if (s.type === "decorated_definition") {
      const def = field(s, "definition");
      const decos = s.namedChildren.filter((c) => c.type === "decorator");
      if (def?.type === "function_definition") {
        const n = field(def, "name")!.text;
        const info = addFn(`${f.path}#${n}`, n, def, row1(s), "FUNCTION", null);
        info.line_start = row1(s);
        idx.decorators.set(info.key, decos.map(parseDecorator));
      } else if (def?.type === "class_definition") handleClass(def, row1(s));
    } else if (s.type === "class_definition") handleClass(s, row1(s));
    else if (s.type === "expression_statement") {
      const a = s.namedChildren[0];
      if (a?.type === "assignment") {
        const l = field(a, "left"), r = field(a, "right");
        if (l?.type === "identifier") {
          addSymbol(idx, { key: `${f.path}#${l.text}`, kind: "VARIABLE", name: l.text, file_path: f.path, line_start: row1(s), line_end: rowEnd1(s), is_exported: !l.text.startsWith("_") });
          mvars.set(l.text, { line_start: row1(s), line_end: rowEnd1(s) });
          if (r?.type === "call") { const fn = field(r, "function"); if (fn) vtypes.set(l.text, typeName(fn.text.split(".").pop()!)); }
        }
      }
    }
  }
  register(idx, {
    key: `${f.path}#<module>`, file: f.path, name: "<module>", class_key: null, kind: "FUNCTION", node: root, body: root,
    line_start: 1, line_end: rowEnd1(root), params: [], complexity: 0, is_exported: false, is_module: true, is_anon: false, stmt_node: null,
  }, true, null);
}

// ---------- resolver ----------
interface TsConfig { dir: string; baseUrl: string | null; paths: Record<string, string[]> }

function makeResolver(filePaths: Set<string>, manifests: Map<string, string>, rootOffset: string) {
  const tsconfigs: TsConfig[] = [];
  for (const [p, text] of manifests) {
    const base = p.slice(p.lastIndexOf("/") + 1);
    if (base !== "tsconfig.json" && base !== "jsconfig.json") continue;
    try {
      const j = JSON.parse(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1").replace(/,\s*([}\]])/g, "$1")) as { compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } };
      const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "";
      tsconfigs.push({ dir, baseUrl: j.compilerOptions?.baseUrl ?? null, paths: j.compilerOptions?.paths ?? {} });
    } catch { /* bỏ qua */ }
  }
  const nearestTs = (from: string): TsConfig | undefined =>
    tsconfigs.filter((c) => from.startsWith(c.dir)).sort((a, b) => b.dir.length - a.dir.length)[0];

  const tryFile = (p: string): string | null => {
    const n = posix.normalize(p);
    const cands = [n, `${n}.ts`, `${n}.tsx`, `${n}.js`, `${n}.jsx`, `${n}.mjs`, `${n}/index.ts`, `${n}/index.tsx`, `${n}/index.js`];
    if (/\.js$/.test(n)) cands.push(n.replace(/\.js$/, ".ts"), n.replace(/\.js$/, ".tsx"));
    for (const c of cands) if (filePaths.has(c)) return c;
    return null;
  };

  const ts = (from: string, spec: string): string | null => {
    if (spec.startsWith(".")) return tryFile(posix.join(posix.dirname(from), spec));
    const cfg = nearestTs(from);
    if (cfg) {
      for (const [pat, targets] of Object.entries(cfg.paths)) {
        const star = pat.indexOf("*");
        const matches = star < 0 ? spec === pat : spec.startsWith(pat.slice(0, star)) && spec.endsWith(pat.slice(star + 1));
        if (!matches) continue;
        const mid = star < 0 ? "" : spec.slice(star, spec.length - (pat.length - star - 1));
        for (const t of targets) {
          const r = tryFile(posix.join(cfg.dir, cfg.baseUrl ?? ".", t.replace("*", mid)));
          if (r) return r;
        }
      }
      if (cfg.baseUrl) { const r = tryFile(posix.join(cfg.dir, cfg.baseUrl, spec)); if (r) return r; }
    }
    const dir = cfg?.dir ?? rootOffset;
    if (spec.startsWith("@/") || spec.startsWith("~/")) return tryFile(posix.join(dir, "src", spec.slice(2))) ?? tryFile(posix.join(dir, spec.slice(2)));
    return null;
  };

  const py = (from: string, spec: string): string | null => {
    const dots = /^\.*/.exec(spec)![0].length;
    const rest = spec.slice(dots).replace(/\./g, "/");
    const tryMod = (p: string) => [`${p}.py`, `${p}/__init__.py`].find((c) => filePaths.has(c)) ?? null;
    if (dots > 0) {
      let base = posix.dirname(from);
      for (let i = 1; i < dots; i++) base = posix.dirname(base);
      return tryMod(posix.normalize(posix.join(base, rest || "__init__"))) ?? (rest ? null : tryMod(base));
    }
    for (const pre of ["", "src/", rootOffset]) {
      const r = tryMod(posix.normalize(`${pre}${rest}`));
      if (r) return r;
    }
    return null;
  };
  return { ts, py };
}

export function collectSymbols(
  files: ParsedFile[], manifests: Map<string, string>, rootOffset: string,
): SymbolIndex {
  const idx = newIndex();
  for (const f of files) {
    idx.files.set(f.path, f);
    if (f.is_py) extractPy(f, idx); else extractTs(f, idx);
  }
  const resolver = makeResolver(new Set(files.map((f) => f.path)), manifests, rootOffset);

  // phân giải import (ENG-25) + re-export
  for (const f of files) {
    const imports = idx.imports.get(f.path)!;
    for (const b of imports.values()) {
      if (f.is_py) {
        if (b.kind === "module") b.file = resolver.py(f.path, b.source);
        else {
          const modFile = resolver.py(f.path, b.source || ".");
          if (modFile && idx.symbols.has(`${modFile}#${b.imported}`)) b.file = modFile;
          else {
            const sub = resolver.py(f.path, `${b.source}${b.source.endsWith(".") ? "" : "."}${b.imported}`);
            if (sub) { b.file = sub; b.kind = "namespace"; } else b.file = modFile;
          }
        }
      } else b.file = resolver.ts(f.path, b.source);
    }
    for (const r of idx.reexports.get(f.path)!) {
      const spec = (r as { spec?: string }).spec;
      if (spec) r.from = resolver.ts(f.path, spec);
    }
  }

  // implMap (ENG-23)
  for (const ci of idx.classes.values()) {
    const targets = [...ci.implements_names, ...ci.extends_names];
    for (const t of targets) {
      for (const tk of resolveClassName(idx, ci.file, t)) {
        const target = idx.classes.get(tk);
        if (target && (target.kind === "INTERFACE" || target.kind === "ABSTRACT") && tk !== ci.key) {
          const l = idx.implMap.get(tk) ?? [];
          if (!l.includes(ci.key)) l.push(ci.key);
          l.sort(cmp);
          idx.implMap.set(tk, l);
        }
      }
    }
  }

  // độ phức tạp (ENG-71)
  for (const fn of idx.functions.values()) {
    const isPy = idx.files.get(fn.file)!.is_py;
    if (fn.is_module) {
      const defs = new Set(["function_declaration", "class_declaration", "abstract_class_declaration", "interface_declaration", "type_alias_declaration",
        "function_definition", "class_definition", "decorated_definition", "import_statement", "import_from_statement", "export_statement"]);
      let s = 0;
      for (const st of fn.node.namedChildren) {
        if (defs.has(st.type)) continue;
        if (st.type === "lexical_declaration" || st.type === "variable_declaration") {
          if (st.descendantsOfType(["arrow_function", "function_expression"]).some((x) => x.parent?.type === "variable_declarator")) continue;
        }
        s += cognitiveComplexity(st, isPy);
      }
      fn.complexity = s;
    } else fn.complexity = fn.body ? cognitiveComplexity(fn.body, isPy, fn.name.split(".").pop()) : 0;
  }
  void CONFIG;
  return idx;
}

/** Tên lớp ⇒ danh sách khóa lớp ứng viên (cùng file, import, hoặc toàn repo duy nhất theo tên). */
export function resolveClassName(idx: SymbolIndex, fromFile: string, name: string): string[] {
  const local = `${fromFile}#${name}`;
  if (idx.classes.has(local)) return [local];
  const b = idx.imports.get(fromFile)?.get(name);
  if (b?.file) {
    const target = resolveExported(idx, b.file, b.imported && b.imported !== "default" ? b.imported : name, 0);
    if (target && idx.classes.has(target)) return [target];
    const k = `${b.file}#${name}`;
    if (idx.classes.has(k)) return [k];
  }
  return idx.classByName.get(name) ?? [];
}

/** Barrel re-export tối đa CONFIG.BARREL_MAX_DEPTH bước. Trả khóa symbol gốc. */
export function resolveExported(idx: SymbolIndex, file: string, name: string, depth: number): string | null {
  const direct = `${file}#${name}`;
  if (idx.symbols.has(direct) || idx.classes.has(direct)) return direct;
  if (depth >= CONFIG.BARREL_MAX_DEPTH) return null;
  for (const r of idx.reexports.get(file) ?? []) {
    if (r.names === "*") { if (r.from) { const x = resolveExported(idx, r.from, name, depth + 1); if (x) return x; } }
    else for (const [alias, orig] of r.names) {
      if (alias === name) {
        if (r.from && r.from !== file) { const x = resolveExported(idx, r.from, orig, depth + 1); if (x) return x; }
        else if (r.from === file) { const x = `${file}#${orig}`; if (idx.symbols.has(x)) return x; }
      }
    }
  }
  return null;
}
