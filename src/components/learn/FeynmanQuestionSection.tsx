"use client";
// 30 Mục 6.2 — Feynman: danh sách câu, ô trả lời (kiểm trước khi gửi, UI-52), kết quả nộp, gợi ý, đáp án khi xong, Bỏ qua / Báo sai, tổng kết run.
import { useState } from "react";
import { CONFIG } from "@/contracts/config";
import type { EvaluateFeynmanResponse, QuestionView } from "@/contracts";
import { Button, Chip, Modal, PlainText, cn, fmt4 } from "@/components/ui/common";
import { tierOf } from "@/lib/bkt-engine";
import { useWorkbench } from "@/store/workbench";

const outcomeIcon = (q: QuestionView) => {
  const s = q.state;
  if (s.ended_by === "DROPPED") return "⊘";
  if (s.disputed) return "🚩";
  if (!s.finished) return s.attempts_used > 0 ? "✍" : "⏳";
  return s.outcome === "FAILED" ? "❌" : "✅";
};

function Eval({ d }: { d: EvaluateFeynmanResponse }) {
  const setStep = useWorkbench((s) => s.setActiveStep);
  return (
    <div aria-live="polite" className="mt-3 rounded-xl border border-line bg-panel-2 p-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-muted">Độ chính xác</span>
        <div className="relative h-2 flex-1 rounded bg-white/10">
          <div className="bar-grow h-full rounded bg-amber" style={{ width: `${d.core_accuracy}%` }} />
          <span className="absolute -top-1 h-4 w-0.5 bg-white/70" style={{ left: `${CONFIG.PASS_CORE_ACCURACY}%` }} title={`Ngưỡng đạt ${CONFIG.PASS_CORE_ACCURACY}`} />
        </div>
        <b>{d.core_accuracy}</b>
      </div>
      <p className="mt-1 text-xs text-muted">Đơn giản: {d.simplicity} (không ảnh hưởng Đạt)</p>
      <p className="mt-2"><PlainText text={d.feedback} /></p>
      {d.detected_jargons.length > 0 && <p className="mt-1 text-xs text-muted">Thuật ngữ bạn dùng: {d.detected_jargons.join(", ")}</p>}
      <p className="mt-2 text-xs">Ý bắt buộc: {d.points_covered.map((c, i) => <span key={i} className={c ? "text-green" : "text-muted"}>{c ? "●" : "○"} </span>)}</p>
      {d.intent === "OFF_TOPIC" && <p className="mt-2 text-xs text-amber">Câu trả lời bị coi là lạc đề — mất 1 lượt, không có gợi ý.</p>}
      {d.intent === "GIVE_UP" && <p className="mt-2 text-xs text-amber">Đã tính 1 lượt chưa đạt.</p>}
      {d.follow_up && (
        <div className="mt-3 rounded-lg border border-violet/50 bg-violet/10 p-3">
          <p className="text-xs font-bold text-violet">Gợi ý</p>
          <p className="mt-1"><PlainText text={d.follow_up.question} /></p>
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

  if (!id) return <aside className="p-4 text-sm text-muted">Chọn một node để bắt đầu trả lời câu hỏi.</aside>;
  if (!ready) return <aside className="p-4"><p className="text-sm text-muted" title="Cần bản phân tích trước khi đặt câu hỏi">Cần bản phân tích trước khi đặt câu hỏi.</p></aside>;
  if (!run) {
    const loading = ui.pending[`enrich:${id}`];
    const finishedRun = state?.last_run;
    if (!loading && finishedRun) {
      return <aside className="p-4"><RunReadOnly questions={finishedRun.questions} /></aside>;
    }
    return (
      <aside className="p-4" aria-live="polite">
        {loading ? <p className="flex items-center gap-2 text-sm text-muted"><span className="spinner inline-block h-4 w-4 rounded-full border-2 border-amber border-t-transparent" />Đang chuẩn bị câu hỏi…</p>
          : ui.submit_error ? (
            <div className="text-sm"><p className="text-red">⚠ {ui.submit_error.message}</p><Button className="mt-2" onClick={() => useWorkbench.getState().startQuestions()}>Thử lại</Button></div>
          ) : <p className="text-sm text-muted">Câu hỏi sẽ hiện khi node sẵn sàng.</p>}
      </aside>
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
  const maxA = CONFIG.MAX_ATTEMPTS_PER_QUESTION;

  const doSubmit = async () => { await submitAnswer(draft); if (useWorkbench.getState().ui.submit_error) setShake((n) => n + 1); };

  return (
    <aside aria-label="Câu hỏi Feynman" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {qs.map((x) => (
          <button key={x.question_index} type="button" aria-pressed={x.question_index === q.question_index} onClick={() => setActiveQuestion(x.question_index)}
            title={x.state.ended_by === "DROPPED" ? "AI không đặt được câu này — không tính" : undefined}
            className={cn("rounded-lg border px-2 py-1 text-xs", x.question_index === q.question_index ? "border-amber bg-amber/10" : "border-line hover:border-muted")}>
            {outcomeIcon(x)} Câu {x.question_index}/{qs.length} · {x.skill} · {x.tier}
          </button>
        ))}
      </div>

      {dropped ? <p className="text-sm text-muted">⊘ AI không đặt được câu này — không tính.</p> : (
        <>
          <header className="text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Câu {q.question_index}/{qs.length} · <b className="text-text">{q.skill}</b> · {q.tier} · {q.focus}</span>
              <span aria-label={`Lượt ${q.state.attempts_used} trên ${maxA}`}>lượt {Array.from({ length: maxA }, (_, i) => (i < q.state.attempts_used ? "●" : "○")).join("")}</span>
            </div>
            <p className="mt-2 text-base font-semibold leading-snug"><PlainText text={q.feynman_question} /></p>
          </header>

          {!q.state.finished ? (
            <div>
              <textarea aria-label="Câu trả lời của bạn" value={draft} disabled={busy || quota} maxLength={CONFIG.ANSWER_MAX_CHARS} rows={5}
                key={shake} onChange={(e) => { setDraft(key, e.target.value); if (ui.submit_error) setUi({ submit_error: null }); }}
                onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter" && !busy) { e.preventDefault(); void doSubmit(); } }}
                placeholder="Giải thích bằng lời của bạn…"
                className={cn("w-full resize-y rounded-lg border bg-panel-2 p-3 text-sm outline-none focus:border-amber", shake > 0 && "shake", ui.submit_error ? "border-red" : "border-line")} />
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span aria-live="polite" className="text-red">{ui.submit_error ? `⚠ ${ui.submit_error.message}` : ""}</span>
                <span>{[...draft].length}/{CONFIG.ANSWER_MAX_CHARS}</span>
              </div>
              {quota && <p className="mt-1 text-xs text-red">Hết hạn mức AI của phiên — không chấm được bài mới.</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button disabled={busy || quota || !draft.trim()} onClick={() => void doSubmit()}>{busy ? "Đang chấm…" : "Nộp (Ctrl+Enter)"}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setSkipOpen(true)}>Bỏ qua câu này</Button>
                {ui.submit_error?.retryable && !busy && <Button variant="ghost" onClick={() => void doSubmit()}>Thử lại</Button>}
              </div>
            </div>
          ) : (
            <Reveal q={q} />
          )}

          {evalRes && !q.state.finished && <Eval d={evalRes} />}
          {evalRes && q.state.finished && <Eval d={evalRes} />}

          {q.state.finished && change && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <Chip tone={change.outcome === "FAILED" ? "red" : "green"}>{change.skill}: {fmt4(change.p_before)} → {fmt4(change.p_after)}</Chip>
              <span className="text-xs text-muted">{tierOf(change.p_before)} → {tierOf(change.p_after)}</span>
            </p>
          )}

          {q.state.finished && q.state.outcome === "FAILED" && q.state.ended_by === "ANSWER" && !q.state.disputed && !offline && (
            <div><Button variant="ghost" onClick={() => { setNote(""); setReportOpen(true); }}>🚩 Báo sai</Button></div>
          )}
          {q.state.disputed && <p className="text-xs text-amber">🚩 Đã báo sai — điểm kỹ năng được hoàn lại nếu chưa có cập nhật khác.</p>}

          {q.state.finished && nextOpen && <div><Button onClick={() => setActiveQuestion(nextOpen.question_index)}>Câu tiếp theo</Button></div>}
        </>
      )}

      {runDone && (
        <div aria-live="polite" className={cn("rounded-xl border p-3 text-sm", state?.status === "FAILED" ? "border-red/50 bg-red/5" : "border-green/50 bg-green/5")}>
          <p className="font-semibold">{countable.map((x) => `${x.state.disputed ? "🚩" : x.state.outcome === "FAILED" ? "❌" : "✅"} ${x.skill}`).join(" · ")}</p>
          {state?.status === "FAILED"
            ? <p className="mt-1">Chưa đạt — các node sau vẫn mở, kèm ⚠.</p>
            : <p className="mt-1">Hoàn thành node. {ui.newly_unlocked.length > 0 && <>Vừa mở: {ui.newly_unlocked.map((n) => <Chip key={n} className="mr-1" tone="green">{useWorkbench.getState().result?.nodes.find((x) => x.id === n)?.title}</Chip>)}</>}</p>}
        </div>
      )}

      <Modal open={skipOpen} onClose={() => setSkipOpen(false)} title="Bỏ qua câu này?"
        footer={<><Button variant="ghost" onClick={() => setSkipOpen(false)}>Hủy</Button><Button variant="danger" onClick={() => { setSkipOpen(false); void skipQuestion(); }}>Bỏ qua</Button></>}>
        <p className="text-sm text-muted">Câu này sẽ tính là CHƯA ĐẠT cho {q.skill} và hiện đáp án.</p>
      </Modal>
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Báo sai câu này"
        footer={<><Button variant="ghost" onClick={() => setReportOpen(false)}>Hủy</Button><Button onClick={async () => { const ok = await reportWrong(q.question_index, note); if (ok) setReportOpen(false); }}>Gửi báo sai</Button></>}>
        <label className="text-sm text-muted" htmlFor="note">Ghi chú (không bắt buộc, ≤ {CONFIG.REPORT_NOTE_MAX_CHARS} ký tự)</label>
        <textarea id="note" value={note} maxLength={CONFIG.REPORT_NOTE_MAX_CHARS} onChange={(e) => setNote(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-line bg-panel-2 p-2 text-sm" />
      </Modal>
    </aside>
  );
}

function Reveal({ q }: { q: QuestionView }) {
  const r = q.state.reveal;
  if (!r) return <p className="text-sm text-muted">Câu đã kết thúc.</p>;
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-3 text-sm">
      <p className="text-xs font-bold text-blue">Đáp án tham khảo do AI viết</p>
      <p className="mt-1"><PlainText text={r.reference_answer} /></p>
      <p className="mt-3 text-xs font-bold text-muted">Ý bắt buộc</p>
      <ul className="mt-1 list-disc pl-5">{r.must_have_points.map((p, i) => <li key={i}><PlainText text={p} /></li>)}</ul>
      <p className="mt-3 text-xs font-bold text-muted">Cách sửa</p>
      <p className="mt-1"><PlainText text={r.fix} /></p>
    </div>
  );
}

function RunReadOnly({ questions }: { questions: Array<import("@/contracts").QuestionState> }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-muted">Run cuối (chỉ đọc).</p>
      {questions.map((q) => (
        <div key={q.question_index} className="rounded-lg border border-line p-3">
          <p className="text-xs text-muted">{q.ended_by === "DROPPED" ? "⊘" : q.disputed ? "🚩" : q.outcome === "FAILED" ? "❌" : "✅"} Câu {q.question_index} · {q.skill} · {q.tier}</p>
          {q.feynman_question && <p className="mt-1 font-semibold"><PlainText text={q.feynman_question} /></p>}
          {q.reveal && <div className="mt-2"><p className="text-xs font-bold text-blue">Đáp án tham khảo do AI viết</p><p><PlainText text={q.reveal.reference_answer} /></p></div>}
        </div>
      ))}
    </div>
  );
}
