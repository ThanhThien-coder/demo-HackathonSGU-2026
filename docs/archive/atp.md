Dưới đây là tài liệu **CONTEXT TOÀN CẢNH DỰ ÁN (PROJECT MASTER CONTEXT)** được chuẩn hóa dưới dạng Markdown kỹ thuật. Bạn có thể lưu trực tiếp thành file `CONTEXT.md`, `PROJECT_BRIEF.md` hoặc nạp vào `.cursorrules` trong IDE để làm kim chỉ nam nghiên cứu và triển khai code.

---

# PROJECT CONTEXT: SIMPLIFEY V2 PRO (CODEBASE COGNITIVE TWIN)

> **Mục đích tài liệu:** Cung cấp toàn bộ bối cảnh cuộc thi, lịch sử xoay trục ý tưởng (pivot), phân tích đối thủ, các bài học phản biện kỹ thuật đã qua, và đặc tả kiến trúc mục tiêu hiện tại để AI trong IDE phối hợp nghiên cứu, thiết kế schema và lập trình trong vòng thi 24h.

---

## 1. THÔNG TIN DỰ ÁN & BỐI CẢNH CUỘC THI

* **Tên dự án:** **SimpliFey** (Phiên bản nâng cấp: **SimpliFey V2 Pro - Codebase Cognitive Twin**).
* **Vòng thi:** Vòng Chung kết Lập trình 24h (Hackathon).
* **Tình trạng xuất phát điểm:**
* Bị **loại ở vòng chấm điểm sơ loại chuyên môn**.
* Giành vé vớt bước vào vòng chung kết nhờ **Cổng bình chọn trực tuyến qua Áp phích (Poster) trên Fanpage**.


* **Ràng buộc bất biến (Hard Constraints):**
1. **Không đổi tên dự án:** Giữ nguyên thương hiệu `SimpliFey`.
2. **Bảo tồn Visual DNA trên Poster:** Giữ nguyên giao diện Đồ thị có hướng không chu trình (**DAG trên ReactFlow**) với Máy trạng thái 4 màu (**FSM: Xám - Vàng - Đỏ - Xanh**) và **Triết lý Sư phạm Feynman** (Đảo ngược vai trò, giải thích bản chất không dùng thuật ngữ sáo rỗng).
3. **Đập bỏ hoàn toàn:** Nhân vật "Bé Minh 10 tuổi", ví dụ "chiếc áo mưa/hộp quà", và cơ chế chat gõ chữ trả bài lý thuyết phổ thông.



---

## 2. PHÂN TÍCH ĐỐI THỦ & BÀI HỌC VÒNG SƠ LOẠI

### 2.1. Vì sao SimpliFey V1 bị loại ở vòng sơ loại?

1. **Bán "Thuốc bổ" (Vitamin) thay vì "Thuốc giảm đau" (Painkiller):** SimpliFey V1 giải quyết vấn đề "sinh viên học vẹt từ PDF", bắt người dùng gõ chữ giảng bài cho bot. Giám khảo đánh giá đây là rào cản thêm cho người dùng, không có tính cấp bách.
2. **Kỹ thuật mỏng (Prompt Wrapper):** 18 slide thuyết trình thì mất tới 7 slide kể chuyện ngụ ngôn. Luồng dữ liệu chỉ là: `PDF Text -> Prompt -> Gemini -> JSON -> Đổi màu Node`. Hội đồng Khoa CNTT không thấy hàm lượng kỹ thuật phần mềm hay thuật toán phức tạp.

### 2.2. Toàn cảnh các đối thủ vòng trong

* **Các đội đậu trực tiếp:** Đều giải quyết các bài toán sát sườn, định lượng được thiệt hại ngay lập tức (Cảnh báo cháy nổ chung cư, Tuyến đường chống ngập, An toàn thông tin/Phát hiện mạng nguy hiểm, Tối ưu hóa Logistics, Hệ thống tự động ra đề cho giáo viên). Đặc điểm chung: Kiến trúc Data Pipeline rõ ràng, AI Routing, Multi-modal, RAG sâu.
* **Đối thủ đối đầu trực diện — Whybi AI:**
* Mô hình: Cây kỹ năng thông minh + Giảng bài cho AI (hỗ trợ cả Giọng nói & Văn bản) + Bản đồ nhiệt lớp học cho Giảng viên + Thuật toán ghép cặp bạn cùng tiến.
* *Nhận định chiến lược:* Nếu SimpliFey tiếp tục làm EdTech đọc PDF lý thuyết, nhóm chắc chắn thua Whybi AI vì họ đã chiếm trọn không gian này và hoàn thiện hơn về mặt tính năng cộng đồng.



