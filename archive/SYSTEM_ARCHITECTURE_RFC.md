# KIẾN TRÚC HỆ THỐNG & ĐẶC TẢ VẬN HÀNH DỮ LIỆU
## DỰ ÁN: SGU-FEYNMAN (HỆ THỐNG LUYỆN TƯ DUY & BẢN ĐỒ LIÊN KẾT NHẬN THỨC)

Tài liệu kỹ thuật chuẩn hóa toàn bộ kiến trúc, cấu trúc dữ liệu và quy trình vận hành hệ thống SGU-Feynman phục vụ Vòng Sơ loại và Vòng Thử thách Hackathon SGU 2026. Văn bản này đóng vai trò là Bản thiết kế hệ thống chính thức (System Spec / RFC), tích hợp Khoa học Nhận thức (Cognitive Science) vào Kỹ thuật Phần mềm thực chiến: chuyển hóa lý thuyết liên kết nhận thức thành mô hình Đồ thị có hướng không chu trình (DAG), cơ chế điều phối trạng thái tất định (FSM), cơ chế vận dụng AI kĩ càng qua 3 giai đoạn, kỹ thuật Bắc cầu ẩn dụ trong 1 lần gọi AI (Single-Pass Metaphor Handover) và đánh giá chẩn đoán cuối phiên học đa chiều.

---

## 1. MÔ HÌNH PHÂN CHIA TRÁCH NHIỆM & CƠ CHẾ VẬN DỤNG AI QUA 3 GIAI ĐOẠN

Hệ thống tuân thủ nguyên tắc Kiến trúc Kết hợp (Hybrid Architecture): Phân định rạch ròi giữa **Sự Tất định của Thuật toán (Backend Engine)** và **Năng lực Xử lý Ngữ nghĩa (Gemini Flash AI)** qua 3 giai đoạn khép kín:

