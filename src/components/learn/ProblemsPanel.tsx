"use client";
// Bảng dưới cột code (kiểu Problems / Call stack của VS Code): "Điểm dở — Nhận định của AI" và "Luồng" của node đang mở.
// Chỉ đọc lại dữ liệu đã có (analyses, trace_steps); bấm dòng ⇒ active_step (UI-33). Không hiện cách sửa (INV-06).
import { useState } from "react";
import { ListTree, ShieldAlert, X } from "lucide-react";
import { LAYER_LABEL, PlainText, cn } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";
import { useLayout } from "./layout";

type Tab = "WEAK" | "FLOW";

export function ProblemsPanel() {
  const { result, active_node_id, active_step, analyses } = useWorkbench();
  const setActiveStep = useWorkbench((s) => s.setActiveStep);
  const toggle = useLayout((s) => s.toggle);
  const [tab, setTab] = useState<Tab>("WEAK");
  const node = result?.nodes.find((n) => n.id === active_node_id) ?? null;
  const a = node ? analyses[node.id] : undefined;
  const ready = !!a && typeof a === "object";
  const weak = ready ? a.weak_points : [];
  const cur = active_step ?? 1;

  const tabs: Array<{ id: Tab; label: string; count: number | null; Icon: typeof ShieldAlert }> = [
    { id: "WEAK", label: "Điểm dở — Nhận định của AI", count: ready ? weak.length : null, Icon: ShieldAlert },
    { id: "FLOW", label: "Luồng", count: node ? node.trace_steps.length : null, Icon: ListTree },
  ];

  return (
    <section aria-label="Bảng dưới" className="sf-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
      <header className="flex shrink-0 items-center gap-1 border-b border-line px-2">
        <div role="tablist" aria-label="Bảng dưới" className="flex min-w-0 flex-1 gap-1 overflow-x-auto overflow-y-hidden">
          {tabs.map(({ id, label, count, Icon }) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn("relative flex shrink-0 items-center gap-1.5 px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                tab === id ? "text-text" : "text-muted hover:text-text")}>
              <Icon aria-hidden className={cn("h-3.5 w-3.5", id === "WEAK" && "text-red")} />{label}
              {count !== null && <span className="rounded-full bg-white/10 px-1.5 font-mono text-[10px] normal-case">{count}</span>}
              <span aria-hidden className={cn("absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-2 transition-transform duration-200", tab === id ? "scale-x-100" : "scale-x-0")} />
            </button>
          ))}
        </div>
        <button type="button" aria-label="Đóng bảng dưới" title="Đóng bảng dưới (Ctrl+Alt+J)" onClick={() => toggle("showPanel")}
          className="rounded p-1 text-muted transition-colors hover:bg-white/10 hover:text-text"><X className="h-3.5 w-3.5" /></button>
      </header>
      <div key={`${tab}-${node?.id ?? ""}`} className="anim-fade min-h-0 flex-1 overflow-y-auto py-1 text-[13px]">
        {!node ? <p className="px-3 py-2 text-muted">Chọn một node để xem điểm dở và luồng.</p>
          : tab === "WEAK" ? (
            !ready ? <p className="px-3 py-2 text-muted">{a === "FAILED" ? "Chưa phân tích được." : "đang phân tích…"}</p>
              : weak.length === 0 ? <p className="px-3 py-2 text-muted">AI không nêu điểm dở nào cho node này.</p>
                : (
                  <ul>
                    {weak.map((w) => (
                      <li key={`${w.skill}-${w.step}`}>
                        <button type="button" onClick={() => setActiveStep(w.step)}
                          className={cn("flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.05]", cur === w.step && "bg-red/[0.07]")}>
                          <ShieldAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red" />
                          <span className="min-w-0 flex-1">
                            <PlainText text={w.what} />
                            <span className="ml-2 font-mono text-[11px] text-subtle">{w.file_path}:{w.line_start}–{w.line_end} · bước {w.step} · {w.skill}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
          ) : (
            <ol>
              {node.trace_steps.map((s) => (
                <li key={s.step_number}>
                  <button type="button" onClick={() => setActiveStep(s.step_number)}
                    className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs transition-colors hover:bg-white/[0.05]", cur === s.step_number && "bg-amber/[0.08] text-text")}>
                    <span className={cn("w-5 shrink-0 text-right", cur === s.step_number ? "text-amber" : "text-muted")}>{s.step_number}</span>
                    <span className="w-36 shrink-0 truncate font-sans font-semibold">{LAYER_LABEL[s.layer]}</span>
                    <span className="shrink-0 text-amber/90">{s.function_name}</span>
                    <span className="min-w-0 truncate text-muted">{s.file_path}:{s.line_start}–{s.line_end}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
      </div>
    </section>
  );
}
