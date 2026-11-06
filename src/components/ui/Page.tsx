// Khung trang phụ (Lộ trình, Lịch sử, Báo cáo, Cách học): tiêu đề + mô tả + nội dung, cùng một kiểu.
import type { ReactNode } from "react";
import type { NodeStatus } from "@/contracts";
import { STATUS_UI } from "./common";

// Không dùng cn() của common.tsx (module "use client") để PageHeader dùng được trong server component.
const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export function PageHeader({ icon, title, description, actions }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span aria-hidden className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-violet shadow-[var(--shadow)]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Thẻ số liệu: nhãn nhỏ viết hoa phía trên, số lớn đậm phía dưới. */
export function MetricCard({ label, value, icon, hint, className }: { label: ReactNode; value: ReactNode; icon?: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("sf-card rounded-xl p-4", className)}>
      <p className="sf-metric-label flex items-center gap-1.5">{icon}{label}</p>
      <p className="sf-metric-value mt-1.5">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** Nhãn trạng thái node theo bộ màu semantic (nền / viền / chữ từ token --st-*). */
const ST: Record<NodeStatus, string> = { LOCKED: "lock", AVAILABLE: "ready", COMPLETED: "done", FAILED: "fail" };
export function StatusPill({ status, className }: { status: NodeStatus; className?: string }) {
  const ui = STATUS_UI[status];
  const k = ST[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", className)}
      style={{ background: `var(--st-${k}-bg)`, borderColor: `var(--st-${k}-border)`, color: `var(--st-${k}-fg)` }}>
      {ui.icon} {ui.label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line-strong bg-panel/60 px-4 py-8 text-center text-sm text-muted">{children}</div>;
}
