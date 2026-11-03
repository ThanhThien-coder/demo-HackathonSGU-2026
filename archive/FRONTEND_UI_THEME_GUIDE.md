# HƯỚNG DẪN THIẾT KẾ GIAO DIỆN & THEME CHO FRONTEND DEVELOPER
## DỰ ÁN: SIMPLIFEY / SGU-FEYNMAN (BUỒNG LÁI NHẬN THỨC - COGNITIVE COCKPIT)

Tài liệu này là quy chuẩn thiết kế chính thức (Single Source of Truth về UI/UX) cho hệ thống **SimpliFey**, được đồng bộ trực tiếp từ bản Prototype chuẩn `Cockpit.html`. Tài liệu bao gồm cấu trúc bố cục, hệ thống mã màu (Design Tokens), đặc tả nhân vật SVG "Bé Minh", cơ chế chuyển đổi góc nhìn kép (Bàn học $\leftrightarrow$ Messenger) và luồng Báo cáo Chẩn đoán.

---

## 1. TRIẾT LÝ THẨM MỸ & LÝ DO CHỌN CLEAN LIGHT MODE

Thay vì sử dụng giao diện nền tối (Dark Mode) truyền thống dễ bị bệt màu và lóa mờ khi trình chiếu trên **máy chiếu hội trường lớn (Hội trường lầu 7 khu E - ĐH Sài Gòn)**, SimpliFey áp dụng ngôn ngữ thiết kế **Clean Modern SaaS Light Mode kết hợp Warm Classroom Pastel**:

1. **Độ tương phản tuyệt đối khi Pitching:** Nền sáng (`#F8FAFC`) giúp các đường nối đồ thị DAG, trạng thái màu sắc của Node (Xám / Vàng / Xanh / Đỏ) và chữ trong bong bóng hội thoại nổi bật sắc nét ở khoảng cách nhìn xa 10–15m.
2. **Bối cảnh Sư phạm Gần gũi (1-on-1 Virtual Tutoring Desk):** Xóa bỏ cảm giác "bị máy móc tra khảo" bằng không gian phòng học ấm áp có cửa sổ nắng, đồng hồ, mặt bàn gỗ, cuốn vở mở sẵn và nhân vật Bé Minh ngồi giơ tay phát biểu.
3. **Độ sâu công nghệ (SaaS Tech Depth):** Kết hợp các thành phần công nghệ cao lấy cảm hứng từ **Brilliant.org**, **Duolingo**, **Heptabase** và **Linear** (Thanh đo Jargon HUD thời gian thực, Tô màu từ khóa ngữ nghĩa Semantic Highlighting, Mini Radar Viewport).

---

## 2. SƠ ĐỒ BỐ CỤC GIAO DIỆN (UI LAYOUT WIREFRAME)

