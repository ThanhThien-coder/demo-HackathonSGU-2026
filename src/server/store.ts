// 03 Mục 3, 6 — mọi truy vấn Postgres (server là nơi ghi duy nhất, API-02).
import type postgres from "postgres";
import { CONFIG } from "@/contracts/config";
import type {
  AttemptHistoryItem, CognitiveSkillState, GraphSkeletonNode, LearnerCognitiveProfile,
  LearningSessionSummary, RepoSnapshotKey, RunMode, RunQuestion, RunStepRef, SWESkill,
  SessionRow, StaticEngineResult,
} from "@/contracts";
import { SWE_SKILLS } from "@/contracts/base";
import { overallTier } from "@/lib/bkt-engine";
import type { ProgressRow } from "@/lib/derive";
import { sql } from "./db";
import { AppError, fail } from "./errors";

export type Q = postgres.Sql;
export const asQ = (tx: unknown): Q => tx as Q;
const ms = (d: Date | string | null): number => (d ? new Date(d).getTime() : 0);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (q: Q, v: unknown) => q.json(v as postgres.JSONValue);

/** D-40: lỗi hạ tầng DB ⇒ ERR_PERSISTENCE_UNAVAILABLE sau DB_RETRY_DELAYS_MS; lỗi nghiệp vụ (AppError) đi qua. */
export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= CONFIG.DB_RETRY_DELAYS_MS.length; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof AppError) throw e;
      lastErr = e;
      if (i < CONFIG.DB_RETRY_DELAYS_MS.length) await new Promise((r) => setTimeout(r, CONFIG.DB_RETRY_DELAYS_MS[i]));
    }
  }
  void lastErr;
  return fail("ERR_PERSISTENCE_UNAVAILABLE");
}

/** Đọc DB không retry dài: lỗi lạ ⇒ ERR_PERSISTENCE_UNAVAILABLE. */
export async function dbRead<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) throw e;
    return fail("ERR_PERSISTENCE_UNAVAILABLE");
  }
}

// ---------- profile / skills ----------
export async function ensureProfile(userId: string, displayName: string | null): Promise<void> {
  await sql`insert into profiles (user_id, display_name) values (${userId}, ${displayName})
    on conflict (user_id) do update set display_name = coalesce(excluded.display_name, profiles.display_name)`;
}

interface SkillRow { skill: SWESkill; p_mastery: number; last_practiced_at: Date; practice_count: number; correct_count: number }
export const toSkillState = (r: SkillRow): CognitiveSkillState => ({
  skill: r.skill, p_mastery: r.p_mastery, last_practiced_at: ms(r.last_practiced_at),
  practice_count: r.practice_count, correct_count: r.correct_count,
});

export async function loadProfile(q: Q, userId: string, now: number): Promise<LearnerCognitiveProfile> {
  const [p] = await q<{ display_name: string | null }[]>`select display_name from profiles where user_id = ${userId}`;
  const rows = await q<SkillRow[]>`select skill, p_mastery, last_practiced_at, practice_count, correct_count
    from skill_states where user_id = ${userId}`;
  const skills: LearnerCognitiveProfile["skills"] = {};
  for (const r of rows) skills[r.skill] = toSkillState(r);
  return { user_id: userId, display_name: p?.display_name ?? null, skills, overall_tier: overallTier(skills, now) };
}

export async function lockSkill(q: Q, userId: string, skill: SWESkill, now: number): Promise<CognitiveSkillState> {
  // BKT-62: insert mặc định (BKT-03) rồi select … for update
  await q`insert into skill_states (user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count)
    values (${userId}, ${skill}, ${CONFIG.BKT_P_L0}, ${new Date(now)}, 0, 0) on conflict do nothing`;
  const [r] = await q<SkillRow[]>`select skill, p_mastery, last_practiced_at, practice_count, correct_count
    from skill_states where user_id = ${userId} and skill = ${skill} for update`;
  return toSkillState(r);
}

export async function saveSkill(q: Q, userId: string, s: CognitiveSkillState): Promise<void> {
  await q`update skill_states set p_mastery = ${s.p_mastery}, last_practiced_at = ${new Date(s.last_practiced_at)},
    practice_count = ${s.practice_count}, correct_count = ${s.correct_count}
    where user_id = ${userId} and skill = ${s.skill}`;
}

