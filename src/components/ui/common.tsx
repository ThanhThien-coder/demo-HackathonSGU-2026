"use client";
import { clsx, type ClassValue } from "clsx";
import { useEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import type { NodeStatus } from "@/contracts";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

// INV-11: màu luôn kèm biểu tượng + chữ
export const STATUS_UI: Record<NodeStatus, { label: string; icon: string; color: string; border: string }> = {
  LOCKED: { label: "Chưa mở", icon: "🔒", color: "text-locked", border: "border-locked border-dashed" },
  AVAILABLE: { label: "Sẵn sàng", icon: "●", color: "text-amber", border: "border-amber" },
  COMPLETED: { label: "Hoàn thành", icon: "✓", color: "text-green", border: "border-green" },
  FAILED: { label: "Chưa đạt", icon: "✗", color: "text-red", border: "border-red" },
};

export function Chip({ children, tone = "muted", title, className, onClick }: {
  children: ReactNode; tone?: "muted" | "amber" | "green" | "red" | "violet" | "blue"; title?: string; className?: string; onClick?: () => void;
}) {
  const tones = {
    muted: "border-line text-muted", amber: "border-amber/50 text-amber", green: "border-green/50 text-green",
    red: "border-red/50 text-red", violet: "border-violet/50 text-violet", blue: "border-blue/50 text-blue",
  };
  const cls = cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", tones[tone], onClick && "cursor-pointer hover:bg-white/5", className);
  return onClick
    ? <button type="button" title={title} onClick={onClick} className={cls}>{children}</button>
    : <span title={title} className={cls}>{children}</span>;
}

export function Button({ children, variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-amber text-bg hover:brightness-110 disabled:opacity-40",
    ghost: "border border-line text-text hover:bg-white/5 disabled:opacity-40",
    danger: "border border-red/60 text-red hover:bg-red/10 disabled:opacity-40",
  }[variant];
  return <button type="button" {...rest} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed", v, className)}>{children}</button>;
}

export function Modal({ open, onClose, title, children, wide, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cn("glass flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-2xl border border-line shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" aria-label="Đóng" onClick={onClose} className="rounded p-1 text-muted hover:text-text">✕</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** Văn bản AI là chữ thuần; `…` ⇒ mã nội dòng (30 Mục 1). Không dangerouslySetInnerHTML, không Markdown. */
export function PlainText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => (p.startsWith("`") && p.endsWith("`") && p.length > 2
        ? <code key={i} className="rounded bg-white/10 px-1 font-mono text-[0.85em]">{p.slice(1, -1)}</code>
        : <span key={i}>{p}</span>))}
    </span>
  );
}

export const fmt4 = (n: number) => n.toFixed(4);

export const TITLE_DERIVED = new Set(["DOMAIN_TERMS", "DIRECTORY", "FILE_BASENAME"]);
import { CONFIG } from "@/contracts/config";
export function displayTitle(title: string, source: string): string {
  const t = title.length > CONFIG.TITLE_MAX_CHARS ? `${title.slice(0, CONFIG.TITLE_MAX_CHARS)}…` : title;
  return TITLE_DERIVED.has(source) ? `~${t}` : t;
}

export const PATTERN_LABEL: Record<string, string> = {
  LAYERED: "Tách tầng", MIDDLEWARE_CHAIN: "Chuỗi middleware", DEPENDENCY_INJECTION: "Tiêm phụ thuộc", OBSERVER_EVENT: "Observer",
  PIPELINE: "Chuỗi xử lý", ALGORITHMIC: "Thuật toán", PROCEDURAL: "Tuần tự", OTHER: "Khác",
};
export const LAYER_LABEL: Record<string, string> = {
  ENTRY_POINT: "Điểm vào", MIDDLEWARE: "Kiểm tra trung gian", BUSINESS_LOGIC: "Xử lý nghiệp vụ", DATA_ACCESS: "Truy cập dữ liệu",
  ALGO_SETUP: "Khởi tạo", ALGO_EXECUTION: "Vòng lặp chính", ALGO_TERMINATION: "Điều kiện dừng",
};
