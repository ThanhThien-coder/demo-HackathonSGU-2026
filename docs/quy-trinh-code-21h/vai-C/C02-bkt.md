# C02 — BKT `src/lib/bkt-engine.ts`

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 13:00–14:30 (H+1 → H+2.5) |
| Nhánh | `c/C02-bkt` |
| Cần có trước | A02 (contracts đã merge) |
| Mở đường cho | C03, A10, D08, E05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C02-bkt
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C02 — BKT bkt-engine". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A02 (contracts đã merge). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1, 3, 4, 7, 10, Test bắt buộc
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần BKT), Mục 6
- `package.json`
- `src/`

## Được ghi
- `src/lib/bkt-engine.ts`
- `src/lib/__tests__/bkt-engine.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết các hàm cập nhật BKT: `updateSkill`, `computeSkillChange`, `revertSkillChange` theo .kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Mục 3, 7. Chữ ký theo .kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Mục 10.
3. Viết `getDecayedMastery` (decay), `tierOf`, `overallTier` (tier), `isDecaying`, `outcomeOf` theo .kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Mục 4, 7. Chữ ký theo Mục 10. Không viết `applyBkt` (thuộc `src/server/progress.ts`, việc của Vai A).
4. Viết test cho nhóm T-BKT, T-CHAIN, T-UPD, T-REV, T-DEC, T-TIER, T-MM, T-OUT của .kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Test bắt buộc. Số kỳ vọng chép đúng spec.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npx vitest run src/lib/__tests__/bkt-engine.test.ts`
- Có đủ 8 nhóm test T-BKT, T-CHAIN, T-UPD, T-REV, T-DEC, T-TIER, T-MM, T-OUT, tất cả xanh.
- Không làm tròn khi tính và lưu (BKT-02); test so sai số < 5·10⁻⁵.

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
Dùng skill giao-task-agy giao task "C02 — BKT bkt-engine" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npx vitest run src/lib/__tests__/bkt-engine.test.ts` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Danh sách test có đủ 8 nhóm T-BKT, T-CHAIN, T-UPD, T-REV, T-DEC, T-TIER, T-MM, T-OUT.
- [ ] Mở 2 test bất kỳ, số kỳ vọng trùng với `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Test bắt buộc.
- [ ] Không có `Math.round` hay `toFixed` trong phần tính toán.

```text
Task "C02 — BKT bkt-engine" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/lib/bkt-engine.ts src/lib/__tests__/bkt-engine.test.ts
git commit -m "feat(bkt): cập nhật kỹ năng, mài mòn, bậc"
git pull --rebase origin main
git push -u origin c/C02-bkt
gh pr create --base main --title "C02 — BKT bkt-engine" --body "Closes #<số Issue>"
```

Báo A (A10) và D (D08) là `bkt-engine` đã có PR. Vai A merge khi CI xanh.

## Tiếp theo

→ [C03](C03-plan-derive.md)
