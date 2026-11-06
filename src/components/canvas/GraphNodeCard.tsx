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

// Bộ màu semantic theo trạng thái (INV-11): nền / viền / chữ lấy từ token --st-* (đủ tương phản ở cả 2 chủ đề)
const ST: Record<NodeStatus, "lock" | "ready" | "done" | "fail"> = { LOCKED: "lock", AVAILABLE: "ready", COMPLETED: "done", FAILED: "fail" };
const tok = (s: NodeStatus, part: "bg" | "border" | "fg") => `var(--st-${ST[s]}-${part})`;

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
      style={{ width: CONFIG.NODE_BOX_WIDTH, minHeight: CONFIG.NODE_BOX_HEIGHT, background: tok(status, "bg"), borderColor: tok(status, "border") }}
      className={cn(
        "relative flex flex-col overflow-visible rounded-lg border-[1.5px] py-2 pl-4 pr-3 text-left shadow-[var(--shadow)] transition-[transform,box-shadow,background-color,border-color] duration-200",
        locked ? "cursor-not-allowed border-dashed opacity-80" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]",
        status === "AVAILABLE" && "node-available", data.unlocked && "node-unlocked", active && "outline outline-2 outline-offset-[3px] outline-white shadow-[0_0_26px_-6px_color-mix(in_srgb,var(--ink)_40%,transparent)]",
      )}
    >
      <span aria-hidden className="absolute inset-y-2 left-1.5 w-[3px] rounded-full" style={{ background: tok(status, "fg") }} />
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-locked" />
      {hasWarning && <span title={data.warningText} aria-hidden className="absolute -left-2 -top-2 rounded-full bg-amber px-1 text-xs text-on-amber shadow">⚠</span>}
      {node.is_capstone && <span title="Capstone" aria-hidden className="absolute -right-2 -top-2 rounded-full bg-panel px-1 text-xs text-amber ring-1 ring-amber/60">★</span>}
      <span className="text-[13px] font-bold leading-tight text-text">{title}</span>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-subtle">
        {node.is_capstone && <span className="text-amber">Capstone</span>}
        {node.node_type === "ALGORITHMIC_CORE" && <span className="rounded border border-violet/50 px-1 text-violet">Thuật toán</span>}
      </div>
      {analysis === "PENDING" && <div className="mt-1 flex items-center gap-1 text-[11px] text-blue"><span className="spinner inline-block h-3 w-3 rounded-full border border-blue border-t-transparent" />đang phân tích…</div>}
      {failed && (
        <div className="mt-1 text-[11px] text-red">
          Chưa phân tích được{" "}
          <button type="button" className="underline hover:text-text" onClick={(e) => { e.stopPropagation(); data.onRetry(node.id); }}>Thử lại phân tích</button>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
        <span className="inline-flex items-center gap-1 rounded border bg-panel px-1.5 py-px text-[10px] font-semibold" style={{ color: tok(status, "fg"), borderColor: tok(status, "border") }}>{ui.icon} {ui.label}</span>
        <span className="truncate font-mono text-[10px] text-subtle">{node.files.length} file · {node.languages.join(", ").toLowerCase()}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-locked" />
    </div>
  );
}
