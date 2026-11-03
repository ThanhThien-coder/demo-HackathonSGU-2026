import type { RunQuestion } from "@/contracts";
import { planNodeQuestions } from "@/lib/plan";
import { aiCostUsd } from "@/server/ai/gemini";
import { forbiddenKeywords } from "@/server/ai/guard/forbidden";
import { nodeCodeText } from "@/server/ai/guard/text";
import {
  generateQuestions,
  type QuestionsUsage,
} from "@/server/ai/questions";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import {
  buildEnrichResponse,
  checkNodeAvailable,
  createRun,
  createStepRefs,
  findOpenRun,
  loadNodeAnalysis,
  loadUserSkills,
} from "@/server/enrich";
import { ApiHttpError, toErrorResponse } from "@/server/errors";
import { logger } from "@/server/log";
import { getSessionProgress } from "@/server/progress";
import { addSessionTokens } from "@/server/quota";
import {
  getSessionStaticResult,
  verifySessionOwnership,
  type RunRecord,
} from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2 dong 8, Muc 6.1: POST /api/enrich-node -> EnrichNodeResponse
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const nodeId = typeof body.node_id === "string" ? body.node_id.trim() : "";
    const mode = body.mode;

    if (!sessionId) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    if (!nodeId || mode !== "LEARN") {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    // 1. Kiem tra quyen so huu phien (API-05)
    const session = await verifySessionOwnership(sessionId, user.id);

    // Kiem tra nodeId co trong graph_skeleton cua phien
    const inSkeleton = (session.graph_skeleton ?? []).some((n) => n.node_id === nodeId);
    if (!inSkeleton) {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    // 2. Tim run dang do truoc (Idempotent, 03 Muc 6.1, ca D16)
    // Co => tra lai run do ngay, khong doc do thi, khong goi AI
    const openRun = await findOpenRun(session.id, nodeId);
    if (openRun) {
      const progress = await getSessionProgress(session.id, user.id);
      const resBody = buildEnrichResponse(openRun, progress);
      return new Response(JSON.stringify(resBody), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // 3. Kiem tra dieu kien node phai o trang thai AVAILABLE (03 Muc 6.1)
    await checkNodeAvailable(session.id, user.id, nodeId);

    // 4. Kiem tra ket qua phan tich node trong ai_cache (03 Muc 3.3, 6.1)
    const analysis = await loadNodeAnalysis(session, nodeId);

    // 5. Doc diem ky nang cua nguoi hoc (skill_states)
    const skills = await loadUserSkills(user.id);

    // 6. Doc do thi tinh de lay node va doan code da cat (D-59)
    const graph = await getSessionStaticResult(session, user.id);
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new ApiHttpError("ERR_NODE_NOT_AVAILABLE");
    }

    // 7. Lap ke hoach cau hoi (22 Muc 6, BKT-41..49, D-34)
    const plan = planNodeQuestions(
      analysis,
      skills,
      Date.now(),
      node.trace_steps.length
    );

    // 8. Goi AI sinh cau hoi (20 Muc 6, D-37: khong cache cau hoi)
    const usage: QuestionsUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
    let questions: RunQuestion[];

    try {
      questions = await generateQuestions(session, graph, node, analysis, plan, usage);
    } finally {
      // Cong don token va ghi ai_usage ngoai transaction du AI loi hay thanh cong (D-66)
      if (usage.tokens_in + usage.tokens_out > 0) {
        await addSessionTokens(session.id, usage.tokens_in, usage.tokens_out);

        try {
          const costUsd = aiCostUsd(usage.tokens_in, usage.tokens_out);
          await sql`
            INSERT INTO ai_usage (session_id, call_kind, tokens_in, tokens_out, cost_usd)
            VALUES (${session.id}, 'QUESTIONS', ${usage.tokens_in}, ${usage.tokens_out}, ${costUsd})
          `;
        } catch (err: unknown) {
          logger.warn({
            msg: "Ghi ai_usage thất bại",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Neu moi cau hoi deu bi hong (DROPPED) => nem ERR_AI_REJECTED va khong tao run (ca D4, 03 Muc 6.1)
    if (questions.length > 0 && questions.every((q) => q.ended_by === "DROPPED")) {
      throw new ApiHttpError("ERR_AI_REJECTED");
    }

    // 9. Ghi run moi vao Postgres (03 Muc 3, 6.1, D-36)
    const steps = createStepRefs(node.trace_steps);
    const keywords = forbiddenKeywords(graph.fingerprint, nodeCodeText(node));

    let run: RunRecord;
    try {
      run = await createRun(session.id, node.id, "LEARN", questions, steps, keywords);
    } catch (err: unknown) {
      // Hai tab cung tao: insert vi pham node_runs_one_open (ma 23505) => fallback tra run dang do
      const isUniqueViolation =
        typeof err === "object" &&
        err !== null &&
        ("code" in err && (err as { code: unknown }).code === "23505");

      if (isUniqueViolation) {
        const existing = await findOpenRun(session.id, node.id);
        if (existing) {
          run = existing;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // 10. Cap nhat last_active_at cua phien (03 Muc 6.1)
    await sql`
      UPDATE learning_sessions
      SET last_active_at = now()
      WHERE id = ${session.id}
    `;

    // 11. Doc lai tien do sau khi ghi va tra ve EnrichNodeResponse (API-03, INV-07)
    const progressAfter = await getSessionProgress(session.id, user.id);
    const resBody = buildEnrichResponse(run, progressAfter);

    return new Response(JSON.stringify(resBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}
