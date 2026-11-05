import type { EnrichNodeResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { enrichNode } from "@/server/enrich";
import { handle } from "@/server/errors";
import { readJson, str } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => handle<EnrichNodeResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return enrichNode({ session_id: str(b.session_id), node_id: str(b.node_id), mode: "LEARN" }, u.userId);
});
