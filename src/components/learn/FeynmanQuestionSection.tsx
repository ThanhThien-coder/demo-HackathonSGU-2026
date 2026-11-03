"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Send } from "lucide-react";
import { MOCK_LESSON_DATA } from "./mockData";
import characterWalkingAnimation from "../../../public/assets/character-walking.json";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.Lottie), {
  ssr: false,
});

interface FeynmanQuestionSectionProps {
  onSubmit: (answer: string) => void;
  isSubmitting?: boolean;
}

export function FeynmanQuestionSection({
  onSubmit,
  isSubmitting = false,
}: FeynmanQuestionSectionProps) {
  const [answer, setAnswer] = useState(MOCK_LESSON_DATA.mockInitialAnswer);

  // Compute word count
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const maxWords = MOCK_LESSON_DATA.maxWords;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;
    onSubmit(answer);
  };

  return (
    <div
      className="bg-white border border-[#e5e7eb]/80 flex flex-col p-5 sm:p-6 rounded-[16px] drop-shadow-[0px_8px_12px_rgba(148,75,0,0.08)] w-full lg:w-[738px] flex-1 shrink-0"
      data-node-id="5:170"
      data-name="Section"
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Companion Header & Question */}
        <div className="flex flex-col gap-3 w-full" data-node-id="5:172">
          {/* AI Mascot & Status */}
          <div className="flex items-center gap-3.5 w-full" data-node-id="5:173">
            <div className="relative size-[100px] sm:size-[115px] shrink-0 flex items-center justify-center">
              <Lottie
                src={characterWalkingAnimation}
                autoplay
                loop
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-[#131b2e] text-base sm:text-lg leading-tight">
                Người bạn đồng hành SimpliFey
              </h3>
              <span
                className="size-2.5 rounded-full bg-[#00bc7d] animate-pulse"
                title="AI đang lắng nghe và phản biện theo thời gian thực"
                aria-label="Online"
                data-node-id="5:194"
              />
            </div>
          </div>

          {/* Question Callout Box */}
          <div
            className="bg-[#ffdcc5]/25 border border-[#ff9640]/45 flex flex-col gap-2 p-4 sm:p-5 rounded-[12px] shadow-[0px_4px_12px_0px_rgba(255,150,64,0.08)] w-full"
            data-node-id="5:195"
            data-name="Overlay+Border+Shadow"
          >
            <div className="flex items-center justify-between">
              <span
                className="font-black text-[#944b00] text-xs tracking-[0.6px] uppercase"
                data-node-id="5:198"
              >
                {MOCK_LESSON_DATA.question.tag}
              </span>
            </div>

            <p
              className="font-semibold text-[#131b2e] text-[16px] sm:text-[17px] leading-[26px] sm:leading-[27.6px]"
              data-node-id="5:200"
            >
              {MOCK_LESSON_DATA.question.text}
            </p>
          </div>
        </div>

        {/* Answer Explanation Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 w-full"
          data-node-id="5:201"
          data-name="Form"
        >
          {/* Label & Word Count */}
          <div className="flex items-center justify-between w-full" data-node-id="5:202">
            <label
              htmlFor="feynman-explanation"
              className="font-black text-[#554337] text-xs sm:text-[14px] tracking-[0.7px] uppercase select-none cursor-pointer"
              data-node-id="5:204"
            >
              LỜI GIẢI THÍCH CỦA BẠN
            </label>
            <span
              className={`font-semibold text-xs sm:text-[13px] ${
                wordCount > maxWords ? "text-[#e7000b]" : "text-[#625e56]"
              }`}
              data-node-id="5:206"
            >
              {wordCount}/{maxWords} từ
            </span>
          </div>

          {/* Textarea */}
          <div
            className="relative border border-[#eaedff] rounded-[12px] bg-[#faf8ff] shadow-[inset_0px_2px_4px_1px_rgba(0,0,0,0.05)] focus-within:border-[#ff9640] focus-within:ring-2 focus-within:ring-[#ff9640]/20 transition-all overflow-hidden"
            data-node-id="5:207"
            data-name="Textarea"
          >
            <textarea
              id="feynman-explanation"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Dùng ngôn ngữ đời thường, hình tượng thực tế để giải thích cơ chế dòng code trên..."
              className="w-full bg-transparent p-4 sm:p-5 text-[#131b2e] text-[15px] sm:text-[16px] leading-[26px] outline-none resize-none placeholder:text-[#99a1af]"
              required
            />
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-2 w-full" data-node-id="5:210">
            <button
              type="submit"
              disabled={isSubmitting || !answer.trim()}
              className="bg-[#ff9640] hover:bg-[#f2852e] active:bg-[#e6761c] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-[12px] drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              data-node-id="5:211"
              data-name="Button"
            >
              <span>{isSubmitting ? "Đang Chấm Điểm BKT..." : "Nộp Bài Chấm Điểm"}</span>
              <Send className="size-4 shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
