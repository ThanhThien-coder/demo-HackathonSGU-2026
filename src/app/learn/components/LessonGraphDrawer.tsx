"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import type { SessionProgress, NodeStatus } from "@/contracts";

export interface GraphNodeItem {
  id: string;
  tier: number;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  status: NodeStatus;
  pKnow: number;
  skills: string[];
  complexity: number;
  fileSnippet?: string;
  attemptsCount?: number;
  hasWarning?: boolean;
}

const DEFAULT_GRAPH_NODES: GraphNodeItem[] = [
  {
    id: "slice-auth-login",
    tier: 1,
    x: 292,
    y: 63,
    title: "Xác thực Đăng nhập",
    subtitle: "Hàm xử lý đăng nhập & cấp JWT token",
    status: "COMPLETED",
    pKnow: 0.95,
    skills: ["AUTH_FLOW", "JWT_SECURITY"],
    complexity: 3,
    fileSnippet: "src/auth/auth.service.ts",
  },
  {
    id: "slice-catalog-browse",
    tier: 2,
    x: 35,
    y: 223,
    title: "Duyệt Danh mục Sản phẩm",
    subtitle: "Hàm lấy danh sách & lọc sản phẩm",
    status: "COMPLETED",
    pKnow: 0.88,
    skills: ["QUERY_BUILDER", "PAGINATION"],
    complexity: 4,
    fileSnippet: "src/catalog/catalog.service.ts",
  },
  {
    id: "slice-order-checkout",
    tier: 2,
    x: 545,
    y: 223,
    title: "OrderService.processCheckout",
    subtitle: "Trừ kho lặp tuần tự (N+1 Query bottleneck)",
    status: "AVAILABLE",
    pKnow: 0.75,
    skills: ["DB_OPTIMIZATION", "TRANSACTIONS", "FEYNMAN_ANALOGY"],
    complexity: 7,
    fileSnippet: "src/services/order.service.ts",
  },
  {
    id: "slice-promo-apply",
    tier: 3,
    x: 35,
    y: 383,
    title: "Áp Mã Khuyến mãi",
    subtitle: "Hàm tính toán coupon & chiết khấu",
    status: "LOCKED",
    pKnow: 0.0,
    skills: ["BUSINESS_RULES", "DISCOUNT_ENGINE"],
    complexity: 5,
    fileSnippet: "src/promo/promo.service.ts",
  },
  {
    id: "slice-inventory-reserve",
    tier: 3,
    x: 545,
    y: 383,
    title: "Giữ Hàng & Trừ Kho (Bulk)",
    subtitle: "Gộp UPDATE hàng loạt trong transaction",
    status: "LOCKED",
    pKnow: 0.0,
    skills: ["BATCH_PROCESSING", "LOCKING_STRATEGY"],
    complexity: 8,
    fileSnippet: "src/repos/inventory.repo.ts",
  },
  {
    id: "slice-payment-gateway",
    tier: 4,
    x: 35,
    y: 543,
    title: "Thanh toán Payment Gateway",
    subtitle: "Xử lý Webhook & hoàn tất đơn hàng",
    status: "LOCKED",
    pKnow: 0.0,
    skills: ["IDEMPOTENCY", "WEBHOOK_SECURITY"],
    complexity: 8,
    fileSnippet: "src/payment/gateway.adapter.ts",
  },
  {
    id: "slice-shipping-dijkstra",
    tier: 4,
    x: 545,
    y: 543,
    title: "Tìm Đường Giao hàng (Dijkstra)",
    subtitle: "Thuật toán tìm chặng giao vận tối ưu",
    status: "LOCKED",
    pKnow: 0.0,
    skills: ["GRAPH_ALGORITHMS", "DIJKSTRA_SHORTEST_PATH"],
    complexity: 9,
    fileSnippet: "src/logistics/routing.engine.ts",
  },
  {
    id: "scc-user-order-cluster",
    tier: 5,
    x: 292,
    y: 703,
    title: "Hồ sơ ⇄ Lịch sử Đơn",
    subtitle: "Cụm thành phần liên thông mạnh (SCC)",
    status: "LOCKED",
    pKnow: 0.0,
    skills: ["DATA_AGGREGATION", "SCC_ANALYSIS"],
    complexity: 6,
    fileSnippet: "src/analytics/customer-history.ts",
  },
];

