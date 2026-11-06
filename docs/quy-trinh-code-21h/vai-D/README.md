# Vai D — Giao diện: website bài học, lộ trình tương tác, hiển thị và offline

Bạn chịu trách nhiệm toàn bộ giao diện SimpliFey: thiết lập token 2 chủ đề sáng / tối, dựng website học tập nhiều trang (Trang chủ, Lộ trình, trang học kiểu IDE 3 cột với Bản đồ ReactFlow, Code Monaco, tab X-Ray / Feynman, Báo cáo và Lịch sử), quản lý trạng thái máy khách bằng Zustand theo nguyên tắc bản sao chỉ đọc dữ liệu máy chủ, tích hợp toàn bộ các API route học tập, xây dựng chế độ Offline tự vận hành và hỗ trợ trình chiếu demo.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../doc-de-hieu/07_ke_hoach_21h.md)

## Vai D làm gì

Người học trải qua hành trình học tập hoàn chỉnh trên giao diện SimpliFey:
1. **Đăng nhập:** Người học đăng nhập bằng tài khoản GitHub qua Supabase Auth.
2. **Dán link repo:** Tại trang chủ, người học dán đường link GitHub (hoặc kéo thả file zip) để quét kiến trúc dự án.
3. **Thấy bản đồ:** Sau khi quét xong, hệ thống vào `/learn`, tự mở cửa sổ Tổng quan; đóng cửa sổ là thấy Bản đồ bài học ở cột trái.
4. **Bấm bài:** Người học bấm một node sẵn sàng trên bản đồ để mở bài.
5. **Đọc code và phân tích:** Người học xem các đoạn lát cắt mã nguồn thật ở cột giữa, đọc tab X-Ray ở cột phải giải thích luồng nghiệp vụ từng bước, điểm hay và điểm dở do AI nhận định (không lộ cách sửa).
6. **Trả lời:** Người học chuyển sang tab Feynman, giải thích cơ chế hoạt động qua các câu hỏi nhằm củng cố kỹ năng còn yếu.
7. **Được chấm, mở khóa:** Hệ thống gửi câu trả lời lên máy chủ, nhận kết quả đánh giá, hiển thị gợi ý hoặc đáp án, cập nhật điểm kỹ năng và mở khóa bài học kế tiếp.
8. **Xem kết quả:** Người học theo dõi báo cáo tiến độ, xem lại lịch sử các câu trả lời và hành trình làm chủ kiến trúc.

## Một phiếu làm thế nào

**Cách nhanh:** nhắn AI `Làm phiếu <mã>`, xem [`lam-phieu.md`](../lam-phieu.md). AI làm tới bước commit, bạn chỉ kiểm và dán lệnh commit. Các bước dưới là cách làm tay.

Mỗi phiếu đọc từ trên xuống, làm đúng thứ tự:
1. Bước 0: tự gõ lệnh cập nhật `main`, cài thư viện, tạo nhánh.
2. Bước 1: copy prompt, dán cho Claude trên máy bạn. Claude kiểm các phiếu cần có trước đã có trên nhánh. **Thiếu thì Claude dừng**, báo thiếu gì và đó là việc của vai nào: bạn nhắn vai đó, không bảo Claude làm thay. Đủ thì Claude tạo task trong `.kb/tasks/`. Đọc task, thấy khớp phiếu thì đi tiếp.
3. Bước 2: copy prompt, dán cho Claude. Claude giao agy viết file, rồi tự kiểm và báo kết quả. Claude không commit.
4. Bước 3: bạn tự kiểm theo danh sách ô. Đủ hết ô mới là xong. Chưa đạt thì dán prompt làm lại (tối đa 1 lần).
5. Bước 4: bạn tự gõ lệnh commit, push, mở PR. Vai A merge.
6. Sang phiếu ở mục Tiếp theo.
AI không bao giờ commit hay push. Commit là của bạn: luật thi yêu cầu mọi thành viên phải có commit.

Máy không có Antigravity (agy) hoặc không có ai-kit: làm cùng phiếu này theo [`khong-co-ai-kit.md`](../khong-co-ai-kit.md).

## Lịch của bạn

