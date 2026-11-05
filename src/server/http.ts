// Tiện ích route handler mỏng: đọc JSON an toàn, kiểm trường chuỗi.
import { fail } from "./errors";

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("ERR_SESSION_NOT_FOUND");
  return body as Record<string, unknown>;
}

export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const int = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) ? v : Number.NaN);
