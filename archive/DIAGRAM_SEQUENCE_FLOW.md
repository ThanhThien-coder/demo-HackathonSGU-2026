# SƠ ĐỒ TUẦN TỰ DỮ LIỆU CHI TIẾT (SEQUENCE DIAGRAM)
## DỰ ÁN: SGU-FEYNMAN

Tài liệu này thể hiện chi tiết luồng trao đổi dữ liệu theo thời gian thực giữa Người học, Giao diện (Frontend), Bộ điều phối (Backend) và Mô hình AI (Gemini Flash) trong 2 giai đoạn: Khởi tạo sơ đồ và Phiên tương tác Feynman.

---

## 1. GIAI ĐOẠN 1: NẠP TÀI LIỆU & TỰ ĐỘNG SINH CÂY SƠ ĐỒ (INGESTION PHASE)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Người học
    participant FE as 🖥️ Frontend (ReactFlow)
    participant BE as ⚙️ Backend Controller
    participant AI as 🤖 Gemini Flash AI

    Note over User,AI: BƯỚC 1: TẢI TÀI LIỆU & SINH SƠ ĐỒ BÀI HỌC
    User->>FE: Kéo thả file PDF slide bài giảng
    FE->>BE: POST /api/curriculum/generate (FormData: file PDF)
    BE->>BE: Trích xuất nội dung văn bản cốt lõi từ PDF
    BE->>AI: Gửi tài liệu + Prompt yêu cầu bóc tách 5-7 khái niệm cốt lõi (JSON Schema)
    AI-->>BE: Trả về JSON { nodes: ConceptNode[], edges: Edge[] }
    BE->>BE: Khởi tạo cây đồ thị trong bộ nhớ In-Memory
    BE-->>FE: HTTP 200 OK: Trả về cây đồ thị sơ đồ ban đầu

    Note over User,FE: BƯỚC 2: NGƯỜI HỌC KIỂM TRA & TINH CHỈNH SƠ ĐỒ
    FE->>User: Hiển thị sơ đồ trực quan trên màn hình
    User->>FE: Kéo thả / Chỉnh sửa tên khái niệm / Thêm bớt node
    FE->>BE: POST /api/curriculum/lock (Gửi sơ đồ đã chỉnh sửa)
    BE->>BE: Khóa cấu trúc sơ đồ & Đặt Node đầu tiên thành YELLOW
    BE-->>FE: Chuyển sang Màn hình Buồng lái tương tác (Cockpit)
```

---

## 2. GIAI ĐOẠN 2: VÒNG LẶP HỌC TẬP TƯƠNG TÁC TỪNG LƯỢT (INTERACTIVE LOOP)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Người học
    participant FE as 🖥️ Frontend (Chat & Node)
    participant BE as ⚙️ Backend FSM Engine
    participant AI as 🤖 Gemini Flash AI

    Note over User,AI: VÒNG LẶP TƯƠNG TÁC THEO TỪNG KHÁI NIỆM (NODE)
    User->>FE: Nhập câu giải thích đời thường cho Node hiện tại
    FE->>BE: POST /api/session/interact { message, active_node_id }

    rect rgb(240, 244, 255)
    Note over BE: XỬ LÝ NGỮ CẢNH TINH GỌN TẠI BACKEND
    BE->>BE: Lấy thông số tiêu chuẩn của active_node_id (core_facts, jargons)
    BE->>BE: Lấy đúng 2 tin nhắn gần nhất từ hàng đợi Rolling Window
    BE->>BE: Ghép mật lệnh điều hướng sư phạm <DEVELOPER_DIRECTIVE>
    end

    BE->>AI: Gửi gói tin tinh gọn (Single-Pass Prompting)
    AI-->>BE: Phản hồi JSON: AIEvaluationResponse { scores: { core_accuracy, simplicity, analogy_grounding }, intent, is_node_misconception, detected_jargons, extracted_metaphor, ai_chat_response }

    rect rgb(245, 255, 245)
    Note over BE: BỘ LUẬT THUẬT TOÁN FSM TẠI BACKEND
    BE->>BE: Phân tích 3 điểm số Rubric (75/70/65) & Kiểm tra cờ lỗi
    alt Người học đạt chuẩn bản chất (core_accuracy >= 75, simplicity >= 70, analogy_grounding >= 65)
        BE->>BE: Cập nhật màu Node hiện tại: YELLOW -> GREEN
        BE->>BE: Chạy thuật toán findNextNodeToActivate tìm Node tiếp theo
        BE->>BE: Kích hoạt Node tiếp theo: GRAY -> YELLOW
    else Người học dính từ chuyên môn / Chưa đạt Rubric
        BE->>BE: Giữ màu Node là YELLOW & Tăng biến đếm retry_count += 1
        BE->>BE: Nâng bậc thang giàn giáo scaffold_level (1 -> 2 -> 3)
    else Sai lệch bản chất cốt lõi HOẶC retry_count >= 3 HOẶC Bỏ qua
        BE->>BE: Đánh dấu Node hiện tại thành màu RED
        BE->>BE: Nếu Root Node -> Early Termination; Nếu Branch Node -> Soft-prerequisite Bypass
        BE->>BE: Ghi nhận điểm mù vào Báo cáo chẩn đoán
    end
    end

    BE-->>FE: HTTP 200 OK { updated_nodes, ai_speech, emotion, next_node_id }
    FE->>FE: Đổi màu Node trên ReactFlow (Hiệu ứng chuyển màu)
    FE->>FE: Cập nhật biểu cảm Avatar Bé Minh (Vui mừng / Tò mò / Gãi đầu)
    FE->>User: Hiển thị câu hỏi tiếp theo của Bé Minh
```

---

## 3. GIAI ĐOẠN 3: KẾT THÚC PHIÊN & TRẢ BÁO CÁO CHẨN ĐOÁN (REPORT PHASE)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Người học
    participant FE as 🖥️ Frontend
    participant BE as ⚙️ Backend Controller

    Note over User,BE: KHI 100% CÁC NODE ĐÃ ĐƯỢC XỬ LÝ HOẶC DỪNG SỚM
    FE->>BE: GET /api/session/report
    BE->>BE: Tổng hợp trạng thái các Node (Xanh / Vàng / Đỏ)
    BE->>BE: Bóc tách danh sách ngộ nhận và điểm mù nhận thức
    BE-->>FE: Trả về DiagnosticReport JSON
    FE->>User: Hiển thị Mindmap chẩn đoán tri thức & Lời khuyên ôn tập
```
