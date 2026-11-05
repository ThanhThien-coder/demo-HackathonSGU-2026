// 02_CONTRACTS Mục 8–10 — API, lỗi, trạng thái trình duyệt
import type {
  AnswerIntent, FollowUpType, NodeAnalysisView, QuestionFocus, RepoOverviewView, RunMode,
} from "./ai";
import type { LearnerTier, SWESkill } from "./base";
import type { ClientStaticEngineResult, IngestionErrorCode } from "./engine";
import type {
  AttemptHistoryItem, LearnerCognitiveProfile, LearningSessionSummary, NodeStateView,
  PersonaMode, QuestionState, SessionProgress, SkillChange,
} from "./learner";

// GET /api/me
export interface MeResponse { profile: LearnerCognitiveProfile; server_now: number }
export interface SessionsResponse { sessions: LearningSessionSummary[] }
export interface HistoryResponse { items: AttemptHistoryItem[] }
export interface ProgressResponse { progress: SessionProgress }

// POST /api/ingest
export type IngestRequest =
  | { repo_url: string; subdir_override?: string }
  | { session_id: string; restart?: boolean };
export interface IngestResponse {
  session_id: string;
  result: ClientStaticEngineResult;
  progress: SessionProgress;
  analyses: Record<string, NodeAnalysisView>;
  resumed: boolean;
  from_cache: boolean;
}

export interface AnalyzeNodeRequest { session_id: string; node_id: string }
export interface AnalyzeNodeResponse {
  node_id: string;
  analysis: NodeAnalysisView | null;
  node_state: NodeStateView;
  unlocked_node_ids: string[];
  tokens_used: number;
}

export interface AnalyzeOverviewRequest { session_id: string }
export interface AnalyzeOverviewResponse { overview: RepoOverviewView; tokens_used: number }

export interface EnrichNodeRequest { session_id: string; node_id: string; mode: RunMode }
export interface QuestionView {
  question_index: number;
  skill: SWESkill;
  tier: LearnerTier;
  focus: QuestionFocus;
  feynman_question: string;
  state: QuestionState;
}
export interface EnrichNodeResponse {
  node_id: string;
  run_id: string;
  mode: RunMode;
  questions: QuestionView[];
  node_state: NodeStateView;
  tokens_used: number;
}

export interface EvaluateFeynmanRequest {
  session_id: string;
  run_id: string;
  question_index: number;
  student_answer: string;
  attempt_number: number;
}
export interface FollowUp { type: FollowUpType; question: string; step_index: number | null }
export interface EvaluateFeynmanResponse {
  question_index: number;
  attempt_number: number;
  core_accuracy: number;
  simplicity: number;
  intent: AnswerIntent;
  is_passed: boolean;
  points_covered: boolean[];
  feedback: string;
  detected_jargons: string[];
  follow_up: FollowUp | null;
  question: QuestionState;
  skill_change: SkillChange | null;
  node_state: NodeStateView;
  unlocked_node_ids: string[];
  tokens_used: number;
}

export interface RevealRequest { session_id: string; run_id: string; question_index: number }
export interface RevealResponse {
  question: QuestionState;
  skill_change: SkillChange;
  node_state: NodeStateView;
  unlocked_node_ids: string[];
}

export interface ReportWrongRequest { session_id: string; run_id: string; question_index: number; note: string }
export interface ReportWrongResponse { question: QuestionState; skill_change: SkillChange | null; node_state: NodeStateView }

export interface PersonaRequest { mode: PersonaMode }
export type PersonaResponse = MeResponse;

// ---------- Mục 9: lỗi ----------
export type LearningErrorCode =
  | "ERR_NODE_NOT_AVAILABLE"
  | "ERR_ANALYSIS_NOT_READY"
  | "ERR_OVERVIEW_NOT_READY"
  | "ERR_QUESTION_FINISHED"
  | "ERR_ATTEMPT_OUT_OF_SYNC"
  | "ERR_ANSWER_TOO_SHORT" | "ERR_ANSWER_TOO_LONG" | "ERR_ANSWER_DUPLICATE" | "ERR_ANSWER_INAPPROPRIATE"
  | "ERR_REPORT_NOT_ALLOWED";

export type AiErrorCode =
  | "ERR_AI_UNAVAILABLE"
  | "ERR_AI_REJECTED"
  | "ERR_TOKEN_QUOTA_EXCEEDED";

