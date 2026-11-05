"use client";
import { useWorkbench } from "@/store/workbench";
import { cn } from "./common";

export function Toasts() {
  const toasts = useWorkbench((s) => s.ui.toasts);
  const dismiss = useWorkbench((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cn("toast-in glass pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg",
          t.kind === "error" ? "border-red/60" : t.kind === "ok" ? "border-green/60" : "border-line")}>
          <div className="flex items-start justify-between gap-3">
            <span>{t.kind === "error" ? "⚠ " : t.kind === "ok" ? "✓ " : ""}{t.text}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)} className="text-muted hover:text-text">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
