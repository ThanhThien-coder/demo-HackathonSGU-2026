Bản cũ, chỉ để tham khảo. Bản đang dùng: [`vai-D`](../vai-D/README.md).

# Vai D — Giao diện: buồng lái 3 cột, tương tác đồng bộ, hiển thị và offline

Bạn chịu trách nhiệm toàn bộ giao diện SimpliFey: thiết lập hệ thống token thiết kế, dựng buồng lái 3 cột đồng bộ (Bản đồ ReactFlow, Trình xem code Monaco, Cockpit học tập), quản lý trạng thái máy khách bằng Zustand theo nguyên tắc bản sao chỉ đọc dữ liệu máy chủ, tích hợp toàn bộ các API route học tập, xây dựng chế độ Offline tự vận hành và hỗ trợ trình chiếu demo.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../../doc-de-hieu/07_ke_hoach_21h.md)

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
| 12:30–13:00 | [D01](D01-khung.md) | Token thiết kế, font, khung 3 cột tĩnh (commit đầu tiên của D) |
| 13:00–14:30 | [D02](D02-store-api.md) | Store Zustand, client API có kiểu, bảng lỗi `ERROR_MESSAGES` |
| 14:30–16:00 | [D03](D03-ban-do.md) · **Mốc H+4** | Cột 1 Bản đồ ReactFlow từ fixture, thẻ node 4 màu, thanh công cụ |
| 16:00–17:30 | [D04](D04-monaco.md) | Cột 2 Monaco editor tự host, model lát cắt, tô sáng và đồng bộ 2 chiều |
| 17:30–18:30 | [D05](D05-tab1.md) | Cột 3 Cockpit: Tab X-Ray (kỹ năng, mài mòn, luồng, điểm dở), Tab Tổng quan |
| 18:30–20:00 | [D06](D06-noi-api.md) · **Lát dọc 1 (20:00)** | Màn hình đầu, đăng nhập GitHub, nối API ingest và hàng đợi phân tích |
| 20:00–22:00 | [D07](D07-tab2.md) | Tab Feynman: ô trả lời, kiểm trùng, kết quả chấm, gợi ý, đáp án, tổng kết run |
| 22:00–00:30 | [D08](D08-offline.md) · **Lát dọc 2 (00:00)** | Áp response, đổi màu, mở khóa, chế độ Offline (`Ctrl+Shift+D`) |
| 00:30–03:00 | 💤 Ngủ (agy chạy [D09](D09-phu.md)) | Giao agy trước 00:30: màn hình lịch sử, menu, trình chiếu, responsive |
| 03:00–05:00 | [D10](D10-hoan-thien.md) · **Mốc H+16, H+17** | Kiểm việc agy D09, sửa giao diện theo Issue, xóa trang nháp `/dev` |
| 05:00–09:00 | Về đích (xem bên dưới) | Sửa lỗi có nhãn bug hoặc ui, không đổi bố cục, tập demo cùng E |

## Việc lặp lại suốt 21 giờ

- **Store chỉ là bản sao chỉ đọc (D-02):** Store Zustand chỉ lưu và thay thế dữ liệu máy chủ trả về; không tự tính BKT, trạng thái node, mở khóa, số lượt nộp hay đáp án. Các hàm thuần `bkt-engine`, `plan`, `derive` chỉ dùng cho hiển thị hoặc vận hành nội bộ ở chế độ Offline.
- **Văn bản AI là chữ thuần:** Mọi nội dung do AI sinh ra (nhận định, điểm dở, gợi ý, đáp án, tổng quan) đều hiển thị dưới dạng chữ thuần, không dùng `dangerouslySetInnerHTML`, không parse Markdown tùy tiện; chỉ cho phép định dạng khối mã nội dòng trong ký tự backtick.
- **Màu sắc luôn đi kèm biểu tượng và chữ:** Tuân thủ INV-11, không bao giờ dùng màu đơn độc để thể hiện trạng thái (xanh lá kèm ✓ "Hoàn thành", đỏ kèm ✗ "Chưa đạt", hổ phách kèm ● "Sẵn sàng", xám mờ kèm 🔒 "Chưa mở").
- **Nhãn nguồn AI rõ ràng:** Luôn gắn nhãn xuất xứ minh bạch: "Điểm dở — Nhận định của AI", "Nhận định của AI — có thể chưa chính xác", "Đáp án tham khảo do AI viết". Không khẳng định loại bỏ ảo giác hoàn toàn.
- **Tải trước có giới hạn (D-46):** Hàng đợi phân tích chỉ gọi `analyze-node` cho node đang mở và 1–2 node kế tiếp theo thứ tự tô-pô, tối đa `CONFIG.ANALYZE_CONCURRENCY` lời gọi đồng thời; không tải trước ồ ạt toàn bộ đồ thị.

