# D01 — Khung website, bộ UI dùng chung

Làm xong phiếu này, người dùng sẽ thấy bộ khung giao diện website với thanh điều hướng (Navbar), token màu cho 2 chủ đề sáng / tối, font chữ và các thành phần UI dùng chung như nút bấm, chip và hộp thoại.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:30–13:00 (H+0.5 → H+1) |
| Nhánh | `d/D01-khung` |
| Cần có trước | A01 (khung code trên main) |
| Mở đường cho | D02 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D01`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D01-khung
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D01 — Khung website, bộ UI dùng chung". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A01 (khung code trên main). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 2, 3, 11
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T36, T38
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` bảng gói
- `docs/spec/00_QUYET_DINH.md` D-67, D-79
- `docs/spec/02_CONTRACTS.md` Mục 1
- `package.json`
- `src/`

## Được ghi
- `package.json`
- `package-lock.json`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/ui/`
- `src/components/layout/Navbar.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Thêm đúng 3 gói phụ thuộc bằng `--save-exact`: `lucide-react`, `clsx`, `tailwind-merge` vào `package.json` và `package-lock.json`; không tự ý thêm hoặc đổi gói khác.
3. Khai báo token 2 chủ đề trong `src/app/globals.css` đúng bảng `docs/spec/30_UI.md` Mục 11: CSS var theo `html[data-theme]`, mặc định `dark`, map vào `@theme inline` (repo dùng Tailwind 4, không tạo `tailwind.config.ts`). Đủ `--bg`, `--panel`, `--text`, 4 màu trạng thái, `--accent`, `--st-*`, `--ink`, `--on-amber`. Cấu hình font Plus Jakarta Sans và JetBrains Mono qua `next/font/google` trong `src/app/layout.tsx`.
4. Viết `src/components/ui/theme.ts` (store `useTheme`, lưu `sf.prefs.theme`) và `src/components/ui/theme-script.ts` gán chủ đề trước khi vẽ để không nháy màu; gắn script vào `src/app/layout.tsx`.
5. Viết `src/components/ui/common.tsx` gồm `cn`, `Button`, `Chip`, `Modal`, `PlainText`, và `src/components/ui/Toasts.tsx`. Các component khác thêm ở phiếu đầu tiên cần tới.
6. Viết thanh điều hướng `src/components/layout/Navbar.tsx` có nút ☀/☾, và dựng khung tĩnh trang chủ ban đầu trong `src/app/page.tsx`.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Cửa sổ (lỗi D-05, `30` Mục 11):** `Modal` cao tối đa màn hình trừ lề, tiêu đề và nút luôn thấy, thân cuộn, để cửa sổ dài không bị cắt.

## Tiêu chí xong
- Lệnh kiểm: `npm run build`
- Thêm đúng 3 gói chỉ định bằng `--save-exact`, không thừa thiếu gói nào khác.
- `globals.css` có đủ token 2 chủ đề theo `docs/spec/30_UI.md` Mục 11. Font tải qua `next/font/google`.
- Có đủ `Button`, `Chip`, `Modal`, `PlainText`, `Toasts`.
- Navbar hiển thị đúng vị trí trên nền giao diện chung.
- `Modal` có giới hạn chiều cao và thân `overflow-y-auto`.
- Bấm ☀/☾ rồi tải lại vẫn giữ chủ đề, không nháy màu (T38).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`. Thiếu kiểu hoặc API thì đổi trạng thái `kẹt` và báo vai sở hữu.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D01 — Khung website, bộ UI dùng chung" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Chạy tay `npm run dev`, mở trình duyệt thấy thanh điều hướng và khung trang chủ ở chủ đề tối mặc định.
- [ ] Bấm ☀/☾ đổi được chủ đề, tải lại vẫn giữ, không nháy màu (T38).
- [ ] `package.json` chỉ thêm đúng 3 gói chỉ định bằng phiên bản chính xác (`--save-exact`).
- [ ] Ở 1366×768, cửa sổ nội dung dài thấy đủ tiêu đề và nút (T36).

```text
Task "D01 — Khung website, bộ UI dùng chung" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add package.json package-lock.json
git commit -m "chore(ui): thêm gói phụ thuộc ui bằng save-exact"
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(ui): token 2 chủ đề, font"
git add src/components/ui/ src/components/layout/
git commit -m "feat(ui): navbar và component ui cơ bản"
git add src/app/page.tsx
git commit -m "feat(ui): khung trang chủ tĩnh"
git pull --rebase origin main
git push -u origin d/D01-khung
gh pr create --base main --title "D01 — Khung website, bộ UI dùng chung" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Đây là commit đầu tiên của Vai D (luật thi: ai cũng có commit). Vai A merge khi CI xanh.

## Tiếp theo

→ [D02](D02-store-api.md)