```text
┌────────────────────────────────────────────────────────────────────────┐
│               PHÂN ĐỊNH TRÁCH NHIỆM KỸ THUẬT (SYSTEM ROLES)            │
├──────────────────────────────────┬─────────────────────────────────────┤
│      BACKEND ENGINE (ĐIỀU PHỐI)  │       MÔ HÌNH AI (GEMINI FLASH)     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Lưu trữ Đồ thị Bản đồ Nhận thức│ • Giai đoạn 1: Phân tích file tải   │
│ • Kiểm soát điều kiện tiên quyết │   lên bóc tách khái niệm sinh DAG   │
│ • Quản lý số lần thử & Giàn giáo │ • Giai đoạn 2: Chất xúc tác nhận    │
│ • Quyết định đổi màu Đồ thị      │   thức, chấm Rubric, bắt từ khó,    │
│ • Tìm trước next_candidate_node  │   thả mồi & bắc cầu ẩn dụ           │
│ • Bọc Directive XML điều hướng   │ • Giai đoạn 3: Phân tích toàn diện  │
│ • Quản lý cửa sổ trượt O(1)      │   sinh nhận xét chẩn đoán sư phạm   │
│ • Tính toán chỉ số Radar chẩn đoán│ • Trả về gói tin JSON chuẩn mực    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### 1.1. Giai đoạn 1: Khởi tạo bài học (Ingestion & Curriculum DAG Generation)
1. **Người dùng tải tài liệu (PDF/slide bài giảng) lên:**
2. **AI phân tích nội dung chuyên sâu:** Đọc hiểu tài liệu, trích xuất các thực thể khái niệm trọng tâm cùng mối quan hệ phụ thuộc trước - sau để **tự động sinh ra cây Đồ thị Tri thức ban đầu (Curriculum DAG)**. Đồng thời, AI thiết lập sẵn đặc tả sư phạm (`pedagogical_spec`) cho từng Node gồm:
   - `core_facts`: Các ý bản chất bắt buộc phải chạm tới.
   - `forbidden_jargons`: Danh sách thuật ngữ chuyên môn cấm dùng để ép người học nói mộc mạc.
   - `common_misconceptions`: Các bẫy ngộ nhận logic kinh điển.
   - `real_world_anchor`: Tình huống đời thường chuẩn bị sẵn làm mồi tư duy.
3. **Người dùng kiểm tra & Tinh chỉnh:** Người dùng xem trực quan trên giao diện, chỉnh sửa tên node, thêm/bớt hoặc sắp xếp lại các mối liên kết trước khi khóa sơ đồ bắt đầu học.

### 1.2. Giai đoạn 2: Phiên học tương tác (Interactive Feynman Session)
* **Backend điều phối:** Lưu trữ tiến độ học tập trên cây đồ thị bộ nhớ (In-memory), kiểm soát tính tất định của trạng thái chuyển bài, quản lý hàng đợi cửa sổ trượt (Rolling Window) và tiêm mật lệnh điều hướng ngầm.
* **AI đóng vai trò Chất xúc tác nhận thức (Cognitive Catalyst):** Lắng nghe câu giải thích của người dùng, chấm điểm theo Rubric 3 tiêu chí, phát hiện lỗi ngộ nhận và đưa ra câu hỏi thả mồi hoặc câu hỏi bắc cầu ẩn dụ mở màn bài mới.

### 1.3. Giai đoạn 3: Đánh giá Chẩn đoán Nhận thức Cuối phiên (End-of-Session Diagnostic Evaluation)
Khi phiên học kết thúc (hoặc khi người học bấm nút dừng sớm):
* **Backend tính toán cấu trúc:** Gom nhóm các Node theo độ bền liên kết (Xanh/Vàng/Đỏ), tính toán % bao phủ tri thức và lập ma trận chỉ số đa chiều cho Biểu đồ Radar.
* **AI phân tích chẩn đoán sư phạm:** Đọc tổng thể cây đồ thị kèm các lý do gãy tư duy (`pedagogicalInsights`), sinh ra một đoạn nhận xét sư phạm sâu sắc (Pedagogical Diagnostic Feedback). Đoạn nhận xét này không phán xét đúng/sai chung chung mà chỉ rõ: người học vững tư duy trực giác ở mắt xích nào, bị "nghẽn" bản chất ở mắt xích nào và đề xuất lộ trình cụ thể để người học củng cố năng lực **Siêu nhận thức (Metacognition)**.

---

## 2. CƠ SỞ KHOA HỌC NHẬN THỨC & CÁC CƠ CHẾ ĐIỀU PHỐI ĐỘT PHÁ

### 2.1. Ánh xạ Nhận thức sang Đồ thị Kỹ thuật:
* Mỗi khái niệm được mô hình hóa thành một **"Trạm nhận thức" (`ConceptNode`)**.
* Mỗi liên kết phụ thuộc kiến thức được mô hình hóa thành một **"Đường dẫn tiên quyết" (`Edge`)**.
* Độ bền của liên kết nhận thức được phản ánh qua 4 trạng thái màu của Node:
  * `GRAY` (Chưa kích hoạt)
  * `RED` (Liên kết ngộ nhận / sai lệch bản chất)
  * `YELLOW` (Liên kết yếu / Học vẹt cô lập / Lạm dụng từ chuyên môn)
  * `GREEN` (Liên kết thực tế bền vững / Thấu suốt bản chất).

### 2.2. Cơ chế Giàn giáo Nhận thức 3 Cấp độ (`scaffold_level`) tại 1 Node:
Khi liên kết ở trạng thái yếu (Node mang màu VÀNG), Backend không để AI giải thích hộ mà kích hoạt hệ thống Giàn giáo nhận thức thông qua thẻ `<DEVELOPER_DIRECTIVE>` ở lượt kế tiếp:
* **Cấp độ 1 (Bóc tách từ khó):** AI đóng vai ngây ngô yêu cầu người học làm rõ các thuật ngữ chuyên môn cấm dùng (`detected_jargons`) mà người học vừa nhắc đến.
* **Cấp độ 2 (Thả mồi bối cảnh thực tế - Cognitive Baiting):** Backend tiêm tình huống đời thường (`real_world_anchor`) từ đặc tả sư phạm của Node vào prompt, chỉ thị AI đóng vai trò người gợi mở một lát cắt thực tế để người học tự động não nối kết.
* **Cấp độ 3 (Đối chiếu giả định ngược):** AI đặt tình huống phản nghiệm (Counterfactual question) hoặc lật ngược vấn đề để người học tự nhận diện giới hạn của khái niệm.

### 2.3. Cơ chế Chuyển tiếp Node & Bắc cầu Ẩn dụ (Node Transition & Metaphor Handover):
* **Quy tắc Mở khóa Đồ thị (Topological Prerequisite Gatekeeping):**
  * Một Trạm nhận thức mới (Node B) chỉ được kích hoạt khi **100% các Trạm tiên quyết (Node cha) dẫn vào nó đã đạt trạng thái XANH (`GREEN`)**.
  * Khi đồ thị rẽ nhánh (nhiều Node cùng thỏa mãn điều kiện mở khóa), thuật toán ưu tiên chọn Node có độ lan tỏa cao nhất (**`out-degree` lớn nhất** — tức làm nền tảng cho nhiều khái niệm phía sau nhất).
  * Nếu một Node bị **ĐỎ (`RED`)**, hệ thống lập tức **khóa toàn bộ nhánh phụ thuộc trực tiếp vào Node đó** để tránh xây kiến thức trên nền móng hỏng, đồng thời chuyển hướng người học sang nhánh kiến thức độc lập khác hoặc dừng phiên sớm để báo cáo điểm mù.
* **Kỹ thuật Bắc cầu Ẩn dụ trong 1 lần gọi AI (Single-Pass Metaphor Handover):**
  * Tại Bước 2 (Backend đóng gói Payload), Backend tính toán sẵn `next_candidate_node` và nạp kèm tên + tiêu chuẩn của Node dự kiến đó vào thẻ `<DEVELOPER_DIRECTIVE>`.
  * Khi người học đạt chuẩn XANH ở Node hiện tại, AI sẽ trích xuất hình ảnh ẩn dụ người học vừa dùng (`extracted_metaphor`, vd: "Chiếc áo mưa ngày mưa") và **dùng chính hình ảnh đó để đặt câu hỏi bắc cầu mở màn sang `next_candidate_node` ngay trong cùng một câu phản hồi `ai_chat_response`**.
  * **Hiệu quả:** Mạch tư duy của người học nối dài liên tục giữa các khái niệm mà **chỉ tốn đúng 1 lần gọi API duy nhất**, bảo đảm trải nghiệm sư phạm mượt mà và tiết kiệm chi phí tối đa.

---

## 3. SƠ ĐỒ PHÂN TẦNG HỆ THỐNG (SYSTEM ARCHITECTURE)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG GIAO DIỆN (Client Frontend - React / ReactFlow)                 │
│  - Cột Trái: Cây đồ thị nhận thức (ReactFlow), đổi màu Node (Xám/Vàng/Đỏ)│
│  - Cột Phải: Khung chat văn bản, Avatar đổi biểu cảm SVG theo cảm xúc   │
│  - Báo cáo: Màn hình Mindmap chẩn đoán lỗ hổng khi kết thúc phiên       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP Request { user_message, active_node_id }
┌────────────────────────────────────▼────────────────────────────────────┐
│ 2. TẦNG ĐIỀU PHỐI (Backend Controller & FSM Engine)                     │
│  - Quản lý trạng thái Node: status, retry_count, scaffold_level         │
│  - Quản lý hàng đợi Rolling Window: Giữ đúng 2 lượt chat gần nhất       │
│  - Tìm trước next_candidate_node để chỉ thị bắc cầu ẩn dụ (Handover)    │
│  - Bộ tiêm lệnh ẩn: Bọc chỉ thị giàn giáo trong thẻ <DEVELOPER_DIRECTIVE>│
│  - Thuật toán duyệt Đồ thị: Kiểm tra 100% cha Xanh, ưu tiên out-degree  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Single-Pass Prompting (Input ~150 - 200 tokens)
┌────────────────────────────────────▼────────────────────────────────────┐
│ 3. TẦNG XỬ LÝ NGÔN NGỮ (AI Engine - Gemini Flash)                       │
│  - System Instruction ghim chặt vai diễn Bé Minh và mục tiêu bài học    │
│  - Phân tích độ hiểu, phát hiện từ khó và lỗi logic bản chất            │
│  - Trích xuất extracted_metaphor & nối câu hỏi sang next_candidate_node │
│  - BẮT BUỘC trả về đúng 1 gói tin JSON có cấu trúc (Structured Output) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. CẤU TRÚC DỮ LIỆU CỐT LÕI (DATA SCHEMAS)

Hệ thống vận hành xoay quanh các hợp đồng dữ liệu chuẩn mực:

### 4.1. Cấu trúc Đồ thị & Node Bài học (`ConceptNode`)
Sinh ra tại Màn 1 (lúc nạp slide hoặc chọn bài mẫu). Được lưu trữ trên bộ nhớ RAM Backend:

```typescript
interface ConceptNode {
  // A. Định danh & Cấu trúc liên kết nhận thức
  id: string;                         // Mã định danh duy nhất (vd: "node_supply_demand")
  title: string;                      // Tên bài học hiển thị (vd: "Quy luật Cung - Cầu")
  prerequisites: string[];            // Danh sách ID các trạm nhận thức bắt buộc phải XANH trước đó
  
