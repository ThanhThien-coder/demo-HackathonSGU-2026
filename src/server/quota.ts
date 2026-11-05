// AI-06 — quota token mỗi phiên (đếm ở server); AI_DISABLED khóa khẩn cấp (D-66).
import { CONFIG } from "@/contracts/config";
import { sql } from "./db";
import { fail } from "./errors";

export async function assertQuota(sessionId: string): Promise<void> {
  if (process.env.AI_DISABLED === "true") return fail("ERR_AI_UNAVAILABLE");
  const rows = await sql<{ tokens_used: number }[]>`select tokens_used from learning_sessions where id = ${sessionId}`.catch(
    () => fail("ERR_PERSISTENCE_UNAVAILABLE"),
  );
  if ((rows[0]?.tokens_used ?? 0) >= CONFIG.SESSION_TOKEN_QUOTA) return fail("ERR_TOKEN_QUOTA_EXCEEDED");
}
