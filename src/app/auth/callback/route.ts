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
  return NextResponse.redirect(new URL(next, publicOrigin(request, url)));
}

/**
 * Origin công khai của app. Sau proxy (Cloud Run, Vercel) `request.url` của bản standalone mang host nội bộ
 * (VD `localhost:8080`) ⇒ dựng lại từ `x-forwarded-host` / `host` + `x-forwarded-proto`.
 */
function publicOrigin(request: Request, url: URL): string {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  if (!host || !/^[a-z0-9.\-]+(:\d+)?$/i.test(host)) return url.origin;
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0].trim();
  return `${proto === "http" ? "http" : "https"}://${host}`;
}
