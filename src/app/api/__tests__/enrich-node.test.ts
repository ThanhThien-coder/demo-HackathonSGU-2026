import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type EnrichNodeResponse,
  type NodeAnalysis,
  type RunMode,
  type RunQuestion,
  type StaticEngineResult,
  type SWESkill,
} from "@/contracts";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { clearEngineCache } from "@/server/cache";
import { ApiHttpError } from "@/server/errors";
import type { QuestionsUsage } from "@/server/ai/questions";
import type { RunRecord, SessionRecord } from "@/server/session";
import { POST } from "../enrich-node/route";

const { mockGetUser, mockSql, mockGenerateQuestions } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = vi.fn();
  const generateQuestionsFn = vi.fn();
  return {
    mockGetUser: getUser,
    mockSql: sqlFn,
    mockGenerateQuestions: generateQuestionsFn,
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

vi.mock("@/server/ai/questions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/questions")>();
  return {
    ...actual,
    generateQuestions: mockGenerateQuestions,
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

const mockGeneratedQuestionsFixture: RunQuestion[] = [
  {
    question_index: 1,
    skill: "DB_OPTIMIZATION",
    tier: "NOVICE",
    focus: "WEAKNESS",
    step_indices: [2],
    feynman_question: "Trang danh sách có 200 sản phẩm. Vì sao càng nhiều sản phẩm thì trang càng chậm?",
    reference_answer: "Sau khi productRepo.findAll lấy danh sách 1 lần, vòng lặp gọi categoryRepo.findById cho từng sản phẩm. Mỗi sản phẩm tốn thêm 1 truy vấn, nên 200 sản phẩm thành 201 truy vấn.",
    must_have_points: [
      "Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng",
      "Số truy vấn tăng theo số sản phẩm, không cố định",
    ],
    fix: "Cho findAll lấy kèm loại hàng (relations: ['category']) => còn 1 truy vấn; hoặc gom các categoryId rồi tìm 1 lần bằng IN (...) => còn 2 truy vấn.",
    attempts_used: 0,
    finished: false,
    outcome: null,
    ended_by: null,
    disputed: false,
    p_before: null,
    p_after: null,
    last_answer: null,
  },
  {
    question_index: 2,
    skill: "LAYERED_SEPARATION",
    tier: "NOVICE",
    focus: "FLOW",
    step_indices: [1, 2, 3],
    feynman_question: "Sản phẩm trả về có thêm thông tin loại hàng. Loại hàng đó từ đâu mà có?",
    reference_answer: "Route ở product.controller.ts gọi productService.listProducts; trong listProducts, vòng for gọi categoryRepo.findById(p.categoryId); findById ở category.repo.ts dùng this.repo.findOne; kết quả gán vào p.category rồi trả về route.",
    must_have_points: [
      "Nêu đúng đường đi: route gọi service, service nhờ repo tìm loại hàng",
      "Loại hàng tìm theo categoryId của từng sản phẩm rồi gắn vào sản phẩm trước khi trả về",
    ],
    fix: "Không có lỗi cần sửa ở góc này.",
    attempts_used: 0,
    finished: false,
    outcome: null,
    ended_by: null,
    disputed: false,
    p_before: null,
    p_after: null,
    last_answer: null,
  },
];

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
  return new Request("http://localhost:3000/api/enrich-node", {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body) : "",
  });
}

