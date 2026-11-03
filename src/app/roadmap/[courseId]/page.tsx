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
  getCourseDetail,
  type LessonItem,
  type CourseDetail,
} from "@/components/roadmap-detail";
import {
  getSessionsSafe,
  getSessionProgressSafe,
  type LearningSessionSummary,
} from "@/lib/api";

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
      // 1. Thử tìm kiếm trong danh sách sessions thật từ API
      const sessionsRes = await getSessionsSafe();
      let matchedSession: LearningSessionSummary | undefined;

      if (sessionsRes.ok && sessionsRes.data?.sessions) {
        matchedSession = sessionsRes.data.sessions.find(
          (s) => s.session_id === courseId || s.repo_name === courseId
        );
      }

      if (matchedSession) {
        // Tìm thấy phiên học thật: lấy tiếp tiến độ đồ thị nếu có
        const progressRes = await getSessionProgressSafe(matchedSession.session_id);
        const nodeEntries =
          progressRes.ok && progressRes.data?.progress?.nodes
            ? Object.entries(progressRes.data.progress.nodes)
            : [];

        let lessonItems: LessonItem[] = [];

        if (nodeEntries.length > 0) {
          lessonItems = nodeEntries.map(([nodeId, nodeInfo], idx) => {
            const status =
              nodeInfo.status === "COMPLETED"
                ? "completed"
                : nodeInfo.status === "AVAILABLE"
                ? "in-progress"
                : "locked";

            return {
              id: nodeId,
              stepNumber: idx + 1,
              title: `${idx + 1}. Kiến trúc Node: ${nodeId}`,
              description:
                status === "completed"
                  ? "Đã hoàn thành bài học và vượt qua kiểm thử Feynman"
                  : status === "in-progress"
                  ? "Bài học đang mở, sẵn sàng để nghiên cứu và trả lời câu hỏi"
                  : "Đang khóa - Hoàn thành các node tiên quyết để mở khóa",
              status,
              progress: status === "completed" ? 100 : status === "in-progress" ? 50 : 0,
              targetUrl: `/learn?session=${encodeURIComponent(
                matchedSession!.session_id
              )}&node=${encodeURIComponent(nodeId)}`,
            };
          });
        } else {
          // Khi phiên mới khởi tạo hoặc chưa có chi tiết node, dựng danh sách mô phỏng theo số lượng node
          const total = matchedSession.total_nodes || 3;
          const completed = matchedSession.completed_count || 0;

          lessonItems = Array.from({ length: total }, (_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum <= completed;
            const isInProgress = stepNum === completed + 1;
            const status = isCompleted
              ? "completed"
              : isInProgress
              ? "in-progress"
              : "locked";

            return {
              id: `${matchedSession!.session_id}-node-${stepNum}`,
              stepNumber: stepNum,
              title: `${stepNum}. Module Kiến trúc ${stepNum}: Phân tích luồng thực thi`,
              description: isCompleted
                ? "Đã hoàn thành phân tích lát cắt kiến trúc"
                : isInProgress
                ? "Đang nghiên cứu và đối thoại kỹ thuật Feynman"
                : "Đang khóa - Hoàn thành bài trước để mở khóa",
              status,
              progress: isCompleted ? 100 : isInProgress ? 60 : 0,
              targetUrl: `/learn?session=${encodeURIComponent(
                matchedSession!.session_id
              )}`,
            };
          });
        }

        setCourse({
          id: matchedSession.session_id,
          title: matchedSession.repo_name || "Lộ trình kiến trúc dự án",
          description: `Lộ trình học theo mã nguồn thực tế (Engine v${matchedSession.engine_version}) • Hoàn thành ${matchedSession.completed_count}/${matchedSession.total_nodes} bài`,
          lessons: lessonItems,
        });
      } else {
        // Fallback: nếu không tìm thấy phiên trong API, sử dụng dữ liệu định sẵn (java-backend, react-frontend, v.v.)
        const fallbackDetail = getCourseDetail(courseId);
        setCourse(fallbackDetail);
      }
    } catch (err) {
      // Khi có lỗi bất ngờ, vẫn dự phòng về course detail mặc định nếu có
      try {
        const fallbackDetail = getCourseDetail(courseId);
        setCourse(fallbackDetail);
      } catch {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi tải thông tin chi tiết lộ trình."
        );
      }
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
      {/* 1. Global Navigation Header with Logged-in User Profile */}
      <Navbar user={{ name: "User" }} />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col items-start w-full max-w-[960px]">
          {/* Back Navigation Button "Quay lại lộ trình" */}
          <RoadmapDetailBackNav />

          {/* 1. LOADING STATE */}
          {isLoading && (
            <div className="w-full flex flex-col gap-6 animate-pulse">
              <div className="flex flex-col gap-2.5">
                <div className="h-8 w-64 bg-gray-200 rounded" />
                <div className="h-4 w-96 bg-gray-100 rounded" />
              </div>
              <div className="bg-white border border-[#c0c0c0] rounded-[18px] p-5 sm:p-[28.8px] w-full flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[#f9fafb] border border-[#eaedf1] rounded-[16px] p-5 h-24 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-[10px] bg-gray-200" />
                      <div className="flex flex-col gap-2">
                        <div className="h-4 w-48 bg-gray-200 rounded" />
                        <div className="h-3 w-64 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="h-9 w-24 bg-gray-200 rounded-[12px]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {!isLoading && errorMessage && (
            <div className="w-full bg-red-50 border border-red-200 rounded-[16px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-red-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[16px] text-red-900">
                    Không thể tải thông tin lộ trình
                  </h4>
                  <p className="text-[13.5px] text-red-700 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/roadmap"
                  className="text-red-700 hover:text-red-900 text-[13px] font-semibold underline flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Về danh sách</span>
                </Link>
                <button
                  type="button"
                  onClick={loadCourseDetail}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] px-4 py-2 rounded-[10px] flex items-center gap-2"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. EMPTY STATE */}
          {!isLoading && !errorMessage && course && course.lessons.length === 0 && (
            <div className="w-full bg-white border border-[#c0c0c0] rounded-[18px] p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-14 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#ff9640]">
                <FolderX className="size-7" />
              </div>
              <div className="flex flex-col gap-1 max-w-[450px]">
                <h3 className="font-bold text-[#131b2e] text-[18px]">
                  Chưa có bài học nào trong lộ trình này
                </h3>
                <p className="text-[#625e56] text-[14px]">
                  Kho mã nguồn chưa sinh bài học hoặc phân tích chưa hoàn tất.
                  Bạn có thể quay lại để khám phá các lộ trình khác.
                </p>
              </div>
              <Link
                href="/roadmap"
                className="bg-[#ff9640] hover:bg-[#f2852e] text-white font-bold text-[13px] px-5 py-2.5 rounded-[10px] flex items-center gap-2"
              >
                <ArrowLeft className="size-4" />
                <span>Quay lại lộ trình</span>
              </Link>
            </div>
          )}

          {/* 4. SUCCESS STATE */}
          {!isLoading && !errorMessage && course && course.lessons.length > 0 && (
            <>
              {/* Header Title with Flow/Branch Icon & Course Name */}
              <RoadmapDetailHeader
                title={course.title}
                description={course.description}
              />

              {/* Container with Course Lessons List (Completed, In-Progress, Locked) */}
              <LessonList lessons={course.lessons} />
            </>
          )}
        </div>
      </main>

      {/* 3. Global Footer */}
      <RoadmapFooter />
    </div>
  );
}
