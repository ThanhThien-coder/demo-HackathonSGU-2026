// 20 Mục 2 — gọi Gemini (AI-11, AI-12). 1 request/lần; phân loại TRANSIENT / INVALID_JSON / FATAL; đếm token ngay sau request (AI-07).
import { GoogleGenAI, type Schema } from "@google/genai";
import { CONFIG } from "@/contracts/config";
import { log } from "../log";
import { addTokens } from "../store";

export interface LlmRequest<T> {
  kind: keyof typeof CONFIG.LLM_MAX_OUTPUT_TOKENS;
  system: string;
  user: string;
  schema: Schema;
  sessionId: string;
  parse: (json: unknown) => T | null;
}
export type LlmOutcome<T> = ({ ok: true; value: T } | { ok: false; kind: "TRANSIENT" | "INVALID_JSON" | "FATAL"; retry_after_ms?: number }) & { tokens_in: number; tokens_out: number };

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (client) return client;
  const backend = process.env.GEMINI_BACKEND || (process.env.GEMINI_API_KEY ? "studio" : process.env.GOOGLE_CLOUD_PROJECT ? "vertex" : "studio");
  if (backend === "vertex") {
    if (!process.env.GOOGLE_CLOUD_PROJECT) return null;
    // 05 Mục 6 (D-66): Vertex AI endpoint location "global", xác thực bằng service account của Cloud Run
    client = new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: "global" });
  } else {
    if (!process.env.GEMINI_API_KEY) return null; // D-66: studio mà thiếu key ⇒ không dùng được
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chờ trước khi gọi lại: max(LLM_RETRY_DELAY_MS, retryDelay) + jitter. false ⇒ retryDelay quá trần, không gọi lại (D-74 R1). */
export async function retryDelay(prev: { retry_after_ms?: number } | null): Promise<boolean> {
  const server = prev?.retry_after_ms;
  if (server !== undefined && server > CONFIG.LLM_RETRY_DELAY_MAX_MS) return false;
  await sleep(Math.max(CONFIG.LLM_RETRY_DELAY_MS, server ?? 0) + Math.floor(Math.random() * CONFIG.LLM_RETRY_JITTER_MS));
  return true;
}

function retryAfter(err: unknown): number | undefined {
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(err instanceof Error ? err.message : String(err));
  return m ? Math.round(Number(m[1]) * 1000) : undefined;
}

export async function callLLMOnce<T>(req: LlmRequest<T>): Promise<LlmOutcome<T>> {
  const none = { tokens_in: 0, tokens_out: 0 };
  const ai = getClient();
  if (!ai) { log.error({ event: "llm_not_configured", call: req.kind }); return { ok: false, kind: "FATAL", ...none }; }
  let usage = { in: 0, out: 0 };
  try {
    const r = await ai.models.generateContent({
      model: CONFIG.LLM_MODEL,
      contents: [{ role: "user", parts: [{ text: req.user }] }],
      config: {
        systemInstruction: req.system,
        temperature: CONFIG.LLM_TEMPERATURE,
        maxOutputTokens: CONFIG.LLM_MAX_OUTPUT_TOKENS[req.kind],
        safetySettings: ["HARASSMENT", "HATE_SPEECH", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"].map((c) => ({
          category: `HARM_CATEGORY_${c}` as never, threshold: "BLOCK_ONLY_HIGH" as never,
        })),
        // S-08: budget = 0 ⇒ không gửi thinkingConfig (Google trả 400 nếu gửi budget: 0)
        ...(CONFIG.LLM_THINKING_BUDGET > 0 ? { thinkingConfig: { thinkingBudget: CONFIG.LLM_THINKING_BUDGET } } : {}),
        responseMimeType: "application/json",
        responseSchema: req.schema,
        abortSignal: AbortSignal.timeout(CONFIG.LLM_TIMEOUT_MS),
      },
    });
    const u = r.usageMetadata;
    usage = { in: u?.promptTokenCount ?? 0, out: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0) };
    if (usage.in + usage.out > 0) await addTokens(req.sessionId, usage.in, usage.out, req.kind).catch(() => undefined);
    const finish = r.candidates?.[0]?.finishReason;
    const text = r.text;
    if ((finish && String(finish) !== "STOP") || !text) return { ok: false, kind: "INVALID_JSON", tokens_in: usage.in, tokens_out: usage.out };
    let json: unknown;
    try { json = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")); } catch { return { ok: false, kind: "INVALID_JSON", tokens_in: usage.in, tokens_out: usage.out }; }
    const v = req.parse(json);
    if (v === null) return { ok: false, kind: "INVALID_JSON", tokens_in: usage.in, tokens_out: usage.out };
    return { ok: true, value: v, tokens_in: usage.in, tokens_out: usage.out };
  } catch (e) {
    const status = (e as { status?: number }).status;
    const kind = status !== undefined && [400, 401, 403, 404].includes(status) ? "FATAL" : "TRANSIENT";
    // S-09: chỉ log loại lời gọi, kind, status — cấm ghi khóa, prompt, nội dung AI
    log.warn({ event: "llm_error", call: req.kind, kind, status: status ?? null, retry_after_ms: retryAfter(e) ?? null });
    return { ok: false, kind, retry_after_ms: retryAfter(e), tokens_in: usage.in, tokens_out: usage.out };
  }
}

/** ≤ 1 + LLM_MAX_RETRIES request; chỉ gọi lại khi TRANSIENT / INVALID_JSON. null ⇒ AI không dùng được. */
export async function callWithRetry<T>(makeReq: () => LlmRequest<T>): Promise<T | null> {
  let prev: LlmOutcome<T> | null = null;
  for (let i = 0; i <= CONFIG.LLM_MAX_RETRIES; i++) {
    if (prev && !(await retryDelay(prev.ok ? null : prev))) return null;
    const r = await callLLMOnce(makeReq());
    if (r.ok) return r.value;
    if (r.kind === "FATAL") return null;
    prev = r;
  }
  return null;
}
