import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type AnalyzeNodeResponse,
  type NodeAnalysis,
  type StaticEngineResult,
} from "@/contracts";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { clearEngineCache } from "@/server/cache";
import { aiCostUsd } from "@/server/ai/gemini";
import type { SessionRecord } from "@/server/session";
import type { AnalyzeUsage } from "@/server/ai/analyze";
import { POST } from "../analyze-node/route";

const { mockGetUser, mockSql, mockAnalyzeNode } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = vi.fn();
  const analyzeNodeFn = vi.fn();
  return { mockGetUser: getUser, mockSql: sqlFn, mockAnalyzeNode: analyzeNodeFn };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock("@/server/db", () => ({
  sql: mockSql,
  db: {
    sql: mockSql,
    tx: (cb: (tx: unknown) => unknown) => cb(mockSql),
  },
}));

vi.mock("@/server/ai/analyze", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/analyze")>();
  return {
    ...actual,
    analyzeNode: mockAnalyzeNode,
  };
});

const typedShopApi = shopApiFixture as unknown as StaticEngineResult;

const mockAnalysisFixture: NodeAnalysis = {
  node_id: "slice-product-list",
  skeleton_only: false,
  skills: [
    {
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "findById",
      reason: "Vòng for gọi categoryRepo.findById cho từng sản phẩm",
    },
    {
      skill: "LAYERED_SEPARATION",
      step: 1,
      symbol: "productService",
      reason: "Route chỉ gọi productService.listProducts, không tự truy vấn database",
    },
  ],
  architecture: {
    patterns: ["LAYERED", "REPOSITORY"],
    summary: "Chia 3 tầng: route nhận yêu cầu, service xử lý, repository làm việc với database.",
  },
  steps: [
    { step: 1, text: "Nhận yêu cầu GET /products rồi giao cho productService.listProducts." },
    { step: 2, text: "Lấy danh sách bằng productRepo.findAll, rồi gắn loại hàng cho từng sản phẩm bằng categoryRepo.findById." },
    { step: 3, text: "Tìm một loại hàng theo id bằng this.repo.findOne." },
  ],
  strengths: [
    { step: 1, text: "Route không chứa truy vấn database." },
  ],
  weak_points: [
    {
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "findById",
      what: "Vòng for gọi categoryRepo.findById cho từng sản phẩm.",
      consequence: "Càng nhiều sản phẩm, database bị hỏi càng nhiều lần, trang càng chậm.",
    },
  ],
};

function createMockRequest(
  body: Record<string, unknown> | null,
  options?: { token?: string }
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
  return new Request("http://localhost:3000/api/analyze-node", {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body) : "",
  });
}

