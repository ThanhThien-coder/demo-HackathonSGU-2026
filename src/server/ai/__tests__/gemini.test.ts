import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts";
import type { Schema } from "@google/genai";

// Mock SDK: không gọi Gemini thật.
const sdk = vi.hoisted(() => {
  type MockGenerateContentResponse = {
    text?: string;
    candidates?: Array<{ finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
    };
  };
  const generateContent = vi.fn(async (): Promise<MockGenerateContentResponse> => ({
    text: '{"status":"ok"}',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
  }));
  const GoogleGenAI = vi.fn(function (this: { models: unknown }) {
    this.models = { generateContent };
  });
  return { generateContent, GoogleGenAI };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: sdk.GoogleGenAI,
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
  },
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: "BLOCK_ONLY_HIGH",
  },
}));

import {
  assertGeminiEnv,
  callLLMOnce,
  callLLMWithRetry,
  createGeminiClient,
  isAiDisabled,
  resetGeminiClientForTest,
  retryDelay,
  type LlmRequest,
} from "../gemini";

const dummyReq: LlmRequest<{ status: string }> = {
  kind: "ANALYZE",
  system: "system prompt",
  user: "user prompt",
  schema: {} as Schema,
  sessionId: "session-1",
  parse: (json: unknown) => {
    if (typeof json === "object" && json !== null && "status" in json) {
      return json as { status: string };
    }
    return null;
  },
};

beforeEach(() => {
  sdk.generateContent.mockReset();
  sdk.generateContent.mockResolvedValue({
    text: '{"status":"ok"}',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
  });
  sdk.GoogleGenAI.mockClear();
  resetGeminiClientForTest();
  vi.stubEnv("GEMINI_BACKEND", "studio");
  vi.stubEnv("GEMINI_API_KEY", "khoa-gia");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("X-11 — ngắt khẩn cấp AI (D-66)", () => {
  it('AI_DISABLED="true" ⇒ trả ERR_AI_UNAVAILABLE, không gọi model', async () => {
    vi.stubEnv("AI_DISABLED", "true");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "khoa-gia");

    const result = await callLLMWithRetry(dummyReq);

    expect(result).toEqual({ ok: false, code: "ERR_AI_UNAVAILABLE", tokens_in: 0, tokens_out: 0 });
    expect(sdk.generateContent).not.toHaveBeenCalled();
    expect(sdk.GoogleGenAI).not.toHaveBeenCalled();
  });

  it('AI_DISABLED="true" ⇒ callLLMOnce trả thất bại FATAL, 0 token, không gọi model', async () => {
    vi.stubEnv("AI_DISABLED", "true");

    const result = await callLLMOnce(dummyReq);

    expect(result).toEqual({ ok: false, kind: "FATAL", tokens_in: 0, tokens_out: 0 });
    expect(sdk.generateContent).not.toHaveBeenCalled();
    expect(sdk.GoogleGenAI).not.toHaveBeenCalled();
  });

  it('AI_DISABLED="true" ⇒ không gọi model kể cả khi env AI còn thiếu', async () => {
    vi.stubEnv("AI_DISABLED", "true");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(callLLMWithRetry(dummyReq)).resolves.toEqual({
      ok: false,
      code: "ERR_AI_UNAVAILABLE",
      tokens_in: 0,
      tokens_out: 0,
    });
    expect(sdk.generateContent).not.toHaveBeenCalled();
  });

  it('AI_DISABLED="false" ⇒ gọi model CONFIG.LLM_MODEL đúng 1 lần', async () => {
    vi.stubEnv("AI_DISABLED", "false");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "khoa-gia");

    const result = await callLLMWithRetry(dummyReq);

    expect(result.ok).toBe(true);
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
    expect(sdk.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: CONFIG.LLM_MODEL }),
    );
  });

  it('isAiDisabled chỉ nhận đúng chuỗi "true"', () => {
    expect(isAiDisabled({ AI_DISABLED: "true" })).toBe(true);
    expect(isAiDisabled({ AI_DISABLED: "false" })).toBe(false);
    expect(isAiDisabled({})).toBe(false);
  });
});

