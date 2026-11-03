import type { ReportWrongRequest } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { reportWrong } from "@/server/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 11, Muc 6.4: POST /api/report-wrong -> ReportWrongResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<ReportWrongRequest>;
    try {
      body = (await request.json()) as Partial<ReportWrongRequest>;
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (!body?.session_id || !body?.run_id || typeof body?.question_index !== "number") {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const responseData = await reportWrong(
      {
        session_id: body.session_id,
        run_id: body.run_id,
        question_index: body.question_index,
        note: body.note ?? "",
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
