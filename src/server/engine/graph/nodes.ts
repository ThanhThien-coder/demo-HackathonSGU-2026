// 11 Mục 9–11 — ghép node: ứng viên, node thuật toán, node ảo, id (D-08), cạnh (D-07, D-56, D-73), Display Budget, Capstone.
import { CONFIG } from "@/contracts/config";
import type { ExecutionTraceStep, GraphEdge, HybridArchitecturalNode, IngestOutput } from "@/contracts";
import { isDataSink } from "./callgraph";
import type { EngineContext } from "./slicing";
import { buildAlgoSteps, buildSlice } from "./slicing";
import type { Candidate } from "./slicing";
import { baseTitle, dedupeTitles, hash6, slug } from "./naming";
import { layoutNodes, longestPath, uncleBob } from "./graphalgo";
import { cmp } from "./model";
import { adapterById, tierOfLanguage } from "./registry";
import { isTestPath } from "../ingest/prune";

export interface AssembleResult { nodes: HybridArchitecturalNode[]; edges: GraphEdge[]; warnings: string[]; omitted: number; degraded: "PROCEDURAL" | null }

const easier = (a: { cognitive_complexity: number; rank_score: number; id: string }, b: { cognitive_complexity: number; rank_score: number; id: string }) =>
  a.cognitive_complexity - b.cognitive_complexity || b.rank_score - a.rank_score || cmp(a.id, b.id);

function inScope(ctx: EngineContext, file: string) { return ctx.scope === "" || file.startsWith(ctx.scope); }

function languagesOf(ctx: EngineContext, files: string[]): string[] {
  return [...new Set(files.map((f) => ctx.idx.files.get(f)?.language ?? "").filter(Boolean))].sort();
}

function mkCandidate(ctx: EngineContext, partial: {
  kind: Candidate["kind"]; key: string; steps: ExecutionTraceStep[]; dto: string; functions: string[]; binding: Candidate["binding"];
  node_type: Candidate["node_type"]; entry_symbol: string | null; resolved: Map<string, boolean>;
}): Candidate {
  const files = [...new Set(partial.steps.map((s) => s.file_path))];
  const fns = partial.functions.map((k) => ctx.idx.functions.get(k)).filter((x): x is NonNullable<typeof x> => !!x);
  const cc = Math.max(0, ...fns.map((f) => f.complexity));
  const rank = ctx.fileRank.get(files[0]) ?? 0;
  return {
    id: "", node_type: partial.node_type, entry_symbol: partial.entry_symbol, trace_steps: partial.steps, dto_snippet: partial.dto,
    cognitive_complexity: cc, rank_score: rank, title_source: "FILE_BASENAME", title_evidence: "",
    kind: partial.kind, order_key: partial.key, functions: partial.functions, binding: partial.binding, base_title: "",
    files, languages: languagesOf(ctx, files), resolved_paths: partial.resolved,
  };
}

