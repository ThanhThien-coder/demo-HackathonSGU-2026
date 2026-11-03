# Vai A — Trưởng tích hợp: khung code, contracts, CI/CD, database, API, deploy

Bạn chịu trách nhiệm thiết lập nền móng dự án ở đầu giờ, viết contracts làm hợp đồng chung cho cả nhóm, thiết lập pipeline CI/CD và hạ tầng đám mây Google Cloud Run, xây dựng lược đồ cơ sở dữ liệu Supabase, hiện thực toàn bộ các API route và thực hiện ghép nối các tầng, điều phối merge mã nguồn và duyệt triển khai production.

Đọc chung: [README tổng](../README.md) · lịch gốc [`07`](../../../doc-de-hieu/07_ke_hoach_21h.md)

## Một phiếu làm thế nào

Mỗi phiếu đọc từ trên xuống, làm đúng thứ tự:
1. Bước 0: tự gõ lệnh cập nhật `main`, cài thư viện, tạo nhánh.
2. Bước 1: copy prompt, dán cho Claude trên máy bạn. Claude tạo task trong `.kb/tasks/`. Đọc task, thấy khớp phiếu thì đi tiếp.
3. Bước 2: copy prompt, dán cho Claude. Claude giao agy viết file, rồi tự kiểm và báo kết quả. Claude không commit.
4. Bước 3: bạn tự kiểm theo danh sách ô. Đủ hết ô mới là xong. Chưa đạt thì dán prompt làm lại (tối đa 1 lần).
5. Bước 4: bạn tự gõ lệnh commit, push, mở PR. Vai A merge.
6. Sang phiếu ở mục Tiếp theo.
AI không bao giờ commit hay push. Commit là của bạn: luật thi yêu cầu mọi thành viên phải có commit.

Máy không có Antigravity (agy) hoặc không có ai-kit: làm cùng phiếu này theo [`khong-co-ai-kit.md`](../khong-co-ai-kit.md).

## Lịch của bạn

| Giờ | Phiếu | Ghi chú |
| :-- | :-- | :-- |
| 12:00–12:30 | [A01](A01-khung-code.md) | Khung code repo thi trên `main`, push thẳng lần duy nhất |
| 12:30–13:00 | [A02](A02-contracts.md) · **Mốc H+1** | Gõ contracts (agy chạy); chạy song song với [A03](A03-ci-cd.md) |
| 12:30–13:30 | [A03](A03-ci-cd.md) | CI/CD GitHub Actions, an ninh repo (Claude tự viết song song) |
| 13:30–14:30 | [A04](A04-db-auth.md) | Database Supabase migration, auth, `/api/me` |
| 14:30–16:00 | [A05](A05-phien-session.md) · **Mốc H+4** | Quản lý phiên, cache RAM, quota, `/api/sessions`, `/progress` |
| 16:00–18:30 | [A06](A06-ingest.md) | Nối `POST /api/ingest` (tải repo, mở lại phiên, zip) |
| 18:30–20:00 | [A07](A07-analyze-node.md) · **Lát dọc 1 (20:00)** | Nối `POST /api/analyze-node`, ghi `ai_usage` |
| 20:00–22:00 | [A08](A08-enrich-node.md) | Nối `POST /api/enrich-node` (tạo run, câu hỏi) |
| 20:00–00:30 | [A09](A09-dockerfile.md) | Đóng gói Dockerfile multi-stage trên nhánh riêng (xen kẽ) |
| 22:00–00:00 | [A10](A10-evaluate-reveal.md) · **Lát dọc 2 (00:00)** | Nối `/api/evaluate-feynman`, `/api/reveal`, cập nhật BKT |
| 00:00–00:30 | [A11](A11-api-con-lai.md) | Soạn và giao agy các API còn lại trước khi đi ngủ |
| 00:30–03:00 | 💤 Ngủ (agy chạy [A11](A11-api-con-lai.md)) | Không merge trong khoảng thời gian này, PR chờ bạn dậy |
| 03:00–05:00 | [A12](A12-ve-dich.md) · **Mốc H+15, H+16, H+17** | Kiểm việc agy A11, giờ cắt Dockerfile, đủ 14 endpoint, deploy |
| 05:00–09:00 | Về đích (xem bên dưới) | Sửa lỗi có nhãn bug, tag stable, đối soát commit cả nhóm |

