import { CONFIG, type StaticEngineResult } from "@/contracts";

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * Bo nho dem trong RAM co co che LRU va thoi han het han TTL (03 Muc 4, API-08).
 * Ap dung cho mot instance Node.js / Cloud Run.
 */
class LruTtlCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly map = new Map<string, CacheEntry<T>>();

  constructor(maxEntries: number, ttlMs: number) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.map.delete(key);
      return null;
    }

    // Dua len dau / lam moi thu tu su dung (LRU)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      // Xoa phan tu cu nhat khi vuot tran
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    this.map.set(key, { value, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

// 03_API_VA_LUU_TRU Muc 4: Cache RAM StaticEngineResult 2 tang:
// Tang 1: alias owner/repo + subdir_override => snapshot_id
// Tang 2: ket qua snapshot_id|subdir|engine_version => StaticEngineResult
const engineResultCache = new LruTtlCache<StaticEngineResult>(
  CONFIG.INGESTION_CACHE_MAX_ENTRIES,
  CONFIG.INGESTION_CACHE_TTL_MS
);

const aliasCache = new LruTtlCache<string>(
  CONFIG.INGESTION_CACHE_MAX_ENTRIES,
  CONFIG.INGESTION_CACHE_TTL_MS
);

// In-flight promise map cho cac yeu cau AI / ingest trung khoa cung luc trong 1 instance (03 Muc 3.3, 20 AI-08)
const inFlightPromises = new Map<string, Promise<unknown>>();

export function makeEngineCacheKey(
  snapshotId: string,
  subdir: string,
  engineVersion: string
): string {
  return `${snapshotId}|${subdir}|${engineVersion}`;
}

export function makeAliasCacheKey(repoKey: string, subdir: string = ""): string {
  return `${repoKey}|${subdir}`;
}

export function getEngineResultCache(
  snapshotId: string,
  subdir: string,
  engineVersion: string
): StaticEngineResult | null {
  const key = makeEngineCacheKey(snapshotId, subdir, engineVersion);
  return engineResultCache.get(key);
}

export function setEngineResultCache(
  snapshotId: string,
  subdir: string,
  engineVersion: string,
  result: StaticEngineResult
): void {
  const key = makeEngineCacheKey(snapshotId, subdir, engineVersion);
  engineResultCache.set(key, result);
}

export function getAliasSnapshotId(
  repoKey: string,
  subdir: string = ""
): string | null {
  const key = makeAliasCacheKey(repoKey, subdir);
  return aliasCache.get(key);
}

export function setAliasSnapshotId(
  repoKey: string,
  subdir: string,
  snapshotId: string
): void {
  const key = makeAliasCacheKey(repoKey, subdir);
  aliasCache.set(key, snapshotId);
}

export function clearEngineCache(): void {
  engineResultCache.clear();
  aliasCache.clear();
  inFlightPromises.clear();
}

export function getInFlightPromise<T>(key: string): Promise<T> | undefined {
  return inFlightPromises.get(key) as Promise<T> | undefined;
}

export function setInFlightPromise<T>(key: string, promise: Promise<T>): void {
  inFlightPromises.set(key, promise);
}

export function deleteInFlightPromise(key: string): void {
  inFlightPromises.delete(key);
}
