"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  Eye,
  Flag,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
} from "lucide-react";
import type {
  QuestionView,
  QuestionState,
  QuestionFocus,
  SkillChange,
  NodeStateView,
} from "@/contracts";
import { CONFIG } from "@/contracts";
import { validateAnswerLength, similarity } from "@/lib/similarity";
import { ERROR_MESSAGES } from "@/lib/messages";
import { isOfflineMode } from "@/lib/offline";
import { tierOf } from "@/lib/bkt-engine";
import { AiText } from "./XRayPanel";
import { RunSummary } from "./RunSummary";
import characterWalkingAnimation from "../../../../public/assets/character-walking.json";

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.Lottie), {
  ssr: false,
});

export const QUESTION_FOCUS_LABELS: Record<QuestionFocus, string> = {
  FLOW: "Luồng",
  ARCHITECTURE: "Kiến trúc",
  WEAKNESS: "Điểm dở",
  CHANGE: "Thay đổi",
};

function getQuestionStatusBadge(q: QuestionView, isCurrent: boolean) {
  if (q.state?.ended_by === "DROPPED") {
    return {
      text: "⊘ AI không đặt được câu này — không tính",
      className: "text-[#64748b] bg-gray-100 border-gray-200",
    };
  }
  if (q.state?.disputed) {
    return {
      text: "🚩 Đã báo sai",
      className: "text-[#dc2626] bg-[#fee2e2] border-[#fca5a5]",
    };
  }
  if (q.state?.finished) {
    if (q.state.outcome === "PASS_FIRST" || q.state.outcome === "PASS_AFTER_HINT") {
      return {
        text: "✅ Đạt",
        className: "text-[#16a34a] bg-[#f0fdf4] border-[#bbf7d0]",
      };
    }
    return {
      text: "❌ Chưa đạt",
      className: "text-[#dc2626] bg-[#fef2f2] border-[#fecaca]",
    };
  }
  if (isCurrent) {
    return {
      text: "✍ Đang trả lời",
      className: "text-[#ea580c] bg-[#fff7ed] border-[#ffedd5]",
    };
  }
  return {
    text: "⏳ Chờ",
    className: "text-[#64748b] bg-gray-50 border-gray-200",
  };
}

interface FeynmanQuestionSectionProps {
  question?: QuestionView | null;
  questionIndex?: number;
  totalQuestions?: number;
  questions?: QuestionView[];
  onSelectQuestion?: (index: number) => void;
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
  lastFailedAnswer?: string | null;
  isQuotaExceeded?: boolean;
  drafts?: Record<number, string>;
  onSaveDraft?: (questionIndex: number, text: string) => void;
  pointsCovered?: boolean[] | null;
  skillChange?: SkillChange | null;
  nodeState?: NodeStateView | null;
  unlockedNodeIds?: string[];
  onRetrySubmit?: () => void;
}

