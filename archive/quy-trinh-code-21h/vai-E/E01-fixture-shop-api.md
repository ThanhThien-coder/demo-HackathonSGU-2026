# E01 — Issues, PR thử CI, fixture shop-api

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:00–13:00 (H+0 → H+1) · **Mốc H+0.5: PR thử CI** |
| Nhánh | `e/E01-fixture-shop-api` |
| Cần có trước | Bước 1 cần A03 bước 1–2 đã merge |
| Mở đường cho | D03, A06 (mock), B08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

Lúc 12:00–12:30, bạn tự làm trên web GitHub: tạo GitHub Issues cho mọi task của 5 vai (ghi rõ tên việc và người nhận), gán nhãn `vai-A` … `vai-E`, `bug`, `engine`, `ai`, `api`, `ui`.

Sau đó, chờ A03 merge bước 1–2 (có workflow CI) rồi chạy lệnh:

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E01-fixture-shop-api
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E01 — Issues, PR thử CI, fixture shop-api". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 1.1, 1.2
- `.kb/doc-de-hieu/01_deploy.md` Mục 5
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/__fixtures__/shop-api.json`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết file `src/server/engine/__fixtures__/shop-api.json` dạng `StaticEngineResult` theo `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 1.1 và 1.2: bản đồ N1–N7 viết tay, code các bước cho các node, đầy đủ 7 node N1–N7.
3. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `node -e "JSON.parse(require('fs').readFileSync('src/server/engine/__fixtures__/shop-api.json','utf8'))"`
- File JSON hợp lệ, chứa đủ 7 node N1–N7 theo đúng kiểu `StaticEngineResult` của contracts.

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
Dùng skill giao-task-agy giao task "E01 — Issues, PR thử CI, fixture shop-api" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `node -e "JSON.parse(require('fs').readFileSync('src/server/engine/__fixtures__/shop-api.json','utf8'))"` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] File `src/server/engine/__fixtures__/shop-api.json` chứa đủ 7 node N1–N7.
- [ ] PR chạy `ci` và `security` xanh.
- [ ] Bạn đã tạo đầy đủ GitHub Issues cho mọi task của 5 vai trên web GitHub với nhãn vai và nhãn loại việc.

```text
Task "E01 — Issues, PR thử CI, fixture shop-api" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/__fixtures__/shop-api.json
git commit -m "test(test): fixture bản đồ shop-api"
git pull --rebase origin main
git push -u origin e/E01-fixture-shop-api
gh pr create --base main --title "E01 — Issues, PR thử CI, fixture shop-api" --body "Closes #<số Issue>"
```

Sau khi mở PR, kiểm tra xem `ci.yml` và `security.yml` có chạy và chuyển sang màu xanh không. Báo Vai A kết quả CI. Vai A merge khi CI xanh.

## Tiếp theo

→ [E02](E02-fixture-ai.md)
