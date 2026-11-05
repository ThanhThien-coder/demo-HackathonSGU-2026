// 03 Mục 1 (API-04) — xác thực Bearer token Supabase bằng supabase.auth.getUser(token).
import { createClient } from "@supabase/supabase-js";
import { fail } from "./errors";

export interface AuthUser { userId: string; displayName: string | null }

export async function requireUser(req: Request): Promise<AuthUser> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return fail("ERR_UNAUTHENTICATED");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return fail("ERR_UNAUTHENTICATED");
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(m[1]);
  if (error || !data.user) return fail("ERR_UNAUTHENTICATED");
  const meta = data.user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.user_name === "string" && meta.user_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  return { userId: data.user.id, displayName };
}
