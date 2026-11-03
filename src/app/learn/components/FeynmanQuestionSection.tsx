"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Send, Eye, Flag, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import type { QuestionView, QuestionState } from "@/contracts";
import characterWalkingAnimation from "../../../../public/assets/character-walking.json";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.Lottie), {
  ssr: false,
});

interface FeynmanQuestionSectionProps {
  question?: QuestionView | null;
  questionIndex?: number;
  totalQuestions?: number;
  isLoadingQuestion?: boolean;
  isSubmitting?: boolean;
  onSubmit: (answer: string) => Promise<void> | void;
  onSkip?: () => void;
  onReportWrong?: () => void;
  isRevealed?: boolean;
  revealData?: QuestionState["reveal"] | null;
  isDisputed?: boolean;
  validationError?: string | null;
  errorMessage?: string | null;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
}

export function FeynmanQuestionSection({
  question,
  questionIndex = 1,
  totalQuestions = 1,
  isLoadingQuestion = false,
  isSubmitting = false,
  onSubmit,
  onSkip,
  onReportWrong,
  isRevealed = false,
  revealData = null,
  isDisputed = false,
  validationError = null,
  errorMessage = null,
  onNextQuestion,
  hasNextQuestion = false,
}: FeynmanQuestionSectionProps) {
  const [answer, setAnswer] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  // Reset answer when question changes
  useEffect(() => {
    setAnswer("");
    setClientError(null);
  }, [question?.question_index]);

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const maxWords = 150;
  const minChars = 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const trimmed = answer.trim().replace(/\s+/g, "");
    if (trimmed.length < minChars) {
      setClientError(`Câu trả lời quá ngắn — vui lòng viết ít nhất ${minChars} ký tự (không tính khoảng trắng).`);
      return;
    }

    if (isSubmitting || isRevealed) return;
    onSubmit(answer.trim());
  };

  // Support Ctrl+Enter keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const attemptsUsed = question?.state?.attempts_used || 0;
  const maxAttempts = 3;
  const isQuestionFinished = question?.state?.finished || isRevealed;
  const isQuestionFailed = question?.state?.outcome === "FAILED";

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
            <div className="flex flex-col gap-1">
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

              {/* Question metadata badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#554337] bg-[#faf8ff] px-2.5 py-1 rounded-md border border-[#eaedff]">
                  Câu {questionIndex}/{totalQuestions}
                </span>
                {question?.skill && (
                  <span className="text-xs font-bold text-[#944b00] bg-[#ffdcc5] px-2.5 py-1 rounded-md font-mono">
                    {question.skill}
                  </span>
                )}
                {question?.tier && (
                  <span className="text-xs font-semibold text-[#004cff] bg-[#eaedff] px-2.5 py-1 rounded-md">
                    {question.tier}
                  </span>
                )}
                {isDisputed && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#dc2626] bg-[#fee2e2] px-2 py-0.5 rounded-md">
                    <Flag className="size-3" /> Đã báo sai
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Question Callout Box */}
          <div
            className="bg-[#ffdcc5]/25 border border-[#ff9640]/45 flex flex-col gap-2 p-4 sm:p-5 rounded-[12px] shadow-[0px_4px_12px_0px_rgba(255,150,64,0.08)] w-full relative"
            data-node-id="5:195"
            data-name="Overlay+Border+Shadow"
          >
            {/* Loading Question Skeleton */}
            {isLoadingQuestion ? (
              <div className="flex items-center gap-2 py-4 text-[#944b00] text-sm font-semibold animate-pulse">
                <RefreshCw className="size-4 animate-spin" />
                <span>Đang tải câu hỏi Feynman từ AI (Bước 10: enrich-node)...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className="font-black text-[#944b00] text-xs tracking-[0.6px] uppercase"
                    data-node-id="5:198"
                  >
                    {question?.focus
                      ? `THỬ THÁCH FEYNMAN · TRỌNG TÂM: ${question.focus}`
                      : "THỬ THÁCH FEYNMAN · BẢN CHẤT KIẾN TRÚC"}
                  </span>

                  {/* Attempts Used Counter */}
                  <span className="text-xs font-bold text-[#554337]">
                    Lượt: <span className="text-[#944b00]">{Math.min(attemptsUsed + 1, maxAttempts)}</span>/{maxAttempts}
                  </span>
                </div>

                <p
                  className="font-semibold text-[#131b2e] text-[16px] sm:text-[17px] leading-[26px] sm:leading-[27.6px]"
                  data-node-id="5:200"
                >
                  {question?.feynman_question ||
                    "Hãy đóng vai bạn đang giải thích cho một lập trình viên mới vào nghề: Dòng code trên đang tiềm ẩn nguy cơ hiệu năng gì và hệ thống sẽ phản ứng ra sao khi số lượng đơn hàng tăng đột biến?"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Reveal Panel (if skipped or finished) */}
        {isQuestionFinished && (revealData || question?.state?.reveal) && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#166534]">
                <Sparkles className="size-4 text-[#16a34a]" />
                <span>Đáp án tham khảo do AI viết (Reveal):</span>
              </div>
              {isQuestionFailed && onReportWrong && !isDisputed && (
                <button
                  type="button"
                  onClick={onReportWrong}
                  className="text-xs font-bold text-[#dc2626] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="size-3" />
                  Báo sai kết quả chấm
                </button>
              )}
            </div>
            <p className="text-xs text-[#14532d] leading-relaxed bg-white/80 p-3 rounded-[8px] border border-[#bbf7d0]">
              {(revealData || question?.state?.reveal)?.reference_answer}
            </p>
            {(revealData || question?.state?.reveal)?.fix && (
              <div className="text-xs text-[#166534] pl-1">
                <strong>Hướng khắc phục:</strong> {(revealData || question?.state?.reveal)?.fix}
              </div>
            )}
          </div>
        )}

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
              className="font-black text-[#554337] text-xs sm:text-[14px] tracking-[0.7px] uppercase select-none cursor-pointer flex items-center gap-2"
              data-node-id="5:204"
            >
              <span>LỜI GIẢI THÍCH CỦA BẠN</span>
              <span className="text-[11px] font-normal text-[#99a1af] lowercase">(nhấn Ctrl+Enter để nộp)</span>
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
            className={`relative border rounded-[12px] bg-[#faf8ff] shadow-[inset_0px_2px_4px_1px_rgba(0,0,0,0.05)] focus-within:ring-2 transition-all overflow-hidden ${
              clientError || validationError
                ? "border-[#ef4444] focus-within:border-[#ef4444] focus-within:ring-[#ef4444]/20"
                : "border-[#eaedff] focus-within:border-[#ff9640] focus-within:ring-[#ff9640]/20"
            }`}
            data-node-id="5:207"
            data-name="Textarea"
          >
            <textarea
              id="feynman-explanation"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (clientError) setClientError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting || isQuestionFinished}
              rows={5}
              placeholder={
                isQuestionFinished
                  ? "Câu hỏi này đã kết thúc. Bạn có thể xem đáp án mẫu ở trên."
                  : "Dùng ngôn ngữ đời thường, hình tượng thực tế để giải thích cơ chế dòng code trên..."
              }
              className="w-full bg-transparent p-4 sm:p-5 text-[#131b2e] text-[15px] sm:text-[16px] leading-[26px] outline-none resize-none placeholder:text-[#99a1af] disabled:opacity-75 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Error Message beneath textarea (spec/30_UI.md UI-52) */}
          {(clientError || validationError || errorMessage) && (
            <div className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium px-1">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{clientError || validationError || errorMessage}</span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2 w-full" data-node-id="5:210">
            {/* Step 12: Skip question button */}
            {!isQuestionFinished && onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                disabled={isSubmitting}
                className="text-xs font-bold text-[#554337] hover:text-[#944b00] flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Bỏ qua câu này để xem đáp án mẫu AI (tính Chưa Đạt)"
              >
                <Eye className="size-3.5" />
                <span>Bỏ qua câu này</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              {/* Next question button if finished */}
              {isQuestionFinished && hasNextQuestion && onNextQuestion && (
                <button
                  type="button"
                  onClick={onNextQuestion}
                  className="bg-[#00bc7d] hover:bg-[#009b67] text-white font-bold text-sm sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-[12px] drop-shadow-[0px_4px_5px_rgba(0,188,125,0.3)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span>Câu tiếp theo</span>
                  <Send className="size-4 shrink-0" />
                </button>
              )}

              {/* Submit Button */}
              {!isQuestionFinished && (
                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="bg-[#ff9640] hover:bg-[#f2852e] active:bg-[#e6761c] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-[12px] drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  data-node-id="5:211"
                  data-name="Button"
                >
                  {isSubmitting && <RefreshCw className="size-4 animate-spin shrink-0" />}
                  <span>{isSubmitting ? "Đang Chấm Điểm BKT..." : "Nộp Bài Chấm Điểm"}</span>
                  <Send className="size-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
