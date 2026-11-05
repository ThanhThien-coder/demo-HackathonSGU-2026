import type { HistoryResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { getOwnedSession, loadHistory } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request, ctx: { params: Promise<{ id: string }> }) => handle<HistoryResponse>(async () => {
  const u = await requireUser(req);
  const { id } = await ctx.params;
  const s = await getOwnedSession(id, u.userId);
  return { items: await loadHistory(s.id) };
});
