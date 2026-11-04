import { describe, it, expect } from "vitest";
import { ERROR_MESSAGES, formatErrorMessage } from "../messages";
import type { ErrorCode } from "@/contracts/errors";

describe("T27: ERROR_MESSAGES compliance and coverage", () => {
  const REQUIRED_ERROR_CODES: ErrorCode[] = [
    // Ingestion
    "ERR_INVALID_GITHUB_URL",
    "ERR_PREFLIGHT_404_OR_PRIVATE",
    "ERR_NETWORK_TIMEOUT",
    "ERR_BRANCH_NOT_FOUND",
    "ERR_EMPTY_REPOSITORY",
    "ERR_REPO_UNAVAILABLE_451",
    "ERR_GITHUB_RATE_LIMIT_CDN",
    "ERR_STREAM_TIMEOUT",
    "ERR_STREAM_CORRUPTED",
    "ERR_STREAM_QUOTA_EXCEEDED",
    "ERR_UNSUPPORTED_LANGUAGE",
    "ERR_NO_SOURCE_FILES_FOUND",
    "ERR_NO_ARCHITECTURAL_SLICE",
    "ERR_UPLOAD_INVALID",
    "ERR_SERVER_BUSY",

    // Learning
    "ERR_NODE_NOT_AVAILABLE",
    "ERR_ANALYSIS_NOT_READY",
    "ERR_OVERVIEW_NOT_READY",
    "ERR_QUESTION_FINISHED",
    "ERR_ATTEMPT_OUT_OF_SYNC",
    "ERR_ANSWER_TOO_SHORT",
    "ERR_ANSWER_TOO_LONG",
    "ERR_ANSWER_DUPLICATE",
    "ERR_ANSWER_INAPPROPRIATE",
    "ERR_REPORT_NOT_ALLOWED",

    // AI
    "ERR_AI_UNAVAILABLE",
    "ERR_AI_REJECTED",
    "ERR_TOKEN_QUOTA_EXCEEDED",

    // Persistence
    "ERR_UNAUTHENTICATED",
    "ERR_SESSION_NOT_FOUND",
    "ERR_SESSION_ENGINE_OUTDATED",
    "ERR_PERSISTENCE_UNAVAILABLE",
    "ERR_DEMO_MODE_DISABLED",

    // Client
    "ERR_CLIENT_NETWORK",
  ];

  it("should contain a friendly Vietnamese message for all error codes", () => {
    for (const code of REQUIRED_ERROR_CODES) {
      const msg = ERROR_MESSAGES[code];
      expect(msg).toBeDefined();
      expect(typeof msg).toBe("string");
      expect(msg.trim().length).toBeGreaterThan(10);
    }
  });

  it("formatErrorMessage should return the proper message or fallback", () => {
    expect(formatErrorMessage("ERR_UNAUTHENTICATED")).toBe(
      ERROR_MESSAGES.ERR_UNAUTHENTICATED
    );
    expect(
      formatErrorMessage("UNKNOWN_CODE" as unknown as ErrorCode, "Lỗi tùy chỉnh")
    ).toBe("Lỗi tùy chỉnh");
    expect(formatErrorMessage(undefined, undefined)).toBe(
      "Đã xảy ra lỗi trong quá trình xử lý yêu cầu."
    );
  });
});
