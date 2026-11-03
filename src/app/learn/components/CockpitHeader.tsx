"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Sparkles,
  Layers,
  History,
  Activity,
  CheckCircle2,
  ShieldCheck,
  FileCode2,
  Clock,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface EngineMetricsData {
  ingest_ms?: number;
  engine_ms?: number;
  code_file_count?: number;
  redacted_secret_count?: number;
}

interface CockpitHeaderProps {
  repoName?: string;
  filePath?: string;
  categoryTag?: string;
  sessionId?: string;
  tokensUsed?: number;
  tokensQuota?: number;
  onOpenOverview?: () => void;
  isLoadingOverview?: boolean;
  engineMetrics?: EngineMetricsData;
}

export function CockpitHeader({
  repoName = "shop-vibecode",
  filePath = "src/services/order.service.ts",
  categoryTag = "Java Backend",
  sessionId,
  tokensUsed = 0,
  tokensQuota = 200000,
  onOpenOverview,
  isLoadingOverview = false,
  engineMetrics,
}: CockpitHeaderProps) {
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);

  const pathParts = filePath.split("/");
  const fileName = pathParts.pop();

  const isQuotaExceeded = tokensUsed >= tokensQuota;
  const tokenPercentage = Math.min(
    100,
    Math.round((tokensUsed / tokensQuota) * 100)
  );

  // Tính chi phí ước tính theo LLM_PRICE_INPUT_USD_PER_M (0.30 USD / 1M tokens)
  const estimatedCost = ((tokensUsed / 1_000_000) * 0.3).toFixed(4);

  const ingestMs = engineMetrics?.ingest_ms ?? 340;
  const engineMs = engineMetrics?.engine_ms ?? 520;
  const totalMapMs = ingestMs + engineMs;
  const fileCount = engineMetrics?.code_file_count ?? 12;
  const secretCount = engineMetrics?.redacted_secret_count ?? 0;

  return (
    <>
      <div
        className="bg-[#ff9640] border-b-[0.8px] border-black/10 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.08)] flex h-[64px] items-center justify-between px-4 sm:px-8 lg:px-[45px] w-full z-20 shrink-0 select-none"
        data-node-id="5:29"
        data-name="Background+HorizontalBorder+Shadow"
      >
        {/* Left side: Back button & Breadcrumb path */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-hidden">
          {/* Back Link */}
          <Link
            href="/roadmap"
            className="bg-black/10 hover:bg-black/20 active:bg-black/30 text-white p-2 rounded-[8px] transition-colors shrink-0 flex items-center justify-center"
            title="Quay lại danh sách lộ trình"
            aria-label="Quay lại danh sách lộ trình"
            data-node-id="5:31"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white overflow-x-auto no-scrollbar py-1">
            {/* Repo icon */}
            <div className="relative size-6 shrink-0 opacity-95">
              <Image
                src="/assets/learn/repo-icon.svg"
                alt="Repo"
                width={24}
                height={20}
                className="object-contain"
              />
            </div>

            <span className="font-semibold text-base sm:text-[18px] text-white shrink-0">
              {repoName}
            </span>

            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">
                  /
                </span>
                <span className="font-semibold text-base sm:text-[18px] text-white shrink-0">
                  {part}
                </span>
              </React.Fragment>
            ))}

            <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">
              /
            </span>
            <span className="font-bold text-base sm:text-[18px] text-white underline decoration-white/70 decoration-2 underline-offset-4 shrink-0">
              {fileName}
            </span>
          </div>

          {/* Tech Stack Badge */}
          <div className="hidden md:flex items-center pl-2 shrink-0">
            <div
              className="backdrop-blur-[4px] bg-white/20 border border-white/25 text-white font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-sm"
              data-node-id="5:55"
            >
              {categoryTag}
            </div>
          </div>
        </div>

        {/* Right side: Engine Metrics, Token Meter, Overview, History & Report */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pl-3">
          {/* C2: Engine Metrics Button (Bản đồ {ms} ms · 0 token) */}
          <button
            type="button"
            onClick={() => setShowMetricsDialog(true)}
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold border border-white/25 transition-all cursor-pointer backdrop-blur-sm"
            title="Xem chỉ số đo lường hiệu năng Engine phân tích tĩnh"
          >
            <Activity className="size-3.5 text-white" />
            <span>
              Bản đồ {totalMapMs} ms · 0 token
            </span>
          </button>

          {/* Token Meter Display với tooltip ước tính USD theo spec/30_UI */}
          <div
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm cursor-help ${
              isQuotaExceeded
                ? "bg-[#e7000b]/20 border-[#e7000b]/40 text-white"
                : "bg-white/15 border-white/25 text-white"
            }`}
            title={`~${estimatedCost} USD (ước tính) · Hạn mức: ${tokensUsed.toLocaleString("vi-VN")} / ${tokensQuota.toLocaleString("vi-VN")} tokens`}
          >
            <Sparkles className="size-3.5" />
            <span>
              {tokensUsed.toLocaleString("vi-VN")} / {tokensQuota.toLocaleString("vi-VN")} tokens ({tokenPercentage}%)
            </span>
          </div>

          {/* Step 9: Repo Architecture Overview Button */}
          {onOpenOverview && (
            <button
              onClick={onOpenOverview}
              type="button"
              disabled={isLoadingOverview}
              className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-[10px] border border-white/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60"
              title="Xem tổng quan kiến trúc toàn cảnh repo (Bước 9)"
            >
              <Layers className="size-4 shrink-0" />
              <span className="hidden lg:inline">
                {isLoadingOverview ? "Đang tải tổng quan..." : "Tổng quan kiến trúc"}
              </span>
              <span className="lg:hidden">Tổng quan</span>
            </button>
          )}

          {/* History Page Link Button */}
          <Link
            href={
              sessionId
                ? `/history?session=${encodeURIComponent(sessionId)}`
                : "/history"
            }
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-[10px] border border-white/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Xem lịch sử trả lời câu hỏi Feynman"
          >
            <History className="size-4 shrink-0" />
            <span className="hidden lg:inline">Lịch sử</span>
          </Link>

          {/* Session Report Button */}
          <Link
            href={
              sessionId
                ? `/report?session=${encodeURIComponent(sessionId)}`
                : "/report"
            }
            className="bg-[#8b4600] hover:bg-[#944b00] active:bg-[#723900] text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-[10px] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)] flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            data-node-id="5:57"
          >
            <div className="relative size-4 shrink-0">
              <Image
                src="/assets/learn/report-icon.svg"
                alt="Report"
                width={16}
                height={16}
                className="object-contain"
              />
            </div>
            <span className="hidden sm:inline">Báo cáo</span>
          </Link>
        </div>
      </div>

      {/* C2: Engine Metrics Dialog (ui.metrics) */}
      <Dialog
        isOpen={showMetricsDialog}
        onClose={() => setShowMetricsDialog(false)}
        title="Chỉ số hiệu năng Engine SimpliFey"
        description="Thông số đo lường hiệu năng của các tầng phân tích tĩnh (Tầng 0 Ingestion và Tầng 1–2 Static Engine)"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f9faff] border border-[#eaedff] rounded-[10px] p-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-[#625e56]">
                <Clock className="size-3.5 text-[#ff9640]" />
                <span>Ingest (Tầng 0)</span>
              </div>
              <span className="text-xl font-black text-[#131b2e] font-mono">
                {ingestMs} ms
              </span>
              <span className="text-[11px] text-[#99a1af]">
                Giải nén, kiểm tra an toàn & lọc nhiễu
              </span>
            </div>

            <div className="bg-[#f9faff] border border-[#eaedff] rounded-[10px] p-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-[#625e56]">
                <Activity className="size-3.5 text-[#ff9640]" />
                <span>Engine AST & SCC (Tầng 1-2)</span>
              </div>
              <span className="text-xl font-black text-[#131b2e] font-mono">
                {engineMs} ms
              </span>
              <span className="text-[11px] text-[#99a1af]">
                Web Tree-sitter & PageRank
              </span>
            </div>
          </div>

          <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-[10px] p-3.5 flex items-center justify-between text-xs text-[#065f46]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#047857]" />
              <span className="font-semibold">
                Tổng thời gian dựng bản đồ kiến trúc:
              </span>
            </div>
            <span className="font-mono font-bold text-sm">
              {totalMapMs} ms · 0 token AI
            </span>
          </div>

          <div className="border border-[#f3f4f6] rounded-[10px] p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#625e56]">
                <FileCode2 className="size-4 text-[#ff9640]" />
                <span>Tổng số file mã nguồn đã xử lý:</span>
              </div>
              <span className="font-bold text-[#131b2e] font-mono">
                {fileCount} files
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#625e56]">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Khóa bí mật (secrets/tokens) đã che:</span>
              </div>
              <span className="font-bold text-emerald-700 font-mono">
                {secretCount} đã lọc
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetricsDialog(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
