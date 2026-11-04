# Vai D — Giao diện: website bài học, lộ trình tương tác, hiển thị và offline

Bạn chịu trách nhiệm toàn bộ giao diện SimpliFey: thiết lập hệ thống token thiết kế, dựng website học tập nhiều trang trực quan (Trang chủ, Lộ trình, Màn hình học với Trình xem code Monaco và Ngăn kéo bản đồ ReactFlow, Báo cáo và Lịch sử), quản lý trạng thái máy khách bằng Zustand theo nguyên tắc bản sao chỉ đọc dữ liệu máy chủ, tích hợp toàn bộ các API route học tập, xây dựng chế độ Offline tự vận hành và hỗ trợ trình chiếu demo.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../doc-de-hieu/07_ke_hoach_21h.md)

## Vai D làm gì

Người học trải qua hành trình học tập hoàn chỉnh trên giao diện SimpliFey:
1. **Đăng nhập:** Người học đăng nhập bằng tài khoản GitHub qua Supabase Auth.
2. **Dán link repo:** Tại trang chủ, người học dán đường link GitHub (hoặc kéo thả file zip) để quét kiến trúc dự án.
3. **Thấy bản đồ:** Sau khi quét xong, hệ thống hiển thị tổng quan dự án và bản đồ lộ trình học tập gồm các bài học (node) phân cấp.
4. **Bấm bài:** Người học chọn một bài học sẵn sàng để bắt đầu phiên học tập tại `/learn`.
5. **Đọc code và phân tích:** Người học xem các đoạn lát cắt mã nguồn thật trên Monaco Editor, đọc phân tích X-Ray giải thích luồng nghiệp vụ từng bước, điểm hay và điểm dở do AI nhận định (không lộ cách sửa).
6. **Trả lời:** Người học giải thích cơ chế hoạt động qua các câu hỏi Feynman nhằm củng cố kỹ năng còn yếu.
7. **Được chấm, mở khóa:** Hệ thống gửi câu trả lời lên máy chủ, nhận kết quả đánh giá, hiển thị gợi ý hoặc đáp án, cập nhật điểm kỹ năng và mở khóa bài học kế tiếp.
8. **Xem kết quả:** Người học theo dõi báo cáo tiến độ, xem lại lịch sử các câu trả lời và hành trình làm chủ kiến trúc.

## Một phiếu làm thế nào

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
| 12:30–13:00 | [D01](D01-khung.md) | Khung website, bộ UI dùng chung (commit đầu tiên của D) |
| 13:00–14:30 | [D02](D02-store-api.md) | Store Zustand, client API có kiểu, phiên đăng nhập, bảng lỗi `ERROR_MESSAGES` |
| 14:30–16:00 | [D03](D03-ban-do.md) · **Mốc H+4** | Bản đồ bài học từ fixture, thẻ node 4 màu, ngăn kéo bản đồ ReactFlow |
| 16:00–17:30 | [D04](D04-monaco.md) | Khung xem code bằng Monaco tự host, model lát cắt, tô sáng và đồng bộ bước |
| 17:30–18:30 | [D05](D05-phan-tich.md) | Phân tích AI X-Ray (kỹ năng, mài mòn, luồng, điểm dở), modal Tổng quan repo |
| 18:30–20:00 | [D06](D06-noi-api.md) · **Lát dọc 1 (20:00)** | Trang chủ, đăng nhập, lộ trình, nối API ingest và hàng đợi phân tích |
| 20:00–22:00 | [D07](D07-feynman.md) | Trả lời Feynman: ô trả lời, kiểm trùng, kết quả chấm, gợi ý, đáp án, tổng kết run |
| 22:00–00:30 | [D08](D08-offline.md) · **Lát dọc 2 (00:00)** | Áp response, đổi màu, mở khóa, chế độ Offline (`Ctrl+Shift+D`) |
| 00:30–03:00 | 💤 Ngủ (agy chạy [D09](D09-phu.md)) | Giao agy trước 00:30: trang phụ lịch sử, báo cáo, menu, trình chiếu, responsive |
| 03:00–05:00 | [D10](D10-hoan-thien.md) · **Mốc H+16, H+17** | Kiểm việc agy D09, sửa giao diện theo Issue, xóa trang nháp `/dev` |
| 05:00–09:00 | Về đích (xem bên dưới) | Sửa lỗi có nhãn bug hoặc ui, không đổi bố cục, tập demo cùng E |