| Giờ | Phiếu | Ghi chú |
| :-- | :-- | :-- |
| 12:00–12:30 | Chuẩn bị máy, đọc task | Khung code chưa có trên `main`, kiểm tra công cụ, đọc kịch bản giao diện |
| 12:30–13:00 | [D01](D01-khung.md) | Khung website, token 2 chủ đề, bộ UI dùng chung (commit đầu tiên của D) |
| 13:00–14:30 | [D02](D02-store-api.md) | Store Zustand, client API có kiểu, phiên đăng nhập, bảng lỗi `ERROR_MESSAGES` |
| 14:30–16:00 | [D03](D03-ban-do.md) · **Mốc H+4** | Cột trái Bản đồ bài học từ fixture, thẻ node 4 màu, ReactFlow |
| 16:00–17:30 | [D04](D04-monaco.md) | Cột giữa Code bằng Monaco tự host, model lát cắt, tô sáng và đồng bộ bước |
| 17:30–18:30 | [D05](D05-phan-tich.md) | Cột phải tab X-Ray (kỹ năng, mài mòn, luồng, điểm dở), bảng dưới, cửa sổ Tổng quan |
| 18:30–20:00 | [D06](D06-noi-api.md) · **Lát dọc 1 (20:00)** | Trang chủ, đăng nhập, lộ trình, khung 3 cột `/learn`, nối API ingest và hàng đợi phân tích |
| 20:00–22:00 | [D07](D07-feynman.md) | Tab Feynman: ô trả lời, kiểm trùng, kết quả chấm, gợi ý, đáp án, tổng kết run |
| 22:00–00:30 | [D08](D08-offline.md) · **Lát dọc 2 (00:00)** | Áp response, đổi màu, mở khóa, chế độ Offline (`Ctrl+Shift+D`) |
| 00:30–03:00 | 💤 Ngủ (agy chạy [D09](D09-phu.md)) | Giao agy trước 00:30: trang phụ lịch sử, báo cáo, menu, bố cục kéo tỉ lệ, trình chiếu |
| 03:00–05:00 | [D10](D10-hoan-thien.md) · **Mốc H+16, H+17** | Kiểm việc agy D09, sửa giao diện theo Issue, xóa trang nháp `/dev` |
| 05:00–09:00 | Về đích (xem bên dưới) | Sửa lỗi có nhãn bug hoặc ui, không đổi bố cục, tập demo cùng E |

## Phiếu theo quy trình học mới

Theo D-81 … D-85, do Lê Ngọc Quý làm ở luồng 6, đặc tả ở [`spec/30`](../../spec/30_UI.md). Làm từ trên xuống. Phần bản đồ của D03, phần X-Ray, Tổng quan của D05, phần tổng quan của D06 đã được các phiếu dưới thay; khác nhau thì theo `spec/30`.

| Phiếu | Việc | Lỗi | Giờ |
| :-- | :-- | :-- | :-- |
| [D11](D11-tab-file.md) | Khung code theo tab file | D-16 | Xong trước 19:00 |
| [D12](D12-tour.md) | Tab X-Ray dạng tour | D-19 | Xong trước 19:00 |
| [D13](D13-the-khai-niem.md) | Thẻ khái niệm | D-20 | Xong trước 19:00 |
| [D14](D14-to-dung-dong.md) | Tô đúng dòng | D-17 | Xong trước 19:00 |
| [D15](D15-goi-y-tour.md) | Gợi ý trỏ về tour, ẩn câu DROPPED | D-18, gợi ý `CODE_POINTER` | Xong trước 19:00 |
| [D16](D16-the-vai-tro.md) | Thẻ vai trò | D-22 | Sau 22:00. Dòng "Dữ liệu" bỏ được nếu trễ |
| [D17](D17-ban-do-nhom.md) | Bản đồ chia nhóm | D-21 phần bản đồ | Sau 22:00 |
| [D18](D18-tong-quan.md) | Tổng quan 2 nhịp | D-21 phần Tổng quan | Sau 22:00 |
| [D19](D19-popover-doan-chon.md) | Popover giải thích đoạn chọn | D-23 | Sau 22:00. **Bỏ trước nếu trễ** |

