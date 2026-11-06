"use client";
// 30 Mục 2.2, 5 — cột giữa: hàng chip bước, dòng đường dẫn, Monaco chỉ đọc (lát cắt, số dòng gốc, tô sáng), chú giải màu, nút Trình chiếu.
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { FileCode, Maximize2, Minimize2 } from "lucide-react";
import { CONFIG } from "@/contracts/config";
import { LAYER_LABEL, cn } from "@/components/ui/common";
import { buildSliceModel, monacoLanguage } from "@/components/code/slice-model";
import { useWorkbench } from "@/store/workbench";

const MonacoPane = dynamic(() => import("@/components/code/MonacoPane"), { ssr: false, loading: () => <div className="shimmer h-full w-full" /> });

const basename = (p: string) => p.split("/").pop() ?? p;
const shell = "sf-panel flex h-[34rem] min-w-0 flex-col overflow-hidden rounded-xl lg:h-auto lg:min-h-0 lg:flex-1";

export function CodeSnippetViewer() {
  const { result, active_node_id, active_step, analyses } = useWorkbench();
  const hint = useWorkbench((s) => s.ui.hint_step);
  const presentation = useWorkbench((s) => s.ui.presentation);
  const { setActiveStep, setUi } = useWorkbench.getState();
  const node = result?.nodes.find((n) => n.id === active_node_id) ?? null;
  const model = useMemo(() => (node ? buildSliceModel(node) : null), [node]);
  const a = node ? analyses[node.id] : undefined;
  const weak = useMemo(() => {
    const m = new Map<number, string>();
    if (a && typeof a === "object") for (const w of a.weak_points) m.set(w.step, w.what);
    return m;
  }, [a]);

  useEffect(() => {
    if (!presentation) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setUi({ presentation: false }); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [presentation, setUi]);

  if (!node || !model) {
    return (
      <section aria-label="Code lát cắt" className={shell}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
          <FileCode aria-hidden className="anim-float h-8 w-8 text-violet/80" />
          <p>Chọn một node — mỗi node là một lát cắt xuyên file</p>
          <p className="text-xs">Bấm một node <span className="text-amber">● Sẵn sàng</span> trên Bản đồ bài học để mở bài.</p>
        </div>
      </section>
    );
  }
  const step = node.trace_steps.find((s) => s.step_number === active_step) ?? node.trace_steps[0];
  const fontSize = Math.round(13 * (presentation ? CONFIG.UI_PRESENTATION_FONT_SCALE : 1));

  return (
    <section aria-label="Code lát cắt" className={shell}>
      {/* hàng chip bước (⚠ bước có điểm dở) */}
      <nav aria-label="Các bước của lát cắt" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-2 py-2">
        {node.trace_steps.map((s) => {
          const on = s.step_number === step.step_number;
          return (
            <button key={s.step_number} type="button" aria-pressed={on} onClick={() => setActiveStep(s.step_number)} title={`${s.file_path} · ${s.function_name}`}
              className={cn("flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors",
                on ? "border-amber/70 bg-amber/10" : "border-transparent hover:border-line hover:bg-white/5")}>
              <span className={cn("flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold", on ? "bg-amber text-on-amber" : "bg-white/10 text-muted")}>{s.step_number}</span>
              <span className="leading-tight">
                <span className={cn("block text-xs font-semibold", on ? "text-text" : "text-muted")}>{weak.has(s.step_number) && <span className="text-red">⚠ </span>}{LAYER_LABEL[s.layer]}</span>
                <span className="block max-w-36 truncate font-mono text-[10px] text-subtle">{basename(s.file_path)}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bước {k}/{n} · {layer} · {file_path} · {function_name} + origin_note */}
      <header key={`${node.id}:${step.step_number}`} className="anim-fade flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-panel-2/40 px-3 py-1.5 text-xs">
        <FileCode aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span className="min-w-0 truncate font-mono text-text" title={step.file_path}>{step.file_path}</span>
        <span className="rounded bg-amber/15 px-1.5 py-px font-mono text-[11px] text-amber">{step.function_name}</span>
        <span className="font-mono text-subtle">dòng {step.line_start}–{step.line_end}</span>
        <span className="text-subtle">· Bước {step.step_number}/{node.trace_steps.length} · {LAYER_LABEL[step.layer]}</span>
        {step.origin_note && <span className="text-muted">· {step.origin_note}</span>}
        <button type="button" aria-pressed={presentation} title="Trình chiếu (Esc để thoát)" onClick={() => setUi({ presentation: !presentation })}
          className="ml-auto inline-flex h-6 items-center gap-1 rounded border border-line px-2 text-[11px] text-muted hover:bg-white/5 hover:text-text">
          {presentation ? <Minimize2 aria-hidden className="h-3 w-3" /> : <Maximize2 aria-hidden className="h-3 w-3" />}{presentation ? "Thoát trình chiếu" : "Trình chiếu"}
        </button>
      </header>

      <div className="min-h-0 flex-1 bg-[var(--code-bg)]">
        <MonacoPane model={model} language={monacoLanguage(node)} activeStep={step.step_number} hintStep={hint} weakSteps={weak} fontSize={fontSize} onStepClick={setActiveStep} />
      </div>

      {/* chú giải màu tô sáng (UI-32) */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><i aria-hidden className="h-3 w-[3px] rounded bg-amber" />Bước đang xem</span>
        <span className="flex items-center gap-1.5"><i aria-hidden className="h-3 w-[3px] rounded bg-red" />⚠ Điểm dở — Nhận định của AI</span>
        <span className="flex items-center gap-1.5"><i aria-hidden className="h-3 w-[3px] rounded bg-violet" />💡 Gợi ý xem bước</span>
        <span className="ml-auto font-mono text-subtle">Số dòng = dòng gốc trong file</span>
      </footer>
    </section>
  );
}
