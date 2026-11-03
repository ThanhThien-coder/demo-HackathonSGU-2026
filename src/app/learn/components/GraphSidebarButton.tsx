"use client";

import React from "react";
import { Network } from "lucide-react";

interface GraphSidebarButtonProps {
  onClick: () => void;
}

export function GraphSidebarButton({ onClick }: GraphSidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="fixed left-0 top-[210px] sm:top-[220px] z-30 flex flex-col items-center justify-center gap-2 sm:gap-2.5 w-[80px] sm:w-[96px] h-[132px] sm:h-[148px] bg-white border border-[#ff9640]/40 border-l-0 rounded-r-[20px] shadow-[4px_6px_14px_rgba(255,150,64,0.35)] hover:shadow-[6px_8px_18px_rgba(255,150,64,0.45)] hover:bg-[#fff9f5] hover:translate-x-1 transition-all duration-200 group cursor-pointer select-none"
      title="Mở bảng đồ thị bài học & cấu trúc kiến thức"
      aria-label="Mở bảng đồ thị bài học"
      data-node-id="5:217"
      data-name="Button"
    >
      {/* Icon with subtle pulse animation */}
      <div className="relative size-10 sm:size-[42px] flex items-center justify-center text-[#ff9640] group-hover:scale-110 transition-transform">
        <div className="absolute inset-0 bg-[#fff0e4] rounded-full scale-90 group-hover:scale-100 transition-transform" />
        <Network className="size-6 sm:size-7 text-[#ff9640] relative z-10" />
      </div>

      {/* Label */}
      <div className="flex flex-col items-center text-[#131b2e] font-bold text-xs sm:text-[14px] leading-[18px] sm:leading-[19.25px] tracking-[-0.35px] text-center">
        <span>Đồ thị</span>
        <span>bài học</span>
      </div>
    </button>
  );
}
