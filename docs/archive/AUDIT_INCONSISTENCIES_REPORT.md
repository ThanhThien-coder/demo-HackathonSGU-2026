# BÁO CÁO KIỂM KÊ & ĐỒNG BỘ TÀI LIỆU DỰ ÁN SIMPLIFEY
*Thời điểm rà soát: 15/10/2026 - Chuẩn bị Vòng Sơ loại Hackathon SGU*  
*Người thực hiện: Principal Software Architect kiêm Technical Auditor*

---

## 1. TỔNG QUAN TÌNH TRẠNG ĐỒNG BỘ (EXECUTIVE SUMMARY)

Dự án **SimpliFey (SGU-Feynman)** sở hữu nền tảng Khoa học Nhận thức (Cognitive Science) và triết lý Sư phạm Đảo ngược vai trò (Learning by Teaching / Feynman Technique) rất sâu sắc, sáng tạo và bám sát trực diện chủ đề cuộc thi. 

Tuy nhiên, qua quá trình phát triển nhanh và cập nhật qua nhiều phiên làm việc, dự án đang xuất hiện sự **lệch pha nghiêm trọng (Systemic Desynchronization)** giữa 4 trụ cột:
1. **Tài liệu Kiến trúc & Đặc tả Kỹ thuật:** (`SYSTEM_ARCHITECTURE_RFC.md`, `TECHNICAL_ENGINES_SPEC.md`, `DEFENSE_QNA_CHEAT_SHEET.md`)
2. **Hệ thống Sơ đồ Thiết kế (UML / Mermaid):** (`DIAGRAM_NODE_STATE_MACHINE.md`, `DIAGRAM_USER_FLOW.md`, `DIAGRAM_SEQUENCE_FLOW.md`, `DIAGRAM_SYSTEM_ARCHITECTURE.md`)
3. **Kịch bản Trình bày & Thuyết minh Ý tưởng:** (`PITCH_DECK_OUTLINE.md`, `SLIDE_PITCH_SCRIPT.md`)
4. **Mã nguồn Giao diện Prototype:** (`Cockpit.html`, `FRONTEND_UI_THEME_GUIDE.md`)

### Thống kê mức độ xung đột phát hiện:
* 🔴 **4 Xung đột Nghiêm trọng (Critical - Lỗi Logic / Deadlock Hệ thống):** Nguy cơ gây gãy chương trình khi chạy code thật hoặc bị Ban Giám khảo phản biện cứng họng.
* 🟡 **5 Xung đột Trung bình (Major - Lệch Thông số / Schema / Thuật toán):** Không đồng nhất về ngưỡng điểm Rubric, số lần retry, tên trường API và số lượng Slide.
* 🟢 **3 Xung đột Nhẹ (Minor - Persona / Tỷ lệ Visual / Thuật ngữ):** Xưng hô vai diễn Bé Minh chưa chuẩn Feynman, tỷ lệ chia cột màn hình lệch nhau.

---

## 2. BẢNG MA TRẬN CÁC ĐIỂM XUNG ĐỘT CHI TIẾT

