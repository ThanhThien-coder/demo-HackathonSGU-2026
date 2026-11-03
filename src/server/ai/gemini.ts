// Khung gọi Gemini (C01): chọn kênh vertex | studio, kiểm biến môi trường lúc khởi động,
// ngắt AI khẩn cấp bằng AI_DISABLED. Spec: 03 Mục 8, 05 Mục 6, D-50, D-66.
// Thử lại, responseSchema, log chi phí: C04 làm tiếp trên file này.
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { CONFIG } from "@/contracts";
import type { AiErrorCode } from "@/contracts";

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
    throw new Error(`GEMINI_BACKEND phải là "vertex" hoặc "studio" (đang là: ${backend === undefined ? "chưa đặt" : `"${backend}"`})`);
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
    return new GoogleGenAI({ vertexai: true, project: env.GOOGLE_CLOUD_PROJECT, location: VERTEX_LOCATION });
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

export type GeminiCallResult =
  | { ok: true; response: GenerateContentResponse }
  | { ok: false; code: AiErrorCode };

/**
 * Một lời gọi `generateContent` với model `CONFIG.LLM_MODEL` (D-50).
 * `AI_DISABLED="true"` ⇒ trả ngay `ERR_AI_UNAVAILABLE`, không tạo client, không gọi Gemini (X-11).
 */
export async function generateWithGemini(
  request: Omit<GenerateContentParameters, "model">,
): Promise<GeminiCallResult> {
  if (isAiDisabled()) return { ok: false, code: "ERR_AI_UNAVAILABLE" };
  const response = await getGeminiClient().models.generateContent({ ...request, model: CONFIG.LLM_MODEL });
  return { ok: true, response };
}
