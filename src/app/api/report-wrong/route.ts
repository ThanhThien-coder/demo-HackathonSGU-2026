import type { ReportWrongResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { int, readJson, str } from "@/server/http";
import { reportWrong } from "@/server/reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (req: Request) => handle<ReportWrongResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return reportWrong({ session_id: str(b.session_id), run_id: str(b.run_id), question_index: int(b.question_index), note: str(b.note) }, u.userId);
});
