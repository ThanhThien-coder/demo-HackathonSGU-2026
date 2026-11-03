# A04 — Database, auth, /api/me

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 13:30–14:30 (H+1.5 → H+2.5) |
| Nhánh | `a/A04-db-auth` |
| Cần có trước | A02 (contracts đã merge) |
| Mở đường cho | A05, D06 |
| Cách làm | agy viết file · Claude kiểm · bạn chạy SQL trên Supabase và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A04-db-auth
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A04 — Database, auth, /api/me". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02 (contracts đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2, 3, 3.2, 8
- `.kb/spec/02_CONTRACTS.md` Mục 9
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 9, 13
- `.kb/spec/05_HA_TANG_CLOUD.md` Mục 1, 5
- `.kb/spec/00_QUYET_DINH.md` D-44, D-59, D-64, D-65
- `package.json`
- `src/`

## Được ghi
- `supabase/migrations/0001_init.sql`
- `src/server/db.ts`
- `src/server/auth.ts`
- `src/server/errors.ts`
- `src/server/log.ts`
- `src/app/auth/callback/route.ts`
- `src/app/api/me/route.ts`
- `src/server/__tests__/errors.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết file migration `supabase/migrations/0001_init.sql` chứa toàn bộ bảng, enum, index, RLS của `.kb/spec/03_API_VA_LUU_TRU.md` Mục 3, 3.2, bao gồm cả bảng `session_snapshots` (D-59).
3. B2: Viết `src/server/db.ts` (kết nối driver `postgres` 3.x, `prepare: false`, số kết nối `max` theo `.kb/spec/05_HA_TANG_CLOUD.md` Mục 1, `db.tx` dùng `sql.begin`), `src/server/log.ts` (dùng `pino` theo `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 9), `src/server/errors.ts` (`ApiError`, bảng mã HTTP theo `.kb/spec/02_CONTRACTS.md` Mục 9) và viết test trong `src/server/__tests__/errors.test.ts`.
4. B3: Viết `src/server/auth.ts` xác thực Bearer token (API-04), `src/app/auth/callback/route.ts` (D-44), `src/app/api/me/route.ts` (`GET` tạo `profiles` nếu chưa có, `DELETE` trả 204).
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server`
- Có test kiểm tra bảng mã HTTP chạy xanh.
- `src/server/log.ts` không ghi `DATABASE_URL`, token hay secret ra log (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 9.2).
- Thử nghiệm gọi `/api/me` không có token trả 401 `ERR_UNAUTHENTICATED`, có token trả 200.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A04 — Database, auth, /api/me" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có bộ test kiểm tra bảng mã HTTP chạy đạt.
- [ ] Dán `supabase/migrations/0001_init.sql` vào SQL Editor của project Supabase dev/staging chạy không lỗi, Table Editor hiển thị đủ các bảng.
- [ ] Lệnh `curl` gọi `/api/me` không có token trả về 401 `ERR_UNAUTHENTICATED`, có token trả về 200.
- [ ] File `src/server/log.ts` không ghi các thông tin nhạy cảm (`DATABASE_URL`, token) ra log.

```text
Task "A04 — Database, auth, /api/me" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): migration khởi tạo"
git add src/server/db.ts src/server/log.ts src/server/errors.ts src/server/__tests__/errors.test.ts
git commit -m "feat(db): kết nối postgres, log, lỗi"
git add src/server/auth.ts src/app/auth/callback/route.ts src/app/api/me/route.ts
git commit -m "feat(api): auth, /api/me"
git pull --rebase origin main
git push -u origin a/A04-db-auth
gh pr create --base main --title "A04 — Database, auth, /api/me" --body "Closes #<số Issue>"
```

Chạy file migration trên Supabase dev/staging (chưa chạy trên production theo `.kb/spec/05_HA_TANG_CLOUD.md` Mục 5); thử đăng nhập GitHub trên máy local (`.kb/doc-de-hieu/01_deploy.md` Mục 4.4). Vai A merge khi CI xanh.

## Tiếp theo

→ [A05](A05-phien-session.md)
