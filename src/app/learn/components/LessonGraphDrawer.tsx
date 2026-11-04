"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Drawer } from "@/components/ui/Drawer";
import {
  Check,
  Play,
  ArrowRight,
  Lock,
  AlertTriangle,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { CONFIG } from "@/contracts/config";
import type {
  SessionProgress,
  NodeStatus,
  HybridArchitecturalNode,
  GraphEdge,
} from "@/contracts";
import { deriveNodeStates } from "@/lib/derive";
import { useWorkbenchStore } from "@/store/workbench";

// Thay phần SVG tự vẽ bằng DagCanvas tải qua next/dynamic với ssr: false, chỉ render khi isOpen
const DagCanvas = dynamic(() => import("@/components/canvas/DagCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500 bg-slate-50">
      <RefreshCw className="size-4 animate-spin mr-2 text-[#ff9640]" />
      <span>Đang tải bản đồ…</span>
    </div>
  ),
});

export interface LessonGraphDrawerProps {
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
  // Đọc analyses, result từ useWorkbenchStore. onRetry gọi requestAnalysis(id, true)
  const analyses = useWorkbenchStore((s) => s.analyses);
  const result = useWorkbenchStore((s) => s.result);
  const requestAnalysis = useWorkbenchStore((s) => s.requestAnalysis);

  const allNodes = useMemo(
    () => graphNodes ?? result?.nodes ?? [],
    [graphNodes, result?.nodes]
  );
  const allEdges = useMemo(
    () => graphEdges ?? result?.edges ?? [],
    [graphEdges, result?.edges]
  );

  // Trạng thái node lấy từ progress.nodes[id], không có progress thì dùng deriveNodeStates như hiện tại
  const derivedStates = useMemo(() => {
    if (!progress && allNodes.length > 0) {
      const skeleton = allNodes.map((n) => ({
        node_id: n.id,
        title: n.title,
        is_capstone: Boolean(n.is_capstone),
        prerequisites: n.prerequisites || [],
      }));
      return deriveNodeStates(skeleton, []);
    }
    return {};
  }, [progress, allNodes]);

  const currentActiveId = selectedNodeId || allNodes[0]?.id;
  const activeNode =
    allNodes.find((n) => n.id === currentActiveId) || allNodes[0];

  const activeStatus: NodeStatus =
    progress?.nodes?.[activeNode?.id]?.status ??
    derivedStates[activeNode?.id]?.status ??
    "LOCKED";

  const activeHasWarning =
    progress?.nodes?.[activeNode?.id]?.has_warning ??
    derivedStates[activeNode?.id]?.has_warning ??
    false;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      size="full"
      className="max-w-[1020px] w-full p-0 flex flex-col bg-[#ffffff] border-r border-[#C0C0C0] shadow-2xl overflow-hidden"
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
              Tokens đã dùng:{" "}
              <span className="font-bold text-[#ff9640]">
                {progress.tokens_used.toLocaleString("vi-VN")}
              </span>{" "}
              / {CONFIG.SESSION_TOKEN_QUOTA.toLocaleString("vi-VN")}
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full bg-[#fafbfc]">
        {/* Error State Banner */}
        {errorMessage && (
          <div className="bg-[#fff0f0] border-b border-[#ffd2d2] px-6 py-2.5 flex items-center justify-between text-xs text-[#c50000] shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="bg-white hover:bg-gray-50 border border-[#ffd2d2] text-[#c50000] font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="size-3" />
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* Selected Node Quick Info Bar */}
        {activeNode && (
          <div
            className={`px-6 py-3.5 border-b transition-colors flex items-center justify-between shrink-0 ${
              activeStatus === "AVAILABLE"
                ? "bg-[#fff7ed] border-[#fed7aa]"
                : activeStatus === "COMPLETED"
                ? "bg-[#ecfdf5] border-[#a7f3d0]"
                : activeStatus === "FAILED"
                ? "bg-[#fef2f2] border-[#fecaca]"
                : "bg-white border-[#f1f5f9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                  activeStatus === "AVAILABLE"
                    ? "bg-[#ff9640] text-white"
                    : activeStatus === "COMPLETED"
                    ? "bg-[#047857] text-white"
                    : activeStatus === "FAILED"
                    ? "bg-red-600 text-white"
                    : "bg-[#e2e8f0] text-[#64748b]"
                }`}
              >
                {activeStatus === "COMPLETED" ? (
                  <Check className="size-4 stroke-[3]" />
                ) : activeStatus === "AVAILABLE" ? (
                  <Play className="size-4 fill-white translate-x-0.5" />
                ) : activeStatus === "FAILED" ? (
                  <X className="size-4 stroke-[3]" />
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
                  {activeNode.is_capstone && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-[#fef3c7] text-[#b45309] px-1.5 py-0.5 rounded font-bold border border-[#fde68a]">
                      <Star className="size-3 fill-[#b45309]" /> Capstone
                    </span>
                  )}
                  {activeHasWarning && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                      <AlertTriangle className="size-3" /> Cảnh báo
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#475569]">
                  {activeNode.title_evidence ||
                    activeNode.entry_symbol ||
                    activeNode.files?.[0] ||
                    ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeStatus !== "LOCKED" && (
                <button
                  onClick={() => {
                    onSelectNode?.(activeNode.id);
                    onClose();
                  }}
                  type="button"
                  className="px-4 py-2.5 bg-[#ff9640] hover:bg-[#e07f2e] text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {activeStatus === "COMPLETED"
                      ? "Xem lại bài học"
                      : "Tiếp tục học"}
                  </span>
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Graph Canvas Container (chỉ render DagCanvas khi isOpen) */}
        <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden relative">
          {isOpen && (
            <DagCanvas
              nodes={allNodes}
              edges={allEdges}
              progress={progress ?? null}
              analyses={analyses}
              activeNodeId={currentActiveId ?? null}
              fingerprint={result?.fingerprint}
              report={result?.ingestion_report}
              onSelectNode={(id) => {
                onSelectNode?.(id);
              }}
              onRetry={(id) => {
                requestAnalysis(id, true);
              }}
            />
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default LessonGraphDrawer;