  // B. Trạng thái động (Backend FSM cập nhật sau mỗi lượt tương tác)
  status: "GRAY" | "YELLOW" | "RED" | "GREEN"; // Độ mạnh của liên kết nhận thức
  retry_count: number;                // Số lần giải thích chưa đạt tại node này (0 -> 3)
  scaffold_level: 1 | 2 | 3;          // Bậc thang giàn giáo nhận thức (Mặc định: 1)

  // C. Tiêu chuẩn Sư phạm (Do AI sinh ở Giai đoạn 1 & nạp vào prompt ở Giai đoạn 2)
  pedagogical_spec: {
    core_facts: string[];             // Ý bản chất cốt lõi bắt buộc phải chạm tới
    forbidden_jargons: string[];      // Danh sách từ chuyên môn cấm dùng mồi
    common_misconceptions: string[];  // Bẫy ngộ nhận / lỗi sai bản chất kinh điển
    real_world_anchor?: string;       // Tình huống đời thường gợi ý mồi (Cognitive Bait)
  };
}

interface Edge {
  id: string;                         // Vd: "edge_supply_to_equilibrium"
  source: string;                     // ID Node cha (Trạm nhận thức tiên quyết)
  target: string;                     // ID Node con (Trạm nhận thức kế tiếp)
}
```

### 4.2. Gói tin JSON AI Trả Về Backend (`AIEvaluationResponse`)
Sau mỗi câu người học gửi đi, AI bắt buộc phản hồi về gói tin JSON chuẩn sau:

```json
{
  // 1. BỘ BA ĐIỂM SỐ RUBRIC (Lượng hóa mức độ hiểu để Backend tính toán)
  "scores": {
    "core_accuracy": 85,          // (0-100) Mức độ chính xác so với core_facts của bài
    "simplicity": 90,             // (0-100) Mức độ bình dân, mộc mạc (càng ít từ khó điểm càng cao)
    "analogy_grounding": 75       // (0-100) Mức độ liên hệ thực tế / vượt qua câu hỏi bẫy
  },

  // 2. KẾT LUẬN LƯỢT CHAT & PHÂN LOẠI Ý ĐỊNH
  "intent": "EVALUATION",          // "EVALUATION" (Người học trả lời thử thách) | "ELABORATION" (Người học nói thêm ý -> Backend KHÔNG tăng retry_count)
  "is_valid": true,                // true: đạt chuẩn lượt này / false: chưa đạt
  "user_surrendered": false,       // true: người dùng bảo "Không biết", "Chịu rồi", hoặc bấm nút "Tạm bỏ qua / Skip"

  // 3. BẮT LỖI SƯ PHẠM RẠCH RÒI
  "is_node_misconception": false,  // true: Hiểu sai bản chất Node chính -> Backend gán màu ĐỎ
  "detected_jargons": [],          // Danh sách từ chuyên môn phát hiện -> Backend gán màu VÀNG
  "peripheral_misconception": {    // Lỗi kiến thức phụ ngoài lề -> Lưu báo cáo, KHÔNG phạt Đỏ Node chính
    "has_error": false,
    "topic": "",
    "description": ""
  },
  "is_off_topic": false,           // true: người dùng nói chuyện phiếm ngoài lề

  // 4. CHẤT LIỆU BẮC CẦU & LỜI THOẠI UI (METAPHOR HANDOVER)
  "extracted_metaphor": "Chiếc áo mưa ngày mưa", // Trích xuất ẩn dụ thành công để nối bài sau
  "ai_chat_response": "Dạ em hiểu rồi! Vậy nếu chiếc áo mưa ngày mưa đó bị rách một chút thì giá trị trao đổi của nó có giống như Khái niệm Giá trị Thặng dư tiếp theo không anh?" // Câu nói hiển thị lên UI, bắc cầu sang Node kế tiếp
}
```

---

## 5. LUỒNG DỮ LIỆU TOÀN TRÌNH (STEP-BY-STEP DATA FLOW)

Mỗi khi người dùng gửi 1 câu giải thích, luồng dữ liệu chạy qua 4 bước khép kín với độ phức tạp ngữ cảnh hằng số $O(1)$:

```text
[BƯỚC 1: FRONTEND GỬI TIN NHẮN]
User nhập câu giải thích cho active_node_id.
Frontend gửi: { user_message, active_node_id: "node_supply_demand" }
       │
       ▼
