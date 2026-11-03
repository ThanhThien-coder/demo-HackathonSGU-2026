import type { EvaluateFeynmanRequest } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { evaluateFeynman } from "@/server/evaluate";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 9, Muc 6.2: POST /api/evaluate-feynman -> EvaluateFeynmanResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<EvaluateFeynmanRequest>;
    try {
      body = (await request.json()) as Partial<EvaluateFeynmanRequest>;
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (!body?.session_id || !body?.run_id) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (
      typeof body.question_index !== "number" ||
      typeof body.attempt_number !== "number" ||
      typeof body.student_answer !== "string"
    ) {
      throw new ApiHttpError("ERR_ATTEMPT_OUT_OF_SYNC");
    }

    if (isLocalMockEnabled()) {
      return new Response(
        JSON.stringify(mockDevStore.evaluateFeynman(body as EvaluateFeynmanRequest)),
        {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const responseData = await evaluateFeynman(
      {
        session_id: body.session_id,
        run_id: body.run_id,
        question_index: body.question_index,
        student_answer: body.student_answer,
        attempt_number: body.attempt_number,
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