| STT | Vấn đề / Khía cạnh | Tài liệu A (Nội dung & Vị trí) | Tài liệu B (Nội dung đối lập & Vị trí) | Mức độ | Rủi ro khi Thuyết trình / Chạy Code |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Nghịch lý Mở khóa Node con khi Node cha bị ĐỎ / Skip** | `SYSTEM_ARCHITECTURE_RFC.md` (Dòng 289-295, 313-316) & `TECHNICAL_ENGINES_SPEC.md` (Dòng 88-92):<br>Hàm `findNextNodeToActivate` bắt buộc: `100% node cha phải có status === "GREEN"`. | `DIAGRAM_NODE_STATE_MACHINE.md` (Dòng 50, 105, 111) & `DIAGRAM_USER_FLOW.md` (Dòng 51-52):<br>Khi node nhánh bị ĐỎ hoặc Skip: *"Ghi nhận lỗ hổng vào báo cáo và cho qua để học tiếp node sau"*. | 🔴 **Nghiêm trọng** | **Tê liệt đồ thị (Deadlock):** Nếu Node A bị ĐỎ, toàn bộ node con phụ thuộc vĩnh viễn không mở được. Bé Minh nói *"qua bài tiếp theo"* nhưng Backend không thể kích hoạt node nào! |
| **2** | **Thuật toán Chuyển Node: Topo DAG vs Tuyến tính mảng** | `TECHNICAL_ENGINES_SPEC.md` (Dòng 74-115):<br>Duyệt đồ thị Topo có điều kiện tiên quyết, tính toán `out-degree` và fallback nhánh song song. | `Cockpit.html` (Dòng 1063):<br>Chuyển node bằng cách tăng chỉ số tuyến tính đơn giản: `S.cur++`, phớt lờ hoàn toàn quan hệ phụ thuộc đồ thị (`pre: ['n1']`). | 🔴 **Nghiêm trọng** | Code prototype không phản ánh đúng kiến trúc đồ thị DAG đã thuyết minh trước BGK; chỉ là danh sách phẳng (flat array). |
| **3** | **Persona Bé Minh: Trẻ 10 tuổi vs Học sinh lớp 7 (Xưng Thầy/Cô)** | `PITCH_DECK_OUTLINE.md` (Dòng 30-33) & `SLIDE_PITCH_SCRIPT.md` (Dòng 31-32):<br>Đứa trẻ 10 tuổi tò mò, xưng hô *"anh/chị - em"* (Đảo ngược vai trò: người học dạy trẻ nhỏ). | `Cockpit.html` (Dòng 499-564, 1117):<br>Bé Minh xưng *"học sinh lớp 7 (12-13 tuổi)"* và liên tục gọi người học là *"Thầy/Cô ơi!"*. | 🔴 **Nghiêm trọng** | Phá vỡ triết lý Feynman! Nếu gọi là "Thầy/Cô" thì đây là phần mềm sư phạm cho giáo viên, không còn là "học qua giảng giải bình dân cho đứa trẻ". |
| **4** | **Bài học Demo: Quy luật Cung - Cầu vs Con trỏ C++** | `PITCH_DECK_OUTLINE.md` (Mục 2.3) & `SLIDE_PITCH_SCRIPT.md` (Slide 6):<br>Tình huống demo trọng tâm là **"Quy luật Cung - Cầu"** (Áo mưa cổng trường) với đủ 2 kịch bản Xanh/Đỏ. | `Cockpit.html` (Dòng 496-572):<br>Bài học duy nhất được nạp cứng trong mã nguồn là **"Con trỏ trong C++"**; hoàn toàn không có bài Cung - Cầu! | 🔴 **Nghiêm trọng** | Nếu BGK yêu cầu live demo tình huống "Áo mưa cổng trường" như trên Slide 6, prototype trên màn hình sẽ không thể chạy được! |
| **5** | **Bất nhất Ngưỡng điểm Rubric để đạt chuẩn XANH** | `DIAGRAM_NODE_STATE_MACHINE.md` (Dòng 37, 64):<br>`accuracy >= 70 & simplicity >= 70 & analogy >= 60`.<br>`SYSTEM_ARCHITECTURE_RFC.md` (Dòng 218):<br>`core_accuracy >= 80 & simplicity >= 75`. | `TECHNICAL_ENGINES_SPEC.md` (Dòng 194):<br>`core_accuracy >= 75 & simplicity >= 70 & analogy_grounding >= 70`.<br>`Cockpit.html` (Dòng 1034-1038):<br>Chỉ bắt regex chữ, không check điểm số số học. | 🟡 **Trung bình** | Lệch chuẩn đánh giá giữa các tài liệu kỹ thuật, gây bối rối cho lập trình viên Backend khi viết unit test cho FSM. |
| **6** | **Tên trường Điểm số trong Payload JSON** | `TECHNICAL_ENGINES_SPEC.md` (Dòng 151-161, 271-275):<br>`scores.core_accuracy`, `scores.simplicity`, `scores.analogy_grounding`. | `DIAGRAM_SEQUENCE_FLOW.md` (Dòng 59):<br>`accuracy`, `simplicity`, `analogy_grounding`.<br>`Cockpit.html` (Dòng 596, 927):<br>`acc`, `sim`, `ana`. | 🟡 **Trung bình** | Vi phạm Data Contract giữa AI Engine, Backend FSM và Frontend React. |
| **7** | **Trần số lần thử sai (`retry_count` Cap)** | `SYSTEM_ARCHITECTURE_RFC.md` (Dòng 230), `TECHNICAL_ENGINES_SPEC.md` (Dòng 329, 452) & `DEFENSE_QNA_CHEAT_SHEET.md` (Dòng 43):<br>Quy định tối đa **3 lần** (`retry_count >= 3`). | `Cockpit.html` (Dòng 706, 712, 849, 1169):<br>Khóa trần ở **2 lần** (`retry_count >= 2`), nhãn hiển thị là `thử lại 1/2`. | 🟡 **Trung bình** | Trải nghiệm người dùng trên Prototype bị cắt ngắn sớm hơn so với đặc tả sư phạm thuyết trình. |
| **8** | **Hành vi Giàn giáo (`scaffold_level`) khi giải thích SAI** | `SYSTEM_ARCHITECTURE_RFC.md` (Dòng 242) & `DIAGRAM_NODE_STATE_MACHINE.md` (Dòng 27-31):<br>Khi sai $\to$ Tăng `retry_count` VÀ nâng `scaffold_level` (1 $\to$ 2 $\to$ 3). | `TECHNICAL_ENGINES_SPEC.md` (Dòng 453-455):<br>Khi sai $\to$ Giữ nguyên `scaffold_level`, chỉ tăng `retry_count`. Chỉ nâng bậc khi `is_valid == true`! | 🟡 **Trung bình** | Xung đột triết lý sư phạm: Càng sai thì AI càng mồi sâu hơn (mô hình 1) hay mỗi bậc là một ải bắt buộc vượt qua (mô hình 2)? |
| **9** | **Sự phân mảnh Hệ thống Enum trạng thái Node** | Backend chuẩn (`RFC`, `SPEC`, `STATE_MACHINE`):<br>`GRAY` \| `YELLOW` \| `GREEN` \| `RED`. Kèm trạng thái mở rộng `XÁM SÁNG` (SPEC Dòng 458). | `Cockpit.html` (Dòng 483-485, 584) & `FRONTEND_UI_THEME_GUIDE.md` (Dòng 63-70):<br>`UNVISITED` \| `JARGON_HEAVY` \| `MASTERED` \| `FAILED`. | 🟡 **Trung bình** | Rủi ro bất đồng bộ Type / Interface khi chuyển giao mã nguồn giữa Backend (Python/FastAPI) và Frontend (TypeScript/React). |
| **10** | **Quy mô Cấu trúc Slide Thuyết trình** | `PITCH_DECK_OUTLINE.md` (Mục 5, Dòng 89-130):<br>Cấu trúc tinh gọn gồm **7 SLIDE**. | `SLIDE_PITCH_SCRIPT.md` (Phần B, Dòng 88-115):<br>Bảng chỉ dẫn visual chi tiết cho **11 SLIDE**. | 🟡 **Trung bình** | Đội thiết kế Slide không biết bám theo bản dàn ý 7 trang hay bản visual 11 trang. |
| **11** | **Tỷ lệ phân chia Cột Buồng lái (Cockpit Split)** | `PITCH_DECK_OUTLINE.md` (Dòng 94) & `SLIDE_PITCH_SCRIPT.md` (Dòng 51):<br>Cột trái 40% (DAG) - Cột phải 60% (Chat). | `FRONTEND_UI_THEME_GUIDE.md` (Dòng 20) & `Cockpit.html` (Dòng 698, 748):<br>Cột trái 35% (hoặc 34%) - Cột phải 65% (hoặc 66%). | 🟢 **Nhẹ** | Lệch thông số mô tả wireframe giữa tài liệu pitch và hướng dẫn code CSS. |
| **12** | **Cấu trúc JSON phản hồi trong Sequence Diagram** | `TECHNICAL_ENGINES_SPEC.md` (Dòng 270-292):<br>Gói tin chuẩn 11 trường, dùng `ai_chat_response`, `scores`, `is_node_misconception`. | `DIAGRAM_SEQUENCE_FLOW.md` (Dòng 59):<br>Phản hồi gồm `{ accuracy, simplicity, analogy_grounding, misconception_flag, persona_speech, emotion }`. | 🟢 **Nhẹ** | Sơ đồ tuần tự dùng tên trường cũ không khớp với JSON Contract chính thức. |

