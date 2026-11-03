"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function CtaBanner() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[24px] bg-gradient-to-r from-[#131b2e] to-[#25324d] p-8 sm:px-12 sm:py-14 text-center shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]"
      data-node-id="5:1503"
    >
      {/* Orange Glow Blob matching Figma node 5:1504 */}
      <div
        className="pointer-events-none absolute -right-12 -top-10 size-[192px] rounded-full bg-[rgba(255,150,64,0.2)] blur-[40px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-[640px] flex-col items-center gap-3">
        <h2 className="font-black text-white text-[26px] sm:text-[34px] leading-tight sm:leading-[51px] tracking-[-0.85px]">
          Sẵn sàng thử tài hiểu code ngay hôm nay?
        </h2>

        <p className="max-w-[540px] font-normal text-[#d1d5dc] text-[15px] sm:text-[16px] leading-[24px]">
          Bắt đầu với bất kỳ repo nào bạn thấy thích. Hoàn toàn miễn phí và không cần kiến thức lập trình chuyên sâu.
        </p>

        <div className="pt-4 flex justify-center">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-[#ff9640] px-8 py-3.5 text-[15px] font-bold text-white shadow-[0px_8px_10px_rgba(255,150,64,0.4)] transition-all duration-200 hover:bg-[#f2852e] hover:shadow-[0px_12px_18px_rgba(255,150,64,0.5)] active:scale-[0.98]"
          >
            <span>Bắt đầu trải nghiệm ngay</span>
            <Image
              src="/assets/4d3ba.svg"
              alt="Arrow"
              width={14}
              height={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
