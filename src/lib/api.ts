import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import {
  isOfflineMode,
  offlineIngestRepo,
  offlineEnrichNode,
  offlineEvaluateFeynman,
  offlineRevealQuestion,
  offlineGetOverview,
  offlineGetAnalysis,
  buildOfflineProfile,
  getOfflineBundle,
  setOfflinePersona,
} from "./offline";
import type {
  ErrorCode,
  ApiError,
  MeResponse,
  PersonaRequest,
  PersonaResponse,
  PersonaMode,
  IngestRequest,
  IngestResponse,
  SessionsResponse,
  LearningSessionSummary,
  ProgressResponse,
  SessionProgress,
  HistoryResponse,
  AttemptHistoryItem,
  AnalyzeNodeRequest,
  AnalyzeNodeResponse,
  AnalyzeOverviewRequest,
  AnalyzeOverviewResponse,
  EnrichNodeRequest,
  EnrichNodeResponse,
  QuestionView,
  EvaluateFeynmanRequest,
  EvaluateFeynmanResponse,
  FollowUp,
  RevealRequest,
  RevealResponse,
  ReportWrongRequest,
  ReportWrongResponse,
  RunMode,
  LearnerCognitiveProfile,
  NodeStateView,
  NodeAnalysisView,
  RepoOverviewView,
  QuestionState,
  SkillChange,
  SWESkill,
  LearnerTier,
} from "@/contracts";

export type {
  ErrorCode,
  ApiError,
  MeResponse,
  PersonaRequest,
  PersonaResponse,
  PersonaMode,
  IngestRequest,
  IngestResponse,
  SessionsResponse,
  LearningSessionSummary,
  ProgressResponse,
  SessionProgress,
  HistoryResponse,
  AttemptHistoryItem,
  AnalyzeNodeRequest,
  AnalyzeNodeResponse,
  AnalyzeOverviewRequest,
  AnalyzeOverviewResponse,
  EnrichNodeRequest,
  EnrichNodeResponse,
  QuestionView,
  EvaluateFeynmanRequest,
  EvaluateFeynmanResponse,
  FollowUp,
  RevealRequest,
  RevealResponse,
  ReportWrongRequest,
  ReportWrongResponse,
  RunMode,
  LearnerCognitiveProfile,
  NodeStateView,
  NodeAnalysisView,
  RepoOverviewView,
  QuestionState,
  SkillChange,
  SWESkill,
  LearnerTier,
};

// Aliases matching prompt conventions & dispatch specifications
export type UserProfileResponse = MeResponse;
export type PersonaId = PersonaMode;
export type SwitchPersonaRequest = PersonaRequest | { persona: PersonaMode };
export type SwitchPersonaResponse = PersonaResponse;
export type DeleteUserResponse = void;
export type SessionListResponse = SessionsResponse;
export type SessionProgressResponse = ProgressResponse;
export type SessionHistoryResponse = HistoryResponse;
export type SessionStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED" | string;

/**
 * Lớp lỗi chuẩn hóa cho client API SimpliFey.
 * Vừa kế thừa Error chuẩn của JS/TS, vừa hiện thực trọn vẹn interface ApiError của spec/02.
 */
export class ApiClientError extends Error implements ApiError {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, string | number | boolean>;
  };

  constructor(error: ApiError["error"]) {
    super(error.message);
    this.name = "ApiClientError";
    this.error = error;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

/**
 * Type guard kiểm tra một đối tượng có phải cấu trúc ApiError chuẩn hay không.
 * Khớp cả ApiClientError lẫn object lỗi { error: { code, message, retryable } } từ server.
 */
export function isApiError(err: unknown): err is ApiError {
  if (typeof err !== "object" || err === null) return false;
  const candidate = err as { error?: unknown };
  if (typeof candidate.error !== "object" || candidate.error === null) return false;
  const inner = candidate.error as {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
  };
  return (
    typeof inner.code === "string" &&
    typeof inner.message === "string" &&
    typeof inner.retryable === "boolean"
  );
}

/**
 * Singleton lấy Supabase Client trên môi trường trình duyệt (CSR).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  return createClient();
}

/**
 * Lấy Bearer access_token cho các request API.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // Bỏ qua lỗi đọc session, tiếp tục fallback
    }
  }

  return null;
}

/**
 * Xây dựng URL hoàn chỉnh dựa trên Base URL NEXT_PUBLIC_API_URL và endpoint tương đối.
 */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Helper tạo lỗi mạng ERR_CLIENT_NETWORK chuẩn hóa.
 */
export function createClientNetworkError(
  message = "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra lại đường truyền mạng.",
  details?: Record<string, string | number | boolean>
): ApiClientError {
  return new ApiClientError({
    code: "ERR_CLIENT_NETWORK",
    message,
    retryable: true,
    details,
  });
}

export type ApiResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: ApiError };

