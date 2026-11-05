import type { AnalyzeNodeResponse } from "@/contracts";
import { analyzeNodeService } from "@/server/analysis";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { readJson, str } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => handle<AnalyzeNodeResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return analyzeNodeService({ session_id: str(b.session_id), node_id: str(b.node_id) }, u.userId);
});
