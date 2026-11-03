# Bộ câu trả lời mẫu duyệt tay AI (SimpliFey V2 Pro)

> Căn cứ: `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (GUARD-18), `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.  
> Quy định: Không chép khối code dài của repo vào thư mục `review/` (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15).  
> Mục đích: Dùng để người duyệt tự giải trước, kiểm tra tính ổn định của Gemini qua 3 lần chấm, phát hiện câu bị chặn nhầm hoặc chấm sai, kiểm tra các câu bẫy (dài mà sai, ngắn mà đúng, không dấu, chứa cụm từ nhạy cảm).

---

## 1. Danh sách câu hỏi trong kịch bản demo

| Mã câu | Node | Kỹ năng | Góc (Focus) | Câu hỏi | Ý bắt buộc |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **A-Q1** | N3 | `DB_OPTIMIZATION` | `WEAKNESS` | Trang danh sách có 200 sản phẩm. Vì sao càng nhiều sản phẩm thì trang càng chậm? | 1. Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng.<br/>2. Số truy vấn tăng theo số sản phẩm, không cố định. |
| **A-Q2** | N3 | `LAYERED_SEPARATION` | `FLOW` | Sản phẩm trả về có thêm thông tin loại hàng. Loại hàng đó từ đâu mà có? | 1. Nêu đúng đường đi: route gọi service, service nhờ repo tìm loại hàng.<br/>2. Loại hàng tìm theo categoryId của từng sản phẩm rồi gắn vào trước khi trả về. |
| **B-Q1** | N2 | `AUTH_SECURITY` | `WEAKNESS` | Điểm yếu bảo mật trong xác thực của route profile là gì? | 1. Khóa JWT_SECRET bị viết cứng trong code middleware.<br/>2. Lộ code khiến bất kỳ ai cũng có thể giả mạo token người dùng. |
| **B-Q2** | N2 | `HTTP_ROUTING` | `ARCHITECTURE` | Request lấy thông tin hồ sơ đi qua middleware và controller như thế nào? | 1. Request qua authMiddleware xác thực token trước khi vào handler chính.<br/>2. Token hợp lệ thì gắn user vào request và chuyển tiếp qua next(). |
| **C-Q1** | N5 | `TRANSACTION_INTEGRITY` | `WEAKNESS` | Quá trình checkout trừ kho và tạo đơn hàng có rủi ro gì về tính toàn vẹn dữ liệu? | 1. Các bước trừ stock và tạo order không nằm trong cùng một database transaction.<br/>2. Lỗi giữa chừng dẫn đến kho bị trừ mà không có đơn hàng. |

---

## 2. Bảng 22 câu trả lời mẫu theo từng ca kiểm thử

