import {
  CONFIG,
  type GraphSkeletonNode,
  type RunMode,
  type RunQuestion,
  type RunStepRef,
  type StaticEngineResult,
} from "@/contracts";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { getEngineResultCache, setEngineResultCache } from "./cache";

export interface SessionRecord {
  id: string;
  user_id: string;
  source: "GITHUB" | "ZIP";
  repo_key: string;
  snapshot_id: string;
  snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";
  subdir: string;
  ref_label: string | null;
  repo_name: string;
  engine_version: string;
  tokens_used: number;
  created_at: string | Date;
  last_active_at: string | Date;
  graph_skeleton: GraphSkeletonNode[];
}

export interface RunRecord {
  id: string;
  session_id: string;
  node_id: string;
  mode: RunMode;
  questions: RunQuestion[];
  steps: RunStepRef[];
  forbidden_external_keywords: string[];
  started_at: string | Date;
  finished_at: string | Date | null;
}

export interface SessionLookup {
  id: string;
  snapshot_id: string;
  subdir: string;
  engine_version: string;
  snapshot_id_kind?: "COMMIT_SHA" | "ARCHIVE_HASH";
  repo_key?: string;
  user_id?: string;
}

/**
 * Kiem tra quyen so huu phien (API-05).
 * session_id phai thuoc user_id hien tai, nguoc lai nem ERR_SESSION_NOT_FOUND (404);
 * khong tiet lo do la phien cua nguoi khac.
 */
export async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<SessionRecord> {
  const rows = await sql<SessionRecord[]>`
    SELECT
      id, user_id, source, repo_key, snapshot_id, snapshot_id_kind,
      subdir, ref_label, repo_name, engine_version, tokens_used,
      created_at, last_active_at, graph_skeleton
    FROM learning_sessions
    WHERE id = ${sessionId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  return rows[0];
}

/**
 * Kiem tra quyen so huu run (API-05).
 * run_id phai thuoc phien cua user_id hien tai, nguoc lai nem ERR_SESSION_NOT_FOUND (404).
 */
export async function verifyRunOwnership(
  runId: string,
  userId: string
): Promise<{ run: RunRecord; session: SessionRecord }> {
  const rows = await sql<Array<{
    run_id: string;
    session_id: string;
    node_id: string;
    mode: RunMode;
    questions: RunQuestion[];
    steps: RunStepRef[];
    forbidden_external_keywords: string[];
    started_at: string | Date;
    finished_at: string | Date | null;
    user_id: string;
    source: "GITHUB" | "ZIP";
    repo_key: string;
    snapshot_id: string;
    snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";
    subdir: string;
    ref_label: string | null;
    repo_name: string;
    engine_version: string;
    tokens_used: number;
    created_at: string | Date;
    last_active_at: string | Date;
    graph_skeleton: GraphSkeletonNode[];
  }>>`
    SELECT
      r.id AS run_id, r.session_id, r.node_id, r.mode, r.questions, r.steps,
      r.forbidden_external_keywords, r.started_at, r.finished_at,
      s.user_id, s.source, s.repo_key, s.snapshot_id, s.snapshot_id_kind,
      s.subdir, s.ref_label, s.repo_name, s.engine_version, s.tokens_used,
      s.created_at, s.last_active_at, s.graph_skeleton
    FROM node_runs r
    JOIN learning_sessions s ON s.id = r.session_id
    WHERE r.id = ${runId} AND s.user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const row = rows[0];
  return {
    run: {
      id: row.run_id,
      session_id: row.session_id,
      node_id: row.node_id,
      mode: row.mode,
      questions: row.questions,
      steps: row.steps,
      forbidden_external_keywords: row.forbidden_external_keywords,
      started_at: row.started_at,
      finished_at: row.finished_at,
    },
    session: {
      id: row.session_id,
      user_id: row.user_id,
      source: row.source,
      repo_key: row.repo_key,
      snapshot_id: row.snapshot_id,
      snapshot_id_kind: row.snapshot_id_kind,
      subdir: row.subdir,
      ref_label: row.ref_label,
      repo_name: row.repo_name,
      engine_version: row.engine_version,
      tokens_used: row.tokens_used,
      created_at: row.created_at,
      last_active_at: row.last_active_at,
      graph_skeleton: row.graph_skeleton,
    },
  };
}

/**
 * Lay StaticEngineResult cua phien (03_API_VA_LUU_TRU.md Muc 4, D-59).
 * - Kiem tra engine_version khop CONFIG.ENGINE_VERSION, nguoc lai nem ERR_SESSION_ENGINE_OUTDATED (410).
 * - Trung cache RAM: tra ve ngay.
 * - Truot cache: doc session_snapshots.result tu Postgres, nap vao cache RAM.
 * - Thieu dong session_snapshots: nem ERR_SESSION_NOT_FOUND.
 */
export async function getSessionStaticResult(
  sessionOrId: SessionLookup | string,
  userId: string
): Promise<StaticEngineResult> {
  let session: SessionLookup;

  if (typeof sessionOrId === "string") {
    const rows = await sql<Array<{
      id: string;
      snapshot_id: string;
      subdir: string;
      engine_version: string;
      snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH";
      repo_key: string;
      user_id: string;
    }>>`
      SELECT id, snapshot_id, subdir, engine_version, snapshot_id_kind, repo_key, user_id
      FROM learning_sessions
      WHERE id = ${sessionOrId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    session = rows[0];
  } else {
    if (sessionOrId.user_id && sessionOrId.user_id !== userId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    session = sessionOrId;
  }

  // 03 Muc 2, 4: Endpoint goi getSessionStaticResult => ERR_SESSION_ENGINE_OUTDATED khi khac CONFIG.ENGINE_VERSION
  if (session.engine_version !== CONFIG.ENGINE_VERSION) {
    throw new ApiHttpError("ERR_SESSION_ENGINE_OUTDATED");
  }

  // 1. Kiem tra cache RAM
  const cached = getEngineResultCache(session.snapshot_id, session.subdir, session.engine_version);
  if (cached) {
    return cached;
  }

  // 2. Truot cache: doc session_snapshots.result tu Postgres (D-59)
  const rows = await sql<Array<{ result: StaticEngineResult }>>`
    SELECT result
    FROM session_snapshots
    WHERE session_id = ${session.id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const result = rows[0].result;
  setEngineResultCache(session.snapshot_id, session.subdir, session.engine_version, result);
  return result;
}
