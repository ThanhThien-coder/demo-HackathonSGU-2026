"use client";

import React from "react";
import Image from "next/image";

export function HeroVisual() {
  return (
    <div
      className="relative flex items-center justify-center h-[480px] lg:h-[500px] w-full max-w-[560px] mx-auto select-none -translate-y-[40px] transition-transform"
      data-node-id="5:431"
    >
      {/* Decorative tilted card 1 (Peach/Orange background) */}
      <div
        className="absolute w-[460px] lg:w-[490px] h-[380px] lg:h-[410px] rounded-[48px] bg-[#ffdcc5] opacity-80 rotate-2 pointer-events-none transition-transform duration-500 hover:rotate-3"
        aria-hidden="true"
      />

      {/* Decorative tilted card 2 (Indigo/Lavender background) */}
      <div
        className="absolute w-[420px] lg:w-[440px] h-[340px] lg:h-[370px] rounded-[40px] bg-[#e2e7ff] opacity-70 -rotate-3 pointer-events-none transition-transform duration-500 hover:-rotate-4"
        aria-hidden="true"
      />

      {/* Main Image Container */}
      <div
        className="relative z-10 w-full max-w-[480px] lg:max-w-[500px] h-[340px] lg:h-[370px] rounded-[24px] overflow-hidden bg-white shadow-[0px_20px_40px_0px_rgba(0,0,0,0.12)] border border-white/60"
        data-node-id="5:434"
      >
        <Image
          src="/assets/bced1.png"
          alt="SimpliFey Codebase Cognitive Twin"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* Floating Badge 1 (Top-Left: Feynman Mode) */}
      <div
        className="absolute -top-6 -left-4 sm:-left-8 z-20 -rotate-3 transition-transform duration-300 hover:scale-105 hover:rotate-0"
        data-node-id="5:436"
      >
        <div className="bg-white border border-[#f3f4f6] drop-shadow-[0px_12px_12px_rgba(0,0,0,0.12)] flex items-center gap-[12px] p-[14px] rounded-[16px] backdrop-blur-sm">
          <div className="bg-[#f2f2f2] w-[48px] h-[56px] rounded-[12px] shrink-0 relative flex items-center justify-center">
            <Image
              src="/assets/6c182.svg"
              alt="Feynman Icon"
              width={22}
              height={19}
              className="block"
            />
            {/* Green active dot indicator */}
            <span
              className="absolute -bottom-1 -right-1 size-[14px] rounded-full bg-[#10b981] border-2 border-white shadow-sm"
              aria-label="Online"
            />
          </div>
          <div className="flex flex-col text-left">
            <h4 className="font-bold text-[#131b2e] text-[15px] sm:text-[16px] leading-[22px] whitespace-nowrap">
              Phương pháp học{" "}
              <span className="text-[#ff9640] font-bold">Feyman</span> trực
              tuyến, hiệu quả
            </h4>
            <p className="text-[12px] sm:text-[13px] text-[#625e56] leading-[16px] whitespace-nowrap mt-0.5">
              Hỗ trợ bạn hiểu bất kỳ mã nguồn nào
            </p>
          </div>
        </div>
      </div>

      {/* Floating Badge 2 (Bottom-Left: Progress 75%) */}
      <div
        className="absolute -bottom-8 -left-6 sm:-left-10 z-20 rotate-4 transition-transform duration-300 hover:scale-105 hover:rotate-0"
        data-node-id="5:448"
      >
        <div className="bg-white border border-[#f3f4f6] drop-shadow-[0px_16px_16px_rgba(0,0,0,0.12)] p-[16px] rounded-[16px] w-[290px] sm:w-[330px] flex flex-col gap-[12px]">
          <div className="flex items-center gap-[12px]">
            <div className="bg-[#eaedff] size-[36px] rounded-[8px] flex items-center justify-center shrink-0">
              <Image
                src="/assets/bc245.svg"
                alt="Progress Icon"
                width={18}
                height={20}
              />
            </div>
            <div className="flex flex-col text-left">
              <h4 className="font-bold text-[#131b2e] text-[13px] sm:text-[14px] leading-[18px]">
                Theo dõi tiến trình dễ dàng, trực quan
              </h4>
              <p className="text-[11px] sm:text-[12px] text-[#625e56] leading-[15px]">
                Học đúng mục tiêu, tiến bộ mỗi ngày
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-left">
              <span className="text-[12px] sm:text-[13px] text-[#625e56]">
                Mức độ nắm kiến thức
              </span>
              <span className="font-bold text-[#944b00] text-[16px] sm:text-[18px] leading-[24px]">
                75%
              </span>
            </div>
            <div className="bg-[#f2f3ff] h-[8px] rounded-full overflow-hidden w-full relative">
              <div
                className="bg-[#00b17a] h-full rounded-full transition-all duration-500 ease-out shadow-[0px_2px_4px_rgba(0,177,122,0.3)]"
                style={{ width: "75%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Badge 3 (Bottom-Right: Confidence Boost) */}
      <div
        className="absolute -bottom-5 -right-3 sm:-right-6 z-20 -rotate-2 transition-transform duration-300 hover:scale-105 hover:rotate-0"
        data-node-id="5:469"
      >
        <div className="bg-white border border-[#f3f4f6] drop-shadow-[0px_8px_10px_rgba(0,0,0,0.1)] px-[14px] py-[10px] rounded-[12px] flex items-center gap-[10px]">
          <div className="size-[20px] flex items-center justify-center shrink-0">
            <Image
              src="/assets/55197.svg"
              alt="Sparkle"
              width={16}
              height={20}
            />
          </div>
          <div className="flex flex-col text-left">
            <h5 className="font-bold text-[#131b2e] text-[12px] leading-[15px] whitespace-nowrap">
              Nâng cao sự tự tin về kiến thức
            </h5>
            <p className="text-[11px] text-[#625e56] leading-[14px] whitespace-nowrap mt-0.5">
              Nằm lòng kiến thức và ứng dụng ngay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
