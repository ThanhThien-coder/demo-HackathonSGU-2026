# D10 — Kiểm agent, sửa giao diện, bỏ trang nháp

Làm xong phiếu này, toàn bộ giao diện SimpliFey được rà soát sạch sẽ các lỗi hiển thị, xóa bỏ hoàn toàn trang thử nghiệm `/dev` và dữ liệu giả, sẵn sàng cho buổi tổng duyệt và thuyết trình trực tiếp.

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

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D09, C09 (tổng quan thật). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 3, Test bắt buộc T5
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-06
- `package.json`
- `src/`

## Được ghi
- `src/app/dev/page.tsx`
- `src/app/`
- `src/components/`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Kiểm tra lại toàn bộ kết quả thực hiện của agy trong D09, đối soát giao diện.
3. Sửa các lỗi giao diện trong `src/app/` và `src/components/` theo đúng danh sách Issue được giao (chỉ sửa lỗi này, không thay đổi bố cục giao diện):
   <dán số Issue và mô tả từng lỗi nhãn `bug` hoặc `ui`>
4. Xóa bỏ hoàn toàn trang nháp `src/app/dev/page.tsx` trước mốc đóng băng tính năng 05:00.
5. Rà soát bằng lệnh `git grep`: đảm bảo tuyệt đối không còn dữ liệu giả, mock ngầm hay session mặc định nào tồn tại trong `src/app` và `src/components`.
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npm run build`
- Không còn file trang nháp `src/app/dev/page.tsx` trong cây mã nguồn.
- Lệnh `git grep` không còn dữ liệu giả và session mặc định trong `src/app`, `src/components`.
- Mỗi Issue trong danh sách ở Việc cần làm có thay đổi tương ứng trong `git diff`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
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
- [ ] Lệnh `git grep` xác nhận không còn dữ liệu mock hoặc session mặc định trong `src/app/` và `src/components/`.
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

Sau 05:00, bạn phối hợp cùng Vai E thử nghiệm chế độ Offline với file `mock_bundle.json` thật (`docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-06), persona `SENIOR_RUSTY` đạt yêu cầu (`docs/spec/30_UI.md` T5). Vai A merge khi CI xanh.

## Tiếp theo

→ Về đích (xem README vai)
