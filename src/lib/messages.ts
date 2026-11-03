import type { ErrorCode } from "@/contracts/errors";

/**
 * Bảng thông điệp lỗi tiếng Việt thân thiện theo chuẩn spec/30_UI.md Mục 10.
 * Phủ 100% tất cả các mã lỗi trong hệ thống SimpliFey.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Ingestion errors
  ERR_INVALID_GITHUB_URL:
    "Vui lòng nhập đúng đường dẫn repo GitHub (VD: https://github.com/facebook/react).",
  ERR_PREFLIGHT_404_OR_PRIVATE:
    "Không tìm thấy repo này. Kiểm tra chính tả và bảo đảm repo đang Công khai (Public).",
  ERR_NETWORK_TIMEOUT:
    "Kết nối máy chủ đang chậm. Vui lòng kiểm tra lại đường truyền và thử lại sau vài giây.",
  ERR_BRANCH_NOT_FOUND:
    "Không tải được nhánh mặc định của repo. Repo có thể đang trống hoặc vừa đổi nhánh.",
  ERR_EMPTY_REPOSITORY:
    "Repo này đang trống (chưa có commit). Hãy đẩy mã nguồn lên rồi thử lại.",
  ERR_REPO_UNAVAILABLE_451:
    "Repo này đã bị GitHub hạn chế truy cập do lý do pháp lý hoặc bản quyền.",
  ERR_GITHUB_RATE_LIMIT_CDN:
    "GitHub đang tạm hạn chế lưu lượng. Đợi một lát rồi thử lại, hoặc kéo thả file .zip của repo.",
  ERR_STREAM_TIMEOUT:
    "Đường truyền tới GitHub bị chậm. Vui lòng thử lại, hoặc kéo thả file .zip của repo.",
  ERR_STREAM_CORRUPTED:
    "Dữ liệu tải về bị gián đoạn hoặc file .zip bị hỏng. Vui lòng thử lại.",
  ERR_STREAM_QUOTA_EXCEEDED:
    "Kho mã nguồn vượt quá hạn mức nén cho phép (15MB). Hãy nén riêng thư mục mã nguồn chính thành .zip.",
  ERR_UNSUPPORTED_LANGUAGE:
    "Ngôn ngữ của repo này hiện chưa được hỗ trợ phân tích cú pháp chi tiết.",
  ERR_NO_SOURCE_FILES_FOUND:
    "Không tìm thấy file mã nguồn nào đọc được trong repository.",
  ERR_NO_ARCHITECTURAL_SLICE:
    "Đọc được code nhưng không dựng được lát cắt kiến trúc nào. Hãy thử repo hoặc thư mục khác.",
  ERR_UPLOAD_INVALID:
    "File tải lên không phải định dạng .zip hợp lệ.",
  ERR_SERVER_BUSY:
    "Máy chủ đang xử lý nhiều repo cùng lúc. Vui lòng thử lại sau vài giây.",

  // Learning errors
  ERR_NODE_NOT_AVAILABLE:
    "Bài học này chưa được mở khóa hoặc bạn đã hoàn thành bài học trước đó.",
  ERR_ANALYSIS_NOT_READY:
    "Hệ thống AI đang phân tích bài học này. Vui lòng chờ trong giây lát.",
  ERR_OVERVIEW_NOT_READY:
    "Hệ thống đang tiếp tục phân tích các thành phần còn lại để dựng bức tranh toàn cảnh.",
  ERR_QUESTION_FINISHED:
    "Câu hỏi này đã kết thúc trước đó. Dữ liệu đang được đồng bộ lại.",
  ERR_ATTEMPT_OUT_OF_SYNC:
    "Câu hỏi này vừa được nộp ở một phiên khác. Đang đồng bộ lại trạng thái mới nhất.",
  ERR_ANSWER_TOO_SHORT:
    "Câu trả lời quá ngắn — vui lòng viết ít nhất 15 ký tự để phản ánh trọn vẹn ý hiểu của bạn.",
  ERR_ANSWER_TOO_LONG:
    "Câu trả lời dài quá 2000 ký tự. Vui lòng tóm tắt cô đọng hơn.",
  ERR_ANSWER_DUPLICATE:
    "Bạn chưa bổ sung ý mới so với lần nộp trước — hãy thử diễn giải bằng ví dụ hoặc cách nhìn khác.",
  ERR_ANSWER_INAPPROPRIATE:
    "Câu trả lời chứa từ ngữ không phù hợp — vui lòng diễn đạt lại bằng ngôn ngữ chuẩn mực.",
  ERR_REPORT_NOT_ALLOWED:
    "Chỉ có thể báo sai cho câu hỏi có kết quả chưa đạt, tối đa 1 lần mỗi câu.",

  // AI errors
  ERR_AI_UNAVAILABLE:
    "AI chấm bài đang tạm bận — bài làm chưa được tính lượt, vui lòng nhấn Thử lại.",
  ERR_AI_REJECTED:
    "AI chưa thể hoàn thành yêu cầu lúc này. Vui lòng thử lại sau.",
  ERR_TOKEN_QUOTA_EXCEEDED:
    "Phiên học này đã dùng hết hạn mức AI (200.000 tokens). Bạn vẫn có thể đọc bài phân tích và xem đáp án mẫu.",

  // Persistence errors
  ERR_UNAUTHENTICATED:
    "Phiên đăng nhập đã hết hạn hoặc chưa xác thực. Vui lòng đăng nhập lại.",
  ERR_SESSION_NOT_FOUND:
    "Không tìm thấy phiên học tương ứng trong hệ thống.",
  ERR_SESSION_ENGINE_OUTDATED:
    "Phiên học này được tạo bằng phiên bản engine cũ. Vui lòng quét lại để trải nghiệm bản mới nhất.",
  ERR_PERSISTENCE_UNAVAILABLE:
    "Máy chủ lưu tiến độ đang gặp sự cố tạm thời. Dữ liệu của bạn chưa bị trừ lượt, vui lòng thử lại.",
  ERR_DEMO_MODE_DISABLED:
    "Chế độ đổi persona đang tắt trên máy chủ.",

  // Client errors
  ERR_CLIENT_NETWORK:
    "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra lại đường truyền mạng.",
};

/**
 * Lấy câu thông điệp lỗi phù hợp từ mã lỗi hoặc trả về chuỗi dự phòng
 */
export function formatErrorMessage(
  code?: ErrorCode | string,
  rawMessage?: string
): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return rawMessage || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.";
}
