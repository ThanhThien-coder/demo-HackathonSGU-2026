# BỘ CÂU HỎI & HƯỚNG DẪN BẢO VỆ KỸ THUẬT (DEFENSE Q&A CHEAT SHEET)
## DỰ ÁN: SGU-FEYNMAN - VÒNG SƠ LOẠI HACKATHON SGU 2026

Tài liệu chuẩn bị các luận điểm phản biện kỹ thuật sắc bén, ngắn gọn, tự tin dành cho đội thi khi đối mặt với các câu hỏi đào sâu từ Hội đồng Ban Giám khảo (BGK).

---

### CÂU HỎI 1: TẠI SAO PHẢI PHÂN CHIA VAI TRÒ GIỮA BACKEND VÀ AI MÀ KHÔNG ĐỂ AI TỰ QUYẾT ĐỊNH MỌI THỨ?
- **Thách thức từ BGK:** *"Hiện nay các mô hình AI rất thông minh, tại sao không để AI tự quyết định xem người học hiểu bài chưa và tự chuyển bài tiếp theo?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Để hệ thống vận hành ổn định và đúng sư phạm, chúng em phân định rõ vai trò của từng thành phần:
  > - **Mô hình AI:** Đảm nhận việc xử lý ngôn ngữ tự nhiên. Lúc đầu, AI đọc tài liệu do người dùng tải lên để trích xuất và sinh ra cây sơ đồ các node bài học ban đầu (người dùng có thể xem lại và chỉnh sửa theo ý mình). Trong phiên học, AI đọc câu trả lời của người học để đánh giá mức độ hiểu và đưa ra câu hỏi tiếp theo.
  > - **Backend điều phối:** Lưu trữ tiến độ bài học trên cây sơ đồ và kiểm soát logic chuyển trạng thái (đổi màu node Xám/Vàng/Xanh, mở khóa bài theo đúng thứ tự).
  > Nếu để AI tự quyết định toàn bộ luồng đi, AI rất dễ bị ảo giác (hallucination), dễ dãi cho qua hoặc tự nhảy cóc bài học mà không theo thứ tự logic sư phạm."

---

### CÂU HỎI 2: DỰ ÁN TIẾT KIỆM CHI PHÍ NHƯ THẾ NÀO SO VỚI MÔ HÌNH CHATBOT THÔNG THƯỜNG?
- **Thách thức từ BGK:** *"Mỗi lượt chat đều gọi API thì chi phí vận hành sẽ như thế nào khi cuộc trò chuyện kéo dài? Hệ thống tiết kiệm chi phí hơn chatbot thông thường ở điểm nào?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Hệ thống tối ưu chi phí dựa trên cách tổ chức dữ liệu thông minh giữa Backend và AI:
  > 1. **Vấn đề của Chatbot thông thường:** Luôn phải gửi dồn toàn bộ lịch sử trò chuyện cũ vào mỗi câu hỏi mới. Càng trò chuyện dài thì lượng dữ liệu gửi đi càng nặng, làm chi phí API tăng vọt và tốc độ phản hồi ngày càng chậm.
  > 2. **Giải pháp của SGU-Feynman:** Toàn bộ tiến độ và trạng thái học tập đã được lưu trực tiếp trên cây sơ đồ ở Backend. Nhờ vậy, mỗi lượt trao đổi với AI chỉ cần gửi **tin nhắn gần nhất kết hợp với tiêu chuẩn của khái niệm đang học**.
  > 3. **Hiệu quả thực tế:** Dữ liệu gửi đi ở mỗi lượt luôn giữ ở mức tinh gọn, không bị phình to theo thời gian. Điều này giúp giảm thiểu đáng kể chi phí gọi API cho mỗi phiên học, đồng thời giữ cho tốc độ phản hồi luôn nhanh chóng và ổn định."

---

