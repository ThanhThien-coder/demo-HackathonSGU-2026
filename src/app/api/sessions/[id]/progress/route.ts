import type { ProgressResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { sql } from "@/server/db";
import { handle } from "@/server/errors";
import { loadProgress } from "@/server/progress";
import { dbRead, getOwnedSession } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chỉ đọc DB (graph_skeleton + node_progress + node_runs ⇒ deriveNodeStates), không engine, không AI
export const GET = (req: Request, ctx: { params: Promise<{ id: string }> }) => handle<ProgressResponse>(async () => {
  const u = await requireUser(req);
  const { id } = await ctx.params;
  const s = await getOwnedSession(id, u.userId);
  return { progress: await dbRead(() => loadProgress(sql, s)) };
});
