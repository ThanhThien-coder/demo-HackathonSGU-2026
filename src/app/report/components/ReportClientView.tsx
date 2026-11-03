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

// Fixture dữ liệu mẫu khi kích hoạt Dev Bypass Auth hoặc khi API chưa trả về
const MOCK_PROFILE: LearnerCognitiveProfile = {
  user_id: "dev-user-01",
  display_name: "Quý",
  overall_tier: "PRACTITIONER",
  skills: {
    HTTP_ROUTING: {
      skill: "HTTP_ROUTING",
      p_mastery: 0.88,
      last_practiced_at: Date.now() - 3600000,
      practice_count: 5,
      correct_count: 4,
    },
    DTO_VALIDATION: {
      skill: "DTO_VALIDATION",
      p_mastery: 0.82,
      last_practiced_at: Date.now() - 7200000,
      practice_count: 4,
      correct_count: 3,
    },
    TRANSACTION_INTEGRITY: {
      skill: "TRANSACTION_INTEGRITY",
      p_mastery: 0.72,
      last_practiced_at: Date.now() - 10800000,
      practice_count: 3,
      correct_count: 2,
    },
    DB_OPTIMIZATION: {
      skill: "DB_OPTIMIZATION",
      p_mastery: 0.54,
      last_practiced_at: Date.now() - 86400000 * 2,
      practice_count: 4,
      correct_count: 2,
    },
    LAYERED_SEPARATION: {
      skill: "LAYERED_SEPARATION",
      p_mastery: 0.78,
      last_practiced_at: Date.now() - 86400000,
      practice_count: 3,
      correct_count: 3,
    },
    AUTH_SECURITY: {
      skill: "AUTH_SECURITY",
      p_mastery: 0.65,
      last_practiced_at: Date.now() - 86400000 * 3,
      practice_count: 2,
      correct_count: 1,
    },
    DEPENDENCY_INJECTION: {
      skill: "DEPENDENCY_INJECTION",
      p_mastery: 0.75,
      last_practiced_at: Date.now() - 86400000 * 4,
      practice_count: 3,
      correct_count: 2,
    },
    ASYNC_CONCURRENCY: {
      skill: "ASYNC_CONCURRENCY",
      p_mastery: 0.60,
      last_practiced_at: Date.now() - 86400000 * 5,
      practice_count: 2,
      correct_count: 1,
    },
    ERROR_HANDLING: {
      skill: "ERROR_HANDLING",
      p_mastery: 0.70,
      last_practiced_at: Date.now() - 86400000,
      practice_count: 3,
      correct_count: 2,
    },
    STATE_MANAGEMENT: {
      skill: "STATE_MANAGEMENT",
      p_mastery: 0.58,
      last_practiced_at: Date.now() - 86400000 * 6,
      practice_count: 2,
      correct_count: 1,
    },
    ALGORITHMIC_COMPLEXITY: {
      skill: "ALGORITHMIC_COMPLEXITY",
      p_mastery: 0.45,
      last_practiced_at: Date.now() - 86400000 * 8,
      practice_count: 2,
      correct_count: 1,
    },
    MEMORY_MANAGEMENT: {
      skill: "MEMORY_MANAGEMENT",
      p_mastery: 0.50,
      last_practiced_at: Date.now() - 86400000 * 10,
      practice_count: 1,
      correct_count: 1,
    },
    API_CONTRACT_DESIGN: {
      skill: "API_CONTRACT_DESIGN",
      p_mastery: 0.80,
      last_practiced_at: Date.now() - 86400000 * 2,
      practice_count: 4,
      correct_count: 3,
    },
    CACHING_STRATEGY: {
      skill: "CACHING_STRATEGY",
      p_mastery: 0.52,
      last_practiced_at: Date.now() - 86400000 * 7,
      practice_count: 2,
      correct_count: 1,
    },
    RATE_LIMIT_RESILIENCE: {
      skill: "RATE_LIMIT_RESILIENCE",
      p_mastery: 0.48,
      last_practiced_at: Date.now() - 86400000 * 9,
      practice_count: 1,
      correct_count: 0,
    },
    DATA_SERIALIZATION: {
      skill: "DATA_SERIALIZATION",
      p_mastery: 0.74,
      last_practiced_at: Date.now() - 86400000 * 3,
      practice_count: 3,
      correct_count: 2,
    },
  },
};

