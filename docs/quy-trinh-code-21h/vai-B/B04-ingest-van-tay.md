# B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–17:30 (H+4 → H+5.5) |
| Nhánh | `b/B04-ingest-van-tay` |
| Cần có trước | B03, E03 (`maskSensitive` đã merge) |
| Mở đường cho | A06, B05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b b/B04-ingest-van-tay
```

Kiểm tra PR E03 (`maskSensitive`) đã merge vào `main` trước khi thực hiện.

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/10_ENGINE_INGEST.md` Mục 0, 10, 11, 12, 13, Test bắt buộc
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 dòng D25
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG`), Mục 3, 4
- `package.json`
- `src/`

## Được ghi
- `src/server/engine/ingest/special.ts`
- `src/server/engine/ingest/secrets.ts`
- `src/server/engine/ingest/fingerprint.ts`
- `src/server/engine/ingest/index.ts`
- `src/server/engine/ingest/__tests__/van-tay.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `special.ts` trích xuất file ảo từ `.ipynb`, `.vue`, `.svelte` theo `.kb/spec/10_ENGINE_INGEST.md` Mục 10 (ING-100, ING-101, ING-102).
3. B2: Viết `secrets.ts`: hàm `redactSecrets`, kiểm tra cờ injection `hasInjectionText`, gọi hàm `maskSensitive` từ `src/lib/moderation.ts` do Vai E viết, cộng dồn `redacted_secret_count` theo `.kb/spec/10_ENGINE_INGEST.md` Mục 11 (ING-110, ING-113) và `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5.
4. B3: Viết phần còn lại của `fingerprint.ts` (vân tay dự án, archetype, framework, tech_stack), kiểm tra kết quả rỗng `assertNotEmpty`, và hoàn thiện hàm điều phối `runIngest` trong `src/server/engine/ingest/index.ts` theo Mục 0, 12, 13 (ING-131).
5. Viết test trong `src/server/engine/ingest/__tests__/van-tay.test.ts` bao phủ các ca T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và ca D25 của `.kb/spec/50_TEST_VA_FIXTURE.md`.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/engine/ingest`
- Có đủ các test T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và test D25 của spec 50 (số dòng `\n` không đổi), tất cả chạy xanh.
- Toàn bộ secret và PII được che đúng định dạng `<REDACTED_SECRET>` và `***`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không tự viết `maskSensitive`; dùng hàm `maskSensitive` từ `src/lib/moderation.ts` của Vai E; E03 chưa merge thì ghi `kẹt`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/engine/ingest` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Có đầy đủ các test T-ING-22, T-ING-23, T-ING-24, T-ING-25, T-ING-26, T-ING-27, T-ING-28, T-ING-29, T-ING-30, T-ING-31, T-ING-32, T-ING-34 và ca D25 của spec 50.
- [ ] Số dòng `\n` của file mã nguồn được bảo toàn trước và sau khi che secret (D25).

```text
Task "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/engine/ingest/special.ts
git commit -m "feat(engine): notebook, vue, định dạng đặc biệt"
git add src/server/engine/ingest/secrets.ts
git commit -m "feat(engine): che secret và PII"
git add src/server/engine/ingest/fingerprint.ts src/server/engine/ingest/index.ts src/server/engine/ingest/__tests__/van-tay.test.ts
git commit -m "feat(engine): vân tay dự án, runIngest"
git pull --rebase origin main
git push -u origin b/B04-ingest-van-tay
gh pr create --base main --title "B04 — Ingest 3: định dạng đặc biệt, che secret, vân tay, runIngest" --body "Closes #<số Issue>"
```

Báo cho Vai A (A06) rằng `runIngest` đã hoàn thành và sẵn sàng tích hợp. Vai A merge khi CI xanh.

## Tiếp theo

→ [B05](B05-tang1.md)
