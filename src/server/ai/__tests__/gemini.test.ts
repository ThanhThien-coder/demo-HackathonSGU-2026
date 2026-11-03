import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "@/contracts";

// Mock SDK: không gọi Gemini thật.
const sdk = vi.hoisted(() => {
  const generateContent = vi.fn(async () => ({ text: "{}" }));
  const GoogleGenAI = vi.fn(function (this: { models: unknown }) {
    this.models = { generateContent };
  });
  return { generateContent, GoogleGenAI };
});

vi.mock("@google/genai", () => ({ GoogleGenAI: sdk.GoogleGenAI }));

import {
  assertGeminiEnv,
  createGeminiClient,
  generateWithGemini,
  isAiDisabled,
  resetGeminiClientForTest,
} from "../gemini";

const request = { contents: "xin chào" };

beforeEach(() => {
  sdk.generateContent.mockClear();
  sdk.GoogleGenAI.mockClear();
  resetGeminiClientForTest();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("X-11 — ngắt khẩn cấp AI (D-66)", () => {
  it('AI_DISABLED="true" ⇒ trả ERR_AI_UNAVAILABLE, không gọi model', async () => {
    vi.stubEnv("AI_DISABLED", "true");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "khoa-gia");

    const result = await generateWithGemini(request);

    expect(result).toEqual({ ok: false, code: "ERR_AI_UNAVAILABLE" });
    expect(sdk.generateContent).not.toHaveBeenCalled();
    expect(sdk.GoogleGenAI).not.toHaveBeenCalled();
  });

  it('AI_DISABLED="true" ⇒ không gọi model kể cả khi env AI còn thiếu', async () => {
    vi.stubEnv("AI_DISABLED", "true");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "");

    await expect(generateWithGemini(request)).resolves.toEqual({ ok: false, code: "ERR_AI_UNAVAILABLE" });
    expect(sdk.generateContent).not.toHaveBeenCalled();
  });

  it('AI_DISABLED="false" ⇒ gọi model CONFIG.LLM_MODEL đúng 1 lần', async () => {
    vi.stubEnv("AI_DISABLED", "false");
    vi.stubEnv("GEMINI_BACKEND", "studio");
    vi.stubEnv("GEMINI_API_KEY", "khoa-gia");

    const result = await generateWithGemini(request);

    expect(result.ok).toBe(true);
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
    expect(sdk.generateContent).toHaveBeenCalledWith({ ...request, model: CONFIG.LLM_MODEL });
  });

  it("isAiDisabled chỉ nhận đúng chuỗi \"true\"", () => {
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
    expect(() => assertGeminiEnv({ GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "du-an-thu" })).not.toThrow();
    expect(assertGeminiEnv({ GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "du-an-thu" })).toBe("vertex");
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
    createGeminiClient({ GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "du-an-thu", GEMINI_API_KEY: "khoa-gia" });
    expect(sdk.GoogleGenAI).toHaveBeenCalledWith({ vertexai: true, project: "du-an-thu", location: "global" });
  });

  it("studio ⇒ khởi tạo SDK bằng GEMINI_API_KEY", () => {
    createGeminiClient({ GEMINI_BACKEND: "studio", GEMINI_API_KEY: "khoa-gia" });
    expect(sdk.GoogleGenAI).toHaveBeenCalledWith({ apiKey: "khoa-gia" });
  });
});
