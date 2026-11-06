// Gọi Gemini qua Vertex AI hoặc Google AI Studio (D-50, D-66).
// Request theo schema, phân loại lỗi (AI-11, AI-12), gọi lại có độ trễ retryDelay.
import { GoogleGenAI } from "@google/genai";
import type {
  GenerateContentResponse,
  HarmBlockThreshold,
  HarmCategory,
  Schema,
} from "@google/genai";
import { CONFIG } from "@/contracts";
import type { AiErrorCode } from "@/contracts";
import { logger } from "../log";

export type GeminiBackend = "vertex" | "studio";

type Env = Record<string, string | undefined>;

// Endpoint Vertex AI dùng vùng "global" (05 Mục 6, D-66).
const VERTEX_LOCATION = "global";

/**
 * Kiểm biến môi trường của kênh AI lúc khởi động server (X-12, D-66).
 * Ném lỗi thì server không được khởi động. Vai A gắn hàm này vào lúc khởi động.
 * - `GEMINI_BACKEND` phải là "vertex" hoặc "studio".
 * - "studio": bắt buộc `GEMINI_API_KEY`.
 * - "vertex": xác thực bằng service account, không đòi `GEMINI_API_KEY`;
 *   bắt buộc `GOOGLE_CLOUD_PROJECT` (03 Mục 8).
 */
export function assertGeminiEnv(env: Env = process.env): GeminiBackend {
  const backend = env.GEMINI_BACKEND;
  if (backend !== "vertex" && backend !== "studio") {
    throw new Error(
      `GEMINI_BACKEND phải là "vertex" hoặc "studio" (đang là: ${backend === undefined ? "chưa đặt" : `"${backend}"`})`,
    );
  }
  if (backend === "studio" && !env.GEMINI_API_KEY) {
    throw new Error('GEMINI_BACKEND="studio" nhưng thiếu GEMINI_API_KEY');
  }
  if (backend === "vertex" && !env.GOOGLE_CLOUD_PROJECT) {
    throw new Error('GEMINI_BACKEND="vertex" nhưng thiếu GOOGLE_CLOUD_PROJECT');
  }
  return backend;
}

/** Khóa khẩn cấp: chỉ đúng chuỗi "true" mới ngắt AI (03 Mục 8, D-66). */
export function isAiDisabled(env: Env = process.env): boolean {
  return env.AI_DISABLED === "true";
}

/** Tạo client SDK theo kênh đã kiểm. Không tự đọc key khi chạy Vertex. */
export function createGeminiClient(env: Env = process.env): GoogleGenAI {
  const backend = assertGeminiEnv(env);
  if (backend === "vertex") {
    return new GoogleGenAI({
      vertexai: true,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: VERTEX_LOCATION,
    });
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!cachedClient) cachedClient = createGeminiClient();
  return cachedClient;
}

/** Chỉ dùng trong test: bỏ client đã tạo để lần gọi sau tạo lại theo env mới. */
export function resetGeminiClientForTest(): void {
  cachedClient = null;
}

// Kiểu // nội bộ theo AI-11 (không thêm vào src/contracts/)
export interface LlmRequest<T> {
  kind: keyof typeof CONFIG.LLM_MAX_OUTPUT_TOKENS;
  system: string;
  user: string;
  schema: Schema;
  sessionId: string;
  parse: (json: unknown) => T | null;
}

export type LlmOutcome<T> =
  | ({ ok: true; value: T } | { ok: false; kind: "TRANSIENT" | "INVALID_JSON" | "FATAL"; status?: number; retry_after_ms?: number })
    & { tokens_in: number; tokens_out: number };

type LlmFailure<T> = Extract<LlmOutcome<T>, { ok: false }>;

/** Thời gian Google yêu cầu chờ (RetryInfo, dạng "57s") đổi ra ms; không có ⇒ undefined (20 AI-12, D-74 R1). */
function extractRetryAfterMs(err: unknown): number | undefined {
  let text = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  try {
    text += " " + JSON.stringify(err);
  } catch {
    // vòng tham chiếu: chỉ dùng message
  }
  const m = /"?retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s"?/.exec(text);
  return m ? Math.round(Number(m[1]) * 1000) : undefined;
}

