# BẢNG CÂU HỎI THAM VẤN ANH CẢNH (MENTOR KỸ THUẬT)
**Dự án:** SimpliFey — Nền tảng học hiểu kiến trúc mã nguồn & hỗ trợ sinh viên giải thích đồ án  
**Thời gian:** Chuẩn bị trước vòng thử thách 21 giờ (Hackathon SGU 2026)  

> **Mục đích:** Bộ câu hỏi tinh gọn gồm **8 câu trọng tâm nhất** để trao đổi nhanh (khoảng 15–20 phút) với **anh Cảnh** (mentor hỗ trợ chuyên môn cho sinh viên), bám sát barem 100 điểm của BTC:
> 1. Tính hợp lệ khi thu hẹp phạm vi đề tài so với vòng sơ khảo (Tiêu chí I, II).
> 2. Phân bổ timeline 21h và cách thể hiện làm việc nhóm, quản lý task (Tiêu chí IV, VIII).
> 3. Giải thích kiến trúc kỹ thuật và lượng hóa tối ưu chi phí AI (Tiêu chí IV, VI).
> 4. **Chiến lược triển khai AWS hoặc Google Cloud để lấy trọn 10 điểm Tiêu chí VII.**
> 5. Kịch bản demo và xử lý rủi ro khi BGK yêu cầu nạp repo lạ tại chỗ (Tiêu chí IV, VIII).
> 6. **Báo cáo đánh giá mô hình (Accuracy/Latency) và rào chắn an toàn Prompt Injection (Tiêu chí III - 20 điểm).**
> 7. Định vị điểm mới "chống vibe-coding" và lợi thế cạnh tranh (Tiêu chí I, II).
> 8. Định hướng phát triển nền tảng mã nguồn mở cộng đồng kết hợp Đồ án tốt nghiệp / Nghiên cứu (Tiêu chí V).

---

## 🎙️ LỜI MỞ ĐẦU GỢI Ý KHI GẶP ANH CẢNH

> *"Chào anh Cảnh, nhóm em là nhóm SimpliFey. Trước khi bước vào 21 giờ thi, nhóm đã chuẩn bị trước tài liệu thiết kế và kế hoạch chi tiết. Nhóm cũng có gửi tin nhắn hỏi BTC một số thắc mắc nhưng hiện BTC chưa phản hồi vì đang bận chuẩn bị cho cuộc thi. Hôm nay nhóm xin phép được tham khảo nhanh kinh nghiệm thực chiến của anh qua các vấn đề cốt lõi nhất để nhóm triển khai an toàn và bám sát trọn vẹn barem điểm của BGK ạ."*

---

## ⭐ 8 CÂU HỎI TRỌNG TÂM THAM VẤN ANH CẢNH

### 1. Thu hẹp bài toán từ "tài liệu/PDF" sang "đọc hiểu repo code IT (chống vibe-coding)":
- **Bối cảnh của nhóm:**  
  Ở vòng sơ loại, nhóm đăng ký ý tưởng hỗ trợ học tập chung qua tài liệu/PDF. Khi bắt tay vào làm cụ thể, nhóm nhận thấy xử lý tài liệu chung quá rộng và khó kiểm chứng người học có thực sự hiểu hay không.  
  Vì vậy, nhóm quyết định thu hẹp phạm vi vào đúng chuyên ngành: **tập trung cho sinh viên IT giải quyết vấn đề "vibe coding"** (dùng AI sinh code chạy được nhưng không giải thích được luồng khi thi vấn đáp đồ án). Nhóm chuyển đầu vào sang **phân tích mã nguồn (link GitHub hoặc file zip)** để bóc tách luồng gọi hàm thành bài học và hỏi đáp theo phương pháp Feynman bám sát dòng code.  
- **Tình trạng:** Nhóm đã gửi hỏi BTC nhưng chưa nhận được phản hồi.
- **Câu hỏi tham vấn anh Cảnh:**  
  *Thưa anh, việc nhóm thu hẹp bài toán từ tài liệu chung sang mã nguồn của sinh viên IT như vậy có được nhìn nhận là phát triển tiếp từ ý tưởng sơ loại không, hay có bị xem là làm sang đề tài khác ạ? Khi thuyết trình, nhóm nên dẫn dắt lý do thu hẹp này thế nào để BGK thấy tự nhiên và hợp lý ạ?*

