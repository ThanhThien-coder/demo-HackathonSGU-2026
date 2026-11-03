"use client";

import React from "react";

export function ComparisonSection() {
  const traditionalPoints = [
    "Tải hàng trăm MB thư viện, cấu hình môi trường mệt mỏi.",
    "Lạc lối giữa hàng trăm file controller, service, dto.",
    "Tài liệu toàn chữ chuyên ngành khó hiểu như tiếng sao Hỏa.",
    "Học vẹt thuộc lòng xong ngày mai quên sạch.",
  ];

  const simplifeyPoints = [
    "Mở web dán link là chạy ngay, 0 giây cài đặt.",
    "Tập trung vào 1 câu chuyện cụ thể: Người dùng bấm mua hàng thì code chạy đâu?",
    "Giải thích bằng ví dụ đời thực, ví von dễ liên tưởng.",
    "Hiểu sâu kiến trúc và tự tin làm chủ dự án trọn vẹn.",
  ];

  return (
    <section
      className="w-full bg-[rgba(255,247,237,0.5)] border-y border-[rgba(254,215,170,0.4)] py-16 sm:py-20 px-4 sm:px-9"
      data-node-id="5:1400"
    >
      <div className="mx-auto max-w-[1040px] flex flex-col items-center gap-10 sm:gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 max-w-[620px] text-center">
          <span className="font-bold text-[#944b00] text-[13px] tracking-[0.65px] uppercase leading-[19.5px]">
            KHÁC BIỆT RÕ RỆT
          </span>
          <h2 className="font-black text-[#131b2e] text-[26px] sm:text-[34px] leading-tight sm:leading-[51px] tracking-[-0.85px]">
            Tại sao cách này hợp với bạn hơn?
          </h2>
        </div>

        {/* 2 Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">
          {/* Left Card: Traditional way */}
          <div
            className="flex flex-col gap-4 rounded-[16px] bg-white border border-[#e5e7eb] p-6 sm:p-7 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
            data-node-id="5:1407"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center text-[#6a7282] font-bold text-[16px] shrink-0">
                ✕
              </div>
              <h3 className="font-bold text-[#6a7282] text-[18px] leading-[27px]">
                Cách đọc code thông thường
              </h3>
            </div>

            <div className="mt-2 flex flex-col gap-3.5">
              {traditionalPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-[#ff6467] font-bold text-[15px] leading-[22.5px] select-none">
                    •
                  </span>
                  <span className="font-normal text-[#625e56] text-[15px] leading-[22.5px]">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: SimpliFey Way (Featured) */}
          <div
            className="relative flex flex-col gap-4 rounded-[16px] bg-white border border-[#ff9640] p-6 sm:p-7 shadow-[0px_8px_24px_0px_rgba(255,150,64,0.12)]"
            data-node-id="5:1431"
          >
            {/* Recommendation badge */}
            <div className="absolute right-3.5 top-3.5 rounded-full bg-[#ff9640] px-2.5 py-0.5 select-none">
              <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-white">
                KHUYÊN DÙNG
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-[12px] bg-[#fff0e6] border border-[#fed7aa] flex items-center justify-center text-[#ff9640] font-bold text-[16px] shrink-0">
                ✓
              </div>
              <h3 className="font-black text-[#131b2e] text-[18px] leading-[27px]">
                Đồng hành cùng SimpliFey
              </h3>
            </div>

            <div className="mt-2 flex flex-col gap-3.5">
              {simplifeyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-[#ff9640] font-bold text-[15px] leading-[22.5px] select-none">
                    ✔
                  </span>
                  <span className="font-semibold text-[#131b2e] text-[15px] leading-[22.5px]">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
