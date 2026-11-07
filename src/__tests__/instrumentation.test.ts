import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/log";

const { mockAssertGeminiEnv, mockInitParsers, realAssert } = vi.hoisted(() => ({
  mockAssertGeminiEnv: vi.fn(),
  mockInitParsers: vi.fn(),
  realAssert: {
    fn: null as (typeof import("@/server/ai/gemini").assertGeminiEnv) | null,
  },
}));

vi.mock("@/server/ai/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/gemini")>();
  realAssert.fn = actual.assertGeminiEnv;
  return {
    ...actual,
    assertGeminiEnv: mockAssertGeminiEnv,
  };
});

vi.mock("@/server/engine/graph/parser", () => ({
  initParsers: mockInitParsers,
}));

describe("A-04, B-13: src/instrumentation.ts register()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_RUNTIME = "nodejs";
    mockAssertGeminiEnv.mockImplementation((env = process.env) => realAssert.fn?.(env));
    mockInitParsers.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("X-12: studio thiếu GEMINI_API_KEY ⇒ register() reject", async () => {
    process.env.GEMINI_BACKEND = "studio";
    delete process.env.GEMINI_API_KEY;

    const { register } = await import("@/instrumentation");
    await expect(register()).rejects.toThrow('GEMINI_BACKEND="studio" nhưng thiếu GEMINI_API_KEY');
  });

  it("X-12: vertex có GOOGLE_CLOUD_PROJECT, không có GEMINI_API_KEY ⇒ register() resolve", async () => {
    process.env.GEMINI_BACKEND = "vertex";
    process.env.GOOGLE_CLOUD_PROJECT = "my-gcp-project";
    delete process.env.GEMINI_API_KEY;

    const { register } = await import("@/instrumentation");
    await expect(register()).resolves.toBeUndefined();
    expect(mockAssertGeminiEnv).toHaveBeenCalled();
    expect(mockInitParsers).toHaveBeenCalled();
  });

  it("NEXT_RUNTIME = 'edge' ⇒ không gọi 2 hàm", async () => {
    process.env.NEXT_RUNTIME = "edge";
    process.env.GEMINI_BACKEND = "studio";
    delete process.env.GEMINI_API_KEY;

    const { register } = await import("@/instrumentation");
    await expect(register()).resolves.toBeUndefined();
    expect(mockAssertGeminiEnv).not.toHaveBeenCalled();
    expect(mockInitParsers).not.toHaveBeenCalled();
  });

  it("initParsers lỗi ⇒ register() vẫn resolve, có logger.warn", async () => {
    process.env.GEMINI_BACKEND = "vertex";
    process.env.GOOGLE_CLOUD_PROJECT = "my-gcp-project";

    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    mockInitParsers.mockRejectedValueOnce(new Error("wasm load error"));

    const { register } = await import("@/instrumentation");
    await expect(register()).resolves.toBeUndefined();
    expect(mockAssertGeminiEnv).toHaveBeenCalled();
    expect(mockInitParsers).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error_name: "Error",
      })
    );
    warnSpy.mockRestore();
  });
});
