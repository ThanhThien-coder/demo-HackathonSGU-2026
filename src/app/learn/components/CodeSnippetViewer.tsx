"use client";

import React, { useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Sparkles,
  Lightbulb,
  Workflow,
} from "lucide-react";
import type { NodeAnalysisView, HybridArchitecturalNode } from "@/contracts";
import { buildSliceModel } from "@/components/code/slice-model";

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
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  // Compute code lines from real trace steps if available
  const hasRealSteps = Boolean(node?.trace_steps && node.trace_steps.length > 0);

  // Get raw code string for clipboard via official slice-model (UI-31)
  const getRawCodeString = (): string => {
    if (hasRealSteps && node) {
      return buildSliceModel(node).text;
    }
    return "";
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getRawCodeString());
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
      className={`bg-white border border-[#e5e7eb]/80 flex flex-col overflow-hidden rounded-[16px] shadow-[0px_8px_24px_0px_rgba(148,75,0,0.08)] transition-all duration-300 shrink-0 ${
        isPresentationMode
          ? "w-full lg:w-[65%] z-20 ring-2 ring-[#ff9640]/50"
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
              {pattern}
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
      {isAlgorithmicCore && (
        <div className="bg-[#f5f3ff] border-b border-[#ddd6fe] px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-[#6d28d9]">
            <Workflow className="size-4 text-[#7c3aed]" />
            <span>Chặng thuật toán:</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <span className="bg-white text-[#6d28d9] px-2 py-0.5 rounded-full border border-[#c4b5fd]">
              1. Khởi tạo
            </span>
            <span className="text-[#a78bfa]">→</span>
            <span className="bg-white text-[#6d28d9] px-2 py-0.5 rounded-full border border-[#c4b5fd]">
              2. Vòng lặp chính
            </span>
            <span className="text-[#a78bfa]">→</span>
            <span className="bg-white text-[#6d28d9] px-2 py-0.5 rounded-full border border-[#c4b5fd]">
              3. Điều kiện dừng
            </span>
          </div>
        </div>
      )}

      {/* Weak Points Warning Banner (INV-06 & UI-41: Mandatory AI Disclaimer, NO fix reveal) */}
      {analysis?.weak_points && analysis.weak_points.length > 0 && (
        <div className="bg-[#fff7ed] border-b border-[#fed7aa] p-3 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#944b00]">
            <ShieldAlert className="size-4 text-[#ea580c] shrink-0" />
            <span>Điểm dở — </span>
            <span className="bg-[#ffdcc5] text-[#944b00] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
              Nhận định của AI
            </span>
          </div>
          {analysis.weak_points.map((wp, idx) => (
            <div key={idx} className="text-[#7c2d12] pl-5 leading-relaxed">
              <span className="font-semibold">⚠️ {wp.what}:</span> {wp.consequence}
            </div>
          ))}
        </div>
      )}

      {/* Code Area */}
      <div
        className={`flex-1 min-h-[380px] bg-[#faf8ff] overflow-x-auto font-mono select-text relative ${
          isPresentationMode
            ? "text-[15px] leading-[24px]"
            : "text-[13px] leading-[19.5px]"
        }`}
        data-node-id="5:79"
      >
        {/* Loading State: Skeleton Shimmer */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#faf8ff]/90 backdrop-blur-[2px] z-10 flex flex-col justify-center items-center gap-3 p-6 text-center">
            <RefreshCw className="size-7 text-[#ff9640] animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#131b2e]">
                Đang phân tích kiến trúc node bằng AI...
              </span>
              <span className="text-xs text-[#625e56]">
                Trích xuất luồng thực thi, các bước xử lý và mẫu thiết kế
              </span>
            </div>
            {/* Shimmer line bars */}
            <div className="w-full max-w-[360px] flex flex-col gap-2 mt-2">
              <div className="h-4 bg-[#eaedff] rounded animate-pulse w-3/4" />
              <div className="h-4 bg-[#eaedff] rounded animate-pulse w-full" />
              <div className="h-4 bg-[#eaedff] rounded animate-pulse w-5/6" />
            </div>
          </div>
        )}

        {/* Error State: Error card with retry */}
        {errorMessage && !isLoading && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center gap-3">
            <div className="size-12 rounded-full bg-[#fee2e2] flex items-center justify-center text-[#dc2626]">
              <AlertTriangle className="size-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-[400px]">
              <span className="font-bold text-sm text-[#131b2e]">
                Chưa thể phân tích bài học này
              </span>
              <span className="text-xs text-[#625e56] leading-relaxed">
                {errorMessage}
              </span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="mt-2 bg-[#ff9640] hover:bg-[#e07f2e] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Thử lại phân tích
              </button>
            )}
          </div>
        )}

        {/* Real Trace Steps Rendering */}
        {!errorMessage && hasRealSteps && node?.trace_steps && (
          <div className="min-w-full flex flex-col">
            {node.trace_steps.map((step) => {
              const isStepActive = activeStep === step.step_number;
              const isStepHinted = highlightedStep === step.step_number;
              const hasWeakPoint = analysis?.weak_points?.some(
                (wp) =>
                  wp.file_path === step.file_path ||
                  (wp as unknown as { step?: number }).step === step.step_number
              );

              const lines = step.snippet.split("\n");

              return (
                <div
                  key={step.step_number}
                  className={`flex flex-col border-b border-[#eaedff] transition-colors ${
                    isStepHinted
                      ? "bg-[#f5f3ff] ring-1 ring-[#a78bfa]"
                      : isStepActive
                      ? "bg-[#fff0e4]/50"
                      : "hover:bg-[#f2f3ff]/40"
                  }`}
                  onClick={() => onSelectStep?.(step.step_number)}
                >
                  {/* Step Header */}
                  <div className="px-4 py-1.5 bg-[#f2f3ff]/70 border-b border-[#eaedff] flex items-center justify-between text-[11px] text-[#554337] select-none">
                    <div className="flex items-center gap-1.5 font-semibold truncate">
                      <span className="font-bold text-[#ff9640]">
                        Bước {step.step_number}
                      </span>
                      <span>·</span>
                      <span className="text-[#004cff] font-bold">
                        {step.layer}
                      </span>
                      <span>·</span>
                      <span className="truncate">{step.file_path}</span>
                      <span>·</span>
                      <span className="font-bold text-[#131b2e]">
                        {step.function_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {hasWeakPoint && (
                        <span
                          className="bg-[#fee2e2] text-[#dc2626] px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                          title="Bước này chứa điểm yếu kiến trúc phát hiện bởi AI"
                        >
                          <AlertTriangle className="size-3" />
                          Điểm dở
                        </span>
                      )}
                      {isStepHinted && (
                        <span
                          className="bg-[#ede9fe] text-[#7c3aed] px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                          title="Gợi ý CODE_POINTER từ phản biện AI"
                        >
                          <Lightbulb className="size-3" />
                          Gợi ý
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lines of code with original line numbers (UI-31) */}
                  <div className="flex flex-col">
                    {lines.map((lineText, lineIdx) => {
                      const origLine = step.snippet_line_map?.[lineIdx] || 0;
                      return (
                        <div
                          key={lineIdx}
                          className={`h-7 sm:h-8 flex items-center px-4 transition-colors relative ${
                            hasWeakPoint
                              ? "bg-[#fff5f5]/60 border-l-4 border-[#e7000b]"
                              : isStepHinted
                              ? "bg-[#f5f3ff] border-l-4 border-[#a78bfa]"
                              : isStepActive
                              ? "bg-[#fff0e4]/60 border-l-4 border-[#ff9640]"
                              : "hover:bg-[#f2f3ff]/50"
                          }`}
                        >
                          <span className="w-10 shrink-0 text-xs text-[#99a1af] select-none text-right pr-4 font-mono">
                            {origLine > 0 ? origLine : ""}
                          </span>
                          <span className="text-[#131b2e] whitespace-pre font-mono">
                            {lineText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* DTO Snippet Section if present */}
            {node.dto_snippet && (
              <div className="flex flex-col border-t-2 border-[#eaedff] bg-white">
                <div className="px-4 py-1.5 bg-[#faf8ff] text-[11px] font-bold text-[#554337] border-b border-[#eaedff]">
                  Kiểu dữ liệu liên quan (DTO / Interface)
                </div>
                <div className="p-4 text-xs font-mono text-[#131b2e] whitespace-pre bg-[#faf8ff]">
                  {node.dto_snippet}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback Code Lines if no real steps */}
        {!errorMessage && !hasRealSteps && (
          <p className="px-4 py-8 text-center text-sm text-[#625e56]">
            Chọn một bài trên bản đồ để xem code.
          </p>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div
        className="bg-white border-t-[0.8px] border-[#eaedff] px-4 py-3 flex items-center justify-between"
        data-node-id="5:161"
      >
        <span className="text-[12px] font-semibold text-[#625e56]">
          {hasRealSteps && node?.trace_steps
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
