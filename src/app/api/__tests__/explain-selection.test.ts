/**
 * src/app/api/__tests__/explain-selection.test.ts
 *
 * Kiểm thử route POST /api/explain-selection (TASK_15 — AI-38 / spec 03 Mục 6.9, spec 20 Mục 8).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG, type StaticEngineResult } from "@/contracts";
import { clearEngineCache } from "@/server/cache";
import type { SessionRecord } from "@/server/session";
import { explainSelection } from "@/server/ai/explain";
import { POST } from "../explain-selection/route";

const { mockGetUser, mockSql } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = Object.assign(vi.fn(), { json: (v: unknown) => v });
  return {
    mockGetUser: getUser,
    mockSql: sqlFn,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock("@/server/ai/explain", () => ({
  explainSelection: vi.fn(async () => ({ explanation: null, references: [], tokens_used: 0 })),
}));

vi.mock("@/server/db", () => ({
  sql: mockSql,
  db: {
    sql: mockSql,
    tx: (cb: (tx: unknown) => unknown) => cb(mockSql),
  },
}));

const shopApiFixturePath = resolve(
  __dirname,
  "../../../server/engine/__fixtures__/shop-api.json",
);

const baseShopApi: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8"),
);

const testGraph: StaticEngineResult = {
  ...baseShopApi,
  nodes: [
    ...baseShopApi.nodes,
    {
      ...baseShopApi.nodes[0],
      id: "node-with-marker",
      trace_steps: [
        {
          step_number: 1,
          layer: "ENTRY_POINT",
          file_path: "src/test.ts",
          function_name: "testFn",
          line_start: 10,
          line_end: 14,
          snippet: "const a = 1;\n// ... omitted ...\nconst b = 2;",
          snippet_line_map: [10, 0, 12],
        },
      ],
    },
    {
      ...baseShopApi.nodes[0],
      id: "node-with-long-code",
      trace_steps: [
        {
          step_number: 1,
          layer: "ENTRY_POINT",
          file_path: "src/long.ts",
          function_name: "longFn",
          line_start: 1,
          line_end: 1,
          snippet: "x".repeat(350),
          snippet_line_map: [1],
        },
      ],
    },
  ],
};

function createMockRequest(
  body: Record<string, unknown> | null,
  options?: { token?: string },
): Request {
  const headers = new Headers();
  if (options?.token !== undefined) {
    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }
  } else {
    headers.set("Authorization", "Bearer valid-test-token");
  }

  headers.set("Content-Type", "application/json");
  return new Request("http://localhost:3000/api/explain-selection", {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body) : "",
  });
}

describe("POST /api/explain-selection (TASK_15 — AI-38)", () => {
  let currentSessionRecord: SessionRecord;

  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    currentSessionRecord = {
      id: "session-explain-test-1",
      user_id: "user-test-123",
      source: "GITHUB",
      repo_key: testGraph.snapshot.repo_key,
      snapshot_id: testGraph.snapshot.snapshot_id,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: testGraph.snapshot.subdir,
      ref_label: testGraph.snapshot.ref_label,
      repo_name: testGraph.repo_name,
      engine_version: CONFIG.ENGINE_VERSION,
      tokens_used: 0,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      graph_skeleton: testGraph.nodes.map((n) => ({
        node_id: n.id,
        title: n.title,
        prerequisites: n.prerequisites,
        is_capstone: n.is_capstone,
      })),
    };

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-test-123",
          email: "learner@test.com",
        },
      },
      error: null,
    });

    mockSql.mockImplementation(
      async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

        if (
          query.includes("FROM learning_sessions") &&
          query.includes("WHERE id =")
        ) {
          if (query.includes("user_id =")) {
            return [currentSessionRecord];
          }
          return [currentSessionRecord];
        }

        if (query.includes("FROM session_snapshots")) {
          return [{ result: testGraph }];
        }

        return [];
      },
    );
  });

  it("AI-38 vùng chọn đúng ⇒ 200, gọi explainSelection (C-11)", async () => {
    // slice-cart step 1, line 7 starts with "router"
    const req = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "router",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.explanation).toBeNull();
    expect(explainSelection).toHaveBeenCalled();
  });

  it("AI-38 selected_text khác đoạn cắt ⇒ 400 ERR_SELECTION_INVALID", async () => {
    const req = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "express",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_SELECTION_INVALID");
    expect(body.error.retryable).toBe(false);
  });

  it("AI-38 khác nhau chỉ ở khoảng trắng 2 đầu ⇒ vẫn hợp lệ", async () => {
    const req = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "  router  \n",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.explanation).toBeNull();
    expect(explainSelection).toHaveBeenCalled();
  });

  it("AI-38 nhiều dòng, cột đúng ⇒ hợp lệ", async () => {
    // Multi-line in slice-cart step 1:
    // Line 7: "router.post('/cart/items', authMiddleware, async (req, res) => {"
    // Line 8: "  const cart = await cartService.addItem(req.user.id, req.body);"
    // col 1..13 on line 8 is "  const cart"
    const expectedMultiLineText =
      "router.post('/cart/items', authMiddleware, async (req, res) => {\n  const cart";

    const req = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 8,
        col_end: 13,
      },
      selected_text: expectedMultiLineText,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.explanation).toBeNull();
    expect(explainSelection).toHaveBeenCalled();
  });

  it("AI-38 dòng không có trong map, dòng marker, marker xen giữa ⇒ 400", async () => {
    // 1. Dòng không có trong map (line 99)
    const req1 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 99,
        col_start: 1,
        line_end: 99,
        col_end: 5,
      },
      selected_text: "test",
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);
    expect((await res1.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // 2. Dòng marker (line 0)
    const req2 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "node-with-marker",
      step_number: 1,
      range: {
        line_start: 0,
        col_start: 1,
        line_end: 0,
        col_end: 5,
      },
      selected_text: "// ...",
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
    expect((await res2.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // 3. Marker xen giữa (line 10 tới line 12, với marker 0 ở giữa: [10, 0, 12])
    const req3 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "node-with-marker",
      step_number: 1,
      range: {
        line_start: 10,
        col_start: 1,
        line_end: 12,
        col_end: 10,
      },
      selected_text: "const a = 1;\n// ... omitted ...\nconst b =",
    });
    const res3 = await POST(req3);
    expect(res3.status).toBe(400);
    expect((await res3.json()).error.code).toBe("ERR_SELECTION_INVALID");
  });

  it("AI-38 quá EXPLAIN_SELECTION_MAX_CHARS ⇒ 400", async () => {
    // node-with-long-code has line of 350 chars; selecting 301 chars exceeds CONFIG.EXPLAIN_SELECTION_MAX_CHARS (300)
    const longText = "x".repeat(305);
    const req = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "node-with-long-code",
      step_number: 1,
      range: {
        line_start: 1,
        col_start: 1,
        line_end: 1,
        col_end: 306,
      },
      selected_text: longText,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_SELECTION_INVALID");
  });

  it("AI-38 step_number hoặc node_id lạ ⇒ 400", async () => {
    // node_id lạ
    const req1 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "non-existent-node",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "router",
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);
    expect((await res1.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // step_number lạ
    const req2 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 999,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "router",
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
    expect((await res2.json()).error.code).toBe("ERR_SELECTION_INVALID");
  });

  it("AI-38 chưa đăng nhập ⇒ 401", async () => {
    const req = createMockRequest(
      {
        session_id: "session-explain-test-1",
        node_id: "slice-cart",
        step_number: 1,
        range: {
          line_start: 7,
          col_start: 1,
          line_end: 7,
          col_end: 7,
        },
        selected_text: "router",
      },
      { token: "" },
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_UNAUTHENTICATED");
  });

  it("AI-38 phiên không thuộc người gọi ⇒ ERR_SESSION_NOT_FOUND", async () => {
    mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings);
      if (query.includes("FROM learning_sessions")) {
        // Return empty: not found or not owned
        return [];
      }
      return [];
    });

    const req = createMockRequest({
      session_id: "session-of-other-user",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "router",
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_SESSION_NOT_FOUND");
  });

  it("AI-38 thiếu session_id ⇒ ERR_SESSION_NOT_FOUND", async () => {
    const req = createMockRequest({
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 7,
      },
      selected_text: "router",
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_SESSION_NOT_FOUND");
  });

  it("AI-38 thiếu trường hoặc sai kiểu ở node_id, step_number, range, selected_text ⇒ ERR_SELECTION_INVALID", async () => {
    // Thiếu node_id
    const res1 = await POST(
      createMockRequest({
        session_id: "session-explain-test-1",
        step_number: 1,
        range: { line_start: 7, col_start: 1, line_end: 7, col_end: 7 },
        selected_text: "router",
      }),
    );
    expect(res1.status).toBe(400);
    expect((await res1.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // Sai kiểu step_number
    const res2 = await POST(
      createMockRequest({
        session_id: "session-explain-test-1",
        node_id: "slice-cart",
        step_number: "one",
        range: { line_start: 7, col_start: 1, line_end: 7, col_end: 7 },
        selected_text: "router",
      }),
    );
    expect(res2.status).toBe(400);
    expect((await res2.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // Thiếu range
    const res3 = await POST(
      createMockRequest({
        session_id: "session-explain-test-1",
        node_id: "slice-cart",
        step_number: 1,
        selected_text: "router",
      }),
    );
    expect(res3.status).toBe(400);
    expect((await res3.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // Thiếu selected_text
    const res4 = await POST(
      createMockRequest({
        session_id: "session-explain-test-1",
        node_id: "slice-cart",
        step_number: 1,
        range: { line_start: 7, col_start: 1, line_end: 7, col_end: 7 },
      }),
    );
    expect(res4.status).toBe(400);
    expect((await res4.json()).error.code).toBe("ERR_SELECTION_INVALID");
  });

  it("AI-38 vùng ra ngoài dòng hoặc rỗng ⇒ ERR_SELECTION_INVALID", async () => {
    // Cột ra ngoài dòng (line 7 length is 63, col_end 100 exceeds line length + 1)
    const req1 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 1,
        line_end: 7,
        col_end: 100,
      },
      selected_text: "anything",
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);
    expect((await res1.json()).error.code).toBe("ERR_SELECTION_INVALID");

    // Cột đảo ngược col_start >= col_end (rỗng)
    const req2 = createMockRequest({
      session_id: "session-explain-test-1",
      node_id: "slice-cart",
      step_number: 1,
      range: {
        line_start: 7,
        col_start: 5,
        line_end: 7,
        col_end: 5,
      },
      selected_text: "",
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
    expect((await res2.json()).error.code).toBe("ERR_SELECTION_INVALID");
  });
});