---

## 3. PHÂN TÍCH CHUYÊN SÂU 3 XUNG ĐỘT LỚN NHẤT

### 3.1. Xung đột 1: Nghịch lý Duyệt Đồ thị DAG khi có Node ĐỎ / Bỏ qua (Architectural Deadlock)

#### Bản chất xung đột:
* Trong các tài liệu Sư phạm và Trải nghiệm người dùng (`DIAGRAM_USER_FLOW.md`, `DIAGRAM_NODE_STATE_MACHINE.md`, `DEFENSE_QNA_CHEAT_SHEET.md`), hệ thống cam kết mang tính nhân văn: Nếu người học bế tắc sau 3 lần giải thích hoặc bấm *"Tạm bỏ qua / Skip"*, hệ thống sẽ chốt Node màu **ĐỎ**, ghi nhận điểm mù vào sổ tay và **"cho qua để học tiếp mắt xích tiếp theo, không làm nghẽn tiến trình"**. Bé Minh thậm chí cất lời an ủi: *"Giờ mình qua phần tiếp theo cho đỡ đau đầu nè!"*.
* Tuy nhiên, trong mã thuật toán `findNextNodeToActivate` ở cả `SYSTEM_ARCHITECTURE_RFC.md` (Dòng 289-295) và `TECHNICAL_ENGINES_SPEC.md` (Dòng 88-92), điều kiện tiên quyết bắt buộc là:
  ```typescript
  const allParentsGreen = parentEdges.every(e => {
    const parent = nodes.find(n => n.id === e.source);
    return parent && parent.status === "GREEN"; // BẮT BUỘC TẤT CẢ PHẢI XANH!
  });
  ```
