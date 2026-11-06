"use client";
// 4 nút bố cục kiểu VS Code: Tùy chỉnh bố cục · Bản đồ (trái) · Bảng dưới · X-Ray/Feynman (phải).
import { useEffect, useRef, useState } from "react";
import { Check, Presentation, RotateCcw } from "lucide-react";
import { cn } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";
import { useLayout } from "./layout";

type Part = "left" | "bottom" | "right";

/** Icon khung cửa sổ, phần đang hiện được tô đặc (giống codicon của VS Code). */
function PaneIcon({ part, on }: { part: Part | "grid"; on?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="1.6" y="2.6" width="12.8" height="10.8" rx="1.6" />
      {part === "grid" && (<><path d="M6.2 2.6v10.8M6.2 8h8.2" /><rect x="2.2" y="3.2" width="3.4" height="9.6" rx=".6" fill="currentColor" stroke="none" opacity=".9" /></>)}
      {part === "left" && (<><path d="M6 2.6v10.8" />{on && <rect x="2.2" y="3.2" width="3.2" height="9.6" rx=".6" fill="currentColor" stroke="none" />}</>)}
      {part === "right" && (<><path d="M10 2.6v10.8" />{on && <rect x="10.6" y="3.2" width="3.2" height="9.6" rx=".6" fill="currentColor" stroke="none" />}</>)}
      {part === "bottom" && (<><path d="M1.6 9.6h12.8" />{on && <rect x="2.2" y="10.2" width="11.6" height="2.6" rx=".6" fill="currentColor" stroke="none" />}</>)}
    </svg>
  );
}

const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-all duration-150 hover:bg-white/[0.07] hover:text-text active:scale-90";

export function LayoutControls() {
  const { showLeft, showRight, showPanel, toggle, reset } = useLayout();
  const presentation = useWorkbench((s) => s.ui.presentation);
  const setUi = useWorkbench((s) => s.setUi);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const items: Array<{ key: "showLeft" | "showPanel" | "showRight"; label: string; on: boolean; kbd: string; part: Part }> = [
    { key: "showLeft", label: "Bản đồ bài học", on: showLeft, kbd: "Ctrl+B", part: "left" },
    { key: "showPanel", label: "Bảng dưới: Điểm dở · Luồng", on: showPanel, kbd: "Ctrl+Alt+J", part: "bottom" },
    { key: "showRight", label: "X-Ray / Feynman", on: showRight, kbd: "Ctrl+Alt+B", part: "right" },
  ];

  return (
    <div ref={ref} className="relative hidden items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5 shadow-[var(--shadow)] lg:flex" role="toolbar" aria-label="Bố cục">
      <button type="button" className={cn(iconBtn, open && "bg-white/[0.07] text-text")} aria-haspopup="menu" aria-expanded={open}
        title="Tùy chỉnh bố cục" onClick={() => setOpen((o) => !o)}>
        <PaneIcon part="grid" />
      </button>
      {items.map((it) => (
        <button key={it.key} type="button" className={cn(iconBtn, it.on && "text-text")} aria-pressed={it.on}
          title={`${it.on ? "Ẩn" : "Hiện"} ${it.label} (${it.kbd})`} onClick={() => toggle(it.key)}>
          <PaneIcon part={it.part} on={it.on} />
        </button>
      ))}

      {open && (
        <div role="menu" className="anim-pop glass absolute right-0 top-9 z-50 w-72 rounded-xl border border-line p-1.5 text-sm">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted">Hiển thị</p>
          {items.map((it) => (
            <button key={it.key} role="menuitemcheckbox" aria-checked={it.on} type="button" onClick={() => toggle(it.key)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]">
              <span className="flex h-4 w-4 items-center justify-center text-violet">{it.on && <Check className="h-3.5 w-3.5" />}</span>
              <PaneIcon part={it.part} on={it.on} />
              <span className="flex-1">{it.label}</span>
              <kbd className="font-mono text-[10px] text-subtle">{it.kbd}</kbd>
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <button role="menuitemcheckbox" aria-checked={presentation} type="button" onClick={() => { setUi({ presentation: !presentation }); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]">
            <span className="flex h-4 w-4 items-center justify-center text-violet">{presentation && <Check className="h-3.5 w-3.5" />}</span>
            <Presentation aria-hidden className="h-4 w-4" /><span className="flex-1">Trình chiếu</span><kbd className="font-mono text-[10px] text-subtle">Esc thoát</kbd>
          </button>
          <button role="menuitem" type="button" onClick={() => { reset(); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.06]">
            <span className="h-4 w-4" /><RotateCcw aria-hidden className="h-4 w-4" /><span className="flex-1">Đặt lại bố cục</span>
          </button>
          <p className="px-2 pb-1 pt-2 text-[11px] text-muted">Kéo vạch giữa các khung để đổi tỉ lệ · bấm đúp vạch để đặt lại.</p>
        </div>
      )}
    </div>
  );
}
