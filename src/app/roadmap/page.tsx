"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import {
  RoadmapHeader,
  RoadmapCardList,
  RoadmapFooter,
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
      {/* 1. Global Navigation Header */}
      <Navbar />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="w-full max-w-[1040px] flex flex-col gap-6 sm:gap-8">
          {/* Header Title */}
          <RoadmapHeader />

          {/* 1. LOADING STATE: Shimmer Skeleton */}
          {isLoading && (
            <div
              className="bg-white border border-[#eaecef] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)] flex flex-col gap-[16px] items-start p-5 sm:p-[28.8px] rounded-[18px] w-full"
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
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-[13px] px-4 py-2 rounded-[10px] flex items-center gap-2 transition-all shrink-0 self-end sm:self-center cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* 3. CARD LIST OR EMPTY STATE */}
          {!isLoading && !errorMessage && (
            <RoadmapCardList courses={courses} />
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <RoadmapFooter />
    </div>
  );
}
