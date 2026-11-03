import type { EnrichNodeRequest } from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { enrichNode } from "@/server/enrich";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { isLocalMockEnabled, mockDevStore } from "@/server/mock-dev-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 8, Muc 6.1: POST /api/enrich-node -> EnrichNodeResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Partial<EnrichNodeRequest>;
    try {
      body = (await request.json()) as Partial<EnrichNodeRequest>;
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    if (!body?.session_id) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    if (!body?.node_id) {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    if (isLocalMockEnabled()) {
      return new Response(
        JSON.stringify(mockDevStore.enrichNode(body.session_id, body.node_id, body.mode || "LEARN")),
        {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const responseData = await enrichNode(
      {
        session_id: body.session_id,
        node_id: body.node_id,
        mode: body.mode ?? "LEARN",
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
