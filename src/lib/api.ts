import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import type { ErrorCode, ApiError } from "@/contracts";

export type { ErrorCode, ApiError };

/**
 * Lớp lỗi chuẩn hóa cho client API SimpliFey.
 * Vừa kế thừa Error chuẩn của JS/TS, vừa hiện thực trọn vẹn interface ApiError của spec/02.
 */
export class ApiClientError extends Error implements ApiError {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, string | number | boolean>;
  };

  constructor(error: ApiError["error"]) {
    super(error.message);
    this.name = "ApiClientError";
    this.error = error;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

/**
 * Type guard kiểm tra một đối tượng có phải cấu trúc ApiError chuẩn hay không.
 * Khớp cả ApiClientError lẫn object lỗi { error: { code, message, retryable } } từ server.
 */
export function isApiError(err: unknown): err is ApiError {
  if (typeof err !== "object" || err === null) return false;
  const candidate = err as { error?: unknown };
  if (typeof candidate.error !== "object" || candidate.error === null) return false;
  const inner = candidate.error as {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
  };
  return (
    typeof inner.code === "string" &&
    typeof inner.message === "string" &&
    typeof inner.retryable === "boolean"
  );
}

/**
 * Singleton lấy Supabase Client trên môi trường trình duyệt (CSR).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  return createClient();
}

/**
 * Lấy Bearer access_token cho các request API.
 * Hỗ trợ cờ dev NEXT_PUBLIC_BYPASS_AUTH === "true" để chạy thử UI mượt mà khi chưa đăng nhập.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // Bỏ qua lỗi đọc session, tiếp tục fallback
    }
  }

  // Hỗ trợ Dev Mock & Bypass Auth cho kiểm thử giao diện
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
    return "dev-bypass-mock-token";
  }

  return null;
}

/**
 * Xây dựng URL hoàn chỉnh dựa trên Base URL NEXT_PUBLIC_API_URL và endpoint tương đối.
 */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Helper tạo lỗi mạng ERR_CLIENT_NETWORK chuẩn hóa.
 */
export function createClientNetworkError(
  message = "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra lại đường truyền mạng.",
  details?: Record<string, string | number | boolean>
): ApiClientError {
  return new ApiClientError({
    code: "ERR_CLIENT_NETWORK",
    message,
    retryable: true,
    details,
  });
}

export type ApiResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: ApiError };

/**
 * Hàm gọi API nền tảng cho frontend SimpliFey.
 *
 * Tính năng:
 * - Tự động gắn token `Authorization: Bearer <token>` từ Supabase session.
 * - Tự động set `Content-Type: application/json` (trừ khi body là FormData).
 * - Chuẩn hóa toàn bộ lỗi mạng / parse JSON về `ERR_CLIENT_NETWORK`.
 * - Bắt lỗi HTTP non-2xx và ném đối tượng `ApiClientError` (hiện thực `ApiError`), không quăng unhandled error.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const headers = new Headers(options?.headers);

  // 1. Tự động gắn Bearer Token nếu chưa có
  if (!headers.has("Authorization")) {
    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  let body = options?.body;

  // 2. Tự động set Content-Type và format JSON nếu là object thuần
  if (!isFormData) {
    if (
      body &&
      typeof body === "object" &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) &&
      !(body instanceof URLSearchParams)
    ) {
      body = JSON.stringify(body);
    }

    if (!headers.has("Content-Type") && body) {
      headers.set("Content-Type", "application/json");
    }
  }

  // 3. Thực thi fetch và bắt lỗi kết nối mạng
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (networkError) {
    throw createClientNetworkError(
      "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra lại đường truyền mạng.",
      {
        reason:
          networkError instanceof Error
            ? networkError.message
            : String(networkError),
      }
    );
  }

  // 4. Xử lý HTTP 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 5. Đọc text và parse JSON an toàn
  const rawText = await response.text();
  let parsedJson: unknown = null;
  let isJson = false;

  if (rawText) {
    try {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  // 6. Xử lý trạng thái HTTP không thành công (non-2xx)
  if (!response.ok) {
    if (isJson && isApiError(parsedJson)) {
      throw new ApiClientError(parsedJson.error);
    }

    // Dự phòng khi server trả về trang lỗi HTML hoặc proxy 502/503/504
    let fallbackCode: ErrorCode = "ERR_CLIENT_NETWORK";
    let retryable = false;

    if (response.status === 401) {
      fallbackCode = "ERR_UNAUTHENTICATED";
    } else if (response.status === 404) {
      fallbackCode = "ERR_SESSION_NOT_FOUND";
    } else if (response.status === 429) {
      fallbackCode = "ERR_GITHUB_RATE_LIMIT_CDN";
      retryable = true;
    } else if (response.status === 503) {
      fallbackCode = "ERR_PERSISTENCE_UNAVAILABLE";
      retryable = true;
    } else if (response.status === 504) {
      fallbackCode = "ERR_NETWORK_TIMEOUT";
      retryable = true;
    } else if (response.status >= 500) {
      fallbackCode = "ERR_CLIENT_NETWORK";
      retryable = true;
    }

    const message =
      isJson &&
      typeof parsedJson === "object" &&
      parsedJson !== null &&
      "message" in parsedJson &&
      typeof (parsedJson as { message: unknown }).message === "string"
        ? (parsedJson as { message: string }).message
        : response.statusText || `Lỗi yêu cầu máy chủ (HTTP ${response.status})`;

    throw new ApiClientError({
      code: fallbackCode,
      message,
      retryable,
      details: {
        status: response.status,
        statusText: response.statusText,
      },
    });
  }

  // 7. Xử lý kết quả trả về khi thành công (2xx)
  if (!isJson && rawText) {
    return rawText as unknown as T;
  }

  return (parsedJson ?? null) as T;
}

/**
 * Phiên bản Safe của apiFetch dành cho các component không muốn dùng khối try-catch.
 * Trả về kết quả dạng { ok: true, data } hoặc { ok: false, error }.
 */
export async function apiFetchSafe<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const data = await apiFetch<T>(endpoint, options);
    return { ok: true, data, error: null };
  } catch (err) {
    if (isApiError(err)) {
      return { ok: false, data: null, error: err };
    }
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_CLIENT_NETWORK",
          message: err instanceof Error ? err.message : "Lỗi kết nối",
          retryable: true,
        },
      },
    };
  }
}
