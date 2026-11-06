# D18 — Tổng quan 2 nhịp

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-21 phần Tổng quan trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Sau 22:00 |
| Nhánh | `d/D18-tong-quan` |
| Cần có trước | D17; C-12 (chưa có thì làm nhịp 1 với dữ liệu giả) |
| Mở đường cho | D19 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D18-tong-quan
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D18 — Tổng quan 2 nhịp". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D17; C-12 (chưa có thì làm nhịp 1 với dữ liệu giả). Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 6.3, Mục 7.3
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-10
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. `RepoOverview` hiện ở cột giữa khi chưa chọn bài, trong cửa sổ khi bấm "Tổng quan".
2. Nhịp 1: câu dự phòng `overviewFallback(result, facts)`, thẻ nhóm, nút "Bắt đầu với: {tên bài} →".
3. Nhịp 2: `overview.ai.summary` thay câu dự phòng, kèm nhãn nguồn.
4. Hàng đợi: `analyze-overview` gọi 1 lần ngay sau ingest, về rồi mới tải trước node. Bỏ code chờ mọi node, xử lý `ERR_OVERVIEW_NOT_READY`, `layer_map`, `DiscoveredOverview` trong `overview-view.ts`.
5. Viết test T-UI-10, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-10 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D18 — Tổng quan 2 nhịp" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Tắt AI vẫn có nhóm, tên engine và câu dự phòng; bật AI thì tên và bức tranh chung hiện thêm.
- [ ] Network: `analyze-overview` đi trước `analyze-node` đầu tiên.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): Tổng quan 2 nhịp, gọi tổng quan trước"
git pull --rebase origin main
git push -u origin d/D18-tong-quan
gh pr create --base main --title "D18 — Tổng quan 2 nhịp" --body "Sửa D-21 phần Tổng quan"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D19](D19-popover-doan-chon.md)
