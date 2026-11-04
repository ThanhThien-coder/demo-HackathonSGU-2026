import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type GradingRaw,
  type NodeAnalysis,
  type NodeStatus,
  type RepoOverviewRaw,
  type RunMode,
  type RunQuestion,
  type RunStepRef,
  type StaticEngineResult,
} from "@/contracts";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { clearEngineCache } from "@/server/cache";
import type { SessionRecord, RunRecord } from "@/server/session";
import type { AnalyzeUsage } from "@/server/ai/analyze";
import type { OverviewUsage } from "@/server/ai/overview";
import type { QuestionsUsage } from "@/server/ai/questions";

import { GET as healthGET } from "@/app/api/health/route";
import { POST as analyzeNodePOST } from "@/app/api/analyze-node/route";
import { POST as analyzeOverviewPOST } from "@/app/api/analyze-overview/route";
import { POST as enrichNodePOST } from "@/app/api/enrich-node/route";
import { POST as evaluateFeynmanPOST } from "@/app/api/evaluate-feynman/route";

const {
  mockGetUser,
  mockSql,
  mockAnalyzeNode,
  mockAnalyzeOverview,
  mockGenerateQuestions,
  mockCallLLMWithRetry,
} = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockSql: vi.fn(),
    mockAnalyzeNode: vi.fn(),
    mockAnalyzeOverview: vi.fn(),
    mockGenerateQuestions: vi.fn(),
    mockCallLLMWithRetry: vi.fn(),
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

vi.mock("@/server/ai/analyze", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/analyze")>();
  return {
    ...actual,
    analyzeNode: mockAnalyzeNode,
  };
});

vi.mock("@/server/ai/overview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/overview")>();
  return {
    ...actual,
    analyzeOverview: mockAnalyzeOverview,
  };
});

vi.mock("@/server/ai/questions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/questions")>();
  return {
    ...actual,
    generateQuestions: mockGenerateQuestions,
  };
});

vi.mock("@/server/ai/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/gemini")>();
  return {
    ...actual,
    callLLMWithRetry: mockCallLLMWithRetry,
  };
});

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const RUN_ID = "44444444-4444-4444-8444-444444444444";

const typedShopApi = shopApiFixture as unknown as StaticEngineResult;

const mockSession: SessionRecord = {
  id: SESSION_ID,
  user_id: USER_ID,
  source: "GITHUB",
  repo_key: typedShopApi.snapshot.repo_key,
  snapshot_id: typedShopApi.snapshot.snapshot_id,
  snapshot_id_kind: "COMMIT_SHA",
  subdir: typedShopApi.snapshot.subdir,
  ref_label: typedShopApi.snapshot.ref_label,
  repo_name: typedShopApi.repo_name,
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 0,
  created_at: new Date(0).toISOString(),
  last_active_at: new Date(0).toISOString(),
  graph_skeleton: typedShopApi.nodes.map((n) => ({
    node_id: n.id,
    title: n.title,
    prerequisites: n.prerequisites,
    is_capstone: n.is_capstone,
  })),
};

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

