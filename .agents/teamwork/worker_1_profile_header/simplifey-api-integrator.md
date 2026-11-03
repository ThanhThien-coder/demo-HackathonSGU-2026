# SimpliFey API Integrator Skill (Local Copy)
Source: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

Quy trình chuẩn hóa và an toàn để tích hợp các API (từ Bước 0 đến Bước 13 trong API_INTEGRATION_PROMPTS.md) vào giao diện SimpliFey. Hướng dẫn agent đối chiếu contract spec/02, spec/03, tập trung hóa hàm gọi tại src/lib/api.ts, xử lý trọn vẹn 4 trạng thái UI (loading/success/error/empty), bảo vệ giao diện không bị phá vỡ và tự động typecheck.

## 1. NGUYÊN TẮC BẤT BIẾN (STRICT SAFETY BOUNDARIES)
1. 🔒 KHÔNG PHÁ VỠ GIAO DIỆN HIỆN CÓ: Tuyệt đối không viết lại cả trang hoặc component từ đầu. Chỉ thay thế phần mock data tĩnh bằng state nhận từ API. Giữ nguyên toàn bộ cấu trúc Tailwind, class CSS, animation Lottie, và các component con trong src/components/.
2. 🔒 TẬP TRUNG HÓA GỌI API TẠI src/lib/api.ts: Cấm viết fetch() rải rác bên trong các component. Mọi lời gọi API bắt buộc phải qua hàm helper có định kiểu rõ ràng trong src/lib/api.ts (hoặc custom hooks trong src/hooks/), sử dụng apiFetch.
3. 🔒 TUÂN THỦ 100% API CONTRACT: Chỉ sử dụng các trường dữ liệu được định nghĩa trong spec/02_CONTRACTS.md Mục 8 và spec/03_API_VA_LUU_TRU.md.
4. 🔒 HỖ TRỢ DEV MOCK & BYPASS AUTH: Kiểm tra cờ process.env.NEXT_PUBLIC_BYPASS_AUTH === "true": nếu cờ bật và chưa có phiên đăng nhập thật, cho phép nạp mock token/mock user để người dùng có thể test UI trơn tru mà không bị chặn ở màn hình login.

## 2. QUY TRÌNH 5 BƯỚC TÍCH HỢP CHO MỖI API
- Bước 1: Xác minh Contract & Kiểu dữ liệu
- Bước 2: Cập nhật Module API Client (src/lib/api.ts)
- Bước 3: Gắn API vào Component & Xử lý 4 trạng thái UI (Loading, Success, Error, Empty)
- Bước 4: Typecheck & Bảo vệ toàn vẹn mã nguồn (npx tsc --noEmit)
- Bước 5: Tổng kết & Hướng dẫn kiểm thử
