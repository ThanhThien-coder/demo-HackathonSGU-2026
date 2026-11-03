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
        <h3 className="font-semibold text-[#131b2e] text-[17px] leading-[25.5px]">
          Phân tích mã nguồn tự động
        </h3>
      </div>

      {/* Form with input and CTA */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-[12px] items-stretch sm:items-center w-full">
          {/* Input field matching Figma node 5:265 */}
          <div className="bg-[#f2f3ff] rounded-[8px] flex items-center flex-1 px-[14.8px] py-[12px] transition-all focus-within:ring-2 focus-within:ring-[#ff9640]/30 focus-within:bg-white border border-transparent focus-within:border-[#ff9640]">
            <div className="pr-[12px] flex items-center justify-center shrink-0">
              <Image
                src="/assets/2f0de.svg"
                alt="URL Icon"
                width={16}
                height={16}
                className="shrink-0"
              />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              aria-label="Repository URL"
              className="w-full bg-transparent text-[14px] font-semibold text-[#131b2e] placeholder:text-[#99a1af] focus:outline-none"
            />
          </div>

          {/* CTA Button matching Figma node 5:273 */}
          <button
            type="submit"
            disabled={isScanning}
            className="bg-[#ff9640] hover:bg-[#f2852e] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-[8px] px-[24px] py-[14px] rounded-[8px] shrink-0 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all select-none"
          >
            <span className="font-bold text-[#301400] text-[17px] leading-[25.5px] whitespace-nowrap">
              {isScanning ? "Đang quét..." : "Quét Dự Án"}
            </span>
            <Image
              src="/assets/4d3ba.svg"
              alt="Arrow"
              width={12}
              height={12}
              className="shrink-0 transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>
      </form>
    </div>
  );
}
