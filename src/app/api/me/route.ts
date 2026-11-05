import { createClient } from "@supabase/supabase-js";
import type { MeResponse } from "@/contracts";
import { requireUser } from "@/server/auth";
import { sql } from "@/server/db";
import { handle } from "@/server/errors";
import { dbRead, deleteProfileData, ensureProfile, loadProfile } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle<MeResponse>(async () => {
  const u = await requireUser(req);
  await dbRead(() => ensureProfile(u.userId, u.displayName));
  const now = Date.now();
  return { profile: await dbRead(() => loadProfile(sql, u.userId, now)), server_now: now };
});

// DELETE /api/me ⇒ 204: xóa tài khoản ⇒ cascade mọi bảng
export const DELETE = (req: Request) => handle<null>(async () => {
  const u = await requireUser(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await admin.auth.admin.deleteUser(u.userId);
  } else await dbRead(() => deleteProfileData(u.userId));
  return null;
});
