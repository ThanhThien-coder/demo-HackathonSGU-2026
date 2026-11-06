# D19 — Popover giải thích đoạn chọn

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-23 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Sau 22:00. **Bỏ trước nếu trễ** |
| Nhánh | `d/D19-popover-doan-chon` |
| Cần có trước | D11; C-11, A-08 endpoint (chưa có thì làm với dữ liệu giả) |
| Mở đường cho | Về đích |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D19-popover-doan-chon
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D19 — Popover giải thích đoạn chọn". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D11; C-11, A-08 endpoint (chưa có thì làm với dữ liệu giả). Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 5 (UI-34), Mục 10 (`ERR_SELECTION_INVALID`, `ERR_EXPLAIN_LIMIT`)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-11
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Bôi đen trong code của bước ⇒ nút "Giải thích" cạnh vùng bôi đen. Offline không có nút; quá `CONFIG.EXPLAIN_SELECTION_MAX_CHARS` ⇒ nút tắt.
2. Bấm ⇒ `POST /api/explain-selection`, `range` theo số dòng gốc, cột tính từ 1.
3. `code/SelectionPopover`: tiêu đề, nhãn nguồn, "Là gì", "Ở đây", "Ví dụ đời thường", chip kỹ năng, "Còn dùng ở".
4. Đủ trạng thái chờ, lỗi, hết lượt, cổng gác chặn. Nhớ kết quả ở `ui.explanations`.
5. Viết test T-UI-11, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-11 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D19 — Popover giải thích đoạn chọn" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Bôi đen `await` ra giải thích; bôi lại đúng chỗ đó hiện liền, không có request.
- [ ] Bôi đoạn dài quá trần: nút tắt.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): popover giải thích đoạn chọn"
git pull --rebase origin main
git push -u origin d/D19-popover-doan-chon
gh pr create --base main --title "D19 — Popover giải thích đoạn chọn" --body "Sửa D-23"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích, xem [README](README.md)
