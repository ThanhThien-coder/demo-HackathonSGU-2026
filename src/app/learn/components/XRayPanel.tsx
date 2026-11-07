"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { NodeAnalysisView, HybridArchitecturalNode } from "@/contracts";
import { useWorkbenchStore } from "@/store/workbench";
import { SkillChips, StartAnswerButton } from "./SkillChips";
import {
  buildTourSteps,
  layerLabel,
  shouldIgnoreTourKey,
  type TourStepModel,
} from "./xray-tour";

export const ARCHITECTURE_PATTERN_LABELS: Record<string, string> = {
  LAYERED: "Tách tầng",
  MIDDLEWARE_CHAIN: "Chuỗi middleware",
  DEPENDENCY_INJECTION: "Tiêm phụ thuộc",
  OBSERVER_EVENT: "Observer",
  PIPELINE: "Chuỗi xử lý",
  ALGORITHMIC: "Thuật toán",
  PROCEDURAL: "Tuần tự",
  OTHER: "Khác",
};

/**
 * Hiển thị văn bản do AI sinh: tách theo cặp backtick để hiển thị <code>,
 * tuyệt đối không dùng dangerouslySetInnerHTML (INV-06, D-05).
 */
export function AiText({ text }: { text?: string | null }) {
  if (!text) return null;
  const parts = text.split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return (
            <code
              key={idx}
              className="font-mono bg-[#eaedff]/70 text-[#004cff] px-1 py-0.5 rounded text-[11px]"
            >
              {part}
            </code>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}

export interface XRayPanelProps {
  /** Bản phân tích. `null` / "PENDING" / "FAILED" ⇒ tour dựng từ `trace_steps`. */
  analysis: NodeAnalysisView | "PENDING" | "FAILED" | null;
  node?: HybridArchitecturalNode | null;
  activeStep?: number | null;
  onSelectStep?: (step: number) => void;
  allNodes?: HybridArchitecturalNode[];
}

/** Dải đầu bài: tên bài, ★ / ⚠ / Thuật toán, support_tier (UI-41, D16 sẽ làm đủ thẻ vai trò). */
function NodeHeader({
  node,
  hasWarning,
}: {
  node: HybridArchitecturalNode;
  hasWarning: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-[#eaedff] shadow-2xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold text-sm text-[#131b2e] leading-snug">
          {node.title}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {node.is_capstone && (
            <span className="text-[10px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              ★ Capstone
            </span>
          )}
          {(node.node_type === "ALGORITHMIC_CORE" || node.is_vip_algorithm) && (
            <span className="text-[10px] font-bold bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] px-2 py-0.5 rounded-full">
              Thuật toán
            </span>
          )}
          {hasWarning && (
            <span
              className="text-[10px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a] px-1.5 py-0.5 rounded flex items-center gap-0.5"
              title="Node này có cảnh báo"
            >
              ⚠ Cảnh báo
            </span>
          )}
          <span className="text-[10px] font-semibold bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded">
            {node.support_tier}
          </span>
        </div>
      </div>
      {node.title_evidence && (
        <span className="text-[11px] font-mono text-[#625e56]">
          {node.title_evidence}
        </span>
      )}
    </div>
  );
}

/** Giai đoạn ROLE: tạm hiện tên bài + nút "Bắt đầu tour →" (D16 làm đủ thẻ vai trò). */
function RoleStage({
  node,
  hasWarning,
  canStart,
  onStart,
}: {
  node: HybridArchitecturalNode | null | undefined;
  hasWarning: boolean;
  canStart: boolean;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {node ? (
        <NodeHeader node={node} hasWarning={hasWarning} />
      ) : (
        <div className="p-3 bg-white rounded-xl border border-[#eaedff] text-[#625e56]">
          Chọn một bài ở bản đồ bên trái để bắt đầu.
        </div>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full py-2.5 px-4 bg-[#004cff] hover:bg-[#003ccc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
      >
        Bắt đầu tour →
      </button>
    </div>
  );
}

/** Giai đoạn TOUR: mỗi lần 1 bước (UI-42). */
function TourStage({
  steps,
  index,
  analysis,
  analysisState,
  onGoToStep,
  onPrev,
  onNext,
}: {
  steps: TourStepModel[];
  index: number;
  analysis: NodeAnalysisView | null;
  analysisState: "READY" | "PENDING" | "FAILED";
  onGoToStep: (step: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const cur = steps[index];
  const total = steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div className="flex flex-col gap-3" data-testid="xray-tour-step">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-[#554337]">
          <span className="font-bold text-[#ff9640]">
            Bước {index + 1}/{total}
          </span>
          <span> · </span>
          <span className="text-[#004cff] font-bold">{layerLabel(cur.layer)}</span>
        </span>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Tiến độ tour"
        >
          {steps.map((s, i) => (
            <button
              key={s.step}
              type="button"
              onClick={() => onGoToStep(s.step)}
              aria-label={`Bước ${i + 1}${s.hasWeakPoint ? " (có điểm dở do AI nhận định)" : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={`size-2.5 rounded-full border cursor-pointer transition-colors ${
                i === index
                  ? "bg-[#ff9640] border-[#ff9640]"
                  : i < index
                  ? "bg-[#ffd9b3] border-[#ffd9b3]"
                  : "bg-white border-[#cbd5e1]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-white rounded-xl border border-[#eaedff] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-[#625e56] break-all">
            {cur.file_path} · dòng {cur.line_start}–{cur.line_end}
          </span>
          {cur.hasWeakPoint && (
            <span
              className="shrink-0 text-[#dc2626] font-bold text-[11px] bg-[#fee2e2] px-1.5 py-0.5 rounded"
              title="Bước này có điểm dở — Nhận định của AI"
              aria-label="Bước này có điểm dở do AI nhận định"
            >
              ⚠
            </span>
          )}
        </div>

        <p className="text-[#131b2e] leading-relaxed text-xs">
          <AiText text={cur.text} />
        </p>

        {cur.pending && (
          <div
            className="flex flex-col gap-1.5"
            role="status"
            aria-label="Đang phân tích"
          >
            <div className="h-2.5 w-4/5 rounded bg-[#eaedff] animate-pulse" />
            <div className="h-2.5 w-3/5 rounded bg-[#eaedff] animate-pulse" />
            <span className="text-[11px] text-[#625e56] flex items-center gap-1.5">
              <RefreshCw className="size-3 text-[#ff9640] animate-spin" />
              đang phân tích…
            </span>
          </div>
        )}
        {analysisState === "FAILED" && (
          <span className="text-[11px] text-[#991b1b]">
            Chưa phân tích được — chỉ hiện khung do code dựng.
          </span>
        )}
      </div>

      {analysis && (
        <SkillChips analysis={analysis} step={cur.step} onSelectStep={onGoToStep} />
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#554337] font-semibold cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          {isFirst ? "Thẻ vai trò" : "Bước trước"}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#ff9640] hover:bg-[#e07f2e] text-white font-bold cursor-pointer transition-colors"
        >
          {isLast ? "Xem tóm tắt" : "Bước sau"}
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <span className="text-[11px] text-[#625e56]">
        Mẹo: bấm phím ← → để chuyển bước.
      </span>
    </div>
  );
}

/** Dòng cuối ở Tóm tắt khi bài đã xong: không có ôn tập (D-35). */
function FinishedNote({ status }: { status: "COMPLETED" | "FAILED" }) {
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-1 ${
        status === "COMPLETED"
          ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#14532d]"
          : "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]"
      }`}
    >
      <span className="font-bold">
        {status === "COMPLETED"
          ? "✓ Đã hoàn thành bài này."
          : "✗ Bài này chưa đạt."}
      </span>
      <span className="text-[11px]">
        Xem lại câu hỏi ở tab Feynman. Không có ôn tập: bài giữ nguyên màu.
      </span>
    </div>
  );
}

/** Giai đoạn SUMMARY: điểm hay, điểm dở (Nhận định của AI), Chi tiết bài, nút UI-47. */
function SummaryStage({
  analysis,
  analysisState,
  node,
  lastStep,
  allNodes,
  onSelectStep,
  onBackToTour,
}: {
  analysis: NodeAnalysisView | null;
  analysisState: "READY" | "PENDING" | "FAILED";
  node: HybridArchitecturalNode | null | undefined;
  lastStep: number;
  allNodes: HybridArchitecturalNode[];
  onSelectStep: (step: number) => void;
  onBackToTour: () => void;
}) {
  const currentNodeId = node?.id || analysis?.node_id || "";
  const progress = useWorkbenchStore((s) => s.progress);
  const nodeStatus = currentNodeId
    ? progress?.nodes?.[currentNodeId]?.status
    : undefined;
  const [openWeak, setOpenWeak] = useState<Record<number, boolean>>({});
  const [backFromSummary, backStep] = [onBackToTour, lastStep];

  const items: Array<{ basename: string; otherNodes: Array<{ id: string; title: string }> }> = [];
  for (const sf of analysis?.shared_files ?? []) {
    const basename = sf.file_path.split("/").pop() || sf.file_path;
    const otherNodeIds = sf.node_ids.filter((nid) => nid !== currentNodeId);
    if (otherNodeIds.length > 0) {
      items.push({
        basename,
        otherNodes: otherNodeIds.map((nid) => ({
          id: nid,
          title: allNodes.find((n) => n.id === nid)?.title || nid,
        })),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="xray-summary">
      <button
        type="button"
        onClick={backFromSummary}
        className="self-start flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#554337] font-semibold cursor-pointer transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Về Bước {backStep}
      </button>

      {analysisState !== "READY" || !analysis ? (
        <div className="p-3 bg-white rounded-xl border border-[#eaedff] text-[#625e56] flex items-center gap-2">
          {analysisState === "FAILED" ? (
            <>
              <AlertTriangle className="size-4 text-[#ef4444] shrink-0" />
              <span>Chưa phân tích được — chưa có điểm hay, điểm dở.</span>
            </>
          ) : (
            <>
              <RefreshCw className="size-3.5 text-[#ff9640] animate-spin shrink-0" />
              <span>đang phân tích…</span>
            </>
          )}
        </div>
      ) : (
        <>
          {analysis.skeleton_only && (
            <div className="bg-[#fffbeb] border border-[#f59e0b]/40 rounded-lg p-2.5 text-xs text-[#92400e] font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-[#f59e0b]" />
              <span>AI chưa giải thích được bài này — chỉ hiện khung do code dựng</span>
            </div>
          )}

          {analysis.strengths?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#16a34a]" />
                Điểm hay
              </span>
              <div className="flex flex-col gap-1 text-xs text-[#14532d]">
                {analysis.strengths.map((st, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectStep(st.step)}
                    className="text-left bg-[#f0fdf4] hover:bg-[#dcfce7] border border-[#bbf7d0] rounded-lg p-2 leading-relaxed cursor-pointer transition-colors"
                  >
                    ✅ (bước {st.step}) <AiText text={st.text} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Điểm dở — tuyệt đối không hiện cách sửa, con số tình huống, biên (INV-06, T23) */}
          {analysis.weak_points?.length > 0 && (
            <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#944b00] text-xs">
                <ShieldAlert className="size-4 text-[#ea580c] shrink-0" />
                <span>Điểm dở — Nhận định của AI</span>
              </div>
              {analysis.weak_points.map((wp, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 border border-[#fed7aa]/60 rounded-lg p-2.5 text-xs text-[#7c2d12] flex flex-col gap-1"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStep(wp.step)}
                    className="text-left flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="font-semibold text-[#131b2e]">
                      <AiText text={wp.what} />
                    </span>
                    <span className="font-semibold text-[11px] text-[#9a3412]">
                      Bước {wp.step} · dòng {wp.line_start}–{wp.line_end}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenWeak((o) => ({ ...o, [idx]: !o[idx] }))
                    }
                    aria-expanded={Boolean(openWeak[idx])}
                    className="self-start text-[11px] font-semibold text-[#004cff] hover:underline cursor-pointer"
                  >
                    {openWeak[idx] ? "Thu gọn" : "Xem thêm"}
                  </button>
                  {openWeak[idx] && (
                    <span>
                      Hậu quả: <AiText text={wp.consequence} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Chi tiết bài — mặc định đóng */}
      {analysis && (
        <details className="bg-white border border-[#eaedff] rounded-xl p-3">
          <summary className="font-bold text-[#131b2e] cursor-pointer">
            Chi tiết bài
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {analysis.architecture && !analysis.skeleton_only && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="size-3.5 text-[#ff9640]" />
                  Kiến trúc
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {analysis.architecture.patterns?.map((pattern, idx) => {
                    const label = ARCHITECTURE_PATTERN_LABELS[pattern] || pattern;
                    const isPrimary = idx === 0;
                    return (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPrimary
                            ? "bg-[#ffedd4] text-[#944b00] border-[#ff9640]/40"
                            : "bg-[#f2f3ff] text-[#004cff] border-[#eaedff]"
                        }`}
                        title={isPrimary ? "Mẫu kiến trúc chính" : undefined}
                      >
                        {label}
                        {isPrimary &&
                          analysis.architecture.patterns.length > 1 &&
                          " (chính)"}
                      </span>
                    );
                  })}
                </div>
                {analysis.architecture.summary && (
                  <p className="text-xs text-[#131b2e] leading-relaxed bg-[#faf8ff] p-2.5 rounded-lg border border-[#eaedff]">
                    <AiText text={analysis.architecture.summary} />
                  </p>
                )}
              </div>
            )}

            {items.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
                  Liên quan
                </span>
                <div className="flex flex-col gap-1 text-xs text-[#554337]">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#faf8ff] border border-[#eaedff] rounded-lg p-2 leading-relaxed flex flex-col gap-1.5"
                    >
                      {item.otherNodes.map((target) => {
                        const status =
                          progress?.nodes?.[target.id]?.status ?? "LOCKED";
                        return (
                          <div
                            key={target.id}
                            className="flex items-center gap-1.5 flex-wrap"
                          >
                            <span>Dùng chung {item.basename} với</span>
                            {status === "LOCKED" ? (
                              <span className="font-medium text-[#64748b]">
                                {target.title}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  useWorkbenchStore.getState().openNode(target.id)
                                }
                                className="font-semibold text-[#004cff] bg-[#f2f3ff] hover:bg-[#eaedff] px-2 py-0.5 rounded border border-[#eaedff] transition-colors cursor-pointer"
                              >
                                {target.title}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {node && (node.uncle_bob || node.cognitive_complexity !== undefined) && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
                  Chỉ số
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs bg-[#faf8ff] border border-[#eaedff] p-2.5 rounded-lg text-[#334155]">
                  {node.uncle_bob && (
                    <>
                      <span>
                        <strong>I:</strong> {node.uncle_bob.instability}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>A:</strong> {node.uncle_bob.abstractness}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>D:</strong> {node.uncle_bob.distance}
                      </span>
                      <span>·</span>
                      <span>
                        <strong>Chẩn đoán:</strong>{" "}
                        {node.uncle_bob.is_exempt
                          ? "Miễn trừ"
                          : node.uncle_bob.diagnosis}
                      </span>
                    </>
                  )}
                  {node.cognitive_complexity !== undefined && (
                    <>
                      {node.uncle_bob && <span>·</span>}
                      <span>
                        <strong>Độ phức tạp nhận thức:</strong>{" "}
                        {node.cognitive_complexity}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Nút cuối X-Ray (UI-47) */}
      {nodeStatus === "COMPLETED" || nodeStatus === "FAILED" ? (
        <FinishedNote status={nodeStatus} />
      ) : (
        <StartAnswerButton />
      )}
    </div>
  );
}

export function XRayPanel({
  analysis: analysisProp,
  node = null,
  activeStep = null,
  onSelectStep,
  allNodes = [],
}: XRayPanelProps) {
  const progress = useWorkbenchStore((s) => s.progress);
  const stage = useWorkbenchStore((s) => s.ui.xray_stage);
  const activeTab = useWorkbenchStore((s) => s.active_tab);
  const storedAnalysis = useWorkbenchStore((s) =>
    node?.id ? s.analyses[node.id] : undefined
  );

  const analysisValue = analysisProp ?? storedAnalysis ?? null;
  const analysis =
    analysisValue && typeof analysisValue === "object" ? analysisValue : null;
  const analysisState: "READY" | "PENDING" | "FAILED" = analysis
    ? "READY"
    : analysisValue === "FAILED"
    ? "FAILED"
    : "PENDING";

  const hasWarning = node?.id
    ? Boolean(progress?.nodes?.[node.id]?.has_warning)
    : false;

  const steps = buildTourSteps(node, analysisValue);
  const stepNumbers = steps.map((s) => s.step);
  const stepKey = stepNumbers.join(",");

  const select = (step: number) => {
    if (onSelectStep) onSelectStep(step);
    else useWorkbenchStore.getState().setActiveStep(step);
  };

  // Phím ← → chuyển bước (UI 6.1): không chạy khi đang gõ trong ô nhập hoặc mở cửa sổ
  useEffect(() => {
    if (activeTab !== "XRAY" || stepNumbers.length === 0) return;
    const nums = stepKey.split(",").map(Number);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dialogOpen =
        document.querySelector('[role="dialog"][aria-modal="true"], dialog[open]') !==
        null;
      if (shouldIgnoreTourKey(e.target as HTMLElement | null, dialogOpen)) return;
      e.preventDefault();
      const st = useWorkbenchStore.getState();
      if (e.key === "ArrowRight") st.tourNext(nums);
      else st.tourPrev(nums);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, stepKey]);

  const curIndex = Math.max(
    0,
    steps.findIndex((s) => s.step === activeStep)
  );
  const storeActions = useWorkbenchStore.getState;

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#faf8ff] border-b border-[#eaedff] text-xs">
      {stage === "ROLE" && (
        <RoleStage
          node={node}
          hasWarning={hasWarning}
          canStart={steps.length > 0}
          onStart={() => {
            if (steps.length > 0) storeActions().goToStep(steps[0].step);
          }}
        />
      )}

      {stage === "TOUR" && steps.length > 0 && (
        <TourStage
          steps={steps}
          index={curIndex}
          analysis={analysis}
          analysisState={analysisState}
          onGoToStep={(step) => storeActions().goToStep(step)}
          onPrev={() => storeActions().tourPrev(stepNumbers)}
          onNext={() => storeActions().tourNext(stepNumbers)}
        />
      )}

      {stage === "SUMMARY" && (
        <SummaryStage
          analysis={analysis}
          analysisState={analysisState}
          node={node}
          lastStep={steps[steps.length - 1]?.step ?? 1}
          allNodes={allNodes}
          onSelectStep={select}
          onBackToTour={() =>
            storeActions().goToStep(steps[steps.length - 1]?.step ?? 1)
          }
        />
      )}
    </div>
  );
}
