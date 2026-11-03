# Câu hỏi gửi Ban giám khảo / BTC — vòng thử thách

> Soạn ngày 01/11/2026. Đã đối chiếu với `references/thele.md`, không hỏi lại điều thể lệ đã ghi rõ.
> Dòng in nghiêng sau mỗi câu là lý do hỏi, dành cho nhóm đọc; khi gửi thì bỏ đi.
> Nếu chỉ hỏi được vài câu, ưu tiên các câu **1, 2, 6, 7, 8**.

## ⭐ 1. Luật commit và việc chuẩn bị trước (ảnh hưởng trực tiếp tới tư cách thi)

1. Nhóm em đã viết sẵn **tài liệu thiết kế** (đặc tả, kiểu dữ liệu, API, sơ đồ), có mẫu kiểu dữ liệu và SQL, không có mã nguồn sản phẩm. Trong giờ thi, nhóm em có được mở tài liệu này để đọc và làm theo không?
   *Cả kế hoạch dựa vào `spec/`.*
2. Thế nào thì bị coi là **"bulk commit"**? Có ngưỡng số dòng hay số file không? Ví dụ commit đầu chạy `create-next-app` sinh vài chục file, hoặc `package-lock.json` dài hàng nghìn dòng, có bị tính là bulk không?
3. Nhóm em có được tạo sẵn **tài khoản và dịch vụ** trước giờ thi không: project Supabase, GitHub OAuth App, tài khoản Vercel, API key Gemini? Phần này là cấu hình, không phải code.
4. Nhóm em cần nộp link GitHub repo **trước giờ cụ thể nào**?
5. BTC kiểm commit theo **nhánh `main`** hay theo mọi nhánh?

## ⭐ 2. Lịch và mốc giờ

6. Giờ chính xác của vòng thử thách là mấy giờ bắt đầu và mấy giờ **dừng code**? Có giờ điểm danh không?
   *D-47 đang giả định 12:00 07/11 → 09:00 08/11.*

## ⭐ 3. Cách chấm và demo

7. Sản phẩm vòng thử thách phải "phát triển từ ý tưởng vòng sơ loại". Nếu nhóm em **mở rộng hoặc thu hẹp tính năng** so với lúc thuyết trình sơ loại thì có bị trừ điểm không?
8. Ban giám khảo xem sản phẩm qua **link web đã deploy** hay đội chạy trên máy? Có bắt buộc phải deploy không?
9. Thời gian **thuyết trình + demo + phản biện** của mỗi đội là bao lâu? Thứ tự lên trình bày được công bố trước hay bốc thăm?
10. Tiêu chí chấm vòng thử thách (ý tưởng / lập trình / thuyết trình) có **trọng số hoặc thang điểm chi tiết** không ạ?
11. Khi chấm phần lập trình, BGK có xem **chất lượng code, test, README** trong repo không, hay chỉ xem sản phẩm chạy?

## 4. Nộp bài

12. Hạn 09:30 thì cần nộp những gì: chỉ **file slide** hay có thêm link repo, link demo, video? Nộp qua kênh nào?
13. Slide nộp **định dạng gì** (PDF/PPTX), tên file theo cú pháp `[Tên đội]_[Tên sản phẩm]` như vòng sơ loại phải không? Dung lượng tối đa là bao nhiêu?
14. **Áp phích** (chiếm 10% điểm) nộp **hạn nào**, đăng ở đâu, và lượt tương tác tính **tới khi nào**?
    *Thể lệ chỉ ghi cách tính điểm tương tác.*

## 5. Hạ tầng tại điểm thi

15. Điểm thi có **wifi** không, có chặn trang hay cổng nào không (GitHub, Vercel, Supabase, Google AI)?
16. Mỗi đội có **đủ ổ điện** cho 5 laptop không? Nhóm em có được mang màn hình phụ hoặc ổ cắm nối dài không?
17. Lúc thuyết trình thì dùng **máy chiếu cổng gì** (HDMI / USB-C)? Đội dùng laptop của mình hay máy của BTC?
18. BTC cấp 5 USD credit Google Cloud: credit này dùng được với **API key của AI Studio** không, và **hạn dùng** tới khi nào?

## 6. Sinh hoạt qua đêm

19. Trong đêm, thành viên có được **ngủ tại chỗ** không? Nếu cần rời khu vực thi thì xin BTC đồng ý bằng cách nào?
    *Kế hoạch có lịch ngủ xoay.*
20. Nếu một thành viên phải **vắng một khoảng** (ví dụ việc gia đình) thì có ảnh hưởng tới tư cách thi của đội không?

## 7. Xin ý kiến về dự án

21. Nhóm em làm sản phẩm biến một repo GitHub công khai (hoặc file `.zip`) thành **bản đồ kiến trúc** gồm tối đa 20 phần chính, rồi cho người học trả lời câu hỏi và **tự giải thích lại** (kiểu Feynman) để AI chấm và gợi ý. Anh thấy hướng này có phù hợp với đề bài và tiêu chí của cuộc thi không?
22. Mỗi repo chỉ hiện **tối đa 20 phần chính**, repo lớn sẽ không thấy hết từng file. Anh thấy giới hạn này có chấp nhận được không?
    *`CONFIG` giới hạn 20 node.*
23. AI vẫn có thể giải thích sai. Nhóm em có bộ kiểm chặn tên bịa và công nghệ không có trong repo, nhưng **không bảo đảm đúng nghĩa 100%** và ghi rõ nhãn "AI" trên giao diện. Cách xử lý và trình bày giới hạn này như vậy có ổn không?
    *INV về guardrail.*
24. Nhóm em dùng các kỹ thuật **đã có sẵn** (BKT để theo dõi mức hiểu, PageRank, Tree-sitter) và sáng tạo ở **cách kết hợp** thành một sản phẩm học tập. Khi chấm tính sáng tạo, như vậy có được đánh giá cao không?
25. Với 21 giờ code, anh ưu tiên **một luồng chính chạy trọn vẹn, ổn định** hay **nhiều tính năng** dù chưa hoàn thiện?
    *Quyết định cắt việc theo `doc-de-hieu/07_ke_hoach_21h.md`.*
26. Anh có góp ý nào khác về ý tưởng, người dùng mục tiêu hoặc cách demo của nhóm em không ạ?

---

## Ghi câu trả lời

| Câu | Trả lời của BGK/BTC | Ảnh hưởng tới spec / kế hoạch |
| :-: | :-- | :-- |
| | | |
