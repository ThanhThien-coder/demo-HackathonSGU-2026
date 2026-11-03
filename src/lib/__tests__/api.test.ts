import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiFetch,
  apiFetchSafe,
  isApiError,
  ApiClientError,
  buildApiUrl,
  createClientNetworkError,
} from "../api";
import type { ApiError } from "@/contracts";

describe("src/lib/api.ts", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  describe("isApiError & ApiClientError", () => {
    it("nhận diện đúng cấu trúc ApiError chuẩn", () => {
      const validError: ApiError = {
        error: {
          code: "ERR_UNAUTHENTICATED",
          message: "Phiên đăng nhập đã hết hạn.",
          retryable: false,
        },
      };
      expect(isApiError(validError)).toBe(true);

      const clientError = new ApiClientError({
        code: "ERR_CLIENT_NETWORK",
        message: "Mất kết nối",
        retryable: true,
      });
      expect(isApiError(clientError)).toBe(true);
      expect(clientError.name).toBe("ApiClientError");
      expect(clientError.message).toBe("Mất kết nối");
    });

    it("từ chối các object lỗi không đúng chuẩn", () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError(new Error("Lỗi thường"))).toBe(false);
      expect(isApiError({ error: { code: "ERR_UNKNOWN" } })).toBe(false);
      expect(isApiError({ message: "Chỉ có message" })).toBe(false);
    });

    it("tạo đúng ERR_CLIENT_NETWORK từ createClientNetworkError", () => {
      const netErr = createClientNetworkError("Mất mạng", { ping: 0 });
      expect(netErr.error.code).toBe("ERR_CLIENT_NETWORK");
      expect(netErr.error.retryable).toBe(true);
      expect(netErr.error.details).toEqual({ ping: 0 });
    });
  });

  describe("buildApiUrl", () => {
    it("giữ nguyên nếu là absolute URL", () => {
      expect(buildApiUrl("https://example.com/api/test")).toBe("https://example.com/api/test");
      expect(buildApiUrl("http://localhost:3000/api")).toBe("http://localhost:3000/api");
    });

    it("dùng đường dẫn tương đối khi không có NEXT_PUBLIC_API_URL", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(buildApiUrl("/api/me")).toBe("/api/me");
      expect(buildApiUrl("api/me")).toBe("/api/me");
    });

    it("nối đúng tiền tố NEXT_PUBLIC_API_URL nếu có", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://simplifey.app/";
      expect(buildApiUrl("/api/me")).toBe("https://simplifey.app/api/me");
      expect(buildApiUrl("api/sessions")).toBe("https://simplifey.app/api/sessions");
    });
  });

  describe("apiFetch", () => {
    it("trả về dữ liệu JSON khi server phản hồi 200 OK", async () => {
      const mockData = { id: "test", success: true };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockData),
      });

      const res = await apiFetch<typeof mockData>("/api/test");
      expect(res).toEqual(mockData);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });

    it("trả về undefined khi server phản hồi 204 No Content", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => "",
      });

      const res = await apiFetch<void>("/api/me", { method: "DELETE" });
      expect(res).toBeUndefined();
    });

    it("tự động gắn Content-Type application/json khi gửi body là plain object", async () => {
      let passedHeaders: Headers | undefined;
      let passedBody: BodyInit | null | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        passedHeaders = opts.headers;
        passedBody = opts.body;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ok: true }),
        };
      });

      await apiFetch("/api/test", {
        method: "POST",
        body: { repo_url: "https://github.com/test/repo" } as unknown as BodyInit,
      });

      expect(passedHeaders?.get("Content-Type")).toBe("application/json");
      expect(passedBody).toBe(JSON.stringify({ repo_url: "https://github.com/test/repo" }));
    });

    it("không gán Content-Type nếu body là FormData", async () => {
      let passedHeaders: Headers | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        passedHeaders = opts.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ok: true }),
        };
      });

      const formData = new FormData();
      formData.append("file", "dummy");

      await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      expect(passedHeaders?.has("Content-Type")).toBe(false);
    });

    it("tự động gắn token Bearer khi NEXT_PUBLIC_BYPASS_AUTH bật", async () => {
      process.env.NEXT_PUBLIC_BYPASS_AUTH = "true";
      let passedHeaders: Headers | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
        passedHeaders = opts.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ ok: true }),
        };
      });

      await apiFetch("/api/me");
      expect(passedHeaders?.get("Authorization")).toBe("Bearer dev-bypass-mock-token");
    });

    it("chuẩn hóa lỗi mạng thành ERR_CLIENT_NETWORK khi fetch bị lỗi", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      await expect(apiFetch("/api/test")).rejects.toThrow("Mất kết nối tới máy chủ SimpliFey");

      try {
        await apiFetch("/api/test");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.error.code).toBe("ERR_CLIENT_NETWORK");
          expect(err.error.retryable).toBe(true);
        }
      }
    });

    it("bắt và ném ApiClientError khi server trả về lỗi chuẩn ApiError", async () => {
      const serverApiError: ApiError = {
        error: {
          code: "ERR_TOKEN_QUOTA_EXCEEDED",
          message: "Hết token hạn mức.",
          retryable: false,
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => JSON.stringify(serverApiError),
      });

      try {
        await apiFetch("/api/test");
        expect.unreachable("Phải ném lỗi khi status 429");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.error.code).toBe("ERR_TOKEN_QUOTA_EXCEEDED");
          expect(err.error.message).toBe("Hết token hạn mức.");
          expect(err.error.retryable).toBe(false);
        }
      }
    });

    it("chuẩn hóa fallback lỗi khi server trả về non-JSON lỗi", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "<html>503 Service Unavailable</html>",
      });

      try {
        await apiFetch("/api/test");
        expect.unreachable("Phải ném lỗi khi status 503");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
          expect(err.error.retryable).toBe(true);
        }
      }
    });
  });

  describe("apiFetchSafe", () => {
    it("trả về { ok: true, data } khi thành công", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ username: "nquyleee" }),
      });

      const result = await apiFetchSafe<{ username: string }>("/api/me");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.username).toBe("nquyleee");
        expect(result.error).toBeNull();
      }
    });

    it("trả về { ok: false, error } khi thất bại", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () =>
          JSON.stringify({
            error: {
              code: "ERR_UNAUTHENTICATED",
              message: "Chưa đăng nhập",
              retryable: false,
            },
          }),
      });

      const result = await apiFetchSafe("/api/me");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.data).toBeNull();
        expect(result.error.error.code).toBe("ERR_UNAUTHENTICATED");
      }
    });
  });
});
