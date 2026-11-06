# D16 — Thẻ vai trò

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-22 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Sau 22:00. Dòng "Dữ liệu" bỏ được nếu trễ |
| Nhánh | `d/D16-the-vai-tro` |
| Cần có trước | D12; C-07, B-40 (chưa có thì làm các dòng đã có, ẩn dòng thiếu) |
| Mở đường cho | D17 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D16-the-vai-tro
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D16 — Thẻ vai trò". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D12; C-07, B-40 (chưa có thì làm các dòng đã có, ẩn dòng thiếu). Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 6.1 (UI-41)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-03
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. `RoleCard`: tiêu đề, "Vai trò", "Cần trước", "Mở ra cho", "Dữ liệu", nút "Bắt đầu tour →".
2. Nhãn `entities`: `CREATE` Tạo · `READ` Đọc · `UPDATE` Sửa · `DELETE` Xóa.
3. Thiếu dữ liệu ⇒ ẩn đúng dòng đó.
4. Viết test T-UI-03, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-03 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D16 — Thẻ vai trò" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Bài "Xem danh sách sản phẩm" ra đủ dòng như `prototype.html`.
- [ ] Bài không có `prerequisites`: không có dòng "Cần trước".

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): thẻ vai trò"
git pull --rebase origin main
git push -u origin d/D16-the-vai-tro
gh pr create --base main --title "D16 — Thẻ vai trò" --body "Sửa D-22"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D17](D17-ban-do-nhom.md)
