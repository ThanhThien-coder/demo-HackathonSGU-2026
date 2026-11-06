// Văn bản mẫu viết tay cho repo shop-api (bản phân tích, câu hỏi, đáp án). KHÔNG ghi lại từ Gemini.
// Dùng chung cho tests/make-demo-bundle.test.ts (gói demo Offline) và test tích hợp (Gemini giả).
import type { SWESkill } from "@/contracts";

export type QA = { q: string; ref: string; points: string[]; fix: string; good: string; bad: string; hint1: string; hint2: string; goodQuotes: string[] };

export const BANK: Record<string, Partial<Record<SWESkill, QA>>> = {
  "List Products": {
    DB_OPTIMIZATION: {
      q: "Cửa hàng có 200 sản phẩm. Mỗi lần mở trang danh sách, chuyện gì xảy ra với số lần hỏi cơ sở dữ liệu và vì sao?",
      ref: "Hàm `listProducts` lấy tất cả sản phẩm bằng `productRepo.findAll` rồi trong vòng lặp gọi `categoryRepo.findById` cho từng sản phẩm, nên 200 sản phẩm tạo ra 1 truy vấn lấy danh sách cộng 200 truy vấn lấy danh mục.",
      points: ["Mỗi sản phẩm gọi cơ sở dữ liệu thêm một lần", "Số truy vấn tăng theo số sản phẩm"],
      fix: "Lấy danh mục của mọi sản phẩm bằng một truy vấn gộp (join hoặc truy vấn theo danh sách id) thay vì gọi trong vòng lặp.",
      good: "Vì code hỏi cơ sở dữ liệu thêm một lần cho mỗi sản phẩm, nên càng nhiều sản phẩm càng nhiều lần hỏi.",
      bad: "Vì có 200 sản phẩm nên dữ liệu nhiều.", hint1: "Hãy đọc lại hàm xử lý danh sách: có chỗ nào truy vấn được gọi bên trong vòng lặp không?",
      hint2: "Hãy xem kỹ vòng lặp trong hàm `ProductService.listProducts`: mỗi vòng gọi gì?",
      goodQuotes: ["hỏi cơ sở dữ liệu thêm một lần cho mỗi sản phẩm", "càng nhiều sản phẩm càng nhiều lần hỏi"],
    },
    LAYERED_SEPARATION: {
      q: "Nếu sau này đổi nơi lưu sản phẩm từ cơ sở dữ liệu sang một dịch vụ khác, một dữ liệu sản phẩm đi qua những tầng nào và tầng nào phải sửa?",
      ref: "Dữ liệu đi từ route `/products` vào `ProductService.listProducts`, rồi xuống `ProductRepo.findAll` và `CategoryRepo.findById`. Chỉ các repo đọc dữ liệu phải sửa; route và service giữ nguyên.",
      points: ["Dữ liệu đi từ route qua service xuống repo", "Chỉ tầng repo phải sửa khi đổi nơi lưu"],
      fix: "Không có lỗi cần sửa ở góc này.",
      good: "Dữ liệu đi từ route qua service xuống repo, nên khi đổi nơi lưu chỉ tầng repo phải sửa.",
      bad: "Em nghĩ phải sửa hết mọi file trong dự án.", hint1: "Hãy nghĩ xem mỗi tầng có nhiệm vụ riêng nào và tầng nào chạm vào nơi lưu dữ liệu?",
      hint2: "Hãy xem bước truy cập dữ liệu: tầng nào gọi trực tiếp nơi lưu?",
      goodQuotes: ["Dữ liệu đi từ route qua service xuống repo", "chỉ tầng repo phải sửa"],
    },
  },
  "User Profile": {
    AUTH_SECURITY: {
      q: "Khóa dùng để ký và kiểm token nằm ở đâu trong code, và điều đó gây rủi ro gì khi mã nguồn bị lộ?",
      ref: "Hằng `JWT_SECRET` được viết thẳng trong file middleware và dùng trong `jwt.verify`. Ai đọc được mã nguồn sẽ có khóa, từ đó tự ký token giả để vượt qua bước xác thực.",
      points: ["Khóa nằm thẳng trong mã nguồn", "Lộ mã nguồn thì kẻ xấu tự ký token giả"],
      fix: "Đọc khóa từ biến môi trường hoặc kho bí mật, không viết trong code.",
      good: "Khóa nằm thẳng trong mã nguồn, nên nếu lộ mã nguồn thì kẻ xấu tự ký token giả được.",
      bad: "Token dùng để đăng nhập nên rất quan trọng.", hint1: "Hãy nghĩ xem giá trị bí mật được lấy từ đâu và ai đọc được nó?",
      hint2: "Hãy xem hàm `authMiddleware`: giá trị truyền vào `jwt.verify` đến từ đâu?",
      goodQuotes: ["Khóa nằm thẳng trong mã nguồn", "tự ký token giả"],
    },
    HTTP_ROUTING: {
      q: "Một yêu cầu gửi đến đường dẫn hồ sơ phải đi qua bước nào trước khi tới hàm xử lý chính, và vì sao thứ tự đó quan trọng?",
      ref: "Route `/users/profile` khai báo `authMiddleware` trước hàm xử lý, nên token được kiểm trước khi `userService.getProfile` chạy; đổi thứ tự thì hàm chính chạy khi chưa xác thực.",
      points: ["Middleware xác thực chạy trước hàm xử lý chính", "Đổi thứ tự thì hàm chính chạy khi chưa xác thực"],
      fix: "Không có lỗi cần sửa ở góc này.",
      good: "Middleware xác thực chạy trước hàm xử lý chính, nếu đổi thứ tự thì hàm chính chạy khi chưa xác thực.",
      bad: "Em không biết.", hint1: "Hãy nghĩ xem các hàm được liệt kê trong khai báo route chạy theo thứ tự nào?",
      hint2: "Hãy xem bước đầu: tham số nào đứng trước hàm xử lý?",
      goodQuotes: ["Middleware xác thực chạy trước hàm xử lý chính", "hàm chính chạy khi chưa xác thực"],
    },
  },
  "Order Checkout": {
    TRANSACTION_INTEGRITY: {
      q: "Nếu việc lưu đơn hàng thất bại ngay sau khi đã trừ tồn kho của 3 sản phẩm, dữ liệu sẽ ở trạng thái nào và vì sao?",
      ref: "Trong `OrderService.checkout`, mỗi sản phẩm được trừ kho và lưu bằng `productRepo.save` riêng, rồi mới lưu đơn bằng `orderRepo.save`. Không có giao dịch bao các lệnh ghi này, nên lỗi ở bước cuối để lại kho đã bị trừ mà không có đơn.",
      points: ["Các lệnh ghi chạy riêng, không nằm trong một giao dịch", "Lỗi ở bước cuối để lại tồn kho đã bị trừ mà không có đơn"],
      fix: "Bao toàn bộ các lệnh ghi trong một giao dịch để cùng thành công hoặc cùng hoàn tác.",
      good: "Các lệnh ghi chạy riêng, không nằm trong một giao dịch, nên lỗi ở bước cuối để lại tồn kho đã bị trừ mà không có đơn.",
      bad: "Có thể hệ thống sẽ báo lỗi cho người dùng.", hint1: "Hãy nghĩ xem các lệnh ghi có được bảo vệ chung bởi cơ chế nào để cùng thành công hoặc cùng thất bại không?",
      hint2: "Hãy xem hàm `OrderService.checkout`: các lệnh `save` có nằm chung một giao dịch không?",
      goodQuotes: ["Các lệnh ghi chạy riêng, không nằm trong một giao dịch", "tồn kho đã bị trừ mà không có đơn"],
    },
    DB_OPTIMIZATION: {
      q: "Đơn hàng có 10 mặt hàng thì phần kiểm tồn kho gọi cơ sở dữ liệu bao nhiêu lần và vì sao?",
      ref: "Trong vòng lặp của `checkout`, mỗi mặt hàng gọi `productRepo.findOne` rồi `productRepo.save`, nên số truy vấn tăng tuyến tính theo số mặt hàng.",
      points: ["Mỗi mặt hàng gọi cơ sở dữ liệu trong vòng lặp", "Số truy vấn tăng theo số mặt hàng"],
      fix: "Đọc tất cả sản phẩm cần thiết bằng một truy vấn theo danh sách id rồi cập nhật hàng loạt.",
      good: "Mỗi mặt hàng gọi cơ sở dữ liệu trong vòng lặp, nên số truy vấn tăng theo số mặt hàng.",
      bad: "Gọi một lần thôi.", hint1: "Hãy nghĩ xem lệnh đọc sản phẩm nằm trong hay ngoài vòng lặp?",
      hint2: "Hãy xem vòng lặp trong `OrderService.checkout`: mỗi vòng gọi những gì?",
      goodQuotes: ["Mỗi mặt hàng gọi cơ sở dữ liệu trong vòng lặp", "số truy vấn tăng theo số mặt hàng"],
    },
    HTTP_ROUTING: {
      q: "Đường dẫn thanh toán dùng phương thức HTTP nào và vì sao phải đi qua bước xác thực?",
      ref: "Route `/orders/checkout` dùng POST vì tạo đơn mới, và khai báo `authMiddleware` để chỉ người đã đăng nhập mới đặt hàng được.",
      points: ["Dùng POST vì thao tác tạo đơn mới", "Có middleware xác thực để chỉ người đăng nhập đặt hàng"],
      fix: "Không có lỗi cần sửa ở góc này.",
      good: "Dùng POST vì thao tác tạo đơn mới, và có middleware xác thực để chỉ người đăng nhập đặt hàng.",
      bad: "Dùng GET cho nhanh.", hint1: "Hãy nghĩ xem thao tác này thay đổi dữ liệu hay chỉ đọc?", hint2: "Hãy xem khai báo route ở bước đầu.",
      goodQuotes: ["Dùng POST vì thao tác tạo đơn mới", "middleware xác thực để chỉ người đăng nhập đặt hàng"],
    },
  },
};

