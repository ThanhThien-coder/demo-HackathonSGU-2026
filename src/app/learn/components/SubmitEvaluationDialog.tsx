"use client";

import React from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Flag,
  Lightbulb,
  Check,
  X,
} from "lucide-react";
import type { EvaluateFeynmanResponse } from "@/contracts";

interface SubmitEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation?: EvaluateFeynmanResponse | null;
  userAnswer?: string;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  onOpenReportWrong?: () => void;
}

export function SubmitEvaluationDialog({
  isOpen,
  onClose,
  evaluation,
  userAnswer = "",
  onNextQuestion,
  hasNextQuestion = false,
  onOpenReportWrong,
}: SubmitEvaluationDialogProps) {
  if (!evaluation) return null;

  const isPassed = evaluation.is_passed;
  const accuracyPercent = Math.round(evaluation.core_accuracy * 100);
  const simplicityPercent = Math.round(evaluation.simplicity * 100);

  const skillChange = evaluation.skill_change;
  const pDelta = skillChange ? (skillChange.p_after - skillChange.p_before).toFixed(4) : null;
  const isPositiveDelta = skillChange ? skillChange.p_after >= skillChange.p_before : true;

  const reveal = evaluation.question?.reveal;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <div
            className={`size-8 rounded-full flex items-center justify-center ${
              isPassed ? "bg-[#00bc7d]/15 text-[#00bc7d]" : "bg-[#ef4444]/15 text-[#ef4444]"
            }`}
          >
            {isPassed ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">Đánh Giá Năng Lực Bayesian (BKT)</h3>
          </div>
        </div>
      }
      description="SimpliFey đã phân tích lời giải thích theo phương pháp Feynman của bạn"
    >
      <div className="flex flex-col gap-4 pt-2">
        {/* Score banner */}
        <div
          className={`rounded-[14px] p-4 flex items-center justify-between border ${
            isPassed
              ? "bg-gradient-to-br from-[#fff0e4] to-[#ffedd4] border-[#ff9640]/40"
              : "bg-gradient-to-br from-[#fef2f2] to-[#fee2e2] border-[#f87171]/40"
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant={isPassed ? "success" : "danger"} size="sm">
                {isPassed ? "ĐẠT CHUẨN FEYNMAN" : "CẦN HOÀN THIỆN THÊM"}
              </Badge>
              {skillChange && (
                <span className="text-xs text-[#944b00] font-bold font-mono">
                  {skillChange.skill}
                </span>
              )}
            </div>
            <h4 className="text-base font-extrabold text-[#131b2e]">
              {isPassed
                ? "Nắm vững bản chất kiến trúc!"
                : "Phản ánh trực quan chưa đủ độ bao phủ"}
            </h4>
            <p className="text-xs text-[#625e56] max-w-[500px]">
              {evaluation.feedback ||
                (isPassed
                  ? "Phép ẩn dụ trực quan phản ánh chính xác cơ chế xử lý của hệ thống."
                  : "Cần diễn giải sát hơn với luồng thực thi và tránh các thuật ngữ trừu tượng.")}
            </p>
          </div>

          <div className="text-right shrink-0 pl-3">
            <div className="flex items-baseline gap-1 justify-end">
              <span
                className={`text-3xl font-black ${
                  isPassed ? "text-[#944b00]" : "text-[#dc2626]"
                }`}
              >
                {evaluation.core_accuracy.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#625e56]">/ 1.0</span>
            </div>
            {skillChange && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                  isPositiveDelta ? "text-[#00bc7d]" : "text-[#dc2626]"
                }`}
              >
                {isPositiveDelta ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {isPositiveDelta ? `+${pDelta}` : pDelta} p_know
              </span>
            )}
          </div>
        </div>

        {/* User Answer snippet */}
        {userAnswer && (
          <div className="bg-[#faf8ff] border border-[#eaedff] p-3 rounded-[8px] text-xs flex flex-col gap-1">
            <span className="font-bold text-[#554337] uppercase tracking-wider text-[11px]">Câu trả lời của bạn:</span>
            <p className="text-[#131b2e] italic">&quot;{userAnswer}&quot;</p>
          </div>
        )}

        {/* Detailed Breakdown */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#554337] uppercase tracking-wider">
            <span>Tiêu chí đánh giá</span>
            <span>Kết quả</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#ff9640]" />
              <span className="text-xs font-semibold text-[#131b2e]">
                Độ chính xác cốt lõi (Core Accuracy)
              </span>
            </div>
            <span className="text-xs font-bold text-[#131b2e]">{accuracyPercent}%</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#ff9640]" />
              <span className="text-xs font-semibold text-[#131b2e]">
                Độ bình dân hóa (Simplicity & Intuition)
              </span>
            </div>
            <span className="text-xs font-bold text-[#00bc7d]">{simplicityPercent}%</span>
          </div>

          {/* Detected Jargons chip list */}
          {evaluation.detected_jargons && evaluation.detected_jargons.length > 0 && (
            <div className="p-3 rounded-[8px] bg-[#fff7ed] border border-[#fed7aa] flex flex-col gap-1.5">
              <div className="text-xs font-bold text-[#c2410c] flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                <span>Thuật ngữ kỹ thuật bị phát hiện (tránh dùng từ ngữ đao to búa lớn):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.detected_jargons.map((jargon, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-semibold bg-white text-[#9a3412] px-2 py-0.5 rounded border border-[#fed7aa]"
                  >
                    {jargon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Suggestion (if failed) */}
          {evaluation.follow_up && !isPassed && (
            <div className="p-3.5 rounded-[10px] bg-[#f5f3ff] border border-[#ddd6fe] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#6d28d9]">
                <Lightbulb className="size-4 text-[#7c3aed]" />
                <span>Gợi ý sư phạm tiếp theo:</span>
              </div>
              <p className="text-xs text-[#5b21b6] leading-relaxed pl-5 font-medium">
                {evaluation.follow_up.question}
              </p>
              {evaluation.follow_up.step_index !== null && (
                <span className="text-[11px] font-bold text-[#7c3aed] pl-5">
                  👉 Xem lại dòng code tại Bước {evaluation.follow_up.step_index}
                </span>
              )}
            </div>
          )}

          {/* Question Reveal Panel (if question finished) */}
          {reveal && (
            <div className="p-3.5 rounded-[10px] bg-[#f0fdf4] border border-[#bbf7d0] flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#166534]">
                <Sparkles className="size-4 text-[#16a34a]" />
                <span>Đáp án tham khảo do AI viết:</span>
              </div>
              <p className="text-xs text-[#14532d] leading-relaxed bg-white/70 p-2.5 rounded border border-[#bbf7d0]">
                {reveal.reference_answer}
              </p>
              {reveal.must_have_points && reveal.must_have_points.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[11px] font-bold text-[#166534]">Ý bắt buộc cần có:</span>
                  {reveal.must_have_points.map((point, idx) => {
                    const covered = evaluation.points_covered?.[idx];
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#14532d]">
                        {covered ? (
                          <Check className="size-3.5 text-[#16a34a] shrink-0" />
                        ) : (
                          <X className="size-3.5 text-[#dc2626] shrink-0" />
                        )}
                        <span>{point}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#f3f4f6]">
          {/* Dispute Button (if failed) */}
          {!isPassed && onOpenReportWrong ? (
            <button
              type="button"
              onClick={onOpenReportWrong}
              className="text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] flex items-center gap-1.5 py-1 px-2 rounded hover:bg-red-50 transition-colors"
            >
              <Flag className="size-3.5" />
              <span>Báo sai kết quả chấm</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] text-xs font-bold text-[#554337] bg-[#f2f3ff] hover:bg-[#eaedff] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              {isPassed ? "Xem lại" : "Luyện tập tiếp"}
            </button>

            {hasNextQuestion && onNextQuestion ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNextQuestion();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#ff9640] hover:bg-[#e07f2e] drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <Link
                href="/report"
                className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#8b4600] hover:bg-[#944b00] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Xem Báo Cáo Phiên Học</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
