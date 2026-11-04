"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ReportHeader } from "./ReportHeader";
import {
  getMeSafe,
  getSessionHistorySafe,
  getSessionsSafe,
} from "@/lib/api";
import type {
  LearnerCognitiveProfile,
  AttemptHistoryItem,
  LearningSessionSummary,
  ApiError,
} from "@/contracts";
import { RadarChart } from "./RadarChart";
import { AttemptHistoryTimeline } from "./AttemptHistoryTimeline";
import { ReportOverview } from "./ReportOverview";
import { ReportKnowledgeBreakdown } from "./ReportKnowledgeBreakdown";
import { ReportRecommendations } from "./ReportRecommendations";
import {
  ReportLoadingSkeleton,
  ReportErrorView,
  ReportEmptyView,
} from "./ReportStateViews";

export function ReportClientView() {
  const searchParams = useSearchParams();
  const urlSessionId =
    searchParams.get("session") ||
    searchParams.get("session_id") ||
    searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const [profile, setProfile] = useState<LearnerCognitiveProfile | null>(null);
  const [serverNow, setServerNow] = useState<number>(Date.now());
  const [attempts, setAttempts] = useState<AttemptHistoryItem[]>([]);
  const [activeSession, setActiveSession] = useState<LearningSessionSummary | null>(null);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(urlSessionId);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Tích hợp Bước 1: GET /api/me (Lấy profile & 16 kỹ năng BKT)
      const meResult = await getMeSafe();
      let currentProfile: LearnerCognitiveProfile | null = null;
      let currentServerNow = Date.now();

      if (meResult.ok && meResult.data?.profile) {
        currentProfile = meResult.data.profile;
        currentServerNow = meResult.data.server_now;
      } else if (!meResult.ok) {
        setError(meResult.error);
      }

      setProfile(currentProfile);
      setServerNow(currentServerNow);

      // 2. Xác định sessionId (từ URL hoặc gọi GET /api/sessions lấy phiên gần nhất)
      let targetSessionId = urlSessionId;
      let sessionSummary: LearningSessionSummary | null = null;

      const sessionsResult = await getSessionsSafe({ limit: 5 });
      if (sessionsResult.ok && sessionsResult.data.sessions.length > 0) {
        if (!targetSessionId) {
          targetSessionId = sessionsResult.data.sessions[0].session_id;
        }
        sessionSummary =
          sessionsResult.data.sessions.find(
            (s) => s.session_id === targetSessionId
          ) || sessionsResult.data.sessions[0];
      }

      setResolvedSessionId(targetSessionId);
      setActiveSession(sessionSummary);

      // 3. Tích hợp Bước 7: GET /api/sessions/{session_id}/history
      if (targetSessionId) {
        const historyResult = await getSessionHistorySafe(targetSessionId);

        if (historyResult.ok && historyResult.data?.items) {
          setAttempts(historyResult.data.items);
        } else if (!historyResult.ok) {
          // Ghi nhận lỗi nếu không bật bypass auth
          setError(historyResult.error);
        }
      } else {
        setAttempts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [urlSessionId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const repoName = activeSession?.repo_name
    ? `REPO: ${activeSession.repo_name.toUpperCase()}`
    : "";

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:792) */}
      <Navbar />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* Back Link to Cockpit (Figma node 5:563) */}
        <ReportHeader />

        {/* Xử lý 4 trạng thái UI */}
        {isLoading ? (
          /* TRẠNG THÁI 1: LOADING SKELETON */
          <ReportLoadingSkeleton />
        ) : error ? (
          /* TRẠNG THÁI 2: ERROR VIEW CÓ RETRY BUTTON */
          <ReportErrorView
            error={error}
            onRetry={loadReportData}
            sessionId={resolvedSessionId || undefined}
          />
        ) : !resolvedSessionId && attempts.length === 0 ? (
          /* TRẠNG THÁI 3: EMPTY VIEW */
          <ReportEmptyView
            message="Chưa tìm thấy phiên học nào. Hãy khởi tạo hoặc quét một kho lưu trữ để bắt đầu học!"
            ctaHref="/learn"
            ctaText="Bắt đầu học ngay"
          />
        ) : (
          /* TRẠNG THÁI 4: SUCCESS VIEW (TOÀN BỘ GIAO DIỆN PHÂN TÍCH) */
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pb-12 flex flex-col gap-6">
            {/* Top Section: Student greeting + 3 stat cards + Weekly goal gauge (Figma node 5:576) */}
            <ReportOverview
              profile={profile}
              attempts={attempts}
              repoCount={activeSession ? 1 : 0}
              completedNodes={activeSession?.completed_count ?? 0}
              totalNodes={activeSession?.total_nodes ?? 0}
            />

            {/* Bước 1: Radar Chart 16 Kỹ năng SWE & BKT Mastery */}
            <RadarChart
              skills={profile?.skills || {}}
              overallTier={profile?.overall_tier || "NOVICE"}
              serverNow={serverNow}
            />

            {/* Middle Section: Today's knowledge list + average understanding & continue CTA (Figma node 5:651) */}
            <ReportKnowledgeBreakdown
              repoName={repoName}
              attempts={attempts}
              sessionId={resolvedSessionId || undefined}
            />

            {/* Bước 7: Timeline Lịch sử trả lời câu hỏi Feynman thật từ API */}
            <AttemptHistoryTimeline
              items={attempts}
              sessionId={resolvedSessionId || undefined}
            />

            {/* Bottom Section: Improvement recommendations & review points (Figma node 5:751) */}
            <ReportRecommendations attempts={attempts} />
          </div>
        )}
      </main>

      {/* 3. Global Footer (Figma node 5:783) */}
      <HomeFooter />
    </div>
  );
}