/**
 * Hàm gọi API nền tảng cho frontend SimpliFey.
 *
 * Tính năng:
 * - Tự động gắn token `Authorization: Bearer <token>` từ Supabase session.
 * - Tự động set `Content-Type: application/json` (trừ khi body là FormData).
 * - Chuẩn hóa toàn bộ lỗi mạng / parse JSON về `ERR_CLIENT_NETWORK`.
 * - Bắt lỗi HTTP non-2xx và ném đối tượng `ApiClientError` (hiện thực `ApiError`), không quăng unhandled error.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const headers = new Headers(options?.headers);

  // 1. Tự động gắn Bearer Token nếu chưa có
  if (!headers.has("Authorization")) {
    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  let body = options?.body;

  // 2. Tự động set Content-Type và format JSON nếu là object thuần
  if (!isFormData) {
    if (
      body &&
      typeof body === "object" &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) &&
      !(body instanceof URLSearchParams)
    ) {
      body = JSON.stringify(body);
    }

    if (!headers.has("Content-Type") && body) {
      headers.set("Content-Type", "application/json");
    }
  }

  // 3. Thực thi fetch và bắt lỗi kết nối mạng
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (networkError) {
    throw createClientNetworkError(
      "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra lại đường truyền mạng.",
      {
        reason:
          networkError instanceof Error
            ? networkError.message
            : String(networkError),
      }
    );
  }

  // 4. Xử lý HTTP 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 5. Đọc text và parse JSON an toàn
  const rawText = await response.text();
  let parsedJson: unknown = null;
  let isJson = false;

  if (rawText) {
    try {
      parsedJson = JSON.parse(rawText);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  // 6. Xử lý trạng thái HTTP không thành công (non-2xx)
  if (!response.ok) {
    if (isJson && isApiError(parsedJson)) {
      throw new ApiClientError(parsedJson.error);
    }

    // Dự phòng khi server trả về trang lỗi HTML hoặc proxy 502/503/504
    let fallbackCode: ErrorCode = "ERR_CLIENT_NETWORK";
    let retryable = false;

    if (response.status === 401) {
      fallbackCode = "ERR_UNAUTHENTICATED";
    } else if (response.status === 404) {
      fallbackCode = "ERR_SESSION_NOT_FOUND";
    } else if (response.status === 429) {
      fallbackCode = "ERR_GITHUB_RATE_LIMIT_CDN";
      retryable = true;
    } else if (response.status === 503) {
      fallbackCode = "ERR_PERSISTENCE_UNAVAILABLE";
      retryable = true;
    } else if (response.status === 504) {
      fallbackCode = "ERR_NETWORK_TIMEOUT";
      retryable = true;
    } else if (response.status >= 500) {
      fallbackCode = "ERR_CLIENT_NETWORK";
      retryable = true;
    }

    const message =
      isJson &&
      typeof parsedJson === "object" &&
      parsedJson !== null &&
      "message" in parsedJson &&
      typeof (parsedJson as { message: unknown }).message === "string"
        ? (parsedJson as { message: string }).message
        : response.statusText || `Lỗi yêu cầu máy chủ (HTTP ${response.status})`;

    throw new ApiClientError({
      code: fallbackCode,
      message,
      retryable,
      details: {
        status: response.status,
        statusText: response.statusText,
      },
    });
  }

  // 7. Xử lý kết quả trả về khi thành công (2xx)
  if (!isJson && rawText) {
    return rawText as unknown as T;
  }

  return (parsedJson ?? null) as T;
}

/**
 * Phiên bản Safe của apiFetch dành cho các component không muốn dùng khối try-catch.
 * Trả về kết quả dạng { ok: true, data } hoặc { ok: false, error }.
 */
export async function apiFetchSafe<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const data = await apiFetch<T>(endpoint, options);
    return { ok: true, data, error: null };
  } catch (err) {
    if (isApiError(err)) {
      return { ok: false, data: null, error: err };
    }
    return {
      ok: false,
      data: null,
      error: {
        error: {
          code: "ERR_CLIENT_NETWORK",
          message: err instanceof Error ? err.message : "Lỗi kết nối",
          retryable: true,
        },
      },
    };
  }
}

/* =========================================================================
 * 13 API ENDPOINT CLIENT WRAPPERS (Steps 1 to 13)
 * Tuân thủ quy cách spec/02_CONTRACTS, spec/03_API_VA_LUU_TRU và API_INTEGRATION_PROMPTS
 * ========================================================================= */

