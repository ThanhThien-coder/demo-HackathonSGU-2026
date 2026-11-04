import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type GraphSkeletonNode,
  type HybridArchitecturalNode,
  type IngestionReport,
  type ProjectFingerprint,
  type RepoSnapshotKey,
  type RunQuestion,
  type StaticEngineResult,
} from "@/contracts";
import {
  clearEngineCache,
  getAliasSnapshotId,
  getEngineResultCache,
  makeAliasCacheKey,
  makeEngineCacheKey,
  setAliasSnapshotId,
  setEngineResultCache,
  getInFlightPromise,
  setInFlightPromise,
  deleteInFlightPromise,
} from "../cache";
import {
  createOrResumeSession,
  getSessionStaticResult,
  verifyRunOwnership,
  verifySessionOwnership,
} from "../session";
import {
  addSessionTokens,
  assertSessionTokenQuota,
  checkTokenQuota,
} from "../quota";
import { getSessionProgress } from "../progress";
import { GET as getSessions } from "@/app/api/sessions/route";
import { GET as getProgress } from "@/app/api/sessions/[id]/progress/route";

const { mockGetUser, mockSql } = vi.hoisted(() => {
  const getUser = vi.fn();
  const sqlFn = vi.fn();
  return { mockGetUser: getUser, mockSql: sqlFn };
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
    tx: (cb: (sql: unknown) => unknown) => cb(mockSql),
  },
}));

const mockFingerprint: ProjectFingerprint = {
  archetype: "WEB_BACKEND",
  primary_language: "TYPESCRIPT",
  language_breakdown: [
    { language: "TYPESCRIPT", tier: "RESOLVED", code_bytes: 1000 },
  ],
  graph_confidence: "HIGH",
  detected_framework: "Express",
  tech_stack: ["express"],
  is_monorepo: false,
  root_dir_offset: "",
};

const mockSnapshotKey: RepoSnapshotKey = {
  source: "GITHUB",
  repo_key: "facebook/react",
  snapshot_id: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
  snapshot_id_kind: "COMMIT_SHA",
  subdir: "",
  ref_label: "main",
};

const mockIngestionReport: IngestionReport = {
  truncated: false,
  selective_fetch: false,
  code_file_count: 10,
  manifest_count: 1,
  omitted_node_count: 0,
  skipped: {
    garbage: 0,
    binary: 0,
    oversized: 0,
    unsupported_lang: 0,
    quota: 0,
    parse_error: 0,
  },
  warnings: [],
  degraded_mode: null,
  redacted_secret_count: 0,
  engine_ms: 100,
  ingest_ms: 200,
  suspicious_instruction_files: [],
};

const mockStaticResult: StaticEngineResult = {
  engine_version: CONFIG.ENGINE_VERSION,
  repo_name: "react",
  snapshot: mockSnapshotKey,
  fingerprint: mockFingerprint,
  total_files: 10,
  nodes: [
    {
      id: "node_1",
      title: "Entry Root",
      title_source: "ROUTE",
      title_evidence: "GET /",
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: "main",
      prerequisites: [],
      position: { x: 0, y: 0 },
      files: ["src/index.ts"],
      languages: ["TYPESCRIPT"],
      support_tier: "RESOLVED",
      cognitive_complexity: 2,
      rank_score: 1.0,
      is_vip_algorithm: false,
      is_capstone: false,
      uncle_bob: {
        instability: 0.2,
        abstractness: 0.8,
        distance: 0.0,
        diagnosis: "BALANCED",
        is_exempt: false,
      },
      trace_steps: [],
      dto_snippet: "",
    },
  ],
  edges: [],
  symbol_whitelist: ["main"],
  file_index: ["src/index.ts"],
  ingestion_report: mockIngestionReport,
};

const mockSkeleton: GraphSkeletonNode[] = [
  {
    node_id: "node_1",
    title: "Entry Root",
    prerequisites: [],
    is_capstone: false,
  },
  {
    node_id: "node_2",
    title: "Child Node",
    prerequisites: ["node_1"],
    is_capstone: true,
  },
];