export const ANALYSES: Record<string, { skills: Array<[SWESkill, number, string, string]>; weak: Array<[SWESkill, number, string, string, string]>; summary: string; steps: string[]; strengths: Array<[number, string]> }> = {
  "List Products": {
    skills: [["DB_OPTIMIZATION", 2, "categoryRepo.findById", "Gọi truy vấn lấy danh mục cho từng sản phẩm trong vòng lặp."], ["LAYERED_SEPARATION", 2, "productRepo", "Service gọi repo thay vì truy cập dữ liệu trực tiếp."]],
    weak: [["DB_OPTIMIZATION", 2, "findById", "Truy vấn lấy danh mục nằm trong vòng lặp qua từng sản phẩm.", "Số truy vấn tăng theo số sản phẩm nên trang chậm dần."]],
    summary: "Route gọi service, service gọi các repo để đọc dữ liệu.",
    steps: ["Route nhận yêu cầu và gọi `productService.listProducts`.", "Service lấy danh sách sản phẩm rồi gắn danh mục cho từng sản phẩm.", "Repo sản phẩm đọc danh sách từ nơi lưu.", "Repo danh mục đọc một danh mục theo id."],
    strengths: [[2, "Service tách việc đọc dữ liệu sang các repo riêng."]],
  },
  "User Profile": {
    skills: [["AUTH_SECURITY", 2, "JWT_SECRET", "Dùng khóa để kiểm token trước khi cho vào."], ["HTTP_ROUTING", 1, "authMiddleware", "Khai báo route GET kèm middleware xác thực."]],
    weak: [["AUTH_SECURITY", 2, "JWT_SECRET", "Khóa ký token viết thẳng trong code.", "Lộ mã nguồn là lộ khóa nên token giả có thể được tạo."]],
    summary: "Route gọi middleware xác thực rồi service đọc hồ sơ.",
    steps: ["Route khai báo `authMiddleware` trước hàm xử lý hồ sơ.", "Middleware đọc token, kiểm bằng `jwt.verify` và gắn người dùng vào yêu cầu.", "Service đọc hồ sơ từ repo người dùng."],
    strengths: [[2, "Xác thực tách thành middleware dùng lại được cho nhiều route."]],
  },
  "Order Checkout": {
    skills: [["TRANSACTION_INTEGRITY", 3, "orderRepo", "Nhiều lệnh ghi liên tiếp để tạo đơn."], ["DB_OPTIMIZATION", 3, "productRepo", "Truy vấn sản phẩm trong vòng lặp."], ["HTTP_ROUTING", 1, "post", "Khai báo route POST kèm xác thực."]],
    weak: [
      ["TRANSACTION_INTEGRITY", 3, "save", "Trừ kho và tạo đơn là các lệnh ghi riêng, không nằm trong một giao dịch.", "Lỗi giữa chừng có thể làm dữ liệu kho và đơn không khớp."],
      ["DB_OPTIMIZATION", 3, "findOne", "Truy vấn đọc sản phẩm nằm trong vòng lặp qua từng mặt hàng.", "Số truy vấn tăng theo số mặt hàng."],
    ],
    summary: "Route xác thực rồi service thực hiện thanh toán qua các repo.",
    steps: ["Route POST khai báo `authMiddleware` rồi gọi `orderService.checkout`.", "Middleware kiểm token và gắn người dùng vào yêu cầu.", "Service kiểm tồn kho, trừ kho từng sản phẩm rồi tạo đơn."],
    strengths: [],
  },
};
