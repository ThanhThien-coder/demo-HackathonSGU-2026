"use client";
// 30 Mục 6.2 — Feynman: danh sách câu, ô trả lời (kiểm trước khi gửi, UI-52), kết quả nộp, gợi ý, đáp án khi xong (UI-54), Bỏ qua / Báo sai, tổng kết run (UI-57).
import { useState } from "react";
import { Flag, Lightbulb, Send, SkipForward, Sparkles } from "lucide-react";
import { CONFIG } from "@/contracts/config";
import type { EvaluateFeynmanResponse, QuestionState, QuestionView } from "@/contracts";
import { Button, Chip, Kbd, Modal, PlainText, cn, fmt4 } from "@/components/ui/common";
import { tierOf } from "@/lib/bkt-engine";
import { useWorkbench } from "@/store/workbench";

const outcomeIcon = (s: QuestionState) => {
  if (s.ended_by === "DROPPED") return "⊘";
  if (s.disputed) return "🚩";
  if (!s.finished) return s.attempts_used > 0 ? "✍" : "⏳";
  return s.outcome === "FAILED" ? "❌" : "✅";
};

function Attempts({ used }: { used: number }) {
  const max = CONFIG.MAX_ATTEMPTS_PER_QUESTION;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Lượt ${used} trên ${max}`}>
      <span className="text-muted">lượt</span>
      {Array.from({ length: max }, (_, i) => <span key={i} aria-hidden className={cn("h-2 w-2 rounded-full", i < used ? "bg-gradient-to-br from-accent to-accent-2" : "border border-muted/60")} />)}
    </span>
  );
}

function Eval({ d }: { d: EvaluateFeynmanResponse }) {
  const setStep = useWorkbench((s) => s.setActiveStep);
  const pass = d.core_accuracy >= CONFIG.PASS_CORE_ACCURACY;
  return (
    <div aria-live="polite" className="anim-fade-up rounded-xl border border-line bg-panel p-3 text-sm shadow-[var(--shadow)]">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-muted">Độ chính xác</span>
        <div className="relative h-2 flex-1 rounded bg-white/10">
          <div className={cn("bar-grow h-full rounded", pass ? "bg-green" : "bg-amber")} style={{ width: `${d.core_accuracy}%` }} />
          <span className="absolute -top-1 h-4 w-0.5 bg-white/70" style={{ left: `${CONFIG.PASS_CORE_ACCURACY}%` }} title={`Ngưỡng đạt ${CONFIG.PASS_CORE_ACCURACY}`} />
        </div>
        <b className="font-mono">{d.core_accuracy}</b>
      </div>
      <p className="mt-1 text-xs text-muted">Đơn giản: {d.simplicity} (không ảnh hưởng Đạt)</p>
      <p className="mt-2 leading-relaxed"><PlainText text={d.feedback} /></p>
      {d.detected_jargons.length > 0 && <p className="mt-1 text-xs text-muted">Thuật ngữ bạn dùng: {d.detected_jargons.join(", ")}</p>}
      <p className="mt-2 text-xs">Ý bắt buộc: {d.points_covered.map((c, i) => <span key={i} className={c ? "text-green" : "text-muted"}>{c ? "●" : "○"} </span>)}</p>
      {d.intent === "OFF_TOPIC" && <p className="mt-2 text-xs text-amber">Câu trả lời bị coi là lạc đề — mất 1 lượt, không có gợi ý.</p>}
      {d.intent === "GIVE_UP" && <p className="mt-2 text-xs text-amber">Đã tính 1 lượt chưa đạt.</p>}
      {d.follow_up && (
        <div className="sf-callout mt-3 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-violet"><Lightbulb aria-hidden className="h-3.5 w-3.5" />Gợi ý</p>
          <p className="mt-1 leading-relaxed"><PlainText text={d.follow_up.question} /></p>
          {d.follow_up.type === "CODE_POINTER" && d.follow_up.step_index !== null && (
            <button type="button" className="mt-2 text-xs text-violet underline" onClick={() => setStep(d.follow_up!.step_index)}>Xem bước {d.follow_up.step_index}</button>
          )}
        </div>
      )}
    </div>
  );
}

export function FeynmanQuestionSection() {
  const { runs, active_node_id, active_question_index, progress } = useWorkbench();
  const ui = useWorkbench((s) => s.ui);
  const analyses = useWorkbench((s) => s.analyses);
  const offline = useWorkbench((s) => s.is_offline_mode);
  const { setActiveQuestion, setDraft, submitAnswer, skipQuestion, reportWrong, setUi } = useWorkbench.getState();
  const [skipOpen, setSkipOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(0);

  const id = active_node_id;
  const state = id ? progress?.nodes[id] : null;
  const run = id ? runs[id] : null;
  const a = id ? analyses[id] : undefined;
  const ready = !!a && a !== "PENDING" && a !== "FAILED";

  if (!id) return <div className="p-4 text-sm text-muted">Chọn một node để bắt đầu trả lời câu hỏi.</div>;
  if (!ready) return <div className="p-4"><p className="text-sm text-muted" title="Cần bản phân tích trước khi đặt câu hỏi">Cần bản phân tích trước khi đặt câu hỏi.</p></div>;
  if (!run) {
    const loading = ui.pending[`enrich:${id}`];
    const finishedRun = state?.last_run;
    if (!loading && finishedRun) {
      return <div className="p-4"><RunReadOnly questions={finishedRun.questions} /></div>;
    }
    return (
      <div className="p-4" aria-live="polite">
        {loading ? <p className="flex items-center gap-2 text-sm text-muted"><span className="spinner inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent" />Đang chuẩn bị câu hỏi…</p>
          : ui.submit_error ? (
            <div className="text-sm"><p className="text-red">⚠ {ui.submit_error.message}</p><Button className="mt-2" onClick={() => useWorkbench.getState().startQuestions()}>Thử lại</Button></div>
          ) : <p className="text-sm text-muted">Câu hỏi sẽ hiện khi node sẵn sàng.</p>}
      </div>
    );
  }

  const qs = run.questions;
  const q = qs.find((x) => x.question_index === active_question_index) ?? qs.find((x) => !x.state.finished) ?? qs[0];
  const key = `${run.run_id}:${q.question_index}`;
  const evalRes = ui.last_evaluations[key];
  const change = ui.last_changes[key];
  const draft = ui.drafts[key] ?? "";
  const busy = !!ui.pending[`submit:${key}`];
  const quota = (progress?.tokens_used ?? 0) >= CONFIG.SESSION_TOKEN_QUOTA && !offline;
  const dropped = q.state.ended_by === "DROPPED";
  const countable = qs.filter((x) => x.state.ended_by !== "DROPPED");
  const runDone = countable.every((x) => x.state.finished);
  const nextOpen = qs.find((x) => !x.state.finished && x.question_index !== q.question_index);
  const canReport = q.state.finished && q.state.outcome === "FAILED" && q.state.ended_by === "ANSWER" && !q.state.disputed;

  const doSubmit = async () => { await submitAnswer(draft); if (useWorkbench.getState().ui.submit_error) setShake((n) => n + 1); };

  return (
    <div aria-label="Câu hỏi Feynman" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-1.5" aria-label="Danh sách câu">
        {qs.map((x) => (
          <button key={x.question_index} type="button" aria-pressed={x.question_index === q.question_index} onClick={() => setActiveQuestion(x.question_index)}
            title={x.state.ended_by === "DROPPED" ? "AI không đặt được câu này — không tính" : `${x.skill} · ${x.tier}`}
            className={cn("rounded-lg border px-2 py-1 text-xs transition-colors", x.question_index === q.question_index ? "border-accent/60 bg-accent/10 font-semibold text-text" : "border-line bg-panel-2 text-muted hover:border-line-strong hover:text-text")}>
            {outcomeIcon(x.state)} Câu {x.question_index}/{qs.length} · <span className="font-mono">{x.skill}</span>
          </button>
        ))}
      </div>

      {dropped ? <p className="text-sm text-muted">⊘ AI không đặt được câu này — không tính.</p> : (
        <>
          <header key={q.question_index} className="anim-fade-up flex items-start gap-2.5">
            <span aria-hidden title="Câu hỏi do AI đặt" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-on-accent shadow-[var(--shadow)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-panel p-3 shadow-[var(--shadow)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">AI hỏi</span>
                <span>Câu {q.question_index}/{qs.length} · <b className="font-mono text-text-2">{q.skill}</b> · {q.tier} · {q.focus}</span>
                <Attempts used={q.state.attempts_used} />
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-text"><PlainText text={q.feynman_question} /></p>
            </div>
          </header>

          {!q.state.finished ? (
            <div>
              <div key={shake} className={cn("sf-field overflow-hidden rounded-xl border bg-panel shadow-[var(--shadow)]", shake > 0 && "shake", ui.submit_error ? "border-red" : "border-line-strong")}>
                <p className="border-b border-line bg-panel-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">Câu trả lời của bạn</p>
                <textarea aria-label="Câu trả lời của bạn" value={draft} disabled={busy || quota} maxLength={CONFIG.ANSWER_MAX_CHARS} rows={6}
                  onChange={(e) => { setDraft(key, e.target.value); if (ui.submit_error) setUi({ submit_error: null }); }}
                  onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter" && !busy) { e.preventDefault(); void doSubmit(); } }}
                  placeholder="Giải thích bằng lời của bạn, như đang kể cho một người chưa học IT…"
                  className="block w-full resize-y bg-transparent p-3 text-sm leading-relaxed text-text outline-none placeholder:text-subtle disabled:opacity-60" />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                <span aria-live="polite" className="text-red">{ui.submit_error ? `⚠ ${ui.submit_error.message}` : ""}</span>
                <span className="shrink-0 font-mono text-subtle">{[...draft].length}/{CONFIG.ANSWER_MAX_CHARS}</span>
              </div>
              {quota && <p className="mt-1 text-xs text-red">Hết hạn mức AI của phiên — không chấm được bài mới.</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button disabled={busy || quota || !draft.trim()} onClick={() => void doSubmit()} className="inline-flex items-center gap-1.5">
                  <Send aria-hidden className="h-3.5 w-3.5" />{busy ? "Đang chấm…" : "Nộp"}
                </Button>
                <span className="hidden items-center gap-1 text-xs text-subtle sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd></span>
                {ui.submit_error?.retryable && !busy && <Button variant="ghost" onClick={() => void doSubmit()}>Thử lại</Button>}
                <Button variant="ghost" disabled={busy} onClick={() => setSkipOpen(true)} className="ml-auto inline-flex items-center gap-1.5">
                  <SkipForward aria-hidden className="h-3.5 w-3.5" />Bỏ qua câu này
                </Button>
              </div>
            </div>
          ) : (
            <Reveal q={q} />
          )}

          {evalRes && <Eval d={evalRes} />}

          {q.state.finished && change && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <Chip tone={change.outcome === "FAILED" ? "red" : "green"}>{change.skill}: {fmt4(change.p_before)} → {fmt4(change.p_after)}</Chip>
              <span className="text-xs text-muted">{tierOf(change.p_before)} → {tierOf(change.p_after)}</span>
            </p>
          )}

          {canReport && (
            <div>
              <Button variant="ghost" disabled={offline} title={offline ? "Chế độ Offline không gửi báo sai" : undefined}
                onClick={() => { setNote(""); setReportOpen(true); }} className="inline-flex items-center gap-1.5">
                <Flag aria-hidden className="h-3.5 w-3.5" />Báo sai
              </Button>
            </div>
          )}
          {q.state.disputed && <p className="text-xs text-amber">🚩 Đã báo sai — điểm kỹ năng được hoàn lại nếu chưa có cập nhật khác.</p>}

          {q.state.finished && nextOpen && <div><Button onClick={() => setActiveQuestion(nextOpen.question_index)}>Câu tiếp theo →</Button></div>}
        </>
      )}

      {runDone && (
        <div aria-live="polite" className={cn("anim-fade-up rounded-xl border p-3 text-sm", state?.status === "FAILED" ? "border-red/50 bg-red/5" : "border-green/50 bg-green/5")}>
          <p className="font-semibold">{countable.map((x) => `${x.state.disputed ? "🚩" : x.state.outcome === "FAILED" ? "❌" : "✅"} ${x.skill}`).join(" · ")}</p>
          {state?.status === "FAILED"
            ? <p className="mt-1">Chưa đạt — các node sau vẫn mở, kèm ⚠.</p>
            : <p className="mt-1">Hoàn thành node. {ui.newly_unlocked.length > 0 && <>Vừa mở: {ui.newly_unlocked.map((n) => <Chip key={n} className="mr-1" tone="green" onClick={() => useWorkbench.getState().openNode(n)}>{useWorkbench.getState().result?.nodes.find((x) => x.id === n)?.title}</Chip>)}</>}</p>}
        </div>
      )}

      <Modal open={skipOpen} onClose={() => setSkipOpen(false)} title="Bỏ qua câu này?"
        footer={<><Button variant="ghost" onClick={() => setSkipOpen(false)}>Hủy</Button><Button variant="danger" onClick={() => { setSkipOpen(false); void skipQuestion(); }}>Bỏ qua</Button></>}>
        <p className="text-sm text-muted">Câu này sẽ tính là CHƯA ĐẠT cho {q.skill} và hiện đáp án.</p>
      </Modal>
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Báo sai câu này"
        footer={<><Button variant="ghost" onClick={() => setReportOpen(false)}>Hủy</Button><Button onClick={async () => { const ok = await reportWrong(q.question_index, note); if (ok) setReportOpen(false); }}>Gửi báo sai</Button></>}>
        <label className="text-sm text-muted" htmlFor="note">Ghi chú (không bắt buộc, ≤ {CONFIG.REPORT_NOTE_MAX_CHARS} ký tự)</label>
        <textarea id="note" value={note} maxLength={CONFIG.REPORT_NOTE_MAX_CHARS} onChange={(e) => setNote(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-line-strong bg-panel p-2 text-sm text-text outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)]" />
      </Modal>
    </div>
  );
}

function Reveal({ q }: { q: QuestionView }) {
  const r = q.state.reveal;
  if (!r) return <p className="text-sm text-muted">Câu đã kết thúc.</p>;
  const last = useWorkbench.getState().ui.last_evaluations;
  const runId = useWorkbench.getState().runs[useWorkbench.getState().active_node_id ?? ""]?.run_id;
  const covered = runId ? last[`${runId}:${q.question_index}`]?.points_covered : undefined;
  return (
    <div className="sf-callout anim-fade-up p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet"><Sparkles aria-hidden className="h-3.5 w-3.5" />Đáp án tham khảo do AI viết</p>
      <p className="mt-1 leading-relaxed"><PlainText text={r.reference_answer} /></p>
      <p className="mt-3 text-xs font-bold text-muted">Ý bắt buộc</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {r.must_have_points.map((p, i) => (
          <li key={i} className="flex gap-1.5">
            <span className={covered ? (covered[i] ? "text-green" : "text-red") : "text-muted"}>{covered ? (covered[i] ? "✓" : "✗") : "•"}</span>
            <PlainText text={p} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-bold text-muted">Cách sửa</p>
      <p className="mt-1 leading-relaxed"><PlainText text={r.fix} /></p>
    </div>
  );
}

function RunReadOnly({ questions }: { questions: QuestionState[] }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-muted">Run cuối (chỉ đọc).</p>
      {questions.map((q) => (
        <div key={q.question_index} className="rounded-xl border border-line bg-panel p-3 shadow-[var(--shadow)]">
          <p className="text-xs text-muted">{outcomeIcon(q)} Câu {q.question_index} · <span className="font-mono">{q.skill}</span> · {q.tier}</p>
          {q.feynman_question && <p className="mt-1 font-semibold"><PlainText text={q.feynman_question} /></p>}
          {q.reveal && (
            <div className="sf-callout mt-2 p-2">
              <p className="text-xs font-bold text-violet">Đáp án tham khảo do AI viết</p>
              <p className="mt-1"><PlainText text={q.reveal.reference_answer} /></p>
              <p className="mt-2 text-xs font-bold text-muted">Cách sửa</p>
              <p className="mt-1"><PlainText text={q.reveal.fix} /></p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
