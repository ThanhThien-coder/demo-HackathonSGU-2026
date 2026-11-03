"use client";

import React, { useState } from "react";
import type { AttemptHistoryItem } from "@/contracts";
import { SKILL_METADATA } from "./RadarChart";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";

interface AttemptHistoryTimelineProps {
  items: AttemptHistoryItem[];
  sessionId?: string;
  className?: string;
}

export function AttemptHistoryTimeline({
  items,
  className,
}: AttemptHistoryTimelineProps) {
  const [filter, setFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");

  const filteredItems = items.filter((item) => {
    if (filter === "PASSED") return item.is_passed;
    if (filter === "FAILED") return !item.is_passed;
    return true;
  });

  const passedCount = items.filter((i) => i.is_passed).length;
  const failedCount = items.length - passedCount;

  // Format timestamp sang giờ Việt Nam
  const formatTime = (ts: number) => {
    if (!ts) return "Vừa xong";
    try {
      const date = new Date(ts);
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return "Gần đây";
    }
  };

  return (
    <section
      className={cn(
        "bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col gap-6 w-full",
        className
      )}
      data-node-id="report:attempt-history"
    >
      {/* Title & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f3f4f6] gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-[#944b00] text-[18px] sm:text-[22px] tracking-[0.5px] uppercase leading-[30px]">
              LỊCH SỬ TRẢ LỜI CÂU HỎI FEYNMAN
            </h2>
            <span className="bg-[#eaedff] text-[#131b2e] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {items.length} lượt nộp
            </span>
          </div>
          <p className="text-[13px] text-[#554337]">
            Toàn bộ các nỗ lực giải thích kiến trúc theo phương pháp Feynman trong phiên học
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#faf8ff] p-1 rounded-[10px] border border-[#eaedff]">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-[8px] transition-all",
              filter === "ALL"
                ? "bg-[#944b00] text-white shadow-sm"
                : "text-[#554337] hover:text-[#131b2e]"
            )}
          >
            Tất cả ({items.length})
          </button>
          <button
            onClick={() => setFilter("PASSED")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-[8px] transition-all flex items-center gap-1",
              filter === "PASSED"
                ? "bg-[#047857] text-white shadow-sm"
                : "text-[#554337] hover:text-[#131b2e]"
            )}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Đạt ({passedCount})</span>
          </button>
          <button
            onClick={() => setFilter("FAILED")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-[8px] transition-all flex items-center gap-1",
              filter === "FAILED"
                ? "bg-[#e7000b] text-white shadow-sm"
                : "text-[#554337] hover:text-[#131b2e]"
            )}
          >
            <XCircle className="size-3.5" />
            <span>Chưa đạt ({failedCount})</span>
          </button>
        </div>
      </div>

      {/* Attempts List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-[#faf8ff] rounded-[12px] border border-dashed border-[#eaedff] gap-2">
          <MessageSquare className="size-8 text-[#94a3b8]" />
          <span className="font-bold text-[#131b2e] text-[15px]">
            {items.length === 0
              ? "Phiên học này chưa có câu trả lời Feynman nào"
              : "Không có lượt nộp bài nào theo bộ lọc đã chọn"}
          </span>
          <p className="text-xs text-[#554337] max-w-md">
            {items.length === 0
              ? "Hãy mở buồng lái và hoàn thành các bài học để xem phân tích chi tiết độ thông thạo kiến trúc tại đây."
              : "Hãy thử chuyển bộ lọc về 'Tất cả' để xem danh sách đầy đủ."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredItems.map((item, index) => {
            const skillMeta = SKILL_METADATA[item.skill];
            const accuracyPct = Math.round(item.core_accuracy * 100);

            // Màu của accuracy
            let accuracyColor = "text-[#047857]";
            let progressBg = "bg-[#00b380]";
            if (accuracyPct < 40) {
              accuracyColor = "text-[#e7000b]";
              progressBg = "bg-[#e7000b]";
            } else if (accuracyPct < 70) {
              accuracyColor = "text-[#ff9640]";
              progressBg = "bg-[#ff9640]";
            }

            return (
              <div
                key={`${item.node_id}-${item.question_index}-${item.attempt_number}-${index}`}
                className={cn(
                  "border rounded-[14px] p-4 transition-all duration-200 flex flex-col gap-3",
                  item.is_passed
                    ? "bg-white border-[#e5e7eb] hover:border-[#10b981]/40"
                    : "bg-[#fffafa] border-[#fee2e2] hover:border-[#ef4444]/40"
                )}
              >
                {/* Top Row: Node Name + Skill Badge + Attempt Pill + Pass/Fail Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Icon */}
                    {item.is_passed ? (
                      <CheckCircle2 className="size-5 text-[#00b380] shrink-0" />
                    ) : (
                      <XCircle className="size-5 text-[#e7000b] shrink-0" />
                    )}

                    {/* Node title */}
                    <span className="font-bold text-[#131b2e] text-[15px] sm:text-[16px]">
                      {item.node_title || item.node_id}
                    </span>

                    {/* Question Number Badge */}
                    <span className="text-[11px] font-semibold bg-[#faf8ff] text-[#554337] px-2 py-0.5 rounded border border-[#eaedff]">
                      Câu #{item.question_index + 1}
                    </span>

                    {/* Skill Pill */}
                    <span className="text-[11px] font-bold bg-[#ff9640]/15 text-[#944b00] px-2 py-0.5 rounded">
                      {skillMeta?.label || item.skill}
                    </span>
                  </div>

                  {/* Right Tags: Attempt + Outcome */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs text-[#554337] bg-gray-100 px-2 py-0.5 rounded font-medium">
                      Lần nộp #{item.attempt_number}
                    </span>

                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                        item.is_passed
                          ? "bg-[#ecfdf5] text-[#047857] border border-[#d1fae5]"
                          : "bg-[#fef2f2] text-[#e7000b] border border-[#fecaca]"
                      )}
                    >
                      {item.is_passed ? "ĐẠT" : "CHƯA ĐẠT"}
                    </span>
                  </div>
                </div>

                {/* Accuracy Score Bar & Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <span className="text-xs font-medium text-[#554337]">
                      Độ chính xác cốt lõi:
                    </span>
                    <span className={cn("text-xs font-bold", accuracyColor)}>
                      {accuracyPct}%
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden relative min-w-[100px]">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", progressBg)}
                        style={{ width: `${accuracyPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#887365]">
                    <Clock className="size-3.5" />
                    <span>{formatTime(item.created_at)}</span>
                  </div>
                </div>

                {/* Student Explanation Snippet Box */}
                <div className="mt-1 bg-[#faf8ff] rounded-[10px] p-3 border border-[#eaedff] flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#944b00] font-semibold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="size-3.5" />
                      <span>Câu trả lời của người học:</span>
                    </span>
                    {item.intent && (
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#eaedff] text-[#554337]">
                        Ý định: {item.intent === "ANSWER" ? "Giải thích trực tiếp" : item.intent}
                      </span>
                    )}
                  </div>
                  <p className="text-[#131b2e] italic font-sans leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-[#ff9640]/40">
                    &ldquo;{item.student_answer || "Không có nội dung bài nộp"}&rdquo;
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