### Cách làm khi chưa có API

Khi các endpoint API máy chủ chưa hoàn thành hoặc chưa merge vào `main`:
- Component nhận props từ bên ngoài hoặc đọc từ store đã chuẩn bị sẵn.
- Xem và kiểm thử giao diện bằng trang nháp `src/app/dev/page.tsx`. Trang này nạp dữ liệu mẫu từ các fixture của Vai E: `src/server/engine/__fixtures__/shop-api.json` và thư mục `src/server/ai/__fixtures__/`.
- Trang nháp `src/app/dev/page.tsx` **được merge** để cả nhóm cùng xem và góp ý giao diện.
- Trang nháp **phải xóa trong D10** trước 05:00.
- Dữ liệu dạng View (ví dụ `NodeAnalysisView`) khi chưa có hàm chuyển đổi của Vai C thì gõ tay trực tiếp trong trang nháp từ fixture, không đặt vào trong `src/components/`.

## Bạn chờ ai, ai chờ bạn

- **Bạn chờ các vai khác:**
  - Chờ Vai A: A01 (khung code lúc 12:30), A02 (contracts lúc 13:00), các API route lát dọc 1 A04–A07 (13:30–20:00), API lát dọc 2 A08 và A10 (20:00–00:00).
  - Chờ Vai E: fixture `shop-api.json` (E01) cho Cột 1 Bản đồ; fixture AI (E02) cho Cột 3 Tab 1; hàm `similarity` (E04) cho kiểm tra câu trả lời Tab 2.
  - Chờ Vai C: hàm `bkt-engine.ts` (C02) và hàm suy luận trạng thái node `derive.ts` (C03) cho chế độ Offline.
- **Mọi người chờ bạn:**
  - Cả nhóm chờ Cột 1 Bản đồ từ fixture (D03 lúc 16:00) đạt mốc H+4.
  - Cả nhóm chờ bạn nối API màn hình đầu và phân tích (D06 lúc 20:00) để hoàn thành Lát dọc 1.
  - Cả nhóm chờ bạn hoàn thành trả lời, đổi màu, mở khóa và Offline (D07, D08 lúc 00:00) để hoàn thành Lát dọc 2.

## Về đích (05:00 → 09:00)

- **Quy tắc sửa lỗi:** Sau mốc đóng băng tính năng 05:00, bạn chỉ sửa các lỗi có GitHub Issue gắn nhãn `bug` hoặc `ui`. Không đổi bố cục buồng lái 3 cột.
- **Tập dượt demo cùng Vai E:** Tập demo cùng Vai E ở chế độ trình chiếu (nút ⤢ phóng to cột theo `CONFIG.UI_PRESENTATION_FOCUS_PCT`, cỡ chữ phóng to theo `CONFIG.UI_PRESENTATION_FONT_SCALE`).
- **Thử nghiệm Offline với bundle thật:** Cùng Vai E kiểm tra chế độ Offline với file `mock_bundle.json` thật (X-06), thử nghiệm persona `SENIOR_RUSTY` để đảm bảo không có request mạng nào phát sinh.
- **08:30 — Đối soát commit:** Kiểm tra `git log main` để bảo đảm các commit của bạn đã hiện diện đầy đủ trên nhánh chính.
- **09:00 — Ngừng code:** Toàn đội dừng code, chuẩn bị slide và thuyết trình.