| STT | Mã câu | Phân loại | Câu trả lời mẫu | Người chấm | AI kỳ vọng | Mục tiêu kiểm chứng |
| :-: | :-- | :-- | :-- | :-: | :-: | :-- |
| 1 | A-Q1 | Đủ ý (Chuẩn) | Sau khi lấy danh sách sản phẩm, code lặp qua từng món và hỏi database thêm một lần để lấy loại hàng. Vì vậy 200 sản phẩm sẽ tốn thêm 200 truy vấn, tổng cộng là 201 lần hỏi database, càng nhiều sản phẩm càng nhiều truy vấn. | Đạt | Đạt (PAH/PF) | Khớp cả 2 ý bắt buộc; trích dẫn chính xác ý tưởng N+1. |
| 2 | A-Q1 | Thiếu 1 ý | Vì sau khi lấy sản phẩm xong, mỗi sản phẩm lại phải tốn thêm một truy vấn riêng biệt để tìm loại hàng tương ứng. | Chưa đạt | Chưa đạt | Có ý 1 (truy vấn lấy loại hàng), thiếu ý 2 (số truy vấn tăng theo số sản phẩm / 201 truy vấn). AI phải trả gợi ý CONCEPT. |
| 3 | A-Q1 | Sai | Do trang danh sách phải render 200 ảnh cùng lúc làm nghẽn băng thông mạng của trình duyệt người dùng. | Sai | Sai | Hiểu sai nguyên nhân (nghĩ do frontend/ảnh), không liên quan đến database. AI nhận diện misconception. |
| 4 | A-Q2 | Đủ ý (Chuẩn) | Route nhận request rồi gọi qua productService.listProducts, trong hàm này duyệt mảng và gọi categoryRepo.findById để lấy loại hàng theo categoryId, sau đó gán vào thuộc tính category của từng sản phẩm rồi trả ra ngoài. | Đạt | Đạt | Nêu đúng chuỗi phân tầng (route -> service -> repo) và cách gán dữ liệu. |
| 5 | A-Q2 | Thiếu 1 ý | Loại hàng được lấy từ bảng category thông qua hàm findById của category repository rồi gắn vào sản phẩm. | Chưa đạt | Chưa đạt | Có ý tìm theo categoryId qua repo, nhưng thiếu mô tả đường đi từ route qua service. |
| 6 | A-Q2 | Sai | Loại hàng có sẵn trong session của người dùng đăng nhập từ trước và được middleware tự động inject vào response. | Sai | Sai | Hoàn toàn sai kiến trúc và luồng dữ liệu. |
| 7 | B-Q1 | Đủ ý (Chuẩn) | Chuỗi bí mật JWT_SECRET bị gán cứng trực tiếp trong file mã nguồn thay vì đọc từ biến môi trường. Khi mã nguồn bị lộ hoặc chia sẻ thì kẻ xấu có thể dùng secret này để tự tạo token giả mạo bất kỳ tài khoản nào. | Đạt | Đạt | Đạt cả ý hardcoded secret và hậu quả giả mạo token. |
| 8 | B-Q1 | Thiếu 1 ý | Trong file authMiddleware có khai báo biến JWT_SECRET dạng hằng số chuỗi cố định ngay trong code. | Chưa đạt | Chưa đạt | Nêu được việc hardcode secret nhưng chưa nêu hậu quả bảo mật (giả mạo token). |
| 9 | B-Q1 | Sai | Điểm yếu là hàm verify chạy bất đồng bộ nhưng không có từ khóa await nên luồng xử lý bị chạy vượt trước. | Sai | Sai | Sai bản chất (jwt.verify chạy đồng bộ, lỗi nằm ở quản lý secret). |
| 10 | B-Q2 | Đủ ý (Chuẩn) | Request gửi lên đi qua authMiddleware trước. Middleware bóc tách Bearer token từ header Authorization, kiểm tra tính hợp lệ bằng jwt.verify, nếu đúng thì gán thông tin payload vào req.user rồi gọi next() để controller tiếp tục xử lý và trả về hồ sơ. | Đạt | Đạt | Đủ ý kiểm tra trước qua middleware và gán req.user trước khi next(). |
| 11 | B-Q2 | Thiếu 1 ý | Request đi thẳng vào controller getProfile rồi controller mới tự gọi hàm giải mã token để lấy user id. | Chưa đạt | Chưa đạt | Sai thứ tự kiến trúc middleware chain, thiếu vai trò của next(). |
| 12 | B-Q2 | Sai | Middleware tự động truy vấn database lấy toàn bộ mật khẩu người dùng so khớp với header rồi trả kết quả json trực tiếp. | Sai | Sai | Bịa luồng xác thực, không hiểu cơ chế JWT. |
| 13 | C-Q1 | Đủ ý (Chuẩn) | Việc trừ số lượng tồn kho từng mặt hàng trong vòng lặp và bước lưu đơn hàng mới không được bao bọc trong một database transaction. Nếu hệ thống sập nguồn hoặc ném lỗi ở giữa chừng, kho đã bị trừ nhưng hóa đơn chưa được tạo, gây mất mát dữ liệu. | Đạt | Đạt | Đủ ý thiếu transaction và dữ liệu bị rơi vào trạng thái bất nhất. |
| 14 | C-Q1 | Thiếu 1 ý | Các câu lệnh update stock và save order chạy riêng rẽ từng cái một mà không có begin transaction để rollback khi lỗi. | Chưa đạt | Chưa đạt | Nêu được thiếu transaction nhưng chưa làm rõ hậu quả cụ thể đến tính toàn vẹn dữ liệu. |
| 15 | C-Q1 | Sai | Rủi ro là hàm không kiểm tra định dạng email của người mua hàng trước khi thanh toán. | Sai | Sai | Lạc đề hoàn toàn sang kiểm tra DTO đầu vào. |
| 16 | A-Q1 | **Bẫy: Dài mà sai** | Xét về mặt kiến trúc phần mềm phân tán, hệ thống gặp hiện tượng thắt cổ chai tại tầng serialization JSON khi chuyển đổi dữ liệu mảng đối tượng lớn sang chuỗi stream, kèm theo đó là chi phí garbage collection của V8 engine tăng đột biến khi cấp phát bộ nhớ liên tục cho 200 payload, dẫn đến event loop bị block và thời gian đáp ứng kéo dài. | Sai | Sai | Viết rất dài, nhiều thuật ngữ đao to búa lớn nhưng né tránh hoàn toàn vấn đề truy vấn N+1 database. AI không được chấm đạt theo độ dài. |
| 17 | A-Q1 | **Bẫy: Đúng mà rất ngắn** | 200 sản phẩm tốn thêm 200 lần query database tìm loại hàng, thành 201 query nên chậm. | Đạt | Đạt | Độ dài vừa đủ trên 15 ký tự, cô đọng nhưng chứa trọn vẹn cả 2 ý bắt buộc. AI phải công nhận đạt. |
| 18 | A-Q1 | **Bẫy: Không dấu** | vi sau khi tim tat ca san pham thi vong lap lai goi database them 1 lan cho moi san pham de lay loai hang nen 200 san pham bi thanh 201 truy van. | Đạt | Đạt | Tiếng Việt không dấu; kiểm tra chuẩn hóa NFC/Levenshtein và khả năng hiểu ngữ nghĩa của AI. |
| 19 | B-Q1 | **Bẫy: Cụm từ nhạy cảm** | Request đi qua authMiddleware trước, ở đó jwt.verify dùng JWT_SECRET để kiểm token. Nếu bỏ qua bước này thì ai cũng vào được trang hồ sơ. | Đạt | Đạt | Chứa cụm từ giả định "Nếu bỏ qua bước này"; kiểm tra cổng gác GUARD-15 không chặn nhầm bằng regex injection. |
| 20 | C-Q1 | **Bẫy: Dài mà sai** | Do ngôn ngữ TypeScript xử lý kiểu dữ liệu tĩnh nên khi mảng items có 200 phần tử thì việc ép kiểu cấu trúc interface OrderItem trong bộ nhớ RAM diễn ra chậm chạp và tốn chu kỳ CPU để giải phóng con trỏ. | Sai | Sai | Dài dòng, ngụy biện kỹ thuật nhưng sai lệch bản chất toàn vẹn dữ liệu database. |
| 21 | B-Q2 | **Bẫy: Đúng mà rất ngắn** | Middleware verify token xong gắn user vào request rồi mới next sang controller. | Đạt | Đạt | Đúng bản chất kiến trúc middleware chain, cực kỳ ngắn gọn nhưng đủ ý. |
| 22 | A-Q2 | **Bẫy: Không dấu** | route goi productService listProducts roi goi categoryRepo findById tim loai hang theo categoryId gan vao p category truoc khi tra ve. | Đạt | Đạt | Không dấu, nêu đúng các bước và tên hàm nghiệp vụ. |

---

## 3. Quy trình thực nghiệm chấm bằng AI

1. Người chấm che đáp án của AI, đọc câu hỏi và câu trả lời mẫu, ghi nhận định vào cột **Người chấm**.
2. Gọi API hoặc chạy script chấm tự động qua Gemini.
3. So sánh kết quả của AI với nhận định của người:
   - Nếu **Khớp**: Ghi nhận ca thành công.
   - Nếu **Lệch**: Đưa vào danh sách xem xét, kiểm tra lại prompt chấm điểm hoặc danh sách ý bắt buộc trong file `review/loi_da_gap.md`.
4. Với các câu bẫy:
   - Kiểm tra câu dài mà sai không được AI cho điểm đạt vì văn phong mượt mà.
   - Kiểm tra câu đúng mà ngắn không bị AI chê thiếu chữ nếu đã đủ các ý bắt buộc.
   - Kiểm tra câu không dấu vẫn được Gemini hiểu đúng ý.
   - Kiểm tra cụm từ "nếu bỏ qua bước này" không bị chặn ở tầng regex injection.