## Việc lặp lại suốt 21 giờ

- **Store chỉ là bản sao chỉ đọc (D-02):** Store Zustand chỉ lưu và thay thế dữ liệu máy chủ trả về; không tự tính BKT, trạng thái node, mở khóa, số lượt nộp hay đáp án. Các hàm thuần `bkt-engine`, `plan`, `derive` chỉ dùng cho hiển thị hoặc vận hành nội bộ ở chế độ Offline.
- **State dùng chung đặt tại store:** Mọi state dùng chung giữa bản đồ bài học, mã nguồn Monaco và phần trả lời Feynman bắt buộc nằm trong `src/store/workbench.ts`, tuyệt đối không tự ý nhân bản bằng `useState` phân tán trong các component trang.
- **Văn bản AI là chữ thuần:** Mọi nội dung do AI sinh ra (nhận định, điểm dở, gợi ý, đáp án, tổng quan) đều hiển thị dưới dạng chữ thuần, không dùng `dangerouslySetInnerHTML`, không parse Markdown tùy tiện; chỉ cho phép định dạng khối mã nội dòng trong ký tự backtick.
- **Màu sắc luôn đi kèm biểu tượng và chữ:** Tuân thủ INV-11, không bao giờ dùng màu đơn độc để thể hiện trạng thái (xanh lá kèm ✓ "Hoàn thành", đỏ kèm ✗ "Chưa đạt", hổ phách kèm ● "Sẵn sàng", xám mờ kèm 🔒 "Chưa mở").
- **Nhãn nguồn AI rõ ràng:** Luôn gắn nhãn xuất xứ minh bạch: "Điểm dở — Nhận định của AI", "Nhận định của AI — có thể chưa chính xác", "Đáp án tham khảo do AI viết". Không khẳng định loại bỏ ảo giác hoàn toàn.
- **Tải trước có giới hạn (D-46):** Hàng đợi phân tích chỉ gọi `analyze-node` cho node đang mở và 1–2 node kế tiếp theo thứ tự tô-pô, tối đa `CONFIG.ANALYZE_CONCURRENCY` lời gọi đồng thời; không tải trước ồ ạt toàn bộ đồ thị.
- **Kỷ luật sửa file của Vai D:** Vai D không ghi vào `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/`. Thiếu API hoặc kiểu dữ liệu thì báo vai sở hữu. `package.json` chỉ sửa ở D01 theo đúng bảng 3 gói chỉ định.
- **Xử lý lỗi API trung thực:** API lỗi thì hiện thông báo lỗi rõ ràng theo bảng `ERROR_MESSAGES`, không thay thế bằng dữ liệu giả.
- **Không tạo backdoor đăng nhập:** Không thêm token, cờ debug hoặc đường tắt bỏ qua đăng nhập. Chế độ Offline `?offline=1` là ngoại lệ duy nhất theo đặc tả.
- **Kỷ luật commit sạch:** Không commit file làm việc nội bộ của agent (`.agents/`, prompt nháp) và hình ảnh không dùng.

### Cách làm khi chưa có API

Khi các endpoint API máy chủ chưa hoàn thành hoặc chưa merge vào `main`:
- Component nhận props từ bên ngoài hoặc đọc từ store đã chuẩn bị sẵn.
- Xem và kiểm thử giao diện bằng trang nháp `src/app/dev/page.tsx`. Trang này nạp dữ liệu mẫu từ các fixture của Vai E: `src/server/engine/__fixtures__/shop-api.json` và thư mục `src/server/ai/__fixtures__/`. Không tạo mock ngầm trong route hoặc store giả phía server.
- Trang nháp `src/app/dev/page.tsx` **được merge** để cả nhóm cùng xem và góp ý giao diện.
- Trang nháp **phải xóa trong D10** trước 05:00.
- Dữ liệu dạng View (ví dụ `NodeAnalysisView`) khi chưa có hàm chuyển đổi của Vai C thì gõ tay trực tiếp trong trang nháp từ fixture, không đặt vào trong `src/components/`.

## Bạn chờ ai, ai chờ bạn

