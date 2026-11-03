# Vai C — AI, cổng gác, chấm Feynman và BKT thích ứng

Bạn chịu trách nhiệm thiết lập kênh gọi mô hình Gemini, đóng gói dữ liệu prompt, xây dựng hệ thống cổng gác kiểm duyệt đầu ra của AI, hiện thực logic chấm điểm phương pháp Feynman và thuật toán BKT (Bayesian Knowledge Tracing) thích ứng kèm cơ chế mài mòn kiến thức, cùng quy trình duyệt tay và đóng băng gói dữ liệu offline cho repo demo.

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
| 12:00–13:00 | [C01](C01-gemini-khung.md) · **Mốc H+1** | Đo Gemini 3 lần ngoài repo, review PR contracts Mục 5–6, khung `gemini.ts` |
| 13:00–14:30 | [C02](C02-bkt.md) | BKT `bkt-engine.ts`, decay, tier, mài mòn, outcome |
| 14:30–16:00 | [C03](C03-plan-derive.md) · **Mốc H+4** | Kế hoạch câu hỏi `plan.ts`, màu node, persona, `deriveNodeStates` |
| 16:00–17:30 | [C04](C04-gemini.md) | Gọi model, phân loại lỗi, gọi lại, đóng gói prompt chung `common.ts` |
| 17:30–18:30 | [C05](C05-guard-loi.md) | Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, `checkAnalysis` |
| 18:30–20:00 | [C06](C06-analyze.md) · **Lát dọc 1 (20:00)** | Lời gọi `analyze-node`, chuyển bản phân tích sang view |
| 20:00–22:00 | [C07](C07-cau-hoi.md) | Đặt câu hỏi `enrich-node`, cổng gác câu hỏi `checkQuestions` |
| 22:00–00:00 | [C08](C08-cham.md) · **Lát dọc 2 (00:00)** | Chấm Feynman `evaluate-feynman`, gợi ý theo lượt, cổng gác gợi ý |
| 00:00–03:00 | [C09](C09-tong-quan.md) · **Mốc H+16** | Tổng quan repo, cổng gác tổng quan, route `/api/analyze-overview` |
| 03:00–05:00 | [C10](C10-duyet-bundle.md) · **Mốc H+17** | Duyệt tay output AI repo demo với người thứ 2, ghi `mock_bundle.json` |
| 05:00–06:30 | 💤 Ngủ | Nghỉ ngơi sau mốc đóng băng tính năng |
| 06:30–09:00 | Về đích (xem bên dưới) | Sửa lỗi có Issue nhãn bug, giữ nguyên prompt và bundle |

## Việc lặp lại suốt 21 giờ

- **Đã chuyển cho E:** Các file `src/lib/moderation.ts`, `src/lib/similarity.ts`, `src/server/ai/guard/forbidden.ts`, `src/server/ai/guard/injection.ts` do Vai E viết. Bạn sử dụng các hàm này (`findForbidden`, `forbiddenKeywords`, `BAD_WORDS`, `isInjection`, `similarity`), không viết lại. Bạn phải review PR E03 và E04 trong vòng ≤ 15 phút kể từ khi mở vì đây là các thành phần bạn dùng trực tiếp.
- **Hàm thuần merge sớm:** Các hàm thuần trong `src/lib` (`bkt-engine.ts`, `plan.ts`, `derive.ts`) phải hoàn thành và merge sớm vì Vai A và Vai D cần tích hợp (C02, C03 xong trước 16:00).
- **Kỷ luật đổi prompt và schema:** Khi cần thay đổi prompt hoặc schema, phải tăng `CONFIG.PROMPT_VERSION` qua Vai A (người duy nhất có quyền sửa `src/contracts/*`).
- **Thêm ca test trước khi sửa:** Mỗi lỗi cổng gác do Vai E báo hoặc phát hiện trong quá trình kiểm thử phải được bổ sung thành một ca test kiểm chứng trước khi tiến hành sửa code.

## Bạn chờ ai, ai chờ bạn

- **Bạn chờ ai:**
  - Chờ Vai A: [A02](../vai-A/A02-contracts.md) (contracts đã merge) để có kiểu dữ liệu và `CONFIG`.
  - Chờ Vai E: E02 (fixture AI) để viết test, E03 (`forbidden.ts`) để gác từ cấm ở C05, E08 (kết quả duyệt lần 1) để đối soát ở C10.
- **Ai chờ bạn:**
  - Vai A chờ bạn: C03 (`deriveNodeStates`), C06 (hàm phân tích cho `analyze-node`), C07 (hàm đặt câu hỏi cho `enrich-node`), C08 (hàm chấm cho `evaluate-feynman`).
  - Vai D chờ bạn: C02 (`bkt-engine.ts`), C03 (`plan.ts`, `derive.ts`) để phục vụ hiển thị bản đồ, tính mài mòn và chạy chế độ Offline.

## Về đích (06:30 → 09:00)

- **Không đổi prompt sau đóng băng:** Sau mốc đóng băng tính năng lúc 05:00, không được sửa đổi prompt hay schema AI (đổi prompt là phải duyệt lại toàn bộ theo GUARD-18).
- **Chỉ sửa lỗi có Issue:** Chỉ sửa các lỗi code có GitHub Issue gắn nhãn `bug`. Mọi sửa đổi thực hiện trên nhánh riêng `c/fix-<issue>`, mở PR và merge khi CI xanh.
- **Bảo toàn dữ liệu demo:** Giữ nguyên vẹn file `public/demo/mock_bundle.json` đã duyệt và đóng băng lúc 05:00. Không bao giờ sửa tay output AI theo GUARD-19.
- **Phối hợp demo:** Cùng Vai A, D, E chạy thử kịch bản demo và sẵn sàng giải thích các quyết định thiết kế AI và BKT trước hội đồng.
