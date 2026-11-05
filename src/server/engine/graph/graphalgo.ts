// 11 Mục 6, 12, 14, 15 — Tarjan, PageRank, Uncle Bob, Dagre layout, whitelist, mainPath.
import dagre from "@dagrejs/dagre";
import { CONFIG } from "@/contracts/config";
import type { GraphEdge, HybridArchitecturalNode, UncleBobMetrics } from "@/contracts";
import type { CallGraph } from "./callgraph";
import type { SymbolIndex } from "./model";
import { cmp } from "./model";

// ---------- Tarjan (ENG-60) ----------
export function tarjanScc(nodes: string[], adj: Map<string, string[]>): string[][] {
  const index = new Map<string, number>(), low = new Map<string, number>();
  const stack: string[] = [], on = new Set<string>();
  const out: string[][] = [];
  let i = 0;
  const strong = (v: string) => {
    index.set(v, i); low.set(v, i); i++;
    stack.push(v); on.add(v);
    for (const w of [...(adj.get(v) ?? [])].sort(cmp)) {
      if (w === v) continue;
      if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; on.delete(w); comp.push(w); } while (w !== v);
      out.push(comp.sort(cmp));
    }
  };
  for (const v of [...nodes].sort(cmp)) if (!index.has(v)) strong(v);
  return out;
}

/** ENG-62: PageRank trên DAG co cụm; file nhận điểm của SCC chứa nó. */
export function rankFiles(fg: CallGraph["file_graph"], ingressFiles: Set<string>, warnings: string[]): Map<string, number> {
  const files = [...fg.keys()].sort(cmp);
  const edges = new Map<string, Set<string>>(); // cạnh còn dùng để xếp hạng
  for (const f of files) edges.set(f, new Set(fg.get(f)!.keys()));
  const adjOf = () => new Map([...edges].map(([k, v]) => [k, [...v]]));
  let sccs = tarjanScc(files, adjOf());
  for (let removals = 0; removals <= CONFIG.GIANT_SCC_MAX_WEAK_EDGE_REMOVALS; removals++) {
    const biggest = sccs.reduce((a, b) => (b.length > a.length ? b : a), [] as string[]);
    if (biggest.length <= CONFIG.GIANT_SCC_RATIO * files.length || biggest.length <= 1) break;
    if (removals === CONFIG.GIANT_SCC_MAX_WEAK_EDGE_REMOVALS) { warnings.push(`Phát hiện cụm phụ thuộc vòng lớn (${biggest.length} file)`); break; }
    let weakest: { a: string; b: string; w: number } | null = null;
    const inSet = new Set(biggest);
    for (const a of biggest) for (const b of edges.get(a)!) if (inSet.has(b)) {
      const w = fg.get(a)!.get(b)!.weight;
      if (!weakest || w < weakest.w || (w === weakest.w && (cmp(a, weakest.a) < 0 || (a === weakest.a && cmp(b, weakest.b) < 0)))) weakest = { a, b, w };
    }
    if (!weakest) break;
    edges.get(weakest.a)!.delete(weakest.b);
    sccs = tarjanScc(files, adjOf());
  }
  const comp = new Map<string, number>();
  sccs.forEach((c, i) => c.forEach((f) => comp.set(f, i)));
  const N = sccs.length;
  const out: Array<Set<number>> = Array.from({ length: N }, () => new Set<number>());
  for (const [a, set] of edges) for (const b of set) { const ca = comp.get(a)!, cb = comp.get(b)!; if (ca !== cb) out[ca].add(cb); }
  let pr = Array(N).fill(1 / N) as number[];
  const d = CONFIG.PAGERANK_DAMPING;
  if (N > 1) for (let it = 0; it < CONFIG.PAGERANK_MAX_ITER; it++) {
    const next = Array(N).fill((1 - d) / N) as number[];
    let dangling = 0;
    for (let v = 0; v < N; v++) { if (out[v].size === 0) dangling += pr[v]; else for (const u of out[v]) next[u] += d * (pr[v] / out[v].size); }
    for (let u = 0; u < N; u++) next[u] += d * (dangling / N);
    const diff = next.reduce((a, x, i) => a + Math.abs(x - pr[i]), 0);
    pr = next;
    if (diff < CONFIG.PAGERANK_TOLERANCE) break;
  } else pr = [1];
  const rank = new Map<string, number>();
  for (const f of files) rank.set(f, pr[comp.get(f)!] + (ingressFiles.has(f) ? CONFIG.INGRESS_BONUS : 0));
  return rank;
}

