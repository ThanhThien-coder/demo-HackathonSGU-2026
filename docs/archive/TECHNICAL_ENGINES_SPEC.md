# ĐẶC TẢ KỸ THUẬT CÁC ĐỘNG CƠ CỐT LÕI (TECHNICAL ENGINES SPECIFICATION)
## DỰ ÁN: SGU-FEYNMAN

Tài liệu chi tiết hóa 2 trục chuyên môn trong hệ thống:
- **Trục 1:** Thuật toán Đồ thị & Quản trị Trạng thái Backend (Graph & State Engine).
- **Trục 2:** Kỹ thuật AI & Dẫn dắt Hội thoại (AI & Dialogue Flow).

---

# PHẦN 1: TRỤC THUẬT TOÁN ĐỒ THỊ & TRẠNG THÁI (TRỤC SỐ 1 - BACKEND)

*(Ghi chú: Các câu hỏi dưới đây đang trong quá trình Người thứ nhất hoàn thiện, giữ nguyên cấu trúc để cập nhật khi có kết quả chính thức)*

### Câu 1: Cold Start & Lựa chọn Node xuất phát

#### 1. Tiêu chuẩn Chọn Node Gốc & Quy tắc Phá vỡ Thế cân bằng (Tie-breaking Rule)
Khi người dùng bấm "Bắt đầu học", hệ thống phải xác định chính xác một node duy nhất để kích hoạt làm điểm xuất phát:
- **Tiêu chí cốt lõi:** Lọc tất cả các node không có điều kiện tiên quyết (`in-degree == 0` hay `prerequisites.length == 0`).
- **Quy tắc giải quyết khi có $\ge 2$ node gốc (Tie-breaking):**
  - **Ưu tiên 1 (Out-degree Heuristic):** Chọn node có số bậc ra (`out-degree`) lớn nhất — tức node làm nền tảng tri thức cho nhiều node con phụ thuộc phía sau nhất (node "trụ cột").
  - **Ưu tiên 2 (Document Order):** Nếu `out-degree` bằng nhau, chọn node xuất hiện trước theo thứ tự gốc trong tài liệu/slide ban đầu.

#### 2. Thuật toán & Mã giả (Pseudo-code)
```typescript
function findColdStartNode(nodes: ConceptNode[], edges: Edge[]): ConceptNode {
  // Bước 1: Lọc các node không có điều kiện tiên quyết (bậc vào in-degree == 0)
  const rootCandidates = nodes.filter(node => node.prerequisites.length === 0);

  if (rootCandidates.length === 0) {
    throw new Error("Lỗi đồ thị: Tồn tại chu trình, không tìm thấy node gốc!");
  }

  // Trường hợp 1: Duy nhất 1 node gốc -> Kích hoạt ngay
  if (rootCandidates.length === 1) {
    return rootCandidates[0];
  }

  // Trường hợp 2: Có >= 2 node gốc -> Sắp xếp theo out-degree giảm dần
  rootCandidates.sort((a, b) => {
    const outDegreeA = edges.filter(edge => edge.source === a.id).length;
    const outDegreeB = edges.filter(edge => edge.source === b.id).length;
    return outDegreeB - outDegreeA;
  });

  return rootCandidates[0];
}
```

#### 3. Mẫu Câu Mở Lời Của Đứa Trẻ (Tối ưu 0đ Token - Zero Latency)
Để tối ưu chi phí và phản hồi tức thì (<10ms), câu chào đầu tiên không gọi qua LLM mà được tạo bằng chuỗi mẫu tĩnh phía Backend/Frontend:
```typescript
function generateColdStartGreeting(activeNode: ConceptNode): string {
  const greetings = [
    `Chào anh! Hôm nay mình học về '${activeNode.title}' hả anh? Khái niệm này nghe lạ quá, nó là cái gì vậy anh?`,
    `Em sẵn sàng rồi nè! Anh giải thích giúp em '${activeNode.title}' nghĩa là gì được không?`,
    `Ủa anh ơi, '${activeNode.title}' có khó hiểu lắm không anh? Anh giảng cho em dễ hiểu với!`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}
```

### Câu 2: Thuật toán Duyệt Node & Điều kiện Tiên quyết (Dynamic Graph Traversal)

#### 1. Quy mô Phiên học & Khống chế Đồ thị (Golden Rule: $7 \pm 2$ Concepts)
- **Định vị Micro-session:** Một phiên học chỉ giới hạn từ **5 đến 7 khái niệm cốt lõi** trên một chuyên đề hẹp (10-15 phút tập trung). Không nạp cả cuốn giáo trình vào 1 phiên để tránh quá tải nhận thức và tránh làm vỡ giao diện trực quan của ReactFlow.
- **Cơ chế tích lũy nhiều câu chat (Multi-turn Check):** Người dùng có thể giải thích trong 2–3 tin nhắn ngắn. Nhờ Rolling Window ($N=2$), AI đối chiếu tích lũy: khi nào chạm đủ các ý trong `core_facts` và vượt qua thử thách thì Backend mới chốt đổi màu XANH.

#### 2. Thuật toán Duyệt Node Kế tiếp (Kháng Deadlock: Soft-prerequisite Bypass & Root Early Termination)
Khi một node hoàn thành đánh giá, Backend tìm node tiếp theo để kích hoạt theo thứ tự ưu tiên:
1. **Kiểm tra Dừng khẩn cấp (Early Termination):** Nếu Root Node (`in-degree == 0`) bị chốt RED -> Khóa toàn bộ đồ thị.
2. **Ưu tiên 1 (Strict Path):** Kích hoạt node con có 100% cha đạt màu GREEN.
3. **Ưu tiên 2 (Nhánh song song độc lập):** Kích hoạt node GRAY bất kỳ trên đồ thị có 100% cha đạt GREEN.
4. **Ưu tiên 3 (Soft-prerequisite Bypass):** Nếu node cha bị RED, mở khóa node con có tất cả cha thuộc `["GREEN", "RED"]` và gắn cờ `has_unstable_foundation: true` để không bao giờ bị Deadlock đồ thị!

