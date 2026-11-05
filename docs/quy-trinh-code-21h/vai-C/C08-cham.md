# C08 — Chấm và gợi ý (`evaluate-feynman`)

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:00 (H+10 → H+12) · **Lát dọc 2 lúc 00:00** |
| Nhánh | `c/C08-cham` |
| Cần có trước | C07, E04 (`src/server/ai/guard/injection.ts` đã merge) |
| Mở đường cho | A10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C08-cham
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C08 — Chấm và gợi ý evaluate-feynman". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C07, E04 (`src/server/ai/guard/injection.ts` đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/20_AI_GOI_VA_PROMPT.md` Mục 7, Test bắt buộc
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 6, Test bắt buộc
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.4, Mục 3.4
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần AI và Nộp bài), Mục 5.4, 6
- `.kb/spec/00_QUYET_DINH.md` D-13, D-36
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/grade.ts`
- `src/server/ai/prompts/grade.ts`
- `src/server/ai/guard/followup.ts`
- `src/server/ai/__tests__/grade.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 `gradeWithAI`, prompt, schema, luật Đạt (.kb/spec/20_AI_GOI_VA_PROMPT.md Mục 7: AI-27, AI-28, AI-29, AI-30): hiện thực hàm `gradeWithAI` (không nhận code, D-36); prompt GRADE_SYSTEM; hàm kẹp chuẩn hóa `normalizeGrading`; kiểm tra trích dẫn có thật `coveredFlags` và quyết định đạt `decidePass` (AI-30, D-13).
3. B2 gợi ý theo lượt, mẫu tĩnh, `injectionGrading`, `toEvaluateResponse` (AI-31, AI-32, AI-33, AI-34): gợi ý theo lượt `expectedFollowUpType`, `decideFollowUp`; mẫu tĩnh `staticHint`, `staticFeedback` (AI-32); hàm `injectionGrading` (AI-33); hàm chuyển đổi response `toEvaluateResponse` (AI-34).
4. B3 `verifyFollowUp`, làm sạch (.kb/spec/21_AI_KIEM_VA_DUYET.md Mục 6, GUARD-13, GUARD-14): hàm `verifyFollowUp` kiểm tra gợi ý không lộ vị trí/con số (leaksNumbers) và feedback người học; hàm làm sạch thuật ngữ và giới hạn số câu.
5. Viết test trong `src/server/ai/__tests__/grade.test.ts` cho các trường hợp AI-27, AI-30a, AI-30b, AI-31, AI-32, AI-33, GUARD-13, GUARD-14 dùng file fixture có sẵn `src/server/ai/__fixtures__/grading-n3-q1.json` (fixture 2.4 của .kb/spec/50_TEST_VA_FIXTURE.md, Vai E viết ở E02). Không tự viết lại fixture. Nhận diện câu tấn công dùng `isInjection` của `src/server/ai/guard/injection.ts` (E04), không viết lại.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.
7. Gợi ý theo lượt và bậc (`20` AI-31), khối lượt trước và khối tra tên xuyên bài (`20` AI-27, AI-28), quyết định D-74.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai`
- Có test (mock AI hoặc mock DB) cho ca D8 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4, tên test ghi mã ca.
- Test AI-30a, AI-30b: fixture 2.4 lượt 2 đạt (true); đổi trích dẫn sang câu không có thật thì không đạt (false); core_accuracy < 70 không đạt.
- Test AI-31, AI-32: lượt 1 gợi ý CONCEPT, lượt 2 gợi ý CODE_POINTER, lượt cuối null; gợi ý vi phạm cổng gác tự động chuyển sang mẫu tĩnh.
- Test AI-33: câu lệnh tiêm prompt thì nhận injectionGrading, 0 điểm, 0 token, không gợi ý.
- Test GUARD-13, GUARD-14: kiểm tra lộ số và làm sạch feedback đúng quy tắc.
- Test AI-37 (lời gọi chấm): gợi ý trượt gác thì không gọi lại, dùng mẫu tĩnh, có dòng log mã `G1`.

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
Dùng skill giao-task-agy giao task "C08 — Chấm và gợi ý evaluate-feynman" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test AI-30a, AI-30b đạt: luật Đạt yêu cầu trích dẫn có thật trong câu trả lời người học.
- [ ] Test AI-31 đạt đủ 3 bậc × lượt; AI-32 chuyển mẫu tĩnh an toàn khi trượt gác.
- [ ] Test GUARD-13, GUARD-14 đạt: cổng gác chặn đúng các ca lộ con số và tên hàm ở gợi ý CONCEPT trong GUARD-13.
- [ ] Test khối lượt trước đạt: lượt 1 không có, lượt 2 đủ 2 khối; tên chỉ có trong câu trả lời lượt trước bị cổng gác coi là tên lạ.
- [ ] Test tra tên xuyên bài đạt: khối chỉ có tên, không có code; tên của bài điều kiện xếp trước; đọc snapshot lỗi thì chấm như cũ.

- [ ] Có test cho ca D8 của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4 và test đó xanh.
```text
Task "C08 — Chấm và gợi ý evaluate-feynman" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/grade.ts src/server/ai/prompts/grade.ts
git commit -m "feat(ai): chấm Feynman, gợi ý theo lượt, mẫu tĩnh"
git add src/server/ai/guard/followup.ts src/server/ai/__tests__/grade.test.ts
git commit -m "feat(guard): kiểm gợi ý và nhận xét"
git pull --rebase origin main
git push -u origin c/C08-cham
gh pr create --base main --title "C08 — Chấm và gợi ý evaluate-feynman" --body "Closes #<số Issue>"
```

Báo Vai A (A10) là logic chấm Feynman đã sẵn sàng để hoàn thành Lát dọc 2. Vai A merge khi CI xanh.

## Tiếp theo

→ [C09](C09-tong-quan.md)