[BƯỚC 2: BACKEND ĐÓNG GÓI PAYLOAD O(1) & TÍNH TOÁN NEXT CANDIDATE]
1. Truy xuất thông số của active_node_id (core_facts, forbidden_jargons, scaffold_level).
2. Chạy hàm tìm kiếm trước: next_candidate_node = findNextNodeToActivate(active_node_id, nodes, edges).
3. Đóng gói Mật lệnh ẩn bọc trong thẻ XML <DEVELOPER_DIRECTIVE>:
   - Chỉ thị giàn giáo (nếu câu trả lời chưa đạt): scaffold_level (1 -> 2 -> 3).
   - Chỉ thị bắc cầu ẩn dụ (Single-Pass Metaphor Handover): "NẾU người học giải thích đạt chuẩn XANH, hãy trích xuất extracted_metaphor và dùng chính hình ảnh đó để đặt câu hỏi mở màn dẫn dắt sang bài tiếp theo: {next_candidate_node.title}!".
4. Ghép Payload chuẩn gồm 3 khối:
   - Khối 1: System Instruction (Ghim vai đứa trẻ 10 tuổi tò mò + Tiêu chuẩn nhận thức của Node).
   - Khối 2: Mật lệnh XML Directive (Lệnh điều hướng giàn giáo & bắc cầu ẩn dụ).
   - Khối 3: Rolling Window (Chỉ lấy đúng 2 lượt chat gần nhất).
