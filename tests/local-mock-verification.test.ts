import { describe, it, expect, beforeAll } from "vitest";

describe("KIỂM TRA CHẾ ĐỘ GIẢ LẬP LOCAL MOCK (LOCAL_DEV_MOCK=true)", () => {
  beforeAll(() => {
    process.env.LOCAL_DEV_MOCK = "true";
    process.env.NEXT_PUBLIC_BYPASS_AUTH = "true";
  });

  it("GET /api/me: Tự động trả về hồ sơ Demo Learner và 16 kỹ năng mà không cần Supabase/Postgres", async () => {
    const { GET } = await import("@/app/api/me/route");
    const req = new Request("http://localhost:3000/api/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.display_name).toContain("Demo Learner");
    expect(Object.keys(data.profile.skills).length).toBe(16);
  });

  it("POST /api/demo/persona: Đổi persona sang SENIOR_RUSTY mượt mà", async () => {
    const { POST } = await import("@/app/api/demo/persona/route");
    const req = new Request("http://localhost:3000/api/demo/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "SENIOR_RUSTY" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.skills.HTTP_ROUTING.p_mastery).toBe(0.95);
  });

  it("POST /api/ingest: Tự động nạp repo mẫu và trả về phiên học demo", async () => {
    const { POST } = await import("@/app/api/ingest/route");
    const req = new Request("http://localhost:3000/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: "https://github.com/simplifey/shop-api" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session_id).toBeDefined();
    expect(data.result.nodes.length).toBeGreaterThan(0);
  });

  it("GET /api/sessions: Trả về danh sách khóa học cho trang Roadmap", async () => {
    const { GET } = await import("@/app/api/sessions/route");
    const req = new Request("http://localhost:3000/api/sessions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessions.length).toBeGreaterThan(0);
  });

  it("GET /api/sessions/{id}/progress: Trả về đồ thị tiến độ cho buồng lái học tập", async () => {
    const { GET } = await import("@/app/api/sessions/[id]/progress/route");
    const req = new Request("http://localhost:3000/api/sessions/demo/progress");
    const res = await GET(req, { params: Promise.resolve({ id: "demo" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progress.nodes["slice-register"].status).toBe("COMPLETED");
  });

  it("POST /api/evaluate-feynman: Chấm bài giải thích Feynman và mở khóa node tiếp theo", async () => {
    const { POST } = await import("@/app/api/evaluate-feynman/route");
    const req = new Request("http://localhost:3000/api/evaluate-feynman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: "demo",
        run_id: "demo-run",
        question_index: 1,
        attempt_number: 1,
        student_answer: "Controller nhận request, JwtAuthGuard kiểm tra token và Service cập nhật database.",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.is_passed).toBe(true);
    expect(data.unlocked_node_ids).toContain("slice-cart");
  });

  it("GET /api/sessions/{id}/history: Trả về lịch sử làm bài cho trang Report", async () => {
    const { GET } = await import("@/app/api/sessions/[id]/history/route");
    const req = new Request("http://localhost:3000/api/sessions/demo/history");
    const res = await GET(req, { params: Promise.resolve({ id: "demo" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
  });
});
