# A10 — Nối /api/evaluate-feynman, /api/reveal

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:00 (H+10 → H+12) · **Lát dọc 2 lúc 00:00** |
| Nhánh | `a/A10-evaluate-reveal` |
| Cần có trước | A08, C02, E03, E04; C08 (chấm, xong 00:00; trong lúc chờ thì mock `gradeWithAI`) |
| Mở đường cho | Lát dọc 2, D08, E07 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b a/A10-evaluate-reveal
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "A10 — Nối /api/evaluate-feynman, /api/reveal". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 2, 6.2, 6.3, 6.5
- `.kb/spec/02_CONTRACTS.md` Mục 6, 8
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 7
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7, 8
- `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.1, 7
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.1, 3.4, Mục 3.4
- `.kb/spec/00_QUYET_DINH.md` D-13, D-18, D-36, D-40, D-65, D-66
- `package.json`
- `src/`

## Được ghi
- `src/server/evaluate.ts`
- `src/server/reveal.ts`
- `src/server/progress.ts`
- `src/app/api/evaluate-feynman/route.ts`
- `src/app/api/reveal/route.ts`
- `src/app/api/__tests__/evaluate.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1: Viết `src/server/evaluate.ts` thực hiện các bước kiểm tra đầu vào đúng thứ tự quy định tại `.kb/spec/03_API_VA_LUU_TRU.md` Mục 6.2: kiểm tra độ dài và trùng lặp (GUARD-16), phát hiện từ xấu trả mã lỗi `ERR_ANSWER_INAPPROPRIATE` không tính lượt (0 token), che dữ liệu nhạy cảm theo `maskSensitive(redactSecrets(·).code)` (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 13 ý 5), kiểm tra lệch số lượt nộp trả `ERR_ATTEMPT_OUT_OF_SYNC`, kiểm tra regex tấn công (GUARD-15) chấm 0 điểm theo AI-33.
3. B2: Gọi chấm bài của Vai C ngoài transaction, mở transaction ngắn ghi lượt nộp, cập nhật BKT, gọi `finalizeRunIfDone` (`.kb/spec/03_API_VA_LUU_TRU.md` Mục 6.5), trả về `unlocked_node_ids`, ghi dòng `ai_usage`. Nếu cơ sở dữ liệu lỗi sau các lần thử lại ⇒ trả mã lỗi `ERR_PERSISTENCE_UNAVAILABLE`, hủy bỏ kết quả chấm (`.kb/spec/50_TEST_VA_FIXTURE.md` D14).
4. B3: Viết `src/server/reveal.ts` và route `src/app/api/reveal/route.ts` theo `.kb/spec/03_API_VA_LUU_TRU.md` Mục 6.3. Bổ sung `finalizeRunIfDone` trong `src/server/progress.ts`.
5. Viết test trong `src/app/api/__tests__/evaluate.test.ts`.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/app/api/__tests__/evaluate.test.ts`
- Có test (mock AI hoặc mock DB) cho ca D6, D7, D15 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 (AI lỗi 503 hoặc hết hạn mức khi chấm thì không tính lượt, `attempts_used` không đổi; Postgres lỗi thì `ERR_PERSISTENCE_UNAVAILABLE`, không gọi AI), tên test ghi mã ca.
- Test (mock AI) cho các ca `.kb/spec/50_TEST_VA_FIXTURE.md` D1, D12, D21, D23 và `ERR_QUESTION_FINISHED` đều xanh.
- Lỗi ghi nhận `ERR_PERSISTENCE_UNAVAILABLE` khi DB lỗi, không trừ lượt làm bài.

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
Dùng skill giao-task-agy giao task "A10 — Nối /api/evaluate-feynman, /api/reveal" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/app/api/__tests__/evaluate.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Các ca test D1 (prompt injection), D12 (lệch attempt), D21 (từ xấu), D23 (che PII/secret) và `ERR_QUESTION_FINISHED` chạy đạt.
- [ ] Chạy tay kịch bản A trên máy cục bộ hoàn thành thông suốt từ N3 đến nộp bài đạt.

- [ ] Có test cho ca D6, D7, D15 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "A10 — Nối /api/evaluate-feynman, /api/reveal" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/evaluate.ts src/server/progress.ts src/app/api/evaluate-feynman/route.ts src/app/api/__tests__/evaluate.test.ts
git commit -m "feat(api): evaluate kiểm trước khi chấm, evaluate chấm và ghi"
git add src/server/reveal.ts src/app/api/reveal/route.ts
git commit -m "feat(api): /api/reveal"
git pull --rebase origin main
git push -u origin a/A10-evaluate-reveal
gh pr create --base main --title "A10 — Nối /api/evaluate-feynman, /api/reveal" --body "Closes #<số Issue>"
```

Báo Vai D và Vai E đạt lát dọc 2 lúc 00:00. Chuẩn bị giao việc cho agy trước khi đi ngủ lúc 00:30. Vai A merge khi CI xanh.

## Tiếp theo

→ [A11](A11-api-con-lai.md)
