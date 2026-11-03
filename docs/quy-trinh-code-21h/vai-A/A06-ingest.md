# A06 — Nối POST /api/ingest

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–18:30 (H+4 → H+6.5) |
| Nhánh | `a/A06-ingest` |
| Cần có trước | A05 (phiên, cache), B04 (`runIngest`, xong 17:30; trước đó test bằng mock); `runEngine` (B07, 20:00) thì test bằng mock |
| Mở đường cho | Lát dọc 1, D06, smoke X-09, B08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A06-ingest
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A06 — Nối POST /api/ingest". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2, 4, 6.6
- `.kb/spec/02_CONTRACTS.md` Mục 3, 7, 8
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-09
- `.kb/spec/00_QUYET_DINH.md` D-27, D-31, D-42, D-59, D-64
- `package.json`
- `src/`

## Được ghi
- `src/app/api/ingest/route.ts`
- `src/server/session.ts`
- `src/app/api/__tests__/ingest.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Xử lý link GitHub: giới hạn đồng thời `CONFIG.MAX_CONCURRENT_INGESTIONS` ⇒ gọi `runIngest` ⇒ gọi `runEngine` ⇒ ghi `learning_sessions`, `session_snapshots` (D-59) ⇒ trả về `IngestResponse` qua hàm `toClientResult`; cấu hình `export const runtime = "nodejs"`.
3. B2: Xử lý mở lại phiên `{ session_id }` từ snapshot đã lưu trong CSDL, không tải lại file zip; xử lý tùy chọn `restart` (D-42); xử lý `subdir_override`.
4. B3: Xử lý upload file `.zip` qua trường `archive`, kiểm tra trần kích thước `CONFIG.MAX_UPLOAD_BYTES` (D-27).
5. Viết test trong `src/app/api/__tests__/ingest.test.ts`: dùng `vi.mock` hàm `runEngine` trả về fixture `src/server/engine/__fixtures__/shop-api.json`.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/app/api/__tests__/ingest.test.ts`
- Response trả về không chứa các trường nội bộ `symbol_whitelist`, `suspicious_instruction_files` (API-03).
- Mở lại phiên `{ session_id }` không thực hiện bất kỳ lệnh tải file zip nào.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không sửa code engine; mock chỉ nằm trong file test.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A06 — Nối POST /api/ingest" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/app/api/__tests__/ingest.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Phản hồi API không chứa các trường nhạy cảm `symbol_whitelist` hay `suspicious_instruction_files`.
- [ ] Khi gửi yêu cầu mở lại phiên `{ session_id }`, hệ thống đọc từ snapshot và không tải lại zip.

```text
Task "A06 — Nối POST /api/ingest" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/api/ingest/route.ts src/server/session.ts src/app/api/__tests__/ingest.test.ts
git commit -m "feat(api): /api/ingest từ link GitHub, mở lại phiên, ingest file zip"
git pull --rebase origin main
git push -u origin a/A06-ingest
gh pr create --base main --title "A06 — Nối POST /api/ingest" --body "Closes #<số Issue>"
```

Báo Vai D và Vai E rằng route ingest đã sẵn sàng kiểm thử. Khi B07 lên `main` (lát dọc 1, 20:00): dán link repo demo trên staging, xem smoke test X-09 của `deploy.yml` đạt; lỗi thì mở Issue nhãn `engine` hoặc `api`. Vai A merge khi CI xanh.

## Tiếp theo

→ [A07](A07-analyze-node.md)
