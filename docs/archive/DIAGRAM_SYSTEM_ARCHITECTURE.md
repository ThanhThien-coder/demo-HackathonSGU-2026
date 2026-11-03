# SƠ ĐỒ KIẾN TRÚC PHÂN TẦNG HỆ THỐNG (SYSTEM ARCHITECTURE)
## DỰ ÁN: SGU-FEYNMAN

Tài liệu này thể hiện kiến trúc kỹ thuật phân tầng rõ ràng giữa Giao diện người dùng (Frontend), Bộ điều phối trạng thái (Backend Engine) và Tầng trí tuệ nhân tạo (Gemini AI Engine).

---

## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ (LAYERED ARCHITECTURE DIAGRAM)

```mermaid
graph TB
    subgraph CLIENT_LAYER ["🖥️ TẦNG GIAO DIỆN (CLIENT FRONTEND - REACT & REACTFLOW)"]
        UI_Drop["📂 File Dropzone<br/>(Nạp PDF / Chọn bài mẫu)"]
        UI_Graph["🗺️ Canvas Cây Đồ thị<br/>(ReactFlow Node & Edge Renderer)"]
        UI_Chat["💬 Khung Chat Feynman<br/>(Single Active Node Stage)"]
        UI_Avatar["🎭 Avatar Bé Minh SVG<br/>(Biểu cảm cảm xúc động)"]
        UI_Report["📊 Modal Chẩn đoán Nhận thức<br/>(Mindmap Lỗ hổng Tri thức)"]
        UI_State["📦 Client Store (Zustand / Context)<br/>(Active Node ID, Message History)"]
    end

    subgraph BACKEND_LAYER ["⚙️ TẦNG ĐIỀU PHỐI HỆ THỐNG (BACKEND ORCHESTRATION ENGINE)"]
        subgraph INGESTION_MODULE ["1. Module Xử lý Tài liệu Đầu vào"]
            Doc_Parser["📄 PDF Text Extractor<br/>(Đọc nội dung văn bản)"]
            Graph_Builder["🏗️ Curriculum Graph Generator<br/>(Tạo cấu trúc ConceptNode[] ban đầu)"]
        end

        subgraph STATE_ENGINE ["2. Bộ Máy Quản lý Trạng thái & Đồ thị (FSM)"]
            Graph_Store["🧠 In-Memory Graph Store<br/>(Lưu danh sách Node, Edges, Status)"]
            Topo_Validator["📐 Topological Sorter<br/>(Kiểm tra 100% Node cha đã XANH)"]
            FSM_Engine["🎛️ State Transition Rules<br/>(Bộ luật if/else đổi màu Xám/Vàng/Xanh/Đỏ)"]
            Scaffold_Controller["🪜 Scaffolding Manager<br/>(Quản lý retry_count & scaffold_level)"]
        end

        subgraph CONTEXT_OPTIMIZER ["3. Bộ Tối ưu Ngữ cảnh & Lệnh điều hướng"]
            Rolling_Window["✂️ Rolling Window Filter<br/>(Chỉ giữ đúng 2 tin nhắn gần nhất)"]
            Directive_Injector["💉 Directive Injector<br/>(Bọc mật lệnh & Rubric vào prompt)"]
            JSON_Parser["🔍 Strict JSON Response Validator<br/>(Bóc tách điểm Rubric & câu hỏi AI)"]
        end
    end

    subgraph AI_LAYER ["🤖 TẦNG XỬ LÝ NGÔN NGỮ TỰ NHIÊN (GEMINI FLASH AI)"]
        AI_Ingest["📑 Mô hình Khởi tạo Sơ đồ<br/>(Phân tích khái niệm từ PDF -> JSON Node Graph)"]
        AI_Feynman["👶 Mô hình Đánh giá Nhận thức & Nhập vai Bạn học<br/>(Chấm Rubric 0-100, Bắt từ khó, Hỏi vặn tình huống)"]
    end

    %% KẾT NỐI LUỒNG DỮ LIỆU
    UI_Drop -->|"1. Tải lên file PDF"| Doc_Parser
    Doc_Parser --> AI_Ingest
    AI_Ingest -->|"JSON sơ đồ Node"| Graph_Builder
    Graph_Builder -->|"Khởi tạo cây đồ thị"| Graph_Store
    Graph_Store -->|"Dữ liệu sơ đồ ban đầu"| UI_Graph

    UI_Chat -->|"2. Gửi câu giải thích {text, active_node_id}"| Rolling_Window
    UI_Graph -.->|"Chọn Node"| UI_State
    UI_State --> UI_Chat

    Rolling_Window --> Directive_Injector
    Graph_Store -->|"Tiêu chuẩn sư phạm Node hiện tại"| Directive_Injector
    Directive_Injector -->|"Prompt tinh gọn"| AI_Feynman

    AI_Feynman -->|"JSON Structured Response"| JSON_Parser
    JSON_Parser --> FSM_Engine
    FSM_Engine --> Scaffold_Controller
    Scaffold_Controller --> Topo_Validator
    Topo_Validator -->|"Cập nhật trạng thái màu Node"| Graph_Store

    Graph_Store -->|"3. Gửi cập nhật UI {Node status, AI reply}"| UI_Graph
    Graph_Store --> UI_Chat
    Graph_Store --> UI_Avatar
    Graph_Store -->|"Kết thúc phiên -> Gửi báo cáo"| UI_Report

    %% STYLING
    classDef clientStyle fill:#0F172A,stroke:#38BDF8,stroke-width:1.5px,color:#F8FAFC;
    classDef backendStyle fill:#1E293B,stroke:#818CF8,stroke-width:1.5px,color:#F8FAFC;
    classDef aiStyle fill:#312E81,stroke:#C084FC,stroke-width:1.5px,color:#FAF5FF;
    
    class UI_Drop,UI_Graph,UI_Chat,UI_Avatar,UI_Report,UI_State clientStyle;
    class Doc_Parser,Graph_Builder,Graph_Store,Topo_Validator,FSM_Engine,Scaffold_Controller,Rolling_Window,Directive_Injector,JSON_Parser backendStyle;
    class AI_Ingest,AI_Feynman aiStyle;
```

---

## 2. NGUYÊN TẮC PHÂN TÁCH TRÁCH NHIỆM GIỮA CÁC TẦNG

1. **Tầng Giao diện (Frontend):**
   * Hoàn toàn thụ động về mặt logic sư phạm; chỉ hiển thị trực quan dữ liệu cây đồ thị bằng ReactFlow và bắt sự kiện người dùng nhập văn bản.
   * Không tự ý đổi màu Node nếu chưa có gói tin xác nhận từ Backend.
2. **Tầng Điều phối (Backend):**
   * Nắm giữ toàn bộ trạng thái chuẩn (Single Source of Truth) của bài học.
   * Kiểm soát chặt chẽ thứ tự học logic bằng thuật toán Đồ thị (Topological Ordering), tuyệt đối ngăn chặn việc nhảy cóc bài học.
   * Lọc và cắt gọt dữ liệu trò chuyện chỉ giữ tin nhắn gần nhất kèm tiêu chuẩn bài học để tối ưu chi phí API.
3. **Tầng Trí tuệ Nhân tạo (Gemini Flash):**
   * Đảm nhiệm năng lực đọc hiểu ngôn ngữ: trích xuất khái niệm từ tài liệu và thẩm định chiều sâu câu trả lời của người học.
   * Bắt buộc trả về định dạng JSON có cấu trúc để Backend dễ dàng giải mã và vận hành toán học.
