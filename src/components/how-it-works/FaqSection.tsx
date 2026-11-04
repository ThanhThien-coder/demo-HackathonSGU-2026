"use client";

import React from "react";
import { HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqList: FaqItem[] = [
  {
    question:
      "Mình là 'Vibe Coder', chỉ biết dùng AI prompt code thì có hiểu được không?",
    answer:
      "Hoàn toàn được! SimpliFey sinh ra chính là để giúp bạn. Chúng mình không bắt bạn đọc hàng trăm dòng cú pháp phức tạp, mà giải thích theo tư duy logic đời thường giống như cách bạn xem một bức tranh hay một trò chơi xếp hình LEGO.",
  },
  {
    question: "Mình có cần tải Node.js, Java hay Docker về máy không?",
    answer:
      "Không cần tải bất cứ thứ gì! Toàn bộ quá trình quét mã và tương tác đều diễn ra trực tiếp trên trình duyệt của bạn.",
  },
  {
    question: "Phương pháp Feynman ở đây là gì vậy?",
    answer:
      "Đây là bí quyết học nổi tiếng của nhà vật lý Richard Feynman: 'Nếu bạn không thể giải thích điều gì đó cho một đứa trẻ 10 tuổi hiểu, thì bạn chưa thực sự hiểu nó'. SimpliFey sẽ giúp bạn tập giải thích code một cách mộc mạc nhất.",
  },
  {
    question: "Nó có miễn phí không?",
    answer:
      "SimpliFey là dự án mã nguồn mở phi thương mại phục vụ sinh viên và cộng đồng học lập trình.",
  },
];

export function FaqSection() {
  return (
    <div className="flex flex-col gap-12 w-full max-w-[960px] mx-auto" data-node-id="5:1457">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center w-full">
        <span className="font-bold text-[#944b00] text-[13px] tracking-[0.65px] uppercase leading-[19.5px]">
          CÂU HỎI THƯỜNG GẶP
        </span>
        <h2 className="font-black text-[#131b2e] text-[26px] sm:text-[34px] leading-tight sm:leading-[51px] tracking-[-0.85px]">
          Bạn vẫn còn thắc mắc?
        </h2>
      </div>

      {/* FAQ Cards */}
      <div className="flex flex-col gap-4 w-full">
        {faqList.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-[16px] bg-white border border-[#e5e7eb] p-6 sm:p-[24.8px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-all duration-150 hover:border-[#ff9640]/40"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="size-4 text-[#ff9640] shrink-0" />
              <h3 className="font-bold text-[#131b2e] text-[16px] sm:text-[17px] leading-[25.5px]">
                {faq.question}
              </h3>
            </div>
            <div className="mt-2.5 pl-6 sm:pl-[26px]">
              <p className="font-normal text-[#625e56] text-[14px] sm:text-[15px] leading-relaxed sm:leading-[24.38px]">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
