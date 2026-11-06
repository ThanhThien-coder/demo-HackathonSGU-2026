// Tính toán bố cục Dagre với hàng điểm bắt đầu trên cùng — spec 11 Mục 14, D-55.
import dagre from "@dagrejs/dagre";
import { CONFIG, type GraphEdge, type HybridArchitecturalNode } from "@/contracts";

/**
 * Gán tọa độ (position: { x, y }) cho các node trong đồ thị kiến trúc bằng Dagre.
 * Đảm bảo mọi điểm bắt đầu (prerequisites = []) nằm trên cùng một hàng trên cùng (D-55).
 */
export function layoutGraph(
  nodes: HybridArchitecturalNode[],
  edges: GraphEdge[]
): void {
  if (nodes.length === 0) return;

  const dagreInstance = (dagre as unknown as { default?: typeof dagre }).default ?? dagre;
  const g = new dagreInstance.graphlib.Graph();

  g.setGraph({
    rankdir: CONFIG.DAGRE_RANKDIR,
    ranksep: CONFIG.DAGRE_RANKSEP,
    nodesep: CONFIG.DAGRE_NODESEP,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Sắp xếp node theo id tăng dần (ENG-01). Chỉ node có cạnh vào Dagre (Mục 14 ý 1).
  const linked = new Set<string>();
  for (const e of edges) {
    linked.add(e.source);
    linked.add(e.target);
  }
  const allSorted = nodes.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const sortedNodes = allSorted.filter((n) => linked.has(n.id));
  const loneNodes = allSorted.filter((n) => !linked.has(n.id));
  for (const n of sortedNodes) {
    g.setNode(n.id, {
      width: CONFIG.NODE_BOX_WIDTH,
      height: CONFIG.NODE_BOX_HEIGHT,
    });
  }

  // Sắp xếp edge theo id tăng dần (ENG-01)
  const sortedEdges = edges.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const e of sortedEdges) {
    g.setEdge(e.source, e.target, { weight: 1, minlen: 1 });
  }

  // Hàng điểm bắt đầu (D-55):
  // Điểm bắt đầu = node có prerequisites rỗng
  const startNodes = sortedNodes.filter((n) => n.prerequisites.length === 0);
  if (startNodes.length > 0) {
    g.setNode("__start__", { width: 0, height: 0 });
    const superWeight = (edges.length + 1) * (nodes.length + 1);

    for (const r of startNodes) {
      g.setEdge("__start__", r.id, { weight: superWeight, minlen: 1 });
    }
  }

  // Chạy Dagre layout
  if (sortedNodes.length > 0) dagreInstance.layout(g);

  // Gán tọa độ cho các node thật
  for (const n of sortedNodes) {
    const pos = g.node(n.id);
    if (pos) {
      n.position = {
        x: Math.round(pos.x - CONFIG.NODE_BOX_WIDTH / 2),
        y: Math.round(pos.y - CONFIG.NODE_BOX_HEIGHT / 2),
      };
    }
  }

  // Cột Học riêng (Mục 14 ý 4)
  const hasLinked = sortedNodes.length > 0;
  const columnX = hasLinked
    ? Math.max(...sortedNodes.map((n) => n.position.x)) + CONFIG.NODE_BOX_WIDTH + CONFIG.DAGRE_NODESEP
    : 0;
  const columnY = hasLinked ? Math.min(...sortedNodes.map((n) => n.position.y)) : 0;
  loneNodes.forEach((n, i) => {
    n.position = {
      x: columnX,
      y: columnY + i * (CONFIG.NODE_BOX_HEIGHT + CONFIG.DAGRE_NODESEP),
    };
  });
}