### CÂU HỎI 2B: TẠI SAO NÓI ĐÂY LÀ "DẠY HỌC THÔNG MINH" TRONG KHI AI KHÔNG ĐỨNG GIẢNG BÀI?
- **Thách thức từ BGK:** *"Dạy học thông minh là phải có trợ lý AI đứng giảng bài, giải thích cặn kẽ chứ? Ở đây AI chỉ đóng vai đứa trẻ ngồi nghe thì dạy học thông minh ở chỗ nào?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Nhiều người lầm tưởng dạy học là phải có một ông thầy hoặc con bot nhồi nhét kiến thức một chiều vào đầu học sinh. Trong Khoa học Giáo dục (Pedagogy & Cognitive Science), đó là lối dạy thụ động tạo ra 'ảo tưởng thành thạo' — nghe thì hiểu nhưng khi thi vấn đáp là ú ớ.
  > SGU-Feynman ứng dụng mô hình **Học qua Giảng dạy (Protégé Effect / Learning by Teaching)**:
  > 1. **Dạy thông minh nhất là dạy Tự nhận thức (Metacognition):** Khi ép sinh viên phải giảng lại cho đứa trẻ hiểu, não bộ bị buộc phải tự truy xuất, tái cấu trúc và tự tìm ra lỗ hổng của chính mình.
  > 2. **AI là 'Giảng viên vô hình' (The Invisible Tutor):** Đứa trẻ ở mặt nổi là người nghe ngây ngô, nhưng phía sau là một **Hệ thống chẩn đoán thích ứng**. Nó không mớm đáp án mà giăng giàn giáo nhận thức 3 bậc (Scaffolding): Bắt bẻ từ chuyên môn, phản biện logic sai và ép người học phải suy nghĩ để tự sửa sai.
  > 3. **Chẩn đoán điểm mù thời gian thực:** Cây đồ thị DAG chỉ ra chính xác sinh viên bị 'gãy' tư duy ở mắt xích nào (ví dụ: vững Biến nhưng hổng Con trỏ), thay vì chỉ chấm điểm đúng/sai chung chung."

---

### CÂU HỎI 3: NẾU NGƯỜI DÙNG CỐ TÌNH NÓI NHẢM HOẶC LẠC ĐỀ THÌ SAO?
- **Thách thức từ BGK:** *"Làm sao hệ thống xử lý khi sinh viên nói linh tinh, trêu chọc AI hoặc cố tình không đi vào bài học?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Ở mỗi node, System Instruction của AI luôn được ghim chặt mục tiêu sư phạm của node đó (Pinned Core). Khi phân tích Single-Pass, nếu câu trả lời không chứa thông tin liên quan hoặc cố tình lạc đề, cờ `is_valid` trả về sẽ là `false` kèm lỗi tương ứng.
  > Đồng thời, AI Persona đóng vai người bạn học sẽ hỏi vặn lại: *'Ơ cái này đâu có liên quan đến [Khái niệm] đâu anh, anh giải thích lại giúp em với!'*. Backend duy trì biến `retry_count`. Nếu lạc đề quá 3 lần, hệ thống sẽ đánh dấu node đó là màu ĐỎ, khóa cảnh báo và chuyển bài để không làm nghẽn tiến trình."

---

### CÂU HỎI 4: VÌ SAO BỎ PHAO CỨU SINH (HINT) VÀ VOICE API?
- **Thách thức từ BGK:** *"Tại sao ứng dụng học tập lại không có nút gợi ý đáp án (Hint) hay hỗ trợ giọng nói (Voice)?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Chúng em đã cân nhắc kỹ dựa trên góc nhìn Sư phạm và Kỹ thuật thực chiến:
  > 1. **Về mặt sư phạm (Tránh xung đột vai diễn):** Kỹ thuật Feynman cốt lõi là người học đóng vai người giảng, còn AI đóng vai người học chưa biết gì. Một đứa trẻ tò mò không thể 'mớm đáp án ngược lại' cho người dạy. Nếu cho nút Hint, người học sẽ ỷ lại và quay lại lối mòn học thụ động. Thay vào đó, chúng em giải quyết rào cản bằng cơ chế **Giàn giáo nhận thức 3 bậc (Scaffolding)** để AI mồi tình huống đời thường.
  > 2. **Về mặt kỹ thuật thực tế:** Môi trường thi đấu và phòng học thường ồn ào, Web Speech API của trình duyệt hoạt động thiếu ổn định giữa các thiết bị. Khung Text Console 1–2 câu cô đọng giúp người học rèn luyện tư duy gãy gọn và bảo đảm độ ổn định tối đa."