---

### 2. Phân bổ các mốc thời gian trong 21 giờ & Thể hiện làm việc nhóm:
- **Bối cảnh của nhóm:**  
  Về mặt lập kế hoạch (tiêu chí Planning & Teamwork), nhóm xây dựng workflow nội bộ theo chuẩn task đặc tả: phân rã thành **các task nhỏ có tiêu chí kiểm tra rõ ràng**, phân công các vai trò (Frontend, Backend/Engine, AI prompt/eval, DevOps), kết hợp công cụ tự động hóa để hỗ trợ code và kiểm thử từng phần.
- **Câu hỏi tham vấn anh Cảnh:**  
  *1. Theo kinh nghiệm thực chiến của anh, trong 21 giờ thi thì nhóm nên chia các mốc thời gian (timeline) như thế nào là an toàn nhất? Mốc mấy giờ thì nên dừng hẳn code tính năng mới để tập trung chốt ổn định hệ thống, làm slide và tập dượt demo ạ?*  
  *2. Để ghi điểm cao ở tiêu chí 'Làm việc nhóm và quản lý công việc' (Tiêu chí VIII), nhóm nên trình bày tiến độ công việc và Git log phân chia vai trò giữa các thành viên thế nào để BGK thấy rõ sự phối hợp nhịp nhàng giữa người với người chứ không phải làm việc rời rạc ạ?*

---

### 3. Trình bày giải pháp kiến trúc & Lượng hóa tối ưu chi phí AI:
- **Bối cảnh của nhóm:**  
  Thay vì đưa toàn bộ repo cho AI đọc (rất tốn chi phí, phản hồi chậm và dễ bị ảo giác), nhóm dùng **phân tích tĩnh (Tree-sitter) để bóc tách luồng gọi hàm và kiến trúc trước**, sau đó AI chỉ nhận lát cắt code rất nhỏ của bài học đang mở để đặt câu hỏi và chấm điểm.
- **Câu hỏi tham vấn anh Cảnh:**  
  *1. Dưới góc nhìn của anh, hướng tiếp cận "phân tích tĩnh trước, AI đi sau" này có hợp lý không ạ? Khi BGK hỏi về kiến trúc và khả năng mở rộng (scale) khi có nhiều người dùng hoặc repo lớn, nhóm nên nhấn mạnh vào những điểm nào để làm rõ sự khác biệt kỹ thuật so với các ứng dụng chỉ đơn thuần bọc (wrapper) API của AI?*  
  *2. Ở Tiêu chí VI (Sử dụng AI tiết kiệm chi phí - 10 điểm), nhóm ước tính một người học đầu tiên của repo 7 bài tốn khoảng 58 500 token, khoảng 0,05 USD (giá Gemini 3.5 Flash-Lite, chưa đo trên code thật), và người học sau rẻ hơn nhờ dùng chung kết quả phân tích. Nhóm nên trình bày con số này thế nào (bảng so sánh với cách đưa cả repo cho AI, hay đo thật trong lúc demo) để BGK tin, thay vì chỉ thấy số ước tính ạ?*

---

### 4. Chiến lược triển khai Cloud (AWS hoặc Google Cloud) để bảo toàn 10 điểm Tiêu chí VII:
- **Bối cảnh của nhóm:**  
  Trong barem chấm điểm của BTC có **mục VII chiếm 10 điểm** yêu cầu triển khai lên **AWS hoặc Google Cloud** (có domain/IP công khai, HTTPS, cấu hình tài nguyên mạng an toàn). Thiết kế ban đầu dùng Vercel nên không đáp ứng. Nhóm đã chốt:
  - Toàn bộ app (Next.js) chạy trên **Google Cloud Run** (Singapore), Vercel chỉ giữ làm bản dự phòng khi demo.
  - Đầu giờ thi deploy bằng `gcloud run deploy --source`, sau đó mới viết Dockerfile trên nhánh riêng.
  - Database và đăng nhập vẫn dùng Supabase (Postgres trên AWS Singapore).
  - Gọi Gemini qua **Vertex AI** bằng service account của Cloud Run, không để API key trên server.
  - Có thêm 1 service Cloud Run làm môi trường staging, deploy tự động bằng GitHub Actions.
