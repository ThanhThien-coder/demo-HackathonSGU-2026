"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

export function RoadmapHeader() {
  return (
    <div
      className="flex flex-col sm:flex-row gap-[14px] items-center justify-center w-full"
      data-node-id="5:821"
      data-name="Container"
    >
      {/* Cap Icon badge */}
      <div
        className="bg-[#fff7ed] border border-[#fed7aa] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-[16px] size-[48px] shrink-0"
        data-node-id="5:822"
        data-name="Background+Border+Shadow"
      >
        <GraduationCap
          className="size-7 text-[#ff9640]"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </div>

      {/* Heading 1 */}
      <h1
        className="font-black text-[#131b2e] text-[28px] sm:text-[36px] md:text-[40px] leading-[1.2] sm:leading-[60px] tracking-[-1px] text-center sm:text-left select-none"
        data-node-id="5:826"
        data-name="Heading 1"
      >
        Tiếp tục học repo của bạn
      </h1>
    </div>
  );
}
