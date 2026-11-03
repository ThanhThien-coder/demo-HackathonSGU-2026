---
name: simplifey-api-integrator
description: >-
  Quy trình chuẩn hóa và an toàn để tích hợp các API (từ Bước 0 đến Bước 13 trong API_INTEGRATION_PROMPTS.md)
  vào giao diện SimpliFey. Hướng dẫn agent đối chiếu contract spec/02, spec/03, tập trung hóa hàm gọi tại src/lib/api.ts,
  xử lý trọn vẹn 4 trạng thái UI (loading/success/error/empty), bảo vệ giao diện không bị phá vỡ và tự động typecheck.
metadata:
  argument-hint: "[bước tích hợp hoặc tên API, ví dụ: 'Bước 4' hoặc 'POST /api/ingest']"
---

# SimpliFey API Integrator Skill

Skill này hướng dẫn agent thực hiện tích hợp từng API vào giao diện người dùng theo đúng lộ trình chuẩn tại `API_INTEGRATION_PROMPTS.md`, bảo đảm tính **an toàn tuyệt đối**, **chuẩn kiểu TypeScript**, và **không làm phá vỡ giao diện** đã dày công thiết kế.

---

## 1. NGUYÊN TẮC BẤT BIẾN (STRICT SAFETY BOUNDARIES)

1. 🔒 **KHÔNG PHÁ VỠ GIAO DIỆN HIỆN CÓ:**
   - Tuyệt đối **không viết lại cả trang hoặc component từ đầu**.
   - Chỉ thay thế phần mock data tĩnh bằng state nhận từ API. Giữ nguyên toàn bộ cấu trúc Tailwind, class CSS, animation Lottie, và các component con trong `src/components/`.
2. 🔒 **TẬP TRUNG HÓA GỌI API TẠI `src/lib/api.ts`:**
   - Cấm viết `fetch()` rải rác bên trong các component.
   - Mọi lời gọi API bắt buộc phải qua hàm helper có định kiểu rõ ràng trong `src/lib/api.ts` (hoặc custom hooks trong `src/hooks/`), sử dụng `apiFetch`.
3. 🔒 **TUÂN THỦ 100% API CONTRACT:**
   - Chỉ sử dụng các trường dữ liệu được định nghĩa trong `spec/02_CONTRACTS.md` Mục 8 và `spec/03_API_VA_LUU_TRU.md`. Tuyệt đối không tự bịa thêm trường trong Request/Response body.
4. 🔒 **HỖ TRỢ DEV MOCK & BYPASS AUTH:**
   - Kiểm tra cờ `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`: nếu cờ bật và chưa có phiên đăng nhập thật, cho phép nạp mock token/mock user để người dùng có thể test UI trơn tru mà không bị chặn ở màn hình login.

---

## 2. QUY TRÌNH 5 BƯỚC TÍCH HỢP CHO MỖI API

Mỗi khi người dùng yêu cầu tích hợp một bước (ví dụ: *"Tích hợp Bước 4: POST /api/ingest"*), agent bắt buộc tuân thủ 5 bước tuần tự sau:

### BƯỚC 1: XÁC MINH CONTRACT & KIỂU DỮ LIỆU
1. Đọc nội dung yêu cầu tương ứng trong `API_INTEGRATION_PROMPTS.md`.
2. Kiểm tra kiểu dữ liệu trong `spec/02_CONTRACTS.md` (hoặc `@/contracts`):
   - Kiểu Request Body (các trường bắt buộc, trường tùy chọn).
   - Kiểu Response trả về (danh sách các trường hợp lệ).
   - Danh sách mã lỗi riêng của endpoint đó (`spec/02` Mục 9).

### BƯỚC 2: CẬP NHẬT MODULE API CLIENT (`src/lib/api.ts`)
1. Export hàm gọi API tương ứng, ví dụ:
   ```typescript
   export async function ingestRepo(
     data: IngestRequest | FormData
   ): Promise<IngestResponse> {
     const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
     return apiFetch<IngestResponse>("/api/ingest", {
       method: "POST",
       body: isFormData ? data : JSON.stringify(data),
     });
   }
   ```
