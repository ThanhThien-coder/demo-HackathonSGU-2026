# CẨM NANG KIỂM THỬ DỰ ÁN SIMPLIFEY TRÊN MÁY RIÊNG (LOCAL TESTING GUIDE)

> **Dành cho thành viên nhóm phát triển SimpliFey**  
> Tài liệu này hướng dẫn cách khởi chạy và kiểm thử toàn bộ hệ thống (Frontend, Buồng lái Feynman, Bản đồ lộ trình, Radar Chart BKT 16 kỹ năng, Engine phân tích tĩnh và AI) trực tiếp trên máy cá nhân mà **chưa cần cài đặt PostgreSQL, Supabase hay trả phí Gemini API**.

---

## 1. YÊU CẦU MÔI TRƯỜNG & CHUẨN BỊ
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
- **Trình duyệt**: Chrome, Edge, Firefox, Brave (hỗ trợ tốt nhất trên Chrome/Edge).
- **Mã nguồn**: Clone hoặc pull nhánh mới nhất từ repo.

```bash
# 1. Cài đặt các gói phụ thuộc
npm install
# hoặc: npm ci
```

---

## 2. CẤU HÌNH BIẾN MÔI TRƯỜNG (LOCAL MOCK MODE)

Hệ thống đã tích hợp sẵn cơ chế **Local In-Memory Mock Store** và **Bypass Auth**. Bạn chỉ cần tạo hoặc kiểm tra file `.env.local` ở thư mục gốc:

Tạo file `.env.local` với nội dung tối thiểu sau:
```env
# Kích hoạt chế độ giả lập hoàn toàn (Không cần Supabase / Postgres / Gemini Key)
LOCAL_DEV_MOCK=true
NEXT_PUBLIC_BYPASS_AUTH=true
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

> **Ghi chú:** Khi bạn hoặc đồng đội sẵn sàng triển khai thật (deploy Cloud Run / Supabase), chỉ cần đổi `LOCAL_DEV_MOCK=false` và `NEXT_PUBLIC_BYPASS_AUTH=false`, rồi điền `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` và `GEMINI_API_KEY`.

---

## 3. KHỞI ĐỘNG DỰ ÁN

Chạy lệnh khởi động dev server:
```bash
npm run dev
```
Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 4. CÁC KỊCH BẢN KIỂM THỬ CHỨC NĂNG (TEST WORKFLOWS)

### Kịch bản 1: Màn hình chính & Ingest Repo (`/` & `/roadmap`)
1. **Kiểm tra đăng nhập:** Với `NEXT_PUBLIC_BYPASS_AUTH=true`, bạn sẽ thấy tên người dùng giả lập *"Quý"* và badge danh hiệu BKT trên Header mà không bị chặn ở màn hình đăng nhập.
2. **Nạp Repo (Ingest):**
   - Tại ô nhập GitHub URL, dán: `https://github.com/nquyleee/shop-api` hoặc bất kỳ repo backend nào.
   - Bấm nút **Bắt đầu học**.
   - **Quan sát:** Lớp phủ Ingest hiển thị tiến trình quét (0 token AI, trích xuất cấu trúc thư mục, các hàm entry point, phát hiện framework NestJS/Express).
3. **Danh sách lộ trình:** Tự động chuyển sang `/roadmap`, hiển thị danh sách các khoá học/repo đã phân tích với độ phức tạp và thanh tiến độ.

---

### Kịch bản 2: Buồng Lái Học Tập Cockpit Feynman (`/learn`)
Truy cập trực tiếp `http://localhost:3000/learn?id=demo-session-shop-api` để kiểm tra buồng lái 3 cột:

1. **Cột 1 — Drawer Đồ thị bài học (Lesson Graph):**
   - Bấm vào nút nổi bên trái **"Đồ thị bài học"** (hoặc icon bản đồ).
   - **Quan sát:** Drawer trượt ra mượt mà, hiển thị 7 node kiến trúc phân bố theo các tầng (Presentation, Business Logic, Data Access), các đường mũi tên liên kết không bị chồng chéo.
   - Bấm vào một node khác: Buồng lái chuyển đổi nội dung mượt mà.
