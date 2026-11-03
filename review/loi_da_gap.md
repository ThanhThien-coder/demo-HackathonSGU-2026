# Bảng theo dõi lỗi đã gặp khi duyệt AI & Ca test hồi quy

> Căn cứ quy trình: `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (GUARD-18 bước 5) & D-51.  
> Nguyên tắc bất biến: Khi gặp lỗi ❌ thì **sửa nguyên nhân (prompt, ngữ cảnh, cổng gác), tuyệt đối không sửa tay output của AI**.  
> Quy định an toàn: Không chép code repo người dùng vào `review/` (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15).

---

## 1. Nguyên tắc quản lý và khắc phục lỗi

1. **Ghi nhận đầy đủ:** Mỗi lỗi ❌ phát hiện trong quá trình duyệt tay hoặc từ báo cáo người học (`dispute_reports`) phải có một dòng trong bảng theo dõi dưới đây.
2. **Ca test hồi quy bắt buộc:** Mỗi lỗi ❌ phải đi kèm ít nhất 1 ca test hồi quy xác định rõ:
   - **Đầu vào (Input):** Prompt, ngữ cảnh lát cắt hoặc câu trả lời đầu vào.
   - **Mã lỗi / Vấn đề:** Tên symbol bịa, từ cấm lọt lưới, hoặc câu trả lời bị chấm sai.
   - **Kỳ vọng (Expected):** Cổng gác chặn đúng, hoặc AI xử lý đạt sau khi sửa prompt.
3. **Nâng phiên bản prompt:** Khi sửa prompt giải quyết lỗi:
   - Tăng `PROMPT_VERSION` trong `CONFIG`.
   - Xóa cache AI và chạy lại toàn bộ quy trình duyệt 3 lần để bảo đảm không bị suy giảm chất lượng các ca đã đạt trước đó.
4. **Bài học vào prompt (D-51):** Chỉ thêm luật hoặc ví dụ ngắn gọn do nhóm tự đúc kết, không chép code của người dùng vào prompt; kiểm tra trần số bài học theo Q-13.

---

## 2. Bảng theo dõi lỗi đã gặp

| Mã lỗi | Ngày ghi nhận | Lời gọi / Module | Mô tả lỗi phát hiện | Nguyên nhân gốc | Ca test hồi quy (Input ⇒ Expected) | Biện pháp khắc phục | Prompt Version | Trạng thái |
| :-- | :-: | :-- | :-- | :-- | :-- | :-- | :-: | :-: |

---

## 3. Thống kê lỗi theo phân loại cổng gác

| Nhóm lỗi | Số ca gặp | Đã chặn tự động bởi cổng gác | Đã sửa trong prompt | Cần kiểm tra lại ở H+17 |
| :-- | :-: | :-: | :-: | :-: |
| Bịa tên hàm / symbol ngoài lát cắt (GUARD-04, 05) | 0 | 0 | 0 | Có |
| Nhắc công nghệ ngoài tech stack repo (GUARD-06, 07) | 0 | 0 | 0 | Có |
| Nhận xét tổng quan không có căn cứ (GUARD-11) | 0 | 0 | 0 | Có |
| Gợi ý follow-up làm lộ đáp án hoặc sai nấc (GUARD-13) | 0 | 0 | 0 | Có |
| Chấm sai / hiểu sai trích dẫn người học (D-13) | 0 | 0 | 0 | Kiểm tra với 22 câu mẫu |