export function FeynmanQuestionSection({
  question,
  questionIndex = 1,
  totalQuestions = 1,
  questions = [],
  onSelectQuestion,
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
  lastFailedAnswer = null,
  isQuotaExceeded = false,
  drafts,
  onSaveDraft,
  pointsCovered = null,
  skillChange = null,
  nodeState = null,
  unlockedNodeIds = [],
  onRetrySubmit,
}: FeynmanQuestionSectionProps) {
  const [answer, setAnswer] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const submitLockRef = useRef(false);

  const currentQIdx = question?.question_index ?? questionIndex;
  const isQuestionDropped = question?.state?.ended_by === "DROPPED";

  // Restore draft when switching question index
  useEffect(() => {
    if (drafts && drafts[currentQIdx] !== undefined) {
      setAnswer(drafts[currentQIdx]);
    } else {
      setAnswer("");
    }
    setClientError(null);
  }, [currentQIdx, drafts]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleAnswerChange = (val: string) => {
    setAnswer(val);
    if (clientError) setClientError(null);
    onSaveDraft?.(currentQIdx, val);
  };

  const nonSpaceCharCount = useMemo(
    () => [...answer.replace(/\s/gu, "")].length,
    [answer]
  );
  const totalCharCount = answer.length;

  // Check duplicate similarity with last failed answer (UI-52)
  const duplicateSimilarity = useMemo(() => {
    if (!lastFailedAnswer || nonSpaceCharCount < CONFIG.ANSWER_MIN_CHARS) return 0;
    return similarity(answer, lastFailedAnswer);
  }, [answer, lastFailedAnswer, nonSpaceCharCount]);

  const isDuplicateWarning =
    duplicateSimilarity >= CONFIG.ANSWER_DUPLICATE_SIMILARITY;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    // Không cho trả lời nếu câu bị DROPPED
    if (isQuestionDropped) return;

    // 0. Check quota
    if (isQuotaExceeded) {
      setClientError("Hết hạn mức AI của phiên — không chấm được bài mới");
      return;
    }

    // 1. Check length using similarity.ts
    const lengthErr = validateAnswerLength(answer);
    if (lengthErr === "ERR_ANSWER_TOO_SHORT") {
      setClientError(ERROR_MESSAGES.ERR_ANSWER_TOO_SHORT);
      return;
    }
    if (lengthErr === "ERR_ANSWER_TOO_LONG") {
      setClientError(ERROR_MESSAGES.ERR_ANSWER_TOO_LONG);
      return;
    }

    // 2. Check duplicate similarity
    if (isDuplicateWarning) {
      setClientError(ERROR_MESSAGES.ERR_ANSWER_DUPLICATE);
      return;
    }

    if (isSubmitting || isDebouncing || isRevealed || submitLockRef.current) return;

    // Set debounce lock (CONFIG.SUBMIT_DEBOUNCE_MS)
    submitLockRef.current = true;
    setIsDebouncing(true);
    debounceTimerRef.current = setTimeout(() => {
      submitLockRef.current = false;
      setIsDebouncing(false);
    }, CONFIG.SUBMIT_DEBOUNCE_MS);

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
  const maxAttempts = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
  const isQuestionFinished = Boolean(question?.state?.finished || isRevealed);

  const canReportWrong =
    question?.state?.outcome === "FAILED" &&
    question?.state?.ended_by === "ANSWER" &&
    !question?.state?.disputed &&
    !isDisputed &&
    !isOfflineMode();

  const allQuestionsFinished =
    questions.length > 0 &&
    questions.every(
      (q) => q.state?.finished || q.state?.ended_by === "DROPPED"
    );

  const reveal = revealData || question?.state?.reveal;

  return (
    <div
      className="bg-white border border-[#e5e7eb]/80 flex flex-col p-5 sm:p-6 rounded-[16px] drop-shadow-[0px_8px_12px_rgba(148,75,0,0.08)] lg:flex-1 lg:min-w-0 w-full"
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] font-bold bg-[#ffedd4] text-[#944b00] px-2.5 py-0.5 rounded-full border border-[#ff9640]/30">
                  Câu hỏi {currentQIdx}/{totalQuestions}
                </span>

                {question?.skill && (
                  <span className="text-[11px] font-semibold bg-[#f2f3ff] text-[#004cff] px-2 py-0.5 rounded-full border border-[#eaedff]">
                    {question.skill}
                  </span>
                )}

                {question?.tier && (
                  <span className="text-[11px] font-semibold bg-[#faf8ff] text-[#554337] px-2 py-0.5 rounded-full border border-[#e5e7eb]">
                    {question.tier}
                  </span>
                )}

                {/* Badge góc hỏi từ question.focus (Mục 6.2) */}
                {question?.focus && (
                  <span className="text-[11px] font-semibold bg-[#f5f3ff] text-[#7c3aed] px-2 py-0.5 rounded-full border border-[#ddd6fe]">
                    {QUESTION_FOCUS_LABELS[question.focus] || question.focus}
                  </span>
                )}
              </div>

              {/* Attempts counter dots (UI-52) */}
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#554337]">
                <span className="font-semibold text-[11px]">Lượt nộp:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxAttempts }).map((_, i) => (
                    <span
                      key={i}
                      className={`size-2.5 rounded-full ${
                        i < attemptsUsed
                          ? "bg-[#ff9640]"
                          : "bg-[#e5e7eb] border border-[#d1d5db]"
                      }`}
                      title={`Lượt ${i + 1}/${maxAttempts}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-[#99a1af] ml-1">
                  ({attemptsUsed}/{maxAttempts})
                </span>
              </div>
            </div>
          </div>

          {/* Danh sách câu hỏi theo Mục 6.2 */}
          {questions && questions.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff]">
              <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
                Danh sách câu hỏi phản biện ({questions.length})
              </span>
              <div className="flex flex-col gap-1.5">
                {questions.map((q, idx) => {
                  const isCurrent = idx === (currentQIdx - 1);
                  const k = idx + 1;
                  const n = questions.length;
                  const focusText = q.focus ? QUESTION_FOCUS_LABELS[q.focus] || q.focus : "";
                  const status = getQuestionStatusBadge(q, isCurrent);

                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!isSubmitting) {
                          onSelectQuestion?.(idx);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!isSubmitting) {
                            onSelectQuestion?.(idx);
                          }
                        }
                      }}
                      className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                        isCurrent
                          ? "bg-[#fff0e4] border-[#ff9640] ring-1 ring-[#ff9640]"
                          : "bg-white border-[#eaedff] hover:bg-[#f2f3ff]/60"
                      } ${isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap font-medium">
                        <span className="font-bold text-[#131b2e]">
                          Câu {k}/{n} · {q.skill} · {q.tier} · {focusText}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Text Card */}
          {!isQuestionDropped && (isLoadingQuestion || Boolean(question?.feynman_question)) && (
            <div
              className="bg-[#fff0e4]/60 border border-[#ff9640]/40 rounded-[12px] p-4 text-[#131b2e] font-semibold text-sm sm:text-base leading-relaxed relative overflow-hidden"
              data-node-id="5:196"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#ff9640]" />
              {isLoadingQuestion ? (
                <div className="flex items-center gap-2 py-3 text-sm text-[#944b00] font-medium">
                  <RefreshCw className="size-4 animate-spin" />
                  <span>AI đang chuẩn bị câu hỏi phản biện chuyên sâu...</span>
                </div>
              ) : (
                <p className="pl-2">{question?.feynman_question}</p>
              )}
            </div>
          )}
        </div>

        {/* Quota Exceeded Card (T25) */}
        {isQuotaExceeded && (
          <div className="bg-[#fff1f2] border border-[#fecdd3] p-3.5 rounded-[12px] flex items-start gap-2.5 text-xs text-[#9f1239]">
            <AlertCircle className="size-4 shrink-0 text-[#e11d48] mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-sm text-[#881337]">
                Hết hạn mức AI của phiên — không chấm được bài mới
              </span>
              <span className="leading-relaxed">
                Phiên học này đã dùng hết hạn mức AI. Ô nhập phản biện đã được
                khóa để tránh phát sinh chi phí, nhưng bạn vẫn có thể bấm nút{" "}
                <strong>&quot;Bỏ qua câu này&quot;</strong> bên dưới để xem đáp án tham
                khảo do AI viết.
              </span>
            </div>
          </div>
        )}

        {/* Thông báo câu DROPPED */}
        {isQuestionDropped && (
          <div className="bg-[#f3f4f6] border border-[#e5e7eb] rounded-[12px] p-4 flex items-center justify-between gap-3 text-xs text-[#374151]">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm">
                ⊘ AI không đặt được câu này — không tính
              </span>
            </div>
            {hasNextQuestion && onNextQuestion && (
              <button
                type="button"
                onClick={onNextQuestion}
                className="bg-[#00bc7d] hover:bg-[#009b67] text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                <span>Câu tiếp theo</span>
                <Send className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Revealed Reference Answer Block (UI-54) */}
        {!isQuestionDropped && isQuestionFinished && reveal && (
          <div className="bg-[#f0fdf4] border border-[#86efac] rounded-[12px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#166534] flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="size-3.5 text-[#00bc7d]" />
                Đáp án tham khảo do AI viết
              </span>

              {canReportWrong && onReportWrong ? (
                <button
                  type="button"
                  onClick={onReportWrong}
                  className="text-[11px] font-bold text-[#b91c1c] hover:text-[#991b1b] flex items-center gap-1 bg-white/80 hover:bg-white px-2 py-1 rounded-[6px] border border-[#fca5a5] transition-colors cursor-pointer"
                >
                  <Flag className="size-3" />
                  Báo sai kết quả chấm
                </button>
              ) : (isDisputed || question?.state?.disputed) ? (
                <span className="text-[11px] font-bold text-[#b91c1c] flex items-center gap-1 bg-white/80 px-2 py-1 rounded-[6px] border border-[#fca5a5]">
                  <Flag className="size-3 text-[#dc2626]" />
                  🚩 Đã báo sai
                </span>
              ) : null}
            </div>

            {/* Reference answer */}
            <div className="text-xs text-[#14532d] leading-relaxed bg-white/80 p-3 rounded-[8px] border border-[#bbf7d0]">
              <AiText text={reveal.reference_answer} />
            </div>

            {/* Must have points */}
            {reveal.must_have_points && reveal.must_have_points.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-bold text-[#166534]">Ý bắt buộc:</span>
                <div className="flex flex-col gap-1">
                  {reveal.must_have_points.map((point, idx) => {
                    const covered = pointsCovered ? pointsCovered[idx] : null;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-[#14532d]"
                      >
                        {covered === true ? (
                          <span className="text-[#16a34a] font-bold shrink-0">✓</span>
                        ) : covered === false ? (
                          <span className="text-[#dc2626] font-bold shrink-0">✗</span>
                        ) : (
                          <span className="text-[#9ca3af] shrink-0">•</span>
                        )}
                        <span>{point}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fix */}
            {reveal.fix && (
              <div className="text-xs text-[#166534] pt-1">
                <strong>Cách sửa:</strong> <AiText text={reveal.fix} />
              </div>
            )}

            {/* Skill change chip */}
            {skillChange && (
              <div className="mt-1 inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white border border-[#bbf7d0] text-xs font-semibold text-[#14532d]">
                <span className="font-mono">
                  {(isDisputed || question?.state?.disputed)
                    ? `Đã hoàn lại điểm ${skillChange.skill}: ${skillChange.p_before.toFixed(4)} → ${skillChange.p_after.toFixed(4)}`
                    : `${skillChange.skill}: ${skillChange.p_before.toFixed(4)} → ${skillChange.p_after.toFixed(4)}`}
                </span>
                {!(isDisputed || question?.state?.disputed) && (
                  <span className="text-[#64748b]">
                    ({tierOf(skillChange.p_before)} → {tierOf(skillChange.p_after)})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Khi câu disputed và có skillChange mà không có reveal */}
        {!isQuestionDropped && isQuestionFinished && !reveal && (isDisputed || question?.state?.disputed) && skillChange && (
          <div className="bg-[#f0fdf4] border border-[#86efac] rounded-[12px] p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-[#dc2626] flex items-center gap-1.5 uppercase tracking-wide">
              <Flag className="size-3.5 text-[#dc2626]" />
              🚩 Đã báo sai kết quả chấm
            </span>
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white border border-[#bbf7d0] text-xs font-semibold text-[#14532d]">
              <span className="font-mono">
                Đã hoàn lại điểm {skillChange.skill}: {skillChange.p_before.toFixed(4)} → {skillChange.p_after.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Khi câu xong: chỉ giữ hàng nút "Câu tiếp theo" */}
        {!isQuestionDropped && isQuestionFinished && hasNextQuestion && onNextQuestion && (
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={onNextQuestion}
              className="bg-[#00bc7d] hover:bg-[#009b67] text-white font-bold text-sm sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-[12px] drop-shadow-[0px_4px_5px_rgba(0,188,125,0.3)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Câu tiếp theo</span>
              <Send className="size-4 shrink-0" />
            </button>
          </div>
        )}

        {/* Answer Explanation Form - Chỉ hiện khi câu chưa xong và không bị DROPPED */}
        {!isQuestionDropped && !isQuestionFinished && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 w-full"
            data-node-id="5:201"
            data-name="Form"
          >
            {/* Label & Character Counter */}
            <div
              className="flex items-center justify-between w-full"
              data-node-id="5:202"
            >
              <label
                htmlFor="feynman-explanation"
                className="font-black text-[#554337] text-xs sm:text-[14px] tracking-[0.7px] uppercase select-none cursor-pointer flex items-center gap-2"
                data-node-id="5:204"
              >
                <span>LỜI GIẢI THÍCH CỦA BẠN</span>
                <span className="text-[11px] font-normal text-[#99a1af] lowercase">
                  (nhấn Ctrl+Enter để nộp)
                </span>
              </label>
              <span
                className={`font-semibold text-xs sm:text-[12px] ${
                  nonSpaceCharCount < CONFIG.ANSWER_MIN_CHARS
                    ? "text-[#99a1af]"
                    : totalCharCount > CONFIG.ANSWER_MAX_CHARS
                    ? "text-[#e7000b] font-bold"
                    : "text-[#625e56]"
                }`}
                data-node-id="5:206"
              >
                {nonSpaceCharCount}/{CONFIG.ANSWER_MAX_CHARS} ký tự (tối thiểu{" "}
                {CONFIG.ANSWER_MIN_CHARS})
              </span>
            </div>

            {/* Textarea */}
            <div
              className={`relative border rounded-[12px] bg-[#faf8ff] shadow-[inset_0px_2px_4px_1px_rgba(0,0,0,0.05)] focus-within:ring-2 transition-all overflow-hidden ${
                clientError || validationError
                  ? "border-[#ef4444] focus-within:border-[#ef4444] focus-within:ring-[#ef4444]/20"
                  : isDuplicateWarning
                  ? "border-[#f59e0b] focus-within:border-[#f59e0b] focus-within:ring-[#f59e0b]/20"
                  : "border-[#eaedff] focus-within:border-[#ff9640] focus-within:ring-[#ff9640]/20"
              }`}
              data-node-id="5:207"
              data-name="Textarea"
            >
              <textarea
                id="feynman-explanation"
                value={answer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || isQuotaExceeded}
                rows={5}
                maxLength={CONFIG.ANSWER_MAX_CHARS}
                placeholder={
                  isQuotaExceeded
                    ? "Hết hạn mức AI của phiên — không chấm được bài mới. Bấm 'Bỏ qua câu này' để học qua đáp án."
                    : "Dùng ngôn ngữ đời thường, hình tượng thực tế để giải thích cơ chế dòng code trên..."
                }
                className="w-full bg-transparent p-4 sm:p-5 text-[#131b2e] text-[15px] sm:text-[16px] leading-[26px] outline-none resize-none placeholder:text-[#99a1af] disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>

            {/* Duplicate warning inline card (similarity.ts UI-52) */}
            {isDuplicateWarning && !clientError && (
              <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-[#fffbeb] border border-[#f59e0b]/30 text-xs text-[#92400e]">
                <AlertTriangle className="size-4 shrink-0 text-[#f59e0b]" />
                <span>
                  Câu trả lời này có độ tương đồng{" "}
                  <strong>{(duplicateSimilarity * 100).toFixed(0)}%</strong> so
                  với lần nộp trước. Hãy bổ sung ý mới hoặc diễn giải sâu hơn để
                  tránh bị chặn nộp.
                </span>
              </div>
            )}

            {/* Error Message beneath textarea (spec/30_UI.md UI-52) */}
            {(clientError || validationError || errorMessage) && (
              <div className="flex flex-col items-start gap-1.5 px-1">
                <div className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{clientError || validationError || errorMessage}</span>
                </div>
                {onRetrySubmit && (
                  <button
                    type="button"
                    onClick={onRetrySubmit}
                    disabled={isSubmitting}
                    className="text-xs font-bold text-[#b91c1c] bg-[#fee2e2] hover:bg-[#fecaca] px-2.5 py-1 rounded-[6px] border border-[#fca5a5] transition-colors cursor-pointer"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            )}

            {/* Actions Bar */}
            <div
              className="flex items-center justify-between pt-2 w-full"
              data-node-id="5:210"
            >
              {/* Skip question button */}
              {onSkip ? (
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
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isDebouncing || isQuotaExceeded}
                  className="bg-[#ff9640] hover:bg-[#f2852e] active:bg-[#e6761c] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm sm:text-[15px] px-6 sm:px-7 py-3 sm:py-3.5 rounded-[12px] drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  data-node-id="5:211"
                  data-name="Button"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="size-4 animate-spin shrink-0" />
                      <span>Đang chấm…</span>
                    </>
                  ) : isDebouncing ? (
                    <>
                      <Clock className="size-4 animate-spin shrink-0" />
                      <span>Vui lòng chờ...</span>
                    </>
                  ) : (
                    <>
                      <span>Nộp Bài Chấm Điểm</span>
                      <Send className="size-4 shrink-0" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* RunSummary: Mọi câu đã xong (mỗi câu finished hoặc DROPPED) và có nodeState */}
        {allQuestionsFinished && nodeState && (
          <RunSummary
            questions={questions.map((q) => q.state)}
            status={nodeState.status}
            unlockedNodeIds={unlockedNodeIds || []}
          />
        )}
      </div>
    </div>
  );
}