export async function upsertPersona(userId: string, p: number, lastAt: number): Promise<void> {
  await sql.begin(async (tx) => {
    const q = asQ(tx);
    for (const skill of SWE_SKILLS) {
      await q`insert into skill_states (user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count)
        values (${userId}, ${skill}, ${p}, ${new Date(lastAt)}, 1, 1)
        on conflict (user_id, skill) do update set p_mastery = excluded.p_mastery,
          last_practiced_at = excluded.last_practiced_at, practice_count = 1, correct_count = 1`;
    }
  });
}

// ---------- sessions ----------
export interface SessionFull extends SessionRow {
  snapshot: RepoSnapshotKey;
  repo_name: string;
  graph_skeleton: GraphSkeletonNode[];
  created_at: number;
  last_active_at: number;
}

interface SessionDbRow {
  id: string; user_id: string; engine_version: string; tokens_used: number; source: "GITHUB" | "ZIP";
  repo_key: string; snapshot_id: string; snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH"; subdir: string;
  ref_label: string | null; repo_name: string; graph_skeleton: GraphSkeletonNode[]; created_at: Date; last_active_at: Date;
}
const toSession = (r: SessionDbRow): SessionFull => ({
  id: r.id, user_id: r.user_id, engine_version: r.engine_version, tokens_used: r.tokens_used,
  snapshot: { source: r.source, repo_key: r.repo_key, snapshot_id: r.snapshot_id, snapshot_id_kind: r.snapshot_id_kind, subdir: r.subdir, ref_label: r.ref_label },
  repo_name: r.repo_name, graph_skeleton: r.graph_skeleton, created_at: ms(r.created_at), last_active_at: ms(r.last_active_at),
});

/** API-05: phiên phải thuộc người gọi, nếu không ⇒ ERR_SESSION_NOT_FOUND. */
export async function getOwnedSession(sessionId: string, userId: string): Promise<SessionFull> {
  if (!UUID_RE.test(sessionId)) return fail("ERR_SESSION_NOT_FOUND");
  const rows = await dbRead(() => sql<SessionDbRow[]>`select * from learning_sessions where id = ${sessionId} and user_id = ${userId}`);
  if (rows.length === 0) return fail("ERR_SESSION_NOT_FOUND");
  return toSession(rows[0]);
}

export const toSkeleton = (r: StaticEngineResult): GraphSkeletonNode[] =>
  r.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone }));

export async function findSessionByKey(userId: string, k: RepoSnapshotKey, engineVersion: string): Promise<SessionFull | null> {
  const rows = await dbRead(() => sql<SessionDbRow[]>`select * from learning_sessions
    where user_id = ${userId} and source = ${k.source} and snapshot_id = ${k.snapshot_id}
      and subdir = ${k.subdir} and engine_version = ${engineVersion}
    order by last_active_at desc limit 1`);
  return rows[0] ? toSession(rows[0]) : null;
}

export async function createSession(userId: string, r: StaticEngineResult): Promise<string> {
  return withDbRetry(() => sql.begin(async (tx) => {
    const q = asQ(tx);
    const k = r.snapshot;
    const [row] = await q<{ id: string }[]>`insert into learning_sessions
      (user_id, source, repo_key, snapshot_id, snapshot_id_kind, subdir, ref_label, repo_name, engine_version, graph_skeleton)
      values (${userId}, ${k.source}, ${k.repo_key}, ${k.snapshot_id}, ${k.snapshot_id_kind}, ${k.subdir}, ${k.ref_label},
        ${r.repo_name}, ${r.engine_version}, ${json(q, toSkeleton(r))}) returning id`;
    await q`insert into session_snapshots (session_id, result) values (${row.id}, ${json(q, r)})`;
    return row.id;
  }));
}

/** D-42: "Học lại từ đầu" ⇒ phiên mới cùng snapshot + skeleton + chép session_snapshots.result. */
export async function cloneSession(old: SessionFull, userId: string, result: StaticEngineResult): Promise<string> {
  void old;
  return createSession(userId, result);
}

