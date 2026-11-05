"use client";
// 30 Mục 6.1 — X-Ray: kỹ năng (mài mòn kiểu Duolingo, D-35), kiến trúc, luồng, điểm hay / điểm dở "Nhận định của AI", liên quan, chỉ số.
import type { NodeAnalysisView } from "@/contracts";
import { Button, Chip, LAYER_LABEL, PATTERN_LABEL, PlainText, cn, fmt4 } from "@/components/ui/common";
import { getDecayedMastery, isDecaying, tierOf } from "@/lib/bkt-engine";
import { useWorkbench } from "@/store/workbench";

function SkillChips({ analysis }: { analysis: NodeAnalysisView }) {
  const profile = useWorkbench((s) => s.profile);
  const offset = useWorkbench((s) => s.server_clock_offset_ms);
  const setStep = useWorkbench((s) => s.setActiveStep);
  const now = Date.now() + offset;
  return (
    <ul className="flex flex-wrap gap-2">
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
              onClick={() => setStep(s.step)} className="min-w-44 rounded-lg border border-line bg-panel-2 px-3 py-2 text-left hover:border-amber/60">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold">{s.skill}</span>
                <span className="text-muted">{fmt4(decayed)} · {tierOf(decayed)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-white/10">
                <div className="bar-grow h-full rounded bg-amber" style={{ width: `${Math.round(decayed * 100)}%`, opacity: Math.max(0.35, ratio) }} />
              </div>
              {dec && <p className="mt-1 text-[11px] font-semibold text-violet">đang mài mòn</p>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-4"><h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>{children}</section>
);

export function XRayPanel() {
  const { result, analyses, active_node_id, active_step, progress, runs } = useWorkbench();
  const pending = useWorkbench((s) => s.ui.pending);
  const { setActiveStep, retryAnalysis, startQuestions } = useWorkbench.getState();
  const node = result?.nodes.find((n) => n.id === active_node_id);
  if (!node) return null;
  const a = analyses[node.id];
  const state = progress?.nodes[node.id];
  const run = runs[node.id];
  const open = run ? run.questions.filter((q) => !q.state.finished && q.state.ended_by !== "DROPPED").length : null;
  const ub = node.uncle_bob;

  const head = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{node.title}</h2>
        {node.is_capstone && <Chip tone="amber">★ Capstone</Chip>}
        {node.node_type === "ALGORITHMIC_CORE" && <Chip tone="violet">Thuật toán</Chip>}
        {state?.has_warning && <Chip tone="amber" title="Có node cha chưa vững">⚠ Node trước chưa vững</Chip>}
        <Chip>{node.support_tier === "STRUCTURAL" ? "Suy luận (STRUCTURAL)" : "Chính xác (RESOLVED)"}</Chip>
      </div>
      <p className="mt-1 font-mono text-xs text-muted">{node.title_evidence}</p>
    </div>
  );

  // chờ phân tích: khung từ trace_steps + shimmer
  if (a === undefined || a === "PENDING" || a === "FAILED") {
    return (
      <div className="p-4">
        {head}
        <Section title="Luồng">
          <ol className="flex flex-col gap-2">
            {node.trace_steps.map((s) => (
              <li key={s.step_number}>
                <button type="button" onClick={() => setActiveStep(s.step_number)}
                  className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm", active_step === s.step_number ? "border-amber bg-amber/10" : "border-line")}>
                  <span className="font-semibold">{s.step_number}. {LAYER_LABEL[s.layer]}</span> <span className="font-mono text-xs text-muted">{s.file_path} · {s.function_name}</span>
                  {a === "FAILED" ? null : <div className="shimmer mt-2 h-3 w-2/3 rounded" />}
                </button>
              </li>
            ))}
          </ol>
        </Section>
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {a === "FAILED" ? "Chưa phân tích được." : "đang phân tích…"}{" "}
          {a === "FAILED" && <Button variant="ghost" className="ml-2" onClick={() => retryAnalysis(node.id)}>Thử lại phân tích</Button>}
        </p>
      </div>
    );
  }

  const weakSteps = new Set(a.weak_points.map((w) => w.step));
  const main = a.architecture.patterns[0];

  return (
    <div className="p-4">
      {head}
      {a.skeleton_only && <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">AI chưa giải thích được node này — chỉ hiện khung do code dựng.</p>}

      <Section title="Kỹ năng"><SkillChips analysis={a} /></Section>

      {!a.skeleton_only && (
        <Section title="Kiến trúc">
          <div className="flex flex-wrap gap-1.5">{a.architecture.patterns.map((p, i) => <Chip key={p} tone={i === 0 ? "blue" : "muted"}>{PATTERN_LABEL[p] ?? p}</Chip>)}</div>
          <p className="mt-1 text-sm"><PlainText text={a.architecture.summary} /></p>
          <p className="sr-only">Mẫu chính: {main}</p>
        </Section>
      )}

      <Section title="Luồng">
        {node.node_type === "ALGORITHMIC_CORE" && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            {(["ALGO_SETUP", "ALGO_EXECUTION", "ALGO_TERMINATION"] as const).map((l, i) => {
              const present = node.trace_steps.some((s) => s.layer === l);
              return <span key={l} className={cn("rounded-full border px-2 py-0.5", present ? "border-violet/60 text-violet" : "border-line text-muted opacity-50")}>{i > 0 && "→ "}{LAYER_LABEL[l]}</span>;
            })}
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {a.steps.map((s) => (
            <li key={s.step}>
              <button type="button" onClick={() => setActiveStep(s.step)} aria-pressed={active_step === s.step}
                className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm", active_step === s.step ? "border-amber bg-amber/10" : "border-line hover:border-muted")}>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <b className="text-text">{s.step}. {LAYER_LABEL[s.layer]}</b>
                  <span className="font-mono">{s.file_path} · dòng {s.line_start}–{s.line_end} · {node.trace_steps[s.step - 1]?.function_name}</span>
                  {weakSteps.has(s.step) && <span className="text-red">⚠</span>}
                </div>
                {s.text && <p className="mt-1"><PlainText text={s.text} /></p>}
              </button>
            </li>
          ))}
        </ol>
      </Section>

      {a.strengths.length > 0 && (
        <Section title="Điểm hay">
          <ul className="flex flex-col gap-1 text-sm">{a.strengths.map((s) => <li key={s.step}>✅ (bước {s.step}) <PlainText text={s.text} /></li>)}</ul>
        </Section>
      )}

      {a.weak_points.length > 0 && (
        <Section title="Điểm dở — Nhận định của AI">
          <ul className="flex flex-col gap-2">
            {a.weak_points.map((w) => (
              <li key={`${w.skill}-${w.step}`} className="rounded-lg border border-red/50 bg-red/5 px-3 py-2 text-sm">
                <p className="text-xs text-red"><b>Điểm dở — Nhận định của AI</b> · <span className="font-mono">{w.file_path} dòng {w.line_start}–{w.line_end}</span> · {w.skill}</p>
                <p className="mt-1"><PlainText text={w.what} /></p>
                <p className="mt-0.5 text-muted">Hậu quả: <PlainText text={w.consequence} /></p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.shared_files.length > 0 && (
        <Section title="Liên quan">
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {a.shared_files.map((f) => (
              <li key={f.file_path}>Dùng chung <code className="font-mono">{f.file_path.split("/").pop()}</code> với{" "}
                {f.node_ids.map((id) => <Chip key={id} className="mr-1" onClick={() => progress?.nodes[id]?.status !== "LOCKED" && useWorkbench.getState().openNode(id)}>{result?.nodes.find((n) => n.id === id)?.title ?? id}</Chip>)}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Chỉ số">
        <p className="text-sm text-muted">
          {ub.is_exempt ? "Uncle Bob: Miễn trừ" : <>Uncle Bob: I {ub.instability} · A {ub.abstractness} · D {ub.distance} — {ub.diagnosis}</>} · Độ phức tạp nhận thức: {node.cognitive_complexity}
        </p>
      </Section>

      {state?.status === "AVAILABLE" && (!run || (open ?? 0) > 0 || !state.last_run?.finished_at) && (
        <div className="mt-5">
          <Button onClick={startQuestions} disabled={!!pending[`enrich:${node.id}`] && !run}>
            {pending[`enrich:${node.id}`] && !run ? "Đang chuẩn bị câu hỏi…" : `Bắt đầu trả lời${open !== null ? ` (${open})` : ""}`}
          </Button>
        </div>
      )}
      {(state?.status === "COMPLETED" || state?.status === "FAILED") && <p className="mt-4 text-xs text-muted">Không có ôn tập: node giữ nguyên màu (D-35).</p>}
    </div>
  );
}
