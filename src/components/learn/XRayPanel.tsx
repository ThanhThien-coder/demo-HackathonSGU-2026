"use client";
// 30 Mục 6.1 — X-Ray: đầu node → Kỹ năng (mài mòn kiểu Duolingo, D-35) → Kiến trúc → Luồng → Điểm hay → Điểm dở "Nhận định của AI" → Liên quan → Chỉ số → nút (UI-47).
import { ArrowRight, Boxes, Gauge, Link2, ListOrdered, ShieldAlert, Sparkles, ThumbsUp } from "lucide-react";
import type { NodeAnalysisView } from "@/contracts";
import { Chip, LAYER_LABEL, PATTERN_LABEL, PlainText, cn, fmt4 } from "@/components/ui/common";
import { getDecayedMastery, isDecaying, tierOf } from "@/lib/bkt-engine";
import { useWorkbench } from "@/store/workbench";

function SkillChips({ analysis }: { analysis: NodeAnalysisView }) {
  const profile = useWorkbench((s) => s.profile);
  const offset = useWorkbench((s) => s.server_clock_offset_ms);
  const setStep = useWorkbench((s) => s.setActiveStep);
  const now = Date.now() + offset;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {analysis.skills.map((s) => {
        const st = profile?.skills[s.skill];
        const decayed = getDecayedMastery(st, now);
        const base = st?.p_mastery ?? decayed;
        const dec = isDecaying(st, now);
        const ratio = base > 0 ? Math.min(1, decayed / base) : 1;
        const tip = `Vì: ${s.reason} — bước ${s.step} · ${s.symbol} · ${s.file_path} dòng ${s.line_start}–${s.line_end}`;
        return (
          <li key={s.skill}>
            <button type="button" title={st && decayed < base - 1e-9 ? `${tip}\nĐiểm gốc ${fmt4(base)} — đã giảm còn ${fmt4(decayed)} vì lâu chưa luyện` : tip}
              onClick={() => setStep(s.step)} className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-left transition-colors hover:border-accent/60">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-mono font-semibold">{s.skill}</span>
                <span className="shrink-0 font-mono text-subtle">{fmt4(decayed)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-white/10">
                <div className="bar-grow h-full rounded bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.round(decayed * 100)}%`, opacity: Math.max(0.35, ratio) }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-muted">{tierOf(decayed)} · bước {s.step}</span>
                {dec && <span className="font-semibold text-violet">đang mài mòn</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const Section = ({ title, icon, children, tone }: { title: string; icon: React.ReactNode; children: React.ReactNode; tone?: string }) => (
  <section className="mt-5">
    <h3 className={cn("mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", tone ?? "text-muted")}>{icon}{title}</h3>
    {children}
  </section>
);
const ic = "h-3.5 w-3.5";

const StepNum = ({ n, on }: { n: number; on: boolean }) => (
  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold", on ? "border-amber bg-amber text-on-amber" : "border-line text-muted")}>{n}</span>
);

export function XRayPanel() {
  const { result, analyses, active_node_id, active_step, progress, runs } = useWorkbench();
  const pending = useWorkbench((s) => s.ui.pending);
  const submitError = useWorkbench((s) => s.ui.submit_error);
  const { setActiveStep, retryAnalysis, startQuestions } = useWorkbench.getState();
  const node = result?.nodes.find((n) => n.id === active_node_id);
  if (!node) return null;
  const a = analyses[node.id];
  const state = progress?.nodes[node.id];
  const run = runs[node.id];
  const open = run ? run.questions.filter((q) => !q.state.finished && q.state.ended_by !== "DROPPED").length : null;
  const ub = node.uncle_bob;
  const cur = active_step ?? 1;

  const head = (
    <div>
      <h2 className="text-lg font-bold leading-snug">{node.title}</h2>
      <p className="mt-0.5 font-mono text-[11px] text-subtle">{node.title_evidence}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {node.is_capstone && <Chip tone="amber">★ Capstone</Chip>}
        {node.node_type === "ALGORITHMIC_CORE" && <Chip tone="violet">Thuật toán</Chip>}
        {state?.has_warning && <Chip tone="amber" title="Có node cha chưa đạt hoặc chưa phân tích được">⚠ Node trước chưa vững</Chip>}
        <Chip title={node.support_tier === "STRUCTURAL" ? "Ngôn ngữ chỉ phân tích cấu trúc" : "Ngôn ngữ đã kiểm chứng"}>{node.support_tier === "STRUCTURAL" ? "Suy luận (STRUCTURAL)" : "Chính xác (RESOLVED)"}</Chip>
      </div>
    </div>
  );

  // chờ phân tích: khung từ trace_steps + shimmer
  if (a === undefined || a === "PENDING" || a === "FAILED") {
    return (
      <div className="p-4">
        {head}
        <Section title="Luồng" icon={<ListOrdered className={ic} />}>
          <ol className="flex flex-col gap-1.5">
            {node.trace_steps.map((s) => (
              <li key={s.step_number}>
                <button type="button" onClick={() => setActiveStep(s.step_number)}
                  className={cn("flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm", cur === s.step_number ? "border-amber/60 bg-amber/10" : "border-transparent hover:bg-white/5")}>
                  <StepNum n={s.step_number} on={cur === s.step_number} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{LAYER_LABEL[s.layer]}</span> <span className="font-mono text-[11px] text-subtle">{s.file_path} · {s.function_name}</span>
                    {a !== "FAILED" && <span className="shimmer mt-2 block h-3 w-2/3 rounded" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Section>
        <div className="mt-4 text-sm text-muted" aria-live="polite">
          {a === "FAILED" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red/40 bg-red/5 px-3 py-2">
              <span className="text-red">Chưa phân tích được.</span>
              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs text-text hover:bg-white/5" onClick={() => retryAnalysis(node.id)}>Thử lại phân tích</button>
            </div>
          ) : <p className="flex items-center gap-2"><span className="spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-blue border-t-transparent" />đang phân tích…</p>}
        </div>
      </div>
    );
  }

  const weakSteps = new Set(a.weak_points.map((w) => w.step));
  const enrichPending = !!pending[`enrich:${node.id}`] && !run;
  const showCta = state?.status === "AVAILABLE" && (!run || (open ?? 0) > 0 || !state.last_run?.finished_at);

  return (
    <div className="stagger p-4">
      {head}
      {a.skeleton_only && <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">AI chưa giải thích được node này — chỉ hiện khung do code dựng.</p>}

      <Section title="Kỹ năng" icon={<Sparkles className={ic} />}><SkillChips analysis={a} /></Section>

      {!a.skeleton_only && (
        <Section title="Kiến trúc" icon={<Boxes className={ic} />}>
          <div className="rounded-xl border border-line bg-panel-2 p-3">
            <div className="flex flex-wrap gap-1.5">{a.architecture.patterns.map((p, i) => <Chip key={p} tone={i === 0 ? "blue" : "muted"}>{PATTERN_LABEL[p] ?? p}{i === 0 && " · chính"}</Chip>)}</div>
            <p className="mt-2 text-sm leading-relaxed"><PlainText text={a.architecture.summary} /></p>
          </div>
        </Section>
      )}

      <Section title="Luồng" icon={<ListOrdered className={ic} />}>
        {node.node_type === "ALGORITHMIC_CORE" && (
          <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
            {(["ALGO_SETUP", "ALGO_EXECUTION", "ALGO_TERMINATION"] as const).map((l, i) => {
              const present = node.trace_steps.some((s) => s.layer === l);
              return <span key={l} className={cn("rounded-full border px-2 py-0.5", present ? "border-violet/60 text-violet" : "border-line text-muted opacity-50")}>{i > 0 && "→ "}{LAYER_LABEL[l]}</span>;
            })}
          </div>
        )}
        <ol className="flex flex-col gap-1.5">
          {a.steps.map((s) => {
            const on = cur === s.step;
            return (
              <li key={s.step}>
                <button type="button" onClick={() => setActiveStep(s.step)} aria-pressed={on}
                  className={cn("flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors", on ? "border-amber/60 bg-amber/10" : "border-transparent hover:bg-white/5")}>
                  <StepNum n={s.step} on={on} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 text-xs">
                      <b className="text-text">{LAYER_LABEL[s.layer]}</b>
                      {weakSteps.has(s.step) && <span className="text-red" title="Có điểm dở — Nhận định của AI">⚠</span>}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-subtle">{s.file_path} · dòng {s.line_start}–{s.line_end} · {node.trace_steps[s.step - 1]?.function_name}</span>
                    {s.text && <span className="mt-1 block leading-relaxed"><PlainText text={s.text} /></span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

      {a.strengths.length > 0 && (
        <Section title="Điểm hay" icon={<ThumbsUp className={ic} />} tone="text-green">
          <ul className="flex flex-col gap-1.5 text-sm">
            {a.strengths.map((s) => (
              <li key={s.step}>
                <button type="button" onClick={() => setActiveStep(s.step)} className="w-full rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-left hover:border-green/60">
                  ✅ <span className="text-xs text-muted">(bước {s.step})</span> <PlainText text={s.text} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.weak_points.length > 0 && (
        <Section title="Điểm dở — Nhận định của AI" icon={<ShieldAlert className={ic} />} tone="text-red">
          <ul className="flex flex-col gap-2">
            {a.weak_points.map((w) => (
              <li key={`${w.skill}-${w.step}`}>
                <button type="button" onClick={() => setActiveStep(w.step)} className="w-full rounded-lg border border-red/50 bg-red/5 px-3 py-2 text-left text-sm hover:border-red">
                  <span className="block text-xs text-red"><b>Điểm dở — Nhận định của AI</b> · <span className="font-mono">{w.file_path} dòng {w.line_start}–{w.line_end}</span> · {w.skill}</span>
                  <span className="mt-1 block"><PlainText text={w.what} /></span>
                  <span className="mt-0.5 block text-muted">Hậu quả: <PlainText text={w.consequence} /></span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.shared_files.length > 0 && (
        <Section title="Liên quan" icon={<Link2 className={ic} />}>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {a.shared_files.map((f) => (
              <li key={f.file_path}>Dùng chung <code className="font-mono text-text">{f.file_path.split("/").pop()}</code> với{" "}
                {f.node_ids.map((id) => {
                  const locked = progress?.nodes[id]?.status === "LOCKED";
                  return <Chip key={id} className="mr-1" tone={locked ? "muted" : "blue"} title={locked ? "Chưa mở" : "Mở bài"} onClick={locked ? undefined : () => useWorkbench.getState().openNode(id)}>{result?.nodes.find((n) => n.id === id)?.title ?? id}</Chip>;
                })}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Chỉ số" icon={<Gauge className={ic} />}>
        <p className="text-xs text-muted">
          {ub.is_exempt ? "Uncle Bob: Miễn trừ" : <>Uncle Bob: I {ub.instability} · A {ub.abstractness} · D {ub.distance} — {ub.diagnosis}</>} · Độ phức tạp nhận thức: {node.cognitive_complexity}
        </p>
      </Section>

      {showCta && (
        <div className="sticky bottom-0 -mx-4 mt-5 border-t border-line bg-panel/90 px-4 py-3 backdrop-blur-md">
          {submitError && !run && !enrichPending ? (
            <div className="text-sm">
              <p className="mb-2 text-red">⚠ {submitError.message}</p>
              <button type="button" onClick={startQuestions} className="w-full rounded-xl border border-accent/60 py-3 font-semibold text-violet hover:bg-accent/10">Thử lại</button>
            </div>
          ) : (
            <button type="button" onClick={startQuestions} disabled={enrichPending}
              className="btn-primary anim-glow flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-60">
              {enrichPending ? <><span className="spinner inline-block h-4 w-4 rounded-full border-2 border-bg border-t-transparent" />Đang chuẩn bị câu hỏi…</> : <>Bắt đầu trả lời{open !== null ? ` (${open})` : ""}<ArrowRight aria-hidden className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      )}
      {(state?.status === "COMPLETED" || state?.status === "FAILED") && (
        <p className="mt-5 rounded-lg border border-line px-3 py-2 text-xs text-muted">
          {state.status === "COMPLETED" ? "✓ Đã hoàn thành node này." : "✗ Node này chưa đạt."} Xem lại câu hỏi ở tab Feynman. Không có ôn tập: node giữ nguyên màu.
        </p>
      )}
    </div>
  );
}
