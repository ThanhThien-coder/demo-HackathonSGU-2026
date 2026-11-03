import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 03_API_VA_LUU_TRU Muc 2 (D-44): Hoan tat dang nhap GitHub OAuth qua PKCE code exchange
export const dynamic = "force-dynamic";

// Chong open redirect: chi nhan duong dan noi bo. Phan giai bang URL de bat ca
// cac bien the nhu "//evil.com", "/\evil.com", "/<tab>/evil.com".
function safeNextPath(rawNext: string | null, origin: string): string {
  if (!rawNext || !rawNext.startsWith("/")) return "/";
  try {
    const target = new URL(rawNext, origin);
    if (target.origin !== origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/", origin));
  }

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