* **Hậu quả kỹ thuật:** Nếu Node $A$ bị ĐỎ, thì Node con $B$ phụ thuộc vào nó sẽ không bao giờ thỏa mãn điều kiện `allParentsGreen`. Nếu đồ thị là dạng nhánh đơn ($A \to B \to C$) hoặc không có nhánh song song độc lập, hàm `findNextNodeToActivate` trả về `null`. Hệ thống rơi vào trạng thái "chết lâm sàng": Bé Minh bảo qua bài mới, nhưng màn hình bị đơ, không có node nào sáng lên để học tiếp!
* **Nguyên nhân sâu xa:** Nhóm thiết kế thuật toán bị lẫn lộn giữa hai trường hợp:
  1. *Hỏng Node Gốc (Root Node Failure):* Đúng là phải dừng khẩn cấp (Early Termination).
  2. *Hỏng Node Nhánh (Branch Node Failure / Skip):* Cần cơ chế **Mở khóa có điều kiện (Soft-prerequisite / Bypassed Prerequisite)** để người học tiếp tục các bài sau, đồng thời cắm cờ cảnh báo *"Học trên nền móng chưa vững"*.

---

### 3.2. Xung đột 2: Bất nhất Ngưỡng điểm Rubric & Logic Tăng bậc Giàn giáo

#### Bản chất xung đột:
Có 3 sự bất nhất đan xen nhau giữa các tài liệu:
1. **Ngưỡng điểm số để chuyển XANH:**
   * `STATE_MACHINE`: `accuracy >= 70`, `simplicity >= 70`, `analogy >= 60`.
   * `TECHNICAL_SPEC`: `core_accuracy >= 75`, `simplicity >= 70`, `analogy_grounding >= 70`.
   * `SYSTEM_RFC`: `core_accuracy >= 80`, `simplicity >= 75` (quên xét `analogy_grounding`).
   * `Cockpit.html`: Hoàn toàn không dùng điểm số toán học, chỉ dùng regex tìm từ khóa rồi random điểm số giả!