---

### CÂU HỎI 5: KẾ HOẠCH TRIỂN KHAI THỰC TẾ TRONG 24 GIỜ VÒNG THỬ THÁCH (HACKATHON DELIVERY)?
- **Thách thức từ BGK:** *"Ý tưởng nghe rất hay nhưng liệu các bạn có kịp hiện thực hóa sản phẩm hoàn chỉnh trong 24 giờ thi tập trung không?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Hệ thống đã được chúng em module hóa cực kỳ tinh gọn và độc lập thành 2 trục:
  > - **Trục Backend/Đồ thị:** Chỉ cần quản lý cấu trúc dữ liệu DAG trên bộ nhớ (In-memory) và thuật toán duyệt Topo/Kahn đơn giản, không phụ thuộc vào Database bên ngoài phức tạp.
  > - **Trục AI:** Toàn bộ tương tác được thu gọn vào đúng 1 Endpoint duy nhất với Single-Pass JSON Contract.
  > Nhờ phân tách rõ ràng qua các Hợp đồng Dữ liệu (Data Contracts), nhóm lập trình viên Frontend, Backend và AI có thể ráp nối giao diện ReactFlow với Core Engine chỉ trong vài giờ đầu và dành toàn bộ thời gian còn lại để tinh chỉnh trải nghiệm sư phạm."

---

### CÂU HỎI 6: LÀM SAO BIẾT NGƯỜI HỌC THỰC SỰ HIỂU HAY CHỈ COPY SÁCH GIÁO KHOA? VÀ LỠ AI CHẤM SAI THÌ SAO?
- **Thách thức từ BGK:** *"Nếu sinh viên copy nguyên văn định nghĩa trong sách mà không có từ khó, hệ thống có bị lừa cho qua không? Và nếu AI đánh giá sai lệch thì sao?"*
- **Câu trả lời chuẩn kỹ thuật:**
  > "Chúng em giải quyết trọn vẹn cả 2 vấn đề này bằng mô hình **Thẩm định Đa tiêu chí (Rubric Scoring)** và **Cơ chế Kháng sai (Fault Tolerance)**:
  > 1. **Chống học vẹt sách giáo khoa:** AI không chỉ chấm đúng/sai, mà lượng hóa thành 3 điểm số: *Độ chính xác (Accuracy)*, *Độ bình dị (Simplicity)*, và *Độ liên hệ thực tế (Analogy Grounding)*. Nếu người học copy sách giáo khoa, điểm chính xác có thể cao nhưng điểm liên hệ thực tế sẽ dưới 60. Backend lập tức giữ màu VÀNG và kích hoạt câu hỏi ngoại suy tình huống của đứa trẻ để thử thách độ thấu suốt thực sự.
  > 2. **Kháng sai lệch AI:** AI không bao giờ được phép tự phán quyết màu, mà chỉ cung cấp điểm số cho bộ luật Backend gán màu toán học. Hơn nữa, AI đóng vai một đứa trẻ học hỏi, phản xạ 'chưa hiểu' của đứa trẻ chỉ là cơ hội để người học thử nghiệm thêm một cách diễn đạt mới. Nếu bế tắc quá 3 lần, hệ thống tự động cho qua để bảo vệ trải nghiệm và lưu vào danh sách chẩn đoán cuối phiên."