const MOCK_ATTEMPTS: AttemptHistoryItem[] = [
  {
    node_id: "order-service",
    node_title: "Hàm kiểm tra tồn kho",
    mode: "LEARN",
    question_index: 0,
    skill: "DTO_VALIDATION",
    attempt_number: 1,
    core_accuracy: 1.0,
    is_passed: true,
    intent: "ANSWER",
    student_answer:
      "Hàm nhận vào DTO chứa danh sách SKU và số lượng cần mua, kiểm tra tính hợp lệ của dữ liệu trước khi truy vấn kho.",
    created_at: Date.now() - 3600000,
  },
  {
    node_id: "customer-service",
    node_title: "Hàm lấy danh sách khách hàng",
    mode: "LEARN",
    question_index: 1,
    skill: "HTTP_ROUTING",
    attempt_number: 1,
    core_accuracy: 1.0,
    is_passed: true,
    intent: "ANSWER",
    student_answer:
      "Routing HTTP GET /api/customers chuyển tiếp tới Controller, áp dụng phân trang và lọc dữ liệu trả về cho client.",
    created_at: Date.now() - 7200000,
  },
  {
    node_id: "payment-service",
    node_title: "Hàm xử lý mua hàng",
    mode: "LEARN",
    question_index: 2,
    skill: "TRANSACTION_INTEGRITY",
    attempt_number: 2,
    core_accuracy: 0.72,
    is_passed: true,
    intent: "ANSWER",
    student_answer:
      "Bọc các thao tác trừ tiền và cập nhật trạng thái đơn vào một Database Transaction duy nhất để đảm bảo tính nguyên tử (Atomicity), tự động rollback nếu lỗi phát sinh.",
    created_at: Date.now() - 10800000,
  },
  {
    node_id: "payment-service",
    node_title: "Hàm xử lý mua hàng",
    mode: "LEARN",
    question_index: 2,
    skill: "TRANSACTION_INTEGRITY",
    attempt_number: 1,
    core_accuracy: 0.35,
    is_passed: false,
    intent: "ANSWER",
    student_answer: "Gọi hàm thanh toán rồi ghi vào bảng đơn hàng bằng hai câu lệnh rời nhau.",
    created_at: Date.now() - 14400000,
  },
  {
    node_id: "inventory-db",
    node_title: "Hàm cập nhật thông tin đơn",
    mode: "LEARN",
    question_index: 3,
    skill: "DB_OPTIMIZATION",
    attempt_number: 1,
    core_accuracy: 0.5,
    is_passed: false,
    intent: "ANSWER",
    student_answer:
      "Truy vấn update liên tục từng dòng sản phẩm trong vòng lặp thay vì dùng batch update hoặc indexing.",
    created_at: Date.now() - 18000000,
  },
];

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

  const isBypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

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
      } else if (isBypassAuth || !meResult.ok) {
        // Dev Bypass Auth fallback
        currentProfile = MOCK_PROFILE;
        currentServerNow = Date.now();
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

      if (!targetSessionId && isBypassAuth) {
        targetSessionId = "demo-session-java-backend";
      }

      setResolvedSessionId(targetSessionId);
      setActiveSession(sessionSummary);

      // 3. Tích hợp Bước 7: GET /api/sessions/{session_id}/history
      if (targetSessionId) {
        const historyResult = await getSessionHistorySafe(targetSessionId);

        if (historyResult.ok && historyResult.data?.items) {
          setAttempts(historyResult.data.items);
        } else if (isBypassAuth) {
          // Dev Bypass Auth: sử dụng mock attempts phong phú
          setAttempts(MOCK_ATTEMPTS);
        } else if (!historyResult.ok) {
          // Ghi nhận lỗi nếu không bật bypass auth
          setError(historyResult.error);
        }
      } else {
        // Không có session nào
        if (isBypassAuth) {
          setAttempts(MOCK_ATTEMPTS);
        } else {
          setAttempts([]);
        }
      }
    } catch (err) {
      if (isBypassAuth) {
        setProfile(MOCK_PROFILE);
        setAttempts(MOCK_ATTEMPTS);
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [urlSessionId, isBypassAuth]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const repoName = activeSession?.repo_name
    ? `REPO: ${activeSession.repo_name.toUpperCase()}`
    : "REPO: JAVA BACKEND";

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:792) */}
      <Navbar
        user={{
          name: profile?.display_name || "Quý",
          avatarUrl: "/assets/report/avatar-quy.png",
        }}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* Back Link to Cockpit (Figma node 5:563) */}
        <ReportHeader />

        {/* Xử lý 4 trạng thái UI */}
        {isLoading ? (
          /* TRẠNG THÁI 1: LOADING SKELETON */
          <ReportLoadingSkeleton />
        ) : error && !isBypassAuth ? (
          /* TRẠNG THÁI 2: ERROR VIEW CÓ RETRY BUTTON */
          <ReportErrorView
            error={error}
            onRetry={loadReportData}
            sessionId={resolvedSessionId || undefined}
          />
        ) : !resolvedSessionId && attempts.length === 0 && !isBypassAuth ? (
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
              repoCount={activeSession ? 1 : 3}
              completedNodes={activeSession?.completed_count ?? 2}
              totalNodes={activeSession?.total_nodes ?? 6}
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