describe("Cache RAM & In-Flight Map (03_API_VA_LUU_TRU.md Muc 4, 20 AI-08)", () => {
  beforeEach(() => {
    clearEngineCache();
  });

  it("tao khoa cache chinh xac theo dac ta", () => {
    expect(makeEngineCacheKey("sha123", "src", "1.6.0")).toBe("sha123|src|1.6.0");
    expect(makeAliasCacheKey("owner/repo", "sub")).toBe("owner/repo|sub");
    expect(makeAliasCacheKey("owner/repo")).toBe("owner/repo|");
  });

  it("luu va doc ket qua tu cache RAM 2 tang", () => {
    expect(getEngineResultCache("sha123", "", CONFIG.ENGINE_VERSION)).toBeNull();
    setEngineResultCache("sha123", "", CONFIG.ENGINE_VERSION, mockStaticResult);
    expect(getEngineResultCache("sha123", "", CONFIG.ENGINE_VERSION)).toEqual(
      mockStaticResult
    );

    expect(getAliasSnapshotId("facebook/react")).toBeNull();
    setAliasSnapshotId("facebook/react", "", "sha123");
    expect(getAliasSnapshotId("facebook/react")).toBe("sha123");
  });

  it("xoa cache khi goi clearEngineCache", () => {
    setEngineResultCache("sha123", "", CONFIG.ENGINE_VERSION, mockStaticResult);
    setAliasSnapshotId("facebook/react", "", "sha123");
    clearEngineCache();

    expect(getEngineResultCache("sha123", "", CONFIG.ENGINE_VERSION)).toBeNull();
    expect(getAliasSnapshotId("facebook/react")).toBeNull();
  });

  it("quan ly in-flight promises trong mot instance", async () => {
    const key = "na|github|sha|sub|1.6.0|node1|1.0.0|gemini";
    expect(getInFlightPromise(key)).toBeUndefined();

    const promise = Promise.resolve({ ok: true });
    setInFlightPromise(key, promise);
    expect(getInFlightPromise(key)).toBe(promise);

    deleteInFlightPromise(key);
    expect(getInFlightPromise(key)).toBeUndefined();
  });
});

describe("Session Ownership & Engine Version (03 Muc 2, Muc 4, API-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("verifySessionOwnership tra ve phien khi dung user_id", async () => {
    const sessionRow = {
      id: "sess-123",
      user_id: "user-abc",
      source: "GITHUB",
      repo_key: "owner/repo",
      snapshot_id: "sha1",
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "",
      ref_label: "main",
      repo_name: "repo",
      engine_version: CONFIG.ENGINE_VERSION,
      tokens_used: 100,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      graph_skeleton: mockSkeleton,
    };

    mockSql.mockResolvedValueOnce([sessionRow]);

    const result = await verifySessionOwnership("sess-123", "user-abc");
    expect(result.id).toBe("sess-123");
    expect(result.user_id).toBe("user-abc");
  });

  it("verifySessionOwnership nem ERR_SESSION_NOT_FOUND (404) khi phien cua nguoi khac hoac khong ton tai", async () => {
    mockSql.mockResolvedValueOnce([]); // Query tra ve rong vi user_id khong khop

    await expect(
      verifySessionOwnership("sess-123", "other-user")
    ).rejects.toMatchObject({
      code: "ERR_SESSION_NOT_FOUND",
      status: 404,
    });
  });

  it("verifyRunOwnership nem ERR_SESSION_NOT_FOUND (404) khi run cua nguoi khac", async () => {
    mockSql.mockResolvedValueOnce([]);

    await expect(
      verifyRunOwnership("run-999", "other-user")
    ).rejects.toMatchObject({
      code: "ERR_SESSION_NOT_FOUND",
      status: 404,
    });
  });

  it("getSessionStaticResult nem ERR_SESSION_ENGINE_OUTDATED (410) khi engine_version khac CONFIG.ENGINE_VERSION", async () => {
    const outdatedSession = {
      id: "sess-old",
      snapshot_id: "sha1",
      subdir: "",
      engine_version: "1.0.0", // Khac CONFIG.ENGINE_VERSION
    };

    await expect(
      getSessionStaticResult(outdatedSession, "user-abc")
    ).rejects.toMatchObject({
      code: "ERR_SESSION_ENGINE_OUTDATED",
      status: 410,
    });
  });

  it("getSessionStaticResult tra ve tu cache RAM ma khong can truy van Postgres", async () => {
    setEngineResultCache("sha1", "", CONFIG.ENGINE_VERSION, mockStaticResult);

    const session = {
      id: "sess-1",
      snapshot_id: "sha1",
      subdir: "",
      engine_version: CONFIG.ENGINE_VERSION,
    };

    const res = await getSessionStaticResult(session, "user-abc");
    expect(res).toEqual(mockStaticResult);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("getSessionStaticResult truot cache RAM thi doc tu session_snapshots va nap vao cache", async () => {
    mockSql.mockResolvedValueOnce([{ result: mockStaticResult }]);

    const session = {
      id: "sess-db",
      snapshot_id: "sha-fresh",
      subdir: "",
      engine_version: CONFIG.ENGINE_VERSION,
    };

    const res = await getSessionStaticResult(session, "user-abc");
    expect(res).toEqual(mockStaticResult);

    // Lan goi thu hai phai trung cache RAM, khong query Postgres nua
    const cachedRes = getEngineResultCache("sha-fresh", "", CONFIG.ENGINE_VERSION);
    expect(cachedRes).toEqual(mockStaticResult);
  });

  it("getSessionStaticResult nem ERR_SESSION_NOT_FOUND khi session_snapshots thieu dong", async () => {
    mockSql.mockResolvedValueOnce([]); // Khong tim thay snapshot

    const session = {
      id: "sess-missing-snap",
      snapshot_id: "sha-missing",
      subdir: "",
      engine_version: CONFIG.ENGINE_VERSION,
    };

    await expect(
      getSessionStaticResult(session, "user-abc")
    ).rejects.toMatchObject({
      code: "ERR_SESSION_NOT_FOUND",
      status: 404,
    });
  });

  it("getSessionStaticResult voi sessionId (string) truy van dung user_id va tra ve ket qua", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "sess-str",
        snapshot_id: "sha-str",
        subdir: "",
        engine_version: CONFIG.ENGINE_VERSION,
        snapshot_id_kind: "COMMIT_SHA",
        repo_key: "owner/repo",
        user_id: "user-abc",
      },
    ]);
    mockSql.mockResolvedValueOnce([{ result: mockStaticResult }]);

    const res = await getSessionStaticResult("sess-str", "user-abc");
    expect(res).toEqual(mockStaticResult);
  });
});

