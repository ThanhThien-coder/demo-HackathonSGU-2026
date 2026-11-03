"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Copy, Check, FileCode } from "lucide-react";
import { FULL_FILE_CODE } from "@/components/learn/mockData";

interface FullFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  codeContent?: string;
}

export function FullFileModal({
  isOpen,
  onClose,
  fileName = "order.service.ts",
  codeContent = FULL_FILE_CODE,
}: FullFileModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2">
          <FileCode className="size-5 text-[#004cff]" />
          <span className="font-mono text-base font-bold text-[#131b2e]">{fileName}</span>
        </div>
      }
      description="Toàn bộ mã nguồn file theo kiến trúc dịch vụ của repository shop-vibecode"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3">
          <span className="text-xs text-[#625e56]">TypeScript / NestJS Service</span>
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#131b2e] bg-[#f2f3ff] hover:bg-[#eaedff] px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-[#00bc7d]" />
                <span className="text-[#00bc7d]">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-[#554337]" />
                <span>Sao chép toàn bộ</span>
              </>
            )}
          </button>
        </div>

        {/* Code display */}
        <div className="max-h-[55vh] overflow-y-auto rounded-[10px] bg-[#faf8ff] border border-[#eaedff] p-4 font-mono text-xs leading-relaxed text-[#131b2e]">
          <pre className="whitespace-pre overflow-x-auto">
            {codeContent}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold text-sm rounded-[8px] transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </Dialog>
  );
}