export async function getSnapshotResult(sessionId: string): Promise<StaticEngineResult | null> {
  const rows = await dbRead(() => sql<{ result: StaticEngineResult }[]>`select result from session_snapshots where session_id = ${sessionId}`);
  return rows[0]?.result ?? null;
}

export async function touchSession(q: Q, sessionId: string): Promise<void> {
  await q`update learning_sessions set last_active_at = now() where id = ${sessionId}`;
}

export async function listSessions(userId: string): Promise<LearningSessionSummary[]> {
  const rows = await dbRead(() => sql<Array<SessionDbRow & { total_nodes: number; completed_count: number; failed_count: number }>>`
    select s.id, s.user_id, s.engine_version, s.tokens_used, s.source, s.repo_key, s.snapshot_id, s.snapshot_id_kind,
      s.subdir, s.ref_label, s.repo_name, '[]'::jsonb as graph_skeleton, s.created_at, s.last_active_at,
      jsonb_array_length(s.graph_skeleton)::int as total_nodes,
      count(*) filter (where p.status = 'COMPLETED')::int as completed_count,
      count(*) filter (where p.status = 'FAILED')::int as failed_count
    from learning_sessions s left join node_progress p on p.session_id = s.id
    where s.user_id = ${userId} group by s.id order by s.last_active_at desc`);
  return rows.map((r) => {
    const s = toSession(r);
    const outdated = s.engine_version !== CONFIG.ENGINE_VERSION;
    return {
      session_id: s.id, snapshot: s.snapshot, repo_name: s.repo_name, engine_version: s.engine_version,
      created_at: s.created_at, last_active_at: s.last_active_at,
      completed_count: r.completed_count, failed_count: r.failed_count, total_nodes: r.total_nodes,
      can_resume: !outdated, resume_blocker: outdated ? "ENGINE_UPDATED" : null,
    };
  });
}

// ---------- progress ----------
export async function loadProgressRows(q: Q, sessionId: string): Promise<ProgressRow[]> {
  return q<ProgressRow[]>`select node_id, status, analysis_failed from node_progress where session_id = ${sessionId}`;
}

export async function upsertProgress(q: Q, sessionId: string, nodeId: string,
  patch: { status?: "AVAILABLE" | "COMPLETED" | "FAILED" | null; analysis_failed?: boolean }): Promise<void> {
  const hasStatus = patch.status !== undefined;
  const hasAf = patch.analysis_failed !== undefined;
  await q`insert into node_progress (session_id, node_id, status, analysis_failed)
    values (${sessionId}, ${nodeId}, ${patch.status ?? null}, ${patch.analysis_failed ?? false})
    on conflict (session_id, node_id) do update set
      status = case when ${hasStatus} then excluded.status else node_progress.status end,
      analysis_failed = case when ${hasAf} then excluded.analysis_failed else node_progress.analysis_failed end,
      updated_at = now()`;
}

// ---------- runs ----------
export interface RunRow {
  id: string; session_id: string; node_id: string; mode: RunMode; questions: RunQuestion[];
  steps: RunStepRef[]; forbidden_external_keywords: string[]; started_at: number; finished_at: number | null;
}
interface RunDbRow {
  id: string; session_id: string; node_id: string; mode: RunMode; questions: RunQuestion[];
  steps: RunStepRef[]; forbidden_external_keywords: string[]; started_at: Date; finished_at: Date | null;
}
const toRun = (r: RunDbRow): RunRow => ({ ...r, started_at: ms(r.started_at), finished_at: r.finished_at ? ms(r.finished_at) : null });

export async function findOpenRun(q: Q, sessionId: string, nodeId: string): Promise<RunRow | null> {
  const rows = await q<RunDbRow[]>`select * from node_runs where session_id = ${sessionId} and node_id = ${nodeId} and finished_at is null`;
  return rows[0] ? toRun(rows[0]) : null;
}

export async function loadRunsOfSession(q: Q, sessionId: string): Promise<RunRow[]> {
  const rows = await q<RunDbRow[]>`select * from node_runs where session_id = ${sessionId} order by started_at asc`;
  return rows.map(toRun);
}

