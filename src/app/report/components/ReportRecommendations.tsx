"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { AttemptHistoryItem } from "@/contracts";
import { SKILL_METADATA } from "./RadarChart";

interface RecommendationItem {
  id: string;
  title: string;
  tag: string;
  tagVariant: "danger" | "warning" | "success";
}

interface ReportRecommendationsProps {
  attempts: AttemptHistoryItem[];
  className?: string;
}

export function ReportRecommendations({ attempts, className }: ReportRecommendationsProps) {
  const recommendations: RecommendationItem[] = [];

  // Trích xuất khuyến nghị từ các câu làm chưa đạt hoặc điểm thấp
  const failedAttempts = attempts.filter((a) => !a.is_passed || a.core_accuracy < 0.6);
  const midAttempts = attempts.filter((a) => a.is_passed && a.core_accuracy < 0.85);

  if (failedAttempts.length > 0 || midAttempts.length > 0) {
    failedAttempts.slice(0, 3).forEach((att, idx) => {
      const skillName = SKILL_METADATA[att.skill]?.label || att.skill;
      recommendations.push({
        id: `fail-${idx}`,
        title: `Ôn lại câu hỏi về ${skillName.toUpperCase()} trong bài "${att.node_title || att.node_id}"`,
        tag: "QUAN TRỌNG",
        tagVariant: "danger",
      });
    });

    midAttempts.slice(0, 2).forEach((att, idx) => {
      const skillName = SKILL_METADATA[att.skill]?.label || att.skill;
      recommendations.push({
        id: `mid-${idx}`,
        title: `Củng cố độ chính xác giải thích ${skillName.toUpperCase()}`,
        tag: "NÊN HỌC",
        tagVariant: "warning",
      });
    });
  }

  // Nếu không có lỗi hoặc ít hơn 3 đề xuất, bổ sung các khuyến nghị chuẩn từ Figma
  if (recommendations.length < 3) {
    const defaults: RecommendationItem[] = [
      {
        id: "imp-1",
        title: "Ôn lại cách gọi xử lý THANH TOÁN TỪ BÊN THỨ BA",
        tag: "QUAN TRỌNG",
        tagVariant: "danger",
      },
      {
        id: "imp-2",
        title: "Ôn lại cách xử dụng HTTP STATUS",
        tag: "NÊN HỌC",
        tagVariant: "warning",
      },
      {
        id: "imp-3",
        title: "Ôn lại cách gọi xử lý TRANSACTION",
        tag: "QUAN TRỌNG",
        tagVariant: "danger",
      },
      {
        id: "imp-4",
        title: "Ôn lại cách gọi xử lý RACE CONDITION",
        tag: "BỔ ÍCH",
        tagVariant: "success",
      },
    ];

    for (const def of defaults) {
      if (recommendations.length >= 4) break;
      if (!recommendations.some((r) => r.id === def.id)) {
        recommendations.push(def);
      }
    }
  }

  return (
    <section
      className={cn(
        "bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 w-full",
        className
      )}
      data-node-id="5:751"
    >
      {/* Section Title */}
      <div className="pb-1" data-node-id="5:752">
        <h2 className="font-black text-[#944b00] text-[18px] sm:text-[22px] tracking-[0.55px] uppercase leading-[33px]">
          ĐIỂM CẦN CẢI THIỆN VÀ ÔN TẬP
        </h2>
      </div>

      {/* List of Recommendations */}
      <div className="flex flex-col w-full" data-node-id="5:754">
        {recommendations.map((item, index) => {
          const isLast = index === recommendations.length - 1;

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between py-3.5 sm:py-4 px-3 rounded-[12px] hover:bg-[#faf8ff] transition-colors gap-2",
                !isLast && "border-b border-[#f3f4f6]"
              )}
            >
              {/* Left: Orange dot + Title */}
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-[#ff9640] shrink-0" />
                <span className="font-semibold text-[#131b2e] text-[15px] sm:text-[16px] leading-[24px]">
                  {item.title}
                </span>
              </div>

              {/* Right: Priority Tag */}
              <div className="flex items-center justify-end">
                <span
                  className={cn(
                    "font-bold text-[16px] sm:text-[18px] tracking-[-0.45px] uppercase whitespace-nowrap",
                    item.tagVariant === "danger" && "text-[#e7000b]",
                    item.tagVariant === "warning" && "text-[#ff9640]",
                    item.tagVariant === "success" && "text-[#047857]"
                  )}
                >
                  {item.tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
