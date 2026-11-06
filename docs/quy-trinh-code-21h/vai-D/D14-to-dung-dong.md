# D14 — Tô đúng dòng

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-17 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Xong trước 19:00 |
| Nhánh | `d/D14-to-dung-dong` |
| Cần có trước | D12, D13 |
| Mở đường cho | D15 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D14-to-dung-dong
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D14 — Tô đúng dòng". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D12, D13. Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 5 (UI-32, Dòng của `symbol`, UI-33), Mục 6.1 (UI-44)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-06, T-UI-07
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Thêm `ui.hl` và hàm tìm dòng của điểm dở: dòng gốc đầu tiên trong `snippet` của bước chứa `symbol`, không thấy ⇒ cả bước.
2. "Xem dòng" ⇒ `FOCUS` theo dòng của `skills[i]`; bấm điểm dở (ở Tóm tắt và bảng dưới) ⇒ `BAD`; bấm điểm hay ⇒ `GOOD` cả bước, vì `strengths` không có `symbol`.
3. Đổi dòng gốc sang dòng model qua `lineMap`, cuộn tới dòng đầu. Đổi bước ⇒ `ui.hl = []`.
4. Viết test T-UI-06, T-UI-07, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-06, T-UI-07 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D14 — Tô đúng dòng" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Bấm điểm dở bài "Xem danh sách sản phẩm": tô đúng dòng gọi `categoryRepo.findById`.
- [ ] Không hiện cách sửa (INV-06).

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): tô đúng dòng điểm hay, điểm dở"
git pull --rebase origin main
git push -u origin d/D14-to-dung-dong
gh pr create --base main --title "D14 — Tô đúng dòng" --body "Sửa D-17"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D15](D15-goi-y-tour.md)
