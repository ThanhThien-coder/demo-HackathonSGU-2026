import type { AnalyzeOverviewResponse } from "@/contracts";
import { analyzeOverviewService } from "@/server/analysis";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { readJson, str } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => handle<AnalyzeOverviewResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return analyzeOverviewService({ session_id: str(b.session_id) }, u.userId);
});
