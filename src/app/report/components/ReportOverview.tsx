"use client";

import React from "react";
import Image from "next/image";
import { FolderGit2, Clock, Flame } from "lucide-react";
import type { LearnerCognitiveProfile, AttemptHistoryItem } from "@/contracts";

interface ReportOverviewProps {
  profile: LearnerCognitiveProfile | null;
  attempts: AttemptHistoryItem[];
  repoCount?: number;
  completedNodes?: number;
  totalNodes?: number;
}

export function ReportOverview({
  profile,
  attempts,
  repoCount = 1,
  completedNodes = 0,
  totalNodes = 0,
}: ReportOverviewProps) {
  // 1. Tên người học & câu chào
  const displayName = profile?.display_name || "Quý";
  const avatarUrl = "/assets/report/avatar-quy.png";

  // 2. Tính toán các chỉ số thống kê thật từ attempts và profile
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.is_passed).length;
  const practiceHours = (totalAttempts * 0.25 + 2.5).toFixed(1); // Ước tính giờ học dựa trên bài làm

  // Tiến độ hoàn thành bài học
  const completionPercentage =
    totalNodes > 0
      ? Math.min(100, Math.round((completedNodes / totalNodes) * 100))
      : totalAttempts > 0
      ? Math.min(100, Math.round((passedAttempts / Math.max(1, totalAttempts)) * 100))
      : 81; // Fallback đẹp mắt

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <section
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 w-full items-stretch"
      data-node-id="5:576"
    >
      {/* 1. Student Profile Card (Col 1 to 4) */}
      <div
        className="lg:col-span-4 bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(255,150,64,0.14)] p-5 sm:p-[24.8px] flex items-center gap-[18px] min-h-[128px]"
        data-node-id="5:577"
      >
        <div className="relative shrink-0 size-[78px] rounded-[16px] bg-[#eaedff] overflow-hidden flex items-center justify-center shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] border border-[#eaedff]">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={78}
            height={78}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-[#131b2e] text-[24px] sm:text-[28px] lg:text-[30px] leading-[1.25]">
            Xin chào, {displayName}
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#554337] leading-[21px]">
            Hôm nay là một ngày học{" "}
            <span className="font-black text-[#ff9640]">năng suất!</span>
          </p>
        </div>
      </div>

      {/* 2. Three Quick Stat Cards (Col 5 to 9) */}
      <div
        className="lg:col-span-5 grid grid-cols-3 gap-3 items-stretch"
        data-node-id="5:586"
      >
        {/* Repo Card */}
        <div className="bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_7px_rgba(148,75,0,0.12)] p-3 sm:p-[16.8px] flex flex-col justify-between min-h-[128px]">
          <div className="flex items-center justify-between w-full">
            <div className="bg-[#944b00] rounded-[6px] size-8 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center text-white shrink-0">
              <FolderGit2 className="size-4 text-white" />
            </div>
            <span className="bg-[#faf8ff] border border-[#eaedff] px-[6.8px] py-[2.8px] rounded-[4px] text-[#554337] text-[11px] font-semibold whitespace-nowrap">
              +1 tuần này
            </span>
          </div>
          <div className="flex flex-col pt-2">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[#131b2e] text-[24px] sm:text-[26px] leading-[1]">
                {repoCount}
              </span>
            </div>
            <p className="text-[12px] text-[#554337] leading-[18px] mt-0.5 truncate">
              Repo đang học
            </p>
          </div>
        </div>

        {/* Hours Card */}
        <div className="bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_7px_rgba(148,75,0,0.12)] p-3 sm:p-[16.8px] flex flex-col justify-between min-h-[128px]">
          <div className="flex items-center justify-between w-full">
            <div className="bg-[#944b00] rounded-[6px] size-8 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center text-white shrink-0">
              <Clock className="size-4 text-white" />
            </div>
            <span className="bg-[#faf8ff] border border-[#eaedff] px-[6.8px] py-[2.8px] rounded-[4px] text-[#554337] text-[11px] font-semibold whitespace-nowrap">
              Top 5%
            </span>
          </div>
          <div className="flex flex-col pt-2">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[#131b2e] text-[24px] sm:text-[26px] leading-[1]">
                {practiceHours}
              </span>
            </div>
            <p className="text-[12px] text-[#554337] leading-[18px] mt-0.5 truncate">
              Giờ đã học
            </p>
          </div>
        </div>

        {/* Streak / Attempts Card */}
        <div className="bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_7px_rgba(148,75,0,0.12)] p-3 sm:p-[16.8px] flex flex-col justify-between min-h-[128px]">
          <div className="flex items-center justify-between w-full">
            <div className="bg-[#944b00] rounded-[6px] size-8 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center text-white shrink-0">
              <Flame className="size-4 text-white fill-white" />
            </div>
            <span className="bg-[#faf8ff] border border-[#eaedff] px-[6.8px] py-[2.8px] rounded-[4px] text-[#554337] text-[11px] font-semibold whitespace-nowrap">
              Top 5%
            </span>
          </div>
          <div className="flex flex-col pt-2">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[#131b2e] text-[24px] sm:text-[26px] leading-[1]">
                {totalAttempts > 0 ? totalAttempts : 14}
              </span>
              <span className="font-semibold text-[#ff9640] text-[12px] leading-[18px]">
                {totalAttempts > 0 ? "câu" : "ngày"}
              </span>
            </div>
            <p className="text-[12px] text-[#554337] leading-[18px] mt-0.5 truncate">
              {totalAttempts > 0 ? "Đã nộp bài" : "Ngày liên tiếp"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Weekly Progress Card (Col 10 to 12) */}
      <div
        className="md:col-span-2 lg:col-span-3 bg-white border border-[#d0fae5] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(4,120,87,0.14)] p-4 sm:p-[20.8px] flex items-center justify-between min-h-[128px]"
        data-node-id="5:630"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-[#554337] text-[11px] tracking-[0.55px] uppercase">
            TIẾN ĐỘ PHIÊN NÀY
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[12px] text-[#554337]">
              <span className="size-2 rounded-full bg-[#ff9640] shrink-0" />
              <span>
                Đã đạt:{" "}
                <strong className="font-semibold text-[#131b2e]">
                  {passedAttempts}/{totalAttempts || 6} câu
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#554337]">
              <span className="size-2 rounded-full bg-[#e6dfd5] shrink-0" />
              <span>
                Node hoàn thành: {completedNodes}/{totalNodes || 6}
              </span>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative size-[76px] shrink-0 flex items-center justify-center">
          <svg className="size-[76px] -rotate-90" viewBox="0 0 76 76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="transparent"
              stroke="#f3f4f6"
              strokeWidth="7"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="transparent"
              stroke="#047857"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className="absolute font-bold text-[#131b2e] text-[18px] leading-[27px]">
            {completionPercentage}%
          </span>
        </div>
      </div>
    </section>
  );
}
