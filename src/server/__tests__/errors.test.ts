import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts";
import {
  ApiHttpError,
  defaultMessage,
  ERROR_HTTP_STATUS,
  createApiError,
  createErrorResponse,
  getHttpStatus,
  isRetryable,
  RETRYABLE_ERROR_CODES,
  toErrorResponse,
  type ServerErrorCode,
} from "../errors";
import {
  logger,
  logAiCall,
  logApiRequest,
  logGuardBlocked,
} from "../log";
import { GET as getMe, DELETE as deleteMe } from "@/app/api/me/route";

// vi.mock duoc keo len dau file, nen bien mock phai tao trong vi.hoisted
const { mockGetUser, mockSql } = vi.hoisted(() => {
  const getUser = vi.fn();
  // Mock database de test route khong can ket noi CSDL Postgres that
  const sqlFn = vi.fn().mockImplementation((strings: TemplateStringsArray) => {
    const query = strings.join("?");
    if (query.includes("SELECT display_name")) {
      return Promise.resolve([{ display_name: "testuser" }]);
    }
    if (query.includes("SELECT skill, p_mastery")) {
      return Promise.resolve([
        {
          skill: "HTTP_ROUTING",
          p_mastery: 0.5,
          last_practiced_at: "2026-11-01T00:00:00.000Z",
          practice_count: 2,
          correct_count: 2,
        },
      ]);
    }
    return Promise.resolve([]);
  });
  return { mockGetUser: getUser, mockSql: sqlFn };
});

// Mock Supabase Auth de khong goi mang that
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

