"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  FileCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { NodeAnalysisView, HybridArchitecturalNode } from "@/contracts";
import { CONFIG } from "@/contracts";
import { buildSliceModel } from "@/components/code/slice-model";
import { XRayPanel, ARCHITECTURE_PATTERN_LABELS } from "./XRayPanel";

const CodePane = dynamic(() => import("@/components/code/CodePane"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-xs text-[#625e56]">
      Đang nạp trình xem code…
    </div>
  ),
});

const BASE_CODE_FONT_PX = 13;

interface CodeSnippetViewerProps {
  fileName?: string;
  scope?: string;
  node?: HybridArchitecturalNode | null;
  analysis?: NodeAnalysisView | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenFullFile: () => void;
  highlightedStep?: number | null;
  activeStep?: number | null;
  onSelectStep?: (stepIndex: number) => void;
  isPresentationMode?: boolean;
  onTogglePresentationMode?: () => void;
  allNodes?: HybridArchitecturalNode[];
}

export function CodeSnippetViewer({
  fileName = "",
  scope = "",
  node = null,
  analysis = null,
  isLoading = false,
  errorMessage = null,
  onRetry,
  onOpenFullFile,
  highlightedStep = null,
  activeStep = null,
  onSelectStep,
  isPresentationMode = false,
  onTogglePresentationMode,
  allNodes = [],
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  const fontSize = isPresentationMode
    ? Math.round(BASE_CODE_FONT_PX * CONFIG.UI_PRESENTATION_FONT_SCALE)
    : BASE_CODE_FONT_PX;

  const hasSteps = Boolean(node?.trace_steps && node.trace_steps.length > 0);
  const totalSteps = node?.trace_steps?.length ?? 0;
  const currentStep =
    node?.trace_steps?.find((s) => s.step_number === activeStep) ??
    node?.trace_steps?.[0];
  const currentStepNum = currentStep?.step_number ?? (activeStep ?? 1);
  const originPart = currentStep?.origin_note ? ` · ${currentStep.origin_note}` : "";

  const handleCopy = async () => {
    try {
      const rawText = node ? buildSliceModel(node).text : "";
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isAlgorithmicCore = Boolean(
    node?.is_vip_algorithm || node?.node_type === "ALGORITHMIC_CORE"
  );

  return (
    <div
      style={
        isPresentationMode
          ? ({ "--sf-focus": `${CONFIG.UI_PRESENTATION_FOCUS_PCT}%` } as React.CSSProperties)
          : undefined
      }
      className={`bg-white border border-[#e5e7eb]/80 flex flex-col overflow-hidden rounded-[16px] shadow-[0px_8px_24px_0px_rgba(148,75,0,0.08)] transition-all duration-300 shrink-0 ${
        isPresentationMode
          ? "w-full lg:w-[var(--sf-focus)] lg:shrink-0 z-20 ring-2 ring-[#ff9640]/50"
          : "w-full lg:w-[588px]"
      }`}
      data-node-id="5:64"
      data-name="Section"
    >
      {/* File Header */}
      <div
        className="bg-gradient-to-r from-white to-[#faf8ff] border-b-[0.8px] border-[#eaedff] px-4 py-3.5 flex items-center justify-between"
        data-node-id="5:65"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-[#eaedff] size-7 rounded-[8px] flex items-center justify-center shrink-0">
            <FileCode className="size-4 text-[#004cff]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#004cff] text-[15px] leading-tight font-mono truncate">
              {node?.files?.[0] ? node.files[0].split("/").pop() : fileName}
            </span>
            <span className="font-semibold text-[#554337] text-[12px] leading-tight truncate">
              {node?.entry_symbol
                ? `Scope: ${node.entry_symbol}`
                : node?.title
                ? `Lát cắt: ${node.title}`
                : scope}
            </span>
          </div>
        </div>

        {/* Pattern & Analysis Badges + Presentation Mode Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {analysis?.architecture?.patterns?.map((pattern, idx) => (
            <span
              key={idx}
              className="text-[10px] font-bold bg-[#f2f3ff] text-[#004cff] px-2 py-0.5 rounded-full border border-[#eaedff]"
            >
              {ARCHITECTURE_PATTERN_LABELS[pattern] || pattern}
            </span>
          ))}

          {isAlgorithmicCore && (
            <span
              className="text-[10px] font-bold bg-[#f5f3ff] text-[#7c3aed] px-2 py-0.5 rounded-full border border-[#ddd6fe] flex items-center gap-1"
              title="Lát cắt xử lý thuật toán cốt lõi"
            >
              <Cpu className="size-3 text-[#7c3aed]" />
              Thuật toán
            </span>
          )}

          {analysis && (
            <span
              className="text-[10px] font-bold bg-[#ffdcc5]/60 text-[#944b00] px-2 py-0.5 rounded-full border border-[#ff9640]/30 flex items-center gap-1"
              title="Độ phức tạp nhận thức của lát cắt"
            >
              <Sparkles className="size-3 text-[#ff9640]" />
              AI X-Ray
            </span>
          )}

          {/* Presentation Mode Button (UI-22) */}
          {onTogglePresentationMode && (
            <button
              onClick={onTogglePresentationMode}
              type="button"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isPresentationMode
                  ? "bg-[#ff9640] text-white border-[#ff9640]"
                  : "bg-[#f2f3ff] hover:bg-[#eaedff] text-[#554337] border-[#eaedff]"
              }`}
              title={
                isPresentationMode
                  ? "Thoát chế độ trình chiếu (Esc)"
                  : "Chế độ trình chiếu ⤢ (Phóng to khung & cỡ chữ)"
              }
            >
              {isPresentationMode ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Algorithmic Stepper (UI-43) - if ALGORITHMIC_CORE */}
      {isAlgorithmicCore && (() => {
        const hasSetup = Boolean(
          node?.trace_steps?.some((s) => s.layer === "ALGO_SETUP")
        );
        const hasExecution = Boolean(
          node?.trace_steps?.some((s) => s.layer === "ALGO_EXECUTION")
        );
        const hasTermination = Boolean(
          node?.trace_steps?.some((s) => s.layer === "ALGO_TERMINATION")
        );

        return (
          <div className="bg-[#f5f3ff] border-b border-[#ddd6fe] px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-[#6d28d9]">
              <Workflow className="size-4 text-[#7c3aed]" />
              <span>Chặng thuật toán:</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-[11px]">
              <span
                className={`px-2 py-0.5 rounded-full border transition-opacity ${
                  hasSetup
                    ? "bg-white text-[#6d28d9] border-[#c4b5fd]"
                    : "bg-gray-100/70 text-[#94a3b8] border-gray-200 opacity-50"
                }`}
                title={
                  hasSetup
                    ? "Chặng khởi tạo thuật toán"
                    : "Không có bước khởi tạo"
                }
              >
                1. Khởi tạo
              </span>
              <span className="text-[#a78bfa]">→</span>
              <span
                className={`px-2 py-0.5 rounded-full border transition-opacity ${
                  hasExecution
                    ? "bg-white text-[#6d28d9] border-[#c4b5fd]"
                    : "bg-gray-100/70 text-[#94a3b8] border-gray-200 opacity-50"
                }`}
                title={
                  hasExecution
                    ? "Chặng vòng lặp chính"
                    : "Không có bước vòng lặp chính"
                }
              >
                2. Vòng lặp chính
              </span>
              <span className="text-[#a78bfa]">→</span>
              <span
                className={`px-2 py-0.5 rounded-full border transition-opacity ${
                  hasTermination
                    ? "bg-white text-[#6d28d9] border-[#c4b5fd]"
                    : "bg-gray-100/70 text-[#94a3b8] border-gray-200 opacity-50"
                }`}
                title={
                  hasTermination
                    ? "Chặng điều kiện dừng"
                    : "Không có bước điều kiện dừng"
                }
              >
                3. Điều kiện dừng
              </span>
            </div>
          </div>
        );
      })()}

      {/* Code Area */}
      <div className="flex flex-col bg-[#faf8ff] select-text relative" data-node-id="5:79">
        {/* Loading bar: xoay + "đang phân tích…", không che code */}
        {isLoading && (
          <div className="bg-[#faf8ff] border-b border-[#eaedff] px-4 py-2 flex items-center gap-2 text-xs text-[#625e56]">
            <RefreshCw className="size-3.5 text-[#ff9640] animate-spin shrink-0" />
            <span>đang phân tích…</span>
          </div>
        )}

        {/* Error bar: "Chưa phân tích được", errorMessage, nút "Thử lại phân tích" gọi onRetry. Không che code */}
        {errorMessage && !isLoading && (
          <div className="bg-[#fef2f2] border-b border-[#fee2e2] px-4 py-2 flex items-center justify-between text-xs text-[#991b1b] gap-2">
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="size-3.5 text-[#ef4444] shrink-0" />
              <span className="font-semibold shrink-0">Chưa phân tích được</span>
              <span className="text-[#b91c1c] truncate">{errorMessage}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>Thử lại phân tích</span>
              </button>
            )}
          </div>
        )}

        {/* Đầu khu vực code khi có node: dòng bước chi tiết + hàng chip bước */}
        {hasSteps && node && (
          <div className="px-4 py-2 bg-[#f2f3ff]/70 border-b border-[#eaedff] flex flex-col gap-2">
            <div className="text-[12px] text-[#554337] font-semibold truncate">
              <span className="font-bold text-[#ff9640]">
                Bước {currentStepNum}/{totalSteps}
              </span>
              {currentStep && (
                <>
                  <span> · </span>
                  <span className="text-[#004cff] font-bold">{currentStep.layer}</span>
                  <span> · </span>
                  <span className="truncate">{currentStep.file_path}</span>
                  <span> · </span>
                  <span className="font-bold text-[#131b2e]">
                    {currentStep.function_name}
                  </span>
                  {originPart && <span className="text-[#625e56]">{originPart}</span>}
                </>
              )}
            </div>

            {/* Hàng chip bước bấm được gọi onSelectStep, chip có điểm dở thêm ⚠ */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {node.trace_steps?.map((step) => {
                const isSelected = activeStep === step.step_number;
                const isWeak = analysis?.weak_points?.some(
                  (wp) => wp.step === step.step_number
                );
                const isHint = highlightedStep === step.step_number;
                return (
                  <button
                    key={step.step_number}
                    type="button"
                    onClick={() => onSelectStep?.(step.step_number)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-[#ff9640] text-white border-[#ff9640] shadow-xs"
                        : isHint
                        ? "bg-[#f5f3ff] text-[#7c3aed] border-[#c4b5fd]"
                        : "bg-white text-[#554337] border-[#eaedff] hover:bg-[#f2f3ff]"
                    }`}
                  >
                    <span>Bước {step.step_number}</span>
                    {isWeak && <span title="Điểm dở phát hiện bởi AI">⚠</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Monaco Code Pane: Có node với trace_steps thì luôn hiện CodePane trong khung cao h-[520px] */}
        {hasSteps && node ? (
          <div className="h-[520px] w-full bg-[#faf8ff]">
            <CodePane
              node={node}
              analysis={analysis}
              activeStep={activeStep}
              hintStep={highlightedStep}
              onSelectStep={onSelectStep}
              fontSize={fontSize}
            />
          </div>
        ) : (
          <div className="h-[520px] flex items-center justify-center p-8 text-center text-sm text-[#625e56] bg-[#faf8ff]">
            Chọn một node — mỗi node là một lát cắt xuyên file
          </div>
        )}
      </div>

      {/* XRayPanel (UI-33, Mục 6.1) - Chứa banner Điểm dở và toàn bộ khối X-Ray */}
      {analysis && (
        <XRayPanel
          analysis={analysis}
          node={node}
          activeStep={activeStep}
          onSelectStep={onSelectStep}
          allNodes={allNodes}
        />
      )}

      {/* Bottom Action Footer */}
      <div
        className="bg-white border-t-[0.8px] border-[#eaedff] px-4 py-3 flex items-center justify-between"
        data-node-id="5:161"
      >
        <span className="text-[12px] font-semibold text-[#625e56]">
          {hasSteps && node?.trace_steps
            ? `${node.trace_steps.length} bước lát cắt · ${node.languages?.join(", ") || "TypeScript"}`
            : ""}
        </span>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#131b2e] bg-[#f2f3ff] hover:bg-[#eaedff] px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer"
            data-node-id="5:164"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-[#00bc7d]" />
                <span className="text-[#00bc7d]">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-[#554337]" />
                <span>Sao chép</span>
              </>
            )}
          </button>

          {/* Full File Modal Trigger */}
          <button
            onClick={onOpenFullFile}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#004cff] hover:bg-[#003ccc] px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer"
            data-node-id="5:167"
          >
            <Maximize2 className="size-3.5" />
            <span>Toàn bộ file</span>
          </button>
        </div>
      </div>
    </div>
  );
}
