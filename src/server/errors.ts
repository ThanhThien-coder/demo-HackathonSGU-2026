import { CONFIG, type ApiError, type ClientErrorCode, type ErrorCode } from "@/contracts";
import { logger } from "./log";

export type ServerErrorCode = Exclude<ErrorCode, ClientErrorCode>;

// 02_CONTRACTS.md Muc 9: Bang ma HTTP
export const ERROR_HTTP_STATUS: Record<ServerErrorCode, number> = {
  // HTTP 400
  ERR_INVALID_GITHUB_URL: 400,
  ERR_UPLOAD_INVALID: 400,
  ERR_ANSWER_TOO_SHORT: 400,
  ERR_ANSWER_TOO_LONG: 400,
  ERR_ANSWER_DUPLICATE: 400,
  ERR_ANSWER_INAPPROPRIATE: 400,
  ERR_SELECTION_INVALID: 400,

  // HTTP 401
  ERR_UNAUTHENTICATED: 401,

  // HTTP 403
  ERR_DEMO_MODE_DISABLED: 403,
  ERR_REPORT_NOT_ALLOWED: 403,

  // HTTP 404
  ERR_PREFLIGHT_404_OR_PRIVATE: 404,
  ERR_BRANCH_NOT_FOUND: 404,
  ERR_SESSION_NOT_FOUND: 404,

  // HTTP 409
  ERR_ATTEMPT_OUT_OF_SYNC: 409,
  ERR_NODE_NOT_AVAILABLE: 409,
  ERR_QUESTION_FINISHED: 409,
  ERR_ANALYSIS_NOT_READY: 409,
  ERR_OVERVIEW_NOT_READY: 409,

  // HTTP 410
  ERR_SESSION_ENGINE_OUTDATED: 410,

  // HTTP 413
  ERR_STREAM_QUOTA_EXCEEDED: 413,

  // HTTP 422
  ERR_EMPTY_REPOSITORY: 422,
  ERR_UNSUPPORTED_LANGUAGE: 422,
  ERR_NO_SOURCE_FILES_FOUND: 422,
  ERR_NO_ARCHITECTURAL_SLICE: 422,
  ERR_STREAM_CORRUPTED: 422,
  ERR_AI_REJECTED: 422,

  // HTTP 429
  ERR_GITHUB_RATE_LIMIT_CDN: 429,
  ERR_TOKEN_QUOTA_EXCEEDED: 429,
  ERR_EXPLAIN_LIMIT: 429,

  // HTTP 451
  ERR_REPO_UNAVAILABLE_451: 451,

  // HTTP 503
  ERR_AI_UNAVAILABLE: 503,
  ERR_PERSISTENCE_UNAVAILABLE: 503,
  ERR_SERVER_BUSY: 503,

  // HTTP 504
  ERR_NETWORK_TIMEOUT: 504,
  ERR_STREAM_TIMEOUT: 504,
};

// 02_CONTRACTS.md Muc 9: retryable = true voi 7 ma loi
export const RETRYABLE_ERROR_CODES = new Set<ServerErrorCode>([
  "ERR_NETWORK_TIMEOUT",
  "ERR_STREAM_TIMEOUT",
  "ERR_GITHUB_RATE_LIMIT_CDN",
  "ERR_SERVER_BUSY",
  "ERR_AI_UNAVAILABLE",
  "ERR_PERSISTENCE_UNAVAILABLE",
  "ERR_ATTEMPT_OUT_OF_SYNC",
]);

