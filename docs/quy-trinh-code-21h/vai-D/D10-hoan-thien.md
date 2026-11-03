# D10 — Kiểm agent, sửa giao diện, bỏ trang nháp

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 03:00–05:00 (H+15 → H+17) · **Mốc H+16, H+17** |
| Nhánh | `d/D10-hoan-thien` |
| Cần có trước | D09, C09 (tổng quan thật) |
| Mở đường cho | Đóng băng, E09 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

Bạn thức dậy lúc 03:00, dùng `kiem-task` kiểm task D09 của agy và tự gõ lệnh mở PR cho D09 trước. Sau đó chuẩn bị nhánh mới:

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D10-hoan-thien
```

## Bước 1 — Tạo task (dán cho Claude)

Trước khi dán, mở tab Issues trên GitHub, lọc nhãn `bug` và `ui` giao cho bạn, rồi thay dòng `<dán số Issue …>` trong prompt bằng danh sách thật (số Issue và một câu mô tả mỗi lỗi).

```text
Dùng skill tao-task để tạo task tên "D10 — Kiểm agent, sửa giao diện, bỏ trang nháp". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 3, Test bắt buộc T5
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-06
- `package.json`
- `src/`

## Được ghi
- `src/app/dev/page.tsx`
- `src/components/`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Sửa các lỗi giao diện trong `src/components/` theo đúng danh sách Issue tôi dán dưới đây (chỉ sửa các lỗi này, không đổi bố cục):
   <dán số Issue và mô tả từng lỗi nhãn `bug` hoặc `ui`>
3. Xóa bỏ hoàn toàn trang nháp `src/app/dev/page.tsx` trước mốc đóng băng tính năng.
4. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npm run build`
- Không còn trang nháp `src/app/dev/page.tsx` trong cây mã nguồn.
- Mỗi Issue trong danh sách ở Việc cần làm có thay đổi tương ứng trong `git diff`, báo rõ Issue nào đã sửa, Issue nào chưa.

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
Dùng skill giao-task-agy giao task "D10 — Kiểm agent, sửa giao diện, bỏ trang nháp" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Kiểm tra không còn file `src/app/dev/page.tsx` trong thư mục dự án.
- [ ] Các lỗi giao diện ghi nhận trong Issue đã được khắc phục.

```text
Task "D10 — Kiểm agent, sửa giao diện, bỏ trang nháp" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

Mỗi lỗi một commit, xem `git diff --stat` để biết file nào thuộc lỗi nào:

```powershell
git add <file của lỗi 1>
git commit -m "fix(ui): <lỗi 1, ví dụ nút nộp bị che trên màn hẹp>"
git add <file của lỗi 2>
git commit -m "fix(ui): <lỗi 2>"
git add src/app/dev/page.tsx
git commit -m "chore(ui): bỏ trang nháp"
git pull --rebase origin main
git push -u origin d/D10-hoan-thien
gh pr create --base main --title "D10 — Kiểm agent, sửa giao diện, bỏ trang nháp" --body "Closes #<số Issue>"
```

Sau 05:00, bạn phối hợp cùng Vai E thử nghiệm chế độ Offline với file `mock_bundle.json` thật (X-06 của `.kb/spec/50_TEST_VA_FIXTURE.md`), persona `SENIOR_RUSTY` đạt yêu cầu (`.kb/spec/30_UI.md` T5). Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích (xem README vai)
