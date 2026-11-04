"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function HeroScanner() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/simplifey/nest-store-core"
  );
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setIsScanning(true);
    // Simulate brief scan feedback then redirect to learning cockpit
    setTimeout(() => {
      router.push("/learn");
    }, 400);
  };

  return (
    <div
      className="bg-white border border-[#f3f4f6] drop-shadow-[0px_10px_15px_rgba(0,0,0,0.06)] flex flex-col gap-[14px] items-start max-w-[608px] p-[24.8px] rounded-[16px] w-full transition-shadow duration-200 hover:drop-shadow-[0px_14px_22px_rgba(0,0,0,0.09)]"
      data-node-id="5:256"
    >
      {/* Header title with scanner radar icon */}
      <div className="flex items-center gap-[10px] w-full">
        <div className="flex items-center justify-center shrink-0 size-[20px]">
          <Image
            src="/assets/6cf87.svg"
            alt="Phân tích"
            width={18}
            height={15}
            className="block"
          />
        </div>
        <h3 className="font-bold sm:font-bold text-[#131b2e] text-[17px] leading-[25.5px] tracking-tight">
          Phân tích mã nguồn tự động
        </h3>
      </div>

      {/* Form with input and CTA */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-[12px] items-stretch sm:items-center w-full">
          {/* Input field matching Figma node 5:265 */}
          <div className="bg-[#f2f3ff] rounded-[8px] flex items-center flex-1 px-[14.8px] py-[12px] transition-all focus-within:ring-2 focus-within:ring-[#ff9640]/30 focus-within:bg-white border border-transparent focus-within:border-[#ff9640] overflow-hidden">
            {/* Fixed Icon container: protected z-10 so animated text never overlaps */}
            <div className="pr-[12px] flex items-center justify-center shrink-0 z-10 bg-inherit">
              <Image
                src="/assets/2f0de.svg"
                alt="URL Icon"
                width={16}
                height={16}
                className="shrink-0"
              />
            </div>
            {/* Horizontal panning text container */}
            <div className="flex-1 overflow-hidden relative min-w-0">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                aria-label="Repository URL"
                className="w-full bg-transparent text-[14px] font-semibold text-[#131b2e] placeholder:text-[#99a1af] focus:outline-none animate-pan-horizontal focus:animate-none hover:animate-none cursor-text"
              />
            </div>
          </div>

          {/* CTA Button matching Figma node 5:273 */}
          <button
            type="submit"
            disabled={isScanning}
            className="group bg-[#ff9640] hover:bg-[#f2852e] hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-[8px] px-[24px] py-[14px] rounded-[8px] shrink-0 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out origin-center select-none"
          >
            <span className="font-bold text-white text-[17px] leading-[25.5px] whitespace-nowrap">
              {isScanning ? "Đang quét..." : "Quét Dự Án"}
            </span>
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
          </button>
        </div>
      </form>
    </div>
  );
}