// 30_UI.md Muc 10: Thong diep mac dinh tao bang ham defaultMessage
export function defaultMessage(
  code: ServerErrorCode,
  details?: Record<string, string | number | boolean>
): string {
  switch (code) {
    case "ERR_INVALID_GITHUB_URL":
      return "Vui lòng nhập đúng đường dẫn repo GitHub (VD: https://github.com/facebook/react).";
    case "ERR_PREFLIGHT_404_OR_PRIVATE":
      return "Không tìm thấy repo này. Kiểm tra chính tả và bảo đảm repo đang Công khai (Public) — repo riêng tư thì nén thành .zip rồi kéo thả vào đây, nhưng không đưa code bí mật lên bản dùng thử.";
    case "ERR_NETWORK_TIMEOUT":
      return "Kết nối tới GitHub đang chậm. Repo có thể vẫn tồn tại — vui lòng thử lại sau vài giây.";
    case "ERR_BRANCH_NOT_FOUND":
      return "Không tải được nhánh mặc định của repo. Repo có thể đang trống hoặc vừa đổi nhánh mặc định — vui lòng thử lại sau.";
    case "ERR_EMPTY_REPOSITORY":
      return "Repo này đang trống (chưa có commit). Hãy đẩy mã nguồn lên rồi thử lại.";
    case "ERR_REPO_UNAVAILABLE_451":
      return "Repo này đã bị GitHub hạn chế truy cập.";
    case "ERR_GITHUB_RATE_LIMIT_CDN":
      return "GitHub đang tạm hạn chế lưu lượng. Đợi một lát rồi thử lại, hoặc kéo thả file .zip của repo.";
    case "ERR_STREAM_TIMEOUT":
      return "Đường truyền tới GitHub bị chậm. Vui lòng thử lại, hoặc kéo thả file .zip của repo.";
    case "ERR_STREAM_CORRUPTED":
      return "Dữ liệu tải về bị gián đoạn hoặc file .zip bị hỏng. Vui lòng thử lại.";
    case "ERR_STREAM_QUOTA_EXCEEDED": {
      const maxStreamMb = Math.floor(CONFIG.MAX_STREAM_BYTES / (1024 * 1024));
      return `Repo quá lớn (vượt ${maxStreamMb} MB nén). Hãy nén riêng thư mục mã nguồn chính (VD \`server/\`) thành .zip rồi kéo thả vào đây.`;
    }
    case "ERR_UNSUPPORTED_LANGUAGE":
      if (details?.language) {
        return `Repo chủ yếu viết bằng ${details.language}. SimpliFey chưa có bộ phân tích cú pháp cho ngôn ngữ này nên chưa dựng được bản đồ.`;
      }
      return "SimpliFey chưa có bộ phân tích cú pháp cho ngôn ngữ này nên chưa dựng được bản đồ.";
    case "ERR_NO_SOURCE_FILES_FOUND":
      if (details?.hint) {
        return `Không tìm thấy file mã nguồn nào đọc được (repo chỉ có tài liệu, cấu hình hoặc file nhị phân). ${details.hint}`;
      }
      return "Không tìm thấy file mã nguồn nào đọc được (repo chỉ có tài liệu, cấu hình hoặc file nhị phân).";
    case "ERR_NO_ARCHITECTURAL_SLICE":
      return "Đọc được code nhưng không dựng được lát cắt nào (không thấy hàm entry). Hãy thử repo hoặc thư mục khác.";
    case "ERR_UPLOAD_INVALID":
      return "File tải lên không phải .zip hợp lệ.";
    case "ERR_SERVER_BUSY":
      return "Máy chủ đang xử lý nhiều repo cùng lúc. Vui lòng thử lại sau vài giây.";
    case "ERR_NODE_NOT_AVAILABLE":
      return "Node này chưa mở hoặc đã học xong.";
    case "ERR_ANALYSIS_NOT_READY":
      return "";
    case "ERR_OVERVIEW_NOT_READY":
      return "";
    case "ERR_QUESTION_FINISHED":
      return "Câu này đã kết thúc.";
    case "ERR_ATTEMPT_OUT_OF_SYNC":
      return "Câu này vừa được nộp ở tab khác.";
    case "ERR_ANSWER_TOO_SHORT":
      return `Câu trả lời quá ngắn — viết ít nhất ${CONFIG.ANSWER_MIN_CHARS} ký tự (không tính khoảng trắng).`;
    case "ERR_ANSWER_TOO_LONG":
      return `Câu trả lời dài quá ${CONFIG.ANSWER_MAX_CHARS} ký tự.`;
    case "ERR_ANSWER_DUPLICATE":
      return "Bạn chưa bổ sung ý mới so với lần trước — hãy diễn giải khác hoặc chi tiết hơn.";
    case "ERR_ANSWER_INAPPROPRIATE":
      return "Câu trả lời chứa từ ngữ không phù hợp — vui lòng diễn đạt lại bằng ngôn ngữ chuẩn mực.";
    case "ERR_REPORT_NOT_ALLOWED":
      return "Chỉ báo sai được câu bị chấm trượt, mỗi câu một lần.";
    case "ERR_SELECTION_INVALID":
      return "Vùng chọn không khớp với mã nguồn hoặc vượt quá độ dài cho phép.";
    case "ERR_EXPLAIN_LIMIT":
      return `Phiên này đã dùng hết giới hạn ${CONFIG.EXPLAIN_MAX_PER_SESSION} lần giải thích code.`;
    case "ERR_AI_UNAVAILABLE":
      return "AI chấm bài đang bận — bài chưa được chấm, không tính lượt.";
    case "ERR_AI_REJECTED":
      return "AI chưa đặt được câu hỏi hợp lệ cho node này.";
    case "ERR_TOKEN_QUOTA_EXCEEDED":
      return "Phiên này đã dùng hết hạn mức AI: vẫn đọc được bản phân tích đã có và bỏ qua câu để xem đáp án, nhưng không chấm được bài mới.";
    case "ERR_UNAUTHENTICATED":
      return "Phiên đăng nhập đã hết hạn.";
    case "ERR_SESSION_NOT_FOUND":
      return "Không tìm thấy phiên học này.";
    case "ERR_SESSION_ENGINE_OUTDATED":
      return "Phiên này tạo bằng phiên bản engine cũ — chỉ xem lại lịch sử. Quét lại repo để học bằng bản mới.";
    case "ERR_PERSISTENCE_UNAVAILABLE":
      return "Máy chủ lưu tiến độ đang gặp sự cố — thao tác chưa thực hiện, bạn không mất lượt.";
    case "ERR_DEMO_MODE_DISABLED":
      return "Chế độ đổi persona đang tắt trên máy chủ.";
    default:
      return "";
  }
}

