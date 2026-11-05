// 03 Mục 5.1 — suy ra trạng thái node. Hàm thuần, dùng chung server và client.
import type { GraphSkeletonNode, NodeStateView, NodeStatus } from "@/contracts";

export interface ProgressRow {
  node_id: string;
  status: "AVAILABLE" | "COMPLETED" | "FAILED" | null;
  analysis_failed: boolean;
}

export type DerivedNodeState = Pick<NodeStateView, "node_id" | "status" | "has_warning" | "analysis_failed">;

/** Thứ tự tô-pô (Kahn); hòa ⇒ node_id tăng dần. Node nằm trong vòng (không nên có) được nối cuối. */
export function topoOrder(skeleton: GraphSkeletonNode[]): string[] {
  const ids = new Set(skeleton.map((n) => n.node_id));
  const indeg = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const n of skeleton) {
    const parents = n.prerequisites.filter((p) => ids.has(p));
    indeg.set(n.node_id, parents.length);
    for (const p of parents) {
      const list = children.get(p) ?? [];
      list.push(n.node_id);
      children.set(p, list);
    }
  }
  const ready = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id).sort();
  const out: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    out.push(id);
    for (const c of (children.get(id) ?? []).sort()) {
      const d = (indeg.get(c) ?? 0) - 1;
      indeg.set(c, d);
      if (d === 0) {
        ready.push(c);
        ready.sort();
      }
    }
  }
  const rest = [...ids].filter((id) => !out.includes(id)).sort();
  return [...out, ...rest];
}

export function deriveNodeStates(
  skeleton: GraphSkeletonNode[],
  progressRows: ProgressRow[],
): Record<string, DerivedNodeState> {
  const byId = new Map(skeleton.map((n) => [n.node_id, n]));
  const rows = new Map(progressRows.map((r) => [r.node_id, r]));
  const result: Record<string, DerivedNodeState> = {};
  // "đã thông": COMPLETED / FAILED, hoặc AVAILABLE kèm analysis_failed (D-03)
  const passedViaAnalysis = (s: DerivedNodeState) => s.status === "AVAILABLE" && s.analysis_failed;
  const cleared = (s: DerivedNodeState | undefined) =>
    !!s && (s.status === "COMPLETED" || s.status === "FAILED" || passedViaAnalysis(s));

  for (const id of topoOrder(skeleton)) {
    const node = byId.get(id)!;
    const row = rows.get(id);
    const parents = node.prerequisites.filter((p) => byId.has(p)).map((p) => result[p]);
    const analysisFailed = row?.analysis_failed ?? false;
    let status: NodeStatus;
    if (row?.status) status = row.status;
    else status = parents.every((p) => cleared(p)) ? "AVAILABLE" : "LOCKED";
    const hasWarning =
      status !== "LOCKED" && parents.some((p) => p && (p.status === "FAILED" || passedViaAnalysis(p)));
    result[id] = { node_id: id, status, has_warning: hasWarning, analysis_failed: analysisFailed };
  }
  return result;
}
