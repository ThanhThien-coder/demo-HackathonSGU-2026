# THEO DÕI TRIỂN KHAI FRONTEND SIMPLIFEY

> Danh mục task lấy từ [PLAN.md](./PLAN.md); hành vi từ [YEU_CAU_FRONTEND.md](./YEU_CAU_FRONTEND.md). Agent cập nhật sau kiểm tra, không tự động đồng bộ. Các ô dưới đây là nghiệm thu triển khai theo kế hoạch mới, không phải thống kê số file đã tồn tại.

## 1. Tổng quan

Chưa nghiệm thu task triển khai nào theo kế hoạch mới. Các thư viện có sẵn cần đối chiếu ở Phase 0; việc chỉnh tài liệu không được tính là đã implement.

| Phase | Task đã nghiệm thu / tổng |
| :-- | :-- |
| Phase 0 — Khảo sát và nền kiểm thử | 0/2 |
| Phase 1 — Nền hiển thị và API | 0/3 |
| Phase 2 — Lifecycle, auth và offline sớm | 0/4 |
| Phase 3 — Ingest, quản lý phiên và shell | 0/3 |
| Phase 4 — Bản đồ, code, phân tích và tổng quan | 0/4 |
| Phase 5 — Vòng Feynman hoàn chỉnh | 0/3 |
| Phase 6 — Trang phụ, bố cục và offline toàn luồng | 0/3 |
| Phase 7 — Nghiệm thu và bàn giao | 0/3 |

**Tổng: 0/25 task.**

## 2. Checklist triển khai

### Phase 0 — Khảo sát và nền kiểm thử

- [ ] **Task 0.1 — Ghi nhận nền và đối chiếu contract**
- [ ] **Task 0.2 — Thiết lập component test tách khỏi backend**

### Phase 1 — Nền hiển thị và API

- [ ] **Task 1.1 — Theme, preferences và root layout**
- [ ] **Task 1.2 — UI dùng chung và truy cập**
- [ ] **Task 1.3 — Thích nghi API Safe và thông điệp lỗi**

### Phase 2 — Lifecycle, auth và offline sớm

- [ ] **Task 2.1 — Workbench và áp response dùng chung**
- [ ] **Task 2.2 — Boot, đăng nhập và resume từ URL**
- [ ] **Task 2.3 — Navbar, persona và tài khoản**
- [ ] **Task 2.4 — Kiểm offline tối thiểu trước trang phụ**

### Phase 3 — Ingest, quản lý phiên và shell

- [ ] **Task 3.1 — Trang chủ và ingest**
- [ ] **Task 3.2 — SessionList, resume và restart**
- [ ] **Task 3.3 — Trang learn, shell và header**

### Phase 4 — Bản đồ, code, phân tích và tổng quan

- [ ] **Task 4.1 — DAG và lớp cảnh báo**
- [ ] **Task 4.2 — Monaco, slice model và Problems**
- [ ] **Task 4.3 — Queue, mở node và X-Ray thật**
- [ ] **Task 4.4 — Tổng quan facts, discovered và AI**

### Phase 5 — Vòng Feynman hoàn chỉnh

- [ ] **Task 5.1 — Nhập bài, nộp và hiển thị chấm**
- [ ] **Task 5.2 — Reveal, báo sai và phục hồi đồng thời**
- [ ] **Task 5.3 — Tổng kết và run chỉ đọc sau reload**

### Phase 6 — Trang phụ, bố cục và offline toàn luồng

- [ ] **Task 6.1 — Roadmap, history, report, how-it-works**
- [ ] **Task 6.2 — Splitter, prefs layout và trình chiếu**
- [ ] **Task 6.3 — Nghiệm thu offline và resume xuyên trang**

### Phase 7 — Nghiệm thu và bàn giao

- [ ] **Task 7.1 — Kiểm UI thực tế, truy cập và thẩm mỹ**
- [ ] **Task 7.2 — Hồi quy hợp đồng và toàn vòng học**
- [ ] **Task 7.3 — Đồng bộ tài liệu và bàn giao**

## 3. Nhật ký

### Bản ghi trước khi chỉnh danh mục

| Thời gian (UTC/Local) | Mã Task | Tên Task | Danh sách Tệp & Thư mục Đã Tạo / Chỉnh Sửa | Mã Test Đã Vượt Qua | Người/Agent Thực Hiện | Ghi chú & Đánh giá |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| *Chưa có* | — | — | — | — | — | Sẵn sàng bắt đầu Phase 1 |

### Điều chỉnh tài liệu ngày 06/11/2026 (Asia/Saigon)

- Chuẩn hóa YEU_CAU_FRONTEND và PLAN theo checklist được duyệt; giữ nguyên code, spec, API, contracts và bundle.
- Danh mục cũ: PLAN và TIEN_DO không cùng tập task. Thay checklist chưa hoàn thành bằng đúng mã/tên task của PLAN mới; giữ bản ghi cũ ở trên, không chuyển task nào sang hoàn thành.
- Kiểm tài liệu: liên kết tương đối hợp lệ; bảng lỗi khớp 34 mã contract; ma trận giữ đúng 36 mã test gốc; 25 task khớp mã/tên giữa PLAN và checklist; các tên CONFIG tồn tại. Không còn enum sai hoặc giá trị vận hành chép tay của bản cũ.
- `npm test`: exit 0, 48 file test đạt; 674 passed, 1 skipped, 6 todo. Đây là test code hiện có, không chứng minh UI dự kiến đã triển khai.
- `npm run lint`: exit 0, không lỗi, 6 cảnh báo unused trong session.test.ts, userStore.test.ts và userStore.ts hiện có; không sửa code ngoài phạm vi.
- `npm run typecheck`: exit 1, TS2307 trong .next/types tham chiếu các page/layout đã bị xóa sẵn khỏi working tree; không phục hồi UI hoặc xóa cache để che tình trạng hiện tại.
- Không chạy build/browser trong lần chỉ chỉnh tài liệu này; các gate đó dành cho triển khai và vẫn phải kiểm theo PLAN. Không đánh dấu task 0.1 hoặc task implement nào hoàn thành từ kết quả trên.

| Thời gian (Asia/Saigon) | Task | File đổi | Lệnh/test và kết quả | Bằng chứng trình duyệt | Người thực hiện | Phần chưa kiểm / lỗi nền |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Chưa có | — | — | — | — | — | Chưa chạy task theo danh mục mới |

## 4. Quy tắc cập nhật

1. Mã/tên task phải khớp PLAN; thay danh mục phải sửa cả hai và ghi nhật ký, không xóa bằng chứng cũ.
2. Chỉ đánh [x] sau khi đáp ứng đầu ra và kiểm tra của task. Gate tích hợp/browser chưa kiểm phải ghi rõ, không suy ra từ test mock hoặc từ việc file tồn tại.
3. Cập nhật số task đã nghiệm thu theo phase và tổng; không dùng số file làm tiến độ.
4. Nhật ký ghi file thực đổi, lệnh/exit code/test pass-fail-skipped, bằng chứng browser, lỗi baseline và giới hạn môi trường. Không ghi bí mật hoặc nội dung .env.
5. Không tự commit/push. Người dùng kiểm rồi commit theo quy định repo.
