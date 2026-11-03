# A09 — Dockerfile trên nhánh riêng

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–00:30 (H+8 → H+12.5) |
| Nhánh | `a/A09-dockerfile` |
| Cần có trước | A03 (CI/CD) |
| Mở đường cho | A12 |
| Cách làm | agy viết file · bạn build và deploy revision tag trên Cloud Run và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A09-dockerfile
```

Phiếu này thực hiện xen kẽ trong khoảng thời gian 20:00–00:30 (khoảng 1 giờ làm việc).

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A09 — Dockerfile trên nhánh riêng". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/05_HA_TANG_CLOUD.md` Mục 3
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 16
- `.kb/spec/00_QUYET_DINH.md` D-61, D-64
- `package.json`
- `next.config.ts`

## Được ghi
- `Dockerfile`
- `.dockerignore`
- `next.config.ts`

## Việc cần làm
1. B1: Viết `Dockerfile` multi-stage gồm 3 stage `deps`, `builder`, `runner`, tạo người dùng không có quyền root `USER nextjs:nodejs` UID/GID 1001, sao chép thư mục `public/` (chứa grammar `.wasm` của Tree-sitter), viết `.dockerignore` đúng theo danh sách quy định tại `.kb/spec/05_HA_TANG_CLOUD.md` Mục 3. Cấu hình `next.config.ts` chỉ trên nhánh này với tùy chọn `output: "standalone"`.
2. Không chạy build hay deploy (việc đó bạn tự làm ở Bước 3).

## Tiêu chí xong
- Lệnh kiểm: `git diff --stat`
- `Dockerfile` có đủ 3 stage `deps`, `builder`, `runner`, chạy bằng `USER nextjs:nodejs` (UID/GID 1001), chép thư mục `public/`.
- `.dockerignore` có đủ danh sách ở `.kb/spec/05_HA_TANG_CLOUD.md` Mục 3.
- `next.config.ts` có `output: "standalone"`, giữ nguyên các phần cũ (headers, `outputFileTracingIncludes`).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không merge vào `main` trước 03:00, không sửa `deploy.yml` trên `main`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A09 — Dockerfile trên nhánh riêng" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `git diff --stat` thấy đúng 3 file.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Bạn tự build bằng Cloud Build (hoặc `docker build -t simplifey-test .` nếu máy có Docker) và deploy staging thành revision `--no-traffic --tag` **trước 00:30** (`.kb/spec/05_HA_TANG_CLOUD.md` Mục 3, 5).
- [ ] URL tag gọi `GET /api/health` trả HTTP 200 `ok`.
- [ ] URL tag gọi `POST /api/ingest` repo demo trả HTTP 200 thành công.
- [ ] File `Dockerfile` cấu hình chạy dưới quyền `USER nextjs:nodejs`.

```text
Task "A09 — Dockerfile trên nhánh riêng" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add Dockerfile .dockerignore next.config.ts
git commit -m "build(build): Dockerfile multi-stage"
git pull --rebase origin main
git push -u origin a/A09-dockerfile
gh pr create --base main --title "A09 — Dockerfile trên nhánh riêng" --body "Closes #<số Issue>"
```

Build và deploy revision tag trên Cloud Run trước 00:30. Không merge PR vào `main` trước 03:00 (mốc cắt Dockerfile).

## Tiếp theo

→ [A10](A10-evaluate-reveal.md)
