import { CONFIG } from "@/contracts";
import { sql } from "./db";
import { ApiHttpError } from "./errors";

/**
 * Kiem tra han muc token phien hoc (AI-06, API-06).
 * Truoc moi loi goi AI: tokens_used >= CONFIG.SESSION_TOKEN_QUOTA => ERR_TOKEN_QUOTA_EXCEEDED.
 */
export function checkTokenQuota(tokensUsed: number): void {
  if (tokensUsed >= CONFIG.SESSION_TOKEN_QUOTA) {
    throw new ApiHttpError("ERR_TOKEN_QUOTA_EXCEEDED");
  }
}

/**
 * Kiem tra han muc token cua mot phien hoc tu co so du lieu (AI-06).
 */
export async function assertSessionTokenQuota(sessionId: string): Promise<number> {
  const rows = await sql<Array<{ tokens_used: number }>>`
    SELECT tokens_used
    FROM learning_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  const tokensUsed = rows[0].tokens_used;
  checkTokenQuota(tokensUsed);
  return tokensUsed;
}

/**
 * Cong don so token da dung vao phien hoc sau khi goi AI (AI-07, API-06).
 * Cap nhat ngoai transaction.
 */
export async function addSessionTokens(
  sessionId: string,
  tokensIn: number,
  tokensOut: number,
  thoughtsTokens: number = 0
): Promise<number> {
  const totalToAdd = tokensIn + tokensOut + thoughtsTokens;
  if (totalToAdd <= 0) {
    const rows = await sql<Array<{ tokens_used: number }>>`
      SELECT tokens_used FROM learning_sessions WHERE id = ${sessionId} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
    }
    return rows[0].tokens_used;
  }

  const rows = await sql<Array<{ tokens_used: number }>>`
    UPDATE learning_sessions
    SET tokens_used = tokens_used + ${totalToAdd},
        last_active_at = now()
    WHERE id = ${sessionId}
    RETURNING tokens_used
  `;

  if (rows.length === 0) {
    throw new ApiHttpError("ERR_SESSION_NOT_FOUND");
  }

  return rows[0].tokens_used;
}
