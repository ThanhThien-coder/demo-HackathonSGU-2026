"use client";

import React from "react";
import Link from "next/link";

export function HowItWorksHero() {
  return (
    <section
      className="relative w-full overflow-hidden pb-16 pt-12 sm:pt-16 sm:pb-24 px-4 sm:px-9 border-b-[0.8px] border-[#f3f4f6]"
      data-node-id="5:1279"
    >
      {/* Background Gradient Glow matching Figma node 5:1280 */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] sm:h-[400px] w-[90%] max-w-[700px] rounded-[60px] bg-gradient-to-r from-[rgba(255,220,197,0.4)] via-[rgba(255,247,237,0.5)] to-[rgba(226,231,255,0.35)] blur-[64px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1440px] px-2 sm:px-12 flex flex-col items-center text-center">
        {/* Main Heading 1 matching Figma node 5:1283 */}
        <div className="max-w-[900px] w-full">
          <h1 className="font-black text-[#131b2e] text-[38px] sm:text-[50px] lg:text-[60px] leading-[1.15] sm:leading-[1.15] lg:leading-[69px] tracking-[-1.5px]">
            <span>Biến đống code xa lạ thành</span>
            <br />
            <span className="italic text-[#ff9640] inline-block font-black">
              kiến thức dễ ợt
            </span>
          </h1>
        </div>

        {/* Subtitle matching Figma node 5:1285 */}
        <div className="mt-4 sm:mt-5 max-w-[680px] w-full">
          <p className="font-normal text-[#625e56] text-[17px] sm:text-[20px] leading-relaxed sm:leading-[32.5px]">
            Không cần đọc hàng ngàn dòng file hay nhớ cú pháp đau đầu. Cùng
            SimpliFey &ldquo;dạo chơi&rdquo; qua từng tính năng của dự án giống như đọc truyện tranh.
          </p>
        </div>

        {/* CTA Button matching Figma node 5:1288 */}
        <div className="mt-6 sm:mt-8 flex justify-center w-full">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-[#ff9640] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0px_6px_8px_rgba(255,150,64,0.35)] transition-all duration-200 hover:bg-[#f2852e] hover:shadow-[0px_10px_16px_rgba(255,150,64,0.45)] active:scale-[0.98]"
          >
            <span>Thử ngay với 1 Repo tùy thích</span>
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
      </div>
    </section>
  );
}
