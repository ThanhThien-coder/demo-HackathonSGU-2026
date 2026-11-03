import {
  CONFIG,
  type EnrichNodeRequest,
  type EnrichNodeResponse,
  type HybridArchitecturalNode,
  type NodeAnalysis,
  type NodeStateView,
  type QuestionState,
  type QuestionView,
  type RunQuestion,
  type RunStepRef,
  type SWESkill,
} from "@/contracts";
import { planNodeQuestions } from "@/lib/plan";
import { generateQuestions, type QuestionsUsage } from "./ai/questions";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { getSessionProgress } from "./progress";
import { addSessionTokens } from "./quota";
import { getSessionStaticResult, verifySessionOwnership } from "./session";

interface RunRow {
  id: string;
  session_id: string;
  node_id: string;
  mode: "LEARN";
  questions: RunQuestion[];
  steps: RunStepRef[];
  forbidden_external_keywords: string[];
  started_at: string | Date;
  finished_at: string | Date | null;
}

function toQuestionState(q: RunQuestion): QuestionState {
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
    reveal: q.finished && q.reference_answer ? {
      reference_answer: q.reference_answer,
      must_have_points: q.must_have_points ?? [],
      fix: q.fix ?? "",
    } : null,
  };
}

function toQuestionViews(questions: RunQuestion[]): QuestionView[] {
  return questions.map((q) => ({
    question_index: q.question_index,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    feynman_question: q.feynman_question,
    state: toQuestionState(q),
  }));
}

/**
 * 03_API_VA_LUU_TRU.md Muc 6.1: enrich-node — tao run, luu cau hoi + dap an
 */
export async function enrichNode(
  req: EnrichNodeRequest,
  userId: string
): Promise<EnrichNodeResponse> {
  const now = Date.now();
  const session = await verifySessionOwnership(req.session_id, userId);

  // 1. Idempotent: neu da co run dang mo (finished_at is null) thi tra ve ngay
  const openRuns = await sql<RunRow[]>`
    SELECT id, session_id, node_id, mode, questions, steps, forbidden_external_keywords, started_at, finished_at
    FROM node_runs
    WHERE session_id = ${session.id} AND node_id = ${req.node_id} AND finished_at IS NULL
    LIMIT 1
  `;

  if (openRuns.length > 0) {
    const openRun = openRuns[0];
    const progress = await getSessionProgress(session.id, userId);
    const nodeState = progress.nodes[req.node_id];

    return {
      node_id: req.node_id,
      run_id: openRun.id,
      mode: openRun.mode,
      questions: toQuestionViews(openRun.questions ?? []),
      node_state: nodeState,
      tokens_used: session.tokens_used,
    };
  }

  // 2. Kiem tra trang thai node (phai AVAILABLE)
  const progress = await getSessionProgress(session.id, userId);
  const nodeState = progress.nodes[req.node_id];
  if (!nodeState || nodeState.status !== "AVAILABLE") {
    throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
  }

  // 3. Doc ban phan tich node tu ai_cache
  const analysisCacheKey = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${req.node_id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
  const cachedAnalysisRows = await sql<Array<{ payload: NodeAnalysis | string }>>`
    SELECT payload
    FROM ai_cache
    WHERE cache_key = ${analysisCacheKey}
    LIMIT 1
  `;

  if (cachedAnalysisRows.length === 0) {
    throw new ApiHttpError("ERR_ANALYSIS_NOT_READY");
  }

  const rawAnalysis = cachedAnalysisRows[0].payload;
  const analysis: NodeAnalysis =
    typeof rawAnalysis === "string" ? JSON.parse(rawAnalysis) : rawAnalysis;

  // 4. Doc profile nguoi dung (skill_states)
  const skillRows = await sql<
    Array<{
      skill: SWESkill;
      p_mastery: number;
      last_practiced_at: string;
      practice_count: number;
      correct_count: number;
    }>
  >`
    SELECT skill, p_mastery, last_practiced_at, practice_count, correct_count
    FROM skill_states
    WHERE user_id = ${userId}
  `;

  const skills: Partial<Record<SWESkill, any>> = {};
  for (const row of skillRows) {
    skills[row.skill] = {
      skill: row.skill,
      p_mastery: Number(row.p_mastery),
      last_practiced_at: new Date(row.last_practiced_at).getTime(),
      practice_count: Number(row.practice_count),
      correct_count: Number(row.correct_count),
    };
  }

  // 5. Lay StaticEngineResult cua phien
  const graph = await getSessionStaticResult(session, userId);
  const node = graph.nodes.find((n) => n.id === req.node_id);
  if (!node) {
    throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
  }

  // 6. Lap ke hoach cau hoi (planNodeQuestions, Muc 5.3)
  const plan = planNodeQuestions(analysis, skills, now, node.trace_steps.length);

  // 7. Sinh cau hoi Feynman qua Gemini AI (generateQuestions, Muc 6.1)
  const usage: QuestionsUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
  const questions = await generateQuestions(
    {
      id: session.id,
      user_id: session.user_id,
      engine_version: session.engine_version,
      tokens_used: session.tokens_used,
    },
    graph,
    node as HybridArchitecturalNode,
    analysis,
    plan,
    usage
  );

  // Neu moi cau deu DROPPED => ERR_AI_REJECTED
  if (questions.length === 0 || questions.every((q) => q.ended_by === "DROPPED")) {
    throw new ApiHttpError("ERR_AI_REJECTED");
  }

  // 8. Chuan bi steps va forbidden_external_keywords
  const stepRefs: RunStepRef[] = (node.trace_steps ?? []).map((s) => ({
    step_index: s.step_number,
    layer: s.layer,
    file_path: s.file_path,
    function_name: s.function_name,
  }));

  const forbiddenKeywords: string[] = (graph as any).forbidden_external_keywords ?? [];

  // 9. Tao node_run trong database
  const runRows = await sql<Array<{ id: string }>>`
    INSERT INTO node_runs (
      session_id, node_id, mode, questions, steps, forbidden_external_keywords
    )
    VALUES (
      ${session.id},
      ${node.id},
      ${req.mode || "LEARN"},
      ${sql.json(questions as any)},
      ${sql.json(stepRefs as any)},
      ${forbiddenKeywords}
    )
    ON CONFLICT (session_id, node_id) WHERE finished_at IS NULL DO UPDATE
      SET questions = EXCLUDED.questions
    RETURNING id
  `;

  const runId = runRows[0].id;

  // Cap nhat last_active_at cua phien va token su dung
  const totalTokens = usage.tokens_in + usage.tokens_out;
  if (totalTokens > 0) {
    await addSessionTokens(session.id, usage.tokens_in, usage.tokens_out);
  } else {
    await sql`UPDATE learning_sessions SET last_active_at = now() WHERE id = ${session.id}`;
  }

  const updatedProgress = await getSessionProgress(session.id, userId);
  const updatedNodeState = updatedProgress.nodes[req.node_id];

  return {
    node_id: req.node_id,
    run_id: runId,
    mode: req.mode || "LEARN",
    questions: toQuestionViews(questions),
    node_state: updatedNodeState,
    tokens_used: session.tokens_used + totalTokens,
  };
}