// -------------------------------------------------------------------------
// Bước 1: GET /api/me (Lấy hồ sơ người học & 16 kỹ năng BKT)
// -------------------------------------------------------------------------
export async function getMe(): Promise<UserProfileResponse> {
  return apiFetch<UserProfileResponse>("/api/me", {
    method: "GET",
  });
}

export async function getMeSafe(): Promise<ApiResult<UserProfileResponse>> {
  if (isOfflineMode()) {
    return {
      ok: true,
      data: {
        profile: buildOfflineProfile(),
        server_now: Date.now(),
      },
      error: null,
    };
  }

  return apiFetchSafe<UserProfileResponse>("/api/me", {
    method: "GET",
  });
}

// -------------------------------------------------------------------------
// Bước 2: POST /api/demo/persona (Chuyển đổi Persona Demo D-09)
// -------------------------------------------------------------------------
export async function switchPersona(
  persona: PersonaId | SwitchPersonaRequest
): Promise<SwitchPersonaResponse> {
  const mode: PersonaMode =
    typeof persona === "string"
      ? persona
      : "mode" in persona
      ? persona.mode
      : persona.persona;

  return apiFetch<SwitchPersonaResponse>("/api/demo/persona", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export async function switchPersonaSafe(
  persona: PersonaId | SwitchPersonaRequest
): Promise<ApiResult<SwitchPersonaResponse>> {
  const mode: PersonaMode =
    typeof persona === "string"
      ? persona
      : "mode" in persona
      ? persona.mode
      : persona.persona;

  if (isOfflineMode()) {
    setOfflinePersona(mode);
    return {
      ok: true,
      data: {
        profile: buildOfflineProfile(mode),
        server_now: Date.now(),
      },
      error: null,
    };
  }

  return apiFetchSafe<SwitchPersonaResponse>("/api/demo/persona", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

// -------------------------------------------------------------------------
// Bước 3: DELETE /api/me (Xóa dữ liệu & reset tài khoản, 204 No Content)
// -------------------------------------------------------------------------
export async function deleteMe(): Promise<DeleteUserResponse> {
  return apiFetch<DeleteUserResponse>("/api/me", {
    method: "DELETE",
  });
}

export const deleteAccount = deleteMe;

export async function deleteMeSafe(): Promise<ApiResult<DeleteUserResponse>> {
  return apiFetchSafe<DeleteUserResponse>("/api/me", {
    method: "DELETE",
  });
}

export const deleteAccountSafe = deleteMeSafe;

// -------------------------------------------------------------------------
// Bước 4: POST /api/ingest (Quét repo GitHub hoặc upload zip mở phiên học)
// -------------------------------------------------------------------------
export async function ingestRepo(
  data: IngestRequest | FormData
): Promise<IngestResponse> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return apiFetch<IngestResponse>("/api/ingest", {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function ingestRepoSafe(
  data: IngestRequest | FormData
): Promise<ApiResult<IngestResponse>> {
  if (isOfflineMode()) {
    return offlineIngestRepo();
  }

  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return apiFetchSafe<IngestResponse>("/api/ingest", {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
  });
}

// -------------------------------------------------------------------------
// Bước 5: GET /api/sessions (Danh sách các phiên học gần đây)
// -------------------------------------------------------------------------
export async function getSessions(params?: {
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}): Promise<SessionListResponse> {
  let endpoint = "/api/sessions";
  if (params) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", String(params.status));
    if (typeof params.limit === "number") query.set("limit", String(params.limit));
    if (typeof params.offset === "number") query.set("offset", String(params.offset));
    const qs = query.toString();
    if (qs) {
      endpoint += `?${qs}`;
    }
  }
  return apiFetch<SessionListResponse>(endpoint, {
    method: "GET",
  });
}

export async function getSessionsSafe(params?: {
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}): Promise<ApiResult<SessionListResponse>> {
  if (isOfflineMode()) {
    return {
      ok: true,
      data: {
        sessions: [
          {
            session_id: "demo-session-shop-api",
            snapshot: {
              source: "GITHUB",
              repo_key: "simplifey/shop-api",
              snapshot_id: "5be1c2a01234567890abcdef01234567890abcde",
              snapshot_id_kind: "COMMIT_SHA",
              subdir: "",
              ref_label: "main",
            },
            repo_name: "shop-api",
            engine_version: "1.6.0",
            created_at: 1730000000000,
            last_active_at: 1730000000000,
            completed_count: 1,
            failed_count: 0,
            total_nodes: 7,
            can_resume: true,
            resume_blocker: null,
          },
        ],
      },
      error: null,
    };
  }

  let endpoint = "/api/sessions";
  if (params) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", String(params.status));
    if (typeof params.limit === "number") query.set("limit", String(params.limit));
    if (typeof params.offset === "number") query.set("offset", String(params.offset));
    const qs = query.toString();
    if (qs) {
      endpoint += `?${qs}`;
    }
  }
  return apiFetchSafe<SessionListResponse>(endpoint, {
    method: "GET",
  });
}

// -------------------------------------------------------------------------
// Bước 6: GET /api/sessions/{session_id}/progress (Tiến độ đồ thị bài học)
// -------------------------------------------------------------------------
export async function getSessionProgress(
  sessionId: string
): Promise<SessionProgressResponse> {
  return apiFetch<SessionProgressResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/progress`,
    {
      method: "GET",
    }
  );
}

export async function getSessionProgressSafe(
  sessionId: string
): Promise<ApiResult<SessionProgressResponse>> {
  if (isOfflineMode()) {
    const bundle = getOfflineBundle();
    if (bundle) {
      return {
        ok: true,
        data: {
          progress: bundle.ingest.progress,
        },
        error: null,
      };
    }
  }

  return apiFetchSafe<SessionProgressResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/progress`,
    {
      method: "GET",
    }
  );
}

// -------------------------------------------------------------------------
// Bước 7: GET /api/sessions/{session_id}/history (Lịch sử nộp bài)
// -------------------------------------------------------------------------
export async function getSessionHistory(
  sessionId: string
): Promise<SessionHistoryResponse> {
  return apiFetch<SessionHistoryResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/history`,
    {
      method: "GET",
    }
  );
}

export async function getSessionHistorySafe(
  sessionId: string
): Promise<ApiResult<SessionHistoryResponse>> {
  return apiFetchSafe<SessionHistoryResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/history`,
    {
      method: "GET",
    }
  );
}

// -------------------------------------------------------------------------
// Bước 8: POST /api/analyze-node (Phân tích kiến trúc node bằng AI)
// -------------------------------------------------------------------------
export async function analyzeNode(
  data: AnalyzeNodeRequest
): Promise<AnalyzeNodeResponse>;
export async function analyzeNode(
  sessionId: string,
  nodeId: string
): Promise<AnalyzeNodeResponse>;
export async function analyzeNode(
  dataOrSessionId: AnalyzeNodeRequest | string,
  nodeId?: string
): Promise<AnalyzeNodeResponse> {
  const payload: AnalyzeNodeRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId, node_id: nodeId! }
      : dataOrSessionId;

  return apiFetch<AnalyzeNodeResponse>("/api/analyze-node", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeNodeSafe(
  data: AnalyzeNodeRequest
): Promise<ApiResult<AnalyzeNodeResponse>>;
export async function analyzeNodeSafe(
  sessionId: string,
  nodeId: string
): Promise<ApiResult<AnalyzeNodeResponse>>;
export async function analyzeNodeSafe(
  dataOrSessionId: AnalyzeNodeRequest | string,
  nodeId?: string
): Promise<ApiResult<AnalyzeNodeResponse>> {
  const payload: AnalyzeNodeRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId, node_id: nodeId! }
      : dataOrSessionId;

  if (isOfflineMode()) {
    const res = offlineGetAnalysis(payload.node_id);
    if (!res.ok) return { ok: false, data: null, error: res.error };
    return {
      ok: true,
      data: {
        node_id: payload.node_id,
        analysis: res.data,
        node_state: {
          node_id: payload.node_id,
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        tokens_used: 0,
        unlocked_node_ids: [],
      },
      error: null,
    };
  }

  return apiFetchSafe<AnalyzeNodeResponse>("/api/analyze-node", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------------------
// Bước 9: POST /api/analyze-overview (Tổng quan toàn cảnh repo)
// -------------------------------------------------------------------------
export async function analyzeOverview(
  data: AnalyzeOverviewRequest
): Promise<AnalyzeOverviewResponse>;
export async function analyzeOverview(
  sessionId: string
): Promise<AnalyzeOverviewResponse>;
export async function analyzeOverview(
  dataOrSessionId: AnalyzeOverviewRequest | string
): Promise<AnalyzeOverviewResponse> {
  const payload: AnalyzeOverviewRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId }
      : dataOrSessionId;

  return apiFetch<AnalyzeOverviewResponse>("/api/analyze-overview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeOverviewSafe(
  data: AnalyzeOverviewRequest
): Promise<ApiResult<AnalyzeOverviewResponse>>;
export async function analyzeOverviewSafe(
  sessionId: string
): Promise<ApiResult<AnalyzeOverviewResponse>>;
export async function analyzeOverviewSafe(
  dataOrSessionId: AnalyzeOverviewRequest | string
): Promise<ApiResult<AnalyzeOverviewResponse>> {
  const payload: AnalyzeOverviewRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId }
      : dataOrSessionId;

  if (isOfflineMode()) {
    const res = offlineGetOverview();
    if (!res.ok) return { ok: false, data: null, error: res.error };
    return {
      ok: true,
      data: {
        overview: res.data,
        tokens_used: 0,
      },
      error: null,
    };
  }

  return apiFetchSafe<AnalyzeOverviewResponse>("/api/analyze-overview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------------------
// Bước 10: POST /api/enrich-node (Sinh câu hỏi Feynman cho bài học)
// -------------------------------------------------------------------------
export async function enrichNode(
  data: EnrichNodeRequest
): Promise<EnrichNodeResponse>;
export async function enrichNode(
  sessionId: string,
  nodeId: string,
  mode?: RunMode
): Promise<EnrichNodeResponse>;
export async function enrichNode(
  dataOrSessionId: EnrichNodeRequest | string,
  nodeId?: string,
  mode: RunMode = "LEARN"
): Promise<EnrichNodeResponse> {
  const payload: EnrichNodeRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId, node_id: nodeId!, mode }
      : dataOrSessionId;

  return apiFetch<EnrichNodeResponse>("/api/enrich-node", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function enrichNodeSafe(
  data: EnrichNodeRequest
): Promise<ApiResult<EnrichNodeResponse>>;
export async function enrichNodeSafe(
  sessionId: string,
  nodeId: string,
  mode?: RunMode
): Promise<ApiResult<EnrichNodeResponse>>;
export async function enrichNodeSafe(
  dataOrSessionId: EnrichNodeRequest | string,
  nodeId?: string,
  mode: RunMode = "LEARN"
): Promise<ApiResult<EnrichNodeResponse>> {
  const payload: EnrichNodeRequest =
    typeof dataOrSessionId === "string"
      ? { session_id: dataOrSessionId, node_id: nodeId!, mode }
      : dataOrSessionId;

  if (isOfflineMode()) {
    return offlineEnrichNode(payload.node_id, payload.mode);
  }

  return apiFetchSafe<EnrichNodeResponse>("/api/enrich-node", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------------------
// Bước 11: POST /api/evaluate-feynman (Chấm bài Feynman & cập nhật BKT)
// -------------------------------------------------------------------------
export async function evaluateFeynman(
  data: EvaluateFeynmanRequest
): Promise<EvaluateFeynmanResponse> {
  return apiFetch<EvaluateFeynmanResponse>("/api/evaluate-feynman", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function evaluateFeynmanSafe(
  data: EvaluateFeynmanRequest
): Promise<ApiResult<EvaluateFeynmanResponse>> {
  if (isOfflineMode()) {
    return offlineEvaluateFeynman(
      "slice-order-checkout",
      "LEARN",
      data.question_index,
      data.attempt_number,
      data.student_answer
    );
  }

  return apiFetchSafe<EvaluateFeynmanResponse>("/api/evaluate-feynman", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// -------------------------------------------------------------------------
// Bước 12: POST /api/reveal (Bỏ qua câu hỏi & mở đáp án mẫu AI D-15)
// -------------------------------------------------------------------------
export async function reveal(data: RevealRequest): Promise<RevealResponse> {
  return apiFetch<RevealResponse>("/api/reveal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export const revealAnswer = reveal;

export async function revealSafe(
  data: RevealRequest
): Promise<ApiResult<RevealResponse>> {
  if (isOfflineMode()) {
    return offlineRevealQuestion(
      "slice-order-checkout",
      "LEARN",
      data.question_index
    );
  }

  return apiFetchSafe<RevealResponse>("/api/reveal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export const revealAnswerSafe = revealSafe;

// -------------------------------------------------------------------------
// Bước 13: POST /api/report-wrong (Báo sai kết quả chấm của AI & rollback BKT D-22)
// -------------------------------------------------------------------------
export async function reportWrong(
  data: ReportWrongRequest
): Promise<ReportWrongResponse> {
  return apiFetch<ReportWrongResponse>("/api/report-wrong", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reportWrongSafe(
  data: ReportWrongRequest
): Promise<ApiResult<ReportWrongResponse>> {
  return apiFetchSafe<ReportWrongResponse>("/api/report-wrong", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

