# E08 — Kịch bản trục trặc, kiểm xuyên module, duyệt lần 1

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:30–03:00 (H+12.5 → H+15) |
| Nhánh | `e/E08-kiem-xuyen` |
| Cần có trước | E07 |
| Mở đường cho | C10 |
| Cách làm | agy viết test · bạn chạy tay kịch bản D, X-tests, duyệt lần 1 · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E08-kiem-xuyen
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E08 — Kịch bản trục trặc, kiểm xuyên module, duyệt lần 1". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: E07. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4, 4
- `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10
- `.kb/spec/00_QUYET_DINH.md` D-64, D-66
- `package.json`
- `src/`

## Được ghi
- `review/ket_qua_duyet.md`
- `review/loi_da_gap.md`
- `src/__tests__/xuyen-module.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/__tests__/xuyen-module.test.ts` kiểm tự động các ca xuyên module: X-10 (gọi `GET /api/health` không gửi token Authorization vẫn trả HTTP 200 body "ok" theo `.kb/spec/00_QUYET_DINH.md` D-64), X-13 (mỗi lời gọi AI thành công ghi đúng 1 dòng `ai_usage`, trúng `ai_cache` thì không ghi theo `.kb/spec/00_QUYET_DINH.md` D-66). (Ghi chú: ca X-11 do Vai A làm ở A12).
3. Cập nhật `review/loi_da_gap.md` chuẩn bị bảng ghi nhận kết quả kiểm thử kịch bản D và kiểm thử xuyên module.
4. Cập nhật `review/ket_qua_duyet.md` chuẩn bị cấu trúc cho việc ghi nhận kết quả duyệt tay lần 1.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/__tests__/xuyen-module.test.ts`
- Test X-10 và X-13 chạy xanh.

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
Dùng skill giao-task-agy giao task "E08 — Kịch bản trục trặc, kiểm xuyên module, duyệt lần 1" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/__tests__/xuyen-module.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Bạn đã chạy tay các ca trục trặc của `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4: D1, D9, D10, D12, D13, D16, D17, D19, D20, D21, D22, D26, D27; mỗi ca có kết quả ✅ / ❌ trong `review/loi_da_gap.md`.
- [ ] Bạn đã chạy tay các ca kiểm thử xuyên module: X-03, X-04, X-05; mỗi ca có kết quả ✅ / ❌ trong `review/loi_da_gap.md`.
- [ ] Bạn đã chạy script `scripts/review-run.ts` 3 lần, **tự giải trước rồi mới đọc output AI**, điền `review/ket_qua_duyet.md` bản nháp theo bảng kiểm `.kb/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (GUARD-18 bước 1–3).
- [ ] Bạn đã soạn slide nháp từ kịch bản `pitch/` (mở ở repo tài liệu: `pitch/KICH_BAN_DEMO.md`).

- [ ] Các ca D còn lại đã có test của vai sở hữu, bạn chỉ xem chúng có trong kết quả `npx vitest run` và xanh: D2, D3 (C06), D4, D5 (C07), D6, D15 (A10), D7 (A07, A10), D8 (C08), D11 (A08), D28 (E03).
```text
Task "E08 — Kịch bản trục trặc, kiểm xuyên module, duyệt lần 1" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/__tests__/xuyen-module.test.ts
git commit -m "test(test): kiểm xuyên module"
git add review/loi_da_gap.md
git commit -m "docs(test): kết quả kịch bản D, X-tests"
git add review/ket_qua_duyet.md
git commit -m "docs(demo): duyệt tay lần 1"
git pull --rebase origin main
git push -u origin e/E08-kiem-xuyen
gh pr create --base main --title "E08 — Kịch bản trục trặc, kiểm xuyên module, duyệt lần 1" --body "Closes #<số Issue>"
```

Đi ngủ lúc 03:00 (khoảng nghỉ 03:00–05:00). Vai C (C10) thức lúc 03:00 tiếp quản duyệt tay và chạy `record-bundle.ts`. Vai A merge khi CI xanh.

## Tiếp theo

→ [E09](E09-dod.md)
