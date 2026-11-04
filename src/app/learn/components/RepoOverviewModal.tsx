"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Layers, Sparkles, RefreshCw, AlertTriangle, Workflow, Compass } from "lucide-react";
import type { RepoOverviewView } from "@/contracts";

interface RepoOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview?: RepoOverviewView | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function RepoOverviewModal({
  isOpen,
  onClose,
  overview,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: RepoOverviewModalProps) {
  const isNotReady = errorMessage?.includes("tiếp tục phân tích") || errorMessage?.includes("ERR_OVERVIEW_NOT_READY");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#fff0e4] border border-[#ff9640]/40 flex items-center justify-center text-[#ff9640]">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">
              Bức Tranh Toàn Cảnh Kiến Trúc Hệ Thống (Repo Overview)
            </h3>
            <span className="text-xs text-[#625e56]">
              Tổng hợp cấu trúc phân tầng, luồng xử lý chính và công nghệ cốt lõi
            </span>
          </div>
        </div>
      }
      description="Phân tích kiến trúc toàn cảnh repository từ AI SimpliFey"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <RefreshCw className="size-8 text-[#ff9640] animate-spin" />
            <span className="font-bold text-sm text-[#131b2e]">
              AI đang tổng hợp toàn bộ các lát cắt kiến trúc...
            </span>
            <span className="text-xs text-[#625e56]">
              Đối chiếu luồng dữ liệu từ Entry Point tới tầng Cơ sở dữ liệu
            </span>
          </div>
        )}

        {/* Error State / Not Ready State */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-[12px] bg-[#fff7ed] border border-[#fed7aa] flex flex-col items-center text-center gap-3">
            <div className="size-10 rounded-full bg-[#ffedd5] flex items-center justify-center text-[#c2410c]">
              {isNotReady ? <Compass className="size-5 animate-pulse" /> : <AlertTriangle className="size-5" />}
            </div>
            <div className="flex flex-col gap-1 max-w-[480px]">
              <span className="font-bold text-sm text-[#131b2e]">
                {isNotReady ? "Đang hoàn tất các lát cắt còn lại" : "Chưa thể tải tổng quan"}
              </span>
              <p className="text-xs text-[#7c2d12] leading-relaxed">
                {isNotReady
                  ? "Hệ thống đang tiếp tục phân tích các thành phần còn lại để dựng bức tranh toàn cảnh."
                  : errorMessage}
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="mt-1 bg-[#ff9640] hover:bg-[#e07f2e] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Kiểm tra lại
              </button>
            )}
          </div>
        )}

        {/* Success State */}
        {!isLoading && overview && (
          <div className="flex flex-col gap-4">
            {/* System Facts Bar */}
            {overview.facts && (
              <div className="bg-[#faf8ff] border border-[#eaedff] rounded-[12px] p-4 flex flex-wrap items-center justify-between gap-3">
                {overview.facts.archetype && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#625e56] font-semibold">Archetype:</span>
                    <span className="text-xs font-bold text-[#131b2e] bg-white px-2.5 py-1 rounded-md border border-[#eaedff]">
                      {overview.facts.archetype}
                    </span>
                  </div>
                )}
                {overview.facts.framework && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#625e56] font-semibold">Framework:</span>
                    <span className="text-xs font-bold text-[#004cff] bg-[#eaedff]/60 px-2.5 py-1 rounded-md">
                      {overview.facts.framework}
                    </span>
                  </div>
                )}
                {overview.facts.tech_stack && overview.facts.tech_stack.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#625e56] font-semibold mr-1">Công nghệ:</span>
                    {overview.facts.tech_stack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold bg-white text-[#554337] px-2 py-0.5 rounded border border-[#eaedff]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Architecture Overview Block */}
            {overview.ai ? (
              <div className="flex flex-col gap-4">
                {/* AI Disclaimer Header */}
                <div className="rounded-[12px] bg-gradient-to-r from-[#fff0e4] to-[#ffdcc5]/40 border border-[#ff9640]/40 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#944b00] uppercase tracking-wider">
                        Phong cách kiến trúc:
                      </span>
                      <span className="text-xs font-extrabold bg-[#ff9640] text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        {overview.ai.architecture_style}
                      </span>
                    </div>
                    {/* Mandatory Disclaimer Badge */}
                    <span className="text-[11px] font-bold text-[#944b00] bg-white/70 px-2 py-0.5 rounded-full border border-[#ff9640]/30 flex items-center gap-1">
                      <Sparkles className="size-3 text-[#ff9640]" />
                      Nhận định của AI — có thể chưa chính xác
                    </span>
                  </div>

                  <p className="text-sm text-[#131b2e] leading-relaxed font-medium">
                    {overview.ai.summary}
                  </p>
                </div>

                {/* Main Flow Section */}
                {overview.ai.main_flow && (
                  <div className="flex flex-col gap-1.5 bg-[#fafbfc] border border-[#e2e8f0] p-4 rounded-[12px]">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#334155] uppercase tracking-wider">
                      <Workflow className="size-4 text-[#0284c7]" />
                      <span>Luồng dữ liệu chính xuyên suốt</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed pl-6 font-mono">
                      {overview.ai.main_flow}
                    </p>
                  </div>
                )}

                {/* Architecture Layers Breakdown */}
                {overview.ai.layers && overview.ai.layers.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#554337] uppercase tracking-wider">
                      Các tầng kiến trúc & vai trò
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {overview.ai.layers.map((layer, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-[#e5e7eb] rounded-[10px] p-3 flex flex-col gap-1 hover:border-[#ff9640]/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#004cff] font-mono">
                              {layer.layer}
                            </span>
                            <span className="text-[10px] text-[#64748b] bg-gray-100 px-1.5 py-0.5 rounded">
                              {layer.nodes?.length || 0} nodes
                            </span>
                          </div>
                          <span className="text-xs text-[#475569] leading-relaxed">
                            {layer.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-[10px] text-xs text-gray-600 text-center">
                Bản phân tích AI chưa hoàn tất, hiển thị thông tin thực tế từ hệ thống.
              </div>
            )}
          </div>
        )}

        {/* Modal Close Action */}
        <div className="flex justify-end pt-3 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold text-xs rounded-[8px] transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </Dialog>
  );
}
