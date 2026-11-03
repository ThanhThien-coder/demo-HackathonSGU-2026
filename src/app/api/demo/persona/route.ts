import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { applyPersona, isDemoModeEnabled, toPersonaRequest } from "@/server/persona";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 12, Muc 6.7: POST /api/demo/persona -> PersonaResponse (= MeResponse)
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    // Co DEMO_MODE tat ⇒ 403 truoc khi doc body
    if (!isDemoModeEnabled()) throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const resBody = await applyPersona(toPersonaRequest(body), user);
    return new Response(JSON.stringify(resBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
