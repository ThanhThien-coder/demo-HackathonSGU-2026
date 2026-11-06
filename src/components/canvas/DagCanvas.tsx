"use client";
// 30 Mục 4 — ReactFlow dùng node.position từ engine (INV-10); không kéo, không nối; cạnh RESOLVED liền, INFERRED đứt.
// Mở ở cỡ đọc được quanh bài đang học: vừa khung nếu đủ to, không thì phóng quanh node đang mở / node sẵn sàng đầu tiên.
import { Background, Controls, ReactFlow, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientStaticEngineResult, NodeAnalysisView, SessionProgress } from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { topoOrder } from "@/lib/derive";
import { useTheme } from "@/components/ui/theme";
import { FlowEdge, type FlowEdgeT } from "./FlowEdge";
import { GraphNodeCard, type GraphFlowNode } from "./GraphNodeCard";

const nodeTypes = { lesson: GraphNodeCard };
const edgeTypes = { flow: FlowEdge };
type Edge = FlowEdgeT;
const READABLE_ZOOM = 0.5;
const FOCUS_ZOOM = 0.62;

export function DagCanvas({ result, progress, analyses, activeId, newlyUnlocked, onOpen, onRetry }: {
  result: ClientStaticEngineResult; progress: SessionProgress; analyses: Record<string, NodeAnalysisView | "PENDING" | "FAILED">;
  activeId: string | null; newlyUnlocked: string[]; onOpen: (id: string) => void; onRetry: (id: string) => void;
}) {
  const theme = useTheme((t) => t.theme);
  const [motion] = useState(() => typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const { nodes, edges } = useMemo(() => {
    const titleOf = new Map(result.nodes.map((n) => [n.id, n.title]));
    const nodes: GraphFlowNode[] = result.nodes.map((n) => {
      const st = progress.nodes[n.id];
      const a = analyses[n.id];
      const parents = n.prerequisites.map((p) => ({ id: p, st: progress.nodes[p] }));
      const notCleared = parents.filter((p) => !(p.st && (p.st.status === "COMPLETED" || p.st.status === "FAILED" || (p.st.status === "AVAILABLE" && p.st.analysis_failed))));
      const badParents = parents.filter((p) => p.st?.status === "FAILED" || (p.st?.status === "AVAILABLE" && p.st.analysis_failed));
      return {
        id: n.id, type: "lesson", position: n.position, draggable: false, connectable: false,
        data: {
          node: n, status: st?.status ?? "LOCKED", hasWarning: !!st?.has_warning,
          warningText: `Node trước chưa vững: ${badParents.map((p) => titleOf.get(p.id)).join(", ")}`,
          lockedHint: `Hoàn thành trước: ${notCleared.map((p) => titleOf.get(p.id)).join(", ")}`,
          analysis: a === undefined ? "NONE" : a === "PENDING" ? "PENDING" : a === "FAILED" ? "FAILED" : "READY",
          analysisFailed: !!st?.analysis_failed, active: n.id === activeId, unlocked: newlyUnlocked.includes(n.id), onOpen, onRetry,
        },
      };
    });
    const edges: Edge[] = result.edges.map((e, i) => {
      const s = progress.nodes[e.source]?.status ?? "LOCKED";
      // nét gốc: màu theo nguồn khi COMPLETED / FAILED, còn lại xám (30 Mục 4)
      const stroke = s === "COMPLETED" ? "var(--green)" : s === "FAILED" ? "var(--red)" : "var(--locked)";
      const dot = s === "COMPLETED" ? "var(--green)" : s === "FAILED" ? "var(--red)" : s === "AVAILABLE" ? "var(--amber)" : "var(--locked)";
      const hot = !!activeId && (e.source === activeId || e.target === activeId);
      return {
        id: e.id, source: e.source, target: e.target, type: "flow", animated: false,
        style: { stroke, strokeWidth: hot ? 2.4 : 1.75, strokeDasharray: e.confidence === "INFERRED" ? "6 4" : undefined, opacity: s === "LOCKED" && !hot ? 0.75 : 1 },
        ariaLabel: e.confidence === "INFERRED" ? "Cạnh suy luận — chưa bảo đảm 100%" : "Cạnh chắc chắn",
        data: { color: dot, idle: s === "LOCKED", hot, motion, delay: (i * 0.73) % 2.8 },
      };
    });
    return { nodes, edges };
  }, [result, progress, analyses, activeId, newlyUnlocked, onOpen, onRetry, motion]);

  const rfRef = useRef<ReactFlowInstance<GraphFlowNode, Edge> | null>(null);

  // Chạy 1 lần khi khung đồ thị dựng xong.
  const onInit = useCallback((rf: ReactFlowInstance<GraphFlowNode, Edge>) => {
    rfRef.current = rf;
    void rf.fitView({ padding: 0.12, maxZoom: 1 }).then(() => {
      if (rf.getZoom() >= READABLE_ZOOM) return;
      const order = topoOrder(result.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone })));
      const focusId = activeId ?? order.find((id) => progress.nodes[id]?.status === "AVAILABLE") ?? order[0];
      const n = result.nodes.find((x) => x.id === focusId);
      if (n) void rf.setCenter(n.position.x + CONFIG.NODE_BOX_WIDTH / 2, n.position.y + CONFIG.NODE_BOX_HEIGHT * 1.5, { zoom: FOCUS_ZOOM });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mở bài khác ⇒ đưa node đang mở vào giữa khung (giữ mức phóng hiện tại).
  useEffect(() => {
    const rf = rfRef.current;
    const n = activeId ? result.nodes.find((x) => x.id === activeId) : null;
    if (!rf || !n) return;
    void rf.setCenter(n.position.x + CONFIG.NODE_BOX_WIDTH / 2, n.position.y + CONFIG.NODE_BOX_HEIGHT / 2, { zoom: Math.max(rf.getZoom(), READABLE_ZOOM), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300 });
  }, [activeId, result]);

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      onInit={onInit} minZoom={0.2} maxZoom={1.5} proOptions={{ hideAttribution: true }} colorMode={theme} className="sf-flow">
      <Background gap={16} size={1} color="var(--grid-dot)" />
      <Controls showInteractive={false} position="bottom-left" aria-label="Phóng to / thu nhỏ đồ thị" />
    </ReactFlow>
  );
}
