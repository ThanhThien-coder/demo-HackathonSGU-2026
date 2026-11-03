"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  FolderGit2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import {
  RoadmapHeader,
  RoadmapCardList,
  RoadmapFooter,
  DEFAULT_ROADMAP_COURSES,
  type RoadmapCourse,
} from "@/components/roadmap";
import {
  getSessionsSafe,
  isApiError,
  type LearningSessionSummary,
} from "@/lib/api";

export default function RoadmapPage() {
  const [sessions, setSessions] = useState<LearningSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useDemoFallback, setUseDemoFallback] = useState<boolean>(false);

  const isBypassAuth =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await getSessionsSafe();

    if (result.ok) {
      setSessions(result.data?.sessions || []);
    } else {
      if (isApiError(result.error)) {
        setErrorMessage(
          result.error.error.message ||
            "Không thể tải danh sách lộ trình từ máy chủ."
        );
      } else {
        setErrorMessage("Mất kết nối tới máy chủ khi tải lộ trình học.");
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Chuyển đổi LearningSessionSummary sang RoadmapCourse
  const courses: RoadmapCourse[] = sessions.map((session) => {
    const progress =
      session.total_nodes > 0
        ? Math.min(
            100,
            Math.round((session.completed_count / session.total_nodes) * 100)
          )
        : 0;
    const isCompleted =
      session.completed_count >= session.total_nodes && session.total_nodes > 0;

    return {
      id: session.session_id,
      title: session.repo_name || "Dự án mã nguồn",
      description: `Phiên bản Engine v${session.engine_version} • Đã hoàn thành ${
        session.completed_count
      }/${session.total_nodes} bài học${
        session.failed_count > 0 ? ` • ${session.failed_count} bài cần ôn` : ""
      }`,
      status: isCompleted ? "completed" : "in-progress",
      progress,
      targetUrl: `/roadmap/${encodeURIComponent(session.session_id)}`,
      dataNodeId: isCompleted ? "5:877" : "5:829",
    };
  });

  return (
    <div
      className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]"
      data-node-id="5:818"
      data-name="Html → Body"
    >
      {/* 1. Global Navigation Header with Logged-in User Profile (Figma node 5:928) */}
      <Navbar user={{ name: "User" }} />

      {/* 2. Main Content Area (Figma node 5:819 / 5:820) */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div
          className="flex flex-col gap-8 sm:gap-10 items-center w-full max-w-[960px]"
          data-node-id="5:820"
          data-name="Main"
        >
          {/* Header Title with Graduation Cap Icon (Figma node 5:821) */}
          <RoadmapHeader />

          {/* Dev Bypass Auth Banner if applicable */}
          {isBypassAuth && sessions.length === 0 && !isLoading && !errorMessage && (
            <div className="w-full bg-[#f2f3ff] border border-[#d8dcf8] rounded-[12px] p-3.5 flex items-center justify-between text-[13px] text-[#4f46e5]">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0" />
                <span>
                  Chế độ <strong>Dev Bypass Auth</strong> đang bật. Bạn có thể xem
                  dữ liệu mẫu demo hoặc quét dự án thật từ Trang chủ.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUseDemoFallback(!useDemoFallback)}
                className="font-bold underline text-[#4f46e5] hover:text-[#3730a3] shrink-0 ml-3"
              >
                {useDemoFallback ? "Xem trạng thái thật" : "Xem dữ liệu mẫu"}
              </button>
            </div>
          )}

          {/* 1. LOADING STATE: Shimmer Skeleton */}
          {isLoading && (
            <div
              className="bg-white border border-[#c0c0c0] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col gap-[16px] items-start p-5 sm:p-[28.8px] rounded-[18px] w-full"
              data-node-id="5:828"
            >
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#f9fafb] border border-[#eaedf1] rounded-[16px] p-5 sm:p-[25.6px] w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-pulse"
                >
                  <div className="flex gap-4 items-center">
                    <div className="size-12 rounded-[10px] bg-gray-200" />
                    <div className="flex flex-col gap-2">
                      <div className="h-5 w-44 bg-gray-200 rounded" />
                      <div className="h-3.5 w-60 bg-gray-100 rounded" />
                      <div className="h-2 w-36 bg-gray-200 rounded-full mt-1" />
                    </div>
                  </div>
                  <div className="h-10 w-28 bg-gray-200 rounded-[12px]" />
                </div>
              ))}
            </div>
          )}

          {/* 2. ERROR STATE: Alert with Retry CTA */}
          {!isLoading && errorMessage && (
            <div className="w-full bg-red-50 border border-red-200 drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)] rounded-[18px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[16px] text-red-900">
                    Không thể tải danh sách lộ trình
                  </h4>
                  <p className="text-[13.5px] text-red-700 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchSessions}
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-[13px] px-4 py-2 rounded-[10px] flex items-center gap-2 transition-all shrink-0 self-end sm:self-center"
              >
                <RefreshCw className="size-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* 3. EMPTY STATE: Polished Empty Placeholder with CTA */}
          {!isLoading && !errorMessage && courses.length === 0 && !useDemoFallback && (
            <div
              className="bg-white border border-[#c0c0c0] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[18px] w-full max-w-[960px] gap-4"
              data-node-id="5:828"
            >
              <div className="size-16 rounded-full bg-[#fff7ed] border border-[#ff9640]/30 flex items-center justify-center text-[#ff9640] mb-1">
                <FolderGit2 className="size-8" />
              </div>

              <div className="flex flex-col gap-1.5 max-w-[500px]">
                <h3 className="font-bold text-[#131b2e] text-[20px] tracking-tight">
                  Chưa có lộ trình học tập nào
                </h3>
                <p className="text-[#625e56] text-[14.5px] leading-relaxed">
                  Bạn chưa khởi tạo hoặc phân tích kho mã nguồn nào. Hãy quét
                  repository GitHub hoặc tải lên tệp zip tại Trang chủ để
                  SimpliFey tự động kiến tạo lộ trình học tập cho bạn.
                </p>
              </div>

              <Link
                href="/"
                className="mt-2 bg-[#ff9640] hover:bg-[#f2852e] hover:scale-105 active:scale-95 text-white font-bold text-[14px] px-6 py-3 rounded-[12px] shadow-[0px_2px_4px_rgba(255,150,64,0.25)] flex items-center gap-2 transition-all select-none"
              >
                <span>Bắt đầu quét dự án ngay</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          {/* 4. SUCCESS STATE: Real Sessions List or Demo Mode Fallback */}
          {!isLoading && !errorMessage && (courses.length > 0 || useDemoFallback) && (
            <RoadmapCardList
              courses={useDemoFallback && courses.length === 0 ? DEFAULT_ROADMAP_COURSES : courses}
            />
          )}
        </div>
      </main>

      {/* 3. Global Footer (Figma node 5:919) */}
      <RoadmapFooter />
    </div>
  );
}
