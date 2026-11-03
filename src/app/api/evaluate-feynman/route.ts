import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { evaluateFeynman, toEvaluateRequest } from "@/server/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 9, Muc 6.2: POST /api/evaluate-feynman -> EvaluateFeynmanResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const resBody = await evaluateFeynman(toEvaluateRequest(body), user.id);
    return new Response(JSON.stringify(resBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