export const ERROR_DEFAULT_MESSAGES: Record<ServerErrorCode, string> = {
  ERR_INVALID_GITHUB_URL: defaultMessage("ERR_INVALID_GITHUB_URL"),
  ERR_PREFLIGHT_404_OR_PRIVATE: defaultMessage("ERR_PREFLIGHT_404_OR_PRIVATE"),
  ERR_NETWORK_TIMEOUT: defaultMessage("ERR_NETWORK_TIMEOUT"),
  ERR_BRANCH_NOT_FOUND: defaultMessage("ERR_BRANCH_NOT_FOUND"),
  ERR_EMPTY_REPOSITORY: defaultMessage("ERR_EMPTY_REPOSITORY"),
  ERR_REPO_UNAVAILABLE_451: defaultMessage("ERR_REPO_UNAVAILABLE_451"),
  ERR_GITHUB_RATE_LIMIT_CDN: defaultMessage("ERR_GITHUB_RATE_LIMIT_CDN"),
  ERR_STREAM_TIMEOUT: defaultMessage("ERR_STREAM_TIMEOUT"),
  ERR_STREAM_CORRUPTED: defaultMessage("ERR_STREAM_CORRUPTED"),
  ERR_STREAM_QUOTA_EXCEEDED: defaultMessage("ERR_STREAM_QUOTA_EXCEEDED"),
  ERR_UNSUPPORTED_LANGUAGE: defaultMessage("ERR_UNSUPPORTED_LANGUAGE"),
  ERR_NO_SOURCE_FILES_FOUND: defaultMessage("ERR_NO_SOURCE_FILES_FOUND"),
  ERR_NO_ARCHITECTURAL_SLICE: defaultMessage("ERR_NO_ARCHITECTURAL_SLICE"),
  ERR_UPLOAD_INVALID: defaultMessage("ERR_UPLOAD_INVALID"),
  ERR_SERVER_BUSY: defaultMessage("ERR_SERVER_BUSY"),
  ERR_NODE_NOT_AVAILABLE: defaultMessage("ERR_NODE_NOT_AVAILABLE"),
  ERR_ANALYSIS_NOT_READY: defaultMessage("ERR_ANALYSIS_NOT_READY"),
  ERR_OVERVIEW_NOT_READY: defaultMessage("ERR_OVERVIEW_NOT_READY"),
  ERR_QUESTION_FINISHED: defaultMessage("ERR_QUESTION_FINISHED"),
  ERR_ATTEMPT_OUT_OF_SYNC: defaultMessage("ERR_ATTEMPT_OUT_OF_SYNC"),
  ERR_ANSWER_TOO_SHORT: defaultMessage("ERR_ANSWER_TOO_SHORT"),
  ERR_ANSWER_TOO_LONG: defaultMessage("ERR_ANSWER_TOO_LONG"),
  ERR_ANSWER_DUPLICATE: defaultMessage("ERR_ANSWER_DUPLICATE"),
  ERR_ANSWER_INAPPROPRIATE: defaultMessage("ERR_ANSWER_INAPPROPRIATE"),
  ERR_REPORT_NOT_ALLOWED: defaultMessage("ERR_REPORT_NOT_ALLOWED"),
  ERR_SELECTION_INVALID: defaultMessage("ERR_SELECTION_INVALID"),
  ERR_EXPLAIN_LIMIT: defaultMessage("ERR_EXPLAIN_LIMIT"),
  ERR_AI_UNAVAILABLE: defaultMessage("ERR_AI_UNAVAILABLE"),
  ERR_AI_REJECTED: defaultMessage("ERR_AI_REJECTED"),
  ERR_TOKEN_QUOTA_EXCEEDED: defaultMessage("ERR_TOKEN_QUOTA_EXCEEDED"),
  ERR_UNAUTHENTICATED: defaultMessage("ERR_UNAUTHENTICATED"),
  ERR_SESSION_NOT_FOUND: defaultMessage("ERR_SESSION_NOT_FOUND"),
  ERR_SESSION_ENGINE_OUTDATED: defaultMessage("ERR_SESSION_ENGINE_OUTDATED"),
  ERR_PERSISTENCE_UNAVAILABLE: defaultMessage("ERR_PERSISTENCE_UNAVAILABLE"),
  ERR_DEMO_MODE_DISABLED: defaultMessage("ERR_DEMO_MODE_DISABLED"),
};