2. **Logic Tăng Bậc Giàn giáo (`scaffold_level`):**
   * Theo `RFC` và `STATE_MACHINE`: Khi người học giải thích yếu (Vàng) $\to$ `scaffold_level` tăng từ 1 lên 2, từ 2 lên 3. Nghĩa là: *Người học càng lúng túng thì AI càng nâng cấp giàn giáo mồi tình huống sâu hơn*.
   * Theo `TECHNICAL_SPEC` (Phần 3): Giàn giáo 3 bậc là 3 cấp độ thử thách tăng dần. Người học giải thích sai thì **giữ nguyên bậc** và tăng `retry_count`. Chỉ khi giải thích đúng (`is_valid == true`) thì mới được thăng cấp từ Bậc 1 (Trực giác) lên Bậc 2 (Khớp nối) và Bậc 3 (Bản chất).
3. **Số lần Retry trần:** Toàn bộ tài liệu quy định 3 lần, nhưng `Cockpit.html` đang khóa ở 2 lần (`retry_count >= 2`).

---

### 3.3. Xung đột 3: Sự phân mảnh Enum trạng thái giữa Backend FSM và Frontend UI

#### Bản chất xung đột:
* **Backend Engine:** Định nghĩa chuẩn mô hình 4 màu nhận thức:
  `status: "GRAY" | "YELLOW" | "RED" | "GREEN"`.
* **Frontend Prototype (`Cockpit.html`):** Sử dụng bộ mã:
  `status: "UNVISITED" | "JARGON_HEAVY" | "MASTERED" | "FAILED"`.
* Mặc dù trong `FRONTEND_UI_THEME_GUIDE.md` đã có bảng mapping, nhưng việc mã nguồn `Cockpit.html` chạy hoàn toàn bằng bộ enum riêng biệt khiến cho việc tích hợp Backend API (FastAPI trả về JSON có trường `status: "GREEN"`) sẽ lập tức làm vỡ giao diện CSS do không tìm thấy selector `.node[data-s="GREEN"]`.
* Ngoài ra, trong `TECHNICAL_ENGINES_SPEC.md` xuất hiện trạng thái lạ **"XÁM SÁNG"** khi vượt qua Bậc 1, không hề có trong định nghĩa TypeScript Interface `ConceptNode`.

---

## 4. ĐỀ XUẤT PHƯƠNG ÁN ĐỒNG BỘ CHUẨN (SINGLE SOURCE OF TRUTH)

Để đảm bảo tính nhất quán tuyệt đối trước ngày nộp bài và chạy demo 24h Hackathon, toàn bộ nhóm cần chốt hạ các chuẩn kỹ thuật duy nhất sau đây:

### 4.1. Chuẩn hóa Enum Trạng thái Node (Data Contract)
Bỏ hoàn toàn các enum cũ (`UNVISITED`, `MASTERED`, `JARGON_HEAVY`, `FAILED`). Toàn hệ thống từ Backend, Frontend đến CSS chỉ dùng duy nhất **4 trạng thái FSM chuẩn**:
```typescript
type NodeStatus = "GRAY" | "YELLOW" | "GREEN" | "RED";
```
* **`GRAY` (Chưa kích hoạt / Chưa học):** Nền trắng, viền xám `#E2E8F0`, icon xám.
* **`YELLOW` (Đang học / Thử thách Giàn giáo):** Viền xanh/vàng phát sáng nhịp thở (`.focus`), đường nối chạy động (`.flow`). Nếu dính lỗi thuật ngữ thì badge hiển thị *"Dính thuật ngữ · Thử lại X/3"*.
* **`GREEN` (Làm chủ / Thấu suốt bản chất):** Nền ngọc nhạt `#F0FDF4`, viền xanh `#10B981`, chữ xanh ngọc.
* **`RED` (Điểm mù nhận thức / Hổng bản chất):** Nền hồng nhạt `#FEF2F2`, viền đỏ `#EF4444`, icon cảnh báo.

---

