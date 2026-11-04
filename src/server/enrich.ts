import {
  CONFIG,
  type CognitiveSkillState,
  type EnrichNodeResponse,
  type ExecutionTraceStep,
  type NodeAnalysis,
  type NodeStateView,
  type QuestionReveal,
  type QuestionView,
  type RunMode,
  type RunQuestion,
  type RunStepRef,
  type SessionProgress,
  type SWESkill,
} from "@/contracts";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { getSessionProgress } from "./progress";
import type { RunRecord, SessionRecord } from "./session";

/**
 * Tìm run đang mở (chưa hoàn thành) của node trong phiên (03_API_VA_LUU_TRU.md Mục 6.1, ca D16).
 * Trả về RunRecord nếu có, hoặc null nếu không có run nào đang mở.
 */
export async function findOpenRun(
  sessionId: string,
  nodeId: string,
): Promise<RunRecord | null> {
  const rows = await sql<RunRecord[]>`
    SELECT
      id,
      session_id,
      node_id,
      mode,
      questions,
      steps,
      forbidden_external_keywords,
      started_at,
      finished_at
    FROM node_runs
    WHERE session_id = ${sessionId}
      AND node_id = ${nodeId}
      AND finished_at IS NULL
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const questions: RunQuestion[] =
    typeof row.questions === "string" ? JSON.parse(row.questions) : row.questions;
  const steps: RunStepRef[] =
    typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps;

  return {
    ...row,
    questions,
    steps,
  };
}

/**
 * Chuyển RunQuestion sang QuestionView cho client (INV-07, API-03).
 * Không lộ reference_answer / must_have_points / fix của câu chưa hoàn thành.
 */
export function toQuestionView(q: RunQuestion): QuestionView {
  const isFinished = Boolean(q.finished);
  const reveal: QuestionReveal | null = isFinished
    ? {
        reference_answer: q.reference_answer,
        must_have_points: q.must_have_points,
        fix: q.fix,
      }
    : null;

  return {
    question_index: q.question_index,
    skill: q.skill,
    tier: q.tier,
    focus: q.focus,
    feynman_question: q.feynman_question,
    state: {
      question_index: q.question_index,
      feynman_question: q.feynman_question,
      skill: q.skill,
      tier: q.tier,
      focus: q.focus,
      attempts_used: q.attempts_used ?? 0,
      finished: isFinished,
      outcome: q.outcome ?? null,
      ended_by: q.ended_by ?? null,
      disputed: Boolean(q.disputed),
      reveal,
    },
  };
}

/**
 * Dựng EnrichNodeResponse từ một dòng node_runs và SessionProgress (02 Mục 8, 03 Mục 6.1).
 */
export function buildEnrichResponse(
  run: RunRecord,
  progress: SessionProgress,
): EnrichNodeResponse {
  const nodeState: NodeStateView = progress.nodes[run.node_id] ?? {
    node_id: run.node_id,
    status: "AVAILABLE",
    has_warning: false,
    analysis_failed: false,
    last_run: null,
  };

  return {
    node_id: run.node_id,
    run_id: run.id,
    mode: run.mode,
    questions: (run.questions ?? []).map(toQuestionView),
    node_state: nodeState,
    tokens_used: progress.tokens_used,
  };
}

/**
 * Kiểm tra điều kiện node phải ở trạng thái AVAILABLE (03 Mục 6.1).
 * Nếu không trả ERR_NODE_NOT_AVAILABLE.
 */
export async function checkNodeAvailable(
  sessionId: string,
  userId: string,
  nodeId: string,
): Promise<NodeStateView> {
  const progress = await getSessionProgress(sessionId, userId);
  const nodeState = progress.nodes[nodeId];

  if (!nodeState || nodeState.status !== "AVAILABLE") {
    throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
  }

  return nodeState;
}

/**
 * Đọc kết quả phân tích node từ ai_cache theo khóa na|... (03 Mục 3.3, 6.1).
 * Chưa có ⇒ ném ERR_ANALYSIS_NOT_READY.
 */
export async function loadNodeAnalysis(
  session: SessionRecord,
  nodeId: string,
): Promise<NodeAnalysis> {
  const cacheKey = `na|${session.source}|${session.snapshot_id}|${session.subdir}|${session.engine_version}|${nodeId}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

  const rows = await sql<Array<{ payload: NodeAnalysis | string }>>`
    SELECT payload
    FROM ai_cache
    WHERE cache_key = ${cacheKey}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_ANALYSIS_NOT_READY");
  }

  const raw = rows[0].payload;
  const analysis: NodeAnalysis =
    typeof raw === "string" ? JSON.parse(raw) : raw;

  return analysis;
}

/**
 * Đọc điểm kỹ năng skill_states của người học dựng Partial<Record<SWESkill, CognitiveSkillState>>.
 */
export async function loadUserSkills(
  userId: string,
): Promise<Partial<Record<SWESkill, CognitiveSkillState>>> {
  const rows = await sql<
    Array<{
      skill: SWESkill;
      p_mastery: number;
      last_practiced_at: string | Date;
      practice_count: number;
      correct_count: number;
    }>
  >`
    SELECT skill, p_mastery, last_practiced_at, practice_count, correct_count
    FROM skill_states
    WHERE user_id = ${userId}
  `;

  const skills: Partial<Record<SWESkill, CognitiveSkillState>> = {};
  for (const row of rows) {
    skills[row.skill] = {
      skill: row.skill,
      p_mastery: Number(row.p_mastery),
      last_practiced_at: new Date(row.last_practiced_at).getTime(),
      practice_count: Number(row.practice_count),
      correct_count: Number(row.correct_count),
    };
  }

  return skills;
}

/**
 * Tạo mảng RunStepRef[] từ ExecutionTraceStep[] của node (D-36).
 * Chỉ lưu step_index, layer, file_path, function_name; KHÔNG có snippet/code.
 */
export function createStepRefs(traceSteps: ExecutionTraceStep[]): RunStepRef[] {
  return traceSteps.map((s) => ({
    step_index: s.step_number,
    layer: s.layer,
    file_path: s.file_path,
    function_name: s.function_name,
  }));
}

/**
 * Lưu run mới vào bảng node_runs trong Postgres (03 Mục 3, 6.1).
 */
export async function createRun(
  sessionId: string,
  nodeId: string,
  mode: RunMode,
  questions: RunQuestion[],
  steps: RunStepRef[],
  forbiddenExternalKeywords: string[],
): Promise<RunRecord> {
  const questionsJson = JSON.stringify(questions);
  const stepsJson = JSON.stringify(steps);

  const rows = await sql<RunRecord[]>`
    INSERT INTO node_runs (
      session_id, node_id, mode, questions, steps, forbidden_external_keywords
    )
    VALUES (
      ${sessionId},
      ${nodeId},
      ${mode},
      ${questionsJson}::text::jsonb,
      ${stepsJson}::text::jsonb,
      ${forbiddenExternalKeywords}
    )
    RETURNING
      id, session_id, node_id, mode, questions, steps,
      forbidden_external_keywords, started_at, finished_at
  `;

  const row = rows[0];
  const parsedQuestions: RunQuestion[] =
    typeof row.questions === "string" ? JSON.parse(row.questions) : row.questions;
  const parsedSteps: RunStepRef[] =
    typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps;

  return {
    ...row,
    questions: parsedQuestions,
    steps: parsedSteps,
  };
}
