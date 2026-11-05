import type { EvaluateFeynmanResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { evaluateFeynman } from "@/server/evaluate";
import { handle } from "@/server/errors";
import { int, readJson, str } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => handle<EvaluateFeynmanResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return evaluateFeynman({
    session_id: str(b.session_id), run_id: str(b.run_id), question_index: int(b.question_index),
    student_answer: str(b.student_answer), attempt_number: int(b.attempt_number),
  }, u.userId);
});
