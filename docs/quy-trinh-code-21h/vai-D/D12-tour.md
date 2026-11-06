# D12 — Tab X-Ray dạng tour

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-19 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Xong trước 19:00 |
| Nhánh | `d/D12-tour` |
| Cần có trước | D11 |
| Mở đường cho | D13, D14 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D12-tour
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D12 — Tab X-Ray dạng tour". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D11. Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 6.1 (`ui.xray_stage`, Tour UI-42, Chip kỹ năng, Mài mòn, Chi tiết bài, Thiếu phân tích, UI-47)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-04
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Thêm `ui.xray_stage`: `ROLE` ⇒ `TOUR` ⇒ `SUMMARY`.
2. Tour: mỗi lần 1 bước, tiêu đề, chấm tiến độ, vị trí, `steps[k].text`, chip kỹ năng của bước.
3. Nút Trước/Sau theo đúng chữ ở UI-42, phím ← → (không chạy khi đang gõ trong ô nhập hoặc mở cửa sổ).
4. Hết tour mới hiện Tóm tắt, "Chi tiết bài" và nút UI-47. `ROLE` tạm hiện tên bài + nút "Bắt đầu tour →", D16 làm đủ.
5. Viết test T-UI-04, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-04 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D12 — Tab X-Ray dạng tour" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Đi hết tour bài "Xem danh sách sản phẩm" giống `prototype.html`.
- [ ] Bài chưa có bản phân tích: tour vẫn đi được từ `trace_steps`, có shimmer.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): X-Ray dạng tour"
git pull --rebase origin main
git push -u origin d/D12-tour
gh pr create --base main --title "D12 — Tab X-Ray dạng tour" --body "Sửa D-19"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D13](D13-the-khai-niem.md)
