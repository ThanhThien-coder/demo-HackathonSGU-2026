"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { mockTodayKnowledge } from "./data";
import { cn } from "@/lib/utils";

export function KnowledgeBreakdown() {
  return (
    <section className="flex flex-col gap-3 w-full" data-node-id="5:651">
      {/* Section Title */}
      <h2
        className="font-bold text-[#131b2e] text-[20px] sm:text-[22px] leading-[33px]"
        data-node-id="5:653"
      >
        Các kiến thức đã học hôm nay
      </h2>

      {/* Main Container Card */}
      <div
        className="bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col gap-6 w-full"
        data-node-id="5:654"
      >
        {/* Repo Header */}
        <div
          className="border-b-[0.8px] border-[#f3f4f6] pb-4"
          data-node-id="5:655"
        >
          <span className="font-black text-[#944b00] text-[18px] sm:text-[20px] tracking-[0.5px] uppercase leading-[30px]">
            {mockTodayKnowledge.repoName}
          </span>
        </div>

        {/* Content Grid: 8 Cols Topics / 4 Cols Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Topics List */}
          <div
            className="lg:col-span-8 flex flex-col gap-1 sm:gap-2"
            data-node-id="5:659"
          >
            {mockTodayKnowledge.topics.map((topic) => {
              const isMastered = topic.score === 100;
              const isLearning = topic.score > 0 && topic.score < 100;

              return (
                <div
                  key={topic.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2.5 sm:py-3 rounded-[12px] hover:bg-[#faf8ff] transition-colors gap-2 sm:gap-4"
                >
                  {/* Topic Title with status dot */}
                  <div className="flex items-center gap-3 shrink-0 sm:w-[320px] lg:w-[340px]">
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        isMastered && "bg-[#00b380]",
                        isLearning && "bg-[#ff9640]",
                        !isMastered && !isLearning && "bg-[#eaedff]"
                      )}
                    />
                    <span className="font-semibold text-[#131b2e] text-[15px] sm:text-[16px] leading-[24px]">
                      {topic.title}
                    </span>
                  </div>

                  {/* Score & Progress Bar */}
                  <div className="flex items-center gap-3 flex-1 max-w-full sm:max-w-[460px]">
                    <span className="font-semibold text-[#554337] text-[12px] sm:text-[13px] whitespace-nowrap">
                      Mức độ hiểu bài:
                    </span>
                    <span
                      className={cn(
                        "w-11 text-right font-bold text-[13px] sm:text-[14px]",
                        isMastered && "text-[#047857]",
                        isLearning && "text-[#ff9640]",
                        !isMastered && !isLearning && "text-[#887365]"
                      )}
                    >
                      {topic.score}%
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-[#eaedff] overflow-hidden relative min-w-[80px]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isMastered && "bg-[#00b380]",
                          isLearning && "bg-[#ff9640]",
                          !isMastered && !isLearning && "bg-transparent"
                        )}
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Average & Action Box */}
          <div
            className="lg:col-span-4 lg:border-l-[0.8px] lg:border-[#f3f4f6] lg:pl-8 flex flex-col justify-center gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#f3f4f6]"
            data-node-id="5:729"
          >
            {/* Average Understanding Box */}
            <div className="p-4 rounded-[12px] bg-[#faf8ff] border border-[#eaedff] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[#554337]">
                <span className="font-semibold text-[13px]">
                  Mức độ hiểu bài trung bình
                </span>
                <span className="font-bold text-[#131b2e] text-[16px]">
                  {mockTodayKnowledge.averageScore}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#eaedff] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#047857] transition-all duration-500"
                  style={{ width: `${mockTodayKnowledge.averageScore}%` }}
                />
              </div>
            </div>

            {/* Encouragement Text */}
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-[#131b2e] text-[18px] sm:text-[20px] leading-[30px]">
                {mockTodayKnowledge.encouragementTitle}
              </h3>
              <p className="text-[13px] text-[#554337] leading-[19.5px]">
                {mockTodayKnowledge.completedSummary}
              </p>
            </div>

            {/* CTA Button */}
            <Link
              href="/learn"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#944b00] hover:bg-[#8b4600] active:bg-[#773a00] text-white font-bold text-[15px] shadow-[0px_4px_6px_rgba(148,75,0,0.3)] transition-all select-none"
              data-node-id="5:745"
            >
              <span>Tiếp tục học</span>
              <ArrowRight className="size-4 text-white" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
