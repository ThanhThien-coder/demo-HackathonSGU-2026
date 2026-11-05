# E10 — Số đo, slide, nộp

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 07:00–09:30 (H+19.5 → H+21) · **Mốc H+19.5, H+21** |
| Nhánh | `e/E10-slide-nop` |
| Cần có trước | E09 |
| Mở đường cho | nộp bài |
| Cách làm | Claude điền số đo từ bảng duyệt · bạn làm slide và nộp |

**Cách nhanh:** nhắn AI `Làm phiếu E10`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E10-slide-nop
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E10 — Số đo, slide, nộp". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: E09. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10
- `package.json`
- `review/ket_qua_duyet.md`

## Được ghi
- `review/ket_qua_duyet.md`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Đọc bảng kết quả duyệt tay trong `review/ket_qua_duyet.md`, tính toán và điền phần "Số đo báo cáo" ở cuối file theo đúng mẫu của `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10: số lượng mục phân tích AI nêu, số mục đúng, số mục bỏ sót, số mục cổng gác tự gạch, tỷ lệ ổn định qua 3 lần chạy, số câu chấm khớp người chấm trên tổng số câu mẫu. Nói đúng phạm vi đo trên repo demo, không làm tròn số đẹp.

## Tiêu chí xong
- Lệnh kiểm: `git diff -- review/ket_qua_duyet.md`
- Phần "Số đo báo cáo" được điền đầy đủ số liệu thật từ bảng duyệt tay trong review/ket_qua_duyet.md, đúng phạm vi, không ghi số chưa đo.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không ghi số chưa đo.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "E10 — Số đo, slide, nộp" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "E10 — Số đo, slide, nộp": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `git diff -- review/ket_qua_duyet.md` thấy phần Số đo báo cáo vừa điền.
- [ ] `git status` chỉ có các file ở mục Được ghi (`review/ket_qua_duyet.md`).
- [ ] Số đo có trong file `review/ket_qua_duyet.md` và khớp đúng với các dòng trong bảng duyệt tay.
- [ ] Không ghi nhận bất kỳ con số nào chưa đo thực tế.
- [ ] Slide thuyết trình hoàn thành lúc 07:30 từ kịch bản tại `pitch/` (mở ở repo tài liệu: `pitch/KICH_BAN_DEMO.md`).
- [ ] Nộp file thuyết trình trước 09:30.

```text
Task "E10 — Số đo, slide, nộp" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add review/ket_qua_duyet.md
git commit -m "docs(demo): số đo duyệt tay"
git pull --rebase origin main
git push -u origin e/E10-slide-nop
gh pr create --base main --title "E10 — Số đo, slide, nộp" --body "Closes #<số Issue>"
```

Slide thuyết trình hoàn thành lúc 07:30 từ kịch bản tại `pitch/` (mở ở repo tài liệu: `pitch/KICH_BAN_DEMO.md`). Nộp file thuyết trình trước 09:30 theo đúng quy định của ban tổ chức. Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích (xem README vai)