- **Câu hỏi tham vấn anh Cảnh:**  
  *1. Dạ anh Cảnh ơi, với phương án trên, anh thấy nhóm còn thiếu gì để lấy trọn 10 điểm Cloud không ạ (ví dụ domain riêng, giám sát, cảnh báo chi phí)? Database để ở Supabase thay vì Cloud SQL thì có bị BGK trừ điểm không anh?*  
  *2. Credit Google Cloud mà cuộc thi cấp có dùng được để trả tiền gọi Gemini qua Vertex AI không ạ? Nhóm đọc tài liệu thì thấy credit dùng thử 300 USD của Google không trả được Gemini API, nên muốn hỏi trước để chuẩn bị nguồn chi trả.*

---

### 5. Kịch bản demo và xử lý RỦI RO khi BGK yêu cầu thử repo lạ tại chỗ:
- **Bối cảnh & Rủi ro kỹ thuật:**  
  Nhóm chuẩn bị sẵn một repo thực tế (Web Bookstore khoảng 150–200 file) để demo 1 luồng trọn vẹn: Đọc repo -> Hiện bản đồ bài học -> Mở 1 luồng nghiệp vụ -> AI hỏi câu hỏi bám code -> Sinh viên trả lời -> AI chấm theo ý bắt buộc.  
  Tuy nhiên, rủi ro lớn nhất là trong lúc demo, **BGK có thể bất ngờ yêu cầu: "Dán thử link repo của thầy vào xem nào!"**. Các rủi ro tiềm ẩn:
  - Repo của BGK có thể dùng ngôn ngữ/framework ngoài phạm vi nhóm đã kiểm chứng kỹ (nhóm mới tối ưu tốt nhất cho TypeScript/JavaScript và Python).
  - Cấu trúc repo lạ có thể làm thời gian phân tích lâu hơn bình thường.
  - Nguy cơ mạng tại hội trường thi bị nghẽn hoặc chạm giới hạn gọi API của AI.
- **Câu hỏi tham vấn anh Cảnh:**  
  *Theo anh, nếu rơi vào tình huống BGK yêu cầu thử ngay một repo lạ của thầy, nhóm nên ứng biến thế nào cho khéo léo ạ? Nhóm có nên chủ động xin phép demo luồng chuẩn bị sẵn trước rồi mới thử nghiệm repo ngoài, hay có cách nào để vừa thể hiện sự tự tin nhưng vẫn kiểm soát được rủi ro kỹ thuật không anh?*

---

### 6. Đánh giá chất lượng mô hình & Rào chắn an toàn AI (Prompt Injection) — Tiêu chí III (20 điểm):
- **Bối cảnh của nhóm:**  
  Tiêu chí III (20 điểm) đòi hỏi sản phẩm phải có chỉ số đo lường thực tế (Accuracy, Latency, Test Report), kiểm soát ảo giác (hallucination) và rào chắn an toàn (prompt injection guardrails, data masking). SimpliFey đã thiết kế: cổng gác kiểm mọi chữ AI sinh ra (chặn tên hàm bịa, công nghệ không có trong repo, từ ngữ không phù hợp), chấm theo các ý bắt buộc lấy từ code, regex chặn câu lệnh tấn công trong câu trả lời, che secret và thông tin cá nhân (email, số điện thoại, CCCD) trước khi gửi AI, chặn từ xấu không tốn token. Mức hiểu của người học được ước lượng bằng mô hình BKT. Tuy nhiên nhóm chưa có số đo thực nghiệm.