describe("POST /api/analyze-node (TASK_08 — A07)", () => {
  let sessionTokensUsed = 0;
  let dbAiCache: Map<string, NodeAnalysis>;
  let dbAiUsage: Array<{
    session_id: string;
    call_kind: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  }>;
  let dbNodeProgress: Map<string, { status: string | null; analysis_failed: boolean }>;
  let currentSessionRecord: SessionRecord;

  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    sessionTokensUsed = 0;
    dbAiCache = new Map();
    dbAiUsage = [];
    dbNodeProgress = new Map();

    currentSessionRecord = {
      id: "session-test-uuid-1",
      user_id: "user-test-123",
      source: "GITHUB",
      repo_key: typedShopApi.snapshot.repo_key,
      snapshot_id: typedShopApi.snapshot.snapshot_id,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: typedShopApi.snapshot.subdir,
      ref_label: typedShopApi.snapshot.ref_label,
      repo_name: typedShopApi.repo_name,
      engine_version: CONFIG.ENGINE_VERSION,
      tokens_used: 0,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      graph_skeleton: typedShopApi.nodes.map((n) => ({
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

    mockAnalyzeNode.mockImplementation(
      async (
        _session: unknown,
        _graph: unknown,
        node: { id: string },
        usage?: AnalyzeUsage
      ) => {
        if (usage) {
          usage.tokens_in += 1200;
          usage.tokens_out += 450;
          usage.requests += 1;
        }
        return {
          ...mockAnalysisFixture,
          node_id: node.id,
        };
      }
    );

    mockSql.mockImplementation(async (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

      // 1. SELECT FROM learning_sessions WHERE id =
      if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
        return [
          {
            ...currentSessionRecord,
            tokens_used: sessionTokensUsed,
          },
        ];
      }

      // 2. SELECT FROM session_snapshots
      if (query.includes("FROM session_snapshots")) {
        return [{ result: typedShopApi }];
      }

      // 3. SELECT FROM ai_cache WHERE cache_key =
      if (query.includes("FROM ai_cache") && query.includes("WHERE cache_key =")) {
        const key = String(values[0]);
        if (dbAiCache.has(key)) {
          return [{ payload: dbAiCache.get(key) }];
        }
        return [];
      }

      // 4. INSERT INTO ai_cache
      if (query.includes("INSERT INTO ai_cache")) {
        const key = String(values[0]);
        const payloadRaw = values[1];
        const payload = typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;
        dbAiCache.set(key, payload);
        return [];
      }

      // 5. INSERT INTO ai_usage
      if (query.includes("INSERT INTO ai_usage")) {
        const sessionId = String(values[0]);
        const callKind = query.includes("'ANALYZE'") ? "ANALYZE" : "UNKNOWN";
        const tokensIn = Number(values[1]);
        const tokensOut = Number(values[2]);
        const costUsd = Number(values[3]);
        dbAiUsage.push({
          session_id: sessionId,
          call_kind: callKind,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd,
        });
        return [];
      }

      // 6. UPDATE learning_sessions SET tokens_used =
      if (query.includes("UPDATE learning_sessions") && query.includes("tokens_used = tokens_used +")) {
        const added = Number(values[0]);
        sessionTokensUsed += added;
        return [{ tokens_used: sessionTokensUsed }];
      }

      // 7. SELECT tokens_used FROM learning_sessions
      if (query.includes("SELECT tokens_used FROM learning_sessions")) {
        return [{ tokens_used: sessionTokensUsed }];
      }

      // 8. SELECT FROM node_progress
      if (query.includes("FROM node_progress") && query.includes("WHERE session_id =")) {
        const rows: Array<{ node_id: string; status: string | null; analysis_failed: boolean }> = [];
        for (const [nodeId, prog] of dbNodeProgress.entries()) {
          rows.push({
            node_id: nodeId,
            status: prog.status,
            analysis_failed: prog.analysis_failed,
          });
        }
        return rows;
      }

      // 9. UPDATE node_progress SET analysis_failed = false
      if (query.includes("UPDATE node_progress") && query.includes("analysis_failed = false")) {
        const nodeId = String(values[1]);
        const current = dbNodeProgress.get(nodeId);
        if (current) {
          current.analysis_failed = false;
        }
        return [];
      }

      // 10. INSERT INTO node_progress ... ON CONFLICT
      if (query.includes("INSERT INTO node_progress")) {
        const nodeId = String(values[1]);
        const current = dbNodeProgress.get(nodeId);
        dbNodeProgress.set(nodeId, {
          status: current?.status ?? null,
          analysis_failed: true,
        });
        return [];
      }

      // 11. FROM node_runs
      if (query.includes("FROM node_runs")) {
        return [];
      }

      return [];
    });
  });

  describe("1. Xác thực (API-04)", () => {
    it("trả HTTP 401 ERR_UNAUTHENTICATED khi thiếu header Authorization", async () => {
      const req = createMockRequest(
        { session_id: "session-test-uuid-1", node_id: "slice-product-list" },
        { token: "" }
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });

    it("trả HTTP 401 ERR_UNAUTHENTICATED khi token Supabase không hợp lệ", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const req = createMockRequest(
        { session_id: "session-test-uuid-1", node_id: "slice-product-list" },
        { token: "invalid-token" }
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });
  });

  describe("2. Quyền sở hữu phiên & tham số (API-05)", () => {
    it("trả HTTP 404 ERR_SESSION_NOT_FOUND khi thiếu session_id", async () => {
      const req = createMockRequest({ node_id: "slice-product-list" });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });

    it("trả HTTP 404 ERR_SESSION_NOT_FOUND khi session không thuộc user (API-05)", async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);
        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return []; // Khong tim thay phien cua user
        }
        return [];
      });

      const req = createMockRequest({
        session_id: "alien-session-id",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });

    it("trả HTTP 409 ERR_NODE_NOT_AVAILABLE khi node_id không có trong đồ thị", async () => {
      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "non-existent-node-id",
      });
      const res = await POST(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_NODE_NOT_AVAILABLE");
    });

    it("trả HTTP 410 ERR_SESSION_ENGINE_OUTDATED khi phiên tạo bằng engine_version cũ", async () => {
      currentSessionRecord.engine_version = "1.0.0";

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_ENGINE_OUTDATED");
    });
  });

  describe("3. Trúng ai_cache (03 Mục 6.6, X-13, ca D7)", () => {
    it("trả HTTP 200 AnalyzeNodeResponse dạng view, không gọi AI, tính 0 token và không có dòng mới trong ai_usage (X-13)", async () => {
      const cacheKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|slice-product-list|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      dbAiCache.set(cacheKey, mockAnalysisFixture);

      const initialTokens = 5000;
      sessionTokensUsed = initialTokens;

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: AnalyzeNodeResponse = await res.json();

      expect(json.node_id).toBe("slice-product-list");
      expect(json.analysis).toBeDefined();
      expect(json.analysis?.node_id).toBe("slice-product-list");
      expect(json.analysis?.skills.length).toBe(2);
      expect(json.tokens_used).toBe(initialTokens);
      expect(json.unlocked_node_ids).toEqual([]);

      // Khong goi ham phan tich AI
      expect(mockAnalyzeNode).not.toHaveBeenCalled();

      // X-13: Khong co dong moi nao trong bang ai_usage
      expect(dbAiUsage.length).toBe(0);
    });

    it("ca D7 (.kb/spec/50_TEST_VA_FIXTURE.md Mục 3.4): tokens_used >= SESSION_TOKEN_QUOTA nhưng trúng cache vẫn chạy thành công", async () => {
      const cacheKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|slice-product-list|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      dbAiCache.set(cacheKey, mockAnalysisFixture);

      // Vuot han muc quota token
      sessionTokensUsed = CONFIG.SESSION_TOKEN_QUOTA;

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: AnalyzeNodeResponse = await res.json();
      expect(json.node_id).toBe("slice-product-list");
      expect(json.analysis).not.toBeNull();
      expect(mockAnalyzeNode).not.toHaveBeenCalled();
      expect(dbAiUsage.length).toBe(0);
    });
  });

  describe("4. Trượt ai_cache — Gọi AI thành công (B1, B2, D-66, X-13)", () => {
    it("gọi AI, ghi ai_cache (on conflict do nothing), ghi đúng 1 dòng ai_usage và cộng dồn tokens_used (X-13)", async () => {
      const initialTokens = 1000;
      sessionTokensUsed = initialTokens;

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: AnalyzeNodeResponse = await res.json();

      expect(json.node_id).toBe("slice-product-list");
      expect(json.analysis).toBeDefined();
      expect(json.analysis?.node_id).toBe("slice-product-list");
      expect(json.node_state.analysis_failed).toBe(false);
      expect(json.unlocked_node_ids).toEqual([]);

      // 1. Goi analyzeNode
      expect(mockAnalyzeNode).toHaveBeenCalledTimes(1);

      // 2. ai_cache duoc ghi
      const cacheKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|slice-product-list|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      expect(dbAiCache.has(cacheKey)).toBe(true);

      // 3. X-13: ai_usage duoc ghi dung 1 dong
      expect(dbAiUsage.length).toBe(1);
      const usageRow = dbAiUsage[0];
      expect(usageRow.session_id).toBe("session-test-uuid-1");
      expect(usageRow.call_kind).toBe("ANALYZE");
      expect(usageRow.tokens_in).toBe(1200);
      expect(usageRow.tokens_out).toBe(450);
      const expectedCost = aiCostUsd(1200, 450);
      expect(usageRow.cost_usd).toBeCloseTo(expectedCost, 6);

      // 4. tokens_used duoc cong don: 1000 + 1200 + 450 = 2650
      expect(sessionTokensUsed).toBe(2650);
      expect(json.tokens_used).toBe(2650);
    });

    it("lỗi khi ghi ai_usage chỉ log cảnh báo, không làm hỏng request (D-66)", async () => {
      mockSql.mockImplementation(async (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

        if (query.includes("INSERT INTO ai_usage")) {
          throw new Error("DB transient error on ai_usage");
        }

        if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
          return [{ ...currentSessionRecord, tokens_used: sessionTokensUsed }];
        }
        if (query.includes("FROM session_snapshots")) {
          return [{ result: typedShopApi }];
        }
        if (query.includes("FROM ai_cache") && query.includes("WHERE cache_key =")) {
          return [];
        }
        if (query.includes("INSERT INTO ai_cache")) {
          return [];
        }
        if (query.includes("UPDATE learning_sessions")) {
          sessionTokensUsed += Number(values[0]);
          return [{ tokens_used: sessionTokensUsed }];
        }
        if (query.includes("FROM node_progress")) {
          return [];
        }
        if (query.includes("UPDATE node_progress")) {
          return [];
        }
        if (query.includes("FROM node_runs")) {
          return [];
        }
        return [];
      });

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      // Van tra 200 thanh cong theo D-66
      expect(res.status).toBe(200);
      const json: AnalyzeNodeResponse = await res.json();
      expect(json.node_id).toBe("slice-product-list");
      expect(json.analysis).not.toBeNull();
    });
  });

  describe("5. Trượt ai_cache — Hạn mức token (AI-06, ca D7)", () => {
    it("ca D7: khi tokens_used vượt quota mà trượt cache trả mã lỗi HTTP 429 ERR_TOKEN_QUOTA_EXCEEDED", async () => {
      // Dat tokens_used bang CONFIG.SESSION_TOKEN_QUOTA
      sessionTokensUsed = CONFIG.SESSION_TOKEN_QUOTA;

      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_TOKEN_QUOTA_EXCEEDED");
      expect(mockAnalyzeNode).not.toHaveBeenCalled();
      expect(dbAiUsage.length).toBe(0);
    });
  });

  describe("6. Trượt ai_cache — Phân tích thất bại (analysis = null, D-03 #20)", () => {
    it("khi analyzeNode trả về null: không cache, không ghi ai_usage, đánh dấu analysis_failed = true và mở khóa node con", async () => {
      // Mock analyzeNode tra ve null
      mockAnalyzeNode.mockResolvedValueOnce(null);

      // Node goc slice-register: neu phan tich loi, node con slice-profile se duoc mo khoa (D-03)
      const req = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-register",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json: AnalyzeNodeResponse = await res.json();

      expect(json.node_id).toBe("slice-register");
      expect(json.analysis).toBeNull();
      expect(json.node_state.analysis_failed).toBe(true);

      // Node con slice-profile duoc mo khoa nho soft-bypass D-03
      expect(json.unlocked_node_ids).toContain("slice-profile");

      // Khong ghi vao ai_cache
      expect(dbAiCache.size).toBe(0);

      // Khong ghi ai_usage vi loi goi that bai
      expect(dbAiUsage.length).toBe(0);

      // node_progress co co analysis_failed = true
      expect(dbNodeProgress.get("slice-register")?.analysis_failed).toBe(true);
    });
  });

  describe("7. Dùng chung promise khi hai yêu cầu trùng khóa (03 Mục 3.3, 20 AI-08)", () => {
    it("hai yêu cầu đồng thời cùng khóa chỉ gọi analyzeNode một lần duy nhất qua in-flight promise map", async () => {
      let analyzeCallCount = 0;
      mockAnalyzeNode.mockImplementation(
        async (
          _session: unknown,
          _graph: unknown,
          node: { id: string },
          usage?: AnalyzeUsage
        ) => {
          analyzeCallCount++;
          // Gia lap do tre mang de hai request chay dong thoi
          await new Promise((resolve) => setTimeout(resolve, 30));
          if (usage) {
            usage.tokens_in += 1000;
            usage.tokens_out += 300;
            usage.requests += 1;
          }
          return {
            ...mockAnalysisFixture,
            node_id: node.id,
          };
        }
      );

      const req1 = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });
      const req2 = createMockRequest({
        session_id: "session-test-uuid-1",
        node_id: "slice-product-list",
      });

      const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const json1: AnalyzeNodeResponse = await res1.json();
      const json2: AnalyzeNodeResponse = await res2.json();

      expect(json1.analysis).toBeDefined();
      expect(json2.analysis).toBeDefined();

      // analyzeNode chi duoc goi dung 1 lan do in-flight map
      expect(analyzeCallCount).toBe(1);
    });
  });
});
