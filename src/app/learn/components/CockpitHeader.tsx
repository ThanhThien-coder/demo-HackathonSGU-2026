"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, Layers } from "lucide-react";

interface CockpitHeaderProps {
  repoName?: string;
  filePath?: string;
  categoryTag?: string;
  sessionId?: string;
  tokensUsed?: number;
  tokensQuota?: number;
  onOpenOverview?: () => void;
  isLoadingOverview?: boolean;
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
}: CockpitHeaderProps) {
  const pathParts = filePath.split("/");
  const fileName = pathParts.pop();

  const isQuotaExceeded = tokensUsed >= tokensQuota;
  const tokenPercentage = Math.min(100, Math.round((tokensUsed / tokensQuota) * 100));

  return (
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
              <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">/</span>
              <span className="font-semibold text-base sm:text-[18px] text-white shrink-0">
                {part}
              </span>
            </React.Fragment>
          ))}

          <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">/</span>
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

      {/* Right side: Token Meter, Overview Button & Session Report Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pl-3">
        {/* Token Meter Display */}
        <div
          className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm ${
            isQuotaExceeded
              ? "bg-[#e7000b]/20 border-[#e7000b]/40 text-white"
              : "bg-white/15 border-white/25 text-white"
          }`}
          title={`Hạn mức AI: ${tokensUsed.toLocaleString("vi-VN")} / ${tokensQuota.toLocaleString("vi-VN")} tokens`}
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

        {/* Session Report Button */}
        <Link
          href={sessionId ? `/report?session=${encodeURIComponent(sessionId)}` : "/report"}
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
          <span className="hidden sm:inline">Báo cáo phiên học</span>
          <span className="sm:hidden">Báo cáo</span>
        </Link>
      </div>
    </div>
  );
}
