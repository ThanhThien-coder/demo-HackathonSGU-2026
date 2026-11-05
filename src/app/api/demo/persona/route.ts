import type { PersonaMode, PersonaResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/errors";
import { readJson, str } from "@/server/http";
import { setPersona } from "@/server/reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (req: Request) => handle<PersonaResponse>(async () => {
  const u = await requireUser(req);
  const b = await readJson(req);
  return setPersona(str(b.mode) as PersonaMode, u.userId);
});