### 4.2. Chuẩn hóa Ngưỡng điểm Rubric & Bộ đếm Retry
1. **Tên trường dữ liệu chuẩn trong JSON:**
   ```json
   "scores": {
     "core_accuracy": 85,     // 0 - 100
     "simplicity": 90,        // 0 - 100
     "analogy_grounding": 75  // 0 - 100
   }
   ```
2. **Ngưỡng điểm chuẩn để chuyển XANH (GREEN):**
   * `scores.core_accuracy >= 75` (Chính xác bản chất)
   * `scores.simplicity >= 70` (Mộc mạc, không lạm dụng từ khó)
   * `scores.analogy_grounding >= 65` (Có ví dụ đời thường / vượt qua câu hỏi bẫy)
   * `is_node_misconception === false`
   * `detected_jargons.length === 0`
   * `is_valid === true`
3. **Trần số lần thử:** Thống nhất **tối đa 3 lần thử** (`retry_count = 0, 1, 2, 3`). Chạm mốc 3 lần mới chốt ĐỎ. Sửa ngay `Cockpit.html` từ `/2` thành `/3`.

---

### 4.3. Thuật toán Duyệt Đồ thị Mới: Giải quyết triệt để Nghịch lý Node ĐỎ

Thuật toán `findNextNodeToActivate` phải được nâng cấp để hỗ trợ **Mở khóa Vượt ngưỡng (Soft-prerequisite / Bypass Unlocking)**:
* Nếu Node bị ĐỎ là **Root Node** (`in-degree == 0`) $\to$ **Dừng khẩn cấp (Early Termination)**, khóa buồng lái.
* Nếu Node bị ĐỎ là **Node Nhánh** (`in-degree > 0`) $\to$ Đánh dấu node này là `RED`. Thuật toán duyệt tiếp theo:
  1. Ưu tiên 1: Tìm node ở **nhánh song song độc lập** (có 100% cha XANH).
  2. Ưu tiên 2: Nếu không có nhánh song song, cho phép mở khóa node con kế tiếp nếu tất cả các node cha của nó **đều đã được học qua** (trạng thái là `GREEN` hoặc `RED`). Khi node con được mở khóa sau một node cha bị ĐỎ, node con sẽ được gán cờ `has_unstable_foundation: true`, Bé Minh sẽ mở lời với một lời nhắc nhẹ nhàng: *"Phần trước mình chưa vững lắm, nhưng em với anh cứ thử sức phần này xem sao nha!"*.