- **Câu hỏi tham vấn anh Cảnh:**  
  *1. Thưa anh, với một sản phẩm kết hợp giữa AST code và LLM như SimpliFey, nhóm nên chuẩn bị Báo cáo đánh giá mô hình (Test Report) như thế nào trong 21 giờ để BGK công nhận tính khoa học ạ? Nhóm có nên chạy sẵn một tập benchmark 20–30 ca kiểm thử câu hỏi/chấm điểm để đưa ra chỉ số % chính xác (Accuracy / F1) không anh?*  
  *2. Đối với rủi ro Prompt Injection (ví dụ sinh viên thi vấn đáp cố tình gài prompt ma mãnh vào câu trả lời để ép AI chấm 10/10), nhóm nên trình bày cơ chế phòng thủ nhiều lớp (regex chặn câu lệnh + ý bắt buộc lấy từ code + cổng gác đầu ra) thế nào cho trung thực, nói rõ cái gì chặn được và giới hạn còn lại, để BGK tin tưởng ạ?*

---

### 7. Định vị điểm mới và lợi thế cạnh tranh trước BGK:
- **Bối cảnh của nhóm:**  
  Hiện tại trên thị trường đã có các công cụ như DeepWiki, GitDiagram (giúp *đọc* và vẽ sơ đồ kiến trúc), hay Copilot, Cursor (giúp *viết code hộ*). SimpliFey định vị ở chiều ngược lại: **Kiểm tra xem sinh viên có thực sự HIỂU code của chính mình hay không** (chống học vẹt, chống vibe-coding).
- **Câu hỏi tham vấn anh Cảnh:**  
  *Anh thấy cách định vị "không dừng lại ở việc đọc code, mà tập trung kiểm tra mức độ hiểu code của sinh viên" đã đủ sắc bén để tạo sự khác biệt rõ ràng chưa ạ? Nhóm nên nhấn mạnh giá trị thực tế nào nhất để thuyết phục BGK ở tiêu chí "Điểm mới và lợi thế cạnh tranh"?*

---

### 8. Định hướng phát triển cộng đồng Open-Source kết hợp Đề tài Nghiên cứu / Đồ án tốt nghiệp:
- **Bối cảnh của nhóm:**  
  Tiêu chí V (Đóng góp & Tính cộng đồng - 10 điểm) đánh giá cao tác động tích cực, khả năng nhân rộng và lợi ích lâu dài cho cộng đồng. Nhóm xác định SimpliFey là nền tảng mã nguồn mở phi lợi nhuận hỗ trợ cộng đồng sinh viên IT nâng cao năng lực giải thích code, đồng thời là hướng nghiên cứu chuyên sâu về độ tin cậy của AI trong giáo dục lập trình (tiền đề cho Đồ án tốt nghiệp / NCKH).
- **Câu hỏi tham vấn anh Cảnh:**  
  *Trong tiêu chí 'Đóng góp và tính cộng đồng', nếu nhóm định vị SimpliFey là một dự án Mã nguồn mở (Open-Source) phục vụ cộng đồng sinh viên CNTT toàn quốc và các trường đại học, kết hợp mở rộng thành Đề tài Nghiên cứu khoa học chuyên sâu thì BGK có đánh giá cao hơn so với việc cố vẽ ra một mô hình kinh doanh startup kiếm tiền khi chưa hoàn thiện không anh?*

---

## 📝 BẢNG GHI NHẬN Ý KIẾN CỦA ANH CẢNH

| STT | Vấn đề hỏi | Tiêu chí barem liên quan | Lời khuyên của Anh Cảnh | Việc nhóm cần làm ngay |
| :-: | :--- | :---: | :--- | :--- |
| **1** | Thu hẹp phạm vi đề tài sang repo code | Tiêu chí I, II | | |
| **2** | Phân bổ mốc thời gian 21h & Làm việc nhóm | Tiêu chí IV, VIII | | |
| **3** | Kiến trúc backend & Tối ưu chi phí AI | Tiêu chí IV, VI | | |
| **4** | **Chiến lược triển khai AWS / Google Cloud** | **Tiêu chí VII (10đ)** | | |
| **5** | Ứng phó khi BGK yêu cầu thử repo lạ | Tiêu chí IV, VIII | | |
| **6** | **Test Report mô hình & Chống Prompt Injection** | **Tiêu chí III (20đ)** | | |
| **7** | Định vị điểm mới (chống vibe-coding) | Tiêu chí I, II | | |
| **8** | Định hướng Open-Source & Đề tài nghiên cứu | Tiêu chí V (10đ) | | |
