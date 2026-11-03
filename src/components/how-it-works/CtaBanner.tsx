"use client";

import React from "react";
import Link from "next/link";

export function CtaBanner() {
  return (
    <div className="flex justify-center w-full">
      <Link
        href="/"
        className="group inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-[#ff9640] px-8 py-3.5 text-[15px] font-bold text-white shadow-[0px_6px_8px_rgba(255,150,64,0.35)] transition-all duration-200 hover:bg-[#f2852e] hover:shadow-[0px_10px_16px_rgba(255,150,64,0.45)] active:scale-[0.98]"
      >
        <span>Bắt đầu trải nghiệm ngay</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path
            d="M9.13125 6.75H0V5.25H9.13125L4.93125 1.05L6 0L12 6L6 12L4.93125 10.95L9.13125 6.75V6.75"
            fill="white"
          />
        </svg>
      </Link>
    </div>
  );
}
