"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  History,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ChevronRight,
} from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { AttemptHistoryTimeline } from "@/app/report/components/AttemptHistoryTimeline";
import {
  getSessionHistorySafe,
  getSessionsSafe,
  isApiError,
  type LearningSessionSummary,
} from "@/lib/api";
import { formatErrorMessage } from "@/lib/messages";
import type { AttemptHistoryItem } from "@/contracts";
import { Button } from "@/components/ui/Button";

function HistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || searchParams.get("id") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<AttemptHistoryItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<LearningSessionSummary[]>([]);

  const loadHistory = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false);
      // Khi không có session id, tải danh sách phiên gần đây để người dùng chọn
      const sessRes = await getSessionsSafe({ limit: 5 });
      if (sessRes.ok && sessRes.data?.sessions) {
        setRecentSessions(sessRes.data.sessions);
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await getSessionHistorySafe(sessionId);
    if (result.ok) {
      setItems(result.data.items || []);
    } else {
      if (isApiError(result.error)) {
        setErrorMessage(
          formatErrorMessage(result.error.error.code, result.error.error.message)
        );
      } else {
        setErrorMessage("Không thể tải lịch sử nỗ lực học tập của phiên này.");
      }
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const passedCount = items.filter((i) => i.is_passed).length;
  const passRate =
    items.length > 0 ? Math.round((passedCount / items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#131b2e] flex flex-col antialiased">
      <Navbar />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#625e56]">
            <Link
              href="/"
              className="hover:text-[#ff9640] transition-colors"
            >
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5 text-[#99a1af]" />
            {sessionId ? (
              <Link
                href={`/learn?session=${encodeURIComponent(sessionId)}`}
                className="hover:text-[#ff9640] transition-colors flex items-center gap-1"
              >
                <span>Buồng lái</span>
              </Link>
            ) : (
              <span>Buồng lái</span>
            )}
            <ChevronRight className="size-3.5 text-[#99a1af]" />
            <span className="font-semibold text-[#131b2e]">Lịch sử nộp bài</span>
          </div>

          {sessionId && (
            <Link
              href={`/learn?session=${encodeURIComponent(sessionId)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ff9640] hover:text-[#e6761c] bg-[#fff7ed] px-3 py-1.5 rounded-full border border-[#ff9640]/30 transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Quay lại buồng lái học tập</span>
            </Link>
          )}
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#f3f4f6] rounded-[16px] p-6 drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-[12px] bg-[#ff9640]/10 flex items-center justify-center shrink-0 text-[#ff9640]">
              <History className="size-6" />
            </div>
            <div>
              <h1 className="font-black text-[#131b2e] text-[22px] sm:text-[26px] tracking-tight leading-snug">
                Lịch sử nỗ lực học tập (Feynman Logs)
              </h1>
              <p className="text-sm text-[#625e56] mt-0.5">
                {sessionId
                  ? `Mã phiên: ${sessionId.slice(0, 16)}...`
                  : "Theo dõi toàn bộ các lần giải thích, câu hỏi và phản hồi từ AI"}
              </p>
            </div>
          </div>

          {sessionId && items.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="bg-[#f2f3ff] px-3 py-1.5 rounded-[10px] flex flex-col items-center">
                <span className="text-[11px] text-[#625e56] font-medium">Tổng số lần nộp</span>
                <span className="text-[16px] font-black text-[#131b2e]">{items.length}</span>
              </div>
              <div className="bg-[#ecfdf5] px-3 py-1.5 rounded-[10px] flex flex-col items-center">
                <span className="text-[11px] text-[#047857] font-medium">Đã đạt</span>
                <span className="text-[16px] font-black text-[#047857]">{passedCount}</span>
              </div>
              <div className="bg-[#fff7ed] px-3 py-1.5 rounded-[10px] flex flex-col items-center">
                <span className="text-[11px] text-[#944b00] font-medium">Tỷ lệ chính xác</span>
                <span className="text-[16px] font-black text-[#ff9640]">{passRate}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="bg-white border border-[#f3f4f6] rounded-[16px] p-8 flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="size-8 border-3 border-[#ff9640]/30 border-t-[#ff9640] rounded-full animate-spin" />
            <p className="text-xs text-[#625e56] font-medium">Đang tải lịch sử học tập...</p>
          </div>
        ) : errorMessage ? (
          <div className="bg-red-50 border border-red-200 rounded-[16px] p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="size-8 text-red-600" />
            <h3 className="font-bold text-red-900 text-base">Không thể tải dữ liệu lịch sử</h3>
            <p className="text-sm text-red-700 max-w-md">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              leftIcon={<RefreshCw className="size-3.5" />}
            >
              Thử lại
            </Button>
          </div>
        ) : !sessionId ? (
          /* Không có session ID -> Hiển thị danh sách phiên gần đây */
          <div className="bg-white border border-[#f3f4f6] rounded-[16px] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#131b2e]">
              <Clock className="size-4 text-[#ff9640]" />
              <h3 className="font-bold text-[16px]">Chọn phiên học để xem lịch sử nộp bài</h3>
            </div>
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentSessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => router.push(`/history?session=${encodeURIComponent(s.session_id)}`)}
                    className="p-4 rounded-[12px] border border-[#eaedff] bg-[#fafbfc] hover:border-[#ff9640] hover:bg-white text-left transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#131b2e] group-hover:text-[#ff9640] transition-colors truncate">
                        {s.repo_name}
                      </h4>
                      <p className="text-xs text-[#625e56] mt-1">
                        Hoàn thành: {s.completed_count}/{s.total_nodes} bài
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#99a1af] pt-2 border-t border-[#eaedff]">
                      <span>{new Date(s.last_active_at).toLocaleDateString("vi-VN")}</span>
                      <span className="font-bold text-[#ff9640] group-hover:translate-x-0.5 transition-transform">
                        Xem lịch sử →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#625e56] text-sm flex flex-col items-center gap-2">
                <BookOpen className="size-8 text-[#99a1af]" />
                <p>Chưa có phiên học nào. Hãy quét một repo để bắt đầu bài học đầu tiên!</p>
                <Link href="/" className="mt-2 text-xs font-bold text-[#ff9640] underline">
                  Về trang chủ quét repo
                </Link>
              </div>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[#f3f4f6] rounded-[16px] p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#ff9640]">
              <History className="size-6" />
            </div>
            <h3 className="font-bold text-[#131b2e] text-base">Chưa có lượt nộp bài nào</h3>
            <p className="text-xs text-[#625e56] max-w-sm">
              Bạn chưa trả lời câu hỏi nào trong phiên này. Hãy quay lại buồng lái để bắt đầu trả lời!
            </p>
            <Link
              href={`/learn?session=${encodeURIComponent(sessionId)}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white bg-[#ff9640] hover:bg-[#e07f2e] px-4 py-2 rounded-[8px] transition-colors"
            >
              <span>Vào buồng lái học tập</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          /* Render full timeline */
          <AttemptHistoryTimeline items={items} sessionId={sessionId} />
        )}
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
          <div className="size-8 border-3 border-[#ff9640]/30 border-t-[#ff9640] rounded-full animate-spin" />
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
