# E02 — Fixture phản hồi AI, test khớp kiểu

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 13:00–14:30 (H+1 → H+2.5) |
| Nhánh | `e/E02-fixture-ai` |
| Cần có trước | A02, E01 |
| Mở đường cho | C05, C06, C07, C08, C09, D05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E02-fixture-ai
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E02 — Fixture phản hồi AI, test khớp kiểu". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02, E01. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.1, 2.2, 2.3, 2.4
- `.kb/spec/02_CONTRACTS.md` Mục 3, 5
- `package.json`
- `src/`

## Được ghi
- `src/server/ai/__fixtures__/analysis-n3.json`
- `src/server/ai/__fixtures__/overview.json`
- `src/server/ai/__fixtures__/questions-n3.json`
- `src/server/ai/__fixtures__/grading-n3-q1.json`
- `src/__tests__/fixtures.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết 4 file fixture AI: `src/server/ai/__fixtures__/analysis-n3.json` (`NodeAnalysisRaw`), `overview.json` (`RepoOverviewRaw`), `questions-n3.json` (`GeneratedQuestionRaw[]`), `grading-n3-q1.json` (`GradingRaw`) theo `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.1–2.4. Giữ nguyên chỗ cố ý sai: 2.1 có 1 kỹ năng sai chỗ (`AUTH_SECURITY` ở bước 3), 2.2 có 1 nhận xét không căn cứ (báo cáo doanh thu N7).
3. Viết `src/__tests__/fixtures.test.ts`: test nạp 5 fixture (cả `shop-api.json` và 4 fixture AI) và kiểm khớp kiểu contracts `.kb/spec/02_CONTRACTS.md` Mục 3, 5 bằng toán tử `satisfies`.
4. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/__tests__/fixtures.test.ts`
- 4 file fixture AI đúng cấu trúc theo spec; test kiểm tra cả 5 fixture khớp kiểu bằng `satisfies` chạy xanh.

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
Dùng skill giao-task-agy giao task "E02 — Fixture phản hồi AI, test khớp kiểu" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/__tests__/fixtures.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] 4 file fixture AI được tạo đầy đủ trong `src/server/ai/__fixtures__/`.
- [ ] Giữ nguyên chỗ cố ý sai trong fixture: 2.1 có kỹ năng sai chỗ, 2.2 có nhận xét không căn cứ.
- [ ] Test nạp 5 fixture kiểm khớp kiểu contracts bằng toán tử `satisfies`.

```text
Task "E02 — Fixture phản hồi AI, test khớp kiểu" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/server/ai/__fixtures__/analysis-n3.json src/server/ai/__fixtures__/overview.json src/server/ai/__fixtures__/questions-n3.json src/server/ai/__fixtures__/grading-n3-q1.json
git commit -m "test(test): fixture phản hồi AI"
git add src/__tests__/fixtures.test.ts
git commit -m "test(test): kiểm fixture khớp contracts"
git pull --rebase origin main
git push -u origin e/E02-fixture-ai
gh pr create --base main --title "E02 — Fixture phản hồi AI, test khớp kiểu" --body "Closes #<số Issue>"
```

Báo Vai C (C05) và Vai D (D05) fixture đã merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [E03](E03-forbidden-moderation.md)