const mockQuestionsFixture: RunQuestion[] = [
  {
    question_index: 1,
    skill: "DB_OPTIMIZATION",
    tier: "NOVICE",
    focus: "WEAKNESS",
    step_indices: [2],
    feynman_question:
      "Trang danh sách có 200 sản phẩm. Vì sao càng nhiều sản phẩm thì trang càng chậm?",
    reference_answer:
      "Sau khi `productRepo.findAll` lấy danh sách 1 lần, vòng lặp gọi `categoryRepo.findById` cho từng sản phẩm. Mỗi sản phẩm tốn thêm 1 truy vấn, nên 200 sản phẩm thành 201 truy vấn.",
    must_have_points: [
      "Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng",
      "Số truy vấn tăng theo số sản phẩm, không cố định",
    ],
    fix: "Cho findAll lấy kèm loại hàng (relations: ['category']) ⇒ còn 1 truy vấn; hoặc gom các categoryId rồi tìm 1 lần bằng IN (...) ⇒ còn 2 truy vấn.",
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

const n3Node = typedShopApi.nodes.find((n) => n.id === "slice-product-list")!;
const mockStepsFixture: RunStepRef[] = n3Node.trace_steps.map((s) => ({
  step_index: s.step_number,
  layer: s.layer,
  file_path: s.file_path,
  function_name: s.function_name,
}));

const mockGradingFixture: GradingRaw = {
  core_accuracy: 90,
  simplicity: 80,
  intent: "ANSWER",
  points: [
    {
      index: 1,
      covered: true,
      quote: "200 sản phẩm",
    },
    {
      index: 2,
      covered: true,
      quote: "dữ liệu nhiều",
    },
  ],
  misconception: "",
  follow_up_question: null,
  follow_up_type: null,
  follow_up_step_index: null,
  feedback: "Chính xác! Bạn giải thích đúng.",
  detected_jargons: [],
};

function makeMockRequest(
  url: string,
  body: Record<string, unknown> | null,
  options?: { token?: string }
): Request {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (options?.token !== undefined) {
    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }
  } else {
    headers.set("Authorization", "Bearer valid-test-token");
  }

  return new Request(url, {
    method: "POST",
    headers,
    body: body !== null ? JSON.stringify(body) : "",
  });
}

function countAiUsageInserts(): number {
  return mockSql.mock.calls.filter((call: unknown[]) => {
    const strings = call[0];
    const query = Array.isArray(strings) ? strings.join(" ") : String(strings ?? "");
    return query.includes("INSERT INTO ai_usage");
  }).length;
}

describe("X-10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();
  });

  it("gọi GET /api/health không gửi token Authorization vẫn trả HTTP 200 body 'ok' theo D-64", async () => {
    // Làm cho mock sql ném lỗi kết nối
    mockSql.mockImplementation(() => {
      throw new Error("connection terminated unexpectedly");
    });

    const res = healthGET();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    // Kiểm mock sql không được gọi lần nào
    expect(mockSql).not.toHaveBeenCalled();
    // Kiểm mock getUser của Supabase không được gọi
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe("X-13", () => {
  let dbAiCache: Map<string, unknown>;
  let dbNodeRuns: RunRecord[];
  let dbNodeProgress: Map<string, { status: string | null; analysis_failed: boolean }>;
  let dbSkillStates: Map<
    string,
    {
      user_id: string;
      skill: string;
      p_mastery: number;
      last_practiced_at: Date;
      practice_count: number;
      correct_count: number;
    }
  >;
  let sessionTokensUsed = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("AI_DISABLED", "false");

    dbAiCache = new Map();
    dbNodeRuns = [];
    dbNodeProgress = new Map();
    dbSkillStates = new Map();
    sessionTokensUsed = 0;

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: "learner@test.com",
        },
      },
      error: null,
    });

    mockSql.mockImplementation(async (strings: TemplateStringsArray | string[], ...values: unknown[]) => {
      const query = Array.isArray(strings) ? strings.join(" ") : String(strings);

      // Nếu mockSql được gọi như helper sql(keys), trả về chính mảng đó
      if (
        Array.isArray(strings) &&
        !strings.some(
          (s) =>
            typeof s === "string" &&
            (s.includes("SELECT") || s.includes("INSERT") || s.includes("UPDATE") || s.includes("DELETE"))
        )
      ) {
        return strings;
      }

      // 1. SELECT FROM learning_sessions
      if (query.includes("FROM learning_sessions")) {
        return [{ ...mockSession, tokens_used: sessionTokensUsed }];
      }

      // 2. SELECT FROM session_snapshots
      if (query.includes("FROM session_snapshots")) {
        return [{ result: typedShopApi }];
      }

      // 3. SELECT FROM ai_cache WHERE cache_key IN
      if (query.includes("FROM ai_cache") && query.includes("cache_key IN")) {
        const rows: Array<{ cache_key: string; payload: unknown }> = [];
        for (const [key, payload] of dbAiCache.entries()) {
          if (key.startsWith("na|")) {
            rows.push({ cache_key: key, payload });
          }
        }
        return rows;
      }

      // 4. SELECT FROM ai_cache WHERE cache_key =
      if (query.includes("FROM ai_cache") && query.includes("WHERE cache_key =")) {
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
        const payload = typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;
        dbAiCache.set(key, payload);
        return [];
      }

      // 6. INSERT INTO ai_usage
      if (query.includes("INSERT INTO ai_usage")) {
        return [];
      }

      // 7. UPDATE learning_sessions SET tokens_used =
      if (query.includes("UPDATE learning_sessions") && query.includes("tokens_used = tokens_used +")) {
        const added = Number(values[0]);
        sessionTokensUsed += added;
        return [{ tokens_used: sessionTokensUsed }];
      }

      // 8. UPDATE learning_sessions SET last_active_at =
      if (query.includes("UPDATE learning_sessions") && query.includes("last_active_at =")) {
        return [];
      }

      // 9. SELECT FROM node_runs WHERE session_id = ... AND node_id = ... AND finished_at IS NULL
      if (query.includes("FROM node_runs") && query.includes("finished_at IS NULL")) {
        const sessionId = String(values[0]);
        const nodeId = String(values[1]);
        const openRun = dbNodeRuns.find(
          (r) => r.session_id === sessionId && r.node_id === nodeId && !r.finished_at
        );
        return openRun ? [openRun] : [];
      }

      // 10. SELECT FROM node_runs r JOIN learning_sessions s (verifyRunOwnership)
      if (query.includes("FROM node_runs r") && query.includes("JOIN learning_sessions s")) {
        const runId = String(values[0]);
        const userId = String(values[1]);
        const run = dbNodeRuns.find((r) => r.id === runId);
        if (!run || mockSession.user_id !== userId) return [];
        return [
          {
            run_id: run.id,
            session_id: run.session_id,
            node_id: run.node_id,
            mode: run.mode,
            questions: run.questions,
            steps: run.steps,
            forbidden_external_keywords: run.forbidden_external_keywords,
            started_at: run.started_at,
            finished_at: run.finished_at,
            user_id: mockSession.user_id,
            source: mockSession.source,
            repo_key: mockSession.repo_key,
            snapshot_id: mockSession.snapshot_id,
            snapshot_id_kind: mockSession.snapshot_id_kind,
            subdir: mockSession.subdir,
            ref_label: mockSession.ref_label,
            repo_name: mockSession.repo_name,
            engine_version: mockSession.engine_version,
            tokens_used: sessionTokensUsed,
            created_at: mockSession.created_at,
            last_active_at: mockSession.last_active_at,
            graph_skeleton: mockSession.graph_skeleton,
          },
        ];
      }

      // 11. SELECT FROM node_runs WHERE id = ... FOR UPDATE (lockRun)
      if (query.includes("FROM node_runs") && query.includes("FOR UPDATE")) {
        const runId = String(values[0]);
        const run = dbNodeRuns.find((r) => r.id === runId);
        return run ? [{ ...run }] : [];
      }

      // 12. SELECT FROM node_runs WHERE session_id =
      if (query.includes("FROM node_runs") && query.includes("WHERE session_id =")) {
        const sessionId = String(values[0]);
        return dbNodeRuns.filter((r) => r.session_id === sessionId);
      }

      // 13. INSERT INTO node_runs
      if (query.includes("INSERT INTO node_runs")) {
        const sessionId = String(values[0]);
        const nodeId = String(values[1]);
        const mode = String(values[2]) as RunMode;
        const questionsRaw = values[3];
        const stepsRaw = values[4];
        const keywords = values[5] as string[];
        const questions = typeof questionsRaw === "string" ? JSON.parse(questionsRaw) : questionsRaw;
        const steps = typeof stepsRaw === "string" ? JSON.parse(stepsRaw) : stepsRaw;

        const newRun: RunRecord = {
          id: `run-${Date.now()}`,
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

      // 14. UPDATE node_runs SET questions =
      if (query.includes("UPDATE node_runs") && query.includes("SET questions =")) {
        const questions = typeof values[0] === "string" ? JSON.parse(values[0]) : values[0];
        const runId = String(values[1]);
        const run = dbNodeRuns.find((r) => r.id === runId);
        if (run) run.questions = questions;
        return [];
      }

      // 15. UPDATE node_runs SET finished_at =
      if (query.includes("UPDATE node_runs") && query.includes("finished_at =")) {
        const at = values[0] as Date;
        const runId = String(values[1]);
        const run = dbNodeRuns.find((r) => r.id === runId);
        if (run) run.finished_at = at;
        return [];
      }

      // 16. SELECT FROM node_progress
      if (query.includes("FROM node_progress")) {
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

      // 17. UPDATE node_progress SET analysis_failed =
      if (query.includes("UPDATE node_progress") && query.includes("analysis_failed =")) {
        return [];
      }

      // 18. INSERT INTO node_progress
      if (query.includes("INSERT INTO node_progress")) {
        const nodeId = String(values[1]);
        const status = values[2] as NodeStatus;
        dbNodeProgress.set(nodeId, { status, analysis_failed: false });
        return [];
      }

      // 19. SELECT FROM skill_states
      if (query.includes("FROM skill_states")) {
        if (query.includes("FOR UPDATE")) {
          const [userId, skill] = values as [string, string];
          const key = `${userId}|${skill}`;
          const row = dbSkillStates.get(key);
          return row
            ? [
                {
                  skill: row.skill,
                  p_mastery: row.p_mastery,
                  last_practiced_at: row.last_practiced_at,
                  practice_count: row.practice_count,
                  correct_count: row.correct_count,
                },
              ]
            : [];
        }
        const rows = [];
        for (const state of dbSkillStates.values()) {
          rows.push(state);
        }
        return rows;
      }

      // 20. INSERT INTO skill_states
      if (query.includes("INSERT INTO skill_states")) {
        if (query.includes("DO NOTHING")) {
          const [userId, skill, p_mastery, at, practice_count, correct_count] = values as [
            string,
            string,
            number,
            Date,
            number,
            number,
          ];
          const key = `${userId}|${skill}`;
          if (!dbSkillStates.has(key)) {
            dbSkillStates.set(key, {
              user_id: userId,
              skill,
              p_mastery,
              last_practiced_at: at,
              practice_count: practice_count ?? 0,
              correct_count: correct_count ?? 0,
            });
          }
          return [];
        }
        if (query.includes("DO UPDATE")) {
          const [userId, skill, p_mastery, at, practice_count, correct_count] = values as [
            string,
            string,
            number,
            Date,
            number,
            number,
          ];
          const key = `${userId}|${skill}`;
          dbSkillStates.set(key, {
            user_id: userId,
            skill,
            p_mastery,
            last_practiced_at: at,
            practice_count,
            correct_count,
          });
          return [];
        }
        return [];
      }

      // 21. INSERT INTO question_attempts
      if (query.includes("INSERT INTO question_attempts")) {
        return [];
      }

      return [];
    });
  });

  it("analyze-node trượt cache, AI thành công: đúng 1 dòng", async () => {
    mockAnalyzeNode.mockImplementation(
      async (
        _session: unknown,
        _graph: unknown,
        node: { id: string },
        usage?: AnalyzeUsage,
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
      },
    );

    const req = makeMockRequest("http://localhost:3000/api/analyze-node", {
      session_id: SESSION_ID,
      node_id: "slice-product-list",
    });

    const res = await analyzeNodePOST(req);
    expect(res.status).toBe(200);

    expect(mockAnalyzeNode).toHaveBeenCalledTimes(1);
    expect(countAiUsageInserts()).toBe(1);
  });

  it("analyze-node trúng ai_cache: 0 dòng, hàm AI không được gọi", async () => {
    const cacheKey = `na|${mockSession.source}|${mockSession.snapshot_id}|${mockSession.subdir}|${mockSession.engine_version}|slice-product-list|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
    dbAiCache.set(cacheKey, mockAnalysisFixture);

    const req = makeMockRequest("http://localhost:3000/api/analyze-node", {
      session_id: SESSION_ID,
      node_id: "slice-product-list",
    });

    const res = await analyzeNodePOST(req);
    expect(res.status).toBe(200);

    expect(mockAnalyzeNode).not.toHaveBeenCalled();
    expect(countAiUsageInserts()).toBe(0);
  });

  it("analyze-overview trượt cache, AI thành công: đúng 1 dòng", async () => {
    // Chuẩn bị ai_cache cho tất cả node để vượt qua điều kiện ERR_OVERVIEW_NOT_READY
    for (const n of typedShopApi.nodes) {
      const naKey = `na|${mockSession.source}|${mockSession.snapshot_id}|${mockSession.subdir}|${mockSession.engine_version}|${n.id}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
      dbAiCache.set(naKey, {
        ...mockAnalysisFixture,
        node_id: n.id,
      });
    }

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

    const req = makeMockRequest("http://localhost:3000/api/analyze-overview", {
      session_id: SESSION_ID,
    });

    const res = await analyzeOverviewPOST(req);
    expect(res.status).toBe(200);

    expect(mockAnalyzeOverview).toHaveBeenCalledTimes(1);
    expect(countAiUsageInserts()).toBe(1);
  });

  it("analyze-overview trúng ai_cache: 0 dòng, hàm AI không được gọi", async () => {
    const cacheKey = `ov|${mockSession.source}|${mockSession.snapshot_id}|${mockSession.subdir}|${mockSession.engine_version}|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
    dbAiCache.set(cacheKey, mockOverviewFixture);

    const req = makeMockRequest("http://localhost:3000/api/analyze-overview", {
      session_id: SESSION_ID,
    });

    const res = await analyzeOverviewPOST(req);
    expect(res.status).toBe(200);

    expect(mockAnalyzeOverview).not.toHaveBeenCalled();
    expect(countAiUsageInserts()).toBe(0);
  });

  it("enrich-node tạo run mới, AI thành công: đúng 1 dòng", async () => {
    // Phân tích node phải có trong ai_cache
    const naKey = `na|${mockSession.source}|${mockSession.snapshot_id}|${mockSession.subdir}|${mockSession.engine_version}|slice-product-list|${CONFIG.PROMPT_VERSION}|${CONFIG.LLM_MODEL}`;
    dbAiCache.set(naKey, mockAnalysisFixture);

    mockGenerateQuestions.mockImplementation(
      async (
        _session: unknown,
        _graph: unknown,
        _node: unknown,
        _analysis: unknown,
        _plan: unknown,
        usage?: QuestionsUsage,
      ) => {
        if (usage) {
          usage.tokens_in += 800;
          usage.tokens_out += 300;
          usage.requests += 1;
        }
        return mockQuestionsFixture.map((q) => ({ ...q }));
      },
    );

    const req = makeMockRequest("http://localhost:3000/api/enrich-node", {
      session_id: SESSION_ID,
      node_id: "slice-product-list",
      mode: "LEARN",
    });

    const res = await enrichNodePOST(req);
    expect(res.status).toBe(200);

    expect(mockGenerateQuestions).toHaveBeenCalledTimes(1);
    expect(countAiUsageInserts()).toBe(1);
  });

  it("evaluate-feynman AI chấm thành công: đúng 1 dòng", async () => {
    // Tạo run đang mở
    const openRun: RunRecord = {
      id: RUN_ID,
      session_id: SESSION_ID,
      node_id: "slice-product-list",
      mode: "LEARN",
      questions: mockQuestionsFixture.map((q) => ({ ...q })),
      steps: mockStepsFixture,
      forbidden_external_keywords: ["redis", "kafka"],
      started_at: new Date(0).toISOString(),
      finished_at: null,
    };
    dbNodeRuns.push(openRun);

    mockCallLLMWithRetry.mockResolvedValue({
      ok: true,
      value: mockGradingFixture,
      tokens_in: 500,
      tokens_out: 100,
    });

    const req = makeMockRequest("http://localhost:3000/api/evaluate-feynman", {
      session_id: SESSION_ID,
      run_id: RUN_ID,
      question_index: 1,
      student_answer: "Vì có 200 sản phẩm nên dữ liệu nhiều và trang càng chậm.",
      attempt_number: 1,
    });

    const res = await evaluateFeynmanPOST(req);
    expect(res.status).toBe(200);

    expect(mockCallLLMWithRetry).toHaveBeenCalledTimes(1);
    expect(countAiUsageInserts()).toBe(1);
  });
});