## Việc lặp lại suốt 21 giờ

- **Store chỉ là bản sao chỉ đọc (D-02):** Store Zustand chỉ lưu và thay thế dữ liệu máy chủ trả về; không tự tính BKT, trạng thái node, mở khóa, số lượt nộp hay đáp án. Các hàm thuần `bkt-engine`, `plan`, `derive` chỉ dùng cho hiển thị hoặc vận hành nội bộ ở chế độ Offline.
- **State dùng chung đặt tại store:** Mọi state dùng chung giữa bản đồ bài học, mã nguồn Monaco và phần trả lời Feynman bắt buộc nằm trong `src/store/workbench.ts`, tuyệt đối không tự ý nhân bản bằng `useState` phân tán trong các component trang.
- **Văn bản AI là chữ thuần:** Mọi nội dung do AI sinh ra (nhận định, điểm dở, gợi ý, đáp án, tổng quan) đều hiển thị dưới dạng chữ thuần, không dùng `dangerouslySetInnerHTML`, không parse Markdown tùy tiện; chỉ cho phép định dạng khối mã nội dòng trong ký tự backtick.
- **Màu sắc luôn đi kèm biểu tượng và chữ:** Tuân thủ INV-11, không bao giờ dùng màu đơn độc để thể hiện trạng thái (xanh lá kèm ✓ "Hoàn thành", đỏ kèm ✗ "Chưa đạt", hổ phách kèm ● "Sẵn sàng", xám mờ kèm 🔒 "Chưa mở").
- **Nhãn nguồn AI rõ ràng:** Luôn gắn nhãn xuất xứ minh bạch: "Điểm dở — Nhận định của AI", "Nhận định của AI — có thể chưa chính xác", "Đáp án tham khảo do AI viết". Không khẳng định loại bỏ ảo giác hoàn toàn.
- **Tải trước có giới hạn (D-46):** Hàng đợi phân tích chỉ gọi `analyze-node` cho node đang mở và 1–2 node kế tiếp theo thứ tự tô-pô, tối đa `CONFIG.ANALYZE_CONCURRENCY` lời gọi đồng thời; không tải trước ồ ạt toàn bộ đồ thị.
- **Kỷ luật sửa file của Vai D:** Vai D không ghi vào `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/`. Thiếu API hoặc kiểu dữ liệu thì báo vai sở hữu. `package.json` chỉ sửa ở D01 theo đúng bảng 5 gói chỉ định.
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
- **Tập dượt demo cùng Vai E:** Tập demo cùng Vai E ở chế độ trình chiếu (phóng to khung đang xem theo `CONFIG.UI_PRESENTATION_FOCUS_PCT`, cỡ chữ phóng to theo `CONFIG.UI_PRESENTATION_FONT_SCALE`).
- **Thử nghiệm Offline với bundle thật:** Cùng Vai E kiểm tra chế độ Offline với file `mock_bundle.json` thật (X-06), thử nghiệm persona `SENIOR_RUSTY` để đảm bảo không có request mạng nào phát sinh.
- **08:30 — Đối soát commit:** Kiểm tra `git log main` để bảo đảm các commit của bạn đã hiện diện đầy đủ trên nhánh chính.
- **09:00 — Ngừng code:** Toàn đội dừng code, chuẩn bị slide và thuyết trình.

## So sánh D mới và D cũ

### 1. Bảng thiết kế

