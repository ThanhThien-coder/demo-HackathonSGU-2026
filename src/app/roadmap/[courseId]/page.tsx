"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, FolderX, ArrowLeft } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { RoadmapFooter } from "@/components/roadmap";
import {
  RoadmapDetailBackNav,
  RoadmapDetailHeader,
  LessonList,
  buildSessionDetail,
  type CourseDetail,
} from "@/components/roadmap-detail";
import {
  getSessionsSafe,
  ingestRepoSafe,
  isApiError,
  type LearningSessionSummary,
} from "@/lib/api";
import { formatErrorMessage } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return formatErrorMessage(error.error.code, error.error.message);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã xảy ra lỗi không xác định khi kết nối với máy chủ.";
}

interface RoadmapDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export default function RoadmapDetailPage({ params }: RoadmapDetailPageProps) {
  const { courseId } = use(params);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);

  const loadCourseDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Tìm kiếm trong danh sách sessions thật từ API
      const sessionsRes = await getSessionsSafe();
      let matchedSession: LearningSessionSummary | undefined;

      if (sessionsRes.ok && sessionsRes.data?.sessions) {
        matchedSession = sessionsRes.data.sessions.find(
          (s) => s.session_id === courseId || s.repo_name === courseId
        );
      }

      if (matchedSession) {
        // Nạp dữ liệu đồ thị và tiến độ thông qua ingestRepoSafe
        const ingestRes = await ingestRepoSafe({
          session_id: matchedSession.session_id,
        });

        if (!ingestRes.ok) {
          setErrorMessage(getErrorMessage(ingestRes.error));
          setCourse(null);
          return;
        }

        const detail = buildSessionDetail(
          matchedSession,
          ingestRes.data.progress,
          ingestRes.data.result.nodes
        );
        setCourse(detail);
      } else {
        // Thử tìm theo courseId làm session_id
        const ingestRes = await ingestRepoSafe({
          session_id: courseId,
        });

        if (ingestRes.ok) {
          const summary: LearningSessionSummary = {
            session_id: ingestRes.data.session_id,
            repo_name:
              ingestRes.data.result.fingerprint.detected_framework ||
              "Repository",
            engine_version: "1.0.0",
            snapshot: {
              source: "GITHUB",
              repo_key: "",
              snapshot_id: "",
              snapshot_id_kind: "COMMIT_SHA",
              subdir: "",
              ref_label: "main",
            },
            created_at: Date.now(),
            last_active_at: Date.now(),
            total_nodes: ingestRes.data.result.nodes.length,
            completed_count: Object.values(
              ingestRes.data.progress.nodes
            ).filter((n) => n.status === "COMPLETED").length,
            failed_count: Object.values(
              ingestRes.data.progress.nodes
            ).filter((n) => n.status === "FAILED").length,
            can_resume: true,
            resume_blocker: null,
          };

          const detail = buildSessionDetail(
            summary,
            ingestRes.data.progress,
            ingestRes.data.result.nodes
          );
          setCourse(detail);
        } else {
          // Không tìm thấy phiên học tương ứng
          setCourse(null);
        }
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseDetail();
  }, [loadCourseDetail]);

  return (
    <div
      className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]"
      data-node-id="5:954"
      data-name="RoadmapDetailPage"
    >
      {/* 1. Global Navigation Header */}
      <Navbar />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="w-full max-w-[1040px] flex flex-col gap-6 sm:gap-8">
          {/* Top Back Navigation Bar */}
          <RoadmapDetailBackNav />

          {/* 1. LOADING STATE: Shimmer Skeleton */}
          {isLoading && (
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="bg-[#f9fafb] border border-[#eaedf1] rounded-[16px] p-6 h-32 w-full" />
              <div className="bg-white border border-[#eaecef] rounded-[18px] p-6 flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-[#f9fafb] rounded-[14px] w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. ERROR STATE: Alert with Retry CTA */}
          {!isLoading && errorMessage && (
            <div className="w-full bg-red-50 border border-red-200 drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)] rounded-[18px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[16px] text-red-900">
                    Không thể tải thông tin bài học
                  </h4>
                  <p className="text-[13.5px] text-red-700 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadCourseDetail}
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-[13px] px-4 py-2 rounded-[10px] flex items-center gap-2 transition-all shrink-0 self-end sm:self-center cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* 3. NOT FOUND STATE: Clean Empty Placeholder */}
          {!isLoading && !errorMessage && !course && (
            <div className="bg-white border border-[#eaecef] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)] rounded-[18px] p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#ff9640]">
                <FolderX className="size-8" />
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <h3 className="font-bold text-[#131b2e] text-lg">
                  Không tìm thấy phiên học
                </h3>
                <p className="text-sm text-[#625e56]">
                  Phiên học bạn yêu cầu không tồn tại, đã hết hạn hoặc chưa được
                  phân tích từ kho mã nguồn.
                </p>
              </div>
              <Link href="/roadmap">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<ArrowLeft className="size-4" />}
                >
                  Quay về danh sách lộ trình
                </Button>
              </Link>
            </div>
          )}

          {/* 4. SUCCESS STATE: Real Session Header and Lessons */}
          {!isLoading && !errorMessage && course && (
            <>
              <RoadmapDetailHeader
                title={course.title}
                description={course.description}
              />
              <LessonList lessons={course.lessons} />
            </>
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <RoadmapFooter />
    </div>
  );
}