```typescript
function findNextNodeToActivate(
  completedNodeId: string, 
  nodes: ConceptNode[], 
  edges: Edge[]
): ConceptNode | null {
  const completedNode = nodes.find(n => n.id === completedNodeId);

  // 1. Kiểm tra Dừng khẩn cấp: Nếu Root Node (in-degree == 0) bị chốt RED -> Dừng toàn bộ phiên
  const parentEdgesOfCompleted = edges.filter(e => e.target === completedNodeId);
  if (parentEdgesOfCompleted.length === 0 && completedNode?.status === "RED") {
    // Early Termination: Root Node hỏng -> Không mở bất kỳ node nào
    return null;
  }

  // 2. Tìm danh sách các node con trực tiếp của node vừa hoàn thành
  const childEdges = edges.filter(e => e.source === completedNodeId);
  const candidateChildNodes = childEdges.map(e => nodes.find(n => n.id === e.target)!);

  // 3. Ưu tiên 1 (Strict Path): Lọc các node con có 100% cha đạt GREEN
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

### Câu 3: Tiêu chí Đánh giá Mức độ Hiểu & Cơ chế Chuyển màu Node (Evaluation & Deterministic Scoring)

#### 1. Thời điểm sinh Dữ liệu Node & Cấu trúc Dữ liệu Chuẩn
Dữ liệu của các Node được sinh ra tại **Màn 1 (Khởi tạo bài học)** theo 2 nguồn:
- **Nguồn 1 - Nạp Slide/Tài liệu (File Ingestion):** Người dùng upload PDF/Slide $\to$ AI trích xuất khái niệm, quan hệ cha-con (`prerequisites`) và các tiêu chí sư phạm trong 1 lần duy nhất $\to$ Thuật toán Kahn chạy kiểm tra chu trình và khóa thành đồ thị DAG.
- **Nguồn 2 - Bài mẫu dựng sẵn (Preset Templates):** Các bài học kinh điển (Con trỏ trong C++, Cung - Cầu, Định luật Newton...) được lưu sẵn dưới dạng JSON tĩnh để sẵn sàng dùng ngay, đảm bảo demo 100% không phụ thuộc mạng.

**Cấu trúc một Node trong Đồ thị Tri thức:**
```typescript
interface ConceptNode {
  // A. Định danh & Cấu trúc đồ thị (Backend & Frontend)
  id: string;                         // Mã định danh duy nhất (vd: "node_pointer")
  title: string;                      // Tên khái niệm (vd: "Con trỏ")
  prerequisites: string[];            // Danh sách node cha bắt buộc phải XANH trước đó
  status: "GRAY" | "YELLOW" | "RED" | "GREEN"; // Trạng thái màu hiện tại (Mặc định: GRAY)
  retry_count: number;                // Số lần giải thích chưa đạt tại node này (0 -> 3)
  scaffold_level: 1 | 2 | 3;          // Bậc thang giàn giáo nhận thức hiện tại (Khởi tạo: 1)

  // B. Thước đo Sư phạm (Nạp vào Prompt để AI thẩm định)
  pedagogical_spec: {
    core_facts: string[];             // Các ý cốt lõi bắt buộc phải chạm tới (Semantic Anchors)
    forbidden_jargons: string[];      // Danh sách từ khóa hàn lâm mồi (Baseline Jargons)
    common_misconceptions: string[];  // Các lỗi hiểu sai kinh điển cần bắt bẫy
    real_world_anchor: string;        // Mồi tình huống đời thường (Dành cho Giàn giáo Bậc 1)
  };
}
```

#### 2. Cơ chế AI Nhận diện Mức độ Hiểu (Semantic Evaluation vs. String Matching)
- **Tuyệt đối KHÔNG so khớp chuỗi (Exact String Matching):** Hệ thống không dùng regex hay tìm kiếm từ khóa cứng nhắc. `core_facts` đóng vai trò là **"Điểm neo Ngữ nghĩa" (Semantic Anchors)**. Dù người dùng dùng các hình ảnh ẩn dụ khác nhau (*"tờ giấy ghi địa chỉ"*, *"cái hộp ghi số nhà"*, *"mũi tên chỉ nơi cất tiền"*), AI sử dụng năng lực hiểu ngôn ngữ để suy luận: *Ý tứ của người dùng có tương đương về mặt bản chất với `core_facts` hay không*.
- **Cách bắt từ khó (Jargon) nằm ngoài danh sách có sẵn:** Mảng `forbidden_jargons` chỉ là bộ từ khóa mẫu (Few-shot Baseline). Persona AI được cấu hình với vai diễn người bạn học tò mò / đứa trẻ chưa biết gì: *Ngoài các từ trong danh sách, bất kỳ thuật ngữ chuyên ngành, từ viết tắt kỹ thuật hoặc từ ngữ hàn lâm nào mà một người bình thường không hiểu, AI đều tự động nhận diện và trích xuất là từ khó (`detected_jargons`)*.

#### 3. Hệ thống Điểm số Sư phạm (Rubric Scoring) & Xử lý Bẫy "Học vẹt Sách giáo khoa"
Để giải quyết triệt để nguy cơ người dùng copy nguyên văn sách giáo khoa mà không thực sự hiểu, và tránh việc AI phán đoán cảm tính, AI đóng vai trò là **Bộ cảm biến ngữ nghĩa** lượng hóa câu trả lời thành 3 chỉ số điểm cụ thể (thang điểm 0 - 100):
1. **`core_accuracy` (0 - 100):** Mức độ chính xác về mặt bản chất khoa học (đối chiếu với `core_facts`).
2. **`simplicity` (0 - 100):** Mức độ bình dân, mộc mạc (càng ít từ hàn lâm thì điểm càng cao).
3. **`analogy_grounding` (0 - 100):** Mức độ liên hệ thực tế / ví von cụ thể (có ví dụ riêng hoặc giải quyết được tình huống ngoại suy thì điểm cao; chỉ chép lý thuyết suông thì điểm thấp).

**Cấu trúc dữ liệu thẩm định JSON từ AI:**
```json
{
  "scores": {
    "core_accuracy": 90,
    "simplicity": 85,
    "analogy_grounding": 30
  },
  "intent": "EVALUATION", // "EVALUATION" (Trả lời câu hỏi thử thách) | "ELABORATION" (Nói thêm ý, bổ sung ví dụ)
  "misconception_flag": false,
  "detected_jargons": [],
  "extracted_metaphor": "",
  "ai_chat_response": "Anh nói nghe giống trong sách nè! Nhưng mà em chưa tưởng tượng được, anh cho em ví dụ cụ thể đi?"
}
```

#### 4. Bảng Luật Backend Gán Màu (Deterministic Rule Engine)
Backend (Người số 1) áp dụng bộ luật logic tường minh để quyết định chuyển màu Node:

```text
NẾU intent == "ELABORATION":
    --> Giữ nguyên màu VÀNG
    --> KHÔNG tăng retry_count (Người học đang nói thêm ý, giải thích bổ sung)
    --> AI tiếp tục lắng nghe và tiếp nhận ngữ cảnh

