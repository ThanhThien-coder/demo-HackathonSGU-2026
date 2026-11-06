"use client";

// Gắn vào khung code khi D11 (Thiện) có onSelect: const [sel, setSel] = useState(null); onSelect={setSel}; <SelectionPopover node={node} selection={sel} onClose={() => setSel(null)} />.

import React, { useState, useEffect, useRef } from "react";
import type {
  HybridArchitecturalNode,
  ExplainSelectionRequest,
  ExplainSelectionResponse,
  ErrorCode,
} from "@/contracts";
import { useWorkbenchStore } from "@/store/workbench";
import {
  explanationKey,
  explainButtonState,
  shortSelection,
} from "@/lib/selection-explain";
import { overviewNodeTitle } from "@/lib/overview-view";
import { SKILL_METADATA } from "@/app/report/components/RadarChart"; // tạm; D13 có CONCEPT_CARDS thì đổi
import { AiText } from "@/app/learn/components/XRayPanel";

export interface SelectionPopoverProps {
  node: HybridArchitecturalNode;
  selection: {
    step_number: number;
    range: ExplainSelectionRequest["range"];
    selected_text: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null;
  onClose: () => void;
}

export function SelectionPopover({
  node,
  selection,
  onClose,
}: SelectionPopoverProps) {
  const is_offline_mode = useWorkbenchStore((s) => s.is_offline_mode);
  const limitError = useWorkbenchStore((s) => s.ui.errors["explain_limit"]);
  const explanations = useWorkbenchStore((s) => s.ui.explanations);
  const result = useWorkbenchStore((s) => s.result);
  const overview = useWorkbenchStore((s) => s.overview);
  const progress = useWorkbenchStore((s) => s.progress);
  const explainSelection = useWorkbenchStore((s) => s.explainSelection);
  const openNode = useWorkbenchStore((s) => s.openNode);
  const setActiveStep = useWorkbenchStore((s) => s.setActiveStep);

  const [isRequested, setIsRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [freshData, setFreshData] = useState<ExplainSelectionResponse | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const key = selection
    ? explanationKey(node.id, selection.step_number, selection.range)
    : "";
  const cached = selection ? explanations[key] : undefined;

  // Reset trạng thái cục bộ khi đổi selection
  useEffect(() => {
    setIsRequested(false);
    setLoading(false);
    setErrorMsg(null);
    setErrorCode(null);
    setFreshData(null);
  }, [key]);

  // Lưu focus trước khi mở và trả focus khi đóng
  useEffect(() => {
    if (typeof document !== "undefined") {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, []);

  // Xử lý phím Esc và bấm ra ngoài popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (popoverRef.current) {
        if (!popoverRef.current.contains(target)) {
          onClose();
        }
      } else if (triggerBtnRef.current) {
        if (!triggerBtnRef.current.contains(target)) {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!selection) {
    return null;
  }

  const showPopover = Boolean(cached) || isRequested;

  const fetchExplanation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorCode(null);
    const res = await explainSelection(
      node.id,
      selection.step_number,
      selection.range,
      selection.selected_text
    );
    setLoading(false);
    if (res.ok) {
      setFreshData(res.data);
    } else {
      setErrorMsg(res.message);
      setErrorCode(res.code);
    }
  };

  const handleExplainClick = async () => {
    setIsRequested(true);
    await fetchExplanation();
  };

  // Tính tọa độ vị trí popover an toàn trong viewport
  const topPos =
    typeof window !== "undefined" &&
    selection.rect.bottom + 320 > window.innerHeight
      ? Math.max(8, selection.rect.top - 320)
      : selection.rect.bottom + 6;
  const leftPos =
    typeof window !== "undefined"
      ? Math.max(12, Math.min(selection.rect.left, window.innerWidth - 396))
      : selection.rect.left;

  // Nếu chưa mở popover và chưa có bộ nhớ cache: hiển thị nút "Giải thích"
  if (!showPopover) {
    const btnState = explainButtonState(
      selection.selected_text,
      is_offline_mode
    );

    if (!btnState.visible) {
      return null;
    }

    const isButtonDisabled = btnState.disabled || Boolean(limitError);
    const tooltip = limitError || btnState.tooltip || undefined;

    return (
      <button
        ref={triggerBtnRef}
        type="button"
        title={tooltip}
        disabled={isButtonDisabled}
        onClick={handleExplainClick}
        style={{
          position: "fixed",
          top: `${selection.rect.bottom + 4}px`,
          left: `${selection.rect.left}px`,
          zIndex: 50,
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full shadow-lg border border-[#eaedff] bg-white text-[#004cff] hover:bg-[#f2f3ff] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        <span>Giải thích</span>
      </button>
    );
  }

  // Hiển thị Popover
  const data = cached ?? freshData;
  const explanation = data?.explanation;
  const references = data?.references ?? [];

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Giải thích đoạn chọn"
      style={{
        position: "fixed",
        top: `${topPos}px`,
        left: `${leftPos}px`,
        zIndex: 50,
      }}
      className="bg-white/90 backdrop-blur-md border border-[#eaedff] rounded-xl shadow-2xl p-4 w-[380px] max-w-[calc(100vw-24px)] max-h-[80vh] overflow-y-auto text-[#131b2e] text-xs sm:text-sm"
    >
      {/* Thanh tiêu đề và nút đóng */}
      <div className="flex items-center justify-between gap-2 border-b border-[#eaedff] pb-2">
        <h3
          className="font-mono font-bold text-sm text-[#131b2e] truncate"
          title={selection.selected_text}
        >
          {shortSelection(selection.selected_text)}
        </h3>
        <button
          type="button"
          aria-label="Đóng giải thích"
          onClick={onClose}
          className="text-[#625e56] hover:text-[#131b2e] p-1 rounded-md transition-colors font-bold cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Nhãn AI giải thích */}
      <div className="text-[11px] text-[#625e56] mt-1 mb-2 italic">
        AI giải thích — có thể chưa chính xác
      </div>

      {/* Nội dung popover: Đang chờ, Lỗi, hoặc Kết quả */}
      {loading ? (
        <div className="py-6 text-center text-xs text-[#554337] animate-pulse">
          Đang giải thích…
        </div>
      ) : errorMsg ? (
        <div className="py-3 text-xs text-[#e7000b] space-y-2">
          <p>{errorMsg}</p>
          {errorCode === "ERR_AI_UNAVAILABLE" && (
            <button
              type="button"
              onClick={fetchExplanation}
              className="mt-1 inline-flex items-center px-3 py-1 text-xs font-semibold rounded-md bg-[#004cff] text-white hover:bg-[#003cd0] transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          )}
        </div>
      ) : explanation === null ? (
        <div className="py-4 text-xs text-[#554337]">
          Chưa giải thích được đoạn này.
        </div>
      ) : explanation ? (
        <div className="space-y-2.5 pt-1">
          {/* Là gì */}
          <div>
            <div className="text-[11px] font-bold text-[#131b2e] uppercase tracking-wider">
              Là gì
            </div>
            <p className="text-xs text-[#554337] mt-0.5 leading-relaxed">
              <AiText text={explanation.what} />
            </p>
          </div>

          {/* Ở đây */}
          <div>
            <div className="text-[11px] font-bold text-[#131b2e] uppercase tracking-wider">
              Ở đây
            </div>
            <p className="text-xs text-[#554337] mt-0.5 leading-relaxed">
              <AiText text={explanation.here} />
            </p>
          </div>

          {/* Ví dụ đời thường (rỗng => ẩn) */}
          {explanation.analogy && explanation.analogy.trim().length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#131b2e] uppercase tracking-wider">
                Ví dụ đời thường
              </div>
              <p className="text-xs text-[#554337] mt-0.5 leading-relaxed">
                <AiText text={explanation.analogy} />
              </p>
            </div>
          )}

          {/* Kỹ năng */}
          {explanation.skill && (
            <div className="pt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#625e56]">
                Kỹ năng:
              </span>
              {/* TODO D13: mở ConceptPopover */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#eaedff] text-[#004cff] border border-[#d8e0ff]">
                {SKILL_METADATA[explanation.skill]?.label ?? explanation.skill}
              </span>
            </div>
          )}

          {/* Còn dùng ở (references) */}
          {references.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-[#eaedff]">
              <div className="text-[11px] font-bold text-[#131b2e] uppercase tracking-wider mb-1.5">
                Còn dùng ở
              </div>
              <div className="flex flex-wrap gap-1.5">
                {references.map((ref, idx) => {
                  const isLocked =
                    progress?.nodes?.[ref.node_id]?.status === "LOCKED";
                  const nodeTitle = overviewNodeTitle(
                    result,
                    overview,
                    ref.node_id
                  );
                  const label = `${ref.name} · ${nodeTitle} · Bước ${ref.step_number}`;

                  return (
                    <button
                      key={`${ref.node_id}:${ref.step_number}:${idx}`}
                      type="button"
                      disabled={isLocked}
                      title={isLocked ? "Bài này chưa được mở khóa" : label}
                      onClick={async () => {
                        if (isLocked) return;
                        await openNode(ref.node_id);
                        setActiveStep(ref.step_number);
                        onClose();
                      }}
                      className={`inline-flex items-center text-[11px] px-2 py-1 rounded-md border text-left transition-colors ${
                        isLocked
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-[#f2f3ff] text-[#004cff] border-[#eaedff] hover:bg-[#e4e7ff] hover:border-[#004cff]/30 cursor-pointer"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
