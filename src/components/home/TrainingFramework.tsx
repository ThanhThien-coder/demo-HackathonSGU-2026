"use client";

import React from "react";
import Image from "next/image";

export function TrainingFramework() {
  const cards = [
    {
      id: "foundation",
      icon: "/assets/2ecfc.svg",
      iconWidth: 24,
      iconHeight: 23,
      title: "Xây dựng nền móng",
      description:
        "Phù hợp để bắt đầu và xây dựng nền tảng vững chắc với kiến thức cốt lõi, cú pháp chuẩn và tư duy giải thuật sơ cấp.",
    },
    {
      id: "feynman-style",
      icon: "/assets/fbd68.svg",
      iconWidth: 24,
      iconHeight: 24,
      title: "Phong cách học trực tuyến mới lạ",
      description:
        "Trải nghiệm học tập cùng AI bằng cách “đảo ngược vai trò sư phạm” mới lạ và hiệu quả theo Feyman.",
    },
    {
      id: "tracking-improvement",
      icon: "/assets/76f4f.svg",
      iconWidth: 24,
      iconHeight: 18,
      title: "Theo dõi và cải thiện",
      description:
        "Trải nghiệm học tập toàn diện với nhiều tính năng phân tích nâng cao, đánh giá độ phức tạp thuật toán và gợi ý nâng cấp.",
    },
  ];

  return (
    <section
      className="bg-white border-t-[0.8px] border-[#f3f4f6] pt-[56.8px] pb-[56px] px-4 sm:px-9 w-full"
      data-node-id="5:480"
    >
      <div className="max-w-[1440px] mx-auto px-2 sm:px-12 flex flex-col gap-[40px]">
        {/* Header section with title and slogan */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 w-full">
          <div>
            <span className="font-bold text-[#944b00] text-[15px] tracking-[0.75px] uppercase leading-[22.5px] block mb-1">
              KHUNG ĐÀO TẠO ĐA TẦNG
            </span>
            <h2 className="font-black text-[#131b2e] text-[26px] sm:text-[30px] leading-tight sm:leading-[45px]">
              Lộ trình được thiết kế chuẩn xác theo chính repo của bạn
            </h2>
          </div>

          <div className="flex items-center gap-[12px] shrink-0 pb-1">
            <div className="bg-[#ff9640] h-[6px] w-[80px] rounded-full shrink-0" />
            <span className="font-semibold italic text-[#31302d] text-[16px] sm:text-[18px] leading-[27px] whitespace-nowrap">
              Đi cùng bạn qua từng dấu chấm phẩy
            </span>
          </div>
        </div>

        {/* 3 Training Framework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[32px] w-full">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white border border-[#f3f4f6] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col gap-[9.4px] items-start p-[24.8px] rounded-[16px] transition-all duration-200 hover:drop-shadow-[0px_10px_20px_rgba(255,150,64,0.12)] hover:-translate-y-1"
            >
              {/* Icon box matching Figma node 5:495 / 5:507 / 5:518 */}
              <div className="bg-white border border-[#ff9640] flex items-center justify-center p-[9.6px] rounded-[8px] size-[48px] shrink-0 shadow-sm">
                <Image
                  src={card.icon}
                  alt={card.title}
                  width={card.iconWidth}
                  height={card.iconHeight}
                  className="block"
                />
              </div>

              {/* Title */}
              <div className="pt-[5.9px] pb-[0.7px]">
                <h3 className="font-bold text-[#131b2e] text-[18px] leading-[27px]">
                  {card.title}
                </h3>
              </div>

              {/* Description */}
              <div>
                <p className="font-normal text-[#625e56] text-[15px] sm:text-[16px] leading-[26px]">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
