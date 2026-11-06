# D11 — Khung code theo tab file

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-16 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Xong trước 19:00 |
| Nhánh | `d/D11-tab-file` |
| Cần có trước | A-08 phần mang frontend về `main` |
| Mở đường cho | D12 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D11-tab-file
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D11 — Khung code theo tab file". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: A-08 phần mang frontend về `main`. Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 5 (Tab file, Model, Khung, UI-31)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-05
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Đổi `buildSliceModel` thành `buildStepModel(node, step)`: chỉ `snippet` của bước đang xem, không nối các bước.
2. Hàng tab: mỗi file trong `node.files` 1 tab, chấm đỏ cho file có điểm dở, tab cuối "Kiểu dữ liệu" khi `dto_snippet` khác rỗng.
3. Tab đang mở theo `active_step`. Bấm tab file ⇒ `active_step` = bước đầu của file đó.
4. Dòng "⋯ dòng 1–{n} không thuộc bài học" trên code, "⋯ phần còn lại của file" dưới code. Số dòng gốc theo UI-31.
5. Viết test T-UI-05, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-05 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D11 — Khung code theo tab file" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Bài "List Products" của `shop-api`: 1 tab mỗi file, sang bước khác thì tab đổi theo.
- [ ] File có 2 bước: tab giữ nguyên, code đổi theo bước.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): khung code theo tab file"
git pull --rebase origin main
git push -u origin d/D11-tab-file
gh pr create --base main --title "D11 — Khung code theo tab file" --body "Sửa D-16"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D12](D12-tour.md)
