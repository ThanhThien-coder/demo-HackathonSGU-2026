# C05 — Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, kiểm phân tích

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–18:30 (H+5.5 → H+6.5) |
| Nhánh | `c/C05-guard-loi` |
| Cần có trước | C04, E03 (`src/server/ai/guard/forbidden.ts` đã merge) |
| Mở đường cho | C06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C05-guard-loi
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C05 — Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, kiểm phân tích". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 2, 3, 6, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), Mục 5
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.1
- `.kb/spec/00_QUYET_DINH.md` D-15, D-19, D-51
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/guard/text.ts`
- `src/server/ai/guard/names.ts`
- `src/server/ai/guard/lines.ts`
- `src/server/ai/guard/analysis.ts`
- `src/server/ai/guard/log.ts`
- `src/server/ai/guard/__tests__/loi.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 `text.ts`, `names.ts`, `lines.ts` (.kb/spec/21_AI_KIEM_VA_DUYET.md Mục 2: GUARD-02, GUARD-04, GUARD-05, GUARD-08, GUARD-09): chuẩn hóa chuỗi norm, normText, bóc tách backticks; kiểm tra tên isValidName, checkNames; cơ chế Relaxed mode (GUARD-05); kiểm tra số dòng invalidLineRefs (GUARD-08); kiểm tra bằng chứng nằm đúng bước symbolInStep (GUARD-09).
3. B2 `checkAnalysis` và ghi mã lỗi (.kb/spec/21_AI_KIEM_VA_DUYET.md Mục 3 GUARD-10, Mục 6 GUARD-22): hàm checkAnalysis kiểm tra kỹ năng (A1), mẫu (A2), điểm dở (A3), điểm hay (A4), số bước (A5), từ cấm/tên/dòng (A6), hạ cấp thành skeleton_only (A7); hàm logGuardBlock trong log.ts ghi nhận sự kiện guard_blocked.
4. Viết test trong `src/server/ai/guard/__tests__/loi.test.ts` cho các trường hợp GUARD-04, GUARD-05, GUARD-10, GUARD-22 dùng fixture 2.1 của .kb/spec/50_TEST_VA_FIXTURE.md của Vai E.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai/guard`
- Test GUARD-10: fixture 2.1 gạch AUTH_SECURITY do verifyToken không có ở bước 3, còn 2 kỹ năng, findOne hợp lệ, skeleton_only = false.
- Test GUARD-04: phạm vi N3/N2 chấp nhận findOne, jwt.verify, JWT_SECRET; từ chối redisClient, verifyToken.
- Test GUARD-05: node STRUCTURAL chấp nhận userService.fooBar theo Relaxed mode; node RESOLVED từ chối.
- Test GUARD-22: steps thiếu bước thì issues có mã A5, trả skeleton_only = true, log ghi nhận mã lỗi.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không sửa `src/server/ai/guard/forbidden.ts` và `src/server/ai/guard/injection.ts` (của Vai E).
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "C05 — Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, kiểm phân tích" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai/guard` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test GUARD-04, GUARD-05 đạt: kiểm tra tên hợp lệ và nới lỏng trên node STRUCTURAL.
- [ ] Test GUARD-10, GUARD-22 đạt: `checkAnalysis` xử lý đúng fixture 2.1 và ghi log sự kiện bị chặn.

```text
Task "C05 — Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, kiểm phân tích" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/guard/text.ts src/server/ai/guard/names.ts src/server/ai/guard/lines.ts
git commit -m "feat(guard): chuẩn hóa, chốt tên, số dòng"
git add src/server/ai/guard/analysis.ts src/server/ai/guard/log.ts src/server/ai/guard/__tests__/loi.test.ts
git commit -m "feat(guard): kiểm bản phân tích"
git pull --rebase origin main
git push -u origin c/C05-guard-loi
gh pr create --base main --title "C05 — Cổng gác lõi: chuẩn hóa, chốt tên, số dòng, kiểm phân tích" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [C06](C06-analyze.md)