## Việc lặp lại suốt 21 giờ

- **Nhịp merge:** Xem xét và merge PR 30–60 phút một lần. Chỉ bấm merge khi toàn bộ workflow CI (`ci.yml` và `security.yml`) chạy xanh.
- **Thứ tự ưu tiên merge khi dồn PR:** Contracts → hàm thuần (`src/lib/*` của Vai C, Vai E) → engine (Vai B) → API route (Vai A) → giao diện (Vai D).
- **Quyền sửa contracts:** Duy nhất Vai A được sửa các file trong `src/contracts/*`. Mỗi lần sửa là một PR riêng có nhánh dạng `a/contracts-fix-<n>`, merge ngay vào `main` khi CI đạt rồi thông báo cho cả nhóm gõ lệnh `git pull --rebase origin main`.
- **Theo dõi Issues:** Lướt danh sách GitHub Issues mỗi lần chuẩn bị merge để nắm bắt tiến độ chung và các vướng mắc của thành viên khác.
- **Duyệt Production:** Chỉ bấm phê duyệt (Approve) triển khai lên môi trường Production (`simplifey-prod`) sau khi job smoke test trên Staging S2 đạt kết quả tốt.

## Bạn chờ ai, ai chờ bạn

- **Mọi người chờ bạn:**
  - Cả nhóm chờ [A01](A01-khung-code.md) (12:30) để có khung code và cấu hình dự án ban đầu.
  - Cả nhóm chờ [A02](A02-contracts.md) (13:00) để có hệ thống kiểu dữ liệu và bảng hằng số `CONFIG` hoàn chỉnh trước khi viết code nghiệp vụ.
- **Bạn chờ các vai khác:**
  - Chờ Vai B: hàm tải repo `runIngest` (B04) và engine hoàn chỉnh `runEngine` (B07).
  - Chờ Vai C: hàm suy ra trạng thái node `deriveNodeStates` (C03), hàm phân tích node (C06), kế hoạch câu hỏi và sinh câu hỏi (C03, C07), hàm chấm điểm Feynman (C08).
  - Chờ Vai E: bộ lọc an toàn `maskSensitive` và `hasInappropriateWords` (E03); hàm kiểm tra `similarity` và regex chống tấn công `isInjection` (E04).
- **Nguyên tắc phối hợp khi chờ:** Trong lúc chờ hàm thật từ các vai khác, bạn chủ động sử dụng mock dữ liệu hoặc fixture viết sẵn (`shop-api.json`, fixture AI) để kiểm thử luồng route; không tự ý viết thay code hay logic thuộc phạm vi sở hữu của người khác.

## Về đích (05:00 → 09:00)

- **Quy tắc sửa lỗi:** Sau mốc đóng băng tính năng lúc 05:00, nhóm ngừng tiếp nhận tính năng mới. Bạn chỉ sửa các lỗi có GitHub Issue gắn nhãn `bug`. Mỗi lần sửa lỗi được thực hiện trên một nhánh riêng có tên dạng `a/fix-<issue>`, mở PR và merge khi CI xanh.
- **07:00 — Gắn tag stable:** Kiểm tra bản triển khai staging đang hoạt động ổn định nhất và gắn tag `stable` cho revision đó theo hướng dẫn tại `.kb/spec/05_HA_TANG_CLOUD.md` Mục 5 để dự phòng kịch bản khôi phục khi demo.
- **08:30 — Đối soát commit:** Chạy lệnh `git log main` để kiểm tra và xác nhận cả 5 thành viên trong nhóm đều có ít nhất một commit đã được merge vào nhánh chính `main` theo đúng điều lệ cuộc thi.
- **09:00 — Ngừng merge:** Toàn đội ngừng code và ngừng merge PR vào `main`, sẵn sàng nộp slide và bước vào phần thuyết trình.
