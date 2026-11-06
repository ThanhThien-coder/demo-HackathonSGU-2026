import type { SWESkill } from "@/contracts";

/**
 * 16 thẻ khái niệm (UI-43, D13). Tĩnh, 0 token, 0 request.
 * Khóa theo `SWE_SKILLS` — thiếu một kỹ năng là lỗi biên dịch.
 *
 * Nguồn chữ: bảng kỹ năng `docs/spec/22` Mục 2, `docs/doc-de-hieu/04_bkt_va_cau_hoi.md`
 * và 3 thẻ mẫu của `prototype.html` (HTTP_ROUTING, LAYERED_SEPARATION, DB_OPTIMIZATION).
 * Chữ trong `what` / `example` / `why` hiển thị qua `AiText`: chỉ cho phép `code` trong backtick.
 */
export interface ConceptCard {
  /** Tên tiếng Việt, cũng là nhãn trên chip kỹ năng. */
  title: string;
  /** "Là gì" */
  what: string;
  /** "Ví dụ đời thường" */
  example: string;
  /** "Vì sao quan trọng" */
  why: string;
}

export const CONCEPT_CARDS: Record<SWESkill, ConceptCard> = {
  HTTP_ROUTING: {
    title: "Định tuyến HTTP",
    what: "Mỗi địa chỉ (như `GET /products`) được gắn với một hàm xử lý. Server nhìn địa chỉ và phương thức để biết gọi hàm nào.",
    example: "Lễ tân nghe bạn cần gì rồi chỉ đúng phòng.",
    why: "Route rõ ràng giúp biết ngay chức năng nào nằm ở đâu.",
  },
  DTO_VALIDATION: {
    title: "Kiểm tra dữ liệu đầu vào",
    what: "Dữ liệu người dùng gửi lên được kiểm tra và ép về đúng kiểu theo một khuôn mẫu (schema) trước khi vào phần xử lý chính.",
    example: "Bảo vệ ở cổng kiểm tra vé trước khi cho khách vào rạp.",
    why: "Dữ liệu sai chặn ngay từ cửa thì phần bên trong không phải lo.",
  },
  AUTH_SECURITY: {
    title: "Xác thực và phân quyền",
    what: "Xác định ai đang gọi (xác thực) và họ được làm gì (phân quyền), thường qua token hoặc phiên đăng nhập. Khóa bí mật không viết thẳng trong code.",
    example: "Thẻ nhân viên mở được cửa văn phòng nhưng không mở được phòng kho.",
    why: "Thiếu bước này thì ai cũng xem và sửa được dữ liệu của người khác.",
  },
  DEPENDENCY_INJECTION: {
    title: "Tiêm phụ thuộc",
    what: "Thứ mà một lớp cần dùng được truyền từ bên ngoài vào (qua constructor hoặc container) thay vì tự `new` bên trong.",
    example: "Đầu bếp được giao bếp và dao sẵn, không phải tự đi mua.",
    why: "Dễ thay thế khi kiểm thử và ít bị buộc chặt vào một cách làm.",
  },
  LAYERED_SEPARATION: {
    title: "Chia tầng",
    what: "Code chia thành tầng nhận yêu cầu, tầng xử lý nghiệp vụ, tầng đọc ghi dữ liệu; mỗi tầng một việc. Yêu cầu đi lần lượt qua từng tầng.",
    example: "Nhà hàng có người phục vụ, đầu bếp, thủ kho.",
    why: "Sửa một tầng ít ảnh hưởng tầng khác.",
  },
  DB_OPTIMIZATION: {
    title: "Tối ưu truy vấn database",
    what: "Mỗi lần hỏi database là một chuyến đi qua mạng, tốn thời gian. Code tốt hỏi ít lần và lấy đúng dữ liệu cần.",
    example:
      "Đi chợ 20 món mà mua món nào chạy về nhà món đó, thay vì ghi danh sách đi một lần.",
    why: "Dữ liệu càng nhiều thì trang càng chậm.",
  },
  ASYNC_CONCURRENCY: {
    title: "Bất đồng bộ và đồng thời",
    what: "Việc chạy lâu (gọi database, gọi mạng) được chờ bằng `await` thay vì đứng im. Việc độc lập có thể chạy song song, và cần chú ý khi nhiều việc cùng sửa một dữ liệu.",
    example: "Bật nồi cơm rồi đi rửa rau, thay vì đứng nhìn nồi cơm.",
    why: "Quên chờ thì mất kết quả hoặc lỗi không ai bắt; chờ từng việc một thì trang chậm.",
  },
  TRANSACTION_INTEGRITY: {
    title: "Toàn vẹn giao dịch",
    what: "Nhiều thao tác ghi cùng thuộc một việc thì phải cùng thành công hoặc cùng bị hoàn tác (transaction).",
    example: "Chuyển tiền: trừ tài khoản này mà chưa cộng tài khoản kia thì phải trả lại.",
    why: "Lỗi xảy ra giữa chừng sẽ để dữ liệu dở dang, ví dụ trừ kho mà không có đơn.",
  },
  ERROR_HANDLING: {
    title: "Xử lý lỗi",
    what: "Bắt đúng lỗi, đổi thành mã lỗi và thông báo phù hợp trả ra ngoài, không nuốt lỗi bằng `catch` rỗng.",
    example: "Tổng đài báo rõ \"số máy bận\" thay vì im lặng cúp máy.",
    why: "Lỗi bị nuốt khiến người dùng và người sửa lỗi đều không biết chuyện gì đã xảy ra.",
  },
  STATE_MANAGEMENT: {
    title: "Quản lý trạng thái",
    what: "Trạng thái của ứng dụng (ví dụ giỏ hàng đang chọn hay đã thanh toán) được lưu ở đâu, ai được đổi, và chuyển từ trạng thái nào sang trạng thái nào là hợp lệ.",
    example: "Đơn hàng đi từ \"đang soạn\" đến \"đã giao\", không nhảy lùi tùy ý.",
    why: "Trạng thái đổi lung tung thì khó đoán kết quả và dễ sinh lỗi.",
  },
  ALGORITHMIC_COMPLEXITY: {
    title: "Độ phức tạp thuật toán",
    what: "Đo thời gian và bộ nhớ của cách làm khi dữ liệu tăng (Big-O), chọn cấu trúc dữ liệu hợp lý và nghĩ tới trường hợp biên như danh sách rỗng.",
    example: "Tìm tên trong danh bạ có xếp ABC nhanh hơn lật từng trang.",
    why: "Dữ liệu nhỏ chạy tốt chưa chắc dữ liệu lớn còn chạy nổi.",
  },
  MEMORY_MANAGEMENT: {
    title: "Quản lý bộ nhớ và tài nguyên",
    what: "Dữ liệu lớn nên xử lý theo luồng (stream) thay vì nạp hết vào bộ nhớ; kết nối và hàm lắng nghe phải được đóng khi không dùng nữa.",
    example: "Tưới cây bằng vòi chảy từ từ, không bê cả hồ nước lên.",
    why: "Quên giải phóng thì bộ nhớ đầy dần và server chậm hoặc sập.",
  },
  API_CONTRACT_DESIGN: {
    title: "Thiết kế hợp đồng API",
    what: "Hình dạng của yêu cầu và phản hồi, cùng mã HTTP đúng ý nghĩa (200 đọc được, 201 tạo xong, 400 gửi sai, 404 không thấy), nhất quán giữa các API.",
    example: "Phiếu giao hàng luôn có cùng các mục, người nhận không phải đoán.",
    why: "Bên gọi API dựa vào hình dạng này; đổi tùy tiện sẽ làm hỏng bên gọi.",
  },
  CACHING_STRATEGY: {
    title: "Lưu tạm (cache)",
    what: "Kết quả hay dùng được lưu tạm để lần sau khỏi tính lại. Cần quyết định lưu bao lâu (TTL) và xóa khi dữ liệu gốc đã đổi.",
    example: "Ghi sẵn giá menu lên bảng thay vì mở sổ giá mỗi lần khách hỏi.",
    why: "Giảm tải cho database, nhưng lưu quá lâu sẽ cho người dùng xem dữ liệu cũ.",
  },
  RATE_LIMIT_RESILIENCE: {
    title: "Chịu tải và chịu lỗi",
    what: "Giới hạn số yêu cầu mỗi người được gửi, đặt thời gian chờ tối đa (timeout), tự thử lại có giãn cách khi dịch vụ ngoài lỗi.",
    example: "Quán chỉ nhận mỗi bàn gọi món tối đa vài lần mỗi phút để bếp không quá tải.",
    why: "Một dịch vụ ngoài chậm hoặc một người gửi dồn dập không được làm sập cả hệ thống.",
  },
  DATA_SERIALIZATION: {
    title: "Chuyển đổi dữ liệu",
    what: "Đổi đối tượng trong code thành JSON để gửi đi và ngược lại, chọn đúng trường cần gửi và không để lộ trường nhạy cảm như mật khẩu đã băm.",
    example: "Điền phiếu gửi hàng: chỉ ghi thông tin người nhận cần biết.",
    why: "Gửi thừa trường có thể làm lộ dữ liệu; sai kiểu ngày hoặc số làm bên nhận hiểu sai.",
  },
};

/** Thẻ của một mã kỹ năng; mã lạ ⇒ null. */
export function conceptCardOf(skill: string): ConceptCard | null {
  return Object.prototype.hasOwnProperty.call(CONCEPT_CARDS, skill)
    ? CONCEPT_CARDS[skill as SWESkill]
    : null;
}

/** Nhãn tiếng Việt cho chip kỹ năng; mã lạ ⇒ giữ nguyên mã. */
export function skillLabel(skill: string): string {
  return conceptCardOf(skill)?.title ?? skill;
}
