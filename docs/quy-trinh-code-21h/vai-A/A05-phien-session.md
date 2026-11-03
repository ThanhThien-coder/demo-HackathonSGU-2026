# A05 — Phiên, cache RAM, quota, /api/sessions, /progress

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4** |
| Nhánh | `a/A05-phien-session` |
| Cần có trước | A04 (database, auth); bước 3 cần C03 (src/lib/derive.ts) |
| Mở đường cho | A06, A07, D06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A05-phien-session
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A05 — Phiên, cache RAM, quota, /api/sessions, /progress". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2, 4
- `.kb/spec/02_CONTRACTS.md` Mục 6, 7, 8
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 1
- `.kb/spec/00_QUYET_DINH.md` D-59
- `package.json`
- `src/`

## Được ghi
- `src/server/session.ts`
- `src/server/cache.ts`
- `src/server/quota.ts`
- `src/server/progress.ts`
- `src/app/api/sessions/route.ts`
- `src/app/api/sessions/[id]/progress/route.ts`
- `src/server/__tests__/session.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `src/server/cache.ts` và `src/server/session.ts`: kiểm tra quyền sở hữu phiên (API-05), hàm `getSessionStaticResult` dựng lại từ bảng `session_snapshots` (`.kb/spec/03_API_VA_LUU_TRU.md` Mục 4).
3. B2: Viết `src/server/quota.ts` kiểm soát trần token phiên (AI-06); viết `src/app/api/sessions/route.ts` xử lý `GET /api/sessions` bằng đúng một câu truy vấn SQL (`jsonb_array_length`, `LEFT JOIN … GROUP BY`, không lặp N+1), tính toán `can_resume`/`resume_blocker`.
4. B3: Viết `src/server/progress.ts` gọi `deriveNodeStates`; tạo route `src/app/api/sessions/[id]/progress/route.ts` chỉ đọc cơ sở dữ liệu (`.kb/spec/03_API_VA_LUU_TRU.md` Mục 2 dòng 13).
5. Viết test trong `src/server/__tests__/session.test.ts` kiểm tra các trường hợp bảo vệ quyền sở hữu và phiên cập nhật engine.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/server`
- Test truy cập phiên của người dùng khác trả về `ERR_SESSION_NOT_FOUND`.
- Test khi `engine_version` khác `CONFIG.ENGINE_VERSION` trả về `can_resume = false`, `resume_blocker = "ENGINE_UPDATED"`.
- Không xảy ra truy vấn lặp N+1 trong endpoint danh sách phiên.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không tự viết `deriveNodeStates`; C03 chưa merge thì để bước 3 lại, ghi báo cáo.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "A05 — Phiên, cache RAM, quota, /api/sessions, /progress" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/server` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test trường hợp phiên của người khác trả về đúng mã `ERR_SESSION_NOT_FOUND`.
- [ ] Test trường hợp `engine_version` khác trả về `can_resume = false` và `resume_blocker = "ENGINE_UPDATED"`.
- [ ] Route `GET /api/sessions` chỉ dùng một câu truy vấn SQL gom nhóm, không lặp truy vấn N+1.

```text
Task "A05 — Phiên, cache RAM, quota, /api/sessions, /progress" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/cache.ts src/server/session.ts src/server/__tests__/session.test.ts
git commit -m "feat(api): phiên học, cache RAM"
git add src/server/quota.ts src/app/api/sessions/route.ts
git commit -m "feat(api): /api/sessions, quota"
git add src/server/progress.ts src/app/api/sessions/[id]/progress/route.ts
git commit -m "feat(api): /progress"
git pull --rebase origin main
git push -u origin a/A05-phien-session
gh pr create --base main --title "A05 — Phiên, cache RAM, quota, /api/sessions, /progress" --body "Closes #<số Issue>"
```

Báo Vai D đã có 2 endpoint `/api/sessions` và `/api/sessions/[id]/progress`. Vai A merge khi CI xanh.

## Tiếp theo

→ [A06](A06-ingest.md)