5. Gọi API Gemini Flash (Kích thước Input cố định ~150 - 200 tokens).
       │
       ▼
[BƯỚC 3: AI CHẤM ĐIỂM, TRÍCH XUẤT ẨN DỤ & TRẢ VỀ JSON]
Gemini Flash phân tích câu nói và trả về JSON AIEvaluationResponse:
- Tính toán bộ 3 điểm số scores (core_accuracy, simplicity, analogy_grounding).
- Nhận diện lỗi ngộ nhận và từ khó.
- Nếu đạt chuẩn XANH: Trích xuất extracted_metaphor và tạo câu hỏi bắc cầu sang next_candidate_node trong ai_chat_response.
       │
       ▼
[BƯỚC 4: BACKEND CHẠY BỘ LUẬT GÁN MÀU TOÁN HỌC & ĐIỀU PHỐI CHUYỂN BÀI]
Backend đọc JSON và chạy bộ luật FSM tất định:

1. KIỂM TRA Ý ĐỊNH NÓI THÊM (ELABORATION):
   - NẾU intent == "ELABORATION":
     + Giữ nguyên status = "YELLOW".
     + KHÔNG tăng retry_count.
     + AI tiếp tục lắng nghe ở lượt kế tiếp.

2. ĐÁNH GIÁ ĐẠT CHUẨN XANH (GREEN - LIÊN KẾT BỀN VỮNG):
   - ĐIỀU KIỆN: (scores.core_accuracy >= 75) && (scores.simplicity >= 70) 
               && (scores.analogy_grounding >= 65)
               && (!is_node_misconception) && (detected_jargons.length === 0) 
               && (is_valid === true)
   - HÀNH ĐỘNG:
     + Gán status của active_node_id = "GREEN".
     + Reset retry_count = 0, scaffold_level = 1.
     + Lưu extracted_metaphor vào bộ nhớ bắc cầu phiên học.
     + NẾU có next_candidate_node: Kích hoạt next_candidate_node thành active_node_id mới (status chuyển sang đang học).
     + NẾU không còn node tiếp theo: Đánh dấu hoàn thành toàn bộ Đồ thị!

3. ĐÁNH GIÁ LỖI BẢN CHẤT HOẶC ĐẦU HÀNG (RED - KHÓA NHÁNH PHỤ THUỘC):
   - ĐIỀU KIỆN: (is_node_misconception === true) HOẶC (user_surrendered === true) 
               HOẶC (retry_count >= 3)
   - HÀNH ĐỘNG:
     + Gán status của active_node_id = "RED".
     + Khóa toàn bộ nhánh con phụ thuộc trực tiếp vào node này (cô lập nhánh hỏng).
     + Chuyển hướng sang một nhánh độc lập khác sẵn sàng (nếu có) hoặc dừng phiên sớm.
     + Ghi nhận vào Pedagogical Insights của Báo cáo Chẩn đoán.

