"use client";

import React from "react";
import { mockImprovementRecommendations } from "./data";
import { cn } from "@/lib/utils";

export function ReviewRecommendations() {
  return (
    <section
      className="bg-white border border-[#f3f4f6] rounded-[16px] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 w-full"
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
        {mockImprovementRecommendations.map((item, index) => {
          const isLast = index === mockImprovementRecommendations.length - 1;

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
