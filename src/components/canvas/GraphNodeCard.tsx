"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Lock, Check, X, AlertTriangle, Loader2, Star } from "lucide-react";
import { CONFIG } from "@/contracts/config";
import type {
  HybridArchitecturalNode,
  NodeStateView,
  NodeAnalysisView,
  NodeStatus,
} from "@/contracts";

export type GraphNodeCardData = {
  node: HybridArchitecturalNode;
  state?: NodeStateView;
  analysis?: NodeAnalysisView | "PENDING" | "FAILED";
  active: boolean;
  blockedBy: string[];
  onSelect: (id: string) => void;
  onRetry: (id: string) => void;
};

export type GraphNodeCardNodeType = Node<GraphNodeCardData, "graphNode">;

export const GraphNodeCard = memo(function GraphNodeCard(
  props: NodeProps<GraphNodeCardNodeType>
) {
  const { data } = props;
  const {
    node,
    state,
    analysis,
    active,
    blockedBy = [],
    onSelect,
    onRetry,
  } = data;

  const status: NodeStatus = state?.status ?? "LOCKED";
  const isLocked = status === "LOCKED";
  const isAvailable = status === "AVAILABLE";
  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED";

  const hasWarning = Boolean(state?.has_warning);
  const isPending = analysis === "PENDING";
  const isAnalysisFailed =
    Boolean(state?.analysis_failed) || analysis === "FAILED";

  // Tên: title_source thuộc DOMAIN_TERMS, DIRECTORY, FILE_BASENAME => tiền tố "~"
  const isDerived =
    node.title_source === "DOMAIN_TERMS" ||
    node.title_source === "DIRECTORY" ||
    node.title_source === "FILE_BASENAME";

  const rawTitle = node.title || "";
  // Dài hơn CONFIG.TITLE_MAX_CHARS ký tự => cắt đúng TITLE_MAX_CHARS - 1 ký tự rồi thêm "…"
  const truncatedTitle =
    rawTitle.length > CONFIG.TITLE_MAX_CHARS
      ? rawTitle.slice(0, CONFIG.TITLE_MAX_CHARS - 1) + "…"
      : rawTitle;
  const displayTitle = (isDerived ? "~" : "") + truncatedTitle;

  // title thuộc tính của thẻ
  let cardTooltip: string;
  if (isLocked) {
    const blockedText =
      blockedBy.length > 0
        ? blockedBy.join(", ")
        : node.prerequisites.length > 0
        ? node.prerequisites.join(", ")
        : "các bài học trước";
    cardTooltip = `Hoàn thành trước: ${blockedText}`;
  } else {
    cardTooltip = node.title;
    if (node.title_evidence) {
      cardTooltip += ` — ${node.title_evidence}`;
    }
    if (isDerived) {
      cardTooltip += " — Tên suy ra — gần đúng";
    }
    if (node.title_source === "VIRTUAL") {
      cardTooltip +=
        " — Chặng tách từ hàm dài — code thật, engine chia theo vai trò câu lệnh";
    }
  }

  // aria-label: "{tên} — {nhãn trạng thái}[, có cảnh báo][, đang phân tích]"
  const statusLabels: Record<NodeStatus, string> = {
    LOCKED: "Chưa mở",
    AVAILABLE: "Sẵn sàng",
    COMPLETED: "Hoàn thành",
    FAILED: "Chưa đạt",
  };
  const statusText = statusLabels[status] ?? "Chưa mở";
  let ariaLabel = `${node.title} — ${statusText}`;
  if (hasWarning) {
    ariaLabel += ", có cảnh báo";
  }
  if (isPending) {
    ariaLabel += ", đang phân tích";
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    onSelect(node.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isLocked) return;
      onSelect(node.id);
    }
  };

  // Styling theo 4 trạng thái
  // LOCKED: viền đứt mờ, 🔒 "Chưa mở"
  // AVAILABLE: hổ phách có nhịp sáng, ● "Sẵn sàng"
  // COMPLETED: xanh, ✓ "Hoàn thành"
  // FAILED: đỏ, ✗ "Chưa đạt"
  let borderBgClass =
    "border-dashed border-slate-300 bg-slate-50/90 text-slate-700 opacity-80 cursor-not-allowed";
  if (isCompleted) {
    borderBgClass =
      "border-emerald-500 bg-emerald-50/95 text-emerald-950 shadow-xs cursor-pointer";
  } else if (isAvailable) {
    borderBgClass =
      "border-[#ff9640] bg-[#fffaf5] text-slate-900 shadow-xs cursor-pointer";
  } else if (isFailed) {
    borderBgClass =
      "border-red-500 bg-red-50/95 text-red-950 shadow-xs cursor-pointer";
  }

  const activeClass = active
    ? "ring-2 ring-slate-900 ring-offset-2 border-slate-800"
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={isLocked ? true : undefined}
      title={cardTooltip}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ width: 200 }}
      className={`relative flex flex-col justify-between rounded-xl border-2 p-3 transition-all select-none ${borderBgClass} ${activeClass}`}
    >
      {/* Handle ẩn phía trên (target) và dưới (source) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0 !border-0 !pointer-events-none !min-w-0 !min-h-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0 !border-0 !pointer-events-none !min-w-0 !min-h-0"
      />

      {/* has_warning => ⚠ góc trên trái, title "Node trước chưa vững" */}
      {hasWarning && (
        <div
          className="absolute -top-2 -left-2 z-10 flex items-center justify-center size-5 rounded-full bg-amber-100 border border-amber-500 text-amber-700 shadow-xs"
          title="Node trước chưa vững"
        >
          <AlertTriangle className="size-3 stroke-[2.5]" />
        </div>
      )}

      {/* Header card: Trạng thái & Badges */}
      <div className="flex items-center justify-between gap-1 w-full text-xs mb-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="size-3.5 stroke-[3]" />
              <span>Hoàn thành</span>
            </span>
          )}
          {isAvailable && (
            <span className="inline-flex items-center gap-1 text-[#c2410c]">
              <span className="size-2 rounded-full bg-[#ff9640] animate-pulse" />
              <span>Sẵn sàng</span>
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <X className="size-3.5 stroke-[3]" />
              <span>Chưa đạt</span>
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Lock className="size-3.5" />
              <span>Chưa mở</span>
            </span>
          )}
        </div>

        {/* Badges: Capstone & Thuật toán */}
        <div className="flex items-center gap-1 shrink-0">
          {node.is_capstone && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded"
              title="Capstone"
            >
              <Star className="size-2.5 fill-amber-600 text-amber-600" />
              <span>Capstone</span>
            </span>
          )}
          {node.node_type === "ALGORITHMIC_CORE" && (
            <span
              className="inline-flex items-center text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1 py-0.5 rounded"
              title="Thuật toán"
            >
              Thuật toán
            </span>
          )}
        </div>
      </div>

      {/* Tên node */}
      <div className="font-bold text-[13px] leading-snug line-clamp-2 text-slate-900">
        {displayTitle}
      </div>

      {/* Dòng phụ: {files.length} file · {languages} */}
      <div className="text-[11px] text-slate-500 mt-1 truncate">
        {node.files.length} file · {node.languages.join(", ")}
      </div>

      {/* Trạng thái phân tích: PENDING hoặc FAILED/analysis_failed */}
      {isPending && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-2 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200">
          <Loader2 className="size-3 animate-spin text-amber-600 shrink-0" />
          <span className="truncate">đang phân tích…</span>
        </div>
      )}

      {isAnalysisFailed && (
        <div className="flex flex-col gap-0.5 mt-2 p-1.5 bg-red-50 rounded border border-red-200 text-[11px]">
          <span className="text-red-700 font-medium">Chưa phân tích được</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(node.id);
            }}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline text-left cursor-pointer"
          >
            Thử lại phân tích
          </button>
        </div>
      )}
    </div>
  );
});

export default GraphNodeCard;