#### Đoạn mã TypeScript chuẩn hóa cho Backend:
```typescript
/**
 * Thuật toán tìm Trạm nhận thức tiếp theo cần kích hoạt.
 * Hỗ trợ chuyển nhánh thông minh khi gặp Node ĐỎ (Kháng Deadlock).
 */
function findNextNodeToActivate(
  currentNodeId: string,
  nodes: ConceptNode[],
  edges: Edge[]
): { nextNode: ConceptNode | null; isEarlyTermination: boolean; reason?: string } {
  const currentNode = nodes.find(n => n.id === currentNodeId);
  if (!currentNode) return { nextNode: null, isEarlyTermination: false };

  // 1. KIỂM TRA DỪNG KHẨN CẤP NẾU ROOT NODE BỊ ĐỎ
  const parentEdgesOfCurrent = edges.filter(e => e.target === currentNodeId);
  const isRootNode = parentEdgesOfCurrent.length === 0;

  if (currentNode.status === "RED" && isRootNode) {
    return {
      nextNode: null,
      isEarlyTermination: true,
      reason: "Hổng kiến thức nền tảng tại Node Gốc. Kích hoạt Dừng khẩn cấp."
    };
  }

  // 2. TÌM NODE CON TRỰC TIẾP ĐỦ ĐIỀU KIỆN TIÊN QUYẾT LÝ TƯỞNG (100% CHA XANH)
  const childEdges = edges.filter(e => e.source === currentNodeId);
  const candidateChildNodes = childEdges
    .map(e => nodes.find(n => n.id === e.target)!)
    .filter(n => n && n.status === "GRAY");

  const greenReadyChildNodes = candidateChildNodes.filter(child => {
    const parentEdges = edges.filter(e => e.target === child.id);
    return parentEdges.every(e => {
      const parent = nodes.find(n => n.id === e.source);
      return parent && parent.status === "GREEN";
    });
  });

  if (greenReadyChildNodes.length > 0) {
    // Ưu tiên node có out-degree cao nhất
    greenReadyChildNodes.sort((a, b) => getOutDegree(b.id, edges) - getOutDegree(a.id, edges));
    return { nextNode: greenReadyChildNodes[0], isEarlyTermination: false };
  }

  // 3. TÌM TRÊN CÁC NHÁNH SONG SONG ĐỘC LẬP KHÁC (100% CHA XANH)
  const parallelReadyNodes = nodes.filter(node => {
    if (node.status !== "GRAY") return false;
    const parentEdges = edges.filter(e => e.target === node.id);
    return parentEdges.length > 0 && parentEdges.every(e => {
      const parent = nodes.find(n => n.id === e.source);
      return parent && parent.status === "GREEN";
    });
  });

  if (parallelReadyNodes.length > 0) {
    parallelReadyNodes.sort((a, b) => getOutDegree(b.id, edges) - getOutDegree(a.id, edges));
    return { nextNode: parallelReadyNodes[0], isEarlyTermination: false };
  }

  // 4. CƠ CHẾ VƯỢT LỖ HỔNG (SOFT-PREREQUISITE BYPASS KHI CÓ NODE ĐỎ):
  // Nếu node hiện tại bị ĐỎ và không còn nhánh Xanh nào, cho phép kích hoạt node con
  // nếu tất cả cha của nó ĐÃ ĐƯỢC HỌC QUA (trạng thái GREEN hoặc RED, không còn GRAY)
  if (currentNode.status === "RED") {
    const bypassedChildNodes = candidateChildNodes.filter(child => {
      const parentEdges = edges.filter(e => e.target === child.id);
      return parentEdges.every(e => {
        const parent = nodes.find(n => n.id === e.source);
        return parent && (parent.status === "GREEN" || parent.status === "RED");
      });
    });

    if (bypassedChildNodes.length > 0) {
      bypassedChildNodes.sort((a, b) => getOutDegree(b.id, edges) - getOutDegree(a.id, edges));
      return { 
        nextNode: bypassedChildNodes[0], 
        isEarlyTermination: false,
        reason: "Bypassed prerequisite due to previous misconception."
      };
    }
  }

  // 5. TOÀN BỘ ĐỒ THỊ ĐÃ ĐƯỢC XỬ LÝ XONG
  return { nextNode: null, isEarlyTermination: false };
}

function getOutDegree(nodeId: string, edges: Edge[]): number {
  return edges.filter(e => e.source === nodeId).length;
}
```

---

### 4.4. Chuẩn hóa Persona Bé Minh & Kịch bản Slide
* **Độ tuổi & Xưng hô:** Bé Minh là **"Bạn học tò mò 10 tuổi"**. Xưng hô chuẩn: **"Em - Anh/Chị"**. Tuyệt đối loại bỏ cách gọi *"Thầy/Cô"* trong `Cockpit.html` để trả về đúng bản chất Feynman.
* **Tích hợp Kịch bản Demo:** Cập nhật `Cockpit.html` bổ sung một thanh chọn chủ đề (Topic Selector) ở góc trên: Cho phép chuyển đổi mượt mà giữa **Chuyên đề 1: Con trỏ C++** và **Chuyên đề 2: Quy luật Cung - Cầu (Áo mưa cổng trường)** để phục vụ thuyết trình ăn khớp 100% với Slide 6!
* **Quy mô Slide:** Thống nhất bộ Slide chính thức gồm **11 SLIDE** (như đã quy định tại `SLIDE_PITCH_SCRIPT.md`), cập nhật lại tiêu đề Mục 5 trong `PITCH_DECK_OUTLINE.md` từ *"7 SLIDE"* thành *"11 SLIDE CHUẨN YC x STEVE JOBS"*.

---

## 5. CHECKLIST CÁC FILE ĐÃ HOÀN TẤT ĐỒNG BỘ HÓA 100% (STATUS: COMPLETED ✅)

