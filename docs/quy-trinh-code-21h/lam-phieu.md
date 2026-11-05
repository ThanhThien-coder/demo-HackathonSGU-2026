# Làm phiếu bằng 1 câu nhắn

Bạn chỉ nhắn 1 câu, ví dụ `làm B01 đi`. AI tự đọc README, đọc phiếu, tạo task, làm, tự kiểm, rồi đưa lại lệnh commit.

## Cho người dùng

Mở chat mới ở thư mục repo rồi nhắn:

| Nhắn | AI làm |
| :-- | :-- |
| `làm B01 đi` | Làm trọn phiếu, tự kiểm, dừng ở bước commit |
| `Làm tiếp` | Làm phiếu kế tiếp trong lịch của vai bạn đang làm |
| `kiểm B03` | Kiểm lại phiếu đã làm, không sửa gì |
| `B03 chưa đạt: <lỗi bạn thấy>` | Sửa đúng lỗi đó trong các file của phiếu |
| `Sửa lỗi B-06` | Sửa theo "Quy trình cho agent" trong [`loi-can-sua.md`](loi-can-sua.md) |

Không cần viết đúng từng chữ: `làm B01`, `Làm phiếu B01`, `làm b01 đi` đều như nhau.

**Việc của bạn chỉ còn 3 bước:**

1. Nhắn `làm <mã> đi`.
2. Đọc bảng kết quả AI báo, tự kiểm các ô cần mắt người.
3. Dán lệnh commit AI đưa. Luật thi yêu cầu commit là của chính bạn, nên AI không commit, không push.

AI tự kiểm lại bằng một agent mới, nên bạn không phải mở chat khác. Công cụ không có agent con thì AI báo rõ, lúc đó mở chat mới nhắn `kiểm <mã>` trước khi commit.

Các prompt ở Bước 1, Bước 2 trong phiếu vẫn giữ nguyên, dùng khi cần làm tay.

## Cho AI

Câu nhắn có mã phiếu và từ "làm" (`làm B01 đi`, `Làm phiếu B01`, `làm b01`) chính là lệnh duyệt. Không hỏi lại để xin duyệt task, trừ các trường hợp ở mục Dừng và hỏi.

### Làm phiếu

1. **Đọc:** đọc `AGENTS.md`, `docs/quy-trinh-code-21h/vai-<chữ đầu của mã>/README.md`, rồi tìm `docs/quy-trinh-code-21h/vai-*/<mã>-*.md`, đọc hết phiếu, kể cả mục "Bắt buộc theo bản chạy thử".
2. **Kiểm đầu vào:**
   - `git status` phải sạch. Có file đang sửa dở thì dừng.
   - Dòng "Cần có trước" của phiếu đã có trên `main`. Cách kiểm ở [`phieu-can-co.md`](phieu-can-co.md).
3. **Chuẩn bị:** chạy lệnh Bước 0 của phiếu.
4. **Tạo task:** có ai-kit thì chạy `ak task "<mã> — <tên phiếu>"`, chép nguyên các mục Được đọc, Được ghi, Việc cần làm, Tiêu chí xong, Cấm từ prompt Bước 1. Không có ai-kit thì dùng thẳng các mục đó, không tạo file.
5. **Làm:**
   - Phiếu ghi "agy viết file" và máy có `agy`: dùng skill `giao-task-agy`.
   - Máy không có `agy`: tự làm đúng mục Việc cần làm.
   - Phiếu ghi "Bạn tự làm" (E06, E09…): không tự làm, chỉ hướng dẫn người dùng đi qua từng ô Bước 3.
6. **Tự kiểm:** chạy lệnh ở Tiêu chí xong, so từng ô Bước 3, chạy `git status`. Đỏ thì sửa, tối đa 2 lượt.
7. **Kiểm độc lập:** có công cụ agent con thì giao một agent mới làm mục Kiểm phiếu, không đưa nó báo cáo của mình. Agent báo lỗi thì sửa, tính vào 2 lượt ở bước 6. Không có agent con thì ghi rõ trong báo cáo là chưa kiểm độc lập.
8. **Báo cáo** theo mẫu dưới, rồi dừng.

### Mẫu báo cáo

```text
Phiếu <mã>: xong / chưa xong
Lệnh kiểm: <kết quả thật>
Kiểm độc lập: đã làm / chưa làm
File đã đổi: <danh sách>

| Ô Bước 3 | Kết quả |
| ... | Đạt / Chưa đạt / Cần mắt người |

Điều chưa chắc: <nếu có>

Lệnh commit cho bạn dán:
<lệnh Bước 4 của phiếu>
```

### Kiểm phiếu

Không sửa file. Đọc phiếu, không tin báo cáo trước đó. Chạy lệnh kiểm, đọc `git diff`, so từng ô Bước 3 và từng mục "Bắt buộc theo bản chạy thử", rồi báo theo mẫu trên.

### Làm tiếp

Lấy phiếu kế tiếp ở mục "Tiếp theo" của phiếu vừa xong. Chưa rõ phiếu vừa xong thì xem `git log` và lịch ở `vai-*/README.md`.

### Dừng và hỏi

Dừng, nói rõ cần ai quyết gì, khi gặp:

- Thiếu phiếu cần có trước. Không tự làm thay vai khác.
- Cần sửa file ngoài mục Được ghi, nhất là `src/contracts/*`.
- Phiếu mâu thuẫn spec. `docs/spec/` thắng, nhưng phải báo.
- Lệnh kiểm vẫn đỏ sau 2 lượt.
- Cần khóa, token, hoặc gặp lỗi quyền.

### Luật không đổi

- Không `git add`, commit, push, merge. Không chạy `ak xong`.
- Không đọc `.env*`.
- Không tự đặt tên hay con số: lấy từ `docs/spec/02_CONTRACTS.md`.
- Không kết luận engine xong chỉ vì test xanh. Phiếu ghi chạy repo thật thì phải chạy repo thật.
- Báo đúng sự thật: bước nào chưa chạy thì ghi chưa chạy.
- Phiếu ghi `docs/spec/`. Repo chỉ có bản chép ở `.kb/spec/` thì đọc ở đó.