4. XỬ LÝ LIÊN KẾT YẾU / HỌC VẸT (YELLOW - TIẾP TỤC GIÀN GIÁO):
   - ĐIỀU KIỆN: Chưa đạt chuẩn Xanh và không vi phạm Đỏ (vd: dính từ chuyên môn hoặc simplicity < 75).
   - HÀNH ĐỘNG:
     + Gán status = "YELLOW".
     + Tăng retry_count += 1.
     + Nâng scaffold_level = Math.min(scaffold_level + 1, 3).

5. TRẢ DỮ LIỆU VỀ CLIENT:
   - Cắt bỏ thẻ XML directive trước khi lưu câu chat vào lịch sử cuốn chiếu (chống ô nhiễm prompt).
   - Gửi sự kiện cập nhật trạng thái về Frontend:
     + ReactFlow cập nhật màu Node trên đồ thị.
     + Khung chat hiển thị câu thoại của Bé Minh (đã bao hàm câu bắc cầu nếu Node vừa chuyển Xanh).
```

---

## 6. BỘ THUẬT TOÁN ĐIỀU PHỐI ĐỒ THỊ BACKEND (GRAPH ALGORITHMS)

Toàn bộ logic chuyển bài đều do 2 hàm giải thuật trên cấu trúc dữ liệu đồ thị kiểm soát tuyệt đối:

### 6.1. Thuật toán Khởi động phiên học (Cold Start)
```typescript
function findColdStartNode(nodes: ConceptNode[], edges: Edge[]): ConceptNode {
  // 1. Lọc các trạm nhận thức không có tiên quyết (in-degree == 0)
  const rootCandidates = nodes.filter(node => node.prerequisites.length === 0);

  if (rootCandidates.length === 1) return rootCandidates[0];

  // 2. Nếu có >= 2 trạm gốc: Chọn trạm làm nền tảng cho nhiều trạm kế tiếp nhất (out-degree cao nhất)
  rootCandidates.sort((a, b) => {
    const outDegreeA = edges.filter(e => e.source === a.id).length;
    const outDegreeB = edges.filter(e => e.source === b.id).length;
    return outDegreeB - outDegreeA;
  });

  return rootCandidates[0];
}
```

### 6.2. Thuật toán Mở khóa Node tiếp theo (Kháng Deadlock: Soft-prerequisite Bypass & Root Early Termination)
```typescript
function findNextNodeToActivate(
  completedNodeId: string, 
  nodes: ConceptNode[], 
  edges: Edge[]
): ConceptNode | null {
  const completedNode = nodes.find(n => n.id === completedNodeId);

  // 1. Kiểm tra Dừng khẩn cấp (Early Termination): Nếu Root Node (in-degree == 0) bị chốt RED
  const parentEdgesOfCompleted = edges.filter(e => e.target === completedNodeId);
  if (parentEdgesOfCompleted.length === 0 && completedNode?.status === "RED") {
    // Root Node hỏng bản chất -> Kích hoạt Early Termination, khóa toàn bộ buồng lái
    return null;
  }

  // 2. Tìm các trạm nhận thức con trực tiếp của node vừa hoàn thành
  const childEdges = edges.filter(e => e.source === completedNodeId);
  const candidateChildNodes = childEdges.map(e => nodes.find(n => n.id === e.target)!);

  // 3. Ưu tiên 1 (Strict Path): Tìm node con có 100% cha đạt GREEN
  const strictChildNodes = candidateChildNodes.filter(childNode => {
    if (childNode.status !== "GRAY") return false;
    const parentEdges = edges.filter(e => e.target === childNode.id);
    return parentEdges.every(e => {
      const parent = nodes.find(n => n.id === e.source);
      return parent && parent.status === "GREEN";
    });
  });

  if (strictChildNodes.length > 0) {
    strictChildNodes.sort((a, b) => {
      const outA = edges.filter(e => e.source === a.id).length;
      const outB = edges.filter(e => e.source === b.id).length;
      return outB - outA;
    });
    return strictChildNodes[0];
  }

  // 4. Ưu tiên 2 (Nhánh song song độc lập): Quét toàn đồ thị tìm node GRAY có 100% cha GREEN
  const parallelReadyNodes = nodes.filter(node => {
    if (node.status !== "GRAY") return false;
    const parentEdges = edges.filter(e => e.target === node.id);
    return parentEdges.length > 0 && parentEdges.every(e => {
      const parent = nodes.find(n => n.id === e.source);
      return parent && parent.status === "GREEN";
    });
  });

  if (parallelReadyNodes.length > 0) {
    parallelReadyNodes.sort((a, b) => {
      const outA = edges.filter(e => e.source === a.id).length;
      const outB = edges.filter(e => e.source === b.id).length;
      return outB - outA;
    });
    return parallelReadyNodes[0];
  }

  // 5. Ưu tiên 3 (Soft-prerequisite Bypass - Kháng Deadlock khi Node nhánh bị ĐỎ):
  //    Nếu node vừa hoàn thành bị RED, mở khóa node con nếu TẤT CẢ cha của nó thuộc ["GREEN", "RED"]
  //    Đồng thời đánh dấu cờ `has_unstable_foundation: true` cho node con
  const bypassChildNodes = candidateChildNodes.filter(childNode => {
    if (childNode.status !== "GRAY") return false;
    const parentEdges = edges.filter(e => e.target === childNode.id);
    return parentEdges.every(e => {
      const parent = nodes.find(n => n.id === e.source);
      return parent && (parent.status === "GREEN" || parent.status === "RED");
    });
  });

  if (bypassChildNodes.length > 0) {
    bypassChildNodes.sort((a, b) => {
      const outA = edges.filter(e => e.source === a.id).length;
      const outB = edges.filter(e => e.source === b.id).length;
      return outB - outA;
    });
    const selected = bypassChildNodes[0];
    selected.has_unstable_foundation = true; // Gắn cờ cảnh báo nhận thức
    return selected;
  }

  return null; // Đã duyệt hết đồ thị hoặc kích hoạt Dừng khẩn cấp
}
```

---

## 7. ĐẶC TẢ BÁO CÁO CHẨN ĐOÁN CUỐI PHIÊN HỌC (DIAGNOSTIC REPORT)

Khi phiên học kết thúc hoặc người học bấm nút tạm dừng sớm, Backend tổng hợp và AI sinh báo cáo chẩn đoán nhận thức toàn diện:

```typescript
interface DiagnosticReport {
  sessionId: string;
  topicTitle: string;
  totalInteractions: number;
  overallMasteryPercent: number;      // % Điểm thấu suốt (Số Node Xanh / Tổng Node)
  
