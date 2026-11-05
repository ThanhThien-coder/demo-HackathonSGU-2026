# A03 — CI/CD, an ninh GitHub

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 12:30–13:30 (H+0.5 → H+1.5) |
| Nhánh | `a/A03-ci-cd` |
| Cần có trước | A01 (khung code trên main); WIF, Secrets, Environment production dựng trước ngày thi |
| Mở đường cho | E01, mọi PR |
| Cách làm | Claude tự viết file workflow · bạn bật mục an ninh trên GitHub và commit |

**Cách nhanh:** nhắn AI `Làm phiếu A03`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A03-ci-cd
```

Phiếu này chạy song song với [A02](A02-contracts.md) (Claude tự viết workflow trong lúc agy đang chạy A02).

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A03 — CI/CD, an ninh GitHub". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A01 (khung code trên main); WIF, Secrets, Environment production dựng trước ngày thi. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 12, 17
- `docs/spec/05_HA_TANG_CLOUD.md` Mục 1, 5
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-09
- `docs/spec/00_QUYET_DINH.md` D-30, D-64, D-65
- `package.json`

## Được ghi
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/workflows/deploy.yml`
- `.github/dependabot.yml`

## Việc cần làm
1. B1: Viết `.github/workflows/ci.yml` (kích hoạt trên mọi PR và push vào `main`: dùng `actions/setup-node` với `node-version-file: .nvmrc` (D-68), chạy `npm ci`, typecheck `tsc --noEmit`, lint `eslint`, unit test `vitest run`).
2. B2: Viết `.github/workflows/security.yml` (chạy `npm audit --omit=dev --audit-level=critical` trên PR và lịch cron `0 0 * * 1`) và viết `.github/dependabot.yml` cấu hình quét định kỳ hằng tuần cho npm theo `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 17.
3. B3: Viết `.github/workflows/deploy.yml` theo `docs/spec/05_HA_TANG_CLOUD.md` Mục 5 và `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 12: xác thực GCP qua Workload Identity Federation (dự phòng secret key JSON `GCP_SA_KEY`), deploy `gcloud run deploy --source` lên staging S2 với cấu hình của `docs/spec/05_HA_TANG_CLOUD.md` Mục 1, chạy smoke test X-09 (`/api/health` và ingest repo demo với token bot), job deploy production gắn GitHub Environment `production` (cổng duyệt thủ công của Vai A).
4. Đối chiếu từng workflow với đúng mục spec đã ghi (task này không có code dùng contracts nên không cần kiem-contract).

## Tiêu chí xong
- Lệnh kiểm: `git diff --stat`
- Có đủ 4 file ở Được ghi; `ci.yml` có bước `actions/setup-node` đọc `.nvmrc` và đủ 4 bước `npm ci`, typecheck, lint, vitest; `security.yml` có lệnh audit và lịch cron như B2; `deploy.yml` có job staging, smoke test X-09, job production gắn Environment `production`.
- Không có giá trị bí mật nào viết thẳng trong file, chỉ dùng `${{ secrets.* }}`.
- Smoke test ingest không bị tắt hay bỏ qua (trước 20:00 bước này đỏ vì chưa có engine, đó là bình thường).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không ghi bí mật vào workflow, chỉ dùng `${{ secrets.* }}`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Không giao agy cho task "A03 — CI/CD, an ninh GitHub" vì cần chạy lệnh. Bạn tự làm đúng mục Việc cần làm của task, rồi tự kiểm theo Tiêu chí xong. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Báo lại: các lệnh đã chạy và kết quả (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa.
```

Rồi mở **chat Claude mới** và dán:

```text
Dùng skill kiem-task kiểm task "A03 — CI/CD, an ninh GitHub": chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push. Chỉ báo lại kết quả.
```

Claude chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, làm tiếp từng nhóm commit ở Bước 4.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `git diff --stat` thấy đủ 4 file.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Mở `ci.yml`, `security.yml`, `deploy.yml` đọc lướt: đúng các ý ở Tiêu chí xong.
- [ ] Bước smoke test ingest vẫn còn trong `deploy.yml` (không bị tắt).
- [ ] Không có chuỗi bí mật tĩnh nào được ghi vào file workflow.
- [ ] Workflow `deploy` không còn đỏ liên tục: đủ secret GCP, hoặc tắt nếu nhóm chốt host Vercel (lỗi A-01, Q-C).

```text
Task "A03 — CI/CD, an ninh GitHub" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add .github/workflows/ci.yml
git commit -m "ci(ci): typecheck, lint, vitest"
git add .github/workflows/security.yml .github/dependabot.yml
git commit -m "ci(ci): npm audit, dependabot"
git add .github/workflows/deploy.yml
git commit -m "ci(ci): deploy staging, smoke test, cổng duyệt production"
git pull --rebase origin main
git push -u origin a/A03-ci-cd
gh pr create --base main --title "A03 — CI/CD, an ninh GitHub" --body "Closes #<số Issue>"
```

Sau đó bạn tự làm trên GitHub, theo thứ tự:
1. Merge PR này (bạn là Vai A).
2. Settings ⇒ Code security: bật Dependabot alerts và security updates, Secret scanning kèm Push protection, CodeQL default setup (`docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 17).
3. Settings ⇒ Branches: branch protection cho `main`: bắt buộc qua PR và check `ci` xanh, **không** bắt buộc người duyệt (để bạn tự merge được PR của mình).
4. Xem tab Actions: `deploy.yml` chạy lên staging, bước `/api/health` đạt (bước smoke ingest đỏ trước 20:00 là bình thường). WIF lỗi thì chuyển ngay sang secret dự phòng `GCP_SA_KEY`.
5. Nhắn Vai E mở PR thử (E01), xem `ci` và `security` chạy xanh rồi merge.

## Tiếp theo

→ [A04](A04-db-auth.md)
