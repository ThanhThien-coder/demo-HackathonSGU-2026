"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { conceptCardOf } from "@/lib/concept-cards";
import { AiText } from "./XRayPanel";
import { popoverPosition, shouldClosePopoverOnKey } from "./concept-popover";

export interface ConceptPopoverProps {
  /** Mã kỹ năng (SWE_SKILLS) */
  skill: string;
  /** `skills[i].reason` — "Trong repo này (AI)". Rỗng ⇒ ẩn khối. */
  reason?: string | null;
  /** Chip đã bấm: thẻ đặt cạnh chip, đóng thì trả focus về chip. */
  anchor: HTMLElement;
  onClose: () => void;
  /** Có ⇒ hiện nút "Xem dòng". */
  onSeeLine?: () => void;
}

/**
 * Thẻ khái niệm (UI-43, D13): tên, mã kỹ năng, "Là gì", "Ví dụ đời thường",
 * "Vì sao quan trọng", "Trong repo này (AI)". 0 token, 0 request.
 * ✕ / Esc / bấm ngoài / cuộn ⇒ đóng, trả focus về chip.
 */
export function ConceptPopover({
  skill,
  reason,
  anchor,
  onClose,
  onSeeLine,
}: ConceptPopoverProps) {
  const card = conceptCardOf(skill);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  const close = React.useCallback(
    (refocus: boolean) => {
      onClose();
      if (refocus && document.body.contains(anchor)) {
        anchor.focus({ preventScroll: true });
      }
    },
    [onClose, anchor]
  );

  // Đặt vị trí cạnh chip rồi chuyển focus vào thẻ
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    setPos(
      popoverPosition(
        { left: r.left, top: r.top, bottom: r.bottom },
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight }
      )
    );
    el.focus({ preventScroll: true });
  }, [anchor, skill]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldClosePopoverOnKey(e.key)) {
        e.preventDefault();
        close(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      // Bấm lại chip: để chip tự đóng/mở, không đóng ở đây
      if (anchor.contains(t)) return;
      close(true);
    };
    const onScroll = (e: Event) => {
      // Cuộn bên trong thẻ không tính
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      close(true);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [close, anchor]);

  if (!card) return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`Thẻ khái niệm: ${card.title}`}
      tabIndex={-1}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 60 }}
      className="w-[320px] max-w-[calc(100vw-24px)] bg-white border border-[#eaedff] rounded-xl shadow-lg p-4 text-xs text-[#131b2e] outline-none"
    >
      <button
        type="button"
        onClick={() => close(true)}
        aria-label="Đóng thẻ khái niệm"
        className="absolute top-2 right-2 p-1 rounded hover:bg-[#f2f3ff] text-[#554337] cursor-pointer"
      >
        <X className="size-3.5" />
      </button>

      <h3 className="font-bold text-sm pr-6 leading-snug">
        {card.title}{" "}
        <code className="font-mono bg-[#eaedff]/70 text-[#004cff] px-1 py-0.5 rounded text-[10px]">
          {skill}
        </code>
      </h3>

      <dl className="mt-3 flex flex-col gap-2">
        <div>
          <dt className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
            Là gì
          </dt>
          <dd className="leading-relaxed">
            <AiText text={card.what} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
            Ví dụ đời thường
          </dt>
          <dd className="leading-relaxed">
            <AiText text={card.example} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
            Vì sao quan trọng
          </dt>
          <dd className="leading-relaxed">
            <AiText text={card.why} />
          </dd>
        </div>
      </dl>

      {(reason || onSeeLine) && (
        <div className="mt-3 pt-3 border-t border-[#eaedff] flex flex-col gap-2">
          {reason && (
            <p className="leading-relaxed">
              <b>Trong repo này (AI):</b> <AiText text={reason} />
            </p>
          )}
          {onSeeLine && (
            <button
              type="button"
              onClick={() => {
                onSeeLine();
                close(true);
              }}
              className="self-start px-3 py-1.5 rounded-lg bg-[#ff9640] hover:bg-[#e07f2e] text-white font-bold cursor-pointer transition-colors"
            >
              Xem dòng
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
