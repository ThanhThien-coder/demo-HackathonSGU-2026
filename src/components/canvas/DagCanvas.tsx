"use client";
// 30 Mục 4 — ReactFlow dùng node.position từ engine (INV-10); không kéo, không nối; cạnh RESOLVED liền, INFERRED đứt.
import { Background, Controls, ReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { ClientStaticEngineResult, NodeAnalysisView, SessionProgress } from "@/contracts";
import { GraphNodeCard, type GraphFlowNode } from "./GraphNodeCard";

const nodeTypes = { lesson: GraphNodeCard };

export function DagCanvas({ result, progress, analyses, activeId, newlyUnlocked, onOpen, onRetry }: {
  result: ClientStaticEngineResult; progress: SessionProgress; analyses: Record<string, NodeAnalysisView | "PENDING" | "FAILED">;
  activeId: string | null; newlyUnlocked: string[]; onOpen: (id: string) => void; onRetry: (id: string) => void;
}) {
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
    const edges: Edge[] = result.edges.map((e) => {
      const s = progress.nodes[e.source]?.status;
      const color = s === "COMPLETED" ? "#10B981" : s === "FAILED" ? "#EF4444" : "#475569";
      return {
        id: e.id, source: e.source, target: e.target, type: "smoothstep", animated: false,
        style: { stroke: color, strokeWidth: 2, strokeDasharray: e.confidence === "INFERRED" ? "6 4" : undefined },
        ariaLabel: e.confidence === "INFERRED" ? "Cạnh suy luận — chưa bảo đảm 100%" : "Cạnh chắc chắn",
      };
    });
    return { nodes, edges };
  }, [result, progress, analyses, activeId, newlyUnlocked, onOpen, onRetry]);

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} minZoom={0.2} proOptions={{ hideAttribution: true }} colorMode="dark">
      <Background gap={24} color="rgba(148,163,184,.12)" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
