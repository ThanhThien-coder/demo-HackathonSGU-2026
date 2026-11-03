# C03 — Kế hoạch câu hỏi, suy ra trạng thái

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4** |
| Nhánh | `c/C03-plan-derive` |
| Cần có trước | C02 |
| Mở đường cho | A05, A08, D08, E05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b c/C03-plan-derive
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "C03 — Kế hoạch câu hỏi, suy ra trạng thái". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: C02. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 5, 6, 8, 9, 10, Test bắt buộc
- `.kb/spec/03_API_VA_LUU_TRU.md` Mục 5.1
- `.kb/spec/02_CONTRACTS.md` Mục 1 (CONFIG phần BKT), Mục 5.3, 6, 7
- `.kb/spec/00_QUYET_DINH.md` D-12, D-16, D-34, D-35
- `package.json`
- `src/`

## Được ghi
- `src/lib/plan.ts`
- `src/lib/derive.ts`
- `src/lib/__tests__/plan.test.ts`
- `src/lib/__tests__/derive.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. B1 `planNodeQuestions` (.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Mục 5, 6; D-34): chọn kỹ năng và tier (BKT-41), mọi kỹ năng đã thạo vẫn hỏi 1 câu (BKT-31, D-34), xếp thứ tự câu (BKT-42), chọn góc focus (BKT-44, BKT-46), chọn step_indices gửi AI (BKT-48).
3. B2 `nodeStatusFromRuns` và persona (.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md Mục 8, 9): tính màu node từ kết quả các run LEARN (BKT-70..72). Persona: dùng hằng `PERSONAS` có sẵn trong `@/contracts` (.kb/spec/02_CONTRACTS.md Mục 6, do Vai A viết ở A02), KHÔNG định nghĩa lại; route ghi persona (`src/server/persona.ts`) là việc của Vai A (A11). Test T-PER kiểm các số của 3 persona bằng hàm trong `bkt-engine.ts` (C02) với dữ liệu lấy từ `PERSONAS`.
4. B3 `deriveNodeStates` (.kb/spec/03_API_VA_LUU_TRU.md Mục 5.1): duyệt các node theo thứ tự tô-pô, xác định trạng thái AVAILABLE khi mọi node cha đã thông hoặc soft-bypass khi analysis_failed, xác định cờ has_warning.
5. Viết test cho nhóm T-PLAN, T-RUN, T-PER trong `src/lib/__tests__/plan.test.ts` và test cho `deriveNodeStates` trong `src/lib/__tests__/derive.test.ts`.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/lib/__tests__`
- Có đủ các nhóm test T-PLAN, T-RUN, T-PER trong `plan.test.ts`, tất cả xanh.
- Test `deriveNodeStates` trong `derive.test.ts` xanh: node cha FAILED hoặc analysis_failed thì node con mở khóa thành AVAILABLE kèm `has_warning = true`.
- Kế hoạch câu hỏi không bao giờ rỗng: node đã thạo vẫn sinh đúng 1 câu tier ARCHITECT cho kỹ năng điểm thấp nhất (BKT-31, D-34).

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
Dùng skill giao-task-agy giao task "C03 — Kế hoạch câu hỏi, suy ra trạng thái" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/lib/__tests__` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Danh sách test có đủ các nhóm T-PLAN, T-RUN, T-PER của `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Test bắt buộc.
- [ ] Test `deriveNodeStates` xác nhận logic thông node cha (kể cả soft-bypass khi `analysis_failed`) và gắn cờ cảnh báo `has_warning`.
- [ ] Báo cho Vai A (A05 bước 3) và Vai D (chế độ offline) biết `plan.ts` và `derive.ts` đã sẵn sàng.

```text
Task "C03 — Kế hoạch câu hỏi, suy ra trạng thái" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/lib/plan.ts src/lib/__tests__/plan.test.ts
git commit -m "feat(bkt): lập kế hoạch câu hỏi, màu node, persona"
git add src/lib/derive.ts src/lib/__tests__/derive.test.ts
git commit -m "feat(bkt): suy ra trạng thái node"
git pull --rebase origin main
git push -u origin c/C03-plan-derive
gh pr create --base main --title "C03 — Kế hoạch câu hỏi, suy ra trạng thái" --body "Closes #<số Issue>"
```

Báo A (A05 bước 3) và D (offline) là `plan.ts` và `derive.ts` đã có PR. Vai A merge khi CI xanh.

## Tiếp theo

→ [C04](C04-gemini.md)
