"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Flag, Send, AlertTriangle } from "lucide-react";
import { CONFIG } from "@/contracts";

interface ReportWrongDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function ReportWrongDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: ReportWrongDialogProps) {
  const [note, setNote] = useState("");
  const maxChars = CONFIG.REPORT_NOTE_MAX_CHARS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;
    onSubmit(note.trim());
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
            <Flag className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#131b2e]">Báo Sai Kết Quả Chấm Của AI (D-22)</h3>
          </div>
        </div>
      }
      description="Khiếu nại kết quả đánh giá nếu bạn nhận định AI chấm sai hoặc hiểu nhầm câu chữ"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-3 rounded-[10px] text-xs text-[#166534] leading-relaxed">
          💡 Khi khiếu nại được ghi nhận, điểm kỹ năng BKT của bạn sẽ được <strong>hoàn lại ngay lập tức</strong> về trạng thái trước lần chấm này.
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-[#fff0f0] border border-[#ffd2d2] text-xs text-[#c50000] flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#554337]">
            <label htmlFor="report-reason">Lý do khiếu nại (tối đa {maxChars} ký tự):</label>
            <span className={note.length > maxChars ? "text-red-500 font-bold" : "text-gray-500"}>
              {note.length}/{maxChars}
            </span>
          </div>

          <textarea
            id="report-reason"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, maxChars))}
            rows={4}
            required
            placeholder="Nêu rõ điểm nào trong câu trả lời của bạn bị AI đánh giá chưa chuẩn xác..."
            className="w-full rounded-[10px] border border-[#eaedff] bg-[#faf8ff] p-3 text-xs text-[#131b2e] outline-none focus:border-[#ff9640] focus:ring-1 focus:ring-[#ff9640]/20 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold text-xs rounded-[8px] transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !note.trim() || note.length > maxChars}
            className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] disabled:opacity-50 text-white font-bold text-xs rounded-[8px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="size-3.5" />
            <span>{isSubmitting ? "Đang gửi báo sai..." : "Gửi báo sai"}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