export async function getRunOwned(q: Q, runId: string, sessionId: string, forUpdate = false): Promise<RunRow> {
  if (!UUID_RE.test(runId)) return fail("ERR_SESSION_NOT_FOUND");
  const rows = forUpdate
    ? await q<RunDbRow[]>`select * from node_runs where id = ${runId} and session_id = ${sessionId} for update`
    : await q<RunDbRow[]>`select * from node_runs where id = ${runId} and session_id = ${sessionId}`;
  if (rows.length === 0) return fail("ERR_SESSION_NOT_FOUND");
  return toRun(rows[0]);
}

export async function createRun(q: Q, sessionId: string, nodeId: string, mode: RunMode,
  questions: RunQuestion[], steps: RunStepRef[], forbidden: string[]): Promise<RunRow | "CONFLICT"> {
  try {
    const rows = await q<RunDbRow[]>`insert into node_runs (session_id, node_id, mode, questions, steps, forbidden_external_keywords)
      values (${sessionId}, ${nodeId}, ${mode}, ${json(q, questions)}, ${json(q, steps)}, ${q.array(forbidden)}) returning *`;
    return toRun(rows[0]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return "CONFLICT"; // node_runs_one_open (2 tab)
    throw e;
  }
}

export async function saveRunQuestions(q: Q, runId: string, questions: RunQuestion[]): Promise<void> {
  await q`update node_runs set questions = ${json(q, questions)} where id = ${runId}`;
}

export async function finishRun(q: Q, runId: string): Promise<void> {
  await q`update node_runs set finished_at = now() where id = ${runId} and finished_at is null`;
}

// ---------- attempts ----------
export async function insertAttempt(q: Q, a: {
  run_id: string; question_index: number; attempt_number: number; skill: SWESkill; core_accuracy: number;
  simplicity: number; intent: string; is_passed: boolean; points_covered: boolean[]; student_answer: string;
}): Promise<void> {
  await q`insert into question_attempts (run_id, question_index, attempt_number, skill, core_accuracy, simplicity,
    intent, is_passed, points_covered, student_answer)
    values (${a.run_id}, ${a.question_index}, ${a.attempt_number}, ${a.skill}, ${Math.round(a.core_accuracy)},
      ${Math.round(a.simplicity)}, ${a.intent}, ${a.is_passed}, ${q.array(a.points_covered)}, ${a.student_answer})`;
}

export async function lastAttemptOfQuestion(q: Q, runId: string, questionIndex: number):
  Promise<{ student_answer: string; points_covered: boolean[] } | null> {
  const rows = await q<{ student_answer: string; points_covered: boolean[] }[]>`select student_answer, points_covered
    from question_attempts where run_id = ${runId} and question_index = ${questionIndex}
    order by attempt_number desc limit 1`;
  return rows[0] ?? null;
}

export async function loadHistory(sessionId: string): Promise<AttemptHistoryItem[]> {
  const rows = await dbRead(() => sql<Array<{
    node_id: string; mode: RunMode; question_index: number; skill: SWESkill; attempt_number: number; core_accuracy: number;
    is_passed: boolean; intent: "ANSWER" | "GIVE_UP" | "OFF_TOPIC"; student_answer: string; created_at: Date; graph_skeleton: GraphSkeletonNode[];
  }>>`select r.node_id, r.mode, a.question_index, a.skill, a.attempt_number, a.core_accuracy, a.is_passed, a.intent,
      a.student_answer, a.created_at, s.graph_skeleton
    from question_attempts a join node_runs r on r.id = a.run_id join learning_sessions s on s.id = r.session_id
    where r.session_id = ${sessionId} order by a.created_at desc`);
  return rows.map((r) => ({
    node_id: r.node_id, node_title: r.graph_skeleton.find((n) => n.node_id === r.node_id)?.title ?? r.node_id,
    mode: r.mode, question_index: r.question_index, skill: r.skill, attempt_number: r.attempt_number,
    core_accuracy: r.core_accuracy, is_passed: r.is_passed, intent: r.intent, student_answer: r.student_answer,
    created_at: ms(r.created_at),
  }));
}

/** A5b: ý bắt buộc đã hụt ở lượt cuối của câu cùng kỹ năng (mọi phiên của user), mới nhất trước. */
export async function loadMissedPoints(userId: string, skills: SWESkill[]): Promise<Partial<Record<SWESkill, string[]>>> {
  const out: Partial<Record<SWESkill, string[]>> = {};
  if (skills.length === 0) return out;
  try {
    for (const skill of skills) {
      const rows = await sql<Array<{ points_covered: boolean[]; question_index: number; questions: RunQuestion[] }>>`
        select distinct on (a.run_id, a.question_index) a.points_covered, a.question_index, r.questions
        from question_attempts a join node_runs r on r.id = a.run_id join learning_sessions s on s.id = r.session_id
        where s.user_id = ${userId} and a.skill = ${skill}
        order by a.run_id, a.question_index, a.attempt_number desc limit 20`;
      const missed: string[] = [];
      for (const r of rows) {
        const pts = r.questions[r.question_index - 1]?.must_have_points ?? [];
        r.points_covered.forEach((c, i) => { if (!c && pts[i]) missed.push(pts[i]); });
      }
      out[skill] = missed.slice(0, CONFIG.HISTORY_MISSED_POINTS_MAX);
    }
  } catch {
    return {}; // lịch sử chỉ để nhắm câu hỏi — lỗi ⇒ bỏ qua
  }
  return out;
}

// ---------- AI cache / usage ----------
export async function getCache<T>(key: string): Promise<T | null> {
  const rows = await dbRead(() => sql<{ payload: T }[]>`select payload from ai_cache where cache_key = ${key}`);
  return rows[0]?.payload ?? null;
}

export async function putCache(key: string, kind: "NODE_ANALYSIS" | "REPO_OVERVIEW", payload: unknown,
  tokensIn: number, tokensOut: number): Promise<void> {
  try {
    await sql`insert into ai_cache (cache_key, kind, payload, model, prompt_version, tokens_in, tokens_out)
      values (${key}, ${kind}, ${json(sql, payload)}, ${CONFIG.LLM_MODEL}, ${CONFIG.PROMPT_VERSION}, ${tokensIn}, ${tokensOut})
      on conflict (cache_key) do nothing`;
  } catch { /* cache hỏng không làm hỏng request */ }
}

/** API-06, AI-07: cộng token ngoài transaction học; trả tổng mới. */
export async function addTokens(sessionId: string, tokensIn: number, tokensOut: number,
  kind: "ANALYZE" | "OVERVIEW" | "QUESTIONS" | "GRADE"): Promise<number> {
  const total = tokensIn + tokensOut;
  const cost = (tokensIn * CONFIG.LLM_PRICE_INPUT_USD_PER_M + tokensOut * CONFIG.LLM_PRICE_OUTPUT_USD_PER_M) / 1e6;
  const rows = await dbRead(() => sql<{ tokens_used: number }[]>`update learning_sessions
    set tokens_used = tokens_used + ${total} where id = ${sessionId} returning tokens_used`);
  try {
    await sql`insert into ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
      values (${sessionId}, ${kind}, ${tokensIn}, ${tokensOut}, ${cost.toFixed(6)})`;
  } catch { /* D-66: chỉ cảnh báo */ }
  return rows[0]?.tokens_used ?? total;
}

export async function insertDispute(q: Q, userId: string, runId: string, questionIndex: number, note: string): Promise<void> {
  await q`insert into dispute_reports (user_id, run_id, question_index, note) values (${userId}, ${runId}, ${questionIndex}, ${note})`;
}

export async function getCacheMany<T>(keys: string[]): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  if (keys.length === 0) return out;
  const rows = await dbRead(() => sql<{ cache_key: string; payload: T }[]>`select cache_key, payload from ai_cache where cache_key in ${sql(keys)}`);
  for (const r of rows) out.set(r.cache_key, r.payload);
  return out;
}

export async function putSnapshotIfMissing(sessionId: string, result: StaticEngineResult): Promise<void> {
  await sql`insert into session_snapshots (session_id, result) values (${sessionId}, ${sql.json(result as unknown as postgres.JSONValue)}) on conflict do nothing`;
}

export async function deleteProfileData(userId: string): Promise<void> {
  await sql`delete from profiles where user_id = ${userId}`;
}