### Bố cục Màn hình chính: Buồng lái Chia đôi Tỷ lệ 35% / 65% (Khóa cứng `100vh`)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [SimpliFey] [PROTOTYPE] [Chủ đề: Con trỏ C++]  [Đã hoàn thành: 2/5 ▬▬▬▭▭]        [Kết thúc sớm] │
├───────────────────────────────────┬──────────────────────────────────────────────────────────────┤
│ CỘT TRÁI: BẢN ĐỒ DAG (35% Width)  │ CỘT PHẢI: SÂN KHẤU PHÒNG HỌC & MESSENGER (65% Width)         │
│ (Lưới chấm Radial + ReactFlow)    │ (Khung bo tròn 3xl + Gradient Pastel + View Switcher)        │
│                                   │                                                              │
│ [+] ┌──────────────────┐  [Radar] │ [Lớp học 1 kèm 1 · Bé Minh] [Giơ tay] [Jargon: 12%] [💬 Mess]│
│ [−] │ 📍 Địa chỉ ô nhớ │  [Mini]  │                                                              │
│ [⛶] │    Làm chủ (Xanh)│          │                    ┌───────────────────────────────────────┐ │
│     └────────┬─────────┘          │                    │ Anh ơi, "địa chỉ ô nhớ" là gì         │ │
│        ┌─────┴─────┐              │         ✨ ✋      │ vậy ạ? Sao máy tính cần nó?           │ │
│        ▼           ▼              │      ( ◕ ◡ ◕ )     └───────────────────────────────────────┘ │
│ ┌─────────────┐ ┌─────────────┐   │     ╭─────────╮                                              │
│ │ Toán tử (&) │ │ Toán tử (*) │   │  ═══╧══📖══🖊️═╧═══  ┌──────────────────────────────────────┐ │
│ │ Đang học    │ │ Chưa duyệt  │   │  [Bàn học gỗ ấm]    │ Ví như số nhà của bạn: máy tính cần  │ │
│ └──────┬──────┘ └──────┬──────┘   │                     │ số nhà để biết đồ cất ở ô nào.       │ │
│        └───────┬───────┘          │                     └──────────────────────────────────────┘ │
│                ▼                  │                                  [Đạt] [Gia sư (Bạn)]        │
│        ┌───────────────┐          ├──────────────────────────────────────────────────────────────┤
│        │ Stack vs Heap │          │ [🟢 Demo Giảng chuẩn] [🟡 Demo Thuật ngữ] [🔴 Demo Sai logic]│
│        └───────────────┘          ├──────────────────────────────────────────────────────────────┤
│                                   │ [📓 Hướng dẫn cho bé Minh bằng ví dụ đời thường... ] [ Gửi ] │
│ [● Chưa duyệt] [● Làm chủ] [...]  │                                                              │
└───────────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 3. BẢNG MÃ MÀU & DESIGN TOKENS (TAILWIND CSS & HEX CODES)

### 3.1. Màu nền & Bề mặt (Surfaces & Backgrounds)
* **Nền tổng thể (App Body):** `#F8FAFC` (`bg-slate-50`, chữ chính `text-slate-800`)
* **Nền Cột Trái (DAG Canvas):** `#F8FAFC` phủ lưới chấm bi `bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:18px_18px]`
* **Nền Cột Phải (View 1 - Phòng học 1 kèm 1):** Gradient ấm `bg-gradient-to-b from-indigo-50/50 via-slate-50 to-amber-50/30`, chân tường gỗ `from-amber-100/70 to-amber-100`
* **Nền Cột Phải (View 2 - Nhật ký Messenger):** Kính mờ `bg-slate-100/95 backdrop-blur-sm`

### 3.2. Bảng Trạng thái Node Chuẩn (Single Source of Truth: GRAY | YELLOW | GREEN | RED)

Toàn bộ hệ thống Backend, Tài liệu và Frontend `Cockpit.html` chỉ dùng duy nhất 4 trạng thái:

| Enum Trạng thái | Nhãn Hiển thị | Màu Viền / Icon | Màu Nền Card | Hiệu ứng Thị giác & Hành vi |
| :--- | :--- | :--- | :--- | :--- |
| **`GRAY`** | Chưa duyệt | `#94A3B8` (Slate) | `#FFFFFF` | Node chưa đủ điều kiện tiên quyết hoặc chưa đến lượt học. Icon nền `#F1F5F9`. |
| **`YELLOW`** | Đang phỏng vấn / Dính thuật ngữ | `#F59E0B` (Amber) | `#FFFBEB` | Đang phỏng vấn hoặc giải thích chưa đạt, hiển thị bộ đếm `thử lại 1/3` (hoặc `2/3`). Viền phát sáng amber. |
| **`GREEN`** | Làm chủ bản chất | `#10B981` (Emerald)| `#F0FDF4` | Vượt qua 3 tiêu chuẩn Rubric (75/70/65). Icon xanh ngọc `#D1FAE5`, mở khóa mắt xích tiếp theo. |
| **`RED`** | Sai bản chất / Điểm mù | `#EF4444` (Rose) | `#FEF2F2` | Hết 3 lượt thử hoặc đầu hàng / sai bản chất cốt lõi. Root Node $\to$ Early Termination; Branch Node $\to$ Soft-prerequisite Bypass. |

