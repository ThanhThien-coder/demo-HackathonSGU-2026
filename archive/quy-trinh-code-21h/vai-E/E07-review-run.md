# E07 — Script chạy duyệt, kịch bản A/B thật

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:30 (H+10 → H+12.5) · **Lát dọc 2 (00:00)** |
| Nhánh | `e/E07-review-run` |
| Cần có trước | E05; bước 2 cần Lát dọc 2 |
| Mở đường cho | E08, C10 |
| Cách làm | agy viết script · bạn chạy kịch bản A/B ở Bước 3 · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E07-review-run
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E07 — Script chạy duyệt, kịch bản A/B thật". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.1, 3.2, 4
- `.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15
- `package.json`
- `src/`

## Được ghi
- `scripts/review-run.ts`
- `review/loi_da_gap.md`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `scripts/review-run.ts` theo `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (GUARD-18 bước 1): gọi API thật trên repo demo, phân tích mọi node + tổng quan 3 lần, xóa cache trước mỗi lần chạy như spec ghi (`delete from ai_cache where cache_key like '%|{snapshot_id}|%'`), ghi kết quả thô ra thư mục `review/`.
3. Cập nhật khung ghi nhận kết quả kịch bản A/B trong `review/loi_da_gap.md`.
4. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit`
- File scripts/review-run.ts biên dịch thành công không lỗi TypeScript.
- Script không ghi code repo người dùng vào review/.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Script không ghi code repo người dùng vào `review/` (`.kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15 dòng `review/`).
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "E07 — Script chạy duyệt, kịch bản A/B thật" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Sau 00:00 (khi Lát dọc 2 merge), bạn tự chạy kịch bản A theo `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.1 trên giao diện, mỗi dòng có kết quả ✅ / ❌ trong `review/loi_da_gap.md`.
- [ ] Bạn tự chạy kịch bản B theo `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.2 trên giao diện, mỗi dòng có kết quả ✅ / ❌ trong `review/loi_da_gap.md`.
- [ ] Mở DevTools kiểm tra ca X-02: response không chứa các trường cấm (`misconception`, `quote`, `symbol_whitelist`, `suspicious_instruction_files`, `reference_answer` của câu chưa xong).
- [ ] Script `scripts/review-run.ts` không ghi mã nguồn repo người dùng vào `review/`.

```text
Task "E07 — Script chạy duyệt, kịch bản A/B thật" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add scripts/review-run.ts
git commit -m "feat(demo): script chạy duyệt tay"
git add review/loi_da_gap.md
git commit -m "docs(test): kết quả kịch bản A, B"
git pull --rebase origin main
git push -u origin e/E07-review-run
gh pr create --base main --title "E07 — Script chạy duyệt, kịch bản A/B thật" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [E08](E08-kiem-xuyen.md)