2. Đảm bảo hàm tự động xử lý Bearer token qua Supabase session và chuẩn hóa lỗi về `ApiError`.

### BƯỚC 3: GẮN API VÀO COMPONENT & XỬ LÝ 4 TRẠNG THÁI UI
Tại component đích, luôn xử lý đủ **4 trạng thái UI**:
1. **Trạng thái Chờ (Loading/Pending):**
   - Vô hiệu hóa nút bấm (`disabled={isLoading}`).
   - Hiển thị spinner, chữ "Đang xử lý...", hoặc skeleton shimmer trên các khối dữ liệu.
   - Chống spam click (debounce hoặc khóa submit).
2. **Trạng thái Thành công (Success):**
   - Đổ dữ liệu thật vào state để component re-render.
   - Cập nhật Store toàn cục (nếu dữ liệu ảnh hưởng toàn app như profile, tokens used).
   - Hiển thị Toast thông báo thành công (nếu là hành động ghi/nộp bài).
3. **Trạng thái Thất bại (Error Handling):**
   - Bắt lỗi dạng `ApiError`.
   - Hiển thị câu thông báo tiếng Việt thân thiện tương ứng với mã lỗi (theo bảng thông điệp tại `spec/30_UI.md` Mục 10).
   - Đặt cờ cho phép thử lại (`retryable`) nếu là lỗi mạng.
4. **Trạng thái Dữ liệu Rỗng (Empty State):**
   - Nếu response là mảng rỗng (ví dụ: chưa có phiên học nào), hiển thị giao diện rỗng đẹp mắt kèm lời kêu gọi hành động (CTA), không để màn hình trống trơn.

### BƯỚC 4: TYPECHECK & BẢO VỆ TOÀN VẸN MÃ NGUỒN
1. Chạy lệnh kiểm tra kiểu tĩnh:
   ```bash
   npx tsc --noEmit
   ```
2. Rà soát đảm bảo:
   - Không xuất hiện kiểu `any` vô căn cứ.
   - Không làm gãy build của các trang khác.
   - Thư mục `src/app/api/` không bị sửa đổi trái phép (trừ khi đang cài đặt chính route handler đó).

### BƯỚC 5: TỔNG KẾT & HƯỚNG DẪN KIỂM THỬ (TEST GUIDE)
Báo cáo ngắn gọn cho người dùng:
1. Danh sách các file đã chỉnh sửa.
2. Hướng dẫn các bước thao tác trên trình duyệt để kiểm tra:
   - Thử luồng thành công (Happy path).
   - Thử luồng báo lỗi (ví dụ: submit form rỗng, nhập sai URL, v.v.).
3. Xác nhận sẵn sàng để chuyển sang Bước tiếp theo trong lộ trình.

---

## 3. BẢNG TRA CỨU HÀNH VI LỖI CHUẨN (`spec/30_UI.md`)

| Nhóm lỗi | Mã lỗi tiêu biểu | Cách xử lý trên UI |
| :--- | :--- | :--- |
| **Xác thực** | `ERR_UNAUTHENTICATED` | Bật modal thông báo "Phiên đăng nhập đã hết hạn" và nút "Đăng nhập lại". |
| **Hạn mức AI** | `ERR_TOKEN_QUOTA_EXCEEDED` | Chuyển thanh đo token sang màu đỏ, khóa ô nhập bài và nút Nộp, cho phép xem đáp án. |
| **Mạng / Server**| `ERR_CLIENT_NETWORK`, `ERR_PERSISTENCE_UNAVAILABLE` | Toast thông báo mất kết nối kèm nút "Thử lại", không trừ lượt làm bài. |
| **Form bài tập** | `ERR_ANSWER_TOO_SHORT`, `ERR_ANSWER_DUPLICATE` | Báo lỗi ngay dưới ô nhập văn bản, rung nhẹ khung input, không gọi API, không trừ lượt. |
| **Đã hoàn tất** | `ERR_QUESTION_FINISHED`, `ERR_ATTEMPT_OUT_OF_SYNC` | Tự động đồng bộ lại câu hỏi từ server và hiển thị toast: "Câu này vừa được hoàn thành". |
