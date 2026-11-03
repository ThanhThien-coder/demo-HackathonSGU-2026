"use client";

import React from "react";

interface StepItem {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

const stepsData: StepItem[] = [
  {
    number: "01",
    title: "Dán link GitHub repo bạn thích",
    subtitle: "Chẳng cần cài cắm phức tạp hay tải code về máy.",
    description:
      "Bạn vừa tìm thấy một dự án hay ho trên mạng nhưng mở code ra thì thấy hoa mắt chóng mặt? Chỉ cần copy đường dẫn (URL) GitHub và dán vào SimpliFey. Hệ thống sẽ đọc lướt toàn bộ dự án trong 1.5 giây mà không làm phiền bạn bất kỳ lệnh Terminal nào.",
    tags: [
      "Không cần biết Git CLI",
      "Quét tự động trong 1.5s",
      "Hỗ trợ mọi ngôn ngữ phổ biến",
    ],
  },
  {
    number: "02",
    title: "Nhận bản đồ học tập chia nhỏ",
    subtitle: "Không học dồn dập, chia thành từng 'miếng bánh' vừa ăn.",
    description:
      "Thay vì đọc hàng nghìn dòng code cùng lúc, SimpliFey tự động chia dự án thành các phần việc thực tế: từ luồng Đăng nhập, Giỏ hàng, cho đến Cổng thanh toán. Bạn chỉ cần chọn một phần mình tò mò nhất để bắt đầu.",
    tags: [
      "Chia theo tính năng thực tế",
      "Có thanh tiến trình rõ ràng",
      "Biết chính xác mình đang ở đâu",
    ],
  },
  {
    number: "03",
    title: "Học cùng người bạn đồng hành AI (Feynman)",
    subtitle: "Bạn đóng vai người hướng dẫn, AI sẽ giả vờ 'ngây ngô' để hỏi bạn.",
    description:
      "Cách nhớ lâu nhất không phải là đọc tài liệu, mà là giải thích lại cho người khác! Trợ lý SimpliFey sẽ đặt những câu hỏi đời thường, gợi ý bằng sơ đồ và hình vẽ để bạn giải thích lại. Sai cũng không sao, AI luôn động viên và giải thích nhẹ nhàng.",
    tags: [
      "Phương pháp học Feynman đỉnh cao",
      "Không dùng thuật ngữ cao siêu",
      "Được khen ngợi và cộng điểm",
    ],
  },
  {
    number: "04",
    title: "Tự tin hiểu code, vững vàng phỏng vấn",
    subtitle: "Biến code của người khác thành kiến thức thật của mình.",
    description:
      "Sau vài vòng trò chuyện, hệ thống đo lường kiến thức (Bayesian Knowledge Tracing) sẽ đánh dấu xanh cho bạn. Bạn có thể tự tin nói về kiến trúc dự án khi phỏng vấn, làm đồ án tốt nghiệp hoặc khoe với bạn bè.",
    tags: [
      "Đánh giá năng lực chuẩn xác",
      "Tự tin bảo vệ đồ án",
      "Hiểu bản chất, không học vẹt",
    ],
  },
];

export function FourStepsSection() {
  return (
    <section
      className="w-full max-w-[1440px] mx-auto px-4 sm:px-12 py-16 sm:py-24 flex flex-col items-center gap-12 sm:gap-16"
      data-node-id="5:1294"
    >
      {/* Section Header */}
      <div className="flex flex-col items-center gap-2 max-w-[640px] text-center">
        <span className="font-bold text-[#944b00] text-[13px] tracking-[0.65px] uppercase leading-[19.5px]">
          4 BƯỚC SIÊU ĐƠN GIẢN
        </span>
        <h2 className="font-black text-[#131b2e] text-[28px] sm:text-[38px] leading-tight sm:leading-[57px] tracking-[-0.95px]">
          Bạn chỉ cần mang sự thích thú, việc còn lại để SimpliFey lo
        </h2>
      </div>

      {/* 4 Steps Cards List */}
      <div className="flex flex-col gap-8 max-w-[1040px] w-full">
        {stepsData.map((step) => (
          <div
            key={step.number}
            className="group rounded-[20px] bg-white border border-[#f3f4f6] p-6 sm:p-9 drop-shadow-[0px_10px_15px_rgba(0,0,0,0.04)] transition-all duration-200 hover:drop-shadow-[0px_14px_24px_rgba(255,150,64,0.08)] hover:border-[#ff9640]/30"
          >
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              {/* Giant Step Number matching Figma node 5:1304 */}
              <div className="shrink-0 select-none">
                <span className="font-black text-[36px] sm:text-[40px] text-[#ff9640]/40 group-hover:text-[#ff9640] transition-colors leading-[1.2] sm:leading-[60px]">
                  {step.number}
                </span>
              </div>

              {/* Step Content */}
              <div className="flex-1 flex flex-col items-start gap-1">
                <h3 className="font-black text-[#131b2e] text-[20px] sm:text-[24px] leading-snug sm:leading-[36px] tracking-[-0.6px]">
                  {step.title}
                </h3>
                <p className="font-semibold text-[#ff8624] text-[14px] sm:text-[15px] leading-[22.5px]">
                  {step.subtitle}
                </p>
                <p className="mt-1 font-normal text-[#625e56] text-[15px] sm:text-[16px] leading-[26px]">
                  {step.description}
                </p>

                {/* Feature Tags with green active dot */}
                <div className="mt-4 flex flex-wrap gap-2.5 items-center">
                  {step.tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#f3f4f6] bg-[#f9fafb] px-3 py-1 text-[12px] sm:text-[13px] font-semibold text-[#131b2e]"
                    >
                      <span className="size-1.5 rounded-full bg-[#10b981]" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
