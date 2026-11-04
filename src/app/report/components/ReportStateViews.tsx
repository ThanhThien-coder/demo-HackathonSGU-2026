"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft, BookOpen } from "lucide-react";
import type { ApiError } from "@/contracts";

export function ReportLoadingSkeleton() {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-10 w-44 bg-gray-200 rounded-[11px]" />

      {/* Top Student Overview Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 w-full">
        {/* Profile skeleton */}
        <div className="lg:col-span-4 bg-white border border-[#f3f4f6] rounded-[16px] p-5 flex items-center gap-4 min-h-[128px]">
          <div className="size-[78px] bg-gray-200 rounded-[16px] shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-6 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </div>
        </div>

        {/* 3 stats skeleton */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#f3f4f6] rounded-[16px] p-3 flex flex-col justify-between min-h-[128px]"
            >
              <div className="flex items-center justify-between">
                <div className="size-8 bg-gray-200 rounded-[6px]" />
                <div className="h-4 w-12 bg-gray-200 rounded" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-6 w-10 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Gauge skeleton */}
        <div className="md:col-span-2 lg:col-span-3 bg-white border border-[#f3f4f6] rounded-[16px] p-4 flex items-center justify-between min-h-[128px]">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
          <div className="size-[76px] rounded-full bg-gray-200 shrink-0" />
        </div>
      </div>

      {/* Radar Chart Skeleton */}
      <div className="bg-white border border-[#f3f4f6] rounded-[16px] p-6 flex flex-col gap-6">
        <div className="h-6 w-1/3 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex justify-center">
            <div className="size-[320px] rounded-full bg-gray-200" />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="h-24 bg-gray-200 rounded-[14px]" />
            <div className="h-20 bg-gray-200 rounded-[14px]" />
            <div className="h-20 bg-gray-200 rounded-[14px]" />
          </div>
        </div>
      </div>

      {/* Knowledge list skeleton */}
      <div className="bg-white border border-[#f3f4f6] rounded-[16px] p-6 flex flex-col gap-4">
        <div className="h-6 w-1/4 bg-gray-200 rounded" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-[12px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ReportErrorViewProps {
  error: ApiError | Error | null;
  onRetry: () => void;
  sessionId?: string;
}

export function ReportErrorView({ error, onRetry, sessionId }: ReportErrorViewProps) {
  // Chuẩn hóa thông điệp lỗi tiếng Việt theo spec/30_UI.md Mục 10
  let errorCode = "ERR_CLIENT_NETWORK";
  let errorMessage =
    "Không thể tải báo cáo phiên học. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";

  if (error && "error" in error && error.error) {
    errorCode = error.error.code;
    errorMessage = error.error.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Map mã lỗi sang tiếng Việt thân thiện
  if (errorCode === "ERR_UNAUTHENTICATED") {
    errorMessage = "Phiên đăng nhập đã hết hạn hoặc chưa được xác thực.";
  } else if (errorCode === "ERR_SESSION_NOT_FOUND") {
    errorMessage = "Không tìm thấy phiên học yêu cầu. Phiên có thể đã bị xóa hoặc không hợp lệ.";
  } else if (errorCode === "ERR_PERSISTENCE_UNAVAILABLE") {
    errorMessage = "Máy chủ lưu trữ đang gặp sự cố tạm thời. Vui lòng thử lại sau giây lát.";
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12 flex flex-col items-center justify-center min-h-[500px]">
      <div className="max-w-md w-full bg-white border border-[#fee2e2] rounded-[20px] p-6 sm:p-8 flex flex-col items-center text-center drop-shadow-[0px_4px_16px_rgba(239,68,68,0.12)] gap-4">
        <div className="size-16 rounded-full bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center text-[#e7000b]">
          <AlertCircle className="size-8" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#e7000b] bg-[#fee2e2] px-2.5 py-0.5 rounded-full uppercase tracking-wider self-center">
            {errorCode}
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#131b2e]">
            Đã xảy ra lỗi tải báo cáo
          </h2>
          <p className="text-[13px] text-[#554337] leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
          <button
            onClick={onRetry}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#944b00] hover:bg-[#8b4600] active:bg-[#773a00] text-white font-bold text-[14px] shadow-[0px_4px_6px_rgba(148,75,0,0.25)] transition-all select-none cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>Thử lại</span>
          </button>

          <Link
            href={sessionId ? `/learn?session=${encodeURIComponent(sessionId)}` : "/learn"}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#faf8ff] hover:bg-[#f0edff] text-[#131b2e] border border-[#eaedff] font-bold text-[14px] transition-all select-none"
          >
            <ArrowLeft className="size-4 text-[#554337]" />
            <span>Về buồng lái</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ReportEmptyViewProps {
  message?: string;
  ctaHref?: string;
  ctaText?: string;
}

export function ReportEmptyView({
  message = "Chưa có phiên học nào được chọn hoặc tài khoản chưa có phiên học nào.",
  ctaHref = "/learn",
  ctaText = "Bắt đầu học ngay",
}: ReportEmptyViewProps) {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-16 flex flex-col items-center justify-center min-h-[460px]">
      <div className="max-w-md w-full bg-white border border-[#f3f4f6] rounded-[20px] p-8 flex flex-col items-center text-center drop-shadow-[0px_4px_16px_rgba(0,0,0,0.06)] gap-4">
        <div className="size-16 rounded-full bg-[#fff7ed] border border-[#ffedd5] flex items-center justify-center text-[#ff9640]">
          <BookOpen className="size-8" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-[20px] font-bold text-[#131b2e]">
            Chưa có dữ liệu báo cáo
          </h2>
          <p className="text-[13px] text-[#554337] leading-relaxed">
            {message}
          </p>
        </div>

        <Link
          href={ctaHref}
          className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#944b00] hover:bg-[#8b4600] active:bg-[#773a00] text-white font-bold text-[14px] shadow-[0px_4px_6px_rgba(148,75,0,0.25)] transition-all select-none"
        >
          <span>{ctaText}</span>
        </Link>
      </div>
    </div>
  );
}
