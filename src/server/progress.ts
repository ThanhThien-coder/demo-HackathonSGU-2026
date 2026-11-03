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

/**
 * 03_API_VA_LUU_TRU.md Muc 6.5: finalizeRunIfDone
 * Run xong khi moi cau finished.
 * Cau DROPPED va cau disputed khong tinh khi xet mau:
 * co cau FAILED => node FAILED; nguoc lai COMPLETED.
 * Sau do dat finished_at, upsert node_progress, tra unlocked_node_ids.
 */
export async function finalizeRunIfDone(
  sessionId: string,
  nodeId: string,
  runId: string,
  questions: RunQuestion[],
  userId: string
): Promise<{ finished: boolean; unlocked_node_ids: string[] }> {
  const allFinished = questions.every((q) => q.finished);
  if (!allFinished) {
    return { finished: false, unlocked_node_ids: [] };
  }

  // Lay trang thai cu de so sanh unlocked nodes
  const prevProgress = await getSessionProgress(sessionId, userId);
  const prevLockedNodes = new Set(
    Object.values(prevProgress.nodes)
      .filter((n) => n.status === "LOCKED")
      .map((n) => n.node_id)
  );

  // Xet mau node: bo qua DROPPED va disputed
  const scorableQuestions = questions.filter(
    (q) => q.ended_by !== "DROPPED" && !q.disputed
  );
  const hasFailed = scorableQuestions.some((q) => q.outcome === "FAILED");
  const finalStatus: "COMPLETED" | "FAILED" = hasFailed ? "FAILED" : "COMPLETED";

  // Dat finished_at cho run
  await sql`
    UPDATE node_runs
    SET finished_at = now()
    WHERE id = ${runId}
  `;

  // Upsert node_progress
  await sql`
    INSERT INTO node_progress (session_id, node_id, status, updated_at)
    VALUES (${sessionId}, ${nodeId}, ${finalStatus}, now())
    ON CONFLICT (session_id, node_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = now()
  `;

  // Tinh unlocked_node_ids
  const newProgress = await getSessionProgress(sessionId, userId);
  const unlockedNodeIds: string[] = [];
  for (const n of Object.values(newProgress.nodes)) {
    if (prevLockedNodes.has(n.node_id) && n.status === "AVAILABLE") {
      unlockedNodeIds.push(n.node_id);
    }
  }

  return { finished: true, unlocked_node_ids: unlockedNodeIds };
}
