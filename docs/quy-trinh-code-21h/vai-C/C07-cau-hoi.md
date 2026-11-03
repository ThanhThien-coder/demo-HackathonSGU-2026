# C07 — Đặt câu hỏi (`enrich-node`)

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 20:00–22:00 (H+8 → H+10) |
| Nhánh | `c/C07-cau-hoi` |
| Cần có trước | C06, C03 |
| Mở đường cho | A08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C07-cau-hoi
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C07 — Đặt câu hỏi enrich-node". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 6, Test bắt buộc
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 5, Test bắt buộc
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.3, Mục 3.4
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI), Mục 5.3
- `.kb/spec/00_QUYET_DINH.md` D-36, D-37
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/questions.ts`
- `src/server/ai/prompts/questions.ts`
- `src/server/ai/guard/questions.ts`
- `src/server/ai/__tests__/questions.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 luồng đặt câu hỏi, bước gửi AI, prompt (.kb/spec/20_AI_GOI_VA_PROMPT.md Mục 6, AI-22, AI-23, AI-25): hiện thực `generateQuestions`, prompt QUESTIONS_SYSTEM kèm FOCUS_GUIDE_A/B, schema câu hỏi; chỉ gửi code các bước trong step_indices (AI-23); gọi lại câu hỏng kèm lý do phản hồi cổng gác; câu hỏng sau retry đánh dấu DROPPED.
3. B2 `checkQuestions` (.kb/spec/21_AI_KIEM_VA_DUYET.md Mục 5, GUARD-12): kiểm tra câu hỏi và đáp án mẫu theo Q1–Q8 (kỹ năng, số ý bắt buộc, tên trong code, số dòng, từ cấm, từ cuối symbol cho WEAKNESS, số bước cho FLOW, tên file cho CHANGE).
4. Viết test trong `src/server/ai/__tests__/questions.test.ts` cho các trường hợp AI-22, AI-23, GUARD-12 dùng fixture 2.3 của .kb/spec/50_TEST_VA_FIXTURE.md.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai`
- Có test (mock AI hoặc mock DB) cho ca D4, D5 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4, tên test ghi mã ca.
- Test AI-22: câu 2 trượt gác thì request 2 chỉ gửi lại câu 2; câu trượt 2 lần đánh dấu DROPPED.
- Test AI-23: kế hoạch N3 gửi bước 1–3 vào code_data; prompt không cache (D-37).
- Test GUARD-12: fixture 2.3 qua hết kiểm tra; câu chứa Redis bị từ chối mã Q5; FLOW thiếu bước bị từ chối mã Q7.

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
Dùng skill giao-task-agy giao task "C07 — Đặt câu hỏi enrich-node" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test AI-22, AI-23 đạt: luồng đặt câu hỏi và phân phối bước đúng kế hoạch.
- [ ] Test GUARD-12 đạt: cổng gác câu hỏi kiểm tra đầy đủ các quy tắc Q1–Q8 trên fixture 2.3.

- [ ] Có test cho ca D4, D5 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "C07 — Đặt câu hỏi enrich-node" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/questions.ts src/server/ai/prompts/questions.ts
git commit -m "feat(ai): đặt câu hỏi"
git add src/server/ai/guard/questions.ts src/server/ai/__tests__/questions.test.ts
git commit -m "feat(guard): kiểm câu hỏi"
git pull --rebase origin main
git push -u origin c/C07-cau-hoi
gh pr create --base main --title "C07 — Đặt câu hỏi enrich-node" --body "Closes #<số Issue>"
```

Báo Vai A (A08) là hàm đặt câu hỏi đã sẵn sàng. Vai A merge khi CI xanh.

## Tiếp theo

→ [C08](C08-cham.md)