| Yếu tố | D cũ | D mới |
| :-- | :-- | :-- |
| Bố cục | Buồng lái 3 cột cố định chia tỉ lệ theo `UI_PANE_WIDTHS_PCT` ([25, 45, 30]) gom chung trên một màn hình đơn `Cockpit.tsx`. | Bố cục nhiều trang chuẩn web (`/` → `/roadmap` → `/learn` → `/report`, `/history`). Trang học `/learn` tập trung vào code và câu hỏi, bản đồ đặt trong ngăn kéo `LessonGraphDrawer`. |
| Vị trí bản đồ | Cột 1 cố định bên trái màn hình. | Ngăn kéo `LessonGraphDrawer` mở linh hoạt từ thanh bên bằng `GraphSidebarButton` hoặc xem toàn cảnh ở `/roadmap`. Vẫn giữ ReactFlow và DAG layout. |
| Vị trí code | Cột 2 ở giữa màn hình. | Chiếm không gian trung tâm trang `/learn` trong `CodeSnippetViewer`, hỗ trợ modal phóng to xem file `FullFileModal.tsx`. Vẫn giữ Monaco editor tự host. |
| X-Ray / Feynman / Tổng quan | 3 tab chuyển đổi trong Cột 3 (`XRayTab`, `FeynmanTab`, `OverviewTab`). | Phân tích X-Ray nằm trực tiếp dưới mã nguồn trong `CodeSnippetViewer`; Feynman nằm trong khu vực câu hỏi `FeynmanQuestionSection`; Tổng quan repo mở bằng modal độc lập `RepoOverviewModal` đủ 3 giai đoạn D-71. |
| Các trang | Chỉ 1 trang chính duy nhất (`src/app/page.tsx`), chuyển đổi trạng thái bằng `result`. | Hệ thống nhiều trang theo luồng tự nhiên: trang chủ `/`, đăng nhập `/login`, đăng ký `/register`, lộ trình `/roadmap`, học tập `/learn`, lịch sử `/history`, báo cáo `/report`, cách thức `/how-it-works`. |
| Cách chờ API | Trang nháp `/dev` nạp fixture. | Không dùng mock trong route, không tạo store giả phía server; chỉ dùng fixture của Vai E qua trang nháp duy nhất `src/app/dev/page.tsx` (xóa ở D10). |
| Gói thêm | Không quy định chặt các gói UI dùng chung. | Thêm đúng 5 gói chỉ định bằng `--save-exact` ở D01: `lucide-react`, `lottie-react`, `clsx`, `tailwind-merge`, `class-variance-authority`. Không đổi gói khác. |

*Lưu ý: Công nghệ cốt lõi Monaco editor, ReactFlow và store Zustand `workbench.ts` vẫn được giữ nguyên vẹn.*

### 2. Bảng D01–D10