describe("Dong jsonb cu luu dang chuoi (ghi truoc ban sua ::text::jsonb)", () => {
  const legacyRow = {
    id: "sess-old",
    user_id: "user-abc",
    source: "GITHUB",
    repo_key: "facebook/react",
    snapshot_id: mockSnapshotKey.snapshot_id,
    snapshot_id_kind: "COMMIT_SHA",
    subdir: "",
    ref_label: "main",
    repo_name: "react",
    engine_version: CONFIG.ENGINE_VERSION,
    tokens_used: 0,
    created_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    graph_skeleton: JSON.stringify(mockSkeleton),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearEngineCache();
  });

  it("createOrResumeSession mo lai phien cu: result va graph_skeleton la object", async () => {
    mockSql.mockResolvedValueOnce([legacyRow]);
    mockSql.mockResolvedValueOnce([{ result: JSON.stringify(mockStaticResult) }]);
    mockSql.mockResolvedValueOnce([]);

    const out = await createOrResumeSession("user-abc", mockStaticResult);

    expect(out.resumed).toBe(true);
    expect(out.result).toEqual(mockStaticResult);
    expect(out.session.graph_skeleton).toEqual(mockSkeleton);
  });

  it("verifySessionOwnership tra graph_skeleton dang mang", async () => {
    mockSql.mockResolvedValueOnce([legacyRow]);

    const session = await verifySessionOwnership("sess-old", "user-abc");

    expect(session.graph_skeleton).toEqual(mockSkeleton);
  });

  it("getSessionProgress doc duoc graph_skeleton dang chuoi", async () => {
    mockSql.mockResolvedValueOnce([legacyRow]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);

    const progress = await getSessionProgress("sess-old", "user-abc");

    expect(Object.keys(progress.nodes)).toEqual(["node_1", "node_2"]);
  });
});

