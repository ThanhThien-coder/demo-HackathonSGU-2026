"use client";
// Thanh kéo đổi tỉ lệ giữa các khung (kiểu VS Code). Kéo chuột / chạm; bàn phím ← → (↑ ↓) đổi 2%; bấm đúp ⇒ đặt lại.
import { useRef } from "react";
import { cn } from "@/components/ui/common";
import { useLayout } from "./layout";

export function Splitter({ orientation, label, onMove, onStep, onReset, className }: {
  orientation: "vertical" | "horizontal";   // vertical = thanh dọc chia 2 cột trái/phải
  label: string;
  onMove: (clientX: number, clientY: number) => void;
  onStep: (delta: number) => void;
  onReset: () => void;
  className?: string;
}) {
  const setDragging = useLayout((s) => s.setDragging);
  const dragging = useRef(false);
  const vertical = orientation === "vertical";

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.classList.remove("sf-resizing", "sf-resizing-row");
    setDragging(false);
  };

  return (
    <div
      role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} aria-label={label} tabIndex={0}
      title={`${label} — kéo để đổi tỉ lệ, bấm đúp để đặt lại`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add(vertical ? "sf-resizing" : "sf-resizing-row");
        setDragging(true);
      }}
      onPointerMove={(e) => { if (dragging.current) onMove(e.clientX, e.clientY); }}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const dec = vertical ? "ArrowLeft" : "ArrowUp";
        const inc = vertical ? "ArrowRight" : "ArrowDown";
        if (e.key === dec || e.key === inc) { e.preventDefault(); onStep(e.key === inc ? 2 : -2); }
        else if (e.key === "Home" || e.key === "Enter") { e.preventDefault(); onReset(); }
      }}
      className={cn(
        "group relative z-10 hidden shrink-0 touch-none select-none outline-none lg:flex",
        vertical ? "w-2 cursor-col-resize justify-center" : "h-2 cursor-row-resize items-center",
        className,
      )}
    >
      <span aria-hidden className={cn(
        "rounded-full bg-transparent transition-all duration-150 group-hover:bg-accent/70 group-focus-visible:bg-accent group-active:bg-accent",
        vertical ? "my-3 w-[2px] group-hover:w-[3px]" : "mx-3 h-[2px] w-full group-hover:h-[3px]",
      )} />
    </div>
  );
}
