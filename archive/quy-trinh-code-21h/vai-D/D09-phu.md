# D09 — Giao agent: lịch sử, menu, trình chiếu, responsive

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:30–03:00 (H+12.5 → H+15) |
| Nhánh | `d/D09-phu` |
| Cần có trước | D08 |
| Mở đường cho | D10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

Làm Bước 0–2 trước khi đi ngủ (khoảng 00:00–00:30):

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D09-phu
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D09 — Giao agent: lịch sử, menu, trình chiếu, responsive". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 2.1, 2.2, 2.3, 6.2, 9, 11, Test bắt buộc T29, T12
- `.kb/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `.kb/spec/00_QUYET_DINH.md` D-22
- `.kb/doc-de-hieu/07_ke_hoach_21h.md` Mục 3
- `package.json`
- `src/`

## Được ghi
- `src/app/history/page.tsx`
- `src/components/header/AccountMenu.tsx`
- `src/components/header/PersonaMenu.tsx`
- `src/components/header/TokenMeter.tsx`
- `src/components/cockpit/ReportWrongDialog.tsx`
- `src/app/layout.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết màn hình lịch sử `src/app/history/page.tsx` (`.kb/spec/30_UI.md` Mục 2.1).
3. Viết menu tài khoản `AccountMenu.tsx` (đăng xuất, xóa tài khoản), đồng hồ token `TokenMeter.tsx`, menu chọn persona `PersonaMenu.tsx` (`.kb/spec/30_UI.md` Mục 2.3, 9).
4. Viết hộp thoại "Báo sai" `ReportWrongDialog.tsx` (`.kb/spec/30_UI.md` Mục 6.2, D-22).
5. Hiện thực chế độ trình chiếu (nút ⤢ theo `CONFIG.UI_PRESENTATION_FOCUS_PCT`, `CONFIG.UI_PRESENTATION_FONT_SCALE`), responsive 1 cột, `prefers-reduced-motion` trong `src/app/layout.tsx` (`.kb/spec/30_UI.md` Mục 2.2, 11).
6. Sau khi gửi "Báo sai" thì gọi lại `GET /api/sessions/{id}/progress` và cập nhật màu node (`.kb/spec/30_UI.md` T12).
7. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không người canh, bước nào quá 30 phút thì dừng bước đó, ghi báo cáo, sang bước sau; mọi việc ở đây cắt được theo `.kb/doc-de-hieu/07_ke_hoach_21h.md` Mục 3, không đụng file của D01–D08 ngoài `layout.tsx`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D09 — Giao agent: lịch sử, menu, trình chiếu, responsive" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần. Bạn đi ngủ từ 00:30 đến 03:00, để agy tự chạy.

## Bước 3 — Bạn kiểm: thế nào là xong

Làm Bước 3 khi bạn thức dậy lúc 03:00:

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Thử nghiệm T29: điều hướng bằng bàn phím (Tab/Enter) chuyển focus chính xác và viền focus luôn nhìn thấy rõ.
- [ ] Bật `prefers-reduced-motion` trong cài đặt hệ thống hoặc trình duyệt: nhịp sáng node và rung ô trả lời tắt hoàn toàn.

- [ ] Thử T12 của `.kb/spec/30_UI.md`: báo sai một câu thấy cờ 🚩, có request `progress`, màu node cập nhật.
```text
Task "D09 — Giao agent: lịch sử, menu, trình chiếu, responsive" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/history/page.tsx
git commit -m "feat(ui): màn hình lịch sử"
git add src/components/header/AccountMenu.tsx src/components/header/PersonaMenu.tsx src/components/header/TokenMeter.tsx
git commit -m "feat(ui): menu tài khoản, token, persona"
git add src/components/cockpit/ReportWrongDialog.tsx
git commit -m "feat(ui): báo sai"
git add src/app/layout.tsx
git commit -m "feat(ui): trình chiếu, responsive"
git pull --rebase origin main
git push -u origin d/D09-phu
gh pr create --base main --title "D09 — Giao agent: lịch sử, menu, trình chiếu, responsive" --body "Closes #<số Issue>"
```

Báo Vai A review và merge sau khi thức dậy lúc 03:00. Vai A merge khi CI xanh.

## Tiếp theo

→ [D10](D10-hoan-thien.md)
