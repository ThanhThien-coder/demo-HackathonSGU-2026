"use client";

import React, { useState } from "react";
import { FileCode, Copy, Check, Maximize2, AlertTriangle, RefreshCw, Cpu, ShieldAlert, Sparkles } from "lucide-react";
import type { NodeAnalysisView } from "@/contracts";

interface CodeSnippetViewerProps {
  fileName?: string;
  scope?: string;
  analysis?: NodeAnalysisView | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenFullFile: () => void;
  highlightedStep?: number | null;
}

const FALLBACK_CODE_LINES = [
  { line: 18, code: "async processCheckout(dto: CheckoutDto): Promise<OrderResult> {" },
  { line: 19, code: "    const order = await this.orderRepo.create(dto);" },
  { line: 20, code: "" },
  { line: 21, code: "    for (const item of dto.items) {" },
  { line: 22, code: "        await this.inventoryRepo.updateStock(item.id, item.qty);", isTarget: true },
  { line: 23, code: "    }" },
  { line: 24, code: "" },
  { line: 25, code: "    const payment = await this.paymentGateway.charge(order.id, dto.amount);" },
  { line: 26, code: "    await this.auditLog.record('ORDER_CREATED', order.id);" },
  { line: 27, code: "    return { orderId: order.id, status: 'SUCCESS' };" },
  { line: 28, code: "}" },
];

export function CodeSnippetViewer({
  fileName = "order.service.ts",
  scope = "Scope: OrderService.processCheckout",
  analysis,
  isLoading = false,
  errorMessage = null,
  onRetry,
  onOpenFullFile,
  highlightedStep = null,
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  const rawCode = FALLBACK_CODE_LINES.map((l) => l.code).join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="bg-white border border-[#e5e7eb]/80 flex flex-col overflow-hidden rounded-[16px] shadow-[0px_8px_24px_0px_rgba(148,75,0,0.08)] w-full lg:w-[588px] shrink-0"
      data-node-id="5:64"
      data-name="Section"
    >
      {/* File Header */}
      <div
        className="bg-gradient-to-r from-white to-[#faf8ff] border-b-[0.8px] border-[#eaedff] px-4 py-3.5 flex items-center justify-between"
        data-node-id="5:65"
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-[#eaedff] size-7 rounded-[8px] flex items-center justify-center shrink-0">
            <FileCode className="size-4 text-[#004cff]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#004cff] text-[15px] leading-tight font-mono">
              {fileName}
            </span>
            <span className="font-semibold text-[#554337] text-[12px] leading-tight">
              {scope}
            </span>
          </div>
        </div>

        {/* Pattern & Analysis Badges */}
        <div className="flex items-center gap-1.5">
          {analysis?.architecture?.patterns?.map((pattern, idx) => (
            <span
              key={idx}
              className="text-[10px] font-bold bg-[#f2f3ff] text-[#004cff] px-2 py-0.5 rounded-full border border-[#eaedff]"
            >
              {pattern}
            </span>
          ))}
          {analysis && (
            <span
              className="text-[10px] font-bold bg-[#ffdcc5]/60 text-[#944b00] px-2 py-0.5 rounded-full border border-[#ff9640]/30 flex items-center gap-1"
              title="Độ phức tạp nhận thức của lát cắt"
            >
              <Cpu className="size-3" />
              AI X-Ray
            </span>
          )}
        </div>
      </div>

      {/* Weak Points Warning Banner (if AI analysis detected architectural issues) */}
      {analysis?.weak_points && analysis.weak_points.length > 0 && (
        <div className="bg-[#fff7ed] border-b border-[#fed7aa] p-3 text-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#944b00]">
            <ShieldAlert className="size-4 text-[#ea580c] shrink-0" />
            <span>Điểm yếu kiến trúc phát hiện — </span>
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
        className="flex-1 min-h-[380px] bg-[#faf8ff] overflow-x-auto font-mono text-[13px] leading-[19.5px] select-text relative"
        data-node-id="5:79"
      >
        {/* Loading State: Skeleton Shimmer */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#faf8ff]/90 backdrop-blur-[2px] z-10 flex flex-col justify-center items-center gap-3 p-6 text-center">
            <RefreshCw className="size-7 text-[#ff9640] animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-[#131b2e]">Đang phân tích kiến trúc node bằng AI...</span>
              <span className="text-xs text-[#625e56]">Trích xuất luồng thực thi, các bước xử lý và mẫu thiết kế</span>
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
              <span className="font-bold text-sm text-[#131b2e]">Chưa thể phân tích bài học này</span>
              <span className="text-xs text-[#625e56] leading-relaxed">{errorMessage}</span>
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

        {/* Normal Code Lines */}
        {!errorMessage && (
          <div className="min-w-full flex flex-col">
            {FALLBACK_CODE_LINES.map((lineObj) => {
              const isStepMatch = highlightedStep !== null && lineObj.isTarget;
              const isTargetLine = lineObj.isTarget;

              let lineClass = "border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center px-4 hover:bg-[#f2f3ff]/50 transition-colors";
              if (isStepMatch) {
                lineClass = "border-b-[0.8px] border-[#a78bfa] bg-[#f5f3ff] h-8 flex items-center pl-10 pr-4 transition-colors relative ring-1 ring-[#a78bfa]";
              } else if (isTargetLine) {
                lineClass = "border-b-[0.8px] border-[#ff9640]/40 bg-[#fff0e4]/60 h-8 flex items-center pl-10 pr-4 transition-colors relative";
              } else if (lineObj.code.startsWith("    ")) {
                lineClass = "border-b-[0.8px] border-[#e5e7eb] h-8 flex items-center pl-10 pr-4 hover:bg-[#f2f3ff]/50 transition-colors";
              }

              return (
                <div key={lineObj.line} className={lineClass}>
                  <span
                    className={`w-6 shrink-0 text-xs select-none ${
                      isTargetLine ? "font-bold text-[#ff9640] -ml-6" : "text-[#99a1af] -ml-6"
                    }`}
                  >
                    {lineObj.line}
                  </span>
                  {isTargetLine && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff9640]" />}
                  {isStepMatch && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#a78bfa]" />}
                  <span className="text-[#131b2e] whitespace-pre font-mono">{lineObj.code}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div
        className="bg-[#944b00] border-t-[0.8px] border-[#eaedff] px-4 py-2.5 flex items-center justify-between shrink-0"
        data-node-id="5:154"
      >
        <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
          <Sparkles className="size-3.5 text-[#ffdcc5]" />
          <span className="hidden sm:inline">Phân tích cú pháp bởi Tree-sitter & SimpliFey AI</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            type="button"
            className="bg-white hover:bg-white/95 active:bg-white/90 text-[#131b2e] text-xs font-bold px-3 py-1.5 rounded-[6px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            data-node-id="5:156"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-[#00bc7d]" />
                <span className="text-[#00bc7d]">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-[#554337]" />
                <span>Sao chép code</span>
              </>
            )}
          </button>

          {/* View Full File Button */}
          <button
            onClick={onOpenFullFile}
            type="button"
            className="bg-white hover:bg-white/95 active:bg-white/90 text-[#131b2e] text-xs font-bold px-3 py-1.5 rounded-[6px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            data-node-id="5:162"
          >
            <Maximize2 className="size-3.5 text-[#554337]" />
            <span>Xem toàn bộ file</span>
          </button>
        </div>
      </div>
    </div>
  );
}