/** P2: tách hàm dài thành node ảo theo nhãn câu lệnh (ENG-102). */
function proceduralVirtual(ctx: EngineContext): Candidate[] {
  const out: Candidate[] = [];
  const fns = [...ctx.idx.functions.values()].filter((f) => !f.is_module && f.body && inScope(ctx, f.file));
  const M = fns.sort((a, b) => (b.line_end - b.line_start) - (a.line_end - a.line_start) || cmp(a.key, b.key))[0];
  if (!M || !M.body) return out;
  const f = ctx.idx.files.get(M.file)!;
  const labels: Record<string, number[]> = { INPUT: [], VALIDATE: [], COMPUTE_OUTPUT: [], DATA: [] };
  const stmts = M.body.namedChildren.filter((c) => c.type !== "comment");
  const sinkLines = new Set((ctx.extByFn.get(M.key) ?? []).filter((e) => isDataSink(e, ctx.techStack)).map((e) => e.node.startPosition.row + 1));
  for (const s of stmts) {
    const a = s.startPosition.row + 1, b = s.endPosition.row + 1;
    const text = s.text;
    const rows = Array.from({ length: b - a + 1 }, (_, i) => a + i);
    let label = "COMPUTE_OUTPUT";
    if ([...sinkLines].some((l) => l >= a && l <= b)) label = "DATA";
    else if (/req\.(body|params|query)|request\.(json|args)|\binput\(|sys\.argv|process\.argv|parse_args\(|Scanner/.test(text)) label = "INPUT";
    else if (/^\s*if[\s\S]*?(raise|throw|return)|\bassert\b|\.parse\(|\.validate\(/.test(text)) label = "VALIDATE";
    labels[label].push(...rows);
  }
  const present = Object.entries(labels).filter(([, r]) => r.length > 0);
  if (present.length < 2) return out;
  const layerOf: Record<string, ExecutionTraceStep["layer"]> = { INPUT: "ENTRY_POINT", VALIDATE: "MIDDLEWARE", COMPUTE_OUTPUT: "BUSINESS_LOGIC", DATA: "DATA_ACCESS" };
  const cp = adapterById(f.language)?.comment_prefix ?? "//";
  const sigRows = [M.line_start];
  for (const label of ["INPUT", "VALIDATE", "COMPUTE_OUTPUT", "DATA"]) {
    const rows = labels[label];
    if (rows.length === 0) continue;
    const keep = [...new Set([...sigRows, ...rows])].sort((a, b) => a - b).slice(0, CONFIG.STEP_MAX_LINES);
    const lines: string[] = [], map: number[] = [];
    let prev = 0;
    for (const r of keep) {
      if (prev && r > prev + 1) { lines.push(`${/^\s*/.exec(f.lines[prev] ?? "")![0]}${cp} … (${r - prev - 1} dòng)`); map.push(0); }
      lines.push(f.lines[r - 1] ?? ""); map.push(r); prev = r;
    }
    const step: ExecutionTraceStep = {
      step_number: 1, layer: layerOf[label], file_path: M.file, function_name: M.name,
      line_start: Math.min(...keep), line_end: Math.max(...keep), snippet: lines.join("\n"), snippet_line_map: map,
    };
    const c = mkCandidate(ctx, { kind: "VNODE", key: `${M.file}#${label}`, steps: [step], dto: "", functions: [], binding: null, node_type: "ARCHITECTURAL_DATA_FLOW", entry_symbol: null, resolved: new Map() });
    c.id = `vnode-${hash6(`${M.file}#${label}`)}`;
    c.cognitive_complexity = M.complexity;
    c.base_title = `${M.name}: ${{ INPUT: "Input", VALIDATE: "Validation", COMPUTE_OUTPUT: "Compute & Output", DATA: "Data Access" }[label]}`;
    c.title_source = "VIRTUAL"; c.title_evidence = `${M.file}#${label}`;
    out.push(c);
  }
  return out;
}

export function assemble(ctx: EngineContext, out: IngestOutput, nFilesInScope: number): AssembleResult {
  const { idx, cg } = ctx;
  const warnings: string[] = [];
  const registered = cg.entries.filter((e) => e.source === "REGISTERED" || e.source === "GENERIC");
  const program = cg.entries.filter((e) => e.source === "PROGRAM");
  // ENG-51
  let degraded: "PROCEDURAL" | null = null;
  let useEntries = registered;
  if (registered.length === 0) {
    if (nFilesInScope <= CONFIG.PROCEDURAL_MAX_FILES) degraded = "PROCEDURAL";
    else useEntries = program;
  }

  let cands: Candidate[] = [];
  const seenSets = new Set<string>();
  const addSlice = (key: string, mws: string[], binding: Candidate["binding"], isProcedural = false) => {
    const fn = idx.functions.get(key);
    if (!fn || !inScope(ctx, fn.file)) return;
    const s = buildSlice(key, mws, ctx);
    if (!s || s.steps.length === 0) return;
    const sig = [...s.functions].sort(cmp).join("|");
    if (seenSets.has(sig)) return;
    seenSets.add(sig);
    const c = mkCandidate(ctx, { kind: "SLICE", key, steps: s.steps, dto: s.dto_snippet, functions: s.functions, binding, node_type: "ARCHITECTURAL_DATA_FLOW", entry_symbol: fn.is_anon ? key : key, resolved: s.resolved_chain });
    void isProcedural;
    cands.push(c);
  };

  if (degraded === "PROCEDURAL") {
    for (const fn of [...idx.functions.values()].sort((a, b) => cmp(a.key, b.key))) {
      if (!fn.body || !inScope(ctx, fn.file)) continue;
      if (fn.is_module && fn.body.namedChildren.filter((c) => !/function|class|import|decorated/.test(c.type)).length === 0) continue;
      addSlice(fn.key, [], null, true);
    }
    const tooFew = cands.length < CONFIG.FUNCTION_GRAPH_MIN_NODES;
    const longest = Math.max(0, ...[...idx.functions.values()].filter((f) => !f.is_module).map((f) => f.line_end - f.line_start));
    if (tooFew || longest > CONFIG.LONG_FUNCTION_LINES) {
      const v = proceduralVirtual(ctx);
      if (v.length >= 2) {
        const M = v[0].functions.length ? "" : v[0].trace_steps[0].function_name;
        cands = [...v, ...cands.filter((c) => !c.trace_steps.some((s) => s.function_name === M))];
      }
    }
  } else {
    for (const e of useEntries) addSlice(e.key, e.binding?.middlewares ?? [], e.binding);
  }

  // Node thuật toán (ENG-90)
  const usedFns = new Set(cands.flatMap((c) => c.functions));
  const fnPool = [...idx.functions.values()].filter((f) => !f.is_module && !f.is_anon && f.body && inScope(ctx, f.file) && !usedFns.has(f.key) && !isTestPath(f.file));
  const rankOf = (f: { file: string }) => ctx.fileRank.get(f.file) ?? 0;
  const byWeight = (a: { complexity: number; file: string; key: string }, b: { complexity: number; file: string; key: string }) =>
    b.complexity - a.complexity || rankOf(b) - rankOf(a) || cmp(a.key, b.key);
  const vip = fnPool.filter((f) => f.complexity > CONFIG.VIP_COMPLEXITY_MIN).sort(byWeight);
  const addAlgo = (key: string) => {
    const r = buildAlgoSteps(key, ctx);
    if (!r) return;
    const fn = idx.functions.get(key)!;
    const c = mkCandidate(ctx, { kind: "ALGO", key, steps: r.steps, dto: r.dto, functions: [key], binding: null, node_type: "ALGORITHMIC_CORE", entry_symbol: key, resolved: new Map() });
    c.cognitive_complexity = fn.complexity;
    cands.push(c);
  };
  vip.forEach((f) => addAlgo(f.key));
  // ENG-110 lọc theo cờ test: bỏ candidate mang cờ khi còn đủ DISPLAY_MIN_NODES
  const clean = cands.filter((c) => !isTestPath(c.files[0] ?? ""));
  if (clean.length >= CONFIG.DISPLAY_MIN_NODES) cands = clean;
  if (cands.length < CONFIG.DISPLAY_MIN_NODES && degraded === null) {
    const have = new Set(cands.flatMap((c) => c.functions));
    const extra = fnPool.filter((f) => !have.has(f.key) && f.complexity >= CONFIG.VIP_FALLBACK_MIN_SCORE).sort(byWeight).slice(0, CONFIG.VIP_FALLBACK_TOP_K);
    for (const f of extra) { if (cands.length >= CONFIG.DISPLAY_MIN_NODES) break; addAlgo(f.key); }
  }
  if (cands.length === 0) return { nodes: [], edges: [], warnings, omitted: 0, degraded };

  // tên gốc & id (ENG-111)
  for (const c of cands) {
    if (c.kind !== "VNODE") {
      const t = baseTitle({ binding: c.binding, entry_symbol: c.kind === "ALGO" || !c.binding ? c.entry_symbol : c.entry_symbol, files: c.files, function_keys: c.functions, file_index: [...idx.files.keys()] }, idx);
      c.base_title = t.title; c.title_source = t.source; c.title_evidence = t.evidence;
      if (c.kind === "SLICE") c.id = `slice-${slug(c.base_title)}-${hash6(c.entry_symbol ?? c.order_key)}`;
      else c.id = `algo-${slug(c.base_title)}-${hash6(c.order_key)}`;
    }
  }
  // cùng tập functions ⇒ giữ order_key nhỏ nhất (đã lọc bằng seenSets); trùng id ⇒ giữ đầu
  const byId = new Map<string, Candidate>();
  for (const c of cands.sort((a, b) => cmp(a.order_key, b.order_key))) if (!byId.has(c.id)) byId.set(c.id, c);
  cands = [...byId.values()].sort((a, b) => cmp(a.id, b.id));

  // cạnh G0 (ENG-112)
  // đến được trên đồ thị gọi hàm (BFS mọi độ sâu, visited): dựng danh sách kề 1 lần, nhớ tập đến được theo hàm xuất phát
  const adj = new Map<string, string[]>();
  for (const e of cg.edges) { const l = adj.get(e.caller) ?? []; l.push(e.callee); adj.set(e.caller, l); }
  const reachMemo = new Map<string, Set<string>>();
  const reachSet = (from: string): Set<string> => {
    const hit = reachMemo.get(from);
    if (hit) return hit;
    const seen = new Set<string>([from]);
    const q = [from];
    for (let i = 0; i < q.length; i++) for (const w of adj.get(q[i]) ?? []) if (!seen.has(w)) { seen.add(w); q.push(w); }
    reachMemo.set(from, seen);
    return seen;
  };
  const reach = (from: string, to: string): boolean => reachSet(from).has(to);
  const g0 = new Map<string, { source: string; target: string; resolved: boolean }>();
  const addPair = (a: Candidate, b: Candidate, resolved: boolean) => {
    const [s, t] = easier(a, b) <= 0 ? [a, b] : [b, a];
    const k = `${s.id}->${t.id}`;
    const cur = g0.get(k);
    if (!cur) g0.set(k, { source: s.id, target: t.id, resolved });
    else cur.resolved = cur.resolved || resolved;
  };
  for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
    const A = cands[i], B = cands[j];
    if (A.kind === "VNODE" || B.kind === "VNODE") continue;
    const common = A.functions.filter((f) => B.functions.includes(f));
    if (common.length > 0) { addPair(A, B, common.some((f) => A.resolved_paths.get(f) && B.resolved_paths.get(f))); continue; }
    const slice = A.kind === "SLICE" ? A : B.kind === "SLICE" ? B : null;
    const algo = A.kind === "ALGO" ? A : B.kind === "ALGO" ? B : null;
    if (slice && algo && slice.functions.some((f) => reach(f, algo.functions[0]))) addPair(A, B, false);
  }
  // node ảo: chuỗi theo dòng đầu mỗi nhãn, RESOLVED
  const vn = cands.filter((c) => c.kind === "VNODE").sort((a, b) => a.trace_steps[0].line_start - b.trace_steps[0].line_start);
  for (let i = 0; i + 1 < vn.length; i++) g0.set(`${vn[i].id}->${vn[i + 1].id}`, { source: vn[i].id, target: vn[i + 1].id, resolved: true });

  const ids = cands.map((c) => c.id);
  const closure = (edgesIn: Array<{ source: string; target: string }>) => {
    const out = new Map<string, Set<string>>(ids.map((i) => [i, new Set<string>()]));
    for (const e of edgesIn) out.get(e.source)?.add(e.target);
    const memo = new Map<string, Set<string>>();
    const dfs = (v: string): Set<string> => {
      if (memo.has(v)) return memo.get(v)!;
      const r = new Set<string>(); memo.set(v, r);
      for (const w of out.get(v) ?? []) { r.add(w); for (const x of dfs(w)) r.add(x); }
      return r;
    };
    ids.forEach(dfs);
    return memo;
  };
  const reduce = (edgesIn: Array<{ source: string; target: string }>) => {
    const out = new Map<string, Set<string>>(ids.map((i) => [i, new Set<string>()]));
    for (const e of edgesIn) out.get(e.source)?.add(e.target);
    const memo = closure(edgesIn);
    return edgesIn.filter((e) => ![...(out.get(e.source) ?? [])].some((m) => m !== e.target && memo.get(m)?.has(e.target)));
  };
  const g0r = reduce([...g0.values()]);

  // Display Budget (ENG-114)
  let keep = new Set(ids);
  let omitted = 0;
  const max = CONFIG.DISPLAY_MAX_NODES;
  if (ids.length > max) {
    const path = longestPath(ids, g0r, CONFIG.CRITICAL_PATH_MAX_NODES);
    const chosen = new Set<string>(path);
    const rest = cands.filter((c) => !chosen.has(c.id)).sort((a, b) =>
      Number(b.cognitive_complexity > CONFIG.VIP_COMPLEXITY_MIN) - Number(a.cognitive_complexity > CONFIG.VIP_COMPLEXITY_MIN) ||
      b.rank_score - a.rank_score || b.cognitive_complexity - a.cognitive_complexity || cmp(a.id, b.id));
    for (const c of rest) { if (chosen.size >= max) break; chosen.add(c.id); }
    keep = chosen;
    omitted = ids.length - keep.size;
    warnings.push(`${omitted} luồng khác không hiển thị trên bản đồ`);
  }
  const kept = cands.filter((c) => keep.has(c.id));

  // cạnh trên tập giữ K: rút gọn bắc cầu của quan hệ đến được trong G0
  const reachG0 = closure([...g0.values()]);
  const pairs: Array<{ source: string; target: string }> = [];
  for (const u of kept) for (const v of kept) if (u.id !== v.id && reachG0.get(u.id)?.has(v.id)) pairs.push({ source: u.id, target: v.id });
  const keptIds = new Set(kept.map((k) => k.id));
  const reducedK = (() => {
    const out = new Map<string, Set<string>>();
    for (const p of pairs) { const s = out.get(p.source) ?? new Set<string>(); s.add(p.target); out.set(p.source, s); }
    return pairs.filter((e) => ![...(out.get(e.source) ?? [])].some((m) => m !== e.target && out.get(m)?.has(e.target)));
  })();
  void keptIds;
  const direct = new Map([...g0.entries()].map(([k, v]) => [k, v.resolved]));
  let edges: GraphEdge[] = reducedK.map((e) => ({
    id: `${e.source}->${e.target}`, source: e.source, target: e.target,
    confidence: direct.get(`${e.source}->${e.target}`) ? "RESOLVED" : "INFERRED",
  }));

  // Cây bài học (ENG-115, D-73)
  edges = lessonTree(kept, edges);

  // trường node
  const rankFile = ctx.fileRank;
  const parents = new Map<string, string[]>(kept.map((k) => [k.id, []]));
  for (const e of edges) parents.get(e.target)?.push(e.source);
  const nodes: HybridArchitecturalNode[] = kept.map((c) => {
    const langs = c.languages;
    const tier = c.files.some((f) => tierOfLanguage(idx.files.get(f)?.language ?? "") === "STRUCTURAL") ? "STRUCTURAL" : "RESOLVED";
    const ub = uncleBob(c.files, idx, cg.file_graph, {
      virtual: c.kind === "VNODE", archetype: out.fingerprint.archetype,
      allJsOrNoAbs: c.files.every((f) => idx.files.get(f)?.language === "JAVASCRIPT"),
    });
    return {
      id: c.id, title: c.base_title, title_source: c.title_source, title_evidence: c.title_evidence, node_type: c.node_type,
      entry_symbol: c.kind === "VNODE" ? null : c.entry_symbol, prerequisites: (parents.get(c.id) ?? []).sort(cmp), position: { x: 0, y: 0 },
      files: c.files, languages: langs, support_tier: tier, cognitive_complexity: c.cognitive_complexity,
      rank_score: Math.round((rankFile.get(c.files[0]) ?? c.rank_score) * 10000) / 10000,
      is_vip_algorithm: c.kind === "ALGO", is_capstone: false, uncle_bob: ub,
      trace_steps: c.trace_steps.map((s, i) => ({ ...s, step_number: i + 1 })), dto_snippet: c.dto_snippet,
    };
  });
  // Capstone: trong node cuối (không có cạnh ra)
  const hasOut = new Set(edges.map((e) => e.source));
  const sinks = nodes.filter((n) => !hasOut.has(n.id));
  const pool = sinks.length ? sinks : nodes;
  const cap = [...pool].sort((a, b) => b.cognitive_complexity - a.cognitive_complexity || b.rank_score - a.rank_score || cmp(a.id, b.id))[0];
  if (cap) cap.is_capstone = true;

  // khử trùng tên (sau budget), layout
  const named = nodes.map((n) => ({ id: n.id, base_title: n.title, binding: kept.find((k) => k.id === n.id)!.binding, files: n.files, title: n.title }));
  dedupeTitles(named);
  for (const n of nodes) n.title = named.find((x) => x.id === n.id)!.title;
  const pos = layoutNodes(nodes, edges);
  for (const n of nodes) n.position = pos.get(n.id) ?? { x: 0, y: 0 };
  return { nodes: nodes.sort((a, b) => cmp(a.id, b.id)), edges: edges.sort((a, b) => cmp(a.id, b.id)), warnings, omitted, degraded };
}

/** ENG-115: nối các bài chưa có cạnh vào theo module để thành cây bài học. Cạnh thêm = INFERRED. */
function lessonTree(kept: Candidate[], edges: GraphEdge[]): GraphEdge[] {
  const slices = kept.filter((c) => c.kind === "SLICE");
  if (slices.length === 0) return edges;
  const dirOf = (f: string) => f.split("/").slice(0, -1).join("/");
  const dirs = new Set(slices.map((s) => dirOf(s.files[0])));
  const moduleOf = (f: string) => (dirs.size < 3 ? f : dirOf(f));
  const modOfSlice = (s: Candidate) => moduleOf(s.files[0]);
  const out = [...edges];
  const has = new Set(out.map((e) => e.id));
  const reachable = (from: string, to: string): boolean => {
    const seen = new Set<string>([from]); const q = [from];
    while (q.length) { const x = q.shift()!; if (x === to) return true; for (const e of out) if (e.source === x && !seen.has(e.target)) { seen.add(e.target); q.push(e.target); } }
    return false;
  };
  const addEdge = (s: string, t: string) => {
    if (s === t || has.has(`${s}->${t}`) || reachable(t, s)) return;
    if (reachable(s, t)) return;
    out.push({ id: `${s}->${t}`, source: s, target: t, confidence: "INFERRED" }); has.add(`${s}->${t}`);
  };
  const incoming = (id: string) => out.some((e) => e.target === id);
  const mods = new Map<string, Candidate[]>();
  for (const s of slices) { const l = mods.get(modOfSlice(s)) ?? []; l.push(s); mods.set(modOfSlice(s), l); }
  // A dùng B khi lát cắt của A có file thuộc B
  const uses = new Map<string, Set<string>>();
  for (const s of slices) for (const f of s.files) { const m = moduleOf(f); if (m !== modOfSlice(s)) { const set = uses.get(modOfSlice(s)) ?? new Set<string>(); set.add(m); uses.set(modOfSlice(s), set); } }
  const avg = (m: string) => { const l = mods.get(m) ?? []; return l.length ? l.reduce((a, c) => a + c.cognitive_complexity, 0) / l.length : 0; };
  const order = [...mods.keys()].sort((a, b) => (uses.get(a)?.has(b) ? 1 : uses.get(b)?.has(a) ? -1 : avg(a) - avg(b) || cmp(a, b)));
  const first = new Map<string, Candidate>();
  for (const m of order) {
    const ls = (mods.get(m) ?? []).slice().sort(easier);
    first.set(m, ls.find((l) => !incoming(l.id)) ?? ls[0]);
  }
  for (const m of order) {
    const f = first.get(m);
    if (!f) continue;
    for (const s of mods.get(m) ?? []) if (s.id !== f.id && !incoming(s.id)) addEdge(f.id, s.id);
  }
  for (const m of order) {
    const f = first.get(m);
    if (!f || incoming(f.id)) continue;
    const used = [...(uses.get(m) ?? [])].filter((x) => first.has(x)).sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
    const b = used ? first.get(used) : undefined;
    if (b && easier(b, f) < 0) addEdge(b.id, f.id);
  }
  return out;
}
