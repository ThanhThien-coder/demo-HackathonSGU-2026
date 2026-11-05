// 03 Mục 6.6 — ingest: link / upload / mở lại phiên / học lại từ đầu (D-42).
import { CONFIG } from "@/contracts/config";
import type { IngestResponse, NodeAnalysis, NodeAnalysisView, StaticEngineResult } from "@/contracts";
import { toAnalysisView } from "./ai/analyze";
import { analysisKey, getAlias, getResultCached, putAlias, putResultCached } from "./cache";
import { sql } from "./db";
import { runEngine, toClientResult } from "./engine";
import { parseGithubUrl } from "./engine/ingest/url";
import { fail } from "./errors";
import { loadProgress } from "./progress";
import { withIngestSlot } from "./semaphore";
import { getSessionStaticResult } from "./session";
import {
  SessionFull, cloneSession, createSession, dbRead, findSessionByKey, getCacheMany, getOwnedSession, ensureProfile,
} from "./store";

async function respond(session: SessionFull, result: StaticEngineResult, resumed: boolean, fromCache: boolean): Promise<IngestResponse> {
  const progress = await dbRead(() => loadProgress(sql, session));
  const keys = result.nodes.map((n) => [n.id, analysisKey(session.snapshot, session.engine_version, n.id)] as const);
  const cached = await getCacheMany<NodeAnalysis>(keys.map((k) => k[1]));
  const analyses: Record<string, NodeAnalysisView> = {};
  for (const [id, k] of keys) {
    const a = cached.get(k);
    const node = result.nodes.find((n) => n.id === id)!;
    if (a) analyses[id] = toAnalysisView(a, node, result);
  }
  return { session_id: session.id, result: toClientResult(result), progress, analyses, resumed, from_cache: fromCache };
}

async function openOrCreate(userId: string, result: StaticEngineResult, fromCache: boolean): Promise<IngestResponse> {
  const existing = await findSessionByKey(userId, result.snapshot, result.engine_version);
  if (existing) {
    const stored = await getSessionStaticResult(existing); // kết quả đã lưu của phiên đó (D-39, D-59)
    return respond(existing, stored, true, true);
  }
  const id = await createSession(userId, result);
  putResultCached(result);
  const session = await getOwnedSession(id, userId);
  return respond(session, result, false, fromCache);
}

export async function ingestFromUrl(userId: string, displayName: string | null, repoUrl: string, subdir: string | null): Promise<IngestResponse> {
  await dbRead(() => ensureProfile(userId, displayName));
  const info = parseGithubUrl(repoUrl);
  const alias = `${info.owner}/${info.repo}`.toLowerCase() + `|${subdir ?? ""}`;
  const snap = getAlias(alias);
  if (snap) { // ING-04: trúng cache alias ⇒ bỏ tải
    const hit = getResultCached({ source: "GITHUB", repo_key: "", snapshot_id: snap, snapshot_id_kind: "COMMIT_SHA", subdir: subdir ? subdir.replace(/\/*$/, "/") : "", ref_label: null }, CONFIG.ENGINE_VERSION);
    if (hit) return openOrCreate(userId, hit, true);
  }
  const result = await withIngestSlot(() => runEngine({ kind: "GITHUB_URL", repo_url: repoUrl, subdir_override: subdir }));
  putAlias(alias, result.snapshot.snapshot_id);
  putResultCached(result);
  return openOrCreate(userId, result, false);
}

export async function ingestFromZip(userId: string, displayName: string | null, fileName: string, bytes: Uint8Array, subdir: string | null): Promise<IngestResponse> {
  await dbRead(() => ensureProfile(userId, displayName));
  if (bytes.byteLength > CONFIG.MAX_UPLOAD_BYTES) return fail("ERR_STREAM_QUOTA_EXCEEDED");
  const result = await withIngestSlot(() => runEngine({ kind: "ZIP_UPLOAD", file_name: fileName, bytes, subdir_override: subdir }));
  putResultCached(result);
  return openOrCreate(userId, result, false);
}

export async function ingestFromSession(userId: string, sessionId: string, restart: boolean): Promise<IngestResponse> {
  const session = await getOwnedSession(sessionId, userId);
  const result = await getSessionStaticResult(session); // ERR_SESSION_ENGINE_OUTDATED nếu engine_version khác
  if (!restart) return respond(session, result, true, true);
  const id = await cloneSession(session, userId, result);
  return respond(await getOwnedSession(id, userId), result, false, true);
}
