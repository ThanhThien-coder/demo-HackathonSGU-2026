# D01 — Token thiết kế, khung 3 cột tĩnh

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
Dùng skill tao-task để tạo task tên "D01 — Token thiết kế, khung 3 cột tĩnh". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 2.2, 11
- `.kb/spec/02_CONTRACTS.md` Mục 1
- `package.json`
- `src/`
- `tailwind.config.ts`

## Được ghi
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Thiết lập token CSS var trong `src/app/globals.css` (`--bg`, `--panel`, `--line`, `--text`, `--muted`, `--amber`, `--green`, `--red`, `--locked`, `--violet`, `--blue`), cấu hình font Plus Jakarta Sans và JetBrains Mono qua `next/font/google` trong `src/app/layout.tsx`, map các biến màu vào `tailwind.config.ts` theo `.kb/spec/30_UI.md` Mục 11.
3. Dựng khung header và 3 cột tĩnh trong `src/app/page.tsx`, chia tỉ lệ theo `CONFIG.UI_PANE_WIDTHS_PCT` ([25, 45, 30]) theo `.kb/spec/30_UI.md` Mục 2.2; nếu contracts chưa merge thì để chỗ đó lại, nối ở D02.
4. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npm run build`
- Khung 3 cột hiển thị đúng cấu trúc, không bị cuộn ngang.
- Các biến màu token được định nghĩa đầy đủ trong `globals.css` và map vào Tailwind.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D01 — Token thiết kế, khung 3 cột tĩnh" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Chạy tay `npm run dev`, mở trình duyệt thấy 3 cột tĩnh hiển thị trên nền `--bg`.
- [ ] `tailwind.config.ts` map đủ các biến CSS token thiết kế của `.kb/spec/30_UI.md` Mục 11.

```text
Task "D01 — Token thiết kế, khung 3 cột tĩnh" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/layout.tsx src/app/globals.css tailwind.config.ts
git commit -m "feat(ui): token thiết kế, font"
git add src/app/page.tsx
git commit -m "feat(ui): khung 3 cột"
git pull --rebase origin main
git push -u origin d/D01-khung
gh pr create --base main --title "D01 — Token thiết kế, khung 3 cột tĩnh" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Đây là commit đầu tiên của Vai D (luật thi: ai cũng có commit). Vai A merge khi CI xanh.

## Tiếp theo

→ [D02](D02-store-api.md)
