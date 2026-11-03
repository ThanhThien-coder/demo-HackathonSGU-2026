## 2026-11-03T13:56:49Z

Thực hiện quy trình tự chủ một lượt (one-shot pipeline) tích hợp toàn diện 13 API từ Bước 1 đến Bước 13 theo tài liệu API_INTEGRATION_PROMPTS.md vào dự án SimpliFey. Sử dụng đội ngũ: Sentinel (khóa hợp đồng API client tại src/lib/api.ts), 4 Worker triển khai song song theo phân vùng file (Worker 1: User Profile & Header Domain, Worker 2: Home & Roadmap Domain, Worker 3: Report & Analytics Domain, Worker 4: Cockpit / Learn Core Domain), và Auditor (vòng lặp tự kiểm thử tsc và tự sửa lỗi).

Working directory: c:\nquyleee\Coding\demo-HackathonSGU-2026
Integrity mode: development

Tài liệu tham chiếu:
- `API_INTEGRATION_PROMPTS.md`
- `spec/02_CONTRACTS.md`
- `spec/03_API_VA_LUU_TRU.md`
- `src/lib/api.ts`

## Requirements

### R1. Khóa hợp đồng API Client (Giai đoạn 1 - Sentinel)
Sentinel hoàn thiện trước toàn bộ các hàm gọi API từ Bước 1 đến Bước 13 trong `src/lib/api.ts` với kiểu dữ liệu chuẩn xác từ `@/contracts` và `spec/02_CONTRACTS.md`. Đảm bảo hàm `apiFetch` hỗ trợ Bearer token và cờ `NEXT_PUBLIC_BYPASS_AUTH=true`. File `src/lib/api.ts` phải biên dịch thành công trước khi kích hoạt các Worker sang Giai đoạn 2.

### R2. Triển khai song song theo phân vùng file (Giai đoạn 2 - 4 Workers)
Các Worker thực hiện tích hợp API theo đúng phân vùng file được giao để triệt tiêu 100% rủi ro xung đột:
- **Worker 1 (User Profile & Header Domain):** Tích hợp Bước 1 (`GET /api/me`), Bước 2 (`POST /api/demo/persona`), Bước 3 (`DELETE /api/me`) trên các file `src/components/layout/Navbar.tsx`, `src/components/layout/SettingsDropdown.tsx` và User Store.
- **Worker 2 (Home & Roadmap Domain):** Tích hợp Bước 4 (`POST /api/ingest` - link repo & zip upload), Bước 5 (`GET /api/sessions`) trên các file `src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`.
- **Worker 3 (Report & Analytics Domain):** Tích hợp Bước 7 (`GET /api/sessions/{id}/history`), đổ dữ liệu thật vào radar chart kỹ năng từ `GET /api/me` trên file `src/app/report/page.tsx`.
- **Worker 4 (Cockpit / Learn Core Domain):** Tích hợp tuần tự Bước 6 (`GET /api/sessions/{id}/progress`), Bước 8 (`POST /api/analyze-node`), Bước 9 (`POST /api/analyze-overview`), Bước 10 (`POST /api/enrich-node`), Bước 11 (`POST /api/evaluate-feynman`), Bước 12 (`POST /api/reveal`), Bước 13 (`POST /api/report-wrong`) duy nhất trong thư mục `src/app/learn/`.

### R3. Ràng buộc bảo toàn giao diện & 4 trạng thái UI
Giữ nguyên toàn bộ cấu trúc Tailwind, class CSS, animation Lottie (`animation-robot.json`, v.v.) và icon SVG hiện có, không xóa hoặc viết lại component từ đầu; chỉ thay thế mock data bằng state API. Mọi vị trí gọi API phải xử lý đủ 4 trạng thái: Loading (disable nút, spinner/skeleton shimmer), Success (cập nhật data mới, hiển thị toast nếu là thao tác nộp bài/xóa), Error (bắt ApiError, thông điệp tiếng Việt thân thiện theo spec/30_UI.md), và Empty (placeholder đẹp mắt khi danh sách rỗng). Hỗ trợ dev bypass auth khi `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`.

### R4. Vòng lặp tự kiểm thử & tự sửa lỗi (Giai đoạn 3 - Auditor)
Auditor liên tục giám sát và thực thi lệnh kiểm tra kiểu tĩnh: `npx tsc --noEmit`. Nếu phát hiện lỗi TypeScript, thiếu import, lệch kiểu dữ liệu hoặc cú pháp, Auditor xác định vị trí file, nguyên nhân và yêu cầu chính Worker phụ trách phân vùng file đó sửa lại ngay lập tức cho đến khi đạt 0 errors.

### R5. Báo cáo nghiệm thu tổng kết (Giai đoạn 4 - Sentinel)
Sentinel tổng hợp toàn bộ quá trình và xuất báo cáo nghiệm thu theo đúng cấu trúc:
1. Bảng Trạng Thái 13 API (Bước, Endpoint, Màn hình áp dụng, Trạng thái, Ghi chú tích hợp)
2. Danh Sách File Đã Thay Đổi
3. Nhật Ký Lỗi & Quá Trình Tự Khắc Phục (Self-Healing Log)
4. Kết Quả Kiểm Tra Chất Lượng (Quality Gate: `npx tsc --noEmit` đạt 0 errors, 4 UI states, sẵn sàng khởi động `npm run dev`)

## Acceptance Criteria

### API Client & Domain Integration
- [ ] Toàn bộ các hàm gọi API từ Bước 1 đến Bước 13 được định nghĩa và export tại `src/lib/api.ts` với đầy đủ type contract từ `@/contracts`.
- [ ] Worker 1 tích hợp thành công Bước 1, 2, 3 tại `Navbar.tsx`, `SettingsDropdown.tsx` và User Store.
- [ ] Worker 2 tích hợp thành công Bước 4, 5 tại `src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`.
- [ ] Worker 3 tích hợp thành công Bước 7 và radar chart từ Bước 1 tại `src/app/report/page.tsx`.
- [ ] Worker 4 tích hợp thành công Bước 6, 8, 9, 10, 11, 12, 13 trong `src/app/learn/`.

### UI & Trạng thái tương tác
- [ ] Cấu trúc giao diện, Tailwind classes, SVG icons và Lottie animations được bảo tồn nguyên vẹn.
- [ ] Mọi luồng API đều hiện thực đủ 4 trạng thái UI: Loading, Success, Error, Empty.
- [ ] Chế độ Dev Bypass Auth (`NEXT_PUBLIC_BYPASS_AUTH=true`) hoạt động chính xác.

### Verification Gate
- [ ] Lệnh `npx tsc --noEmit` đạt 0 errors.

### Nghiệm thu
- [ ] Báo cáo tổng kết hoàn tất theo đúng cấu trúc 4 mục được yêu cầu trong Section 4.