2. **Cột 2 — Monaco / Code Snippet Viewer:**
   - Hiển thị lát cắt code thật của hàm entry point kèm số dòng gốc chính xác (theo quy tắc `UI-31`).
   - Nút **Sao chép**: Bấm nút Copy để lấy toàn bộ nội dung lát cắt code vào clipboard.
   - Nút **Trình chiếu (⤢)**: Bấm để phóng to khung code chiếm 65% màn hình và tăng kích thước chữ; nhấn phím `Escape` để thoát.
   - Thẻ cảnh báo **"Điểm dở — Nhận định của AI"**: Hiển thị cảnh báo điểm yếu (VD: N+1 loop bottleneck) mà **tuyệt đối không để lộ cách sửa** (tuân thủ bất biến `INV-06`).
3. **Cột 3 — Trả lời câu hỏi Feynman:**
   - **Kiểm tra độ dài câu:** Nhập thử câu dưới 15 ký tự (VD: *"ngắn quá"*) rồi bấm Nộp -> Hệ thống chặn ngay tại client, báo lỗi câu quá ngắn và **không trừ lượt thử**.
   - **Kiểm tra nộp bài & chấm AI:** Nhập câu trả lời đầy đủ (≥ 15 ký tự, VD: *"Vòng lặp đang thực hiện truy vấn cơ sở dữ liệu tuần tự từng sản phẩm gây nghẽn kết nối I/O nặng nề"*) và bấm **Nộp bài** (hoặc tổ hợp phím `Ctrl+Enter`).
   - **Quan sát Dialog chấm bài:** Hiện điểm **Độ chuẩn xác (Core Accuracy)**, **Độ đơn giản (Simplicity)**, lời nhận xét sư phạm và delta tăng điểm BKT.
   - **Thử nghiệm Bỏ qua (Skip / Reveal):** Bấm "Bỏ qua câu này" -> Hiện xác nhận -> Mở đáp án tham khảo chuẩn kèm gợi ý code sửa.
   - **Thử nghiệm Báo sai (Report Wrong):** Tại câu bị chấm trượt, bấm biểu tượng cờ 🚩 "Báo sai kết quả" -> Nhập lý do -> BKT tự động hoàn tác điểm số.

---

### Kịch bản 3: Hàng đợi phân tích ngầm (Prefetch Queue - D-46)
1. Mở DevTools trình duyệt (phím `F12`), chuyển sang tab **Network**, lọc chữ `analyze`.
2. Tải lại trang `/learn`:
   - Quan sát: Hệ thống chỉ gọi `POST /api/analyze-node` cho node đang mở và tải ngầm 1–2 node kế tiếp theo thứ tự tô-pô.
   - Số lượng request song song luôn $\le 3$ (`CONFIG.ANALYZE_CONCURRENCY`).
3. Chuyển sang node vừa được tải trước: Dữ liệu phân tích hiện ra **ngay tức thì (0ms, không phát sinh thêm request mạng)**.
4. Khi toàn bộ node đã phân tích xong: Hệ thống tự động kích hoạt gọi `POST /api/analyze-overview` đúng 1 lần (quy tắc `UI-74`).
5. Bấm nút **"Tổng quan kiến trúc"** trên Cockpit Header: Modal hiện toàn cảnh hệ thống (Layers, Tech Stack, Design Patterns).

---

### Kịch bản 4: Chế độ Offline Hoàn Toàn (Zero-Network)
1. Nhấn tổ hợp phím **`Ctrl+Shift+D`** trên bất kỳ màn hình nào (hoặc thêm tham số `?offline=1` trên URL).
2. **Quan sát:**
   - Trên thanh Navbar xuất hiện nhãn màu cam: **"Chế độ Offline — dữ liệu ghi lại, không lưu tiến độ"**.
   - Toàn bộ các API học tập (`/api/me`, `/api/ingest`, `/api/enrich-node`, `/api/evaluate-feynman`, `/api/reveal`) bị chặn ở tầng client và chuyển sang nạp từ file fixture `public/demo/mock_bundle.json`.
   - Hệ thống chạy mượt mà ngay cả khi ngắt kết nối WiFi / Internet.
