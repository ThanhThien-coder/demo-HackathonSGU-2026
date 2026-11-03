import pino from "pino";
import type { GuardLogEntry } from "@/contracts";

// 04_KIEN_TRUC_TRIEN_KHAI.md Muc 9.2: Danh sach CAM ghi log tuyet doi
const REDACT_PATHS = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "GITHUB_TOKEN",
  "authorization",
  "Authorization",
  "headers.authorization",
  "headers.Authorization",
  "token",
  "access_token",
  "refresh_token",
  "student_answer",
  "code",
  "snippet",
  "ast",
  "trace_steps",
  "scoped_code_snippet",
  "password",
  "secret",
];

// 04_KIEN_TRUC_TRIEN_KHAI.md Muc 9: Pino xuat JSON 1 dong (NDJSON) ra stdout
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
});

export interface ApiRequestLogEntry {
  req_id: string;
  route: string;
  status: number;
  duration_ms: number;
  tokens_used?: number;
  session_id?: string;
  node_id?: string;
  error_code?: string | null;
}

export interface AiCallLogEntry {
  req_id: string;
  call_kind: "ANALYZE" | "OVERVIEW" | "QUESTIONS" | "GRADE";
  backend: "vertex" | "studio" | string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
  retries: number;
  cost_usd: number;
  ai_cache_hit: boolean;
  duration_ms: number;
  session_id: string;
  node_id?: string;
}

// 04 Muc 9.1: Ghi log request API
export function logApiRequest(entry: ApiRequestLogEntry): void {
  const payload = {
    req_id: entry.req_id,
    route: entry.route,
    status: entry.status,
    duration_ms: entry.duration_ms,
    tokens_used: entry.tokens_used ?? 0,
    session_id: entry.session_id ?? null,
    node_id: entry.node_id ?? null,
    error_code: entry.error_code ?? null,
  };

  if (entry.status >= 500) {
    logger.error(payload);
  } else if (entry.status >= 400) {
    logger.warn(payload);
  } else {
    logger.info(payload);
  }
}

// 04 Muc 9.1: Dinh dang log L1 cho moi loi goi AI
export function logAiCall(entry: AiCallLogEntry): void {
  logger.info({
    req_id: entry.req_id,
    call_kind: entry.call_kind,
    backend: entry.backend,
    model: entry.model,
    tokens_in: entry.tokens_in,
    tokens_out: entry.tokens_out,
    cached_tokens: entry.cached_tokens,
    retries: entry.retries,
    cost_usd: entry.cost_usd,
    ai_cache_hit: entry.ai_cache_hit,
    duration_ms: entry.duration_ms,
    session_id: entry.session_id,
    node_id: entry.node_id ?? null,
  });
}

// 04 Muc 9.1 & 21 GUARD-22: Log cong gac chan
export function logGuardBlocked(entry: GuardLogEntry): void {
  logger.warn(entry);
}
