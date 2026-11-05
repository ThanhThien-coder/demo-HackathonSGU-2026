// 03 Mục 5, 6.5 + 22 BKT-62 — dựng trạng thái node, áp BKT, chốt run.
import type {
  NodeOutcome, NodeRunView, NodeStateView, QuestionState, QuestionView, SWESkill,
  SessionProgress, SkillChange,
} from "@/contracts";
import { computeSkillChange } from "@/lib/bkt-engine";
import { deriveNodeStates } from "@/lib/derive";
import { nodeStatusFromRuns } from "@/lib/plan";
import {
  Q, RunRow, SessionFull, finishRun, loadProgressRows, loadRunsOfSession, lockSkill, saveSkill, upsertProgress,
} from "./store";

/** QuestionState gửi client: reveal chỉ khi câu xong (INV-07). */
export function toQuestionState(q: RunRow["questions"][number]): QuestionState {
  return {
    question_index: q.question_index, feynman_question: q.feynman_question, skill: q.skill, tier: q.tier, focus: q.focus,
    attempts_used: q.attempts_used, finished: q.finished, outcome: q.outcome, ended_by: q.ended_by, disputed: q.disputed,
    reveal: q.finished && q.ended_by !== "DROPPED"
      ? { reference_answer: q.reference_answer, must_have_points: q.must_have_points, fix: q.fix }
      : null,
  };
}

export function toRunView(r: RunRow): NodeRunView {
  return {
    run_id: r.id, node_id: r.node_id, mode: r.mode, started_at: r.started_at, finished_at: r.finished_at,
    questions: r.questions.map(toQuestionState),
  };
}

export function toQuestionViews(r: RunRow): QuestionView[] {
  return r.questions.map((q) => ({
    question_index: q.question_index, skill: q.skill, tier: q.tier, focus: q.focus,
    feynman_question: q.feynman_question, state: toQuestionState(q),
  }));
}

/** Trạng thái mọi node của phiên (suy ra từ khung + node_progress + run cuối). */
export async function loadNodeStates(q: Q, session: SessionFull): Promise<Record<string, NodeStateView>> {
  const [rows, runs] = await Promise.all([loadProgressRows(q, session.id), loadRunsOfSession(q, session.id)]);
  const derived = deriveNodeStates(session.graph_skeleton, rows);
  const lastRun = new Map<string, RunRow>();
  for (const r of runs) lastRun.set(r.node_id, r); // runs tăng dần theo started_at ⇒ run cuối thắng
  const out: Record<string, NodeStateView> = {};
  for (const [id, d] of Object.entries(derived)) {
    const run = lastRun.get(id);
    out[id] = { ...d, last_run: run ? toRunView(run) : null };
  }
  return out;
}

export async function loadProgress(q: Q, session: SessionFull): Promise<SessionProgress> {
  const [nodes, tokens] = await Promise.all([
    loadNodeStates(q, session),
    q<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${session.id}`,
  ]);
  return { session_id: session.id, nodes, tokens_used: tokens[0]?.tokens_used ?? session.tokens_used };
}

export async function loadNodeState(q: Q, session: SessionFull, nodeId: string): Promise<NodeStateView | null> {
  return (await loadNodeStates(q, session))[nodeId] ?? null;
}

/** BKT-62: insert mặc định → select for update → computeSkillChange → upsert. */
export async function applyBkt(q: Q, userId: string, skill: SWESkill, outcome: NodeOutcome, now: number): Promise<SkillChange> {
  const state = await lockSkill(q, userId, skill, now);
  // dòng vừa chèn mặc định (practice_count = 0) ⇒ coi như chưa có state: tiên nghiệm = BKT_P_L0, không decay
  const prior = state.practice_count === 0 ? undefined : state;
  const { next, change } = computeSkillChange(skill, prior, outcome, now);
  await saveSkill(q, userId, next);
  return change;
}

/** 6.5: run xong khi mọi câu finished. Trả node_id vừa mở khóa. */
export async function finalizeRunIfDone(q: Q, session: SessionFull, run: RunRow): Promise<string[]> {
  if (!run.questions.every((x) => x.finished)) return [];
  const before = await loadNodeStates(q, session);
  if (!run.finished_at) await finishRun(q, run.id);
  return recomputeNodeColor(q, session, run, before);
}

/** Tính lại màu node từ run (dùng cho chốt run và Báo sai). */
export async function recomputeNodeColor(q: Q, session: SessionFull, run: RunRow, before?: Record<string, NodeStateView>): Promise<string[]> {
  const prev = before ?? (await loadNodeStates(q, session));
  const status = nodeStatusFromRuns([{
    mode: run.mode, started_at: run.started_at, finished_at: run.finished_at ?? Date.now(),
    questions: run.questions.map((x) => ({
      question_index: x.question_index, skill: x.skill, focus: x.focus,
      outcome: x.ended_by === "DROPPED" ? null : x.outcome, ended_by: x.ended_by, disputed: x.disputed,
    })),
  }]);
  if (status) await upsertProgress(q, session.id, run.node_id, { status });
  const after = await loadNodeStates(q, session);
  return Object.values(after)
    .filter((n) => n.status !== "LOCKED" && prev[n.node_id]?.status === "LOCKED")
    .map((n) => n.node_id)
    .sort();
}
