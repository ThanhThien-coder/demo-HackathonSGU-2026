# E04 — Regex tấn công, kiểm câu trả lời

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 16:00–17:30 (H+4 → H+5.5) |
| Nhánh | `e/E04-injection-similarity` |
| Cần có trước | A02 |
| Mở đường cho | A10, D07 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E04-injection-similarity
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E04 — Regex tấn công, kiểm câu trả lời". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7, 8, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (`CONFIG.ANSWER_*`), 8
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/guard/injection.ts`
- `src/lib/similarity.ts`
- `src/server/ai/guard/__tests__/injection.test.ts`
- `src/lib/__tests__/similarity.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/server/ai/guard/injection.ts`: hằng `INJECTION_REGEX`, hàm `isInjection` theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7 (GUARD-15).
3. Viết `src/lib/similarity.ts`: hàm `validateAnswerLength` (kiểm tra `CONFIG.ANSWER_MIN_CHARS`, `CONFIG.ANSWER_MAX_CHARS`), hàm `similarity` Levenshtein trên mảng code point theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 8 (GUARD-16).
4. Viết test trong `src/server/ai/guard/__tests__/injection.test.ts`: test GUARD-15 gồm mọi dòng của bảng "Phải khớp / Không được khớp" ở `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7.
5. Viết test trong `src/lib/__tests__/similarity.test.ts`: test GUARD-16 theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Test bắt buộc.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/server/ai/guard/__tests__/injection.test.ts src/lib/__tests__/similarity.test.ts`
- Test GUARD-15 gồm mọi dòng của bảng "Phải khớp / Không được khớp" ở `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7 chạy xanh.
- Test GUARD-16 theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Test bắt buộc chạy xanh.

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
Dùng skill giao-task-agy giao task "E04 — Regex tấn công, kiểm câu trả lời" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/server/ai/guard/__tests__/injection.test.ts src/lib/__tests__/similarity.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test GUARD-15 bao phủ mọi dòng của bảng "Phải khớp / Không được khớp" tại `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 7.
- [ ] Test GUARD-16 kiểm đủ các trường hợp độ dài ngắn/dài/vừa và tính khoảng cách Levenshtein theo Test bắt buộc.

```text
Task "E04 — Regex tấn công, kiểm câu trả lời" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/guard/injection.ts src/server/ai/guard/__tests__/injection.test.ts
git commit -m "feat(guard): regex câu lệnh tấn công"
git add src/lib/similarity.ts src/lib/__tests__/similarity.test.ts
git commit -m "feat(guard): kiểm độ dài, độ giống câu trả lời"
git pull --rebase origin main
git push -u origin e/E04-injection-similarity
gh pr create --base main --title "E04 — Regex tấn công, kiểm câu trả lời" --body "Closes #<số Issue>"
```

Nhờ Vai C review PR. Báo Vai A (A10) và Vai D (D07) đã có PR. Vai A merge khi CI xanh.

## Tiếp theo

→ [E05](E05-kich-ban-ham.md)