describe("Session Token Quota (AI-06, API-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkTokenQuota nem ERR_TOKEN_QUOTA_EXCEEDED (429) khi tokens_used >= CONFIG.SESSION_TOKEN_QUOTA", () => {
    expect(() => checkTokenQuota(CONFIG.SESSION_TOKEN_QUOTA - 1)).not.toThrow();
    expect(() => checkTokenQuota(CONFIG.SESSION_TOKEN_QUOTA)).toThrowError();
    try {
      checkTokenQuota(CONFIG.SESSION_TOKEN_QUOTA);
    } catch (err: unknown) {
      expect((err as { code: string; status: number }).code).toBe(
        "ERR_TOKEN_QUOTA_EXCEEDED"
      );
      expect((err as { code: string; status: number }).status).toBe(429);
    }
  });

  it("assertSessionTokenQuota kiem tra han muc phien tu database", async () => {
    mockSql.mockResolvedValueOnce([{ tokens_used: CONFIG.SESSION_TOKEN_QUOTA }]);

    await expect(assertSessionTokenQuota("sess-quota")).rejects.toMatchObject({
      code: "ERR_TOKEN_QUOTA_EXCEEDED",
      status: 429,
    });
  });

  it("addSessionTokens cong don dung so token vao learning_sessions", async () => {
    mockSql.mockResolvedValueOnce([{ tokens_used: 1500 }]);

    const total = await addSessionTokens("sess-1", 1000, 400, 100);
    expect(total).toBe(1500);

    const callArgs = mockSql.mock.calls[0];
    const queryStr = Array.isArray(callArgs[0])
      ? callArgs[0].join("?")
      : String(callArgs[0]);
    expect(queryStr).toContain("UPDATE learning_sessions");
    expect(queryStr).toContain("tokens_used + ?");
  });
});

describe("GET /api/sessions (03_API_VA_LUU_TRU.md Muc 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("chua dang nhap tra ve 401 ERR_UNAUTHENTICATED", async () => {
    const req = new Request("http://localhost:3000/api/sessions", {
      method: "GET",
    });
    const res = await getSessions(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_UNAUTHENTICATED");
  });

  it("lay danh sach phien bang dung 1 cau truy van SQL duy nhat (khong N+1)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-111", email: "learner@example.com" },
      },
      error: null,
    });

    const mockRows = [
      {
        session_id: "s1",
        source: "GITHUB",
        repo_key: "owner/repo1",
        snapshot_id: "sha1",
        snapshot_id_kind: "COMMIT_SHA",
        subdir: "",
        ref_label: "main",
        repo_name: "repo1",
        engine_version: CONFIG.ENGINE_VERSION, // Khop
        created_at: "2026-11-01T10:00:00.000Z",
        last_active_at: "2026-11-01T12:00:00.000Z",
        total_nodes: 10,
        completed_count: 5,
        failed_count: 1,
      },
      {
        session_id: "s2",
        source: "ZIP",
        repo_key: "code.zip",
        snapshot_id: "sha2",
        snapshot_id_kind: "ARCHIVE_HASH",
        subdir: "",
        ref_label: null,
        repo_name: "code",
        engine_version: "1.0.0", // Khac CONFIG.ENGINE_VERSION
        created_at: "2026-10-01T10:00:00.000Z",
        last_active_at: "2026-10-01T12:00:00.000Z",
        total_nodes: 6,
        completed_count: 6,
        failed_count: 0,
      },
    ];

    mockSql.mockResolvedValueOnce(mockRows);

    const req = new Request("http://localhost:3000/api/sessions", {
      method: "GET",
      headers: { Authorization: "Bearer token-123" },
    });

    const res = await getSessions(req);
    expect(res.status).toBe(200);

    // Kiem tra: dung 1 cau truy van SQL duy nhat, khong lap N+1
    expect(mockSql).toHaveBeenCalledTimes(1);
    const query = mockSql.mock.calls[0][0].join("?");
    expect(query).toContain("jsonb_array_length(s.graph_skeleton)");
    expect(query).toContain("LEFT JOIN node_progress np ON np.session_id = s.id");
    expect(query).toContain("GROUP BY s.id");

    const body = await res.json();
    expect(body.sessions).toHaveLength(2);

    // Phien 1: engine_version khop => can_resume = true, resume_blocker = null
    const s1 = body.sessions[0];
    expect(s1.session_id).toBe("s1");
    expect(s1.can_resume).toBe(true);
    expect(s1.resume_blocker).toBeNull();
    expect(s1.total_nodes).toBe(10);
    expect(s1.completed_count).toBe(5);
    expect(s1.failed_count).toBe(1);

    // Phien 2: engine_version khac => can_resume = false, resume_blocker = "ENGINE_UPDATED"
    const s2 = body.sessions[1];
    expect(s2.session_id).toBe("s2");
    expect(s2.can_resume).toBe(false);
    expect(s2.resume_blocker).toBe("ENGINE_UPDATED");
  });
});

