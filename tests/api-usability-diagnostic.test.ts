import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * BỘ TEST CHẨN ĐOÁN TOÀN DIỆN MÔI TRƯỜNG VÀ TÍNH SẴN SÀNG THỰC TẾ CỦA 14 API
 * Đối chiếu theo spec/03_API_VA_LUU_TRU.md và API_INTEGRATION_PROMPTS.md.
 */

describe("TẦNG 1: Kiểm tra Biến Môi trường và Hạ tầng (Environment & Infrastructure)", () => {
  it("Kiểm tra sự tồn tại của file cấu hình môi trường (.env.local hoặc .env)", () => {
    const hasEnvLocal = fs.existsSync(path.resolve(process.cwd(), ".env.local"));
    const hasEnv = fs.existsSync(path.resolve(process.cwd(), ".env"));
    
    // Ghi nhận trạng thái thực tế
    console.log(`[ENV CHECK] .env.local exists: ${hasEnvLocal}`);
    console.log(`[ENV CHECK] .env exists: ${hasEnv}`);

    // Báo cáo chẩn đoán
    expect(hasEnvLocal || hasEnv, "Thiếu file .env.local hoặc .env trên máy local! Hệ thống đang chạy không có cấu hình thực tế.").toBe(true);
  });

  it("Kiểm tra cấu hình Supabase Auth thực tế (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)", () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log(`[AUTH CONFIG] NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "ĐÃ CẤU HÌNH" : "THIẾU / UNDEFINED"}`);
    console.log(`[AUTH CONFIG] NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "ĐÃ CẤU HÌNH" : "THIẾU / UNDEFINED"}`);

    expect(Boolean(supabaseUrl && !supabaseUrl.includes("dummy.supabase.co")), "NEXT_PUBLIC_SUPABASE_URL chưa được cấu hình hoặc đang trỏ về dummy URL").toBe(true);
    expect(Boolean(supabaseAnonKey && supabaseAnonKey !== "dummy-anon-key"), "NEXT_PUBLIC_SUPABASE_ANON_KEY chưa được cấu hình hoặc đang là dummy key").toBe(true);
  });

  it("Kiểm tra kết nối Cơ sở dữ liệu Postgres (DATABASE_URL)", () => {
    const dbUrl = process.env.DATABASE_URL;
    console.log(`[DATABASE CONFIG] DATABASE_URL: ${dbUrl ? "ĐÃ CẤU HÌNH" : "THIẾU / UNDEFINED"}`);
    expect(Boolean(dbUrl), "DATABASE_URL chưa được cấu hình. Mọi thao tác lưu trữ bảng profiles, sessions, progress sẽ ném ERR_PERSISTENCE_UNAVAILABLE").toBe(true);
  });

  it("Kiểm tra cấu hình AI Engine (GEMINI_API_KEY hoặc GEMINI_BACKEND)", () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiBackend = process.env.GEMINI_BACKEND;
    console.log(`[AI CONFIG] GEMINI_API_KEY: ${geminiKey ? "ĐÃ CẤU HÌNH" : "THIẾU / UNDEFINED"}`);
    console.log(`[AI CONFIG] GEMINI_BACKEND: ${geminiBackend || "vertex (mặc định)"}`);
    expect(Boolean(geminiKey || geminiBackend === "vertex"), "GEMINI_API_KEY hoặc GEMINI_BACKEND chưa được cấu hình để gọi thật AI Gemini").toBe(true);
  });
});