### 3.3. Bảng màu Tô sáng Ngữ nghĩa (Semantic Highlighting trong Bubble)
Khi người học gửi câu giải thích, hệ thống tự động quét và bọc thẻ `<span>` tô sáng trực tiếp các từ khóa bên trong bong bóng màu Indigo (`bg-indigo-600`):
* **Từ khóa Ẩn dụ Đời thường (Metaphors):** `bg-emerald-300/30 text-emerald-100 font-bold px-1 rounded underline decoration-emerald-300`
* **Từ khóa Thuật ngữ Hàn lâm (Jargons):** `bg-amber-300/30 text-amber-100 font-bold px-1 rounded underline decoration-wavy decoration-amber-300`

### 3.4. Typography (Phông chữ)
* **Phông chữ giao diện & Hội thoại:** `Inter`, sans-serif (Độ đậm `400`, `500`, `600`, `700`, `800`).
* **Phông chữ số liệu & Telemetry HUD:** `JetBrains Mono`, monospace (Dùng cho bộ đếm ký tự `0/250`, chỉ số `Jargon Risk: 12%`, `Node 2/5`, và điểm `Feynman Score`).

---

## 4. ĐẶC TẢ CHI TIẾT CÁC COMPONENT CỐT LÕI (COMPONENT SPECS)

### 4.1. Cột Trái: Bản đồ Tri thức DAG (`DagCanvas.tsx`)
* **Kích thước Node (`ConceptNode`):** Rộng `164px`, padding `8px 10px`, bo góc `12px` (`rounded-xl`), bóng đổ nổi khối nhẹ. Khi hover tự động nhấc nhẹ lên (`transform: translate(-50%, -52%)`).
* **Đường nối SVG (`BezierEdge`):**
  * Các node thường: Đường cong Bézier màu `#CBD5E1`, độ dày `2px`.
  * Node đang phỏng vấn (`active`): Đổi sang màu `#3B82F6`, độ dày `2.5px`, áp dụng class `.flow` (`stroke-dasharray: 7 7` chạy liên tục về phía node con).
* **Cụm Điều khiển Nổi (Floating Dock & Radar):**
  * Góc trên bên trái: 3 nút kính mờ (`w-7 h-7 rounded-lg bg-white/90 backdrop-blur`): Phóng to (`+`), Thu nhỏ (`-`), Vừa màn hình (`⛶`).
  * Góc trên bên phải: Khung **Mini Radar** (`w-20 h-16`) mô phỏng vị trí tổng thể các chấm node trên đồ thị, có chấm xanh nhấp nháy (`animate-ping`) tại node đang học.
* **Popover Chẩn đoán Nhanh:** Khi click vào bất kỳ node nào trên đồ thị, hiển thị một hộp thoại nhỏ (`#popover`) giải thích lý do vì sao node đó đạt hoặc bị phạt màu Vàng/Đỏ.

### 4.2. Cột Phải - View 1: Phòng học 1 kèm 1 & Nhân vật Bé Minh (`ClassroomStage.tsx`)
Toàn bộ nhân vật Bé Minh và bàn học được dựng bằng **Inline SVG** (`viewBox="0 0 520 440"`), hoạt động 100% offline không phụ thuộc file ảnh ngoài, điều khiển qua thuộc tính `data-e` trên thẻ `<svg>`:

