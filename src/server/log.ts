// 04 Mục 9 — log JSON 1 dòng ra stdout (pino). Cấm ghi khóa, prompt, bài làm, nội dung AI.
import pino from "pino";

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  redact: ["DATABASE_URL", "GEMINI_API_KEY", "GITHUB_TOKEN", "authorization", "*.authorization"],
});
