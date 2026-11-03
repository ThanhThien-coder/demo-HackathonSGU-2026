import type { ProgressResponse } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { toErrorResponse } from "@/server/errors";
import { getSessionProgress } from "@/server/progress";

export const dynamic = "force-dynamic";

// Next 15: params cua route dong luon la Promise (kieu khac lam next build bao loi).
type RouteContext = {
  params: Promise<{ id: string }>;
};

// 03_API_VA_LUU_TRU Muc 2 dong 13: GET /api/sessions/{session_id}/progress
// Chi doc DB (graph_skeleton + node_progress + node_runs => deriveNodeStates), khong engine, khong AI
export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    const { id: sessionId } = await context.params;

    const progress = await getSessionProgress(sessionId, user.id);

    const responseBody: ProgressResponse = {
      progress,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
