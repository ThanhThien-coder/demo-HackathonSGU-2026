"use client";

import React, { useState, useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Play,
  ArrowRight,
  Lock,
  AlertTriangle,
  RefreshCw,
  Star,
} from "lucide-react";
import type { SessionProgress, NodeStatus, HybridArchitecturalNode, GraphEdge } from "@/contracts";
import { deriveNodeStates } from "@/lib/derive";

export interface GraphNodeItem {
  id: string;
  tier: number;
  x: number;
  y: number;
  cardWidth: number;
  title: string;
  subtitle: string;
  status: NodeStatus;
  pKnow: number;
  skills: string[];
  complexity: number;
  fileSnippet?: string;
  attemptsCount?: number;
  hasWarning?: boolean;
  isCapstone?: boolean;
  prerequisites?: string[];
}

export interface DynamicGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  pathD: string;
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerEnd: string;
}

interface LessonGraphDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphNodes?: HybridArchitecturalNode[] | null;
  graphEdges?: GraphEdge[] | null;
  progress?: SessionProgress | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

interface RawNodeData {
  id: string;
  title: string;
  subtitle: string;
  status: NodeStatus;
  pKnow: number;
  skills: string[];
  complexity: number;
  fileSnippet?: string;
  attemptsCount?: number;
  hasWarning?: boolean;
  isCapstone?: boolean;
  prerequisites: string[];
}

/**
 * Thuật toán bố cục phân tầng chống chồng chéo (Anti-Collision Layered Layout Engine)
 * Tự động phân tier theo topological depth của prerequisites, chia cột đều đặn:
 * - 1 node/tier: Căn giữa (x=292) hoặc thẳng hàng với nhánh cha (x=35 / x=545).
 * - 2 nodes/tier: Phân bố 2 cột (x=35 và x=545) với khoảng cách 134px tuyệt đối không đè nhau.
 * - 3+ nodes/tier: Tự động co tỉ lệ thẻ và phân bố đều trên chiều ngang canvas 959px.
 */