describe("POST /api/enrich-node (TASK_09 — A08)", () => {
  let dbSessions: Map<string, SessionRecord>;
  let dbAiCache: Map<string, NodeAnalysis | string>;
  let dbAiUsage: Array<{
    session_id: string;
    call_kind: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  }>;
  let dbNodeProgress: Map<string, { status: string | null; analysis_failed: boolean }>;
  let dbNodeRuns: RunRecord[];
  let dbSkillStates: Map<
    string,
    {
      skill: SWESkill;
      p_mastery: number;
      last_practiced_at: string;
      practice_count: number;
      correct_count: number;
    }
  >;
  let shouldThrowUniqueViolation: boolean;

  const defaultSessionId = "session-test-uuid-1";
  const defaultUserId = "user-test-123";
  const targetNodeId = "slice-product-list";

  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    dbSessions = new Map();
    dbAiCache = new Map();
    dbAiUsage = [];
    dbNodeProgress = new Map();
    dbNodeRuns = [];
    dbSkillStates = new Map();
    shouldThrowUniqueViolation = false;

    const sessionRecord: SessionRecord = {
      id: defaultSessionId,
      user_id: defaultUserId,
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
    dbSessions.set(defaultSessionId, sessionRecord);

    const cacheKey = `na|${sessionRecord.source}|${sessionRecord.snapshot_id}|${sessionRecord.subdir}|${sessionRecord.engine_version}|${targetNodeId}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
    dbAiCache.set(cacheKey, mockAnalysisFixture);

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: defaultUserId,
          email: "learner@test.com",
        },
      },
      error: null,
    });

    mockGenerateQuestions.mockImplementation(
      async (
        _session: unknown,
        _graph: unknown,
        _node: unknown,
        _analysis: unknown,
        _plan: unknown,
        usage?: QuestionsUsage
      ) => {
        if (usage) {
          usage.tokens_in += 800;
          usage.tokens_out += 300;
          usage.requests += 1;
        }
        return mockGeneratedQuestionsFixture.map((q) => ({ ...q }));
      }
    );

    mockSql.mockImplementation(async (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

      // 1. SELECT FROM learning_sessions WHERE id =
      if (query.includes("FROM learning_sessions") && query.includes("WHERE id =")) {
        const sessionId = String(values[0]);
        const session = dbSessions.get(sessionId);
        if (!session) return [];
        if (query.includes("user_id =")) {
          const userId = String(values[1]);
          if (session.user_id !== userId) return [];
        }
        return [session];
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

      // 4. SELECT FROM node_runs WHERE session_id = ... AND node_id = ... AND finished_at IS NULL
      if (query.includes("FROM node_runs") && query.includes("finished_at IS NULL")) {
        const sessionId = String(values[0]);
        const nodeId = String(values[1]);
        const openRun = dbNodeRuns.find(
          (r) => r.session_id === sessionId && r.node_id === nodeId && !r.finished_at
        );
        return openRun ? [openRun] : [];
      }

      // 5. SELECT FROM node_runs WHERE session_id =
      if (query.includes("FROM node_runs") && query.includes("WHERE session_id =")) {
        const sessionId = String(values[0]);
        return dbNodeRuns.filter((r) => r.session_id === sessionId);
      }

      // 6. SELECT FROM node_progress
      if (query.includes("FROM node_progress") && query.includes("WHERE session_id =")) {
        const rows = [];
        for (const [nodeId, prog] of dbNodeProgress.entries()) {
          rows.push({
            node_id: nodeId,
            status: prog.status,
            analysis_failed: prog.analysis_failed,
          });
        }
        return rows;
      }

      // 7. SELECT FROM skill_states
      if (query.includes("FROM skill_states") && query.includes("WHERE user_id =")) {
        const userId = String(values[0]);
        const rows = [];
        for (const [key, state] of dbSkillStates.entries()) {
          if (key.startsWith(`${userId}:`)) {
            rows.push(state);
          }
        }
        return rows;
      }

      // 8. INSERT INTO node_runs
      if (query.includes("INSERT INTO node_runs")) {
        if (shouldThrowUniqueViolation) {
          const err = new Error(
            'duplicate key value violates unique constraint "node_runs_one_open"'
          ) as Error & { code: string };
          err.code = "23505";
          throw err;
        }

        const sessionId = String(values[0]);
        const nodeId = String(values[1]);
        const mode = String(values[2]) as RunMode;
        const questionsRaw = values[3];
        const stepsRaw = values[4];
        const keywords = values[5] as string[];
        const questions =
          typeof questionsRaw === "string" ? JSON.parse(questionsRaw) : questionsRaw;
        const steps = typeof stepsRaw === "string" ? JSON.parse(stepsRaw) : stepsRaw;

        const newRun: RunRecord = {
          id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          session_id: sessionId,
          node_id: nodeId,
          mode,
          questions,
          steps,
          forbidden_external_keywords: keywords,
          started_at: new Date().toISOString(),
          finished_at: null,
        };
        dbNodeRuns.push(newRun);
        return [newRun];
      }

      // 9. INSERT INTO ai_usage
      if (query.includes("INSERT INTO ai_usage")) {
        const sessionId = String(values[0]);
        const callKind = query.includes("'QUESTIONS'") ? "QUESTIONS" : "UNKNOWN";
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

      // 10. UPDATE learning_sessions SET tokens_used =
      if (
        query.includes("UPDATE learning_sessions") &&
        query.includes("tokens_used = tokens_used +")
      ) {
        const added = Number(values[0]);
        const sessionId = String(values[1]);
        const s = dbSessions.get(sessionId);
        if (s) {
          s.tokens_used += added;
          return [{ tokens_used: s.tokens_used }];
        }
        return [];
      }

      // 11. UPDATE learning_sessions SET last_active_at
      if (query.includes("UPDATE learning_sessions") && query.includes("last_active_at = now()")) {
        const sessionId = String(values[0]);
        const s = dbSessions.get(sessionId);
        if (s) {
          s.last_active_at = new Date().toISOString();
        }
        return [];
      }

      return [];
    });
  });

  describe("1. Xác thực và phân quyền (API-04, API-05)", () => {
    it("trả HTTP 401 ERR_UNAUTHENTICATED khi thiếu header Authorization", async () => {
      const req = createMockRequest(
        { session_id: defaultSessionId, node_id: targetNodeId, mode: "LEARN" },
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
        { session_id: defaultSessionId, node_id: targetNodeId, mode: "LEARN" },
        { token: "invalid-token" }
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_UNAUTHENTICATED");
    });

    it("trả HTTP 404 ERR_SESSION_NOT_FOUND khi phiên thuộc người dùng khác", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-other-person",
            email: "other@test.com",
          },
        },
        error: null,
      });
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });
  });

  describe("2. Kiểm tra dữ liệu đầu vào và điều kiện node", () => {
    it("trả HTTP 404 ERR_SESSION_NOT_FOUND khi thiếu session_id", async () => {
      const req = createMockRequest({ node_id: targetNodeId, mode: "LEARN" });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    });

    it("trả HTTP 409 ERR_NODE_NOT_AVAILABLE khi thiếu node_id", async () => {
      const req = createMockRequest({ session_id: defaultSessionId, mode: "LEARN" });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_NODE_NOT_AVAILABLE");
    });

    it("trả HTTP 409 ERR_NODE_NOT_AVAILABLE khi mode không phải LEARN", async () => {
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "REVIEW",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_NODE_NOT_AVAILABLE");
    });

    it("trả HTTP 409 ERR_NODE_NOT_AVAILABLE khi node_id không có trong đồ thị", async () => {
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: "non-existent-node-id",
        mode: "LEARN",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_NODE_NOT_AVAILABLE");
    });

    it("trả HTTP 409 ERR_NODE_NOT_AVAILABLE khi node ở trạng thái LOCKED", async () => {
      // slice-cart phụ thuộc vào slice-profile; khi slice-profile chưa xong thì slice-cart là LOCKED
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: "slice-cart",
        mode: "LEARN",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_NODE_NOT_AVAILABLE");
    });

    it("trả HTTP 409 ERR_ANALYSIS_NOT_READY khi node chưa có kết quả phân tích trong ai_cache", async () => {
      dbAiCache.clear();
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_ANALYSIS_NOT_READY");
    });
  });

  describe("3. Tiêu chí D16: Idempotent khi có run đang dở", () => {
    it("ca D16: gọi lại enrich-node khi có run đang dở trả lại đúng run cũ, không gọi AI", async () => {
      const existingRun: RunRecord = {
        id: "run-existing-uuid-1",
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
        questions: [
          {
            ...mockGeneratedQuestionsFixture[0],
            attempts_used: 1,
          },
          {
            ...mockGeneratedQuestionsFixture[1],
            attempts_used: 0,
          },
        ],
        steps: [
          {
            step_index: 1,
            layer: "ENTRY_POINT",
            file_path: "src/controllers/product.controller.ts",
            function_name: "listProducts",
          },
        ],
        forbidden_external_keywords: ["redis"],
        started_at: new Date(Date.now() - 60000).toISOString(),
        finished_at: null,
      };
      dbNodeRuns.push(existingRun);

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as EnrichNodeResponse;

      expect(json.run_id).toBe("run-existing-uuid-1");
      expect(json.node_id).toBe(targetNodeId);
      expect(json.questions).toHaveLength(2);
      expect(json.questions[0].state.attempts_used).toBe(1);
      expect(json.questions.map((q) => q.feynman_question)).toEqual(
        mockGeneratedQuestionsFixture.map((q) => q.feynman_question)
      );
      expect(mockGenerateQuestions).not.toHaveBeenCalled();
      expect(dbNodeRuns).toHaveLength(1);
      expect(dbAiUsage).toHaveLength(0);
    });
  });

  describe("4. Tiêu chí D11: Trúng cache phân tích, câu hỏi vẫn sinh mới", () => {
    it("ca D11: học viên thứ hai mở cùng node trúng cache phân tích, câu hỏi vẫn sinh mới", async () => {
      const userBId = "user-binh-uuid-2";
      const sessionBId = "session-binh-uuid-2";

      const sessionB: SessionRecord = {
        id: sessionBId,
        user_id: userBId,
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
      dbSessions.set(sessionBId, sessionB);

      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: userBId,
            email: "binh@test.com",
          },
        },
        error: null,
      });

      const req = createMockRequest({
        session_id: sessionBId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as EnrichNodeResponse;

      expect(json.node_id).toBe(targetNodeId);
      expect(json.mode).toBe("LEARN");
      expect(json.questions).toHaveLength(2);
      expect(mockGenerateQuestions).toHaveBeenCalledTimes(1);

      // Điểm kỹ năng và tokens_used được cập nhật cho Bình
      expect(sessionB.tokens_used).toBe(1100); // 800 in + 300 out
      expect(dbAiUsage).toHaveLength(1);
      expect(dbAiUsage[0].session_id).toBe(sessionBId);
      expect(dbAiUsage[0].call_kind).toBe("QUESTIONS");
      expect(dbAiUsage[0].tokens_in).toBe(800);
      expect(dbAiUsage[0].tokens_out).toBe(300);
    });
  });

  describe("5. Tiêu chí ERR_AI_REJECTED", () => {
    it("ca ERR_AI_REJECTED: khi mọi câu hỏi bị cổng gác loại bỏ thì không tạo run trong CSDL", async () => {
      mockGenerateQuestions.mockImplementationOnce(async () => {
        throw new ApiHttpError("ERR_AI_REJECTED");
      });

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_AI_REJECTED");

      // CSDL không tạo run mới
      expect(dbNodeRuns).toHaveLength(0);
    });

    it("ca ERR_AI_REJECTED: khi generateQuestions trả mọi câu DROPPED thì không tạo run", async () => {
      mockGenerateQuestions.mockImplementationOnce(async () => [
        {
          ...mockGeneratedQuestionsFixture[0],
          finished: true,
          outcome: null,
          ended_by: "DROPPED",
        },
        {
          ...mockGeneratedQuestionsFixture[1],
          finished: true,
          outcome: null,
          ended_by: "DROPPED",
        },
      ]);

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_AI_REJECTED");
      expect(dbNodeRuns).toHaveLength(0);
    });
  });

  describe("6. Tiêu chí X-02: Không rò rỉ đáp án câu chưa hoàn thành (INV-07)", () => {
    it("ca X-02: phản hồi không lộ trường reference_answer hoặc must_have_points của các câu chưa hoàn thành", async () => {
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as EnrichNodeResponse;

      expect(json.questions).toHaveLength(2);
      for (const q of json.questions) {
        expect(q.state.finished).toBe(false);
        expect(q.state.reveal).toBeNull();

        const rawQ = q as unknown as Record<string, unknown>;
        const rawState = q.state as unknown as Record<string, unknown>;

        expect(rawQ.reference_answer).toBeUndefined();
        expect(rawQ.must_have_points).toBeUndefined();
        expect(rawQ.fix).toBeUndefined();
        expect(rawQ.last_answer).toBeUndefined();
        expect(rawQ.p_before).toBeUndefined();
        expect(rawQ.p_after).toBeUndefined();
        expect(rawQ.step_indices).toBeUndefined();

        expect(rawState.reference_answer).toBeUndefined();
        expect(rawState.must_have_points).toBeUndefined();
        expect(rawState.fix).toBeUndefined();
        expect(rawState.last_answer).toBeUndefined();
      }

      // Quét toàn bộ phản hồi (kể cả node_state.last_run): không có nội dung đáp án của câu chưa xong
      const whole = JSON.stringify(json);
      expect(whole).not.toContain("reference_answer");
      expect(whole).not.toContain("must_have_points");
      for (const q of mockGeneratedQuestionsFixture) {
        expect(whole).not.toContain(q.reference_answer);
        for (const point of q.must_have_points) {
          expect(whole).not.toContain(point);
        }
      }
    });
  });

  describe("7. Lưu trữ DB và cấu trúc run (D-36)", () => {
    it("lưu run với mode = LEARN, steps chỉ tên không có code snippet, và cập nhật tokens_used", async () => {
      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(dbNodeRuns).toHaveLength(1);

      const savedRun = dbNodeRuns[0];
      expect(savedRun.mode).toBe("LEARN");
      expect(savedRun.node_id).toBe(targetNodeId);
      expect(savedRun.questions).toHaveLength(2);

      // D-36: steps chỉ gồm step_index, layer, file_path, function_name, KHÔNG có snippet
      for (const step of savedRun.steps) {
        expect(step.step_index).toBeDefined();
        expect(step.layer).toBeDefined();
        expect(step.file_path).toBeDefined();
        expect(step.function_name).toBeDefined();
        expect((step as unknown as Record<string, unknown>).snippet).toBeUndefined();
        expect((step as unknown as Record<string, unknown>).code).toBeUndefined();
      }

      // Token được cộng dồn
      const session = dbSessions.get(defaultSessionId)!;
      expect(session.tokens_used).toBe(1100);
      expect(dbAiUsage).toHaveLength(1);
      expect(dbAiUsage[0].cost_usd).toBeGreaterThan(0);
    });

    it("xử lý race condition khi hai tab cùng tạo run (lỗi 23505) bằng cách fallback về open run", async () => {
      shouldThrowUniqueViolation = true;

      const preExistingRun: RunRecord = {
        id: "run-race-uuid-1",
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
        questions: mockGeneratedQuestionsFixture,
        steps: [
          {
            step_index: 1,
            layer: "ENTRY_POINT",
            file_path: "src/controllers/product.controller.ts",
            function_name: "listProducts",
          },
        ],
        forbidden_external_keywords: ["redis"],
        started_at: new Date().toISOString(),
        finished_at: null,
      };
      dbNodeRuns.push(preExistingRun);

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = (await res.json()) as EnrichNodeResponse;
      expect(json.run_id).toBe("run-race-uuid-1");
    });
  });

  describe("8. Xử lý sự cố AI và Quota", () => {
    it("trả HTTP 429 ERR_TOKEN_QUOTA_EXCEEDED khi tokens_used vượt mức", async () => {
      const session = dbSessions.get(defaultSessionId)!;
      session.tokens_used = CONFIG.SESSION_TOKEN_QUOTA;

      mockGenerateQuestions.mockImplementationOnce(async () => {
        throw new ApiHttpError("ERR_TOKEN_QUOTA_EXCEEDED");
      });

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_TOKEN_QUOTA_EXCEEDED");
    });

    it("trả HTTP 503 ERR_AI_UNAVAILABLE khi AI gặp lỗi, vẫn cộng dồn token đã dùng", async () => {
      mockGenerateQuestions.mockImplementationOnce(
        async (
          _s: unknown,
          _g: unknown,
          _n: unknown,
          _a: unknown,
          _p: unknown,
          usage?: QuestionsUsage
        ) => {
          if (usage) {
            usage.tokens_in += 500;
            usage.tokens_out += 100;
            usage.requests += 1;
          }
          throw new ApiHttpError("ERR_AI_UNAVAILABLE");
        }
      );

      const req = createMockRequest({
        session_id: defaultSessionId,
        node_id: targetNodeId,
        mode: "LEARN",
      });
      const res = await POST(req);

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("ERR_AI_UNAVAILABLE");

      // Token vẫn được cộng dù AI lỗi
      const session = dbSessions.get(defaultSessionId)!;
      expect(session.tokens_used).toBe(600);
      expect(dbAiUsage).toHaveLength(1);
      expect(dbAiUsage[0].tokens_in).toBe(500);
      expect(dbAiUsage[0].tokens_out).toBe(100);
    });
  });
});
