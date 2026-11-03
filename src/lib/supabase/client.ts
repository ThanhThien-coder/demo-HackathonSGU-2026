import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Khởi tạo singleton Supabase client cho trình duyệt (CSR) sử dụng @supabase/ssr.
 * Tự động đồng bộ cookie phiên với server và Route Handler.
 */
export function createClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Trả về dummy client nếu thiếu env trong lúc build/test tĩnh
    return createBrowserClient(
      supabaseUrl || "https://dummy.supabase.co",
      supabaseAnonKey || "dummy-anon-key"
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * Hàm kích hoạt luồng đăng nhập GitHub OAuth qua PKCE.
 * Redirect về /auth/callback kèm tham số next an toàn.
 */
export async function signInWithGithub(destinationPath?: string) {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const currentPath = destinationPath || (typeof window !== "undefined" ? window.location.pathname : "/");
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;

  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
    },
  });
}

/**
 * Đăng xuất phiên làm việc hiện tại trên client.
 */
export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
