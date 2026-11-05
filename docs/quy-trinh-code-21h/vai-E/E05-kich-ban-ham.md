# E05 — Test kịch bản mức hàm, chuẩn bị duyệt tay

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–20:00 (H+5.5 → H+8) |
| Nhánh | `e/E05-kich-ban-ham` |
| Cần có trước | C02, C03 |
| Mở đường cho | E07, E08 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu E05`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b e/E05-kich-ban-ham
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "E05 — Test kịch bản mức hàm, chuẩn bị duyệt tay". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C02, C03. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.1, 3.2, 3.3, 3.5, 3.6
- `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10
- `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1, 3, 4
- `docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15
- `package.json`
- `src/`

## Được ghi
- `src/__tests__/kich-ban-ham.test.ts`
- `review/loi_da_gap.md`
- `review/cau_tra_loi_mau.md`
- `review/ket_qua_duyet.md`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/__tests__/kich-ban-ham.test.ts`: test chuỗi BKT của kịch bản A (A5, A6), B (B4, B5), C (C4, C6), E (E1, E3a, E3b, E3c) và persona `SENIOR_RUSTY` theo `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.6, gọi hàm của `bkt-engine`, `plan` với đồng hồ cố định. Số kỳ vọng lấy đúng từ `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3 (ví dụ A5 `DB_OPTIMIZATION` lấy đúng 0.4202); sai số < 5·10⁻⁵ theo `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.
3. Viết `review/cau_tra_loi_mau.md`: bộ khoảng 20 câu trả lời mẫu theo `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 (mỗi câu trong kịch bản có 3 câu: đủ ý, thiếu 1 ý, sai; thêm câu bẫy: dài mà sai, đúng mà rất ngắn, viết không dấu, có cụm nếu bỏ qua bước này).
4. Viết `review/ket_qua_duyet.md`: khung bảng đúng cột của `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 "Ghi kết quả" (`Node | Mục | AI nói | Lần 1/2/3 giống? | Kết luận | Người duyệt / người xem lại | Vì sao`).
5. Viết `review/loi_da_gap.md`: khung bảng lỗi.
6. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/__tests__/kich-ban-ham.test.ts`
- Test kịch bản A, B, C, E mức hàm chạy xanh; số kỳ vọng khớp docs/spec/50_TEST_VA_FIXTURE.md (A5 DB_OPTIMIZATION lấy đúng 0.4202); sai số < 5·10⁻⁵.
- Có đủ 3 file tài liệu trong thư mục review/.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không chép code repo người dùng vào `review/` (`docs/spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15 dòng `review/`).
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "E05 — Test kịch bản mức hàm, chuẩn bị duyệt tay" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/__tests__/kich-ban-ham.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Test chuỗi BKT kịch bản A, B, C, E và persona SENIOR_RUSTY chạy xanh với sai số < 5·10⁻⁵.
- [ ] Số kỳ vọng BKT khớp đúng từng mốc trong `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.
- [ ] `review/cau_tra_loi_mau.md` có khoảng 20 câu trả lời mẫu theo đúng `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10.
- [ ] `review/ket_qua_duyet.md` có khung bảng đúng các cột của `docs/spec/21_AI_KIEM_VA_DUYET.md` Mục 10 "Ghi kết quả".
- [ ] Không có mã nguồn repo người dùng trong thư mục `review/`.

```text
Task "E05 — Test kịch bản mức hàm, chuẩn bị duyệt tay" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/__tests__/kich-ban-ham.test.ts
git commit -m "test(test): kịch bản A, B, C, E mức hàm"
git add review/cau_tra_loi_mau.md review/ket_qua_duyet.md review/loi_da_gap.md
git commit -m "docs(demo): bộ câu trả lời mẫu, khung duyệt tay"
git pull --rebase origin main
git push -u origin e/E05-kich-ban-ham
gh pr create --base main --title "E05 — Test kịch bản mức hàm, chuẩn bị duyệt tay" --body "Closes #<số Issue>"
```

Vai A merge khi CI xanh.

## Tiếp theo

→ [E06](E06-repo-demo.md)
