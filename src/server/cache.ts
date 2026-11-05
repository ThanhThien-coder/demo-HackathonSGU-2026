// 03 Mục 3.3, 4 — khóa cache AI, LRU RAM StaticEngineResult, in-flight map. Chỉ để nhanh, không được dựa vào (D-27).
import { CONFIG } from "@/contracts/config";
import type { RepoSnapshotKey, StaticEngineResult } from "@/contracts";

export const analysisKey = (k: RepoSnapshotKey, engineVersion: string, nodeId: string) =>
  `na|${k.source}|${k.snapshot_id}|${k.subdir}|${engineVersion}|${nodeId}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

export const overviewKey = (k: RepoSnapshotKey, engineVersion: string) =>
  `ov|${k.source}|${k.snapshot_id}|${k.subdir}|${engineVersion}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;

interface Entry<T> { value: T; at: number }

class Lru<T> {
  private m = new Map<string, Entry<T>>();
  constructor(private max: number, private ttl: number) {}
  get(k: string): T | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (Date.now() - e.at > this.ttl) { this.m.delete(k); return undefined; }
    this.m.delete(k); this.m.set(k, e); // làm mới thứ tự LRU
    return e.value;
  }
  set(k: string, v: T): void {
    this.m.delete(k);
    this.m.set(k, { value: v, at: Date.now() });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
}

declare global {
  var _resultCache: Lru<StaticEngineResult> | undefined;
  var _aliasCache: Lru<string> | undefined;
  var _inflight: Map<string, Promise<unknown>> | undefined;
}

const results = (globalThis._resultCache ??= new Lru<StaticEngineResult>(CONFIG.INGESTION_CACHE_MAX_ENTRIES, CONFIG.INGESTION_CACHE_TTL_MS));
const aliases = (globalThis._aliasCache ??= new Lru<string>(CONFIG.INGESTION_CACHE_MAX_ENTRIES, CONFIG.INGESTION_CACHE_TTL_MS));
const inflight = (globalThis._inflight ??= new Map<string, Promise<unknown>>());

const resultKey = (k: RepoSnapshotKey, engineVersion: string) => `${k.snapshot_id}|${k.subdir}|${engineVersion}`;
export const getResultCached = (k: RepoSnapshotKey, ev: string) => results.get(resultKey(k, ev));
export const putResultCached = (r: StaticEngineResult) => results.set(resultKey(r.snapshot, r.engine_version), r);
export const getAlias = (alias: string) => aliases.get(alias);
export const putAlias = (alias: string, snapshotId: string) => aliases.set(alias, snapshotId);

/** Hai yêu cầu trùng khóa cùng lúc trong 1 instance dùng chung 1 promise (AI-08). */
export function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cur = inflight.get(key) as Promise<T> | undefined;
  if (cur) return cur;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
