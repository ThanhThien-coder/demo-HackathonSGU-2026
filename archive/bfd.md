graph TD
    %% Styling Classes
    classDef rootStyle fill:#0F172A,stroke:#1E293B,stroke-width:2px,color:#FFFFFF,font-weight:bold;
    classDef sysStyle fill:#1E40AF,stroke:#1D4ED8,stroke-width:2px,color:#FFFFFF,font-weight:bold;
    classDef coreStyle fill:#9333EA,stroke:#7E22CE,stroke-width:2px,color:#FFFFFF,font-weight:bold;
    classDef aiStyle fill:#F59E0B,stroke:#D97706,stroke-width:1.5px,color:#FFFFFF,font-weight:bold;
    classDef algoStyle fill:#10B981,stroke:#047857,stroke-width:1.5px,color:#FFFFFF,font-weight:bold;
    classDef uiStyle fill:#F8FAFC,stroke:#CBD5E1,stroke-width:1px,color:#0F172A;

    ROOT["HỆ THỐNG SGU-FEYNMAN"]:::rootStyle

    %% ==========================================
    %% 1.0 PHÂN HỆ KHỞI TẠO BÀI HỌC
    %% ==========================================
    ROOT --> M1["1.0 Khởi tạo & Quản trị Tri thức"]:::sysStyle
    M1 --> M1_1["1.1 Nạp Slide / Chọn bài mẫu"]:::uiStyle
    M1 --> M1_2["1.2 Trích xuất khái niệm & Bộ gợi ý ẩn dụ [DÙNG AI]"]:::aiStyle
    M1 --> M1_3["1.3 Kiểm tra chu trình Kahn's Algorithm [THUẬT TOÁN]"]:::algoStyle
    M1 --> M1_4["1.4 Xem & Tinh chỉnh nhanh đồ thị DAG (ReactFlow)"]:::uiStyle

    %% ==========================================
    %% 2.0 ĐỘNG CƠ XỬ LÝ TRUNG TÂM (CORE ENGINE - PHẦN BỊ THIẾU ĐÃ ĐƯỢC BỔ SUNG)
    %% ==========================================
    ROOT --> M2["2.0 Động cơ Xử lý & Thẩm định tương tác<br/>(Core Feynman Engine)"]:::coreStyle
    
    M2 --> M2_1["2.1 Tiền xử lý Input giọng nói (Web Speech API) [THUẬT TOÁN]"]:::algoStyle
    
    M2 --> M2_2["2.2 Thẩm định đa tầng Single-Pass [DÙNG AI]<br/>• Xác định Node người dùng đang giảng<br/>• Chẩn đoán lỗi logic & bắt bẫy từ chuyên môn<br/>• Sinh lý do giải thích (Feedback Reason)<br/>• Quyết định cảm xúc Avatar<br/>• Sinh câu hỏi vặn của đứa trẻ"]:::aiStyle
    
    M2 --> M2_3["2.3 Bộ điều phối trạng thái đồ thị (FSM) [THUẬT TOÁN]<br/>• Nhận diện chuyển màu Node: Xanh / Vàng / Đỏ<br/>• Tính toán độ bao phủ bài học & % Hiểu bài<br/>• Kích hoạt điều hướng hoàn thành phiên"]:::algoStyle

    %% ==========================================
    %% 3.0 PHÂN HỆ BUỒNG LÁI TƯƠNG TÁC (GIAO DIỆN)
    %% ==========================================
    ROOT --> M3["3.0 Giao diện Buồng lái mô phỏng<br/>(Interactive Cockpit UI)"]:::sysStyle
    
    M3 --> M3_1["3.1 Cột trái: Live DAG Canvas"]:::uiStyle
    M3_1 --> M3_1_1["Render cây đồ thị ReactFlow"]:::uiStyle
    M3_1 --> M3_1_2["Đổi màu node & Glow node trọng tâm"]:::uiStyle
    M3_1 --> M3_1_3["Tooltip hiển thị lý do Vàng/Đỏ (từ Core Engine)"]:::uiStyle
    
    M3 --> M3_2["3.2 Cột phải: Sân khấu mô phỏng"]:::uiStyle
    M3_2 --> M3_2_1["Avatar đổi cảm xúc SVG theo Engine"]:::uiStyle
    M3_2 --> M3_2_2["Thanh tiến độ % hiểu bài nhảy số"]:::uiStyle
    M3_2 --> M3_2_3["Bong bóng câu hỏi vặn của đứa trẻ"]:::uiStyle
    
    M3 --> M3_3["3.3 Khung nhập liệu bước thang"]:::uiStyle
    M3_3 --> M3_3_1["Ô nhập ngắn (Text) hoặc Bấm giữ Mic (Voice)"]:::uiStyle
    M3_3 --> M3_3_2["Nút mở phao cứu sinh (Lấy Hint đã sinh từ 1.2)"]:::uiStyle
    M3_3 --> M3_3_3["Nút dừng bài học sớm"]:::uiStyle

    %% ==========================================
    %% 4.0 PHÂN HỆ BÁO CÁO TỔNG KẾT
    %% ==========================================
    ROOT --> M4["4.0 Báo cáo Chẩn đoán Năng lực"]:::sysStyle
    M4 --> M4_1["4.1 Thuật toán gom nhóm Node Vững vs. Node Hổng [THUẬT TOÁN]"]:::algoStyle
    M4 --> M4_2["4.2 Sinh đoạn nhận xét sư phạm tổng kết bài học [DÙNG AI]"]:::aiStyle
    M4 --> M4_3["4.3 Hiển thị Dashboard chẩn đoán & Nút học lại"]:::uiStyle