describe("Server Errors & HTTP Status Mapping (02_CONTRACTS.md Muc 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("khop chinh xac cac ma HTTP 400", () => {
    const codes400: ServerErrorCode[] = [
      "ERR_INVALID_GITHUB_URL",
      "ERR_UPLOAD_INVALID",
      "ERR_ANSWER_TOO_SHORT",
      "ERR_ANSWER_TOO_LONG",
      "ERR_ANSWER_DUPLICATE",
      "ERR_ANSWER_INAPPROPRIATE",
      "ERR_SELECTION_INVALID",
    ];
    for (const code of codes400) {
      expect(getHttpStatus(code)).toBe(400);
      expect(ERROR_HTTP_STATUS[code]).toBe(400);
    }
  });

  it("khop chinh xac ma HTTP 401", () => {
    expect(getHttpStatus("ERR_UNAUTHENTICATED")).toBe(401);
  });

  it("khop chinh xac cac ma HTTP 403", () => {
    const codes403: ServerErrorCode[] = ["ERR_DEMO_MODE_DISABLED", "ERR_REPORT_NOT_ALLOWED"];
    for (const code of codes403) {
      expect(getHttpStatus(code)).toBe(403);
    }
  });

  it("khop chinh xac cac ma HTTP 404", () => {
    const codes404: ServerErrorCode[] = [
      "ERR_PREFLIGHT_404_OR_PRIVATE",
      "ERR_BRANCH_NOT_FOUND",
      "ERR_SESSION_NOT_FOUND",
    ];
    for (const code of codes404) {
      expect(getHttpStatus(code)).toBe(404);
    }
  });

  it("khop chinh xac cac ma HTTP 409", () => {
    const codes409: ServerErrorCode[] = [
      "ERR_ATTEMPT_OUT_OF_SYNC",
      "ERR_NODE_NOT_AVAILABLE",
      "ERR_QUESTION_FINISHED",
      "ERR_ANALYSIS_NOT_READY",
      "ERR_OVERVIEW_NOT_READY",
    ];
    for (const code of codes409) {
      expect(getHttpStatus(code)).toBe(409);
    }
  });

  it("khop chinh xac ma HTTP 410", () => {
    expect(getHttpStatus("ERR_SESSION_ENGINE_OUTDATED")).toBe(410);
  });

  it("khop chinh xac ma HTTP 413", () => {
    expect(getHttpStatus("ERR_STREAM_QUOTA_EXCEEDED")).toBe(413);
  });

  it("khop chinh xac cac ma HTTP 422", () => {
    const codes422: ServerErrorCode[] = [
      "ERR_EMPTY_REPOSITORY",
      "ERR_UNSUPPORTED_LANGUAGE",
      "ERR_NO_SOURCE_FILES_FOUND",
      "ERR_NO_ARCHITECTURAL_SLICE",
      "ERR_STREAM_CORRUPTED",
      "ERR_AI_REJECTED",
    ];
    for (const code of codes422) {
      expect(getHttpStatus(code)).toBe(422);
    }
  });

  it("khop chinh xac cac ma HTTP 429", () => {
    const codes429: ServerErrorCode[] = [
      "ERR_GITHUB_RATE_LIMIT_CDN",
      "ERR_TOKEN_QUOTA_EXCEEDED",
      "ERR_EXPLAIN_LIMIT",
    ];
    for (const code of codes429) {
      expect(getHttpStatus(code)).toBe(429);
    }
  });

  it("khop chinh xac ma HTTP 451", () => {
    expect(getHttpStatus("ERR_REPO_UNAVAILABLE_451")).toBe(451);
  });

  it("khop chinh xac cac ma HTTP 503", () => {
    const codes503: ServerErrorCode[] = [
      "ERR_AI_UNAVAILABLE",
      "ERR_PERSISTENCE_UNAVAILABLE",
      "ERR_SERVER_BUSY",
    ];
    for (const code of codes503) {
      expect(getHttpStatus(code)).toBe(503);
    }
  });

  it("khop chinh xac cac ma HTTP 504", () => {
    const codes504: ServerErrorCode[] = ["ERR_NETWORK_TIMEOUT", "ERR_STREAM_TIMEOUT"];
    for (const code of codes504) {
      expect(getHttpStatus(code)).toBe(504);
    }
  });

  it("retryable dung voi 7 ma duoc quy dinh", () => {
    const expectedRetryable: ServerErrorCode[] = [
      "ERR_NETWORK_TIMEOUT",
      "ERR_STREAM_TIMEOUT",
      "ERR_GITHUB_RATE_LIMIT_CDN",
      "ERR_SERVER_BUSY",
      "ERR_AI_UNAVAILABLE",
      "ERR_PERSISTENCE_UNAVAILABLE",
      "ERR_ATTEMPT_OUT_OF_SYNC",
    ];

    expect(RETRYABLE_ERROR_CODES.size).toBe(7);
    for (const code of expectedRetryable) {
      expect(isRetryable(code)).toBe(true);
      expect(RETRYABLE_ERROR_CODES.has(code)).toBe(true);
    }

    expect(isRetryable("ERR_UNAUTHENTICATED")).toBe(false);
    expect(isRetryable("ERR_SESSION_NOT_FOUND")).toBe(false);
    expect(isRetryable("ERR_INVALID_GITHUB_URL")).toBe(false);
    expect(isRetryable("ERR_EMPTY_REPOSITORY")).toBe(false);
  });

  it("thong diep ERR_UNAUTHENTICATED, ERR_PERSISTENCE_UNAVAILABLE, ERR_ANSWER_TOO_SHORT khop nguyen van 30_UI", () => {
    expect(defaultMessage("ERR_UNAUTHENTICATED")).toBe("Phiên đăng nhập đã hết hạn.");
    expect(defaultMessage("ERR_PERSISTENCE_UNAVAILABLE")).toBe(
      "Máy chủ lưu tiến độ đang gặp sự cố — thao tác chưa thực hiện, bạn không mất lượt."
    );
    expect(defaultMessage("ERR_ANSWER_TOO_SHORT")).toBe(
      `Câu trả lời quá ngắn — viết ít nhất ${CONFIG.ANSWER_MIN_CHARS} ký tự (không tính khoảng trắng).`
    );
  });

  it("thong diep details.language va details.hint xu ly dung khi co va khi khong co details", () => {
    expect(defaultMessage("ERR_UNSUPPORTED_LANGUAGE", { language: "Go" })).toContain("Go");
    expect(defaultMessage("ERR_UNSUPPORTED_LANGUAGE")).toBe(
      "SimpliFey chưa có bộ phân tích cú pháp cho ngôn ngữ này nên chưa dựng được bản đồ."
    );

    expect(defaultMessage("ERR_NO_SOURCE_FILES_FOUND", { hint: "empty_subdir" })).toContain(
      "empty_subdir"
    );
    expect(defaultMessage("ERR_NO_SOURCE_FILES_FOUND")).toBe(
      "Không tìm thấy file mã nguồn nào đọc được (repo chỉ có tài liệu, cấu hình hoặc file nhị phân)."
    );

    expect(defaultMessage("ERR_ANALYSIS_NOT_READY")).toBe("");
    expect(defaultMessage("ERR_OVERVIEW_NOT_READY")).toBe("");
  });

  it("createApiError tra dung cau truc ApiError", () => {
    const err = createApiError("ERR_UNAUTHENTICATED");
    expect(err).toEqual({
      error: {
        code: "ERR_UNAUTHENTICATED",
        message: "Phiên đăng nhập đã hết hạn.",
        retryable: false,
      },
    });

    const errWithDetails = createApiError("ERR_UNSUPPORTED_LANGUAGE", undefined, {
      language: "FORTRAN",
    });
    expect(errWithDetails.error.details).toEqual({ language: "FORTRAN" });
    expect(errWithDetails.error.retryable).toBe(false);

    const retryableErr = createApiError("ERR_AI_UNAVAILABLE");
    expect(retryableErr.error.retryable).toBe(true);
  });

  it("ApiHttpError tao doi tuong hop le va tra response JSON dung status", async () => {
    const httpErr = new ApiHttpError("ERR_UNAUTHENTICATED", "Chua dang nhap");
    expect(httpErr.status).toBe(401);
    expect(httpErr.retryable).toBe(false);

    const response = httpErr.toResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "ERR_UNAUTHENTICATED",
        message: "Chua dang nhap",
        retryable: false,
      },
    });
  });

  it("toErrorResponse bat loi unknown va fallback ve ERR_PERSISTENCE_UNAVAILABLE (503)", async () => {
    const unknownError = new Error("Database connection failed");
    const response = toErrorResponse(unknownError);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    expect(body.error.message).toBe(
      "Máy chủ lưu tiến độ đang gặp sự cố — thao tác chưa thực hiện, bạn không mất lượt."
    );
    expect(body.error.retryable).toBe(true);
  });

  it("toErrorResponse che dau thong tin nhay cam (khong lo password=abc)", async () => {
    const sensitiveError = new Error("connection failure password=abc secret=xyz");
    const response = toErrorResponse(sensitiveError);
    expect(response.status).toBe(503);

    const text = await response.text();
    expect(text).not.toContain("password=abc");
    expect(text).not.toContain("secret=xyz");

    const body = JSON.parse(text);
    expect(body.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    expect(body.error.message).toBe(
      "Máy chủ lưu tiến độ đang gặp sự cố — thao tác chưa thực hiện, bạn không mất lượt."
    );
  });

  it("A-02: toErrorResponse ghi log an toan (error_name, error_message da che secret) va bo err_name", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);

    // 1. Lỗi Error("relation x does not exist") ⇒ log có error_name và error_message chứa đúng câu đó
    const normalError = new Error("relation x does not exist");
    const res1 = toErrorResponse(normalError);
    expect(res1.status).toBe(503);
    const body1 = await res1.json();
    expect(body1.error.message).not.toContain("relation x does not exist");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error_name: "Error",
        error_message: "relation x does not exist",
      })
    );
    const lastCall1 = errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall1).not.toHaveProperty("err_name");

    // 2. Lỗi có password=abc ⇒ log không chứa abc
    const passError = new Error("connection failure password=abc secret=xyz");
    const res2 = toErrorResponse(passError);
    expect(res2.status).toBe(503);
    const body2 = await res2.json();
    expect(body2.error.message).not.toContain("password=abc");
    const lastCall2 = errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall2.error_name).toBe("Error");
    expect(typeof lastCall2.error_message).toBe("string");
    expect(lastCall2.error_message).not.toContain("abc");
    expect(lastCall2.error_message).not.toContain("xyz");
    expect(lastCall2).not.toHaveProperty("err_name");

    // 3. Lỗi có postgresql://user:p4ssw0rd@db.example.com:5432/app ⇒ log không chứa p4ssw0rd
    const connError = new Error(
      "connection failed to postgresql://user:p4ssw0rd@db.example.com:5432/app"
    );
    const res3 = toErrorResponse(connError);
    expect(res3.status).toBe(503);
    const res3Text = await res3.text();
    expect(res3Text).not.toContain("p4ssw0rd");
    expect(res3Text).not.toContain("postgresql://");
    const lastCall3 = errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall3.error_name).toBe("Error");
    expect(lastCall3.error_message).not.toContain("p4ssw0rd");
    expect(lastCall3.error_message).toContain("<REDACTED_SECRET>");
    expect(lastCall3).not.toHaveProperty("err_name");

    // 4. Lỗi không phải Error ⇒ error_message là ""
    const stringError = "strange non-error thrown";
    const res4 = toErrorResponse(stringError);
    expect(res4.status).toBe(503);
    const lastCall4 = errorSpy.mock.calls[errorSpy.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall4.error_name).toBe("string");
    expect(lastCall4.error_message).toBe("");
    expect(lastCall4).not.toHaveProperty("err_name");

    errorSpy.mockRestore();
  });

  it("toErrorResponse tra dung status va body khi loi la ApiHttpError", async () => {
    const err = new ApiHttpError("ERR_QUESTION_FINISHED");
    const response = toErrorResponse(err);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("ERR_QUESTION_FINISHED");
    expect(body.error.message).toBe("Câu này đã kết thúc.");
    expect(body.error.retryable).toBe(false);
  });

  it("createErrorResponse tra dung Response theo code", async () => {
    const response = createErrorResponse("ERR_DEMO_MODE_DISABLED");
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("ERR_DEMO_MODE_DISABLED");
  });
});