function computeTopologicalLayout(
  rawNodes: RawNodeData[],
  canvasWidth: number = 959,
  cardHeight: number = 100,
  rowHeight: number = 160,
  startY: number = 60
): { nodes: GraphNodeItem[]; canvasHeight: number } {
  if (rawNodes.length === 0) {
    return { nodes: [], canvasHeight: 917 };
  }

  const nodeMap = new Map<string, RawNodeData>();
  rawNodes.forEach((n) => nodeMap.set(n.id, n));

  // 1. Tính toán tier (độ sâu tô-pô DAG)
  const tierMap = new Map<string, number>();

  function getTier(nodeId: string, visited: Set<string> = new Set()): number {
    if (tierMap.has(nodeId)) return tierMap.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // chống chu trình
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node || !node.prerequisites || node.prerequisites.length === 0) {
      tierMap.set(nodeId, 0);
      return 0;
    }

    let maxParentTier = -1;
    for (const pid of node.prerequisites) {
      if (nodeMap.has(pid)) {
        maxParentTier = Math.max(maxParentTier, getTier(pid, visited));
      }
    }

    const t = maxParentTier + 1;
    tierMap.set(nodeId, t);
    return t;
  }

  rawNodes.forEach((n) => getTier(n.id));

  // 2. Nhóm các node theo từng tier
  const tiers: RawNodeData[][] = [];
  rawNodes.forEach((n) => {
    const t = tierMap.get(n.id) ?? 0;
    if (!tiers[t]) tiers[t] = [];
    tiers[t].push(n);
  });

  const compactTiers = tiers.filter((t) => t && t.length > 0);

  // 3. Gán tọa độ (x, y) và cardWidth chống va chạm
  const positionedNodes: GraphNodeItem[] = [];
  const assignedPositions = new Map<string, { x: number; y: number; cardWidth: number }>();

  compactTiers.forEach((tierNodes, tIdx) => {
    const y = startY + tIdx * rowHeight;
    const count = tierNodes.length;

    if (count === 1) {
      const node = tierNodes[0];
      const cardWidth = 376;
      let x = Math.round((canvasWidth - cardWidth) / 2); // default center (292)

      if (node.prerequisites && node.prerequisites.length > 0) {
        const parentPositions = node.prerequisites
          .map((pid) => assignedPositions.get(pid))
          .filter((p): p is { x: number; y: number; cardWidth: number } => Boolean(p));

        if (parentPositions.length > 0) {
          const avgParentCenterX =
            parentPositions.reduce((sum, p) => sum + p.x + p.cardWidth / 2, 0) /
            parentPositions.length;

          // Nếu cha nằm hoàn toàn bên trái
          if (avgParentCenterX < 350) {
            x = 35;
          } else if (avgParentCenterX > 600) {
            // Nếu cha nằm bên phải
            x = 545;
          } else {
            // Nằm giữa
            x = 292;
          }
        }
      }

      assignedPositions.set(node.id, { x, y, cardWidth });
      positionedNodes.push({
        ...node,
        tier: tIdx + 1,
        x,
        y,
        cardWidth,
      });
    } else if (count === 2) {
      const cardWidth = 376;

      // Sắp xếp sao cho node có cha bên trái ưu tiên cột trái (x=35)
      const sorted = [...tierNodes].sort((a, b) => {
        const getParentAvgX = (n: RawNodeData) => {
          const parents = (n.prerequisites || [])
            .map((pid) => assignedPositions.get(pid))
            .filter((p): p is { x: number; y: number; cardWidth: number } => Boolean(p));
          if (parents.length === 0) {
            if (n.id.includes("register") || n.id.includes("auth")) return 100;
            return 500;
          }
          return parents.reduce((sum, p) => sum + p.x + p.cardWidth / 2, 0) / parents.length;
        };
        return getParentAvgX(a) - getParentAvgX(b);
      });

      const xCoords = [35, 545];
      sorted.forEach((node, colIdx) => {
        const x = xCoords[colIdx];
        assignedPositions.set(node.id, { x, y, cardWidth });
        positionedNodes.push({
          ...node,
          tier: tIdx + 1,
          x,
          y,
          cardWidth,
        });
      });
    } else if (count === 3) {
      const cardWidth = 280;
      const xCoords = [30, 340, 650];
      tierNodes.forEach((node, colIdx) => {
        const x = xCoords[colIdx] ?? 30 + colIdx * 300;
        assignedPositions.set(node.id, { x, y, cardWidth });
        positionedNodes.push({
          ...node,
          tier: tIdx + 1,
          x,
          y,
          cardWidth,
        });
      });
    } else {
      const cardWidth = Math.max(180, Math.floor((canvasWidth - 60) / count) - 20);
      const gap = Math.floor((canvasWidth - 60 - count * cardWidth) / (count - 1));
      tierNodes.forEach((node, colIdx) => {
        const x = 30 + colIdx * (cardWidth + gap);
        assignedPositions.set(node.id, { x, y, cardWidth });
        positionedNodes.push({
          ...node,
          tier: tIdx + 1,
          x,
          y,
          cardWidth,
        });
      });
    }
  });

  const maxBottom = positionedNodes.reduce((max, n) => Math.max(max, n.y + cardHeight), 0);
  const canvasHeight = Math.max(917, maxBottom + 80);

  return { nodes: positionedNodes, canvasHeight };
}