3. Nhấn `Ctrl+Shift+D` lần nữa để trở lại chế độ bình thường.

---

### Kịch bản 5: Báo cáo Năng lực & Mài mòn BKT (`/report`)
Truy cập: **`http://localhost:3000/report`**
1. **Radar Chart 16 kỹ năng SWE:** Biểu đồ đa giác SVG trực quan hóa trình độ BKT trên 16 kỹ năng kiến trúc phần mềm.
2. **Quy luật mài mòn (Decay Warning):**
   - Rê chuột vào các kỹ năng lâu ngày chưa luyện tập: Xuất hiện nhãn **"Đang mài mòn"** (Decaying) cảnh báo điểm đang bị suy giảm theo hàm mũ nửa đời 14 ngày (`CONFIG.DECAY_HALF_LIFE_DAYS = 14`).
3. **Danh hiệu tổng thể (Overall Tier):** Huy hiệu Tập sự (*Novice*), Thực hành (*Practitioner*) hoặc Kiến trúc sư (*Architect*).
4. **Timeline Lịch sử:** Cuộn xuống dưới để xem chi tiết từng lượt làm bài, số lần thử và phản hồi của AI.

---

### Kịch bản 6: Đổi Persona Người Học (Settings Dropdown)
1. Bấm vào Avatar trên Navbar góc trên bên phải -> Mở menu thả xuống.
2. Tại mục **"Hồ sơ người học (Persona Demo)"**, thử chuyển đổi giữa:
   - **Tập sự (Newbie):** Điểm khởi điểm thấp (0.25).
   - **Lập trình viên (Mid-level):** Điểm trung bình (0.50).
   - **Senior lâu năm (Senior Rusty):** Điểm gốc cao nhưng nhiều ngày không ôn tập -> Kích hoạt trạng thái mài mòn (Decay).
3. **Quan sát:** Radar chart và buồng lái tự động thích ứng với trình độ người học tương ứng.

---

## 5. LỆNH KIỂM TRA CHẤT LƯỢNG MÃ NGUỒN (AUTOMATED QUALITY GATES)

Trước khi commit mã nguồn, hãy chạy các lệnh kiểm tra tự động sau trên Terminal:

### 1. Kiểm tra tĩnh kiểu dữ liệu (TypeScript)
```bash
npm run typecheck
```
*Kết quả chuẩn:* **0 errors**.

### 2. Kiểm tra nhanh Unit Tests kỹ thuật
```bash
npx vitest run src/components/code/__tests__/slice-model.test.ts src/lib/__tests__/offline.test.ts
```
*Kết quả chuẩn:* **PASS 2/2 files (11/11 tests passed)**.

### 3. Kiểm tra toàn bộ 550 test cases của dự án
```bash
npm test
```
*Kết quả chuẩn:* Toàn bộ 41 file test chức năng và engine đều vượt qua (550 passed tests).

---

## 6. KHI BẠN SẴN SÀNG TRIỂN KHAI THẬT (PRODUCTION DEPLOYMENT)
Khi bạn muốn chuyển sang dùng Database và AI thật:
1. Mở file `.env.local`.
2. Đổi 2 biến:
   ```env
   LOCAL_DEV_MOCK=false
   NEXT_PUBLIC_BYPASS_AUTH=false
   ```
3. Điền các biến hạ tầng:
   - `DATABASE_URL`: Connection string PostgreSQL từ Supabase (port 6543 pooler).
   - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Lấy từ Supabase Project API Settings.
   - `GEMINI_API_KEY`: API key Google AI Studio (hoặc cấu hình Vertex AI trên Cloud Run).
4. Khởi động lại: `npm run dev` -> Hệ thống sẽ ghi nhận dữ liệu vào Database thật.
