"use client";

import React, { useMemo, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BaseEdge,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { GraphNodeCard, type GraphNodeCardData } from "./GraphNodeCard";
import { CanvasToolbar } from "./CanvasToolbar";
import type {
  HybridArchitecturalNode,
  GraphEdge,
  SessionProgress,
  ClientWorkbenchState,
  ProjectFingerprint,
  ClientStaticEngineResult,
  NodeStatus,
} from "@/contracts";

export interface DagCanvasProps {
  nodes: HybridArchitecturalNode[];
  edges: GraphEdge[];
  progress: SessionProgress | null;
  analyses: ClientWorkbenchState["analyses"];
  activeNodeId: string | null;
  fingerprint?: ProjectFingerprint;
  report?: ClientStaticEngineResult["ingestion_report"];
  onSelectNode: (id: string) => void;
  onRetry: (id: string) => void;
}

export interface CustomEdgeData {
  confidence: "RESOLVED" | "INFERRED";
  sourceStatus?: NodeStatus;
  [key: string]: unknown;
}

/**
 * Custom Edge:
 * getBezierPath + BaseEdge. RESOLVED nét liền, INFERRED strokeDasharray kèm <title> "Cạnh suy luận — chưa bảo đảm 100%".
 * Màu theo trạng thái node nguồn khi COMPLETED hoặc FAILED, còn lại xám. Không dùng animated.
 */
function CustomDagEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<Edge<CustomEdgeData>>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceStatus = data?.sourceStatus ?? "LOCKED";
  const confidence = data?.confidence ?? "RESOLVED";

  let strokeColor = "#94a3b8"; // Mặc định xám
  if (sourceStatus === "COMPLETED") {
    strokeColor = "#059669"; // Xanh
  } else if (sourceStatus === "FAILED") {
    strokeColor = "#dc2626"; // Đỏ
  }

  const strokeDasharray = confidence === "INFERRED" ? "5 5" : undefined;

  return (
    <g className="react-flow__edge-custom">
      {confidence === "INFERRED" && (
        <title>Cạnh suy luận — chưa bảo đảm 100%</title>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray,
        }}
        markerEnd={markerEnd}
      />
    </g>
  );
}

// nodeTypes, edgeTypes khai ở ngoài component
const nodeTypes = {
  graphNode: GraphNodeCard,
};

const edgeTypes = {
  customEdge: CustomDagEdge,
};

function DagCanvasInner({
  nodes,
  edges,
  progress,
  analyses,
  activeNodeId,
  fingerprint,
  report,
  onSelectNode,
  onRetry,
}: DagCanvasProps) {
  const { fitView } = useReactFlow();

  // Gọi fitView() sau mỗi lần component mount và mỗi lần số node đổi (T32)
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.08, duration: 200 });
    }, 60);
    return () => clearTimeout(timer);
  }, [nodes.length, fitView]);

  // Vị trí node lấy đúng node.position (INV-10), không tự tính layout
  const reactFlowNodes = useMemo<Node<GraphNodeCardData>[]>(() => {
    const nodeMap = new Map<string, HybridArchitecturalNode>();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    return nodes.map((node) => {
      // blockedBy của node = tên các node cha có status khác COMPLETED và FAILED
      const prereqs = node.prerequisites || [];
      const blockedBy: string[] = [];
      for (const pid of prereqs) {
        const parent = nodeMap.get(pid);
        const parentStatus = progress?.nodes?.[pid]?.status ?? "LOCKED";
        if (parentStatus !== "COMPLETED" && parentStatus !== "FAILED") {
          blockedBy.push(parent?.title ?? pid);
        }
      }

      return {
        id: node.id,
        type: "graphNode",
        position: { x: node.position.x, y: node.position.y },
        data: {
          node,
          state: progress?.nodes?.[node.id],
          analysis: analyses[node.id],
          active: activeNodeId === node.id,
          blockedBy,
          onSelect: onSelectNode,
          onRetry,
        },
      };
    });
  }, [nodes, progress, analyses, activeNodeId, onSelectNode, onRetry]);

  const reactFlowEdges = useMemo<Edge<CustomEdgeData>[]>(() => {
    return edges.map((e) => {
      const sourceStatus = progress?.nodes?.[e.source]?.status ?? "LOCKED";
      return {
        id: e.id || `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: "customEdge",
        data: {
          confidence: e.confidence,
          sourceStatus,
        },
      };
    });
  }, [edges, progress]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Hiện CanvasToolbar phía trên khi có fingerprint và report */}
      {fingerprint && report && (
        <CanvasToolbar
          fingerprint={fingerprint}
          report={report}
          nodeCount={nodes.length}
        />
      )}

      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background color="#cbd5e1" gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function DagCanvas(props: DagCanvasProps) {
  return (
    <ReactFlowProvider>
      <DagCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
