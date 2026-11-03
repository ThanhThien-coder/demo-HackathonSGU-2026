"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ReportHeader() {
  return (
    <div
      className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-5 pb-2 flex items-start"
      data-node-id="5:564"
    >
      <Link
        href="/learn"
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-[11px] bg-[#ff9640] hover:bg-[#f2852e] active:bg-[#e6761c] text-white font-semibold text-[15px] sm:text-[16px] leading-[24px] shadow-[0px_4px_6px_rgba(255,150,64,0.3)] transition-all duration-150 select-none cursor-pointer"
        data-node-id="5:565"
      >
        <div className="flex items-center justify-center size-5 shrink-0">
          <ArrowLeft className="size-4 sm:size-5 text-white" strokeWidth={2.5} />
        </div>
        <span>Quay về trang học</span>
      </Link>
    </div>
  );
}
