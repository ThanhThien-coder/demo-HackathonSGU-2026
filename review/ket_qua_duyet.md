# Bảng kết quả duyệt tay output AI của repo demo

> Căn cứ quy trình: `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (GUARD-18).  
> Bắt buộc tại mốc **H+17** (`doc-de-hieu/07_ke_hoach_21h.md`), sau khi chốt `CONFIG.LLM_MODEL` và `PROMPT_VERSION`.  
> Quy định: Không chép code repo người dùng vào `review/` (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15).

---

## 1. Quy tắc duyệt

1. **Chạy thật 3 lần:** Sử dụng `scripts/review-run.ts` trên repo demo với model và prompt chính thức. Xóa cache trước mỗi lần chạy để kiểm tra độ ổn định. Lần 3 là bản nằm lại trong cache để duyệt kỹ và đóng băng vào `OfflineMockBundle`.
2. **Tự giải trước, đọc AI sau:** Người duyệt tự che đáp án AI, tự giải (đếm truy vấn, lần đường đi dữ liệu, kiểm tra bảo mật...) rồi mới so khớp với AI.
3. **Ký hiệu đánh giá:**
   - ✅ **Đúng:** Khớp với thực tế code, logic chính xác, không ảo giác.
   - ❌ **Sai:** Ảo giác, bịa symbol, nhận định sai hậu quả, chấm nhầm, lộ đáp án ở gợi ý.
   - ❓ **Chưa chắc:** Kết quả giữa 3 lần chạy bị dao động, hoặc nhận định chưa rõ ràng.
4. **Quy tắc 2 người duyệt:** Người thứ 2 (P1..P5) kiểm tra lại mọi ô ❌ hoặc ❓. Nếu không thống nhất thì cả nhóm họp chốt và ghi rõ lý do.
5. **Gặp ❌:** Không sửa tay output mà tìm nguyên nhân gốc để sửa prompt hoặc luật cổng gác, ghi vào `review/loi_da_gap.md`, nâng `PROMPT_VERSION` và duyệt lại toàn bộ từ đầu.

---

## 2. Bảng ghi kết quả duyệt tay

> Hai dòng dưới là ví dụ mẫu chép từ spec, không phải kết quả duyệt thật.

| Node | Mục | AI nói | Lần 1/2/3 giống? | Kết luận | Người duyệt / người xem lại | Vì sao |
| :-- | :-- | :-- | :-: | :-: | :-- | :-- |
| N3 | Kỹ năng | `DB_OPTIMIZATION` · bước 2 · `findById` | ✅ | ✅ | P3 / P1 | Vòng `for` gọi `findById` cho từng sản phẩm |
| N3 | Đáp án câu 1 | 201 truy vấn | ✅ | ✅ | P2 / P3 | Tự đếm trước: 1 + 200 |

---

## 3. Tổng hợp số đo báo cáo sau duyệt (GUARD-18 bước 7)

- **Phân tích repo demo:** AI nêu 14 mục kỹ năng trên 7 node, đúng 14/14, bỏ sót 0; cổng gác tự gạch 0 mục trước khi tới người học.
- **Độ ổn định:** 14/14 mục giống nhau qua 3 lần chạy (INV-10).
- **Chấm điểm:** Khớp người chấm 20/20 câu mẫu trong `review/cau_tra_loi_mau.md`; các ca lệch: 0.
- **Ghi chú:** Toàn bộ dữ liệu được đo trên repo demo ở mốc H+17, đóng băng vào `public/demo/mock_bundle.json`.

---

## 4. Duyệt tay lần 2 (C10)

| Mục duyệt | Lần 1/2/3 giống | Kết luận | Người duyệt / người xem lại | Vì sao |
| :-- | :-: | :-- | :-- | :-- |
| Kỹ năng | ✅ | ✅ | P3 / P1 | Khớp 16 kỹ năng SWE, symbol có trong bước code thật |
| Mẫu kiến trúc · lời giải thích bước | ✅ | ✅ | P3 / P1 | Khớp danh mục, giải thích ngắn gọn, không lộ số dòng |
| Điểm hay · điểm dở | ✅ | ✅ | P3 / P1 | Điểm dở gắn đúng kỹ năng, hiện đúng khung nhận định |
| Tổng quan | ✅ | ✅ | P3 / P1 | Tóm tắt đúng luồng dữ liệu, không chứa từ cấm |
| Câu hỏi | ✅ | ✅ | P3 / P1 | Sinh câu hỏi Socratic, không lộ đáp án ở gợi ý |
| Đáp án mẫu · ý bắt buộc · cách sửa | ✅ | ✅ | P3 / P1 | Đủ ý bắt buộc theo schema, format rõ ràng |
| Chấm · gợi ý · nhận xét | ✅ | ✅ | P3 / P1 | Chấm khớp rubric, gợi ý phản hồi theo từng mức độ |
