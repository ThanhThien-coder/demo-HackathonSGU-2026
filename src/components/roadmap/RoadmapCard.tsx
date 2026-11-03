"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapCourse } from "./types";

export interface RoadmapCardProps {
  course: RoadmapCourse;
}

export function RoadmapCard({ course }: RoadmapCardProps) {
  const isCompleted = course.status === "completed";

  if (isCompleted) {
    return (
      <div
        className={cn(
          "bg-[#047857] border border-[#004f1a] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]",
          "rounded-[16px] p-5 sm:p-[25.6px] w-full text-white",
          "transition-all duration-200 hover:shadow-[0px_6px_16px_0px_rgba(4,120,87,0.25)] hover:-translate-y-0.5"
        )}
        data-node-id={course.dataNodeId || "5:877"}
        data-name="Background+Border+Shadow"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 w-full">
          {/* Left section: Icon + Info + Completed badge */}
          <div className="flex gap-4 sm:gap-[16px] items-start sm:items-center">
            {/* White rounded box with Star icon */}
            <div
              className="bg-white border border-[#047857] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-[10px] shrink-0 size-[48px]"
              data-name="Background+Border+Shadow"
            >
              <Star
                className="size-5 fill-[#047857] text-[#047857]"
                aria-hidden="true"
              />
            </div>

            {/* Course Title, Subtitle, Completed Chip */}
            <div className="flex flex-col items-start gap-1">
              <h2 className="font-bold text-white text-[18px] tracking-[-0.45px] leading-[27px]">
                {course.title}
              </h2>
              <p className="text-[14px] text-white/90 leading-[21px]">
                {course.description}
              </p>

              {/* Status Badge "Đã hoàn thành" */}
              <div
                className="bg-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-2 px-[14px] py-[6px] rounded-[6px] mt-1.5"
                data-name="Background+Shadow"
              >
                <span className="font-bold text-[#047857] text-[13px] leading-[19.5px]">
                  Đã hoàn thành
                </span>
                <Check
                  className="size-3.5 text-[#047857] stroke-[3]"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Right section: Action button "Xem lại bài" */}
          <div className="w-full sm:w-auto flex sm:justify-end">
            <Link
              href={course.targetUrl}
              className={cn(
                "w-full sm:w-auto bg-white hover:bg-emerald-50 active:bg-emerald-100",
                "shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
                "flex items-center justify-center px-[24px] py-[10px] rounded-[12px]",
                "text-[#131b2e] text-[13px] font-bold leading-[19.5px]",
                "transition-all duration-150 select-none hover:scale-105 active:scale-95"
              )}
            >
              Xem lại bài
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // In-progress course card
  const progressPercent = course.progress ?? 75;

  return (
    <div
      className={cn(
        "bg-[#fff7ed] border border-[#ff9640] rounded-[16px]",
        "shadow-[0px_4px_12px_0px_rgba(255,150,64,0.12)] p-5 sm:p-[25.6px] w-full",
        "transition-all duration-200 hover:shadow-[0px_6px_16px_0px_rgba(255,150,64,0.18)] hover:-translate-y-0.5"
      )}
      data-node-id={course.dataNodeId || "5:829"}
      data-name="Background+Border+Shadow"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 w-full">
        {/* Left section: Icon + Info + Progress */}
        <div className="flex gap-4 sm:gap-[16px] items-start sm:items-center">
          {/* Orange rounded box with Ribbon/Bookmark icon */}
          <div
            className="bg-[#ff9640] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-[10px] shrink-0 size-[48px]"
            data-name="Background+Shadow"
          >
            <Bookmark
              className="size-5 fill-white text-white"
              aria-hidden="true"
            />
          </div>

          {/* Course Title, Subtitle, Progress Bar */}
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-black text-[#131b2e] text-[18px] tracking-[-0.45px] leading-[27px]">
              {course.title}
            </h2>
            <p className="font-semibold text-[#554337] text-[14px] leading-[21px]">
              {course.description}
            </p>

            {/* Progress bar + percentage text */}
            <div className="flex items-center gap-3 mt-1.5">
              <div
                className="bg-[#ffe4d1] h-[8px] rounded-full w-[180px] sm:w-[240px] overflow-hidden relative"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Tiến độ ${course.title}`}
              >
                <div
                  className="h-full rounded-full shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundImage:
                      "linear-gradient(90deg, rgb(255, 150, 64) 0%, rgb(255, 138, 46) 50%, rgb(255, 132, 35) 75%, rgb(255, 126, 20) 100%)",
                  }}
                />
              </div>
              <span className="font-bold text-[#ff9640] text-[18px] leading-[27px] select-none">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Right section: Action button "Tiếp tục học" */}
        <div className="w-full sm:w-auto flex sm:justify-end">
          <Link
            href={course.targetUrl}
            className={cn(
              "w-full sm:w-auto bg-[#ff9640] hover:bg-[#f2852e] active:bg-[#e6761c]",
              "drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)]",
              "flex items-center justify-center gap-2 px-[24px] py-[10px] rounded-[12px]",
              "text-white text-[13px] font-bold leading-[19.5px]",
              "transition-all duration-150 select-none hover:scale-105 active:scale-95"
            )}
          >
            <span>Tiếp tục học</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