NGƯỢC LẠI NẾU misconception_flag == true HOẶC core_accuracy < 50:
    --> Gán màu ĐỎ (Sai bản chất nghiêm trọng / Ngụy biện)
    --> Tăng retry_count += 1
    --> Kích hoạt Mật lệnh phản biện logic sai

NGƯỢC LẠI NẾU detected_jargons.length > 0 HOẶC simplicity < 60:
    --> Gán màu VÀNG (Lạm dụng từ chuyên môn)
    --> Tăng retry_count += 1
    --> Kích hoạt Mật lệnh đòi ví dụ bình dân

NGƯỢC LẠI NẾU core_accuracy >= 70 VÀ analogy_grounding < 60:
    --> Gán màu VÀNG (Bẫy Học vẹt Sách giáo khoa: Đúng lý thuyết nhưng chưa liên hệ thực tế)
    --> Giữ nguyên trạng thái để Đứa trẻ đặt câu hỏi ngoại suy tình huống cụ thể (Application Probe)

NGƯỢC LẠI NẾU core_accuracy >= 75 VÀ simplicity >= 70 VÀ analogy_grounding >= 65:
    --> Chuyển màu XANH (Thấu suốt thực sự: Đúng bản chất + Dễ hiểu + Có liên hệ)
    --> Reset retry_count = 0
    --> Kích hoạt Duyệt Topo để mở khóa Node kế tiếp
```

#### 5. Cơ chế Kháng sai & Bảo vệ Trải nghiệm (Fault Tolerance)
Để đối phó với tình huống "Lỡ AI đánh giá sai lệch", hệ thống thiết lập 3 chốt chặn:
1. **Bản chất vai diễn (Persona Framing):** AI không phải giám khảo phán xét "đậu/rớt". AI là người bạn học tò mò; phản ứng "chưa hiểu" chỉ kích hoạt người học tìm thêm một góc nhìn diễn giải khác, hoàn toàn đúng với tinh thần rèn luyện tư duy Feynman.
2. **Khóa chống bế tắc (Retry Cap = 3):** Nếu sau 3 lần giải thích mà Node chưa Xanh (do người học bí hoặc AI lệch pha), hệ thống tự động cho qua để tiếp tục lộ trình, lưu Node vào danh sách "Lỗ hổng cần phục thù" ở Màn 3.
3. **Minh bạch hóa lý do (Explainability):** Mọi quyết định đổi màu Vàng/Đỏ đều lưu kèm lý do (`detected_jargons`, điểm số thấp ở mục nào) để hiển thị tooltip trên đồ thị và giải trình trong báo cáo cuối phiên.

### Câu 4: Hợp đồng Dữ liệu Kết thúc Phiên (Diagnostic Output Contract)

Khi người dùng hoàn thành 100% đồ thị hoặc chủ động bấm nút "Dừng sớm bài học", Backend tổng hợp toàn bộ trạng thái phiên học thành một đối tượng JSON duy nhất để Frontend (Màn 3) render trực tiếp từ In-Memory Store / LocalStorage mà không cần gọi API tính toán lại:

```typescript
interface DiagnosticReport {
  sessionId: string;
  topicTitle: string;
  durationSeconds: number;
  totalInteractions: number;          // Tổng số câu chat đã trao đổi
  overallMasteryPercent: number;      // % Điểm thấu suốt tổng thể (Số Node Xanh / Tổng Node)

  // Danh sách phân loại Node phục vụ vẽ Mindmap kết quả
  nodesSummary: {
    masteredNodes: string[];          // Danh sách ID các node màu XANH (Nắm vững bản chất)
    weakNodes: string[];              // Danh sách ID các node màu VÀNG (Hiểu nông / Còn dùng từ khó)
    misconceptionNodes: string[];     // Danh sách ID các node màu ĐỎ (Lỗ hổng kiến thức nghiêm trọng)
  };

  // Chi tiết các lỗi để người học ôn tập lại (Targeted Review)
  pedagogicalInsights: {
    nodeId: string;
    nodeTitle: string;
    status: "YELLOW" | "RED";
    reason: string;                   // Vd: "Dùng từ chuyên môn 'dereference' mà chưa diễn giải"
    recommendedReview: string;        // Gợi ý xem lại slide/trang sách liên quan
  }[];