- **Bạn chờ các vai khác:**
  - Chờ Vai A: A01 (khung code lúc 12:30), A02 (contracts lúc 13:00), các API route lát dọc 1 A04–A07 (13:30–20:00), API lát dọc 2 A08 và A10 (20:00–00:00).
  - Chờ Vai E: fixture `shop-api.json` (E01) cho Bản đồ; fixture AI (E02) cho Phân tích AI; hàm `similarity` (E04) cho kiểm tra câu trả lời Feynman.
  - Chờ Vai C: hàm `bkt-engine.ts` (C02) và hàm suy luận trạng thái node `derive.ts` (C03) cho chế độ Offline.
- **Mọi người chờ bạn:**
  - Cả nhóm chờ Bản đồ từ fixture (D03 lúc 16:00) đạt mốc H+4.
  - Cả nhóm chờ bạn nối API màn hình đầu và phân tích (D06 lúc 20:00) để hoàn thành Lát dọc 1.
  - Cả nhóm chờ bạn hoàn thành trả lời, đổi màu, mở khóa và Offline (D07, D08 lúc 00:00) để hoàn thành Lát dọc 2.

## Về đích (05:00 → 09:00)

- **Quy tắc sửa lỗi:** Sau mốc đóng băng tính năng 05:00, bạn chỉ sửa các lỗi có GitHub Issue gắn nhãn `bug` hoặc `ui`. Không đổi bố cục giao diện.
- **Tập dượt demo cùng Vai E:** Tập demo cùng Vai E ở chế độ trình chiếu (cột code rộng theo `CONFIG.UI_PRESENTATION_FOCUS_PCT`, cỡ chữ Monaco theo `CONFIG.UI_PRESENTATION_FONT_SCALE`).
- **Thử nghiệm Offline với bundle thật:** Cùng Vai E kiểm tra chế độ Offline với file `mock_bundle.json` thật (X-06), thử nghiệm persona `SENIOR_RUSTY` để đảm bảo không có request mạng nào phát sinh.
- **08:30 — Đối soát commit:** Kiểm tra `git log main` để bảo đảm các commit của bạn đã hiện diện đầy đủ trên nhánh chính.
- **09:00 — Ngừng code:** Toàn đội dừng code, chuẩn bị slide và thuyết trình.

## Bạn dựng gì, theo thứ tự nào

Bạn dựng giao diện từ đầu, làm lần lượt D01 → D10. Phiếu theo `docs/spec/30_UI.md`, D-78, D-79. Khi lệch thì spec đúng. Test giao diện T1–T41 nằm ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6.

| Phiếu | Dựng | Xong thì thấy |
| :-- | :-- | :-- |
| D01 | Token 2 chủ đề, `ui/common`, `Toasts`, `Navbar` | Khung trang chủ, đổi được sáng / tối |
| D02 | `workbench`, `api`, `messages`, client Supabase | Chưa có màn hình mới, test xanh |
| D03 | `LessonGraphPanel`, `DagCanvas`, `GraphNodeCard`, `FlowEdge` | Cột trái hiện bản đồ từ fixture ở `/dev` |
| D04 | `CodeSnippetViewer`, `MonacoPane`, `slice-model` | Cột giữa hiện code lát cắt |
| D05 | `LearnSidePanel`, `XRayPanel`, `ProblemsPanel`, `RepoOverviewModal`, `lib/graph` | Tab X-Ray, bảng dưới, cửa sổ Tổng quan từ fixture |
| D06 | Trang chủ, đăng nhập, lộ trình, `LearnShell`, `CockpitHeader`, `Boot` | Ghép đủ 3 cột, dán link chạy API thật (Lát dọc 1) |
| D07 | `FeynmanQuestionSection` | Tab Feynman trả lời và chấm được |
| D08 | Áp response, `offline.ts` | Đổi màu, mở khóa, chạy Offline (Lát dọc 2) |
| D09 | Lịch sử, báo cáo, menu, Báo sai, `layout.ts`, `LayoutControls`, `Splitter`, trình chiếu | Đủ trang phụ, kéo tỉ lệ, trình chiếu |
| D10 | Sửa lỗi theo Issue, xóa `/dev` | Sẵn sàng tổng duyệt |
