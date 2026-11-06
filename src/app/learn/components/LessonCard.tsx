"use client";

import React from "react";
import { AlertTriangle, Check, Loader2, Lock, RefreshCw, Star, X } from "lucide-react";
import type { HybridArchitecturalNode, NodeAnalysisView, NodeStatus } from "@/contracts";
import type { LessonNodeState } from "@/lib/lesson-map";

export interface LessonCardProps {
  node: HybridArchitecturalNode;
  name: string;              // displayTitle(node)
  hasAiName: boolean;
  state: LessonNodeState;
  analysis?: NodeAnalysisView | "PENDING" | "FAILED";
  active: boolean;
  isStart: boolean;          // D-85
  blockedNames: string[];    // Tên cha chưa thông
  weakNames: string[];       // Tên cha làm bài này có ⚠
  onActivate: () => void;
  onRetryAnalysis: () => void;
}

const STATUS_VIEW: Record<NodeStatus, { label: string; card: string; text: string }> = {
  LOCKED: {
    label: "Chưa mở",
    card: "border-dashed border-border-default border-l-border-default opacity-80",
    text: "text-text-secondary",
  },
  AVAILABLE: {
    label: "Sẵn sàng",
    card: "border-border-default border-l-status-warning",
    text: "text-brand-dark",
  },
  COMPLETED: {
    label: "Hoàn thành",
    card: "border-border-default border-l-status-success",
    text: "text-[#047857]",
  },
  FAILED: {
    label: "Chưa đạt",
    card: "border-border-default border-l-status-danger",
    text: "text-status-danger",
  },
};

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "LOCKED") return <Lock className="size-3" aria-hidden="true" />;
  if (status === "COMPLETED") return <Check className="size-3 stroke-[3]" aria-hidden="true" />;
  if (status === "FAILED") return <X className="size-3 stroke-[3]" aria-hidden="true" />;
  return <span className="size-2 rounded-full bg-status-warning animate-pulse" aria-hidden="true" />;
}

function tooltipOf(node: HybridArchitecturalNode, blockedNames: string[], status: NodeStatus): string {
  if (status === "LOCKED") return `Cần xong: ${blockedNames.join(", ")}`;
  const parts = [node.title, node.title_evidence];
  if (["DOMAIN_TERMS", "DIRECTORY", "FILE_BASENAME"].includes(node.title_source)) {
    parts.push("Tên suy ra — gần đúng");
  }
  if (node.title_source === "VIRTUAL") {
    parts.push("Chặng tách từ hàm dài — code thật, engine chia theo vai trò câu lệnh");
  }
  return parts.filter(Boolean).join(" — ");
}

export function LessonCard({
  node,
  name,
  hasAiName,
  state,
  analysis,
  active,
  isStart,
  blockedNames,
  weakNames,
  onActivate,
  onRetryAnalysis,
}: LessonCardProps) {
  const { status } = state;
  const view = STATUS_VIEW[status];
  const isLocked = status === "LOCKED";
  const isPending = analysis === "PENDING";
  const analysisFailed = state.analysis_failed || analysis === "FAILED";
  const codeLine = hasAiName
    ? [node.title_evidence, node.title].filter(Boolean).join(" · ")
    : node.title_evidence;

  return (
    <div
      className={`relative rounded-[10px] border border-l-4 bg-white transition-colors ${view.card} ${
        active ? "ring-2 ring-brand-primary" : ""
      }`}
    >
      <button
        type="button"
        onClick={onActivate}
        title={tooltipOf(node, blockedNames, status)}
        aria-disabled={isLocked ? "true" : undefined}
        aria-current={active ? "true" : undefined}
        className={`flex w-full flex-col gap-1 rounded-[10px] px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
          isLocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-tint-alt"
        }`}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {state.has_warning && (
            <span title={`Node trước chưa vững: ${weakNames.join(", ")}`}>
              <AlertTriangle className="size-3.5 text-status-warning" aria-label="Node trước chưa vững" />
            </span>
          )}
          <span className="min-w-0 break-words text-sm font-bold text-text-main">{name}</span>
          {node.is_capstone && (
            <Star className="size-3.5 fill-status-warning text-status-warning" aria-label="Bài quan trọng" />
          )}
          {hasAiName && (
            <span className="rounded-full bg-surface-tint px-1.5 text-[10px] font-semibold text-text-secondary">
              AI đặt tên
            </span>
          )}
        </span>

        {codeLine && <span className="break-words text-xs text-text-secondary">{codeLine}</span>}

        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className={`inline-flex items-center gap-1 ${view.text}`}>
            <StatusIcon status={status} />
            {view.label}
          </span>
          {isStart && (
            <span className="rounded-full bg-brand-light px-1.5 text-[10px] text-brand-dark">Bắt đầu</span>
          )}
          {node.node_type === "ALGORITHMIC_CORE" && (
            <span className="rounded-full bg-violet-50 px-1.5 text-[10px] text-violet-700">Thuật toán</span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1 font-medium text-text-secondary">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              đang phân tích…
            </span>
          )}
        </span>

        {isLocked && blockedNames.length > 0 && (
          <span className="break-words text-xs text-text-secondary">Cần xong: {blockedNames.join(", ")}</span>
        )}
      </button>

      {analysisFailed && !isPending && (
        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border-subtle px-3 py-1.5 text-xs">
          <span className="text-status-danger">Chưa phân tích được</span>
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-dark hover:underline"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            Thử lại phân tích
          </button>
        </div>
      )}
    </div>
  );
}
