"use client";

import React from "react";
import Link from "next/link";

export function HomeFooter() {
  return (
    <footer
      className="bg-[#fff0e4] border-[#ffe0cc] border-t-[0.8px] pt-[24.8px] pb-[24px] px-4 sm:px-[36.4px] w-full"
      data-node-id="5:526"
    >
      <div className="max-w-[1440px] mx-auto px-2 sm:px-[24px] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left branding and copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-[12px] text-center sm:text-left">
          <Link
            href="/"
            className="font-bold text-[#ff9640] text-[18px] leading-[27px] tracking-tight hover:opacity-90 transition-opacity"
          >
            SIMPLIFEY
          </Link>
          <span className="font-normal text-[#554337] text-[13px] leading-[19.5px]">
            © 2025 SimpliFey by MeoMeo Team - Hackathon 2026
          </span>
        </div>

        {/* Right slogan */}
        <div className="text-center sm:text-right">
          <p className="font-normal text-[#625e56] text-[12px] leading-[18px]">
            Học kiến trúc mã nguồn qua phương pháp Feynman
          </p>
        </div>
      </div>
    </footer>
  );
}