---

## 3. LỊCH SỬ CÁC LẦN XOAY TRỤC (PIVOT LOG & POST-MORTEM)

Trước khi đi đến kiến trúc V2 Pro hiện tại, nhóm đã thảo luận và loại bỏ các hướng đi sau:

| Ý tưởng đề xuất | Cơ chế vận hành | Lý do kỹ thuật bị loại bỏ / Phản biện |
| --- | --- | --- |
| **Pivot 1: AI Viva Simulator** | Giả lập hội đồng chấm thi vấn đáp đồ án | Vẫn nặng về hỏi đáp văn bản, thiếu tính tương tác với cấu trúc hệ thống. |
| **Pivot 2: Incident Fault-Tree** | Nạp PDF biến thành cây sự cố thực tế (Kỹ sư trưởng chữa cháy) | **3 nhược điểm:** (1) Người dùng cay cú vì NPC giả lập quá ngô nghê, (2) Quá khó đối với người mới bắt đầu, (3) Nhanh nhàm chán khi tương tác lâu. |
| **Pivot 3: Game hóa System Design (Teach-to-Simulate)** | Dạy luật cho Bot rồi bấm `Run` chạy 3 Waves thử thách | **Ngụy tạo mô phỏng (Fake Simulation):** Không thể dựng engine toán học thật cho mọi file PDF bài giảng xã hội bất kỳ. Cố biến chữ thành game trong 24h là khiên cưỡng và nửa mùa. |
| **Đề xuất V2 của thành viên nhóm** | Đọc GitHub Repo, nhưng gán $1 \text{ Node} = 1 \text{ File}$ (`order.py`, `auth.py`), bắt lỗi static (`Float`, `SECRET_KEY`), bắt Bé Minh hỏi vặn | **Lỗi nghiêm trọng:** Thực chất là Static Linter (như SonarQube) đội lốt chatbot. Không giúp hiểu Code Design. Người dùng vừa vibe-code xong rất mù mờ về repo mà bị hỏi vặn ngay là phản tác dụng. Bộ nhớ xóa trắng sau mỗi Node. |
| **Lỗi tư duy vừa khắc phục** | Đặt câu hỏi giả định tình huống ngoài repo (*"Nếu mai sau tăng tải 10 lần thì bạn tách luồng thế nào?"*) | **Sai mục tiêu cốt lõi:** Bắt người dùng tự suy luận kiến thức bên ngoài (Message Queue, Worker...) để cải thiện repo, thay vì tập trung **HIỂU THẤU chính cái repo hiện tại đang code cái gì và chạy như thế nào**. |

---

## 4. BẢN THIẾT KẾ HIỆN TẠI: SIMPLIFEY V2 PRO (CHỐT ĐỂ IMPLEMENT)

### 4.1. Tuyên ngôn Cốt lõi (Core Mission)

> **SimpliFey V2 Pro là một "Codebase Cognitive Twin" dành cho Vibecoders và sinh viên IT.**
> Thay vì đọc file PDF rời rạc, hệ thống đọc trực tiếp **GitHub Repository**, mổ xẻ mã nguồn thành các **Lát cắt Kiến trúc (Architectural Slices)**. Mọi tương tác và câu hỏi bị **đóng khung 100% bên trong mã nguồn nội tại** để người dùng hiểu tường tận: *Dữ liệu chạy qua những hàm nào? Tại sao lại thiết kế như vậy? Chỗ nào AI viết hay và chỗ nào AI viết ẩu (Vibe-code Smells)?*

---

### 4.2. Khái niệm then chốt: Node Lai 2 Tầng (Hybrid Architectural Node)

