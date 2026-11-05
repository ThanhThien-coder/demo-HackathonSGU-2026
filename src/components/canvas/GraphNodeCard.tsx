"use client";
// 30 Mục 4 — thẻ node trong đồ thị: màu theo status (INV-11) + lớp hiển thị (cảnh báo, đang phân tích, capstone, thuật toán).
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { HybridArchitecturalNode, NodeStatus } from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { STATUS_UI, cn, displayTitle } from "@/components/ui/common";

export interface GraphNodeData extends Record<string, unknown> {
  node: HybridArchitecturalNode;
  status: NodeStatus;
  hasWarning: boolean;
  warningText: string;
  lockedHint: string;
  analysis: "READY" | "PENDING" | "FAILED" | "NONE";
  analysisFailed: boolean;
  active: boolean;
  unlocked: boolean;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
}
export type GraphFlowNode = Node<GraphNodeData, "lesson">;

export function GraphNodeCard({ data }: NodeProps<GraphFlowNode>) {
  const { node, status, active, hasWarning, analysis } = data;
  const ui = STATUS_UI[status];
  const locked = status === "LOCKED";
  const title = displayTitle(node.title, node.title_source);
  const tooltip = [
    node.title, node.title_evidence, node.title_source === "VIRTUAL" ? "Chặng tách từ hàm dài — code thật, engine chia theo vai trò câu lệnh" : "",
    ["DOMAIN_TERMS", "DIRECTORY", "FILE_BASENAME"].includes(node.title_source) ? "Tên suy ra — gần đúng" : "", locked ? data.lockedHint : "",
  ].filter(Boolean).join("\n");
  const label = `${node.title} — ${ui.label}${hasWarning ? ", có cảnh báo" : ""}${analysis === "PENDING" ? ", đang phân tích" : ""}`;
  const failed = analysis === "FAILED" || data.analysisFailed;

  return (
    <div
      role="button" tabIndex={0} aria-label={label} aria-disabled={locked} title={tooltip}
      onClick={() => { if (!locked) data.onOpen(node.id); }}
      onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); data.onOpen(node.id); } }}
      style={{ width: CONFIG.NODE_BOX_WIDTH, minHeight: CONFIG.NODE_BOX_HEIGHT }}
      className={cn(
        "relative rounded-xl border-2 bg-panel px-3 py-2 text-left transition-colors",
        ui.border, locked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-panel-2",
        status === "AVAILABLE" && "node-available", data.unlocked && "node-unlocked", active && "outline outline-2 outline-offset-2 outline-white",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-line" />
      {hasWarning && <span title={data.warningText} aria-hidden className="absolute -left-2 -top-2 rounded-full bg-amber px-1 text-xs text-bg">⚠</span>}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold leading-tight">{title}</span>
        <span className={cn("shrink-0 text-xs font-semibold", ui.color)}>{ui.icon} {ui.label}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted">
        <span>{node.files.length} file · {node.languages.join(", ").toLowerCase()}</span>
        {node.is_capstone && <span className="text-amber" title="Capstone">★ Capstone</span>}
        {node.node_type === "ALGORITHMIC_CORE" && <span className="text-violet">Thuật toán</span>}
      </div>
      {analysis === "PENDING" && <div className="mt-1 flex items-center gap-1 text-[11px] text-blue"><span className="spinner inline-block h-3 w-3 rounded-full border border-blue border-t-transparent" />đang phân tích…</div>}
      {failed && (
        <div className="mt-1 text-[11px] text-red">
          Chưa phân tích được{" "}
          <button type="button" className="underline hover:text-text" onClick={(e) => { e.stopPropagation(); data.onRetry(node.id); }}>Thử lại phân tích</button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-line" />
    </div>
  );
}
