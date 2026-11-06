/**
 * src/instrumentation.ts
 *
 * Kiểm tra biến môi trường và nạp trước grammar lúc server khởi động (04 Mục 9.2, D-66, B-13, X-12).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { assertGeminiEnv } = await import("@/server/ai/gemini");
  assertGeminiEnv();

  try {
    const { initParsers } = await import("@/server/engine/graph/parser");
    await initParsers();
  } catch (err: unknown) {
    const { logger } = await import("@/server/log");
    const error_name = err instanceof Error ? err.name : typeof err;
    logger.warn({ error_name });
  }
}