export function isRetryable(code: ServerErrorCode): boolean {
  return RETRYABLE_ERROR_CODES.has(code);
}

export function getHttpStatus(code: ServerErrorCode): number {
  return ERROR_HTTP_STATUS[code];
}

export function createApiError(
  code: ServerErrorCode,
  message?: string,
  details?: Record<string, string | number | boolean>
): ApiError {
  return {
    error: {
      code,
      message: message ?? defaultMessage(code, details),
      retryable: isRetryable(code),
      ...(details ? { details } : {}),
    },
  };
}

export class ApiHttpError extends Error {
  public readonly code: ServerErrorCode;
  public readonly status: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, string | number | boolean>;

  constructor(
    code: ServerErrorCode,
    message?: string,
    details?: Record<string, string | number | boolean>
  ) {
    const msg = message ?? defaultMessage(code, details);
    super(msg);
    this.name = "ApiHttpError";
    this.code = code;
    this.status = getHttpStatus(code);
    this.retryable = isRetryable(code);
    this.details = details;
  }

  toApiError(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }

  toResponse(): Response {
    return new Response(JSON.stringify(this.toApiError()), {
      status: this.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

export function createErrorResponse(
  code: ServerErrorCode,
  message?: string,
  details?: Record<string, string | number | boolean>
): Response {
  const err = new ApiHttpError(code, message, details);
  return err.toResponse();
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiHttpError) {
    return error.toResponse();
  }

  const err_name = error instanceof Error ? error.name : typeof error;
  logger.error({ err_name });

  const fallback = new ApiHttpError("ERR_PERSISTENCE_UNAVAILABLE");
  return fallback.toResponse();
}
