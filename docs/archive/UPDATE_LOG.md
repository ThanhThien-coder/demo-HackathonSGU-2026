# BẢN TỔNG KẾT TIẾN ĐỘ CÔNG VIỆC (UPDATE LOG)
## DỰ ÁN: SGU-FEYNMAN - PHIÊN LÀM VIỆC TỐI 12/10/2026

Tài liệu này ghi chú lại toàn bộ các nội dung, cấu trúc và sơ đồ đã được cập nhật, hoàn thiện trong phiên làm việc tối nay để ngày mai mở ra là nắm bắt và tiếp tục triển khai ngay.

---

## 1. TINH CHỈNH TÀI LIỆU PITCH & SLIDE (KHÔNG DÙNG TỪ NGỮ PHÓNG ĐẠI)
* **File cập nhật:** [SLIDE_PITCH_SCRIPT.md](file:///c:/Users/Admin/Desktop/hackathon-2026/SLIDE_PITCH_SCRIPT.md) và [PITCH_DECK_OUTLINE.md](file:///c:/Users/Admin/Desktop/hackathon-2026/PITCH_DECK_OUTLINE.md)
* **Nội dung hoàn tất:**
  * **Đoạn giới thiệu chuẩn về Kỹ thuật Feynman:** 4 bước cốt lõi của Richard Feynman (Chọn khái niệm $\to$ Giải thích cho đứa trẻ 10 tuổi bằng từ ngữ bình dị $\to$ Nhận diện lỗ hổng $\to$ Đơn giản hóa đúc kết).
  * **Luồng nạp tài liệu sinh sơ đồ chuẩn xác:** Người dùng tải file slide PDF $\to$ AI đọc phân tích và tự động sinh ra cây sơ đồ bài học ban đầu $\to$ Người dùng xem lại và có quyền chỉnh sửa/tinh chỉnh các node theo ý mình trước khi bắt đầu học.
  * **Mô tả kiến trúc thực tế, không "nổ":** Bỏ toàn bộ các số liệu phóng đại (không chém "150 tokens tuyệt đối", "cắt 85%", "dưới 800ms"). Thay bằng giải thích nguyên lý thiết kế: Tiến độ lưu trên cây đồ thị ở Backend, mỗi lượt chat chỉ gửi tin nhắn gần nhất kèm tiêu chuẩn của node hiện tại, giúp dữ liệu luôn tinh gọn, giảm chi phí gọi API và phản hồi mượt mà.

---

## 2. HỆ THỐNG SƠ ĐỒ KỸ THUẬT HOÀN CHỈNH (TÁCH RIÊNG TỪNG FILE MERMAID)
Nhóm đã có đầy đủ 4 sơ đồ kỹ thuật chi tiết để phục vụ làm slide và bảo vệ trước Ban Giám khảo:

1. 📄 [DIAGRAM_USER_FLOW.md](file:///c:/Users/Admin/Desktop/hackathon-2026/DIAGRAM_USER_FLOW.md):
   * Sơ đồ Flowchart toàn bộ hành trình người dùng: Nạp PDF $\to$ AI sinh Node $\to$ Chỉnh sửa $\to$ Buồng lái tương tác $\to$ Vòng lặp Feynman $\to$ Báo cáo chẩn đoán nhận thức.
2. 📄 [DIAGRAM_SYSTEM_ARCHITECTURE.md](file:///c:/Users/Admin/Desktop/hackathon-2026/DIAGRAM_SYSTEM_ARCHITECTURE.md):
   * Sơ đồ phân tầng 3 lớp chuẩn mực: Tầng Client (React / ReactFlow), Tầng Điều phối (Backend FSM Engine), và Tầng Ngôn ngữ (Gemini Flash AI).
3. 📄 [DIAGRAM_SEQUENCE_FLOW.md](file:///c:/Users/Admin/Desktop/hackathon-2026/DIAGRAM_SEQUENCE_FLOW.md):
   * Sơ đồ tuần tự theo thời gian thực (Sequence Diagram) cho 2 giai đoạn: Giai đoạn 1 (Ingestion & Sinh sơ đồ) và Giai đoạn 2 (Vòng lặp tương tác từng lượt).
4. 📄 [DIAGRAM_NODE_STATE_MACHINE.md](file:///c:/Users/Admin/Desktop/hackathon-2026/DIAGRAM_NODE_STATE_MACHINE.md):
   * Máy trạng thái 4 màu của Node (Xám $\to$ Vàng $\to$ Xanh / Đỏ).
   * **Cơ chế phân biệt Giải thích thêm (Elaboration) vs Bế tắc (Stuck):** Khi người học nói thêm ý ("Khoan để anh nói thêm...", bổ sung ví dụ) $\to$ Backend KHÔNG tăng `retry_count`. Chỉ tăng khi người học trả lời câu hỏi vặn mà sai lệch bản chất.
   * **Nút bấm chủ động "Tạm bỏ qua / Đánh dấu ôn sau":** Người học tự quyết định dừng bài học bất cứ lúc nào, không bị ép phải nói đủ 3 lần.
   * **Phản xạ tâm lý êm ái của AI:** Khi chạm mốc 3 lần, Bé Minh đóng vai đứa trẻ thông cảm, ghi vào sổ tay và tự nhiên chuyển bài tiếp theo, không có màn hình FAILED hay phán xét người học.

---

## 3. TÀI LIỆU HƯỚNG DẪN DÀNH RIÊNG CHO FRONTEND
* **File tạo mới:** [FRONTEND_UI_THEME_GUIDE.md](file:///c:/Users/Admin/Desktop/hackathon-2026/FRONTEND_UI_THEME_GUIDE.md)
* **Nội dung hoàn tất:**
  * **Wireframe Buồng lái nhận thức chia đôi (Cognitive Cockpit):** Cột trái Bản đồ ReactFlow (40%) + Cột phải Vùng phản xạ Feynman (60%).
  * **Website / App tham khảo chuẩn quốc tế:** Heptabase (Split-view), Linear.app (Sleek Dark Mode), Brilliant.org (Học tương tác ngắn), shadcn/ui (Bộ UI component có sẵn mã nguồn).
  * **Design Tokens & Bảng mã màu Tailwind CSS:** Cung cấp sẵn mã Hex và class Tailwind cho nền Dark Mode, 4 màu trạng thái Node (Gray/Yellow/Green/Red) và hiệu ứng chuyển động viền.

---

## 4. ĐỒNG BỘ CONTRACT DỮ LIỆU & BẢO VỆ PHẢN BIỆN
* **File cập nhật:** [TECHNICAL_ENGINES_SPEC.md](file:///c:/Users/Admin/Desktop/hackathon-2026/TECHNICAL_ENGINES_SPEC.md), [SYSTEM_ARCHITECTURE_RFC.md](file:///c:/Users/Admin/Desktop/hackathon-2026/SYSTEM_ARCHITECTURE_RFC.md), [DEFENSE_QNA_CHEAT_SHEET.md](file:///c:/Users/Admin/Desktop/hackathon-2026/DEFENSE_QNA_CHEAT_SHEET.md)
* **Nội dung:** Bổ sung trường `intent: "EVALUATION" | "ELABORATION"` vào gói tin `AIEvaluationResponse` để Backend và AI phối hợp chuẩn xác theo đúng tâm lý học hành vi.