  // Danh sách từ chuyên môn bị bắt lỗi trong toàn bộ phiên học
  flaggedJargonsHistory: string[];
}
```

- **Ưu điểm kiến trúc:**
  - Màn 3 vẽ biểu đồ Radar năng lực, hiển thị danh sách lỗ hổng và nút bấm *"Phục thù lỗ hổng (Retry Red Nodes)"* ngay tức thì (0ms latency).
  - Người dùng có thể bấm nút "Lưu báo cáo" để xuất file JSON / PDF cục bộ mà không cần phụ thuộc máy chủ.

---

# PHẦN 2: TRỤC KỸ THUẬT AI & DẪN DẮT HỘI THOẠI (TRỤC SỐ 2 - AI ENGINE)

### Câu 5: Kiến trúc Tối ưu hóa Hội thoại - $O(1)$ Token Economics

#### 1. Cấu trúc Payload gửi lên Gemini Flash
Một Request gửi đi được chia thành 3 khối phân tách nhiệm vụ rõ ràng:
- **Khối 1: Persona & Cột mốc (Pinned Core - Cố định suốt 1 Node):**
  - Gửi qua trường `system_instruction` của API.
  - **Nhiệm vụ:** Định hình nhân vật (Trẻ 10 tuổi ngơ ngác, tò mò) và Mục tiêu sư phạm (VD: *"Mục tiêu: Hiểu con trỏ lưu trữ địa chỉ"*). AI bắt buộc đối chiếu mọi câu nói của người dùng với mục tiêu này.
  - **Quy tắc giải thích thực hành/code:** Nếu người dùng không thể ví von bằng đồ vật đời thường, nhưng họ nêu đúng cách gõ code, thao tác thực hành, hoặc cách ứng dụng chạy thực tế, hãy chấp nhận đó là một sự giải thích **ĐÚNG**. Đánh `is_valid: true` và bám vào chính thao tác đó để hỏi ngược lại bản chất.
- **Khối 2: Mật Lệnh Đạo Diễn & Điểm neo Ẩn dụ (Dynamic Directives):**
  - Nằm ngay đầu mảng `contents` ở lượt gọi hiện tại.
  - Toàn bộ lệnh điều hướng (từ Backend) và hình ảnh ví von cũ được bọc trong thẻ XML `<DEVELOPER_DIRECTIVE>` để AI không bị "ảo giác" đọc nhầm thành lời người dùng.
  - **Định dạng chuẩn:** `<DEVELOPER_DIRECTIVE> Lệnh: Bám sát ẩn dụ 'Hộp nhựa'. Ép người dùng giải thích tiếp. </DEVELOPER_DIRECTIVE>`
- **Khối 3: Cửa sổ Cuốn chiếu (Rolling Window - Đẩy lùi liên tục):**
  - Kích thước chốt hạ là $N = 2$ lượt hội thoại gần nhất (Tối đa 4 tin nhắn: 2 của User, 2 của AI). Khi tin nhắn thứ 5 xuất hiện, tin nhắn số 1 sẽ bị "pop" (xóa bỏ) khỏi mảng.
  - **⚠️ LƯU Ý BẮT BUỘC (Chống ô nhiễm lịch sử):** Trước khi Backend lưu câu nói của người dùng vào mảng lịch sử (để chuẩn bị cho lượt cuốn chiếu sau), Backend **BẮT BUỘC PHẢI CẮT BỎ** đoạn thẻ `<DEVELOPER_DIRECTIVE>` ra khỏi tin nhắn. Mảng lịch sử chỉ được phép chứa lời nói thuần túy của con người.

#### 2. Hợp đồng Đầu ra JSON (Single-Pass Output Contract - Đồng nhất toàn hệ thống)
Hệ thống sử dụng Single-Pass Prompting. LLM không trả về chuỗi văn bản thông thường mà bắt buộc trả về định dạng JSON theo đúng Schema chuẩn nhất sau đây:

> 📌 **GHI CHÚ LÀM SLIDE (DÀNH CHO TEAM DESIGN/SLIDE):**  
> Đây là Hợp đồng API trung tâm của toàn dự án. Slide phần Kỹ thuật chỉ cần show khối JSON tinh gọn này để chứng minh: 1 lượt gọi API giải quyết đồng thời cả **Chấm điểm Rubric**, **Bắt lỗi sư phạm (Node vs. Ngoại lề)**, **Trích xuất ẩn dụ** và **Sinh câu thoại đứa trẻ**!

```json
{
  "scores": {
    "core_accuracy": 85,          // (0-100) Mức độ chính xác so với core_facts của bài
    "simplicity": 90,             // (0-100) Mức độ bình dân, mộc mạc (càng ít từ hàn lâm càng cao)
    "analogy_grounding": 75       // (0-100) Mức độ liên hệ ví dụ thực tế / vượt qua câu hỏi bait
  },
  "is_valid": true,                // true nếu lượt này đạt chuẩn / false nếu chưa đạt
  "user_surrendered": false,       // BẬT TRUE nếu người dùng bảo "Không biết", "Chịu rồi" (Kích hoạt Dừng khẩn cấp)

  // Phân loại lỗi chính xác (Không phạt nhầm màu Node chính)
  "is_node_misconception": false,  // true: Hiểu sai bản chất Node chính -> GÁN ĐỎ
  "detected_jargons": [],          // Danh sách từ chuyên môn bị phát hiện -> GÁN VÀNG
  "peripheral_misconception": {    // Lỗi kiến thức phụ ngoài lề (Vd: RAM) -> Ghi nhận báo cáo Màn 3, KHÔNG làm Đỏ Node
    "has_error": false,
    "topic": "",
    "description": ""
  },
  "is_off_topic": false,           // true nếu nói nhảm trêu AI -> GÁN VÀNG & Kéo về bài

  // Ngữ cảnh chuyển giao & Lời thoại UI
  "extracted_metaphor": "Hộp nhựa",// Trích xuất ẩn dụ đời thường để Backend lưu trữ bắc cầu
  "ai_chat_response": "Anh ơi vậy cái hộp nhựa đó chứa được cái gì ạ?" // Lời thoại thuần túy in ra màn hình UI
}
```

#### 3. Tại sao kiến trúc này đạt tối ưu tuyệt đối $O(1)$?
- **Triệt tiêu sự phình to tuyến tính ($O(N)$ vs $O(1)$):** Trong ứng dụng chat thông thường, số lượng token tăng tuyến tính $O(N)$ theo mỗi câu nói. Nếu trung bình 1 lượt tốn 30 tokens, đến câu 30 hệ thống phải gửi một cục 900 tokens. Với cấu trúc Rolling Window ($N=2$) kết hợp Pinned Core, tổng lượng tokens đầu vào ở câu thứ 3 hay câu thứ 30 luôn bị khóa cứng ở hằng số $\approx 150$ tokens ($O(1)$).
- **Độ trễ (Latency) thời gian thực:** API của LLM tính tiền và thời gian phản hồi dựa trên số lượng Input Tokens. Việc gông cùm Input Tokens ở mức $\approx 150$ giúp Gemini Flash phản hồi gần như tức thời (dưới 800ms), tạo cảm giác hội thoại real-time.
- **Ngăn chặn trôi dạt ngữ cảnh (Context Drift):** Khi chat dài, người dùng hay lan man. Việc chủ động "chặt đứt" các câu chat cũ và liên tục ép AI nhìn vào `system_instruction` buộc AI phải tự động "kéo" người dùng quay lại đúng trọng tâm bài học ban đầu.

---

### Câu 6: Xử lý Vòng lặp Bắt bẻ khi Vàng/Đỏ (Targeted Re-prompting)

#### 1. Cơ chế lõi (Giật dây sau rèm)
AI không tự đoán mò lỗi. Ở lượt trước, LLM đã trả về JSON báo cáo lỗi (chứa trường `extracted_jargon_or_error`). Dựa vào trường này, Backend sẽ tiêm một **Mật Lệnh Ẩn** bọc trong thẻ XML `<DEVELOPER_DIRECTIVE>` vào ngay trước câu chat của người dùng ở lượt tiếp theo. Thẻ XML giúp AI phân biệt rạch ròi lệnh hệ thống với lời người dùng, triệt tiêu rủi ro rò rỉ prompt ra màn hình.

#### 2. Cấu trúc Mật Lệnh Ẩn theo kịch bản:
- **Kịch bản Node VÀNG (Lạm dụng từ chuyên môn / Jargon):**
  - *Điều kiện:* JSON lượt trước trả về có chứa từ khóa hàn lâm / chuyên ngành.
  - *Mật lệnh tiêm vào Payload:*
    ```text
    <DEVELOPER_DIRECTIVE>
    LỆNH: Người dùng vừa dùng từ khóa khó hiểu: '{từ_khó}'. Bạn đóng vai trẻ 10 tuổi, hãy tỏ ra bối rối với từ này. Yêu cầu họ giải thích lại từ '{từ_khó}' bằng cách ví von với [đồ vật / thức ăn / trò chơi]. KHÔNG lặp lại câu hỏi trước đó. Dưới 30 từ.
    </DEVELOPER_DIRECTIVE>
    ```
  - *Ví dụ AI xuất ra:* *"Ủa anh ơi, 'Cấp phát động' nghe ghê quá, nó có giống lúc mẹ chia kẹo cho mấy anh em không anh?"*

- **Kịch bản Node ĐỎ (Sai bản chất / Lỗi logic):**
  - *Điều kiện:* JSON lượt trước trích xuất được logic sai của người dùng.
  - *Mật lệnh tiêm vào Payload:*
    ```text
    <DEVELOPER_DIRECTIVE>
    LỆNH: Người dùng vừa giải thích sai logic ở điểm: '{lỗi_logic}'. Nhiệm vụ: Tin hoàn toàn vào logic sai đó và đặt một câu hỏi ngoại lệ cực kỳ vô lý để người dùng tự giật mình nhận ra cái sai của họ. Dưới 30 từ.
    </DEVELOPER_DIRECTIVE>
    ```
  - *Ví dụ AI xuất ra:* *"Wow ảo thuật vậy! Nếu anh lột cái nhãn dán vứt đi thì cái hộp đồ cũng tàng hình biến mất luôn hả anh?"*

#### 3. Cơ chế Chống lặp câu hỏi (Anti-Loop) & Khóa Trạng Thái
Để tránh việc AI kẹt trong vòng lặp hỏi đi hỏi lại khi người dùng "cứng đầu" giải thích sai liên tục, Backend duy trì biến đếm `retry_count` (tối đa 3 lần) cho mỗi Node:
- **Lần 1 (Sai):** Backend tiêm lệnh đòi ví dụ thực tế / bẫy logic vô lý (như Kịch bản 1 & 2).
- **Lần 2 (Vẫn sai):** Kỹ thuật *"Gợi ý ngớ ngẩn"* — AI mớm một ví dụ CỐ TÌNH SAI/NGỚ NGẨN để ép người học phải sửa lưng AI:
  - *Mật lệnh:* `<DEVELOPER_DIRECTIVE> LỆNH: Người dùng vẫn bế tắc. Hãy mớm một ví dụ CỐ TÌNH SAI/NGỚ NGẨN để ép họ phải sửa lưng bạn. </DEVELOPER_DIRECTIVE>`
  - *Ví dụ AI xuất ra:* *"Em vẫn không hiểu... 'Cấp phát động' có phải là giống như em tự lấy kéo cắt trụi tóc của em không anh?"* (Buộc người dùng phải đính chính lại để thông tắc tư duy).
- **Lần 3 (Bế tắc):** Chốt ĐỎ & Xin chuyển bài:
  - *Mật lệnh:* `<DEVELOPER_DIRECTIVE> LỆNH: Khóa phần này lại. Hãy tỏ ra chán nản, không muốn học phần này nữa và đòi qua khái niệm mới. </DEVELOPER_DIRECTIVE>`
  - *Ví dụ AI xuất ra:* *"Thôi phần này rắc rối quá em chả hiểu gì hết, não em rối tung rồi, mình học sang phần khác đi anh!"*

#### 4. Luồng Sư phạm: Giải quyết Node bị chốt Đỏ (Targeted Retry)
- **Vì sao cho qua ở Lần 3?** Bản chất Feynman là công cụ **Chẩn đoán**, không phải máy mớm đáp án. Giải thích sai 3 lần nghĩa là hổng kiến thức nghiêm trọng. Cần cho qua để giữ nhịp độ chẩn đoán các node tiếp theo, tránh làm ức chế người học.
- **Cơ chế phục thù (Targeted Retry):** Sau khi kết thúc phiên học, hệ thống xuất Mindmap báo cáo. Node Đỏ bị khóa cảnh báo. Người dùng đóng app, tự ôn tập lại tài liệu, sau đó mở app và chọn *"Phục thù lỗ hổng (Retry Red Nodes)"*.
- *Mật lệnh lúc Retry:*
  ```text
  <DEVELOPER_DIRECTIVE>
  LỆNH: Chào lại người dùng. Nhắc lại hôm trước họ giảng phần '{tên_node}' bạn không hiểu, nay hỏi xem họ có ví dụ nào dễ hiểu hơn chưa.
  </DEVELOPER_DIRECTIVE>
  ```

---

### Câu 7: Kỹ thuật Bắc cầu Chuyển Node (Context Bridging - Metaphor Retention)

#### 1. Vấn đề & Giải pháp Cốt lõi
- **Vấn đề:** Khi chuyển từ khái niệm A sang khái niệm B, nếu AI nói *"Bây giờ mình học sang bài B nhé"*, hội thoại sẽ cụt lủn, máy móc và làm gãy nhịp Feynman (luồng suy nghĩ liên tục).
- **Giải pháp:** Kỹ thuật **"Lưu giữ Ẩn dụ" (Metaphor Retention)**. Backend tái sử dụng chính hình ảnh ví von mà người dùng vừa dùng thành công ở Node A (`extracted_metaphor`) để mớm thành câu hỏi mở bài cho Node B.

#### 2. Cấu trúc Mật Lệnh Chuyển Tiếp (Transition Prompt)
Khi Backend ghi nhận Node A đã đổi màu XANH (`is_valid: true`), Backend lưu `extracted_metaphor`, chuyển active node sang Node B, và tiêm Mật lệnh sau:
```text
<DEVELOPER_DIRECTIVE>
LỆNH CHUYỂN NODE:
Khái niệm vừa học xong: '{node_A}'.
Hình ảnh ví von người dùng vừa dùng: '{user_metaphor}'.
Khái niệm tiếp theo cần học: '{node_B}'.
Nhiệm vụ: Đóng vai trẻ 10 tuổi. Tỏ ra thích thú vì đã hiểu '{node_A}' qua hình ảnh '{user_metaphor}'. Sau đó, dùng CHÍNH HÌNH ẢNH ĐÓ để đặt một câu hỏi ngây ngô dọn đường cho khái niệm '{node_B}'. Tuyệt đối không tự giải thích '{node_B}'. Dưới 30 từ.
</DEVELOPER_DIRECTIVE>
```

- **Ví dụ luồng chạy thực tế:**
  - `node_A`: *"Con trỏ (Pointer)"*
  - `user_metaphor`: *"Cái nhãn dán dán lên hộp đồ"* (Lấy từ JSON lượt trước)
  - `node_B`: *"Giải phóng bộ nhớ (Memory Deallocation)"*
  - **AI xuất ra:** *"À em hiểu rồi, con trỏ chỉ là cái nhãn dán! Nhưng ủa anh ơi, lột cái nhãn dán vứt đi mà anh quên vứt cái hộp đồ, thì rác có chất đầy nhà không anh?"*
  *(Người học lập tức nương theo câu hỏi cực kỳ logic này để giải thích tiếp về Rò rỉ / Giải phóng bộ nhớ).*

#### 3. Cơ chế Dự phòng (Fallback Mechanism) khi Node A bị ĐỎ
Nếu Node A bị chốt ĐỎ (người dùng đầu hàng hoặc sai 3 lần), biến `user_metaphor` bị rỗng (`null`). Backend chuyển sang Mật Lệnh Dự Phòng:
```text
<DEVELOPER_DIRECTIVE>
LỆNH CHUYỂN NODE (DỰ PHÒNG): Người dùng không thể giải thích khái niệm trước. Đóng vai trẻ con, tỏ ra chán nản với khái niệm cũ và tò mò hỏi sang khái niệm mới: '{node_B}'. Dưới 30 từ.
</DEVELOPER_DIRECTIVE>
```
- **Ví dụ AI xuất ra:** *"Thôi cái nhãn dán gì đó rắc rối quá, em không hiểu đâu bỏ qua đi. Thế còn cái 'Giải phóng bộ nhớ' là gì vậy anh, nghe như phim siêu nhân giải cứu thế giới vậy?"*

#### 4. Quy chuẩn Bàn giao cho Backend (Trục 1):
> *"Toàn bộ luồng AI của dự án chạy qua đúng 1 Endpoint duy nhất. Backend không cần parse text, không cần đoán ý. Backend chỉ cần cấu trúc Payload gửi đúng 4 tin nhắn gần nhất (Rolling Window $N=2$). Tùy trạng thái (Bình thường / Bắt bẻ Vàng / Đỏ / Chuyển Node / Dừng khẩn cấp), Backend chọn đúng chuỗi `<DEVELOPER_DIRECTIVE>` tương ứng nhét vào đầu Payload. Gemini Flash luôn nhả về 1 JSON chuẩn Schema để Backend điều hướng FSM và vẽ màu lên UI. Token luôn giữ $O(1)$, luồng chat không bao giờ bị bế tắc hay thoát vai."*

---

# PHẦN 3: BẢN ĐẶC TẢ TÍCH HỢP: CƠ CHẾ GIÀN GIÁO NHẬN THỨC (COGNITIVE SCAFFOLDING) & DỪNG KHẨN CẤP (EARLY TERMINATION)

Để giải quyết bài toán người mới học bị "đơ" hay "trắng não" khi đối mặt với kỹ thuật Feynman từ con số 0, hệ thống đưa vào lý thuyết kinh điển: **Vùng phát triển gần nhất (Vygotsky's Zone of Proximal Development - ZPD)** thông qua cơ chế Giàn giáo 3 bậc thang trên cùng Đồ thị Tri thức (DAG):

```text
[Bậc 1: Kích hoạt liên tưởng] ──► [Bậc 2: Khớp nối logic] ──► [Bậc 3: Tự chủ giảng giải]
    (Priming / Anchoring)            (Bridging / Gap Fill)              (Full Feynman)