export type PersistenceErrorCode =
  | "ERR_UNAUTHENTICATED"
  | "ERR_SESSION_NOT_FOUND"
  | "ERR_SESSION_ENGINE_OUTDATED"
  | "ERR_PERSISTENCE_UNAVAILABLE"
  | "ERR_DEMO_MODE_DISABLED";

export type ClientErrorCode = "ERR_CLIENT_NETWORK";

export type ErrorCode = IngestionErrorCode | LearningErrorCode | AiErrorCode | PersistenceErrorCode | ClientErrorCode;

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, string | number | boolean>;
  };
}

export const HTTP_STATUS: Record<Exclude<ErrorCode, "ERR_CLIENT_NETWORK">, number> = {
  ERR_INVALID_GITHUB_URL: 400, ERR_UPLOAD_INVALID: 400, ERR_ANSWER_TOO_SHORT: 400, ERR_ANSWER_TOO_LONG: 400,
  ERR_ANSWER_DUPLICATE: 400, ERR_ANSWER_INAPPROPRIATE: 400,
  ERR_UNAUTHENTICATED: 401,
  ERR_DEMO_MODE_DISABLED: 403, ERR_REPORT_NOT_ALLOWED: 403,
  ERR_PREFLIGHT_404_OR_PRIVATE: 404, ERR_BRANCH_NOT_FOUND: 404, ERR_SESSION_NOT_FOUND: 404,
  ERR_ATTEMPT_OUT_OF_SYNC: 409, ERR_NODE_NOT_AVAILABLE: 409, ERR_QUESTION_FINISHED: 409,
  ERR_ANALYSIS_NOT_READY: 409, ERR_OVERVIEW_NOT_READY: 409,
  ERR_SESSION_ENGINE_OUTDATED: 410,
  ERR_STREAM_QUOTA_EXCEEDED: 413,
  ERR_EMPTY_REPOSITORY: 422, ERR_UNSUPPORTED_LANGUAGE: 422, ERR_NO_SOURCE_FILES_FOUND: 422,
  ERR_NO_ARCHITECTURAL_SLICE: 422, ERR_STREAM_CORRUPTED: 422, ERR_AI_REJECTED: 422,
  ERR_GITHUB_RATE_LIMIT_CDN: 429, ERR_TOKEN_QUOTA_EXCEEDED: 429,
  ERR_REPO_UNAVAILABLE_451: 451,
  ERR_AI_UNAVAILABLE: 503, ERR_PERSISTENCE_UNAVAILABLE: 503, ERR_SERVER_BUSY: 503,
  ERR_NETWORK_TIMEOUT: 504, ERR_STREAM_TIMEOUT: 504,
};

export const RETRYABLE_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  "ERR_NETWORK_TIMEOUT", "ERR_STREAM_TIMEOUT", "ERR_GITHUB_RATE_LIMIT_CDN", "ERR_SERVER_BUSY",
  "ERR_AI_UNAVAILABLE", "ERR_PERSISTENCE_UNAVAILABLE", "ERR_ATTEMPT_OUT_OF_SYNC",
]);

// ---------- Mục 10 ----------
export interface ClientWorkbenchState {
  session_id: string | null;
  result: ClientStaticEngineResult | null;
  profile: LearnerCognitiveProfile | null;
  progress: SessionProgress | null;
  analyses: Record<string, NodeAnalysisView | "PENDING" | "FAILED">;
  overview: RepoOverviewView | "PENDING" | null;
  runs: Record<string, EnrichNodeResponse>;
  active_node_id: string | null;
  active_tab: "XRAY" | "FEYNMAN" | "OVERVIEW";
  active_question_index: number | null;
  active_step: number | null;
  last_failed_answers: Record<string, string>;
  is_offline_mode: boolean;
  server_clock_offset_ms: number;
}

export interface OfflineMockBundle {               // public/demo/mock_bundle.json — dữ liệu mẫu cho chế độ Offline
  bundle_version: string;
  recorded_from: { repo: string; snapshot_id: string; engine_version: string; prompt_version: string; model: string; recorded_at: number };
  ingest: IngestResponse;
  analyses: Record<string, NodeAnalysisView>;
  overview: RepoOverviewView;
  enrich: Record<string, EnrichNodeResponse>;      // Khóa run R = `${node_id}:${mode}:${persona}`
  scripted_answers: Record<string, Array<{ answer: string; response: EvaluateFeynmanResponse }>>; // Khóa `${R}:${question_index}:${attempt_number}`
  reveals: Record<string, RevealResponse>;         // Khóa `${R}:${question_index}`
}
