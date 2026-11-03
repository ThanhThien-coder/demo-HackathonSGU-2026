"use client";

import React from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, TrendingUp, Sparkles, ArrowRight, RotateCcw } from "lucide-react";

interface SubmitEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userAnswer: string;
}

export function SubmitEvaluationDialog({
  isOpen,
  onClose,
}: SubmitEvaluationDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-[#00bc7d]/15 flex items-center justify-center text-[#00bc7d]">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">Đánh Giá Năng Lực Bayesian (BKT)</h3>
          </div>
        </div>
      }
      description="SimpliFey đã phân tích lời giải thích theo phương pháp Feynman của bạn"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* Score banner */}
        <div className="rounded-[14px] bg-gradient-to-br from-[#fff0e4] to-[#ffedd4] border border-[#ff9640]/40 p-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                ĐẠT CHUẨN FEYNMAN
              </Badge>
              <span className="text-xs text-[#944b00] font-bold">KC-204</span>
            </div>
            <h4 className="text-base font-extrabold text-[#131b2e]">
              Nắm vững bản chất N+1 Loop Mutation!
            </h4>
            <p className="text-xs text-[#625e56]">
              Phép ẩn dụ bồi bàn chạy nhiều chuyến trong quán ăn phản ánh trực quan 100% cơ chế I/O bottleneck.
            </p>
          </div>

          <div className="text-right shrink-0 pl-3">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-3xl font-black text-[#944b00]">0.89</span>
              <span className="text-xs font-semibold text-[#625e56]">/ 1.0</span>
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#00bc7d]">
              <TrendingUp className="size-3.5" />
              +0.14 p_know
            </span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#554337] uppercase tracking-wider">
            <span>Tiêu chí đánh giá</span>
            <span>Kết quả</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#ff9640]" />
              <span className="text-xs font-semibold text-[#131b2e]">Độ bình dân hóa (Intuition Metaphor)</span>
            </div>
            <span className="text-xs font-bold text-[#00bc7d]">9.5 / 10</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#ff9640]" />
              <span className="text-xs font-semibold text-[#131b2e]">Độ chính xác kiến trúc hệ thống</span>
            </div>
            <span className="text-xs font-bold text-[#00bc7d]">9.0 / 10</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#faf8ff] border border-[#eaedff]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#ff9640]" />
              <span className="text-xs font-semibold text-[#131b2e]">Thời gian phản hồi suy nghĩ</span>
            </div>
            <span className="text-xs font-semibold text-[#625e56]">45 giây</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[10px] text-xs font-bold text-[#554337] bg-[#f2f3ff] hover:bg-[#eaedff] flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Luyện tập tiếp
          </button>

          <Link
            href="/report"
            className="w-full sm:w-auto px-5 py-2.5 rounded-[10px] text-xs font-bold text-white bg-[#8b4600] hover:bg-[#944b00] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)] flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Xem Báo Cáo Phiên Học</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
