"use client";
// 30 Mục 2.2, 5 — khung code (Monaco chỉ đọc) + chip bước + trình chiếu; bên dưới là X-Ray.
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { CONFIG } from "@/contracts/config";
import { LAYER_LABEL, cn } from "@/components/ui/common";
import { XRayPanel } from "./XRayPanel";
import { buildSliceModel, monacoLanguage } from "@/components/code/slice-model";
import { useWorkbench } from "@/store/workbench";

const MonacoPane = dynamic(() => import("@/components/code/MonacoPane"), { ssr: false, loading: () => <div className="shimmer h-full w-full" /> });

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
    return <div className="flex h-72 items-center justify-center rounded-xl border border-line bg-panel p-6 text-sm text-muted">Chọn một node — mỗi node là một lát cắt xuyên file</div>;
  }
  const step = node.trace_steps.find((s) => s.step_number === active_step) ?? node.trace_steps[0];
  const fontSize = Math.round(13 * (presentation ? CONFIG.UI_PRESENTATION_FONT_SCALE : 1));

  return (
    <section aria-label="Code lát cắt" className="overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="min-w-0 truncate font-mono text-xs text-muted">
          Bước {step.step_number}/{node.trace_steps.length} · {LAYER_LABEL[step.layer]} · {step.file_path} · {step.function_name}{step.origin_note ? ` · ${step.origin_note}` : ""}
        </p>
        <button type="button" aria-pressed={presentation} title="Trình chiếu (Esc để thoát)" onClick={() => setUi({ presentation: !presentation })}
          className="rounded border border-line px-2 py-0.5 text-xs hover:bg-white/5">⤢ Trình chiếu</button>
      </header>
      <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
        {node.trace_steps.map((s) => (
          <button key={s.step_number} type="button" aria-pressed={s.step_number === active_step} onClick={() => setActiveStep(s.step_number)}
            className={cn("rounded-full border px-2 py-0.5 text-xs", s.step_number === active_step ? "border-amber bg-amber/10 text-amber" : "border-line text-muted hover:text-text")}>
            {weak.has(s.step_number) && "⚠ "}{s.step_number}. {LAYER_LABEL[s.layer]}
          </button>
        ))}
      </div>
      <div className="h-80 min-h-0 bg-[#1e1e1e]" style={presentation ? { height: "28rem" } : undefined}>
        <MonacoPane model={model} language={monacoLanguage(node)} activeStep={active_step} hintStep={hint} weakSteps={weak} fontSize={fontSize} onStepClick={setActiveStep} />
      </div>
      <div className="border-t border-line"><XRayPanel /></div>
    </section>
  );
}
