# D13 — Thẻ khái niệm

Theo D-81 … D-85 và bản vẽ [`prototype.html`](../../../prototype.html). Lỗi gốc: D-20 trong [`loi-can-sua.md`](../loi-can-sua.md).

| Mục | Nội dung |
| :-- | :-- |
| Người làm | Lê Ngọc Quý (luồng 6) |
| Giờ | Xong trước 19:00 |
| Nhánh | `d/D13-the-khai-niem` |
| Cần có trước | D12; `vai-D/the-khai-niem.md` (chưa có thì dùng 3 thẻ mẫu trong `prototype.html`) |
| Mở đường cho | D14 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D13-the-khai-niem
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D13 — Thẻ khái niệm". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định.

Trước khi tạo task: kiểm phần cần có trước đã có trên nhánh hiện tại. Phần này cần: D12; `vai-D/the-khai-niem.md` (chưa có thì dùng 3 thẻ mẫu trong `prototype.html`). Thiếu thì dừng, báo thiếu gì và đó là việc của ai.

## Được đọc
- `docs/spec/30_UI.md` Mục 6.1 (UI-43)
- `docs/spec/30_UI.md` Test bắt buộc: T-UI-06
- `docs/spec/00_QUYET_DINH.md` D-81 … D-85
- `docs/spec/02_CONTRACTS.md`
- `prototype.html`
- `src/`

## Được ghi
- `src/components/*`
- các trang trong `src/app/` (trừ `src/app/api/*`, `src/app/auth/*`)
- `src/store/*`

## Việc cần làm
1. Tạo `src/lib/concept-cards.ts` từ `vai-D/the-khai-niem.md`, khóa theo `SWE_SKILLS`.
2. `learn/ConceptPopover`: tên, mã kỹ năng, "Là gì", "Ví dụ đời thường", "Vì sao quan trọng", "Trong repo này (AI):" `skills[i].reason`, nút "Xem dòng" (dùng `line_start`, `line_end` của `skills[i]` do server tính).
3. ✕, `Esc`, bấm ngoài, cuộn ⇒ đóng, trả focus về chip. 0 token, 0 request.
4. Viết test T-UI-06, test thất bại trước rồi mới code.

## Tiêu chí xong
- Lệnh kiểm: `npm run typecheck; npm run lint; npm test`
- Test T-UI-06 đạt.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`, `src/server/*`. Thiếu kiểu hoặc API thì ghi `kẹt` và báo vai sở hữu.
- Không chạy `git add`, `git commit`, `git push`.
```

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D13 — Thẻ khái niệm" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đối chiếu `prototype.html`.
```

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Tự chạy lại `npm run typecheck; npm run lint; npm test` cũng xanh.
- [ ] `git status` chỉ có file trong mục Được ghi.
- [ ] Bấm chip ở bước 2 ra thẻ, `Esc` đóng thẻ.
- [ ] Mở Network: bấm chip không có request.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add <đúng các file đã sửa>
git commit -m "feat(ui): thẻ khái niệm"
git pull --rebase origin main
git push -u origin d/D13-the-khai-niem
gh pr create --base main --title "D13 — Thẻ khái niệm" --body "Sửa D-20"
```

Đổi trạng thái lỗi trong `loi-can-sua.md` thành "chờ kiểm". Vai A merge khi CI xanh.

## Tiếp theo

→ [D14](D14-to-dung-dong.md)