/**
 * Ghi 1 dòng log warn cho lời gọi lỗi rồi trả lại kết quả (20 AI-12, lỗi C-01).
 * Chỉ ghi loại lời gọi, kind, status, retry_after_ms, lý do ngắn; cấm ghi khóa, prompt, nội dung AI.
 */
function failed<T>(req: LlmRequest<T>, reason: string, out: LlmFailure<T>): LlmFailure<T> {
  logger.warn(
    {
      event: "llm_error",
      call: req.kind,
      kind: out.kind,
      status: out.status ?? null,
      retry_after_ms: out.retry_after_ms ?? null,
      reason,
    },
    "llm_error",
  );
  return out;
}

function extractHttpStatus(err: unknown): number | null {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.status_code === "number") return e.status_code;
    if (typeof e.code === "number") return e.code;
    if (typeof e.message === "string") {
      const match = e.message.match(/\b(400|401|403|404|429|500|503|504)\b/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Một lời gọi model generateContent với đúng cấu hình AI-11 và phân loại lỗi AI-12.
 * AI_DISABLED="true" ⇒ trả ngay kết quả thất bại, 0 token, không tạo client, không gọi SDK (X-11).
 */
export async function callLLMOnce<T>(req: LlmRequest<T>): Promise<LlmOutcome<T>> {
  if (isAiDisabled()) {
    return failed(req, "AI_DISABLED", { ok: false, kind: "FATAL", tokens_in: 0, tokens_out: 0 });
  }

  let client: GoogleGenAI;
  try {
    client = getGeminiClient();
  } catch {
    return failed(req, "NO_CLIENT", { ok: false, kind: "FATAL", tokens_in: 0, tokens_out: 0 });
  }

  let response: GenerateContentResponse;
  try {
    response = await client.models.generateContent({
      model: CONFIG.LLM_MODEL,
      contents: [{ role: "user", parts: [{ text: req.user }] }],
      config: {
        systemInstruction: req.system,
        temperature: CONFIG.LLM_TEMPERATURE,
        maxOutputTokens: CONFIG.LLM_MAX_OUTPUT_TOKENS[req.kind],
        safetySettings: [
          "HARASSMENT",
          "HATE_SPEECH",
          "SEXUALLY_EXPLICIT",
          "DANGEROUS_CONTENT",
        ].map((c) => ({
          category: `HARM_CATEGORY_${c}` as unknown as HarmCategory,
          threshold: "BLOCK_ONLY_HIGH" as unknown as HarmBlockThreshold,
        })),
        // 20 Mục 2: model không cho tắt hoặc budget = 0 ⇒ bỏ thinkingConfig để tránh lỗi 400 INVALID_ARGUMENT
        ...(CONFIG.LLM_THINKING_BUDGET > 0
          ? { thinkingConfig: { thinkingBudget: CONFIG.LLM_THINKING_BUDGET } }
          : {}),
        responseMimeType: "application/json",
        responseSchema: req.schema,
        abortSignal: AbortSignal.timeout(CONFIG.LLM_TIMEOUT_MS),
      },
    });
  } catch (err: unknown) {
    const status = extractHttpStatus(err);
    const e = err as Record<string, unknown> | null;
    const usage = e?.usageMetadata as
      | { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
      | undefined;
    const tokens_in = usage?.promptTokenCount ?? 0;
    const tokens_out = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);

    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return failed(req, "HTTP", { ok: false, kind: "FATAL", status, tokens_in, tokens_out });
    }

    const retry_after_ms = extractRetryAfterMs(err);
    return failed(req, status === null ? "NETWORK" : "HTTP", {
      ok: false,
      kind: "TRANSIENT",
      status: status ?? undefined,
      ...(retry_after_ms !== undefined ? { retry_after_ms } : {}),
      tokens_in,
      tokens_out,
    });
  }

  const tokens_in = response.usageMetadata?.promptTokenCount ?? 0;
  const tokens_out =
    (response.usageMetadata?.candidatesTokenCount ?? 0) +
    (response.usageMetadata?.thoughtsTokenCount ?? 0);

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (response.promptFeedback?.blockReason || (finishReason && finishReason !== "STOP")) {
    return failed(req, "NOT_STOP", { ok: false, kind: "INVALID_JSON", tokens_in, tokens_out });
  }

  const rawText =
    response.text ??
    candidate?.content?.parts
      ?.map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
      .join("") ??
    "";

  if (!rawText || !rawText.trim()) {
    return failed(req, "EMPTY", { ok: false, kind: "INVALID_JSON", tokens_in, tokens_out });
  }

  const cleanedText = rawText
    .trim()
    .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1")
    .trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch {
    return failed(req, "BAD_JSON", { ok: false, kind: "INVALID_JSON", tokens_in, tokens_out });
  }

  const value = req.parse(parsedJson);
  if (value === null || value === undefined) {
    return failed(req, "PARSE", { ok: false, kind: "INVALID_JSON", tokens_in, tokens_out });
  }

  return { ok: true, value, tokens_in, tokens_out };
}

/**
 * Chờ trước khi gọi lại (20 AI-12, D-74 R1). prev là TRANSIENT do 429/503:
 * - Google trả retryDelay > CONFIG.LLM_RETRY_DELAY_MAX_MS ⇒ không chờ, trả false (không gọi lại).
 * - Ngược lại chờ max(CONFIG.LLM_RETRY_DELAY_MS, retryDelay) + ngẫu nhiên [0, CONFIG.LLM_RETRY_JITTER_MS).
 * Các trường hợp khác không chờ. Trả true nếu được gọi lại. Cho phép tiêm hàm sleep để test không chờ thật.
 */
export async function retryDelay(
  prev: LlmOutcome<unknown>,
  sleepFn: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<boolean> {
  if (!prev.ok && prev.kind === "TRANSIENT" && (prev.status === 429 || prev.status === 503)) {
    const server = prev.retry_after_ms;
    if (server !== undefined && server > CONFIG.LLM_RETRY_DELAY_MAX_MS) return false;
    const jitter = Math.floor(Math.random() * CONFIG.LLM_RETRY_JITTER_MS);
    await sleepFn(Math.max(CONFIG.LLM_RETRY_DELAY_MS, server ?? 0) + jitter);
  }
  return true;
}

/**
 * Vòng gọi lại tự động cho lời gọi không có vòng cổng gác:
 * Tối đa 1 + CONFIG.LLM_MAX_RETRIES request.
 * TRANSIENT / INVALID_JSON ⇒ await retryDelay(prev) rồi gọi lại; FATAL ⇒ dừng ngay; cộng dồn token.
 */
export async function callLLMWithRetry<T>(
  req: LlmRequest<T>,
  sleepFn?: (ms: number) => Promise<void>,
): Promise<
  | { ok: true; value: T; tokens_in: number; tokens_out: number }
  | { ok: false; code: AiErrorCode; tokens_in: number; tokens_out: number }
> {
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (let attempt = 0; attempt <= CONFIG.LLM_MAX_RETRIES; attempt++) {
    const outcome = await callLLMOnce(req);
    totalTokensIn += outcome.tokens_in;
    totalTokensOut += outcome.tokens_out;

    if (outcome.ok) {
      return {
        ok: true,
        value: outcome.value,
        tokens_in: totalTokensIn,
        tokens_out: totalTokensOut,
      };
    }

    if (outcome.kind === "FATAL") {
      break;
    }

    if (attempt < CONFIG.LLM_MAX_RETRIES && !(await retryDelay(outcome, sleepFn))) {
      break;
    }
  }

  return {
    ok: false,
    code: "ERR_AI_UNAVAILABLE",
    tokens_in: totalTokensIn,
    tokens_out: totalTokensOut,
  };
}

/**
 * Tính chi phí ước tính bằng USD từ số token vào và ra (D-69).
 */
export function aiCostUsd(tokensIn: number, tokensOut: number): number {
  return (
    (tokensIn * CONFIG.LLM_PRICE_INPUT_USD_PER_M) / 1e6 +
    (tokensOut * CONFIG.LLM_PRICE_OUTPUT_USD_PER_M) / 1e6
  );
}
