import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiHttpError } from "./errors";
import { isLocalMockEnabled, DEMO_USER } from "./mock-dev-store";

let cachedSupabaseAuth: SupabaseClient | null = null;

// 03_API_VA_LUU_TRU Muc 8: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
export function getSupabaseAuth(): SupabaseClient {
  if (cachedSupabaseAuth) {
    return cachedSupabaseAuth;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Thiếu cấu hình Supabase");
  }

  cachedSupabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabaseAuth;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  display_name?: string | null;
}

// API-04: Header Authorization: Bearer <access_token>
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  if (!token) {
    throw new ApiHttpError("ERR_UNAUTHENTICATED");
  }

  // Ho tro dev local mock bypass
  if (isLocalMockEnabled() || token === "dev-bypass-mock-token") {
    return DEMO_USER;
  }

  const supabase = getSupabaseAuth();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiHttpError("ERR_UNAUTHENTICATED");
  }

  const displayName =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    null;

  return {
    id: user.id,
    email: user.email,
    display_name: displayName,
  };
}

// API-04: Xac thuc request Bearer token, thieu/sai => ERR_UNAUTHENTICATED (401)
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  // Neu dang bat LOCAL_DEV_MOCK thi tu dong tra ve Demo user ngay ca khi chua gan header
  if (isLocalMockEnabled()) {
    return DEMO_USER;
  }

  const token = extractBearerToken(req);
  if (!token) {
    throw new ApiHttpError("ERR_UNAUTHENTICATED");
  }
  return verifyToken(token);
}