  // 1. Phân loại cấu trúc nhận thức
  nodesSummary: {
    masteredNodes: string[];          // Trạm nhận thức XANH (Liên kết bền vững)
    weakNodes: string[];              // Trạm nhận thức VÀNG (Liên kết yếu / Học vẹt)
    misconceptionNodes: string[];     // Trạm nhận thức ĐỎ (Ngộ nhận bản chất)
  };

  // 2. Dữ liệu trục năng lực cho Biểu đồ Radar (Frontend trực tiếp render)
  radarMetrics: {
    conceptualGrasp: number;          // (0-100) Mức độ thấu suốt bản chất
    intuitiveSimplicity: number;      // (0-100) Khả năng giải thích bình dị không phụ thuộc từ khó
    analogyResilience: number;        // (0-100) Độ vững vàng khi bị hỏi vặn tình huống thực tế
    curriculumCoverage: number;       // (0-100) Độ phủ bài học trên đồ thị
  };

  // 3. Chi tiết chẩn đoán lỗ hổng tư duy chính
  pedagogicalInsights: {
    nodeId: string;
    nodeTitle: string;
    status: "YELLOW" | "RED";
    reason: string;                   // Giải thích nguyên nhân gốc rễ (học vẹt hay hiểu sai tiền đề)
  }[];

  // 4. Điểm mù kiến thức phụ ngoài lề
  peripheralInsights: {
    triggerNode: string;
    topic: string;
    description: string;
  }[];

  // 5. Nhận xét sư phạm tổng kết (Do AI sinh ở Giai đoạn 3)
  aiPedagogicalSummary: {
    strengths: string;                // Điểm sáng nhận thức của người học
    blindSpots: string;               // Phân tích điểm mù tư duy cần cảnh tỉnh
    recommendedAction: string;        // Lộ trình ôn tập gợi mở cho phiên tiếp theo
  };
}
```