Không chia Node theo từng File riêng lẻ. Mỗi Node trên đồ thị ReactFlow đại diện cho **1 Luồng Nghiệp vụ / Quyết định Thiết kế xuyên file**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   HYBRID ARCHITECTURAL NODE (NODE LAI)                 │
├────────────────────────────────────────────────────────────────────────┤
│ 1. LÁT CẮT THỰC THI (Execution Trace - Luồng chạy xuyên file)          │
│    • Kích hoạt: controller/checkout.ts (Hàm route, validation DTO)     │
│    • Nghiệp vụ: services/orderService.ts (Tính tiền, trừ kho)          │
│    • Dữ liệu: models/order.ts & models/inventory.ts (Query / Mutation) │
├────────────────────────────────────────────────────────────────────────┤
│ 2. HỒ SƠ CODE DESIGN NỘI TẠI (Internal Design X-Ray)                   │
│    • Mẫu thiết kế nhận diện: Dependency Injection, Layered Arch        │
│    • Điểm Hay (Why it works): Tách biệt tầng HTTP khỏi nghiệp vụ tính  │
│    • Điểm Dở / AI Smell: Vòng lặp N+1 Query trong orderService,        │
│      thiếu Transaction Rollback khi trừ tồn kho thất bại               │
└────────────────────────────────────────────────────────────────────────┘

```

---

### 4.3. Quy trình Tương tác 2 Pha (The 2-Phase Mastery Loop)

Loại bỏ nhân vật "Bé Minh". Thay thế bằng **AI Co-Architect** với quy trình phân tách rõ ràng:

1. **Pha 1 — Mổ xẻ Dẫn đường (X-Ray Guided Walkthrough):**
* *Mục tiêu:* Dành cho người dùng chưa nắm vững repo (vừa vibe-code xong).
* *Cơ chế:* Khi click vào Node VÀNG, hệ thống **tuyệt đối không hỏi hay chấm điểm ngay**. Màn hình mở bản đồ giải phẫu luồng chạy, chỉ rõ dữ liệu biến đổi qua từng hàm và phân tích điểm Hay / Dở của đoạn code đó. Người dùng đọc hiểu chủ động.


2. **Pha 2 — Sát hạch Làm chủ (Active Mastery Challenge):**
* *Mục tiêu:* Kiểm chứng độ hiểu bản chất theo nguyên lý Feynman để chuyển Node sang **XANH**.
* *Ràng buộc:* Bảng X-Ray đóng lại. AI **chỉ được hỏi 3 dạng câu hỏi nội tại 100% trong repo**:
* **Dạng 1 (Truy vết Mắt xích):** Dữ liệu từ hàm A truyền sang hàm B qua biến nào?
* **Dạng 2 (Lý do Thiết kế):** Tại sao trong repo này lại tách thành 2 file Service và Controller riêng biệt? Gộp lại thì mất đi lợi ích gì?
* **Dạng 3 (Phê bình Code của AI):** Chỉ vào đoạn code AI viết ẩu (VD: vòng lặp query trong hàm), yêu cầu giải thích bằng lời bình dân tại sao viết vậy làm hệ thống chạy vất vả?





---

### 4.4. Kiến trúc Kỹ thuật Toàn trình (System Architecture)

```text
[CLIENT TIER]
  Next.js (App Router) + @xyflow/react (ReactFlow DAG Canvas) + Zustand Store
  ├─ Cột trái: Bản đồ Kiến trúc Lát cắt (DAG Nodes: Gray, Yellow, Red, Green)
  └─ Cột phải: Buồng lái kép (Tab 1: X-Ray Walkthrough | Tab 2: Feynman Challenge)

[STATIC ANALYSIS & INGESTION TIER] (Deterministic - Chạy thuần code, không tốn Token)
  1. TreePruner: Đọc .gitignore + Blacklist lọc sạch thư mục rác (node_modules, venv...)
  2. Tree-sitter AST Parser: Phân tích cú pháp lấy danh sách hàm, class, import/export
  3. Call-Graph Builder: Xây dựng Đồ thị lời gọi hàm thực tế giữa các file
  4. Centrality Clustering: Dùng thuật toán đồ thị gom các hàm liên đới thành các Lát cắt (Nodes)
  5. Dagre Engine: Tính toán tọa độ phân tầng (x, y) cho ReactFlow

