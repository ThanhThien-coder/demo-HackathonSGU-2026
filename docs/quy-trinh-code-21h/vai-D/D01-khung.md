# D01 — Khung website, bộ UI dùng chung

Làm xong phiếu này, người dùng sẽ thấy bộ khung giao diện website cơ bản với thanh điều hướng (Navbar), hệ thống màu sắc token, font chữ và các thành phần UI dùng chung như nút bấm, thẻ bài, hộp thoại và ngăn kéo.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:30–13:00 (H+0.5 → H+1) |
| Nhánh | `d/D01-khung` |
| Cần có trước | A01 (khung code trên main) |
| Mở đường cho | D02 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

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
- `docs/spec/30_UI.md` Mục 2, 11
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
- `src/components/layout/index.ts`
- `src/lib/utils.ts`
- `src/lib/utils.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Thêm đúng 5 gói phụ thuộc bằng `--save-exact`: `lucide-react`, `lottie-react`, `clsx`, `tailwind-merge`, `class-variance-authority` vào `package.json` và `package-lock.json`; không tự ý thêm hoặc đổi gói khác.
3. Khai báo bộ màu của giao diện mới trong khối `@theme` của `src/app/globals.css`: nhóm `--color-brand-*`, `--color-surface-*`, `--color-text-*`, `--color-border-*`, `--color-status-*` (repo dùng Tailwind 4, không tạo `tailwind.config.ts`). Không dùng bộ token `--bg`, `--amber`... của `docs/spec/30_UI.md` Mục 11. Cấu hình font Plus Jakarta Sans và JetBrains Mono qua `next/font/google` trong `src/app/layout.tsx`.
4. Viết các hàm tiện ích CSS trong `src/lib/utils.ts` (`cn`) và kiểm thử trong `src/lib/utils.test.ts`.
5. Xây dựng các component UI cơ bản dùng chung trong `src/components/ui/`: chỉ làm Button, Card, Dialog, Drawer (các component khác sẽ thêm ở phiếu đầu tiên cần tới).
6. Xây dựng thanh điều hướng `src/components/layout/Navbar.tsx`, export qua `src/components/layout/index.ts`, và dựng khung tĩnh trang chủ ban đầu trong `src/app/page.tsx`.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npm run build && npx vitest run src/lib/utils.test.ts`
- Thêm đúng 5 gói chỉ định bằng `--save-exact`, không thừa thiếu gói nào khác.
- Bộ màu brand, surface, text, border, status có đủ trong khối `@theme` của `globals.css`. Font tải qua `next/font/google`.
- Có đầy đủ 4 component UI cơ bản: Button, Card, Dialog, Drawer.
- Navbar hiển thị đúng vị trí trên nền giao diện chung.

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

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npm run build && npx vitest run src/lib/utils.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Chạy tay `npm run dev`, mở trình duyệt thấy thanh điều hướng và khung trang chủ hiển thị đúng bộ màu mới.
- [ ] Khối `@theme` trong `src/app/globals.css` có đủ nhóm màu brand, surface, text, border, status.
- [ ] `package.json` chỉ thêm đúng 5 gói chỉ định bằng phiên bản chính xác (`--save-exact`).

```text
Task "D01 — Khung website, bộ UI dùng chung" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add package.json package-lock.json
git commit -m "chore(ui): thêm gói phụ thuộc ui bằng save-exact"
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(ui): tiện ích css cn"
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(ui): token thiết kế, font"
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
