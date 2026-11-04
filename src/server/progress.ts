import {
  CONFIG,
  type CognitiveSkillState,
  type DbTx,
  type GraphSkeletonNode,
  type NodeOutcome,
  type NodeRunView,
  type NodeStateView,
  type NodeStatus,
  type QuestionReveal,
  type QuestionState,
  type RunMode,
  type RunQuestion,
  type RunStepRef,
  type SessionProgress,
  type SkillChange,
  type SWESkill,
} from "@/contracts";
import { computeSkillChange } from "@/lib/bkt-engine";
import { deriveNodeStates } from "@/lib/derive";
import { nodeStatusFromRuns } from "@/lib/plan";
import { sql, type TransactionSql } from "./db";
import { ApiHttpError } from "./errors";
import { logger } from "./log";
import type { RunRecord } from "./session";

interface ProgressDbRow {
  node_id: string;
  status: Exclude<NodeStatus, "LOCKED"> | null;
  analysis_failed: boolean;
}

interface RunDbRow {
  id: string;
  session_id: string;
  node_id: string;
  mode: RunMode;
  questions: RunQuestion[];
  started_at: string | Date;
  finished_at: string | Date | null;
}

/**
 * RunQuestion => QuestionState cho client (API-03, INV-07).
 * Chi co reveal khi cau da xong (03 Muc 6.2 "Quy tac mo dap an").
 */
export function toQuestionState(q: RunQuestion): QuestionState {
  const reveal: QuestionReveal | null = q.finished
    ? {
        reference_answer: q.reference_answer,
        must_have_points: q.must_have_points,
        fix: q.fix,
      }
    : null;

  return {
    question_index: q.question_index,
    feynman_question: q.feynman_question,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    attempts_used: q.attempts_used ?? 0,
    finished: Boolean(q.finished),
    outcome: q.outcome ?? null,
    ended_by: q.ended_by ?? null,
    disputed: Boolean(q.disputed),
    reveal,
  };
}

function toRunView(row: Pick<RunDbRow, "id" | "node_id" | "mode" | "questions" | "started_at" | "finished_at">): NodeRunView {
  return {
    run_id: row.id,
    node_id: row.node_id,
    mode: row.mode,
    started_at: new Date(row.started_at).getTime(),
    finished_at: row.finished_at ? new Date(row.finished_at).getTime() : null,
    questions: (row.questions ?? []).map(toQuestionState),
  };
}

/**
 * Lay tien do hoc tap cua phien (03_API_VA_LUU_TRU.md Muc 2 dong 13, Muc 5.1).
 * Chi doc co so du lieu: graph_skeleton + node_progress + node_runs => deriveNodeStates.
 * Khong chay engine, khong goi AI.
 */
