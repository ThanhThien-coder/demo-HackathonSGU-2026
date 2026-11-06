"use client";

import React from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Flag,
  Lightbulb,
} from "lucide-react";
import type { EvaluateFeynmanResponse } from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { tierOf } from "@/lib/bkt-engine";
import { isOfflineMode } from "@/lib/offline";
import { followUpStep } from "./question-list";
import { AiText } from "./XRayPanel";

interface SubmitEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation?: EvaluateFeynmanResponse | null;
  userAnswer?: string;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  onOpenReportWrong?: () => void;
  onOpenHintStep?: (step: number) => void;
}

export function SubmitEvaluationDialog({
  isOpen,
  onClose,
  evaluation,
  userAnswer = "",
  onNextQuestion,
  hasNextQuestion = false,
  onOpenReportWrong,
  onOpenHintStep,
}: SubmitEvaluationDialogProps) {
  if (!evaluation) return null;

  const hintStep = followUpStep(evaluation.follow_up);

  const isPassed = evaluation.is_passed;
  const accuracyPercent = Math.round(evaluation.core_accuracy);
  const simplicityPercent = Math.round(evaluation.simplicity);
  const skillChange = evaluation.skill_change;

  const canReportWrong =
    evaluation.question?.outcome === "FAILED" &&
    evaluation.question?.ended_by === "ANSWER" &&
    !evaluation.question?.disputed &&
    !isOfflineMode();

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
          className={`rounded-[14px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
            isPassed
              ? "bg-gradient-to-br from-[#fff0e4] to-[#ffedd4] border-[#ff9640]/40"
              : "bg-gradient-to-br from-[#fef2f2] to-[#fee2e2] border-[#f87171]/40"
          }`}
        >
          <div className="flex flex-col gap-1 w-full sm:w-auto">
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
            {evaluation.feedback && (
              <p className="text-xs text-[#625e56] max-w-[500px]">
                {evaluation.feedback}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span
                className={`text-3xl font-black ${
                  isPassed ? "text-[#944b00]" : "text-[#dc2626]"
                }`}
              >
                {accuracyPercent}%
              </span>
            </div>
            {skillChange && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#e5e7eb] text-xs font-semibold text-[#131b2e]">
                <span className="font-mono">
                  {skillChange.skill}: {skillChange.p_before.toFixed(4)} → {skillChange.p_after.toFixed(4)}
                </span>
                <span className="text-[#64748b]">
                  ({tierOf(skillChange.p_before)} → {tierOf(skillChange.p_after)})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Answer snippet */}
        {userAnswer && (
          <div className="bg-[#faf8ff] border border-[#eaedff] p-3 rounded-[8px] text-xs flex flex-col gap-1">
            <span className="font-bold text-[#554337] uppercase tracking-wider text-[11px]">
              Câu trả lời của bạn:
            </span>
            <p className="text-[#131b2e] italic">&quot;{userAnswer}&quot;</p>
          </div>
        )}

        {/* Detailed Breakdown */}
        <div className="flex flex-col gap-3">
          {/* Core Accuracy with threshold line */}
          <div className="p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#131b2e]">
                Độ chính xác cốt lõi (Core Accuracy)
              </span>
              <span className="font-bold text-[#131b2e]">{accuracyPercent}%</span>
            </div>
            <div className="relative w-full h-3 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPassed ? "bg-[#10b981]" : "bg-[#ef4444]"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, accuracyPercent))}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10"
                style={{ left: `${CONFIG.PASS_CORE_ACCURACY}%` }}
                title={`Vạch đạt: ${CONFIG.PASS_CORE_ACCURACY}%`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#64748b]">
              <span>0%</span>
              <span>Vạch đạt: {CONFIG.PASS_CORE_ACCURACY}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Simplicity (nhỏ, không ảnh hưởng Đạt) */}
          <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#faf8ff] border border-[#eaedff] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#64748b]">Độ bình dân hóa:</span>
              <span className="font-semibold text-[#131b2e]">{simplicityPercent}%</span>
            </div>
            <span className="text-[11px] text-[#94a3b8] italic">không ảnh hưởng Đạt</span>
          </div>

          {/* Points Covered */}
          {evaluation.points_covered && evaluation.points_covered.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-[8px] bg-[#faf8ff] border border-[#eaedff] text-xs">
              <span className="font-semibold text-[#554337]">Ý bắt buộc:</span>
              <span className="font-mono text-sm tracking-widest text-[#131b2e]">
                {evaluation.points_covered.map((covered) => (covered ? "●" : "○")).join(" ")}
              </span>
              <span className="text-[10px] text-[#94a3b8]">(● có, ○ thiếu)</span>
            </div>
          )}

          {/* Detected Jargons chip list */}
          {evaluation.detected_jargons && evaluation.detected_jargons.length > 0 && (
            <div className="p-3 rounded-[8px] bg-[#fff7ed] border border-[#fed7aa] flex flex-col gap-1.5">
              <div className="text-xs font-bold text-[#c2410c] flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                <span>Thuật ngữ kỹ thuật bị phát hiện:</span>
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

          {/* Follow-up Suggestion (thẻ tím Gợi ý) */}
          {evaluation.follow_up && !isPassed && (
            <div className="p-3.5 rounded-[10px] bg-[#f5f3ff] border border-[#ddd6fe] flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#6d28d9]">
                <Lightbulb className="size-4 text-[#7c3aed]" />
                <span>Gợi ý</span>
              </div>
              <p className="text-[#5b21b6] leading-relaxed pl-5 font-medium">
                <AiText text={evaluation.follow_up.question} />
              </p>
              {hintStep !== null && (
                <button
                  type="button"
                  onClick={() => onOpenHintStep?.(hintStep)}
                  className="ml-5 self-start text-[11px] font-bold text-[#6d28d9] bg-white hover:bg-[#ede9fe] border border-[#c4b5fd] px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer"
                >
                  Mở Bước {hintStep} trong tour
                </button>
              )}
            </div>
          )}

          {/* Intent messages */}
          {evaluation.intent === "OFF_TOPIC" && !evaluation.follow_up && (
            <div className="p-3 rounded-[10px] bg-[#fff1f2] border border-[#fecdd3] text-xs text-[#9f1239]">
              Câu trả lời bị coi là lạc đề — mất 1 lượt, không có gợi ý.
            </div>
          )}
          {evaluation.intent === "GIVE_UP" && (
            <div className="p-3 rounded-[10px] bg-[#fff1f2] border border-[#fecdd3] text-xs text-[#9f1239]">
              Đã tính 1 lượt chưa đạt.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#f3f4f6]">
          {/* Dispute Button */}
          {canReportWrong && onOpenReportWrong ? (
            <button
              type="button"
              onClick={onOpenReportWrong}
              className="text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] flex items-center gap-1.5 py-1 px-2 rounded hover:bg-red-50 transition-colors cursor-pointer"
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
            ) : evaluation.question?.finished ? (
              <Link
                href="/report"
                className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#8b4600] hover:bg-[#944b00] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Xem Báo Cáo Phiên Học</span>
                <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