interface LessonGraphDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  progress?: SessionProgress | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export function LessonGraphDrawer({
  isOpen,
  onClose,
  progress,
  isLoading = false,
  errorMessage = null,
  onRetry,
  selectedNodeId,
  onSelectNode,
}: LessonGraphDrawerProps) {
  const [scale, setScale] = useState(1);

  // Merge progress from API into nodes
  const nodes: GraphNodeItem[] = DEFAULT_GRAPH_NODES.map((base) => {
    const apiNode = progress?.nodes?.[base.id];
    if (apiNode) {
      return {
        ...base,
        status: apiNode.status,
        hasWarning: apiNode.has_warning,
        attemptsCount: apiNode.last_run?.questions?.reduce((acc, q) => acc + q.attempts_used, 0) || 0,
      };
    }
    return base;
  });

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

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

        {/* Graph Canvas Container (959px x 917px coordinate space) */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center">
          <div
            className="transition-transform duration-150 origin-top"
            style={{ transform: `scale(${scale})` }}
          >
            <div className="relative w-[959px] h-[917px] bg-white rounded-r-[10px] border border-[#C0C0C0] shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden select-none">
              <svg
                width="959"
                height="917"
                viewBox="0 0 959 917"
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

                {/* Connecting Directed Edges */}
                <g className="edges">
                  <path
                    d="M 400 163 C 350 190, 260 190, 223 223"
                    stroke="#047857"
                    strokeWidth="2.5"
                    fill="none"
                    markerEnd="url(#arrow_completed)"
                  />
                  <path
                    d="M 560 163 C 610 190, 700 190, 733 223"
                    stroke="#FF9640"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="5,4"
                    markerEnd="url(#arrow_active)"
                  />
                  <path
                    d="M 223 323 L 223 383"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                  <path
                    d="M 733 323 L 733 383"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                  <path
                    d="M 223 483 L 223 543"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                  <path
                    d="M 733 483 L 733 543"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                  <path
                    d="M 223 643 C 260 675, 360 680, 410 703"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                  <path
                    d="M 733 643 C 700 675, 600 680, 550 703"
                    stroke="#C0C0C0"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    fill="none"
                    markerEnd="url(#arrow_locked)"
                  />
                </g>

                {/* Capsule Nodes */}
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

                  return (
                    <g
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`transition-all duration-200 ease-out ${
                        isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer group hover:-translate-y-1.5 active:translate-y-0"
                      }`}
                      style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      filter="url(#node_shadow)"
                    >
                      {/* Pulse ring for Available / Active Node */}
                      {isAvailable && (
                        <rect
                          x={node.x - 3}
                          y={node.y - 3}
                          width={382}
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
                        width={376}
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
                        {node.title.length > 28
                          ? node.title.slice(0, 27) + "..."
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
                        {node.subtitle.length > 34
                          ? node.subtitle.slice(0, 33) + "..."
                          : node.subtitle}
                      </text>

                      {/* Right Tag / Badge */}
                      <rect
                        x={node.x + 300}
                        y={node.y + 38}
                        width={58}
                        height={24}
                        rx={12}
                        fill={isCompleted ? "rgba(255,255,255,0.2)" : isAvailable ? "#fff0e4" : "#f1f5f9"}
                      />
                      <text
                        x={node.x + 329}
                        y={node.y + 54}
                        textAnchor="middle"
                        fill={isCompleted ? "#FFFFFF" : isAvailable ? "#944b00" : "#64748b"}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        T{node.tier}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
