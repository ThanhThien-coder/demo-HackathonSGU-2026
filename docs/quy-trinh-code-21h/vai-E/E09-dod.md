# E09 — Definition of Done, offline, video

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 05:00–07:00 (H+17 → H+19) · **Mốc H+17, H+19** |
| Nhánh | `e/E09-dod` |
| Cần có trước | C10 (bundle), D10 |
| Mở đường cho | E10 |
| Cách làm | Bạn tự làm · bạn commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E09-dod
```

## Bước 1 — Tạo task (dán cho Claude)

Không cần tạo task: phiếu này bạn tự làm theo Bước 3.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

Không có, bạn tự làm theo Bước 3.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Bạn tự chạy lệnh `npx vitest run` và toàn bộ các test của hệ thống đều xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi (`review/loi_da_gap.md`).
- [ ] Bạn đã chạy toàn bộ danh sách kiểm tra Definition of Done ở `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 5, ghi đầy đủ kết quả ✅ / ❌ từng dòng vào `review/loi_da_gap.md`.
- [ ] Kiểm tra ca X-06 chế độ offline cùng Vai D bằng phím tắt `Ctrl+Shift+D`: chạy hết kịch bản demo khi không có mạng, nhãn offline luôn hiển thị.
- [ ] Mỗi câu trả lời trong kịch bản demo (mở ở repo tài liệu: `pitch/KICH_BAN_DEMO.md`) được chạy thử 3 lần trên hệ thống, chỉ giữ lại các câu ổn định 3/3 theo `.kb/doc-de-hieu/07_ke_hoach_21h.md` Mục 6.
- [ ] Đã quay xong video dự phòng (cả chế độ kết nối thật và chế độ offline `Ctrl+Shift+D`).

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add review/loi_da_gap.md
git commit -m "docs(test): Definition of Done"
git pull --rebase origin main
git push -u origin e/E09-dod
gh pr create --base main --title "E09 — Definition of Done, offline, video" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [E10](E10-slide-nop.md)