// ---------- Uncle Bob (ENG-120) ----------
export function uncleBob(files: string[], idx: SymbolIndex, fg: CallGraph["file_graph"], opts: { virtual: boolean; archetype: string; allJsOrNoAbs: boolean }): UncleBobMetrics {
  const S = new Set(files);
  const ce = new Set<string>(), ca = new Set<string>();
  for (const [a, m] of fg) for (const b of m.keys()) {
    if (S.has(a) && !S.has(b)) ce.add(b);
    if (!S.has(a) && S.has(b)) ca.add(a);
  }
  let na = 0, nc = 0;
  for (const ci of idx.classes.values()) if (S.has(ci.file)) { if (ci.kind === "CLASS") nc++; else na++; }
  for (const s of idx.symbols.values()) if (S.has(s.file_path) && s.kind === "TYPE") na++;
  const exempt = opts.virtual || opts.allJsOrNoAbs || ca.size + ce.size === 0 || na + nc === 0 ||
    (["WEB_FRONTEND", "MOBILE_APP", "DESKTOP_APP"].includes(opts.archetype) && /\.(tsx|jsx|vue|svelte|dart)$/.test(files[0] ?? ""));
  if (exempt) return { instability: 0, abstractness: 0, distance: 0, diagnosis: "BALANCED", is_exempt: true };
  const I = ce.size / (ca.size + ce.size), A = na / (na + nc), D = Math.abs(A + I - 1);
  let diagnosis: UncleBobMetrics["diagnosis"] = "BALANCED";
  if (D < CONFIG.UNCLE_BOB_BALANCED_MAX_D) diagnosis = "BALANCED";
  else if (D >= CONFIG.UNCLE_BOB_ZONE_MIN_D && A + I < 1) diagnosis = "ZONE_OF_PAIN";
  else if (D >= CONFIG.UNCLE_BOB_ZONE_MIN_D && A + I > 1) diagnosis = "ZONE_OF_USELESSNESS";
  const r = (x: number) => Math.round(x * 10000) / 10000;
  return { instability: r(I), abstractness: r(A), distance: r(D), diagnosis, is_exempt: false };
}

// ---------- Layout (Mục 14) ----------
export function layoutNodes(nodes: Array<{ id: string }>, edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: CONFIG.DAGRE_RANKDIR, ranksep: CONFIG.DAGRE_RANKSEP, nodesep: CONFIG.DAGRE_NODESEP, ranker: "network-simplex" });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of [...nodes].sort((a, b) => cmp(a.id, b.id))) g.setNode(n.id, { width: CONFIG.NODE_BOX_WIDTH, height: CONFIG.NODE_BOX_HEIGHT });
  for (const e of [...edges].sort((a, b) => cmp(a.id, b.id))) g.setEdge(e.source, e.target, { weight: 1, minlen: 1 });
  const hasIn = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !hasIn.has(n.id)).map((n) => n.id).sort(cmp);
  g.setNode("__start__", { width: 0, height: 0 });
  const w = (edges.length + 1) * (nodes.length + 1);
  for (const r of roots) g.setEdge("__start__", r, { weight: w, minlen: 1 });
  dagre.layout(g);
  const out = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const p = g.node(n.id);
    out.set(n.id, { x: Math.round(p.x - CONFIG.NODE_BOX_WIDTH / 2), y: Math.round(p.y - CONFIG.NODE_BOX_HEIGHT / 2) });
  }
  return out;
}

// ---------- whitelist (D-19), mainPath (ENG-155) ----------
export function buildSymbolWhitelist(idx: SymbolIndex, finalStepFunctions: string[]): string[] {
  const set = new Set<string>();
  const add = (s: string) => { if (s && !s.includes("<")) set.add(s); };
  for (const s of idx.symbols.values()) {
    add(s.name);
    const fn = idx.functions.get(s.key);
    if (fn?.class_key) { const ci = idx.classes.get(fn.class_key); if (ci) add(`${ci.name}.${s.name}`); }
  }
  for (const n of idx.fieldNames) add(n);
  for (const ci of idx.classes.values()) { for (const m of ci.methods.keys()) { add(m); add(`${ci.name}.${m}`); } for (const f of ci.fields.keys()) add(f); }
  for (const k of finalStepFunctions) for (const l of idx.locals.get(k) ?? []) add(l);
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function longestPath(ids: string[], edges: Array<{ source: string; target: string }>, limit: number | null): string[] {
  const out = new Map<string, string[]>(), indeg = new Map<string, number>();
  for (const id of ids) { out.set(id, []); indeg.set(id, 0); }
  for (const e of edges) { out.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const order: string[] = [];
  const ready = ids.filter((i) => (indeg.get(i) ?? 0) === 0).sort(cmp);
  while (ready.length) {
    const v = ready.shift()!; order.push(v);
    for (const w of out.get(v)!.sort(cmp)) { indeg.set(w, indeg.get(w)! - 1); if (indeg.get(w) === 0) { ready.push(w); ready.sort(cmp); } }
  }
  const dist = new Map<string, number>(), prev = new Map<string, string | null>();
  for (const v of order) { dist.set(v, 1); prev.set(v, null); }
  for (const v of order) for (const w of out.get(v)!) if ((dist.get(v)! + 1) > dist.get(w)!) { dist.set(w, dist.get(v)! + 1); prev.set(w, v); }
  let best: string | null = null;
  for (const v of order) if (best === null || dist.get(v)! > dist.get(best)! || (dist.get(v) === dist.get(best) && cmp(v, best) < 0)) best = v;
  const path: string[] = [];
  for (let c: string | null = best; c; c = prev.get(c) ?? null) path.unshift(c);
  return limit ? path.slice(0, limit) : path;
}

export function mainPath(nodes: HybridArchitecturalNode[], edges: GraphEdge[]): string[] {
  if (nodes.length === 0) return [];
  return longestPath(nodes.map((n) => n.id), edges, null);
}
