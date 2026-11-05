import type { SessionsResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { listSessions } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle<SessionsResponse>(async () => {
  const u = await requireUser(req);
  return { sessions: await listSessions(u.userId) };
});
