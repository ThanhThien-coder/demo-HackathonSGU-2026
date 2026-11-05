// ENG-155 trên client (0 API): lộ trình học chính từ result.nodes + result.edges. Hòa ⇒ id nhỏ hơn.
import type { ClientStaticEngineResult } from "@/contracts";

export function mainPath(result: Pick<ClientStaticEngineResult, "nodes" | "edges">): string[] {
  const ids = result.nodes.map((n) => n.id);
  if (ids.length === 0) return [];
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]));
  for (const e of result.edges) { out.get(e.source)?.push(e.target); indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1); }
  const order: string[] = [];
  const ready = ids.filter((i) => indeg.get(i) === 0).sort();
  while (ready.length) {
    const v = ready.shift()!;
    order.push(v);
    for (const w of [...(out.get(v) ?? [])].sort()) { indeg.set(w, indeg.get(w)! - 1); if (indeg.get(w) === 0) { ready.push(w); ready.sort(); } }
  }
  const dist = new Map<string, number>(order.map((v) => [v, 1]));
  const prev = new Map<string, string | null>(order.map((v) => [v, null]));
  for (const v of order) for (const w of out.get(v) ?? []) if (dist.get(v)! + 1 > dist.get(w)!) { dist.set(w, dist.get(v)! + 1); prev.set(w, v); }
  let best: string | null = null;
  for (const v of order) if (best === null || dist.get(v)! > dist.get(best)! || (dist.get(v) === dist.get(best) && v < best)) best = v;
  const path: string[] = [];
  for (let c: string | null = best; c; c = prev.get(c) ?? null) path.unshift(c);
  return path;
}
