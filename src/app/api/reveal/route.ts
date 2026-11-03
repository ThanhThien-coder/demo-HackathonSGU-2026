import type { RevealRequest } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { revealQuestion } from "@/server/reveal";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 10, Muc 6.3: POST /api/reveal -> RevealResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<RevealRequest>;
    try {
      body = (await request.json()) as Partial<RevealRequest>;
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (!body?.session_id || !body?.run_id || typeof body?.question_index !== "number") {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (isLocalMockEnabled()) {
      return new Response(
        JSON.stringify(mockDevStore.reveal(body.run_id, body.question_index)),
        {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const responseData = await revealQuestion(
      {
        session_id: body.session_id,
        run_id: body.run_id,
        question_index: body.question_index,
      },
      user.id
    );

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