[REASONING & AI CORE TIER] (Gemini 1.5/2.5 Flash qua Structured Outputs)
  - Agent 1 (X-Ray Generator): Sinh bản mổ xẻ luồng chạy & phân tích Design Hay/Dở
  - Agent 2 (Actor-Critic JIT Questioner): Tự gọt giũa câu hỏi phản biện sắc bén theo thời gian thực
  - Agent 3 (Feynman Rubric Judge): Chấm điểm độ nôm na (cấm từ sáo rỗng), độ chính xác logic

[DUAL-MEMORY & PERSISTENCE TIER]
  - Graph FSM: Quản trị trạng thái chuyển màu (Xám -> Vàng -> Đỏ/Xanh)
  - User_Cognitive_State: Tích lũy lỗ hổng Code Design (VD: yếu về Transaction, hổng DI)
  - AI_Calibration_Log: Ghi nhận câu hỏi hỏng hoặc phản hồi sửa sai của người dùng để tự tiến hóa

```

---

### 4.5. Cơ chế Bộ Nhớ Kép & Cá nhân hóa Tự tiến hóa (Dual-Memory Loop)

* **Khắc phục lỗi "mất trí nhớ":** Không xóa trắng bộ nhớ khi qua Node mới.
* **Củng cố xuyên Node (Cross-Node Reinforcement):** Lỗ hổng Code Design phát hiện ở Node trước (VD: hổng về *Separation of Concerns*) được truyền trực tiếp sang làm tham số để sinh câu hỏi cho Node tiếp theo trên một đoạn code mới trong cùng repo.
* **Tự sửa mình (Self-Calibration):** Nếu câu hỏi bị người dùng phản hồi là sai lệch thực tế, AI ghi nhận vào `AI_Calibration_Log` để không lặp lại bẫy tư duy máy móc ở các trạm sau.

---

## 5. BẢN ĐỒ CÔNG NGHỆ (TECH STACK SPECIFICATION)

* **Core Runtime & Web Framework:** Next.js (App Router), TypeScript, Node.js runtime.
* **Visual Graph Engine:** `@xyflow/react` (ReactFlow), `@dagrejs/dagre`.
* **State Management:** `zustand`.
* **Static Analysis & Parsing:** `web-tree-sitter` (hoặc `tree-sitter`), Python AST (nếu chạy hybrid service), `nanoid`.
* **AI SDK & Validation:** `@google/genai` (Gemini Flash), `zod` (ép chuẩn JSON Schema).
* **Styling & Icons:** `tailwindcss`, `lucide-react`, `clsx`, `tailwind-merge`.

---

## 6. MỤC TIÊU NGHIÊN CỨU & TRIỂN KHAI TIẾP THEO (CURRENT FOCUS)

Hệ thống hiện đã hoàn thiện mặt lý thuyết và phản biện kiến trúc. Các tác vụ cần tập trung giải quyết trong IDE ngay lúc này:

1. **Task 1 (Data Contracts):** Viết định nghĩa TypeScript Interface & Zod Schema hoàn chỉnh cho:
* `HybridArchitecturalNode` (chứa execution trace & design x-ray).
* `AIEvaluationResponse` (chứa rubric chấm điểm Feynman & cờ FSM).
* `UserCognitiveState` & `AICalibrationLog`.


2. **Task 2 (Call-Graph Algorithm):** Viết module phân tích cú pháp mã nguồn (AST) để gom nhóm các lời gọi hàm liên kết xuyên file thành cụm lát cắt nghiệp vụ logic.
3. **Task 3 (JIT Question Prompt Engineering):** Thiết kế Prompt System và cơ chế Actor-Critic cho Agent sinh câu hỏi: đảm bảo câu hỏi đóng khung 100% trong repo, kế thừa điểm yếu từ Node trước.
4. **Task 4 (ReactFlow UI Integration):** Dựng custom node ReactFlow hiển thị trạng thái 4 màu và kết nối state với khung Cockpit bên phải.