# A12 — Kiểm agent, giờ cắt Dockerfile, đủ endpoint, deploy

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 03:00–05:00 (H+15 → H+17) · **Mốc H+15, H+16, H+17** |
| Nhánh | `a/A12-ve-dich` |
| Cần có trước | A09 (Dockerfile trên nhánh riêng), A11 (agy chạy lúc bạn ngủ) |
| Mở đường cho | Đóng băng (05:00) |
| Cách làm | Bạn kiểm A11, merge, quyết Dockerfile · Claude sửa `deploy.yml` (nếu bạn merge Dockerfile) và gọi thử 14 endpoint · bạn duyệt production |

## Bước 0 — Chuẩn bị (bạn tự gõ)

Ngay khi dậy (03:00), làm tay theo thứ tự, **Claude không làm các việc này**:

1. Làm Bước 3 và Bước 4 của phiếu [A11](A11-api-con-lai.md) (kiểm việc agy làm lúc bạn ngủ, commit, mở PR).
2. Merge các PR đang chờ của cả nhóm (CI xanh mới merge).
3. **Giờ cắt Dockerfile (03:00):** A09 đã deploy revision có tag, không nhận traffic, chạy được `/api/health` và ingest **trước 00:30** ⇒ merge PR của nhánh `a/A09-dockerfile`. Chưa được ⇒ đóng PR đó, giữ deploy `--source` (Buildpacks), không viết thêm.

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A12-ve-dich
```

## Bước 1 — Tạo task (dán cho Claude)

Trước khi dán, sửa chữ trong ngoặc vuông `[ĐÃ MERGE / ĐÃ BỎ]` thành đúng quyết định của bạn ở Bước 0.

```text
Dùng skill tao-task để tạo task tên "A12 — Deploy bằng image, gọi thử 14 endpoint". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A09 (Dockerfile trên nhánh riêng), A11 (agy chạy lúc bạn ngủ). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

Quyết định Dockerfile của tôi: [ĐÃ MERGE / ĐÃ BỎ].

## Được đọc
- `.kb/README.md`
- `.kb/spec/05_HA_TANG_CLOUD.md` Mục 1, 3, 5
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2
- `.kb/spec/00_QUYET_DINH.md` D-30, D-64
- `package.json`
- `.github/workflows/`
- `Dockerfile`

## Được ghi
- `.github/workflows/deploy.yml`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Chỉ khi quyết định là ĐÃ MERGE: sửa `.github/workflows/deploy.yml` theo `.kb/spec/05_HA_TANG_CLOUD.md` Mục 3: từ cùng commit build 2 image bằng Dockerfile (staging trỏ Supabase dev/staging, production trỏ Supabase production, D-72), push Artifact Registry, deploy staging bằng `--image`, job production deploy image prod sau khi được duyệt. Quyết định là ĐÃ BỎ thì không sửa file nào.
3. Gọi thử đủ 14 endpoint của `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2 trên staging bằng `curl`. Tôi sẽ đưa URL staging; token bot nằm trong biến môi trường `SMOKE_TOKEN` của cửa sổ lệnh, không in token ra. Lập bảng: endpoint | mã HTTP nhận được | mã kỳ vọng | đạt hay chưa.

## Tiêu chí xong
- Lệnh kiểm: `git diff --stat`
- ĐÃ MERGE: `git diff` chỉ có `.github/workflows/deploy.yml`, đúng các ý ở `.kb/spec/05_HA_TANG_CLOUD.md` Mục 3. ĐÃ BỎ: `git diff` rỗng.
- Bảng 14 endpoint đủ 14 dòng, có mã nhận được thật (không đoán).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không merge PR, không bấm duyệt production, không chạy `gcloud run deploy`, không đổi biến môi trường Cloud Run.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "A12 — Deploy bằng image, gọi thử 14 endpoint" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "A12 — Deploy bằng image, gọi thử 14 endpoint": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `git diff --stat` thấy đúng như Tiêu chí xong.
- [ ] `git status` chỉ có các file ở mục Được ghi (hoặc không có file nào nếu đã bỏ Dockerfile).
- [ ] **04:00:** bảng 14 endpoint của `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2 đều đạt trên staging. Endpoint nào chưa đạt thì mở Issue nhãn `bug` cho đúng người.
- [ ] Bạn tự thử ngắt AI khẩn cấp X-11: đặt `AI_DISABLED="true"` trên staging, gọi một lời gọi AI thấy `ERR_AI_UNAVAILABLE`, rồi đặt lại `"false"`.
- [ ] Quyết định Dockerfile (merge hay bỏ) đã ghi vào báo cáo và nhắn cho cả nhóm.

```text
Task "A12 — Deploy bằng image, gọi thử 14 endpoint" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

Chỉ làm khối dưới khi đã merge Dockerfile (có sửa `deploy.yml`). Đã bỏ Dockerfile thì bỏ qua khối này.

```powershell
git add .github/workflows/deploy.yml
git commit -m "ci(ci): deploy bằng image"
git pull --rebase origin main
git push -u origin a/A12-ve-dich
gh pr create --base main --title "A12 — Deploy bằng image" --body "Closes #<số Issue>"
```

Sau đó bạn tự làm, theo thứ tự:
1. Chạy migration trên project Supabase **production** nếu chưa chạy (`.kb/spec/05_HA_TANG_CLOUD.md` Mục 5: staging đạt rồi mới production).
2. Chờ staging chạy smoke test xanh, rồi bấm duyệt production trên GitHub Environment `production`.
3. **05:00:** nhắn cả nhóm "đóng băng tính năng", từ giờ chỉ sửa lỗi có Issue nhãn `bug`. Chuyển sang mục Về đích trong README vai.

## Tiếp theo

→ Về đích (xem README vai)
