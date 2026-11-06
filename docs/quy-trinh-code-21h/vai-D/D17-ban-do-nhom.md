# D17 — Bản đồ chia nhóm

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-21 phần bản đồ trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Sau 22:00 |
| Nhánh | `d/D17-ban-do-nhom` |
| Cần có trước | B-40 (chưa có thì dùng dữ liệu giả), C-12 cho tên AI |
| Mở đường cho | D18 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D17-ban-do-nhom
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D17 — Bản đồ chia nhóm". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: B-40 (chưa có thì dùng dữ liệu giả), C-12 cho tên AI. Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 4
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-01, T-UI-02
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Thay đồ thị ReactFlow ở cột trái bằng danh sách `result.groups`: `LessonGroup`, `LessonCard`.
2. Thêm `displayTitle(node)`, dùng ở mọi nơi hiện tên bài. Nhãn "AI đặt tên" chỉ khi dùng tên AI.
3. Nhóm chứa `mainPath(result)[0]` mở sẵn, có "★ Nên học trước". Mở bài ⇒ mở nhóm của bài.
4. Thẻ `LOCKED` có "Cần xong: …", bấm ra toast, 0 request. Chip "Bắt đầu" theo D-85.
5. Viết test T-UI-01, T-UI-02, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-01, T-UI-02 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D17 — Bản đồ chia nhóm" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] `shop-api` ra 4 nhóm theo T-ENG-48.
- [ ] Tắt AI: vẫn có nhóm và tên engine, không có nhãn "AI đặt tên".

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): bản đồ chia nhóm"
git pull --rebase origin main
git push -u origin d/D17-ban-do-nhom
gh pr create --base main --title "D17 — Bản đồ chia nhóm" --body "Sửa D-21 phần bản đồ"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D18](D18-tong-quan.md)