| Mã `data-e` | Trạng thái Backend | Biểu cảm & Cử chỉ Tay SVG | Huy hiệu Trạng thái (`#badge`) |
| :--- | :--- | :--- | :--- |
| **`C`** | `CURIOUS` (Mặc định) | Đầu nghiêng nhẹ `-2deg`, mắt chớp tự nhiên (`.blink`), **tay phải giơ cao vẫy nhẹ (`.wave`)**, ngôi sao vàng lấp lánh cạnh bàn tay | `Giơ tay hỏi` (`#2563EB`) |
| **`T`** | `THINKING` (Chờ API) | Đầu nghiêng `6deg`, mắt ngước nhìn lên suy ngẫm, một tay chống cằm, bong bóng 3 chấm tròn nảy liên tục | `Đang suy nghĩ...` (`#64748B`) |
| **`J`** | `CONFUSED` (Dính Jargon)| Đầu nghiêng `-8deg`, hai mắt xoáy tròn (`.spin`), **tay đưa lên gãi đầu (`.scratch`)**, bong bóng xoắn ốc rối rắm trên đầu | `Ngơ ngác` (`#D97706`) |
| **`S`** | `SKEPTICAL` (Sai logic) | Lông mày nhíu chặt, mắt hẹp, miệng bĩu, **hai tay khoanh trước ngực** | `Nghi ngờ` (`#DC2626`) |
| **`H`** | `HAPPY` (Thấu suốt) | Mắt cười cong hình trăng khuyết, miệng cười tươi, **hai tay vỗ tay (`.clap`)**, bóng đèn sáng bừng trên đỉnh đầu | `Thích thú` (`#059669`) |

* **Kích thước Bong bóng Hội thoại (Speech Bubbles):**
  * **Bong bóng Bé Minh (`#minhBubble`):** Nằm ngay cạnh tay giơ (`left-[62%] bottom-[76%]`), rộng tối đa `430px`, nền trắng viền xanh nhạt, cỡ chữ to rõ **`18px` (`font-bold text-slate-800`)**.
  * **Bong bóng Gia sư (`#userBubble`):** Nằm góc dưới bên phải đối diện (`right-6 bottom-5`), rộng tối đa `390px`, nền `bg-indigo-600 text-white`, cỡ chữ **`16px` (`font-medium leading-relaxed`)**, kèm huy hiệu kết quả chấm ngay bên dưới.

### 4.3. Cột Phải - View 2: Nhật ký Phản biện Messenger (`MessengerFeed.tsx`)
* **Nút chuyển đổi góc nhìn (`#btnToggleView`):** Đặt cố định ở góc trên bên phải của khung phòng học (`💬 Xem dạng Messenger` $\leftrightarrow$ `🏫 Trở lại bàn học`).
* **Hiệu ứng chuyển cảnh (Cross-fade & Blur Motion):**
  * Không dùng `display: none` (`hidden`) gây giật cục. Sử dụng 2 lớp CSS `.view-active` (`opacity: 1; scale(1); blur(0px)`) và `.view-inactive` (`opacity: 0; scale(0.96); translateY(12px); blur(4px)`) với `transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1)`.
* **Cấu trúc Dòng thời gian (Audit Trail):**
  * Lưu trữ chính xác 100% các lượt hỏi đáp trong mảng `S.history`.
  * Phân cách rõ từng mắt xích (`MẮT XÍCH: ĐỊA CHỈ Ô NHỚ · LƯỢT 1`).
  * Hiển thị 3 khối đồng nhất độ rộng (`max-w-[85%]`, cỡ chữ `15px`): (1) Câu hỏi của Bé Minh $\to$ (2) Câu trả lời của Gia sư (kèm Semantic Highlighting và nhãn `ĐẠT BẢN CHẤT` / `DÍNH THUẬT NGỮ` / `SAI LOGIC`) $\to$ (3) Khối phản hồi cảm xúc của Bé Minh được tô màu nền theo kết quả (Xanh ngọc / Vàng hổ phách / Đỏ san hô).