export async function getSessionProgress(
  sessionId: string,
  userId: string
): Promise<SessionProgress> {
  const sessionRows = await sql<Array<{
    id: string;
    user_id: string;
    graph_skeleton: GraphSkeletonNode[];
    tokens_used: number;
  }>>`
    SELECT id, user_id, graph_skeleton, tokens_used
    FROM learning_sessions
    WHERE id = ${sessionId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (sessionRows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const session = sessionRows[0];
  const skeleton = session.graph_skeleton ?? [];

  // Doc node_progress
  const progressRows = await sql<ProgressDbRow[]>`
    SELECT node_id, status, analysis_failed
    FROM node_progress
    WHERE session_id = ${sessionId}
  `;

  // Doc node_runs de tim run moi nhat cho tung node
  const runRows = await sql<RunDbRow[]>`
    SELECT id, session_id, node_id, mode, questions, started_at, finished_at
    FROM node_runs
    WHERE session_id = ${sessionId}
    ORDER BY started_at ASC
  `;

  const latestRunByNode = new Map<string, NodeRunView>();
  for (const row of runRows) {
    latestRunByNode.set(row.node_id, toRunView(row));
  }

  // Goi deriveNodeStates (03 Muc 5.1)
  const derivedStates = deriveNodeStates(skeleton, progressRows);

  const nodes: Record<string, NodeStateView> = {};
  for (const node of skeleton) {
    const derived = derivedStates[node.node_id] ?? {
      node_id: node.node_id,
      status: "LOCKED" as const,
      has_warning: false,
      analysis_failed: false,
    };

    nodes[node.node_id] = {
      node_id: node.node_id,
      status: derived.status,
      has_warning: derived.has_warning,
      analysis_failed: derived.analysis_failed,
      last_run: latestRunByNode.get(node.node_id) ?? null,
    };
  }

  return {
    session_id: session.id,
    nodes,
    tokens_used: session.tokens_used,
  };
}

// ===================== Ghi tien do: evaluate-feynman, reveal (03 Muc 6.2, 6.3, 6.5) =====================

// DbTx = unknown o contracts (02 Muc 7); tang luu tru that la TransactionSql cua driver postgres
function asTx(tx: DbTx): TransactionSql {
  return tx as TransactionSql;
}

function parseJsonb<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

/** Chuan hoa 1 dong node_runs: jsonb co the ve dang chuoi tuy driver. */
export function normalizeRunRecord(run: RunRecord): RunRecord {
  return {
    ...run,
    questions: parseJsonb<RunQuestion[]>(run.questions) ?? [],
    steps: parseJsonb<RunStepRef[]>(run.steps) ?? [],
    forbidden_external_keywords: run.forbidden_external_keywords ?? [],
  };
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Doc DB khong khoa (03 Muc 6.2 buoc 2, 6.3 buoc 1).
 * Loi nghiep vu (ApiHttpError) giu nguyen; loi Postgres => ERR_PERSISTENCE_UNAVAILABLE (D-40), khong goi AI.
 */
export async function withDbRead<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof ApiHttpError) throw err;
    logger.error({
      msg: "Doc Postgres that bai",
      err_name: err instanceof Error ? err.name : typeof err,
    });
    throw new ApiHttpError("ERR_PERSISTENCE_UNAVAILABLE");
  }
}

/**
 * Chay transaction ghi, thu lai theo CONFIG.DB_RETRY_DELAYS_MS (03 Muc 6.2 buoc 4, D-40).
 * - Loi nghiep vu (ApiHttpError, vd ERR_ATTEMPT_OUT_OF_SYNC) nem ngay, khong thu lai.
 * - Het lan thu lai => ERR_PERSISTENCE_UNAVAILABLE; transaction da rollback nen khong tinh luot.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = defaultSleep
): Promise<T> {
  const delays = CONFIG.DB_RETRY_DELAYS_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      if (err instanceof ApiHttpError) throw err;
      if (attempt >= delays.length) {
        logger.error({
          msg: "Ghi Postgres that bai sau khi thu lai",
          err_name: err instanceof Error ? err.name : typeof err,
          attempts: attempt + 1,
        });
        throw new ApiHttpError("ERR_PERSISTENCE_UNAVAILABLE");
      }
      await sleep(delays[attempt]);
    }
  }
}

/** SELECT ... FOR UPDATE dong node_runs (03 Muc 6.2 buoc 4, 6.3 buoc 2). */
export async function lockRun(tx: DbTx, runId: string): Promise<RunRecord> {
  const rows = await asTx(tx)<RunRecord[]>`
    SELECT id, session_id, node_id, mode, questions, steps,
           forbidden_external_keywords, started_at, finished_at
    FROM node_runs
    WHERE id = ${runId}
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }
  return normalizeRunRecord(rows[0]);
}

/** Ghi lai node_runs.questions sau khi doi trang thai cau (03 Muc 6.2 buoc 4.4). */
export async function saveRunQuestions(tx: DbTx, run: RunRecord): Promise<void> {
  await asTx(tx)`
    UPDATE node_runs
    SET questions = ${JSON.stringify(run.questions)}::text::jsonb
    WHERE id = ${run.id}
  `;
}

interface SkillStateDbRow {
  skill: SWESkill;
  p_mastery: number | string;
  last_practiced_at: string | Date;
  practice_count: number | string;
  correct_count: number | string;
}

/**
 * Cap nhat BKT trong transaction (22 BKT-62):
 * (1) insert dong mac dinh on conflict do nothing (BKT-03) roi select for update;
 * (2) computeSkillChange; (3) upsert next; (4) tra SkillChange.
 */
