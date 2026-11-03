import {
  type GraphSkeletonNode,
  type NodeRunView,
  type NodeStateView,
  type NodeStatus,
  type QuestionReveal,
  type QuestionState,
  type RunMode,
  type RunQuestion,
  type SessionProgress,
} from "@/contracts";
import { deriveNodeStates } from "@/lib/derive";
import { sql } from "./db";
import { ApiHttpError } from "./errors";

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

function toQuestionState(q: RunQuestion): QuestionState {
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
    const questionStates: QuestionState[] = (row.questions ?? []).map(toQuestionState);
    latestRunByNode.set(row.node_id, {
      run_id: row.id,
      node_id: row.node_id,
      mode: row.mode,
      started_at: new Date(row.started_at).getTime(),
      finished_at: row.finished_at ? new Date(row.finished_at).getTime() : null,
      questions: questionStates,
    });
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
