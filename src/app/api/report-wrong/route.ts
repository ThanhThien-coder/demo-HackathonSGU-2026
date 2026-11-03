import { authenticateRequest } from "@/server/auth";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { reportWrong, toReportWrongRequest } from "@/server/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 11, Muc 6.4: POST /api/report-wrong -> ReportWrongResponse (D-22)
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const resBody = await reportWrong(toReportWrongRequest(body), user.id);
    return new Response(JSON.stringify(resBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