describe("X-12 — khởi động theo backend AI (D-66)", () => {
  it('GEMINI_BACKEND="studio" thiếu GEMINI_API_KEY ⇒ ném lỗi', () => {
    expect(() => assertGeminiEnv({ GEMINI_BACKEND: "studio" })).toThrow();
    expect(() => assertGeminiEnv({ GEMINI_BACKEND: "studio", GEMINI_API_KEY: "" })).toThrow();
  });

  it('GEMINI_BACKEND="vertex" không có GEMINI_API_KEY ⇒ không ném lỗi', () => {
    expect(() =>
      assertGeminiEnv({ GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "du-an-thu" }),
    ).not.toThrow();
    expect(
      assertGeminiEnv({ GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "du-an-thu" }),
    ).toBe("vertex");
  });

  it('GEMINI_BACKEND="studio" có GEMINI_API_KEY ⇒ không ném lỗi', () => {
    expect(assertGeminiEnv({ GEMINI_BACKEND: "studio", GEMINI_API_KEY: "khoa-gia" })).toBe("studio");
  });

  it("GEMINI_BACKEND chưa đặt hoặc sai giá trị ⇒ ném lỗi", () => {
    expect(() => assertGeminiEnv({})).toThrow();
    expect(() => assertGeminiEnv({ GEMINI_BACKEND: "openai" })).toThrow();
  });

  it('GEMINI_BACKEND="vertex" thiếu GOOGLE_CLOUD_PROJECT ⇒ ném lỗi (03 Mục 8)', () => {
    expect(() => assertGeminiEnv({ GEMINI_BACKEND: "vertex" })).toThrow();
  });

  it("vertex ⇒ khởi tạo SDK qua Vertex AI, location global, không truyền key", () => {
    createGeminiClient({
      GEMINI_BACKEND: "vertex",
      GOOGLE_CLOUD_PROJECT: "du-an-thu",
      GEMINI_API_KEY: "khoa-gia",
    });
    expect(sdk.GoogleGenAI).toHaveBeenCalledWith({
      vertexai: true,
      project: "du-an-thu",
      location: "global",
    });
  });

  it("studio ⇒ khởi tạo SDK bằng GEMINI_API_KEY", () => {
    createGeminiClient({ GEMINI_BACKEND: "studio", GEMINI_API_KEY: "khoa-gia" });
    expect(sdk.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "khoa-gia" });
  });
});