describe("Logging Helpers (04_KIEN_TRUC_TRIEN_KHAI.md Muc 9)", () => {
  it("khong bao gio gay loi khi ghi log request, AI call va guard blocked", () => {
    expect(() => {
      logApiRequest({
        req_id: "req_test",
        route: "POST /api/test",
        status: 200,
        duration_ms: 50,
      });
      logAiCall({
        req_id: "req_ai",
        call_kind: "ANALYZE",
        backend: "vertex",
        model: "gemini-3.5-flash-lite",
        tokens_in: 100,
        tokens_out: 50,
        cached_tokens: 0,
        retries: 0,
        cost_usd: 0.0001,
        ai_cache_hit: false,
        duration_ms: 100,
        session_id: "sess_1",
      });
      logGuardBlocked({
        event: "guard_blocked",
        call: "analyze",
        attempt: 1,
        node_id: "node_1",
        codes: ["A1"],
        prompt_version: "1.0.0",
        llm_model: "gemini-3.5-flash-lite",
      });
    }).not.toThrow();
  });
});

describe("/api/me endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("goi GET /api/me khong co token tra 401 ERR_UNAUTHENTICATED", async () => {
    const req = new Request("http://localhost:3000/api/me", { method: "GET" });
    const res = await getMe(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_UNAUTHENTICATED");
    expect(body.error.retryable).toBe(false);
  });

  it("goi DELETE /api/me khong co token tra 401 ERR_UNAUTHENTICATED", async () => {
    const req = new Request("http://localhost:3000/api/me", { method: "DELETE" });
    const res = await deleteMe(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("ERR_UNAUTHENTICATED");
  });

  it("goi GET /api/me co token hop le tra 200 voi MeResponse", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          email: "learner@example.com",
          user_metadata: { user_name: "learner" },
        },
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/me", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const res = await getMe(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.profile.user_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(body.profile.display_name).toBe("testuser");
    expect(body.profile.skills.HTTP_ROUTING).toBeDefined();
    expect(body.profile.overall_tier).toBeDefined();
    expect(typeof body.server_now).toBe("number");
  });

  it("goi DELETE /api/me co token hop le tra 204", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          email: "learner@example.com",
        },
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/me", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const res = await deleteMe(req);
    expect(res.status).toBe(204);
  });

  it("DELETE /api/me goi dung cau auth.users va tra 204 khi thanh cong", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          email: "learner@example.com",
        },
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/me", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const res = await deleteMe(req);
    expect(res.status).toBe(204);

    const calledQuery = mockSql.mock.calls
      .map((call) => (Array.isArray(call[0]) ? call[0].join("?") : String(call[0])))
      .find((q) => q.includes("auth.users"));
    expect(calledQuery).toBeDefined();
    expect(calledQuery).toContain("DELETE FROM auth.users");
  });

  it("DELETE /api/me loi DB tra 503 ERR_PERSISTENCE_UNAVAILABLE", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          email: "learner@example.com",
        },
      },
      error: null,
    });

    mockSql.mockRejectedValueOnce(new Error("Database connection dropped"));

    const req = new Request("http://localhost:3000/api/me", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token-123" },
    });
    const res = await deleteMe(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    expect(body.error.retryable).toBe(true);
  });
});