describe("TẦNG 2: Kiểm tra Sự Tồn Tại Của Route Handler Backend (spec/03 Mục 2)", () => {
  const REQUIRED_ROUTES = [
    { id: "Bước 0.5", path: "src/app/auth/callback/route.ts", endpoint: "GET /auth/callback", desc: "PKCE OAuth Exchange" },
    { id: "Bước 1", path: "src/app/api/me/route.ts", endpoint: "GET /api/me", desc: "Lấy thông tin tài khoản & BKT" },
    { id: "Bước 2", path: "src/app/api/demo/persona/route.ts", endpoint: "POST /api/demo/persona", desc: "Nạp hồ sơ giả lập persona" },
    { id: "Bước 3", path: "src/app/api/me/route.ts", endpoint: "DELETE /api/me", desc: "Xóa tài khoản cá nhân" },
    { id: "Bước 4", path: "src/app/api/ingest/route.ts", endpoint: "POST /api/ingest", desc: "Ingest repo GitHub / file ZIP" },
    { id: "Bước 5", path: "src/app/api/sessions/route.ts", endpoint: "GET /api/sessions", desc: "Lấy danh sách các phiên học" },
    { id: "Bước 6", path: "src/app/api/sessions/[id]/progress/route.ts", endpoint: "GET /api/sessions/{id}/progress", desc: "Lấy tiến độ đồ thị node" },
    { id: "Bước 7", path: "src/app/api/sessions/[id]/history/route.ts", endpoint: "GET /api/sessions/{id}/history", desc: "Lịch sử câu hỏi đã làm" },
    { id: "Bước 8", path: "src/app/api/analyze-node/route.ts", endpoint: "POST /api/analyze-node", desc: "Phân tích X-Ray node" },
    { id: "Bước 9", path: "src/app/api/analyze-overview/route.ts", endpoint: "POST /api/analyze-overview", desc: "Phân tích tổng quan kiến trúc" },
    { id: "Bước 10", path: "src/app/api/enrich-node/route.ts", endpoint: "POST /api/enrich-node", desc: "Lấy câu hỏi Feynman" },
    { id: "Bước 11", path: "src/app/api/evaluate-feynman/route.ts", endpoint: "POST /api/evaluate-feynman", desc: "Chấm bài giải thích Feynman" },
    { id: "Bước 12", path: "src/app/api/reveal/route.ts", endpoint: "POST /api/reveal", desc: "Bỏ qua & mở đáp án câu hỏi" },
    { id: "Bước 13", path: "src/app/api/report-wrong/route.ts", endpoint: "POST /api/report-wrong", desc: "Báo sai kết quả đánh giá" },
    { id: "Health", path: "src/app/api/health/route.ts", endpoint: "GET /api/health", desc: "Health check hạ tầng" },
  ];

  REQUIRED_ROUTES.forEach((route) => {
    it(`Kiểm tra Route Handler ${route.endpoint} (${route.id}: ${route.desc})`, () => {
      const fullPath = path.resolve(process.cwd(), route.path);
      const exists = fs.existsSync(fullPath);
      console.log(`[ROUTE CHECK] ${route.endpoint.padEnd(35)} -> ${exists ? "✅ TỒN TẠI" : "❌ CHƯA CÓ FILE"} (${route.path})`);
      expect(exists, `Thiếu Route Handler file cho ${route.endpoint} tại ${route.path}! Phía client gọi sẽ bị trả về 404 Not Found`).toBe(true);
    });
  });
});

describe("TẦNG 3: Kiểm tra Khả Năng Thực Thi Trực Tiếp của Các Route Handler Đang Có", () => {
  it("GET /api/health: Phải trả về 200 OK với body 'ok' (Không phụ thuộc Auth/DB)", async () => {
    const { GET: healthHandler } = await import("@/app/api/health/route");
    const response = await healthHandler();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("ok");
  });

  it("GET /auth/callback: Xử lý redirect khi không có mã auth code hoặc thiếu env", async () => {
    const { GET: callbackHandler } = await import("@/app/auth/callback/route");
    const req = new Request("http://localhost:3000/auth/callback");
    const response = await callbackHandler(req as any);
    // Khi thiếu env hoặc code, route redirect về / hoặc /?error=auth_failed
    expect([302, 307]).toContain(response.status);
    const location = response.headers.get("location");
    console.log(`[AUTH CALLBACK TEST] Redirect location: ${location}`);
    expect(location).toBeDefined();
  });

  it("GET /api/me: Kiểm tra phản hồi khi chưa đăng nhập (Phải trả về 401 ERR_UNAUTHENTICATED)", async () => {
    const { GET: meHandler } = await import("@/app/api/me/route");
    const req = new Request("http://localhost:3000/api/me");
    const response = await meHandler(req);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
  });

  it("POST /api/ingest: Kiểm tra phản hồi khi chưa đăng nhập (Phải trả về 401 ERR_UNAUTHENTICATED)", async () => {
    const { POST: ingestHandler } = await import("@/app/api/ingest/route");
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: { kind: "REPO_URL", url: "https://github.com/expressjs/express" } }),
    });
    const response = await ingestHandler(req);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
  });
});