### 4.4. Thanh HUD Đo lường Nhận thức & Khung Nhập liệu (`TelemetryAndInput.tsx`)
* **Cognitive Telemetry HUD:** Đặt trên thanh điều hướng của sân khấu, hiển thị thanh ngang `Jargon Risk` nhảy số phần trăm động (Xanh khi $\le 60\%$, chuyển Vàng cam khi $> 60\%$).
* **Khung nhập liệu kiểu Sổ tay Gia sư:** Có 2 chấm tròn gáy sổ màu vàng hổ phách bên trái, ô input giới hạn `250` ký tự để ép người học diễn đạt súc tích, hỗ trợ nhấn `Enter` để gửi nhanh.
* **Thanh Nút Demo Nhanh (Cheat Toolbar cho Ban Giám khảo):** 3 nút bấm (`🟢 Giảng chuẩn`, `🟡 Dính thuật ngữ`, `🔴 Sai logic`) giúp người thuyết trình bơm ngay câu trả lời mẫu vào ô chat trong 0.25s khi đứng trên sân khấu.

### 4.5. Modal Báo cáo Chẩn đoán & Luồng Phục thù (`DiagnosticReportModal.tsx`)
Khi hoàn thành 100% đồ thị, bấm "Kết thúc sớm", hoặc bị **Dừng khẩn cấp (Early Termination)** do hỏng Root Node, hệ thống bật Modal Báo cáo Màn 3:
* **Biểu đồ Vòng tròn SVG (`Feynman Score`):** Vòng tròn tiến độ `stroke-dasharray="314"` chạy animation mượt mà hiển thị điểm số tổng kết trên thang 100.
* **Bảng Phân tách 2 Cột:**
  * Bên trái: **Mắt xích vững chắc** (Danh sách các node Xanh lá).
  * Bên phải: **Điểm mù nhận thức** (Danh sách các node Vàng/Đỏ kèm nguyên nhân chi tiết từ `diagnostic_reason` và lỗi kiến thức phụ `peripheral_misconception`).
* **3 Nút Hành động ở Chân Modal (Closure Actions):**
  1. `🏠 Về trang chủ`: Reset phiên và quay lại màn hình chọn bài học.
  2. `📥 Lưu báo cáo (PDF/JSON)`: Kết xuất báo cáo trực tiếp tại trình duyệt (Client-side `window.print()` hoặc tải file `.json` 0đ chi phí server).
  3. `🎯 Phục thù lỗ hổng (N)`: Chỉ xuất hiện khi có Node Đỏ (`misconceptionNodes.length > 0`). Khi bấm vào, đưa buồng lái về **Chế độ Phục thù** (làm mờ các node Xanh, chỉ khóa mục tiêu vào các node Đỏ để gỡ điểm).

---

## 5. CHECKLIST BÀN GIAO CHO FRONTEND KHI RÁP CODE THẬT

- [ ] **Giữ nguyên bộ SVG trong `Cockpit.html`:** Copy nguyên vẹn hàm `avatarSVG()` và các class animation (`.wave`, `.scratch`, `.clap`, `.spin`, `.blink`) từ file `Cockpit.html` sang component `PersonaAvatar.tsx`.
- [ ] **Ánh xạ dữ liệu API:** Khi nhận gói tin `AIEvaluationResponse` từ Backend FastAPI, cập nhật đồng thời:
  - Màu sắc của Node trên DAG Canvas.
  - Biểu cảm của Bé Minh (`data-e`).
  - Mảng lịch sử `history` trong Zustand Store để View Messenger luôn đồng bộ.
  - Chỉ số `hudJargonVal` dựa trên điểm `100 - scores.simplicity`.
- [ ] **Tích hợp âm thanh Web Audio API:** Giữ lại module `AudioFX` (synthesizer thuần bằng code, không cần file mp3) để phát tiếng *pop* khi gửi tin nhắn và tiếng *chime* khi Node chuyển sang màu Xanh lá.