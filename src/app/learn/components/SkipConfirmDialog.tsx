"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { AlertCircle, Eye } from "lucide-react";

interface SkipConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skillName?: string;
  isSubmitting?: boolean;
}

export function SkipConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  skillName = "kỹ năng hiện tại",
  isSubmitting = false,
}: SkipConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#131b2e]">Bỏ Qua Câu Hỏi & Xem Đáp Án Mẫu</h3>
          </div>
        </div>
      }
      description="Quy tắc sư phạm Feynman (D-15): Câu hỏi này sẽ bị tính kết quả Chưa Đạt"
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="bg-[#fff7ed] border border-[#fed7aa] p-3.5 rounded-[10px] text-xs leading-relaxed text-[#7c2d12]">
          Câu này sẽ tính là CHƯA ĐẠT cho {skillName} và hiện đáp án.
        </div>

        <p className="text-xs text-[#625e56]">
          Bạn có chắc chắn muốn bỏ qua câu hỏi này để xem phân tích và chuyển sang câu tiếp theo không?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold text-xs rounded-[8px] transition-colors cursor-pointer"
          >
            Quay lại làm bài
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-bold text-xs rounded-[8px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
          >
            <Eye className="size-3.5" />
            <span>{isSubmitting ? "Đang mở đáp án..." : "Xác nhận bỏ qua"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