describe("AI-12 — Phân loại lỗi, gọi lại và tính token", () => {
  it("503 rồi OK ⇒ token cộng cả 2 request", async () => {
    const error503 = Object.assign(new Error("Service Unavailable"), {
      status: 503,
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 },
    });

    sdk.generateContent
      .mockRejectedValueOnce(error503)
      .mockResolvedValueOnce({
        text: '{"status":"ok"}',
        usageMetadata: { promptTokenCount: 14, candidatesTokenCount: 8 },
      });

    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await callLLMWithRetry(dummyReq, sleepFn);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ status: "ok" });
      expect(result.tokens_in).toBe(26); // 12 + 14
      expect(result.tokens_out).toBe(14); // 6 + 8
    }
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn.mock.calls[0][0]).toBeGreaterThanOrEqual(CONFIG.LLM_RETRY_DELAY_MS);
    expect(sleepFn.mock.calls[0][0]).toBeLessThan(
      CONFIG.LLM_RETRY_DELAY_MS + CONFIG.LLM_RETRY_JITTER_MS,
    );
  });

  it("503 hai lần ⇒ ERR_AI_UNAVAILABLE", async () => {
    const error503_1 = Object.assign(new Error("503 Unavailable"), {
      status: 503,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 },
    });
    const error503_2 = Object.assign(new Error("503 Unavailable"), {
      status: 503,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3 },
    });

    sdk.generateContent
      .mockRejectedValueOnce(error503_1)
      .mockRejectedValueOnce(error503_2);

    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await callLLMWithRetry(dummyReq, sleepFn);

    expect(result).toEqual({
      ok: false,
      code: "ERR_AI_UNAVAILABLE",
      tokens_in: 20,
      tokens_out: 5,
    });
    expect(sdk.generateContent).toHaveBeenCalledTimes(1 + CONFIG.LLM_MAX_RETRIES);
    expect(sleepFn).toHaveBeenCalledTimes(1);
  });

  it("HTTP 404 ⇒ không gọi lại (1 request)", async () => {
    const error404 = Object.assign(new Error("404 Not Found"), {
      status: 404,
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 },
    });

    sdk.generateContent.mockRejectedValueOnce(error404);

    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await callLLMWithRetry(dummyReq, sleepFn);

    expect(result).toEqual({
      ok: false,
      code: "ERR_AI_UNAVAILABLE",
      tokens_in: 5,
      tokens_out: 1,
    });
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("JSON hỏng rồi OK ⇒ gọi lại", async () => {
    sdk.generateContent
      .mockResolvedValueOnce({
        text: "```json { invalid json",
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      })
      .mockResolvedValueOnce({
        text: '```json\n{"status":"recovered"}\n```',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 7 },
      });

    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await callLLMWithRetry(dummyReq, sleepFn);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ status: "recovered" });
      expect(result.tokens_in).toBe(20);
      expect(result.tokens_out).toBe(12);
    }
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
    // INVALID_JSON không chờ retryDelay
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("finishReason !== STOP ⇒ INVALID_JSON và gọi lại", async () => {
    sdk.generateContent
      .mockResolvedValueOnce({
        candidates: [{ finishReason: "SAFETY" }],
        text: '{"status":"bad"}',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 },
      })
      .mockResolvedValueOnce({
        candidates: [{ finishReason: "STOP" }],
        text: '{"status":"stopped_ok"}',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6 },
      });

    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const result = await callLLMWithRetry(dummyReq, sleepFn);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ status: "stopped_ok" });
    }
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it("lỗi do assertGeminiEnv ném ra (thiếu key/backend) trong callLLMOnce phải là FATAL", async () => {
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "");
    resetGeminiClientForTest();

    const outcome = await callLLMOnce(dummyReq);
    expect(outcome).toEqual({
      ok: false,
      kind: "FATAL",
      tokens_in: 0,
      tokens_out: 0,
    });
  });

  it("parse() trả null ⇒ INVALID_JSON", async () => {
    sdk.generateContent.mockResolvedValueOnce({
      text: '{"wrong_field": 123}',
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 },
    });

    const outcome = await callLLMOnce(dummyReq);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe("INVALID_JSON");
      expect(outcome.tokens_in).toBe(8);
      expect(outcome.tokens_out).toBe(4);
    }
  });

  it("retryDelay: 429 và 503 chờ đúng dải thời gian, timeout/mạng không chờ", async () => {
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    // 429 => chờ
    await retryDelay({ ok: false, kind: "TRANSIENT", status: 429, tokens_in: 0, tokens_out: 0 }, sleepFn);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn.mock.calls[0][0]).toBeGreaterThanOrEqual(CONFIG.LLM_RETRY_DELAY_MS);
    expect(sleepFn.mock.calls[0][0]).toBeLessThan(CONFIG.LLM_RETRY_DELAY_MS + CONFIG.LLM_RETRY_JITTER_MS);

    sleepFn.mockClear();

    // 503 => chờ
    await retryDelay({ ok: false, kind: "TRANSIENT", status: 503, tokens_in: 0, tokens_out: 0 }, sleepFn);
    expect(sleepFn).toHaveBeenCalledTimes(1);

    sleepFn.mockClear();

    // Timeout (status undefined) => không chờ
    await retryDelay({ ok: false, kind: "TRANSIENT", tokens_in: 0, tokens_out: 0 }, sleepFn);
    expect(sleepFn).not.toHaveBeenCalled();

    // INVALID_JSON => không chờ
    await retryDelay({ ok: false, kind: "INVALID_JSON", tokens_in: 0, tokens_out: 0 }, sleepFn);
    expect(sleepFn).not.toHaveBeenCalled();

    // FATAL => không chờ
    await retryDelay({ ok: false, kind: "FATAL", status: 404, tokens_in: 0, tokens_out: 0 }, sleepFn);
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
