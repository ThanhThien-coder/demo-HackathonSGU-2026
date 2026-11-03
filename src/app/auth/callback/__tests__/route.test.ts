import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockExchangeCode = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
    },
  })),
}));

describe("GET /auth/callback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("chuyển hướng về / nếu thiếu cấu hình Supabase", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const req = new NextRequest("http://localhost:3000/auth/callback?code=123");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("thành công: exchange code và chuyển hướng về đường dẫn nội bộ next", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code&next=/roadmap"
    );
    const res = await GET(req);

    expect(mockExchangeCode).toHaveBeenCalledWith("valid-code");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/roadmap");
  });

  it("chống lỗ hổng Open Redirect: nếu next trỏ sang domain ngoài, fallback về /", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code&next=https://evil.com/hack"
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("chuyển hướng về /?error=auth_failed khi exchange code gặp lỗi", async () => {
    mockExchangeCode.mockResolvedValue({
      error: new Error("Invalid code"),
    });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=bad-code"
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=auth_failed"
    );
  });

  it("chuyển hướng về /?error=auth_failed khi không có code", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=auth_failed"
    );
  });
});
