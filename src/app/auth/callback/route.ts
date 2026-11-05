// D-44 — Supabase OAuth callback (PKCE): đổi code lấy phiên rồi về trang đích an toàn.
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"; // chống open redirect
  if (code) {
    const store = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => { for (const c of list) store.set(c.name, c.value, c.options); },
      },
    });
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