describe("GET /api/sessions/[id]/progress (03_API_VA_LUU_TRU.md Muc 2 dong 13)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("truy cap phien cua nguoi dung khac tra ve 404 ERR_SESSION_NOT_FOUND", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-attacker", email: "hacker@example.com" },
      },
      error: null,
    });

    // Query learning_sessions voi user_id khong khop => tra ve mang rong
    mockSql.mockResolvedValueOnce([]);

    const req = new Request("http://localhost:3000/api/sessions/sess-victim/progress", {
      method: "GET",
      headers: { Authorization: "Bearer token-attacker" },
    });

    const res = await getProgress(req, {
      params: Promise.resolve({ id: "sess-victim" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_SESSION_NOT_FOUND");
    expect(body.error.message).toBe("Không tìm thấy phiên học này.");
  });

  it("tra ve tien do day du, khong lo dap an cho cau chua finished", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-owner", email: "owner@example.com" },
      },
      error: null,
    });

    // 1. Mock session query
    mockSql.mockResolvedValueOnce([
      {
        id: "sess-my",
        user_id: "user-owner",
        graph_skeleton: mockSkeleton,
        tokens_used: 1200,
      },
    ]);

    // 2. Mock node_progress
    mockSql.mockResolvedValueOnce([
      {
        node_id: "node_1",
        status: "COMPLETED",
        analysis_failed: false,
      },
    ]);

    // 3. Mock node_runs voi 1 cau finished va 1 cau chua finished
    const mockQuestions: RunQuestion[] = [
      {
        question_index: 1,
        skill: "HTTP_ROUTING",
        tier: "PRACTITIONER",
        focus: "FLOW",
        step_indices: [1],
        feynman_question: "Cau 1 la gi?",
        reference_answer: "Dap an mau cau 1",
        must_have_points: ["Y 1", "Y 2"],
        fix: "Cach sua cau 1",
        attempts_used: 1,
        finished: true,
        outcome: "PASS_FIRST",
        ended_by: "ANSWER",
        disputed: false,
        p_before: 0.5,
        p_after: 0.6,
        last_answer: "Tra loi cau 1",
      },
      {
        question_index: 2,
        skill: "DTO_VALIDATION",
        tier: "PRACTITIONER",
        focus: "ARCHITECTURE",
        step_indices: [2],
        feynman_question: "Cau 2 la gi?",
        reference_answer: "BI MAT CHUA DUOC LO",
        must_have_points: ["BI MAT 1", "BI MAT 2"],
        fix: "BI MAT FIX",
        attempts_used: 1,
        finished: false, // CHUA XONG
        outcome: null,
        ended_by: null,
        disputed: false,
        p_before: null,
        p_after: null,
        last_answer: null,
      },
    ];

    mockSql.mockResolvedValueOnce([
      {
        id: "run-1",
        session_id: "sess-my",
        node_id: "node_1",
        mode: "LEARN",
        questions: mockQuestions,
        started_at: "2026-11-01T10:00:00.000Z",
        finished_at: null,
      },
    ]);

    const req = new Request("http://localhost:3000/api/sessions/sess-my/progress", {
      method: "GET",
      headers: { Authorization: "Bearer token-owner" },
    });

    const res = await getProgress(req, {
      params: Promise.resolve({ id: "sess-my" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress.session_id).toBe("sess-my");
    expect(body.progress.tokens_used).toBe(1200);

    const node1 = body.progress.nodes["node_1"];
    expect(node1.status).toBe("COMPLETED");
    expect(node1.last_run).not.toBeNull();
    expect(node1.last_run.questions).toHaveLength(2);

    // Cau 1: finished => co reveal
    const q1 = node1.last_run.questions[0];
    expect(q1.finished).toBe(true);
    expect(q1.reveal).toEqual({
      reference_answer: "Dap an mau cau 1",
      must_have_points: ["Y 1", "Y 2"],
      fix: "Cach sua cau 1",
    });

    // Cau 2: chua finished => reveal PHAI LA null (INV-07)
    const q2 = node1.last_run.questions[1];
    expect(q2.finished).toBe(false);
    expect(q2.reveal).toBeNull();

    // Node 2: do node 1 COMPLETED nen node 2 tu dong suy ra AVAILABLE
    const node2 = body.progress.nodes["node_2"];
    expect(node2.status).toBe("AVAILABLE");
    expect(node2.last_run).toBeNull();
  });
});
