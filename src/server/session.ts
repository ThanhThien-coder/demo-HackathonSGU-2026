import {
  CONFIG,
  type GraphSkeletonNode,
  type RunMode,
  type RunQuestion,
  type RunStepRef,
  type StaticEngineResult,
} from "@/contracts";
import { db, sql } from "./db";
import { ApiHttpError } from "./errors";
import {
  getEngineResultCache,
  setEngineResultCache,
  setAliasSnapshotId,
} from "./cache";

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

/**
 * Semaphore in-memory gioi han so tac vu ingest chay dong thoi (D-31, 03 Muc 6.6).
 * Hang doi FIFO voi thoi gian cho toi da CONFIG.INGEST_QUEUE_TIMEOUT_MS => ERR_SERVER_BUSY (503).
 */
export class IngestionSemaphore {
  private running = 0;
  private queue: Array<{
    resolve: () => void;
    reject: (err: unknown) => void;
    timer: NodeJS.Timeout;
  }> = [];

  async acquire(): Promise<() => void> {
    if (this.running < CONFIG.MAX_CONCURRENT_INGESTIONS) {
      this.running++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.release();
        }
      };
    }

    return new Promise<() => void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((item) => item.timer === timer);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new ApiHttpError("ERR_SERVER_BUSY"));
        }
      }, CONFIG.INGEST_QUEUE_TIMEOUT_MS);

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          let released = false;
          resolve(() => {
            if (!released) {
              released = true;
              this.release();
            }
          });
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next.resolve();
    } else {
      this.running--;
    }
  }

  reset(): void {
    for (const item of this.queue) {
      clearTimeout(item.timer);
    }
    this.queue = [];
    this.running = 0;
  }
}

export const ingestionSemaphore = new IngestionSemaphore();

/**
 * Tao phien hoc moi hoac mo lai phien neu trung khoa phien (03 Muc 6.6, D-59).
 * Khoa phien: (user_id, source, snapshot_id, subdir, engine_version).
 * Trung khoa => cap nhat last_active_at, tra ve session da co va KET QUA DA LUU cua phien do
 *   (resumed = true, from_cache = true); khong ghi de cache RAM bang ket qua vua chay.
 * Chua co => tao transaction luu learning_sessions + session_snapshots (D-59) (resumed = false, from_cache = false).
 */
export async function createOrResumeSession(
  userId: string,
  result: StaticEngineResult
): Promise<{
  session: SessionRecord;
  result: StaticEngineResult;
  resumed: boolean;
  from_cache: boolean;
}> {
  const existing = await sql<SessionRecord[]>`
    SELECT
      id, user_id, source, repo_key, snapshot_id, snapshot_id_kind,
      subdir, ref_label, repo_name, engine_version, tokens_used,
      created_at, last_active_at, graph_skeleton
    FROM learning_sessions
    WHERE user_id = ${userId}
      AND source = ${result.snapshot.source}
      AND snapshot_id = ${result.snapshot.snapshot_id}
      AND subdir = ${result.snapshot.subdir}
      AND engine_version = ${result.engine_version}
    ORDER BY last_active_at DESC
    LIMIT 1
  `;

  if (existing.length > 0) {
    const session = existing[0];
    // 03 Muc 6.6: tra ket qua da luu cua phien do (cache RAM hoac session_snapshots)
    const stored = await getSessionStaticResult(session, userId);

    await sql`
      UPDATE learning_sessions
      SET last_active_at = now()
      WHERE id = ${session.id}
    `;

    if (session.source === "GITHUB") {
      setAliasSnapshotId(session.repo_key, session.subdir, session.snapshot_id);
    }

    return { session, result: stored, resumed: true, from_cache: true };
  }

  const graphSkeleton: GraphSkeletonNode[] = result.nodes.map((n) => ({
    node_id: n.id,
    title: n.title,
    prerequisites: n.prerequisites.slice(),
    is_capstone: n.is_capstone,
  }));

  const newSession = await db.tx(async (tx) => {
    const inserted = await tx<SessionRecord[]>`
      INSERT INTO learning_sessions (
        user_id, source, repo_key, snapshot_id, snapshot_id_kind,
        subdir, ref_label, repo_name, engine_version, graph_skeleton, tokens_used
      )
      VALUES (
        ${userId},
        ${result.snapshot.source},
        ${result.snapshot.repo_key},
        ${result.snapshot.snapshot_id},
        ${result.snapshot.snapshot_id_kind},
        ${result.snapshot.subdir},
        ${result.snapshot.ref_label ?? null},
        ${result.repo_name},
        ${result.engine_version},
        ${JSON.stringify(graphSkeleton)}::jsonb,
        0
      )
      RETURNING
        id, user_id, source, repo_key, snapshot_id, snapshot_id_kind,
        subdir, ref_label, repo_name, engine_version, tokens_used,
        created_at, last_active_at, graph_skeleton
    `;
    const session = inserted[0];

    await tx`
      INSERT INTO session_snapshots (session_id, result)
      VALUES (${session.id}, ${JSON.stringify(result)}::jsonb)
    `;

    return session;
  });

  setEngineResultCache(result.snapshot.snapshot_id, result.snapshot.subdir, result.engine_version, result);
  if (result.snapshot.source === "GITHUB") {
    setAliasSnapshotId(result.snapshot.repo_key, result.snapshot.subdir, result.snapshot.snapshot_id);
  }

  return { session: newSession, result, resumed: false, from_cache: false };
}

/**
 * "Hoc lai tu dau" (D-42, 03 Muc 6.6):
 * Tao phien moi cho cung repo; snapshot_id + graph_skeleton giu nguyen;
 * node_progress trong; skill_states giu nguyen; cau hoi sinh moi khi enrich-node.
 */
export async function restartSession(
  sessionId: string,
  userId: string
): Promise<{ session: SessionRecord; staticResult: StaticEngineResult }> {
  const oldSession = await verifySessionOwnership(sessionId, userId);
  if (oldSession.engine_version !== CONFIG.ENGINE_VERSION) {
    throw new ApiHttpError("ERR_SESSION_ENGINE_OUTDATED");
  }

  const staticResult = await getSessionStaticResult(oldSession, userId);

  const newSession = await db.tx(async (tx) => {
    const inserted = await tx<SessionRecord[]>`
      INSERT INTO learning_sessions (
        user_id, source, repo_key, snapshot_id, snapshot_id_kind,
        subdir, ref_label, repo_name, engine_version, graph_skeleton, tokens_used
      )
      VALUES (
        ${userId},
        ${oldSession.source},
        ${oldSession.repo_key},
        ${oldSession.snapshot_id},
        ${oldSession.snapshot_id_kind},
        ${oldSession.subdir},
        ${oldSession.ref_label ?? null},
        ${oldSession.repo_name},
        ${oldSession.engine_version},
        ${JSON.stringify(oldSession.graph_skeleton)}::jsonb,
        0
      )
      RETURNING
        id, user_id, source, repo_key, snapshot_id, snapshot_id_kind,
        subdir, ref_label, repo_name, engine_version, tokens_used,
        created_at, last_active_at, graph_skeleton
    `;
    const session = inserted[0];

    await tx`
      INSERT INTO session_snapshots (session_id, result)
      VALUES (${session.id}, ${JSON.stringify(staticResult)}::jsonb)
    `;

    return session;
  });

  return { session: newSession, staticResult };
}