export async function applyBkt(
  tx: DbTx,
  userId: string,
  skill: SWESkill,
  outcome: NodeOutcome,
  now: number
): Promise<SkillChange> {
  const t = asTx(tx);
  const at = new Date(now);

  await t`
    INSERT INTO skill_states (user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count)
    VALUES (${userId}, ${skill}, ${CONFIG.BKT_P_L0}, ${at}, 0, 0)
    ON CONFLICT (user_id, skill) DO NOTHING
  `;

  const rows = await t<SkillStateDbRow[]>`
    SELECT skill, p_mastery, last_practiced_at, practice_count, correct_count
    FROM skill_states
    WHERE user_id = ${userId} AND skill = ${skill}
    FOR UPDATE
  `;

  const state: CognitiveSkillState | undefined = rows[0]
    ? {
        skill: rows[0].skill,
        p_mastery: Number(rows[0].p_mastery),
        last_practiced_at: new Date(rows[0].last_practiced_at).getTime(),
        practice_count: Number(rows[0].practice_count),
        correct_count: Number(rows[0].correct_count),
      }
    : undefined;

  const { next, change } = computeSkillChange(skill, state, outcome, now);

  await t`
    INSERT INTO skill_states (user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count)
    VALUES (
      ${userId}, ${skill}, ${next.p_mastery}, ${new Date(next.last_practiced_at)},
      ${next.practice_count}, ${next.correct_count}
    )
    ON CONFLICT (user_id, skill) DO UPDATE SET
      p_mastery = EXCLUDED.p_mastery,
      last_practiced_at = EXCLUDED.last_practiced_at,
      practice_count = EXCLUDED.practice_count,
      correct_count = EXCLUDED.correct_count
  `;

  return change;
}

async function readSkeletonAndProgress(
  t: TransactionSql,
  sessionId: string
): Promise<{ skeleton: GraphSkeletonNode[]; rows: ProgressDbRow[] }> {
  const sessionRows = await t<Array<{ graph_skeleton: GraphSkeletonNode[] | string }>>`
    SELECT graph_skeleton
    FROM learning_sessions
    WHERE id = ${sessionId}
  `;
  if (sessionRows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }
  const skeleton = parseJsonb<GraphSkeletonNode[]>(sessionRows[0].graph_skeleton) ?? [];

  const rows = await t<ProgressDbRow[]>`
    SELECT node_id, status, analysis_failed
    FROM node_progress
    WHERE session_id = ${sessionId}
  `;
  return { skeleton, rows };
}

/**
 * Chot run khi moi cau finished (03 Muc 6.5, 22 Muc 8):
 * cau DROPPED / disputed khong tinh mau; co cau FAILED => node FAILED, nguoc lai COMPLETED.
 * Dat finished_at, upsert node_progress, tra unlocked_node_ids (node vua tu LOCKED sang AVAILABLE).
 * Run chua xong hoac da chot truoc do => [] va khong ghi gi.
 */
export async function finalizeRunIfDone(
  tx: DbTx,
  run: RunRecord,
  now: number
): Promise<string[]> {
  if (run.finished_at) return [];
  if (run.questions.length === 0 || !run.questions.every((q) => q.finished)) return [];

  const t = asTx(tx);
  const status =
    nodeStatusFromRuns([
      { mode: run.mode, started_at: new Date(run.started_at).getTime(), finished_at: now, questions: run.questions },
    ]) ?? "COMPLETED";

  const { skeleton, rows } = await readSkeletonAndProgress(t, run.session_id);
  const before = deriveNodeStates(skeleton, rows);

  const at = new Date(now);
  await t`
    UPDATE node_runs
    SET finished_at = ${at}
    WHERE id = ${run.id}
  `;
  await t`
    INSERT INTO node_progress (session_id, node_id, status, updated_at)
    VALUES (${run.session_id}, ${run.node_id}, ${status}, ${at})
    ON CONFLICT (session_id, node_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
  `;
  run.finished_at = at;

  const existing = rows.find((r) => r.node_id === run.node_id);
  const rowsAfter: ProgressDbRow[] = [
    ...rows.filter((r) => r.node_id !== run.node_id),
    { node_id: run.node_id, status, analysis_failed: existing?.analysis_failed ?? false },
  ];
  const after = deriveNodeStates(skeleton, rowsAfter);

  return skeleton
    .map((n) => n.node_id)
    .filter((id) => before[id]?.status === "LOCKED" && after[id]?.status === "AVAILABLE");
}

/**
 * NodeStateView cua node chua run (doc trong transaction, sau finalizeRunIfDone).
 * last_run = chinh run nay (node chi co 1 run dang mo; run xong thi node khong con AVAILABLE de tao run moi).
 */
export async function loadNodeState(tx: DbTx, run: RunRecord): Promise<NodeStateView> {
  const { skeleton, rows } = await readSkeletonAndProgress(asTx(tx), run.session_id);
  const derived = deriveNodeStates(skeleton, rows)[run.node_id];
  return {
    node_id: run.node_id,
    status: derived?.status ?? "LOCKED",
    has_warning: derived?.has_warning ?? false,
    analysis_failed: derived?.analysis_failed ?? false,
    last_run: toRunView(run),
  };
}
