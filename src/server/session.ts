// 03 Mục 4 — getSessionStaticResult: cache RAM → session_snapshots → (phiên thiếu snapshot) dựng lại từ commit.
import { CONFIG } from "@/contracts/config";
import type { StaticEngineResult } from "@/contracts";
import { runEngine } from "./engine";
import { fail } from "./errors";
import { getResultCached, putResultCached } from "./cache";
import { SessionFull, getSnapshotResult, putSnapshotIfMissing, toSkeleton } from "./store";
import { log } from "./log";

export async function getSessionStaticResult(session: SessionFull): Promise<StaticEngineResult> {
  if (session.engine_version !== CONFIG.ENGINE_VERSION) return fail("ERR_SESSION_ENGINE_OUTDATED");
  const hit = getResultCached(session.snapshot, session.engine_version);
  if (hit) return hit;
  const stored = await getSnapshotResult(session.id);
  if (stored) { putResultCached(stored); return stored; }
  // phiên thiếu dòng session_snapshots (lỗi bất thường)
  const k = session.snapshot;
  if (k.snapshot_id_kind !== "COMMIT_SHA" || k.source !== "GITHUB") return fail("ERR_SESSION_NOT_FOUND");
  const [owner, repo] = k.repo_key.split("/");
  const rebuilt = await runEngine({ kind: "GITHUB_COMMIT", owner, repo, sha: k.snapshot_id, subdir: k.subdir }).catch(() => fail("ERR_SESSION_NOT_FOUND"));
  const a = JSON.stringify(toSkeleton(rebuilt).map((n) => [n.node_id, n.prerequisites]));
  const b = JSON.stringify(session.graph_skeleton.map((n) => [n.node_id, n.prerequisites]));
  if (a !== b) { log.error({ event: "snapshot_mismatch", session: session.id }); return fail("ERR_SESSION_ENGINE_OUTDATED"); }
  await putSnapshotIfMissing(session.id, rebuilt);
  putResultCached(rebuilt);
  return rebuilt;
}