| Phiếu | Tên cũ | Tên mới | Thay đổi chính |
| :-- | :-- | :-- | :-- |
| D01 | Token thiết kế, khung 3 cột tĩnh | Khung website, bộ UI dùng chung | Bỏ khung 3 cột tĩnh `UI_PANE_WIDTHS_PCT`; thêm đúng 5 gói UI dùng chung (`lucide-react`, `lottie-react`, `clsx`, `tailwind-merge`, `class-variance-authority`), thanh điều hướng Navbar, 4 component UI cơ bản (Button, Card, Dialog, Drawer). |
| D02 | Store, client API, bảng lỗi | Store, client API, phiên đăng nhập, bảng lỗi | Giữ nguyên store `workbench.ts` khớp `ClientWorkbenchState` và `ERROR_MESSAGES`; thêm client Supabase, `userStore` quản lý phiên đăng nhập, hàm API Safe không throw. |
| D03 | Cột 1 Bản đồ từ fixture | Bản đồ bài học từ fixture | ReactFlow chuyển từ Cột 1 cố định sang đặt trong ngăn kéo `LessonGraphDrawer`; giữ nguyên hiển thị theo `node.position`, 4 màu + chữ + icon (INV-11), Capstone ★, cắt tên (T20), gọi `fitView` khi mở (T32). |
| D04 | Cột 2 Code (Monaco) | Khung xem code bằng Monaco | `CodePane` đặt trong `CodeSnippetViewer` thay vì Cột 2; thêm `FullFileModal`; giữ nguyên Monaco tự host, số dòng gốc `UI-31`, tô bước và vạch đỏ điểm dở / tím `CODE_POINTER`, đồng bộ 2 chiều qua `active_step`. |
| D05 | Cột 3: Tab X-Ray, Tab Tổng quan | Phân tích AI, Tổng quan | Bỏ `Cockpit.tsx`, `XRayTab`, `OverviewTab`; phân tích X-Ray nằm trong `CodeSnippetViewer`, Tổng quan mở bằng `RepoOverviewModal` đủ 3 giai đoạn D-71; gọi `mainPath` qua `overview-view.ts`; giữ nguyên tiêu đề "Điểm dở — Nhận định của AI" không lộ cách sửa (INV-06), chip mài mòn, nút chuyển (UI-47). |
| D06 | Màn hình đầu, đăng nhập, nối API lát dọc 1 | Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1 | Bổ sung các trang `/login`, `/register`, `/roadmap`, `/learn`; đăng nhập GitHub truyền `next`; dán link, thả zip; sau quét mở `/learn?session=<id>` kèm modal Tổng quan (`active_node_id = null`); hàng đợi D-46 trong store. |
| D07 | Tab Feynman | Trả lời Feynman | Chuyển từ `FeynmanTab` sang `FeynmanQuestionSection`, `SubmitEvaluationDialog`, `SkipConfirmDialog`, `RunSummary`; giữ nguyên kiểm độ dài, trùng câu, debounce, `Ctrl+Enter`, gợi ý, đáp án (T10), xác nhận bỏ qua (T11), T16, T25. |
| D08 | Áp response, đổi màu, mở khóa, Offline | Áp response, đổi màu, mở khóa, Offline | Đổi màu và mở khóa node trong store (UI-76, UI-77); `Ctrl+Shift+D`, `?offline=1`, nhãn Offline trên Navbar (UI-60), persona offline (UI-62); T17; X-06. Test tự dựng bundle nhỏ, không tạo `mock_bundle.json`. |
| D09 | Giao agent: lịch sử, menu, trình chiếu, responsive | Trang phụ, menu, trình chiếu | Màn hình `/history`, `/report`, `/how-it-works`, menu `SettingsDropdown`, báo sai (T12), responsive, `prefers-reduced-motion`, trình chiếu phóng to khung theo `CONFIG.UI_PRESENTATION_*`. Cắt tỉa phần trang trí khi thiếu giờ. |
| D10 | Kiểm agent, sửa giao diện, bỏ trang nháp | Kiểm agent, sửa giao diện, bỏ trang nháp | Đối soát việc agy D09, sửa bug giao diện theo Issue, xóa trang nháp `/dev`; thêm kiểm tra `git grep` sạch toàn bộ mock và session mặc định. |

### 3. Phần không đổi