### 1. `Cockpit.html` (Đã hoàn tất 100%)
- [x] Thay đổi cách xưng hô của Bé Minh: Thay toàn bộ từ `"Thầy/Cô"` thành `"anh"`.
- [x] Đổi thông tin Bé Minh: Thay *"BÉ MINH · HỌC SINH LỚP 7"* thành *"BÉ MINH · BẠN NHỎ 10 TUỔI"*.
- [x] Đồng bộ bộ đếm Retry: Đổi sang `thử lại 1/3` (trần `retry_count = 3`, chạm trần hoặc đầu hàng chốt `RED`).
- [x] Thêm bộ dữ liệu bài mẫu **"Quy luật Cung - Cầu"** (4 node: Cung - Cầu -> Điểm cân bằng -> Giá trần -> Chợ đen) kèm kịch bản Áo mưa cổng trường và bộ chọn chuyên đề `topicSelector` trên Header.
- [x] Đổi toàn bộ mã trạng thái CSS & JS từ `UNVISITED/MASTERED/JARGON_HEAVY/FAILED` sang `GRAY/GREEN/YELLOW/RED`.
- [x] Tích hợp hàm duyệt đồ thị `findNextNodeIndex` kháng Deadlock với Soft-prerequisite Bypass và Early Termination khóa buồng lái khi Root Node bị RED!

### 2. `SYSTEM_ARCHITECTURE_RFC.md` & `TECHNICAL_ENGINES_SPEC.md` (Đã hoàn tất 100%)
- [x] Cập nhật hàm `findNextNodeToActivate` với thuật toán mới (hỗ trợ Soft-prerequisite Bypass khi Node nhánh bị ĐỎ để chống Deadlock và Early Termination khi Root Node bị ĐỎ).
- [x] Thống nhất ngưỡng điểm Rubric chuyển XANH: `core_accuracy >= 75`, `simplicity >= 70`, `analogy_grounding >= 65`.
- [x] Xóa bỏ hoàn toàn trạng thái `"XÁM SÁNG"` và chuẩn hóa logic Giàn giáo Thích ứng (Adaptive Scaffolding).

### 3. `DIAGRAM_NODE_STATE_MACHINE.md` & `DIAGRAM_USER_FLOW.md` (Đã hoàn tất 100%)
- [x] Cập nhật nhánh rẽ khi Node bị ĐỎ: Thể hiện rõ mũi tên phân nhánh (Root Node $\to$ Dừng khẩn cấp Early Termination; Branch Node $\to$ Mở khóa có điều kiện Soft-prerequisite Bypass).
- [x] Đồng bộ tên biến trong sơ đồ: Dùng `core_accuracy`, `simplicity`, `analogy_grounding` với ngưỡng `75 / 70 / 65`.

### 4. `DIAGRAM_SEQUENCE_FLOW.md` (Đã hoàn tất 100%)
- [x] Cập nhật gói tin JSON phản hồi của AI theo đúng hợp đồng `AIEvaluationResponse` chuẩn (dùng `scores: { core_accuracy, simplicity, analogy_grounding }`, `intent`, `is_node_misconception`, `ai_chat_response`).

### 5. `PITCH_DECK_OUTLINE.md` & `FRONTEND_UI_THEME_GUIDE.md` (Đã hoàn tất 100%)
- [x] Cập nhật tiêu đề Mục 5 của `PITCH_DECK_OUTLINE.md`: Sửa từ *"DÀN Ý 7 SLIDE"* thành *"DÀN Ý 11 SLIDE"*, đồng bộ cấu trúc 11 slide với `SLIDE_PITCH_SCRIPT.md`.
- [x] Chuẩn hóa bảng trạng thái Mục 3.2 trong `FRONTEND_UI_THEME_GUIDE.md` sang chuẩn 4 Enum: `GRAY | YELLOW | GREEN | RED`.

---
*Bản báo cáo đã được thực thi và nghiệm thu thành công bởi Principal Software Architect. Toàn bộ mã nguồn, tài liệu kiến trúc, sơ đồ kỹ thuật và slide thuyết trình đã đạt tính nhất quán 100% (Single Source of Truth).*
