// 02_CONTRACTS Mục 2 — kiểu nền
export const SWE_SKILLS = [
  "HTTP_ROUTING", "DTO_VALIDATION", "AUTH_SECURITY", "DEPENDENCY_INJECTION",
  "LAYERED_SEPARATION", "DB_OPTIMIZATION", "ASYNC_CONCURRENCY", "TRANSACTION_INTEGRITY",
  "ERROR_HANDLING", "STATE_MANAGEMENT", "ALGORITHMIC_COMPLEXITY", "MEMORY_MANAGEMENT",
  "API_CONTRACT_DESIGN", "CACHING_STRATEGY", "RATE_LIMIT_RESILIENCE", "DATA_SERIALIZATION",
] as const;
export type SWESkill = (typeof SWE_SKILLS)[number];

export type LearnerTier = "NOVICE" | "PRACTITIONER" | "ARCHITECT";

// Trạng thái FSM của node trong 1 phiên học (LOCKED chỉ suy ra, không lưu)
export type NodeStatus = "LOCKED" | "AVAILABLE" | "COMPLETED" | "FAILED";

export type ProjectArchetype =
  | "WEB_BACKEND" | "WEB_FRONTEND" | "MOBILE_APP" | "DESKTOP_APP" | "CLI_TOOL" | "ALGORITHM_CORE";

export type LanguageId = string;
export type LanguageSupportTier = "RESOLVED" | "STRUCTURAL" | "UNSUPPORTED";

export type ArchitecturalLayer =
  | "ENTRY_POINT" | "MIDDLEWARE" | "BUSINESS_LOGIC" | "DATA_ACCESS"
  | "ALGO_SETUP" | "ALGO_EXECUTION" | "ALGO_TERMINATION";

export type NodeType = "ARCHITECTURAL_DATA_FLOW" | "ALGORITHMIC_CORE";
export type DegradedMode = "PROCEDURAL";
export type GraphConfidence = "HIGH" | "MIXED" | "LOW";

export const ARCHITECTURE_PATTERNS = [
  "LAYERED", "MVC", "REPOSITORY", "MIDDLEWARE_CHAIN", "DEPENDENCY_INJECTION", "FACTORY",
  "OBSERVER_EVENT", "STRATEGY", "ADAPTER", "SINGLETON", "PIPELINE", "ALGORITHMIC", "PROCEDURAL", "OTHER",
] as const;
export type ArchitecturePattern = (typeof ARCHITECTURE_PATTERNS)[number];

// Nghĩa 16 kỹ năng (22 Mục 2) — dùng cho prompt và tooltip
export const SKILL_MEANING: Record<SWESkill, string> = {
  HTTP_ROUTING: "Ánh xạ URL + HTTP method vào handler/controller; tham số đường dẫn, thứ tự route.",
  DTO_VALIDATION: "Kiểm tra và ép kiểu dữ liệu đầu vào theo schema trước nghiệp vụ.",
  AUTH_SECURITY: "Xác thực (ai gọi) và phân quyền (được làm gì): token, session, guard, bảo mật.",
  DEPENDENCY_INJECTION: "Phụ thuộc truyền từ ngoài vào (constructor, container) thay vì khởi tạo bên trong.",
  LAYERED_SEPARATION: "Mỗi tầng một trách nhiệm (route → service → repository); tầng trên không làm thay tầng dưới.",
  DB_OPTIMIZATION: "Số lượng và hình dạng truy vấn: N+1, lặp truy vấn, chỉ mục, thừa cột/dòng.",
  ASYNC_CONCURRENCY: "Bất đồng bộ và đồng thời: `await`, song song, thứ tự hoàn thành, race condition.",
  TRANSACTION_INTEGRITY: "Nhiều thao tác ghi cùng thành công hoặc hoàn tác; khóa dòng, đọc-ghi tách rời.",
  ERROR_HANDLING: "Bắt, chuyển đổi, lan truyền lỗi; mã lỗi trả ra ngoài; không nuốt lỗi.",
  STATE_MANAGEMENT: "Trạng thái ứng dụng/miền ở đâu, ai được đổi, chuyển trạng thái hợp lệ.",
  ALGORITHMIC_COMPLEXITY: "Độ phức tạp thời gian/bộ nhớ (Big-O), cấu trúc dữ liệu, tình huống biên.",
  MEMORY_MANAGEMENT: "Vòng đời bộ nhớ và tài nguyên: stream, buffer, rò rỉ listener/kết nối, dữ liệu lớn.",
  API_CONTRACT_DESIGN: "Hình dạng request/response, mã HTTP, tính nhất quán và tương thích API.",
  CACHING_STRATEGY: "Lưu tạm kết quả: khi nào đọc/ghi cache, TTL, mất hiệu lực, dữ liệu cũ.",
  RATE_LIMIT_RESILIENCE: "Chịu tải và chịu lỗi bên ngoài: giới hạn tần suất, backoff, timeout, circuit breaker.",
  DATA_SERIALIZATION: "Chuyển đổi đối tượng ⇄ JSON/định dạng truyền: ánh xạ DTO, ẩn trường, kiểu ngày/số.",
};