```

### 1. Kịch bản Minh họa 3 Bậc (Ví dụ: Quy luật Cung - Cầu trong Kinh tế)
- **Bậc 1: Kích hoạt liên tưởng (Priming - Dành cho người chưa biết gì):**
  - Khi Node ở trạng thái Xám (Chưa khám phá), AI không hỏi định nghĩa lý thuyết mà chủ động ném ra một tình huống đời thường quen thuộc:
    > *"Anh ơi, chiều qua mưa to em thấy mấy cô bán áo mưa ngoài cổng trường tăng giá gấp đôi mà người ta vẫn buôn nhau mua. Sao bình thường bán có 10 ngàn mà mưa xuống lại bán 20 ngàn vậy anh?"*
  - *Nhiệm vụ người học:* Rất nhẹ nhàng, phản hồi theo trực giác: *"Vì lúc đó ai cũng cần gấp mà người bán thì ít"*. Người mới trả lời được ngay mà không quá tải nhận thức.
- **Bậc 2: Khớp nối logic (Bridging - Chuyển Node sang Vàng):**
  - Từ trực giác đó, AI đặt câu hỏi định hướng để người học liên kết với bản chất lý thuyết:
    > *"À, vậy nếu tạnh mưa, không ai mua nữa mà vẫn còn 10 người đứng bán thì giá có bị giảm lại không anh? Cái đó trong bài học gọi là gì?"*
  - Người học nhận ra nguyên lý cân bằng $\to$ Đồ thị chuyển sang màu Vàng (Hiểu mức độ trực giác).
- **Bậc 3: Feynman toàn phần (Full Mastery - Chốt Node Xanh):**
  - Chỉ khi người học qua được Bậc 2, AI mới kích hoạt thử thách chốt chặn để chuyển Node sang màu XANH LÁ:
    > *"Dạ em hiểu rồi! Vậy bây giờ anh tóm lại cho em một câu ngắn gọn: Tại sao giá cả hàng hóa lại tự tăng giảm được mà không cần ai ép buộc?"*
  - Lúc này, người học đã có sẵn chất liệu từ Bậc 1 và Bậc 2 để tự tổng hợp thành lời nói của mình mà không còn sợ "trắng não".

---

### 2. Hợp đồng Dữ liệu (JSON Output - Đồng nhất toàn hệ thống)
AI bắt buộc trả về định dạng JSON chuẩn. Backend dùng các cờ này để điều hướng Máy trạng thái (FSM):

```json
{
  "scores": {
    "core_accuracy": 85,          // (0-100) Mức độ chính xác so với core_facts của bài
    "simplicity": 90,             // (0-100) Mức độ bình dân, mộc mạc
    "analogy_grounding": 75       // (0-100) Mức độ liên hệ thực tế / vượt qua câu hỏi bait
  },
  "is_valid": true,                // true nếu vượt qua Bậc hiện tại, false nếu giải thích sai / dùng từ chuyên ngành
  "user_surrendered": false,       // BẬT TRUE nếu người dùng bảo "Không biết", "Chịu rồi" (Kích hoạt Dừng khẩn cấp)
  "is_node_misconception": false,  // true: Hiểu sai bản chất Node chính -> GÁN ĐỎ
  "detected_jargons": [],          // Danh sách từ khó bị phát hiện -> GÁN VÀNG
  "peripheral_misconception": {    // Bắt lỗi ngoài lề (Vd: RAM) -> Lưu báo cáo Màn 3, KHÔNG làm Đỏ Node
    "has_error": false,
    "topic": "",
    "description": ""
  },
  "is_off_topic": false,           // true nếu nói chuyện phiếm ngoài lề
  "extracted_metaphor": "Ví dụ về mua bán áo mưa", // Lưu lại ngữ cảnh để dùng cho bậc sau
  "ai_chat_response": "Câu thoại của đứa trẻ 10 tuổi..."
}
```

---

### 3. Logic Máy Trạng Thái tại Backend (Nhiệm vụ của Trục 1)
Backend quản lý biến `scaffold_level` (khởi tạo = 1) và biến `retry_count` (khởi tạo = 0) cho mỗi Node.

> **⚠️ LƯU Ý TỐI QUAN TRỌNG (Chống ô nhiễm lịch sử):** Trước khi lưu câu chat của User vào mảng lịch sử (Rolling Window), Backend **BẮT BUỘC PHẢI CẮT BỎ** đoạn thẻ `<DEVELOPER_DIRECTIVE>` ra khỏi câu chat. Lịch sử chỉ được chứa lời thoại thuần túy.

**Luồng chạy của Backend sau khi nhận JSON từ AI:**
1. **Kiểm tra bổ sung ý (Elaboration):**
   - Nếu `intent == "ELABORATION"` (Người học nói thêm: *"Khoan để anh nói thêm..."*, gửi thêm ví dụ hoặc tiếp tục mạch giải thích):
     - Giữ nguyên `scaffold_level` và **KHÔNG TĂNG `retry_count`**.
     - AI tiếp thu và duy trì trạng thái lắng nghe cởi mở.
2. **Kiểm tra đầu hàng hoặc quá số lần thử:**
   - Nếu `user_surrendered == true` (nói "Chịu rồi" hoặc bấm nút "Tạm bỏ qua") HOẶC `retry_count == 3` $\to$ Chốt Node màu **ĐỎ**. Bé Minh tháo ngòi nổ tâm lý nhẹ nhàng (*"Phần này hơi lắt léo, em ghi sổ tay rồi lát anh em mình xem lại sau nha"*). Kích hoạt kiểm tra **Dừng khẩn cấp** (Xem Mục 5).
3. **Nếu chưa đạt (`is_valid == false` khi trả lời câu hỏi thử thách):**
   - Giữ trạng thái Node là **YELLOW** (Dính thuật ngữ / Cần gỡ).
   - Tăng `retry_count += 1`.
   - Nâng `scaffold_level = Math.min(3, scaffold_level + 1)` để Bé Minh tung câu hỏi vặn / tình huống mồi sâu sát hơn theo mô hình Thích ứng (Adaptive Scaffolding).
   - Tiêm lệnh Bắt bẻ tương ứng (Kịch bản Jargon hoặc Kịch bản Sai logic).
4. **Nếu đạt chuẩn (`is_valid == true` VÀ đạt cả 3 điểm Rubric 75/70/65):**
   - Chuyển thẳng trạng thái Node sang **GREEN** (Làm chủ bản chất) ở bất kỳ bậc thang giàn giáo nào!
   - Reset `retry_count = 0`.
   - Trích xuất `extracted_metaphor`, kích hoạt thuật toán duyệt DAG `findNextNodeToActivate` để mở khóa mắt xích tiếp theo.

---

### 4. Bộ Mật Lệnh Tiêm vào Prompt (Nhiệm vụ của Trục 2 - AI)
Dựa vào biến `scaffold_level` do Backend truyền, hệ thống bọc thẻ `<DEVELOPER_DIRECTIVE>` và tiêm lệnh tương ứng vào đầu Payload (kèm Tiêu chí chấm điểm `is_valid` rõ ràng để AI đánh giá chuẩn xác):

- **Bậc 1: Kích hoạt liên tưởng (Priming - Thả Neo):**
  ```text
  <DEVELOPER_DIRECTIVE>
  LỆNH BẬC 1: Bắt đầu bài học '{tên_node}'. Đóng vai trẻ 10 tuổi. KHÔNG ĐƯỢC hỏi định nghĩa lý thuyết. HÃY NÓI RẰNG bạn vừa nghe ai đó ví von '{tên_node}' giống như một [đồ vật/sự việc đời thường]. Hãy nhờ người dùng giải thích cách hoạt động của CÁI ĐỒ VẬT đó. Dưới 40 từ.
  [TIÊU CHÍ CHẤM IS_VALID]: Chấm nương tay. Chỉ cần người dùng giải thích đúng logic của đồ vật đời thường đó, hãy trả về is_valid: true.
  </DEVELOPER_DIRECTIVE>
  ```

- **Bậc 2: Khớp nối logic (Bridging):**
  ```text
  <DEVELOPER_DIRECTIVE>
  LỆNH BẬC 2: Người dùng đã trả lời đúng trực giác. Dựa vào ví dụ '{extracted_metaphor}', hãy lật ngược tình huống hoặc thay đổi 1 điều kiện để ép người dùng phải suy luận sâu hơn, tiến gần đến bản chất của '{tên_node}'. Dưới 30 từ.
  [TIÊU CHÍ CHẤM IS_VALID]: Bắt đầu khắt khe. Nếu lạm dụng từ chuyên ngành đao to búa lớn, đánh is_valid: false.
  </DEVELOPER_DIRECTIVE>
  ```

- **Bậc 3: Chốt chặn Feynman (Mastery):**
  ```text
  <DEVELOPER_DIRECTIVE>
  LỆNH BẬC 3: Người dùng đã hiểu logic. Hãy tỏ ra khâm phục. Yêu cầu họ tóm tắt lại toàn bộ nguyên lý '{tên_node}' bằng MỘT câu ngắn gọn nhất, không dùng ví dụ nữa để chốt lại bản chất. Dưới 20 từ.
  [TIÊU CHÍ CHẤM IS_VALID]: Chấm cực kỳ khắt khe. Người dùng phải chốt đúng trọng tâm lý thuyết. Nếu thiếu ý hoặc sai bản chất, đánh is_valid: false.
  </DEVELOPER_DIRECTIVE>
  ```

---

### 5. Cơ chế "Dừng khẩn cấp" (Early Termination)
Xử lý triệt để trường hợp người học hổng kiến thức nền tảng ngay từ đầu: *"Rễ chết thì không thể mọc ngọn"*.

#### 1. Điều kiện kích hoạt tại Backend:
Khi một Node bị chốt **ĐỎ** (do `user_surrendered == true` hoặc `retry_count == 3`), Backend kiểm tra xem đây có phải là **Node Gốc (Root Node - node có `in-degree == 0` / không có node cha)** hay không:
- Nếu đúng là Node Gốc bị ĐỎ $\to$ Dừng ngay lập tức luồng tăng Node mới, tiêm Mật Lệnh Dừng Khẩn Cấp cho lượt chat cuối.

#### 2. Mật lệnh Dừng Khẩn Cấp:
```text
<DEVELOPER_DIRECTIVE>
LỆNH DỪNG KHẨN CẤP: Người dùng đã thất bại ở khái niệm nền tảng '{tên_node}'. Đóng vai trẻ 10 tuổi, tỏ ra hụt hẫng. Từ chối học tiếp các phần sau với lý do 'cái móng chưa xây sao xây được nóc nhà'. Khuyên họ đóng app, đi đọc lại sách rồi quay lại sau. Dưới 40 từ.
</DEVELOPER_DIRECTIVE>
```

#### 3. Phản ứng trên UI Frontend:
- **Khóa buồng lái:** Disable toàn bộ khung nhập text (không cho gửi thêm tin nhắn).
- **Vẽ bản đồ chẩn đoán (Diagnostic Mindmap):** Render Node Gốc màu **ĐỎ**, tất cả các Node con phụ thuộc phía sau giữ nguyên màu **XÁM** (Bị khóa, không được phép mở).
- **Thông báo sư phạm bôi đỏ cảnh báo:**
  > *"⚠️ Lỗi Nền Tảng: Phiên chẩn đoán kết thúc sớm do hổng kiến thức cốt lõi tại khái niệm ['{tên_node}']. Vui lòng ôn tập lại tài liệu trước khi tiếp tục."*

---

### 6. Tóm tắt Luồng Tích hợp Tổng thể Toàn Hệ Thống
1. **Chống "đơ" cho người mới:** AI chủ động mồi tình huống đời thường quen thuộc (**Bậc 1**).
2. **Chống "học vẹt / lừa AI":** AI ép chốt hạ bản chất lý thuyết bằng một câu tóm tắt đúc kết (**Bậc 3**).
3. **Chống "bệnh sính chữ":** Trong quá trình leo 3 bậc, hễ dùng từ ngữ chuyên môn hàn lâm là bị bẻ gãy ngay bằng cơ chế Giật dây sau rèm & Anti-loop (**Câu 6**).
4. **Bảo vệ tính toàn vẹn sư phạm:** Nếu ngay Bậc 1 của Node nền tảng mà người học bỏ cuộc ("Không biết"), hệ thống kích hoạt **Dừng khẩn cấp (Early Termination)** để tránh lãng phí thời gian.
5. **Độ tin cậy kỹ thuật:** Toàn bộ cơ chế vận hành ngầm trên Backend, cắt bỏ directive chống ô nhiễm lịch sử, duy trì tuyệt đối ngưỡng **$O(1)$ Token** và độ trễ phản hồi dưới 800ms.