export function LessonGraphDrawer({
  isOpen,
  onClose,
  graphNodes,
  graphEdges,
  progress,
  isLoading = false,
  errorMessage = null,
  onRetry,
  selectedNodeId,
  onSelectNode,
}: LessonGraphDrawerProps) {
  const [scale, setScale] = useState(1);

  // 1. Phân giải node & trạng thái BKT/Analysis, sau đó tính layout chống chồng chéo
  const { nodes, canvasHeight } = useMemo(() => {
    if (graphNodes && graphNodes.length > 0) {
      const skeleton = graphNodes.map((n) => ({
        node_id: n.id,
        title: n.title,
        is_capstone: Boolean(n.is_capstone),
        prerequisites: n.prerequisites || [],
      }));

      const progressRows = progress?.nodes
        ? Object.values(progress.nodes).map((p) => ({
            node_id: p.node_id,
            status: p.status === "LOCKED" ? null : p.status,
            analysis_failed: Boolean(p.analysis_failed),
          }))
        : [];

      const derivedStates = deriveNodeStates(skeleton, progressRows);

      const rawList: RawNodeData[] = graphNodes.map((node, index) => {
        const derived = derivedStates[node.id];
        const apiNode = progress?.nodes?.[node.id];
        const status =
          derived?.status ||
          apiNode?.status ||
          (index === 0 ? "AVAILABLE" : "LOCKED");
        const hasWarning = derived?.has_warning || apiNode?.has_warning || false;

        return {
          id: node.id,
          title: node.title,
          subtitle:
            node.title_evidence || node.entry_symbol || node.files?.[0] || "",
          status,
          pKnow:
            status === "COMPLETED" ? 0.95 : status === "AVAILABLE" ? 0.75 : 0.0,
          skills: node.languages || ["BACKEND"],
          complexity: node.cognitive_complexity || 5,
          fileSnippet: node.files?.[0] || "",
          attemptsCount:
            apiNode?.last_run?.questions?.reduce(
              (acc, q) => acc + q.attempts_used,
              0
            ) || 0,
          hasWarning,
          isCapstone: Boolean(node.is_capstone),
          prerequisites: node.prerequisites || [],
        };
      });

      return computeTopologicalLayout(rawList);
    }

return computeTopologicalLayout([]);
  }, [graphNodes, progress]);

  // 2. Tính toán danh sách đường cong nối có hướng (Dynamic Bézier Edges)
  const edges: DynamicGraphEdge[] = useMemo(() => {
    const nodeMap = new Map<string, GraphNodeItem>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const edgePairs: { source: string; target: string }[] = [];
    const seenEdges = new Set<string>();

    const addEdge = (source: string, target: string) => {
      const key = `${source}->${target}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        edgePairs.push({ source, target });
      }
    };

    // Nguồn cạnh 1: graphEdges truyền vào
    if (graphEdges && graphEdges.length > 0) {
      graphEdges.forEach((e) => addEdge(e.source, e.target));
    }

    // Nguồn cạnh 2: prerequisites của từng node
    nodes.forEach((targetNode) => {
      if (targetNode.prerequisites && targetNode.prerequisites.length > 0) {
        targetNode.prerequisites.forEach((srcId) => addEdge(srcId, targetNode.id));
      }
    });

    const result: DynamicGraphEdge[] = [];

    edgePairs.forEach(({ source, target }) => {
      const sNode = nodeMap.get(source);
      const tNode = nodeMap.get(target);
      if (!sNode || !tNode) return;

      const sx = sNode.x + sNode.cardWidth / 2;
      const sy = sNode.y + 100; // Đáy của node nguồn
      const tx = tNode.x + tNode.cardWidth / 2;
      const ty = tNode.y; // Đỉnh của node đích

      let pathD: string;
      if (Math.abs(sx - tx) < 5) {
        pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      } else {
        const midY = (sy + ty) / 2;
        pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
      }

      // Màu sắc & marker theo trạng thái học tập
      const isBothCompleted = sNode.status === "COMPLETED" && tNode.status === "COMPLETED";
      const isNextAvailable = sNode.status === "COMPLETED" && tNode.status === "AVAILABLE";

      let strokeColor = "#C0C0C0";
      let strokeWidth = 2;
      let strokeDasharray: string | undefined = "4,4";
      let markerEnd = "url(#arrow_locked)";

      if (isBothCompleted) {
        strokeColor = "#047857";
        strokeWidth = 2.5;
        strokeDasharray = undefined;
        markerEnd = "url(#arrow_completed)";
      } else if (isNextAvailable) {
        strokeColor = "#FF9640";
        strokeWidth = 2.5;
        strokeDasharray = "5,4";
        markerEnd = "url(#arrow_active)";
      }

      result.push({
        id: `${source}->${target}`,
        sourceId: source,
        targetId: target,
        pathD,
        strokeColor,
        strokeWidth,
        strokeDasharray,
        markerEnd,
      });
    });

    return result;
  }, [nodes, graphEdges]);

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleZoomIn = () => setScale((s) => Math.min(1.4, s + 0.1));
  const handleZoomOut = () => setScale((s) => Math.max(0.7, s - 0.1));
  const handleReset = () => setScale(1);

  const handleNodeClick = (node: GraphNodeItem) => {
    if (node.status === "LOCKED") return;
    if (onSelectNode) {
      onSelectNode(node.id);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      size="full"
      className="max-w-[980px] w-full p-0 flex flex-col bg-[#ffffff] border-r border-[#C0C0C0] shadow-2xl overflow-hidden"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#fff0e4] border border-[#ff9640]/30 shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 98 76"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#A54200]"
              >
                <path
                  d="M57.1 13V21.3333H46.3V49.1111H40.9V40.7778H22V63H40.9V54.6667H57.1V63H76V40.7778H57.1V49.1111H51.7V26.8889H57.1V35.2222H76V13H57.1ZM62.5 46.3333H70.6V57.4444H62.5V46.3333ZM62.5 18.5556H70.6V29.6667H62.5V18.5556ZM27.4 46.3333H35.5V57.4444H27.4V46.3333Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#131b2e] text-xl tracking-tight">
                  Đồ thị bài học
                </span>
                {isLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#944b00] font-bold bg-[#ffdcc5] px-2 py-0.5 rounded-full animate-pulse">
                    <RefreshCw className="size-3 animate-spin" />
                    Đang đồng bộ...
                  </span>
                )}
              </div>
            </div>
          </div>

          {progress && (
            <div className="text-xs text-[#554337] font-semibold bg-[#f2f3ff] px-3 py-1.5 rounded-full border border-[#eaedff]">
              Tokens đã dùng: <span className="font-bold text-[#ff9640]">{progress.tokens_used.toLocaleString("vi-VN")}</span> / 200.000
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full bg-[#fafbfc]">
        {/* Error State Banner */}
        {errorMessage && (
          <div className="bg-[#fff0f0] border-b border-[#ffd2d2] px-6 py-2.5 flex items-center justify-between text-xs text-[#c50000]">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="bg-white hover:bg-gray-50 border border-[#ffd2d2] text-[#c50000] font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1"
              >
                <RefreshCw className="size-3" />
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* Controls Bar & Legend Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#eaedff] bg-white text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-[#131b2e]">
              <span className="size-3.5 rounded-full bg-[#047857]" />
              <span>Hoàn thành (COMPLETED)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-[#131b2e]">
              <span className="size-3.5 rounded-full bg-[#FF9640] animate-pulse" />
              <span>Sẵn sàng học (AVAILABLE)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-[#71717a]">
              <span className="size-3.5 rounded-full bg-[#C0C0C0]" />
              <span>Chưa mở khóa (LOCKED)</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-lg border border-[#e4e4e7]">
            <button
              onClick={handleZoomOut}
              type="button"
              title="Thu nhỏ"
              className="p-1.5 rounded text-[#52525b] hover:bg-white hover:text-black transition"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-[#52525b]">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              type="button"
              title="Phóng to"
              className="p-1.5 rounded text-[#52525b] hover:bg-white hover:text-black transition"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              onClick={handleReset}
              type="button"
              title="Đặt lại khung nhìn"
              className="p-1.5 rounded text-[#52525b] hover:bg-white hover:text-black transition border-l border-[#e4e4e7] ml-1"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Node Quick Info Bar */}
        {activeNode && (
          <div
            className={`px-6 py-3.5 border-b transition-colors flex items-center justify-between shrink-0 ${
              activeNode.status === "AVAILABLE"
                ? "bg-[#fff7ed] border-[#fed7aa]"
                : activeNode.status === "COMPLETED"
                ? "bg-[#ecfdf5] border-[#a7f3d0]"
                : "bg-white border-[#f1f5f9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                  activeNode.status === "AVAILABLE"
                    ? "bg-[#ff9640] text-white"
                    : activeNode.status === "COMPLETED"
                    ? "bg-[#047857] text-white"
                    : "bg-[#e2e8f0] text-[#64748b]"
                }`}
              >
                {activeNode.status === "COMPLETED" ? (
                  <Check className="size-4 stroke-[3]" />
                ) : activeNode.status === "AVAILABLE" ? (
                  <Play className="size-4 fill-white translate-x-0.5" />
                ) : (
                  <Lock className="size-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0f172a]">
                    {activeNode.title}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    ({activeNode.id})
                  </span>
                  {activeNode.isCapstone && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-[#fef3c7] text-[#b45309] px-1.5 py-0.5 rounded font-bold border border-[#fde68a]">
                      <Star className="size-3 fill-[#b45309]" /> Capstone
                    </span>
                  )}
                  {activeNode.hasWarning && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      <AlertTriangle className="size-3" /> Cảnh báo
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#475569]">{activeNode.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeNode.status !== "LOCKED" && (
                <button
                  onClick={() => {
                    handleNodeClick(activeNode);
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-[#ff9640] hover:bg-[#e07f2e] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{activeNode.status === "COMPLETED" ? "Xem lại bài học" : "Tiếp tục học"}</span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Graph Canvas Container (959px x adaptive coordinate space) */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center">
          <div
            className="transition-transform duration-150 origin-top"
            style={{ transform: `scale(${scale})` }}
          >
            <div
              className="relative bg-white rounded-r-[10px] border border-[#C0C0C0] shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden select-none"
              style={{ width: 959, height: canvasHeight }}
            >
              <svg
                width={959}
                height={canvasHeight}
                viewBox={`0 0 959 ${canvasHeight}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                {/* SVG Definitions */}
                <defs>
                  <filter
                    id="node_shadow"
                    x="-10%"
                    y="-20%"
                    width="120%"
                    height="150%"
                    filterUnits="userSpaceOnUse"
                  >
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="8"
                      floodOpacity="0.06"
                      floodColor="#000000"
                    />
                  </filter>

                  <marker
                    id="arrow_completed"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#047857" />
                  </marker>
                  <marker
                    id="arrow_active"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FF9640" />
                  </marker>
                  <marker
                    id="arrow_locked"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C0C0C0" />
                  </marker>
                </defs>

                {/* Connecting Directed Edges (Dynamic Bézier Paths) */}
                <g className="edges">
                  {edges.map((edge) => (
                    <path
                      key={edge.id}
                      d={edge.pathD}
                      stroke={edge.strokeColor}
                      strokeWidth={edge.strokeWidth}
                      fill="none"
                      strokeDasharray={edge.strokeDasharray}
                      markerEnd={edge.markerEnd}
                      className="transition-all duration-300"
                    />
                  ))}
                </g>

                {/* Capsule Nodes */}
                <g className="nodes">
                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isCompleted = node.status === "COMPLETED";
                    const isAvailable = node.status === "AVAILABLE";
                    const isLocked = node.status === "LOCKED";
                    const isFailed = node.status === "FAILED";

                    const strokeColor = isCompleted
                      ? "#047857"
                      : isAvailable
                      ? "#FF9640"
                      : isFailed
                      ? "#EF4444"
                      : "#C0C0C0";

                    const cardBg = isCompleted ? "#047857" : "#FFFFFF";
                    const iconBg = isCompleted
                      ? "#FFFFFF"
                      : isAvailable
                      ? "#fff7ed"
                      : isFailed
                      ? "#fee2e2"
                      : "#f8fafc";
                    const iconColor = isCompleted
                      ? "#047857"
                      : isAvailable
                      ? "#FF9640"
                      : isFailed
                      ? "#EF4444"
                      : "#94a3b8";
                    const titleColor = isCompleted ? "#FFFFFF" : "#131B2E";
                    const subtitleColor = isCompleted ? "#E6F4EA" : "#625E56";

                    const maxTitleChars = node.cardWidth < 300 ? 18 : 28;
                    const maxSubtitleChars = node.cardWidth < 300 ? 22 : 34;

                    return (
                      <g
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className={`transition-all duration-200 ease-out ${
                          isLocked
                            ? "cursor-not-allowed opacity-80"
                            : "cursor-pointer group hover:-translate-y-1.5 active:translate-y-0"
                        }`}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        filter="url(#node_shadow)"
                      >
                        {/* Pulse ring for Available / Active Node */}
                        {isAvailable && (
                          <rect
                            x={node.x - 3}
                            y={node.y - 3}
                            width={node.cardWidth + 6}
                            height={106}
                            rx={53}
                            fill="none"
                            stroke="#FF9640"
                            strokeWidth="2"
                            opacity="0.4"
                            className="animate-pulse"
                          />
                        )}

                        {/* Main Capsule Body */}
                        <rect
                          x={node.x}
                          y={node.y}
                          width={node.cardWidth}
                          height={100}
                          rx={50}
                          fill={cardBg}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 2}
                          className={
                            isCompleted
                              ? "transition-all duration-200 group-hover:brightness-105"
                              : "transition-all duration-200 group-hover:brightness-[0.98]"
                          }
                        />

                        {/* Left Circular Status Icon */}
                        <circle
                          cx={node.x + 48}
                          cy={node.y + 50}
                          r={24}
                          fill={iconBg}
                          stroke={isCompleted ? "#FFFFFF" : strokeColor}
                          strokeWidth="1.5"
                        />

                        {/* Icon glyph */}
                        {isCompleted && (
                          <path
                            d={`M ${node.x + 41} ${node.y + 50} L ${node.x + 46} ${node.y + 55} L ${node.x + 55} ${node.y + 44}`}
                            stroke={iconColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        )}
                        {isAvailable && (
                          <path
                            d={`M ${node.x + 44} ${node.y + 42} L ${node.x + 55} ${node.y + 50} L ${node.x + 44} ${node.y + 58} Z`}
                            fill={iconColor}
                          />
                        )}
                        {isLocked && (
                          <g transform={`translate(${node.x + 41}, ${node.y + 42})`}>
                            <rect
                              x="1"
                              y="7"
                              width="12"
                              height="8"
                              rx="1.5"
                              fill={iconColor}
                            />
                            <path
                              d="M 3.5 7 V 4.5 C 3.5 2.5, 10.5 2.5, 10.5 4.5 V 7"
                              stroke={iconColor}
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </g>
                        )}
                        {isFailed && (
                          <path
                            d={`M ${node.x + 42} ${node.y + 42} L ${node.x + 54} ${node.y + 58} M ${node.x + 54} ${node.y + 42} L ${node.x + 42} ${node.y + 58}`}
                            stroke={iconColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Node Title */}
                        <text
                          x={node.x + 86}
                          y={node.y + 43}
                          fill={titleColor}
                          fontSize="13.5"
                          fontWeight="700"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {node.title.length > maxTitleChars
                            ? node.title.slice(0, maxTitleChars - 1) + "..."
                            : node.title}
                        </text>

                        {/* Subtitle */}
                        <text
                          x={node.x + 86}
                          y={node.y + 64}
                          fill={subtitleColor}
                          fontSize="11.5"
                          fontWeight="400"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {node.subtitle.length > maxSubtitleChars
                            ? node.subtitle.slice(0, maxSubtitleChars - 1) + "..."
                            : node.subtitle}
                        </text>

                        {/* Right Tag / Badge */}
                        <rect
                          x={node.x + node.cardWidth - 76}
                          y={node.y + 38}
                          width={58}
                          height={24}
                          rx={12}
                          fill={
                            isCompleted
                              ? "rgba(255,255,255,0.2)"
                              : isAvailable
                              ? "#fff0e4"
                              : "#f1f5f9"
                          }
                        />
                        <text
                          x={node.x + node.cardWidth - 47}
                          y={node.y + 54}
                          textAnchor="middle"
                          fill={
                            isCompleted
                              ? "#FFFFFF"
                              : isAvailable
                              ? "#944b00"
                              : "#64748b"
                          }
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          T{node.tier}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
