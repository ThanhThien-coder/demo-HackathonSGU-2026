/**
 * src/app/api/__tests__/analyze-overview.test.ts
 *
 * Kiểm thử route POST /api/analyze-overview (TASK_10 — C09 / spec 03 Mục 6.6).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type AnalyzeOverviewResponse,
  type NodeAnalysis,
  type RepoOverviewRaw,
  type StaticEngineResult,
} from "@/contracts";
import { clearEngineCache } from "@/server/cache";
import type { SessionRecord } from "@/server/session";
import type { OverviewUsage } from "@/server/ai/overview";
import { POST } from "../analyze-overview/route";

const { mockGetUser, mockSql, mockAnalyzeOverview } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = vi.fn();
  const analyzeOverviewFn = vi.fn();
  return {
    mockGetUser: getUser,
    mockSql: sqlFn,
    mockAnalyzeOverview: analyzeOverviewFn,
  };
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

vi.mock("@/server/ai/overview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/overview")>();
  return {
    ...actual,
    analyzeOverview: mockAnalyzeOverview,
  };
});

const shopApiFixturePath = resolve(
  __dirname,
  "../../../server/engine/__fixtures__/shop-api.json",
);

const typedShopApi: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8"),
);

const mockOverviewFixture: RepoOverviewRaw = {
  architecture_style: "LAYERED",
  summary: "Web bán hàng chia 3 tầng.",
  layers: [
    {
      layer: "MIDDLEWARE",
      role: "Kiểm tra token trước khi vào trang cần đăng nhập",
      nodes: ["slice-profile", "slice-order-checkout"],
    },
  ],
  main_flow: "Đăng ký -> Profile -> Cart -> Checkout -> Email / Report",
  notes: [
    {
      text: "Hai chỗ truy vấn database trong vòng lặp.",
      nodes: ["slice-product-list", "slice-order-checkout"],
    },
  ],
};

function createMockNodeAnalysis(nodeId: string): NodeAnalysis {
  return {
    node_id: nodeId,
    skeleton_only: false,
    skills: [
      {
        skill: "DB_OPTIMIZATION",
        step: 1,
        symbol: "find",
        reason: "Truy vấn",
      },
    ],
    architecture: {
      patterns: ["LAYERED"],
      summary: "Chia 3 tầng",
    },
    steps: [{ step: 1, text: "Bước 1" }],
    strengths: [],
    weak_points: [
      {
        skill: "DB_OPTIMIZATION",
        step: 1,
        symbol: "find",
        what: "Truy vấn lặp",
        consequence: "Chậm",
      },
    ],
  };
}

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
  return new Request("http://localhost:3000/api/analyze-overview", {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body) : "",
  });
}

describe("POST /api/analyze-overview (TASK_10 — C09)", () => {
  let sessionTokensUsed = 0;
  let dbAiCache: Map<string, unknown>;
  let dbAiUsage: Array<{
    session_id: string;
    call_kind: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  }>;
  let dbNodeProgress: Map<
    string,
    { status: string | null; analysis_failed: boolean }
  >;
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
      id: "session-test-overview-1",
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

    mockAnalyzeOverview.mockImplementation(
      async (
        _session: unknown,
        _graph: unknown,
        _analyses: unknown,
        _failedIds: unknown,
        usage?: OverviewUsage,
      ) => {
        if (usage) {
          usage.tokens_in += 1500;
          usage.tokens_out += 600;
          usage.requests += 1;
        }
        return mockOverviewFixture;
      },
    );

    mockSql.mockImplementation(
      async (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
        const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

        // 1. SELECT FROM learning_sessions WHERE id =
        if (
          query.includes("FROM learning_sessions") &&
          query.includes("WHERE id =")
        ) {
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

        // 3. SELECT FROM ai_cache WHERE cache_key IN
        if (
          query.includes("FROM ai_cache") &&
          query.includes("cache_key IN")
        ) {
          const rows: Array<{ cache_key: string; payload: unknown }> = [];
          for (const [key, payload] of dbAiCache.entries()) {
            if (key.startsWith("na|")) {
              rows.push({ cache_key: key, payload });
            }
          }
          return rows;
        }

        // 4. SELECT FROM ai_cache WHERE cache_key =
        if (
          query.includes("FROM ai_cache") &&
          query.includes("WHERE cache_key =")
        ) {
          const key = String(values[0]);
          if (dbAiCache.has(key)) {
            return [{ payload: dbAiCache.get(key) }];
          }
          return [];
        }

        // 5. INSERT INTO ai_cache
        if (query.includes("INSERT INTO ai_cache")) {
          const key = String(values[0]);
          const payloadRaw = values[1];
          const payload =
            typeof payloadRaw === "string"
              ? JSON.parse(payloadRaw)
              : payloadRaw;
          dbAiCache.set(key, payload);
          return [];
        }

        // 6. INSERT INTO ai_usage
        if (query.includes("INSERT INTO ai_usage")) {
          const sessionId = String(values[0]);
          const callKind = query.includes("'OVERVIEW'")
            ? "OVERVIEW"
            : "UNKNOWN";
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

        // 7. UPDATE learning_sessions SET tokens_used =
        if (
          query.includes("UPDATE learning_sessions") &&
          query.includes("tokens_used = tokens_used +")
        ) {
          const added = Number(values[0]);
          sessionTokensUsed += added;
          return [{ tokens_used: sessionTokensUsed }];
        }

        // 8. SELECT tokens_used FROM learning_sessions
        if (query.includes("SELECT tokens_used FROM learning_sessions")) {
          return [{ tokens_used: sessionTokensUsed }];
        }

        // 9. SELECT FROM node_progress
        if (
          query.includes("FROM node_progress") &&
          query.includes("WHERE session_id =")
        ) {
          const rows: Array<{
            node_id: string;
            status: string | null;
            analysis_failed: boolean;
          }> = [];
          for (const [nodeId, prog] of dbNodeProgress.entries()) {
            rows.push({
              node_id: nodeId,
              status: prog.status,
              analysis_failed: prog.analysis_failed,
            });
          }
          return rows;
        }

        // 10. FROM node_runs
        if (query.includes("FROM node_runs")) {
          return [];
        }

        return [];
      },
    );
  });

  describe("Xác thực & Đầu vào", () => {
    it("trả HTTP 401 ERR_UNAUTHENTICATED khi thiếu header Authorization", async () => {
      const req = createMockRequest(
        { session_id: "session-test-overview-1" },
        { token: "" },
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });

    it("trả HTTP 404 ERR_SESSION_NOT_FOUND khi thiếu session_id", async () => {
      const req = createMockRequest({});
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });
  });

  describe("Ca bắt buộc theo TASK_10 bước 6", () => {
    it("ca 1: còn node chưa có bản phân tích và không analysis_failed ⇒ HTTP 409 ERR_OVERVIEW_NOT_READY", async () => {
      // Chỉ nạp 5 node vào dbAiCache, thiếu 2 node (slice-send-email và slice-revenue-report)
      for (const node of typedShopApi.nodes.slice(0, 5)) {
        const naKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
        dbAiCache.set(naKey, createMockNodeAnalysis(node.id));
      }

      const req = createMockRequest({
        session_id: "session-test-overview-1",
      });
      const res = await POST(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_OVERVIEW_NOT_READY");
      expect(mockAnalyzeOverview).not.toHaveBeenCalled();
    });

    it("ca 2: trúng cache ⇒ HTTP 200, analyzeOverview không được gọi, không có câu SQL INSERT INTO ai_usage", async () => {
      const ovKey = `ov|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      dbAiCache.set(ovKey, mockOverviewFixture);

      const req = createMockRequest({
        session_id: "session-test-overview-1",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as AnalyzeOverviewResponse;
      expect(json.overview.ai).toEqual(mockOverviewFixture);
      expect(json.overview.facts.root_node_ids).toEqual([
        "slice-product-list",
        "slice-register",
      ]);
      expect(json.tokens_used).toBe(0);

      expect(mockAnalyzeOverview).not.toHaveBeenCalled();
      expect(dbAiUsage).toHaveLength(0);
    });

    it("ca 3: trượt cache, AI trả bản hợp lệ ⇒ có INSERT INTO ai_cache và INSERT INTO ai_usage", async () => {
      // Nạp đủ 7 bản phân tích của 7 node
      for (const node of typedShopApi.nodes) {
        const naKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
        dbAiCache.set(naKey, createMockNodeAnalysis(node.id));
      }

      const req = createMockRequest({
        session_id: "session-test-overview-1",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as AnalyzeOverviewResponse;
      expect(json.overview.ai).toEqual(mockOverviewFixture);
      expect(json.overview.facts.root_node_ids).toEqual([
        "slice-product-list",
        "slice-register",
      ]);

      expect(mockAnalyzeOverview).toHaveBeenCalledTimes(1);

      // Ghi ai_cache
      const ovKey = `ov|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      expect(dbAiCache.has(ovKey)).toBe(true);
      expect(dbAiCache.get(ovKey)).toEqual(mockOverviewFixture);

      // Ghi ai_usage
      expect(dbAiUsage).toHaveLength(1);
      expect(dbAiUsage[0]).toMatchObject({
        session_id: "session-test-overview-1",
        call_kind: "OVERVIEW",
        tokens_in: 1500,
        tokens_out: 600,
      });
    });

    it("ca 4: AI trả null ⇒ 200 với overview.ai = null, không ghi ai_cache, không ghi ai_usage", async () => {
      mockAnalyzeOverview.mockResolvedValueOnce(null);

      // Nạp đủ 7 bản phân tích của 7 node
      for (const node of typedShopApi.nodes) {
        const naKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
        dbAiCache.set(naKey, createMockNodeAnalysis(node.id));
      }

      const req = createMockRequest({
        session_id: "session-test-overview-1",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as AnalyzeOverviewResponse;
      expect(json.overview.ai).toBeNull();
      expect(json.overview.facts.root_node_ids).toEqual([
        "slice-product-list",
        "slice-register",
      ]);

      const ovKey = `ov|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      expect(dbAiCache.has(ovKey)).toBe(false);
      expect(dbAiUsage).toHaveLength(0);
    });

    it("ca 5: node có analysis_failed = true thì không đòi hỏi có bản phân tích trong cache", async () => {
      // 6 node có trong cache, 1 node (slice-revenue-report) có analysis_failed = true trong node_progress
      for (const node of typedShopApi.nodes.filter(
        (n) => n.id !== "slice-revenue-report",
      )) {
        const naKey = `na|${currentSessionRecord.source}|${currentSessionRecord.snapshot_id}|${currentSessionRecord.subdir}|${currentSessionRecord.engine_version}|${node.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
        dbAiCache.set(naKey, createMockNodeAnalysis(node.id));
      }

      dbNodeProgress.set("slice-revenue-report", {
        status: null,
        analysis_failed: true,
      });

      const req = createMockRequest({
        session_id: "session-test-overview-1",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as AnalyzeOverviewResponse;
      expect(json.overview.ai).toEqual(mockOverviewFixture);
      expect(mockAnalyzeOverview).toHaveBeenCalledTimes(1);
    });
  });
});
