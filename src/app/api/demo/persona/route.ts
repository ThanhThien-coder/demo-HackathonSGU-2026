import type { PersonaRequest } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { setDemoPersona } from "@/server/persona";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 12, Muc 6.7: POST /api/demo/persona -> PersonaResponse (MeResponse)
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<PersonaRequest>;
    try {
      body = (await request.json()) as Partial<PersonaRequest>;
    } catch {
      throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");
    }

    if (!body || !body.mode) {
      throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");
    }

    if (isLocalMockEnabled()) {
      return new Response(JSON.stringify(mockDevStore.setPersona(body.mode)), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const responseData = await setDemoPersona(user.id, body.mode);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
