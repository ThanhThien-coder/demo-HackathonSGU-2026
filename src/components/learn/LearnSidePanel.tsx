"use client";
// 30 Mục 6 (đề xuất D-78) — cột phải: 2 tab X-Ray / Feynman (`active_tab`). Feynman bật khi `analyses[id]` là bản phân tích;
// tắt ⇒ tooltip "Cần bản phân tích trước khi đặt câu hỏi".
import { Eye, MessageSquare, MousePointerClick } from "lucide-react";
import { cn } from "@/components/ui/common";
import { FeynmanQuestionSection } from "./FeynmanQuestionSection";
import { XRayPanel } from "./XRayPanel";
import { useWorkbench } from "@/store/workbench";

export function LearnSidePanel() {
  const { active_node_id, active_tab, analyses, runs } = useWorkbench();
  const setTab = useWorkbench((s) => s.setTab);
  const a = active_node_id ? analyses[active_node_id] : undefined;
  const ready = !!a && a !== "PENDING" && a !== "FAILED";
  const run = active_node_id ? runs[active_node_id] : undefined;
  const open = run ? run.questions.filter((q) => !q.state.finished && q.state.ended_by !== "DROPPED").length : 0;
  const tab = active_tab === "FEYNMAN" && ready ? "FEYNMAN" : "XRAY";

  const tabs = [
    { id: "XRAY" as const, n: 1, label: "X-Ray", Icon: Eye, disabled: false, title: undefined as string | undefined },
    { id: "FEYNMAN" as const, n: 2, label: "Feynman", Icon: MessageSquare, disabled: !ready, title: !active_node_id ? "Chọn một node trước" : !ready ? "Cần bản phân tích trước khi đặt câu hỏi" : undefined },
  ];

  return (
    <section aria-label="X-Ray và Feynman" className="sf-panel flex min-w-0 flex-col overflow-hidden rounded-xl lg:h-full lg:min-h-0">
      <div role="tablist" aria-label="Chế độ học" className="relative grid shrink-0 grid-cols-2 gap-1 border-b border-line p-1.5">
        {/* nền tab đang chọn trượt qua lại */}
        <span aria-hidden className="tab-glider pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(50%-0.5rem)] rounded-lg"
          style={{ transform: tab === "FEYNMAN" ? "translateX(calc(100% + 0.25rem))" : "translateX(0)" }} />
        {tabs.map(({ id, n, label, Icon, disabled, title }) => {
          const on = tab === id;
          return (
            <button key={id} role="tab" type="button" id={`tab-${id}`} aria-selected={on} aria-controls={`panel-${id}`} aria-disabled={disabled}
              title={title} onClick={() => { if (!disabled) setTab(id); }}
              className={cn("relative z-[1] flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200",
                on ? "text-text" : "text-muted hover:text-text",
                disabled && "cursor-not-allowed opacity-50 hover:text-muted")}>
              <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold transition-colors duration-200", on ? "bg-gradient-to-br from-accent to-accent-2 text-on-accent shadow-[0_0_14px_color-mix(in_srgb,var(--accent)_60%,transparent)]" : "bg-white/10")}>{n}</span>
              <Icon aria-hidden className="h-4 w-4" />{label}
              {id === "FEYNMAN" && open > 0 && <span className="anim-pop rounded-full bg-accent/20 px-1.5 text-[10px] text-violet">{open}</span>}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto">
        <div key={`${tab}:${active_node_id ?? ""}`} className="anim-fade-up">
          {!active_node_id ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-muted">
              <MousePointerClick aria-hidden className="anim-float h-8 w-8 text-violet/80" />
              <p>Chọn một node trên Bản đồ bài học để xem X-Ray và trả lời câu hỏi Feynman.</p>
              <button type="button" onClick={() => useWorkbench.getState().setUi({ overview_open: true })} className="text-xs text-blue underline-offset-2 hover:underline">Mở Tổng quan kiến trúc</button>
            </div>
          ) : tab === "XRAY" ? <XRayPanel /> : <FeynmanQuestionSection />}
        </div>
      </div>
    </section>
  );
}