- **Số lượng phiếu:** Đúng 10 phiếu thực hiện tuần tự từ D01 đến D10.
- **Thời gian và mốc:** Toàn bộ khung giờ, thời lượng từng phiếu và các mốc chuyển giao lớn (Mốc H+4, Lát dọc 1 H+8 lúc 20:00, Lát dọc 2 H+12 lúc 00:00, Mốc H+16, H+17, Đóng băng tính năng 05:00) được giữ nguyên vẹn.
- **Mối quan hệ phụ thuộc:** Cột "Cần có trước" và "Mở đường cho" của từng phiếu khớp hoàn toàn phiếu cùng số cũ, đảm bảo không ảnh hưởng tiến độ của các vai khác (A, B, C, E).
- **Contracts và API:** Giữ nguyên toàn bộ kiểu dữ liệu hợp đồng, các endpoint API máy chủ, mã lỗi `ErrorCode` và bảng ánh xạ lỗi `ERROR_MESSAGES`.
- **Bất biến giao diện:** Tuân thủ triệt để luật văn bản AI là chữ thuần, nhãn xuất xứ AI minh bạch, màu sắc luôn đi kèm biểu tượng và chữ (INV-11).
- **Chế độ Offline:** Hoạt động ngoại tuyến bằng `Ctrl+Shift+D` và `?offline=1`, hỗ trợ persona offline, không phát sinh request mạng.
- **Công nghệ nền tảng:** Monaco Editor tự host chỉ đọc, ReactFlow dựng đồ thị DAG, Zustand store `workbench.ts`.

### 4. Bảng đọc spec

| Khi spec/doc nói | Ở giao diện buồng lái cũ | Hiểu ở giao diện mới |
| :-- | :-- | :-- |
| 3 cột / Buồng lái 3 cột | 3 cột cố định Bản đồ (Cột 1), Code (Cột 2), Cockpit (Cột 3) chia theo `UI_PANE_WIDTHS_PCT` trong `Cockpit.tsx` | Bố cục nhiều trang với trang học `/learn`: Code và câu hỏi ở trung tâm, bản đồ đặt trong ngăn kéo `LessonGraphDrawer` mở từ thanh bên. |
| Cột 1 / Bản đồ | Cột 1 cố định bên trái màn hình | Ngăn kéo `LessonGraphDrawer` chứa `DagCanvas` mở qua nút `GraphSidebarButton` trên trang `/learn` hoặc màn hình lộ trình `/roadmap`. |
| Cột 2 / Trình xem Code | Cột 2 Monaco ở giữa màn hình | `CodePane` nằm trong component `CodeSnippetViewer` chiếm vị trí nổi bật tại trang `/learn`, có nút phóng to modal `FullFileModal`. |
| Cột 3 / Cockpit học tập | Cột 3 bên phải chứa `Cockpit.tsx` chia 3 tab (`XRayTab`, `FeynmanTab`, `OverviewTab`) | Được tách thành các thành phần chuyên biệt trên trang `/learn`: khối X-Ray phân tích dưới code, phần câu hỏi `FeynmanQuestionSection`, và modal `RepoOverviewModal`. |
| Tab X-Ray / Tab 1 | Tab đầu tiên trong Cột 3 (`XRayTab`) | Khối phân tích luồng và kiến trúc hiển thị trực tiếp trong `CodeSnippetViewer` (dưới code). |
| Tab Feynman / Tab 2 | Tab thứ hai trong Cột 3 (`FeynmanTab`) | Khu vực câu hỏi và trả lời Feynman `FeynmanQuestionSection` tại trang `/learn`. |
| Tab Tổng quan | Tab thứ ba trong Cột 3 (`OverviewTab`) | Modal tổng quan repo `RepoOverviewModal` mở tự động sau khi quét xong hoặc mở từ thanh điều hướng. |
| Không ẩn cột (chế độ trình chiếu) | Cả 3 cột không được ẩn, chỉ co giãn tỉ lệ theo `CONFIG.UI_PRESENTATION_FOCUS_PCT` | Giữ nguyên thanh điều hướng, phóng to khung đang xem (code hoặc câu hỏi) và tăng cỡ chữ theo `CONFIG.UI_PRESENTATION_FONT_SCALE`. |

### 5. Ghi chú

`docs/spec/30_UI.md` và `docs/pitch/KICH_BAN_DEMO.md` sẽ được cập nhật đồng bộ sau; trong thời gian này các vai đọc hiểu theo bảng đối chiếu ở trên. Code trên nhánh `origin/develop-ui` hiện tại là bản tham khảo bố cục, chưa sửa theo phiếu mới này.
