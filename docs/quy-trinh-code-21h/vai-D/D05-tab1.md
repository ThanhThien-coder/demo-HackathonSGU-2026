# D05 — Cột 3: Tab X-Ray, Tab Tổng quan

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 17:30–18:30 (H+5.5 → H+6.5) |
| Nhánh | `d/D05-tab1` |
| Cần có trước | D04, E02 (fixture AI) |
| Mở đường cho | D06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D05-tab1
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D05 — Cột 3: Tab X-Ray, Tab Tổng quan". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 6.1, 6.3, Test bắt buộc T23
- `.kb/spec/01_KIEN_TRUC_VA_LUONG.md` Mục 2
- `.kb/spec/02_CONTRACTS.md` Mục 1, 5, 6, 10
- `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.1, 4
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.1
- `.kb/spec/00_QUYET_DINH.md` D-35
- `package.json`
- `src/`

## Được ghi
- `src/components/cockpit/Cockpit.tsx`
- `src/components/cockpit/XRayTab.tsx`
- `src/components/cockpit/SkillChips.tsx`
- `src/components/cockpit/StepList.tsx`
- `src/components/cockpit/AlgoStepper.tsx`
- `src/components/cockpit/OverviewTab.tsx`
- `src/app/dev/page.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/components/cockpit/Cockpit.tsx` (quản lý tab với `role="tablist"`), `src/components/cockpit/XRayTab.tsx`, `src/components/cockpit/StepList.tsx`, `src/components/cockpit/AlgoStepper.tsx` đúng thứ tự ở `.kb/spec/30_UI.md` Mục 6.1, gắn tiêu đề "Điểm dở — Nhận định của AI", không hiện cách sửa (INV-06).
3. Viết `src/components/cockpit/SkillChips.tsx` thể hiện chip kỹ năng có mài mòn chỉ hiển thị (`.kb/spec/30_UI.md` Mục 6.1, BKT-24, D-35) và nút cuối Tab 1 (UI-47).
4. Viết `src/components/cockpit/OverviewTab.tsx` (`.kb/spec/30_UI.md` Mục 6.3) và cập nhật `src/app/dev/page.tsx` nạp fixture AI N3 từ `src/server/ai/__fixtures__/` của Vai E để hiển thị Tab 1.
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Điểm dở không hiện cách sửa hay con số tình huống (INV-06, `.kb/spec/30_UI.md` T23).

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
Dùng skill giao-task-agy giao task "D05 — Cột 3: Tab X-Ray, Tab Tổng quan" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Người chạy tay: mở `/dev`, chọn N3 thấy Tab 1 nạp dữ liệu từ fixture `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 2.1.
- [ ] Phần Điểm dở có tiêu đề "Điểm dở — Nhận định của AI" và không để lộ cách sửa hay con số tình huống (INV-06).

```text
Task "D05 — Cột 3: Tab X-Ray, Tab Tổng quan" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/cockpit/Cockpit.tsx src/components/cockpit/XRayTab.tsx src/components/cockpit/StepList.tsx src/components/cockpit/AlgoStepper.tsx
git commit -m "feat(ui): tab X-Ray"
git add src/components/cockpit/SkillChips.tsx
git commit -m "feat(ui): chip kỹ năng, mài mòn"
git add src/components/cockpit/OverviewTab.tsx src/app/dev/page.tsx
git commit -m "feat(ui): tab Tổng quan"
git pull --rebase origin main
git push -u origin d/D05-tab1
gh pr create --base main --title "D05 — Cột 3: Tab X-Ray, Tab Tổng quan" --body "Closes #<số Issue>"
```

Báo Vai A review và merge. Vai A merge khi CI xanh.

## Tiếp theo

→ [D06](D06-noi-api.md)
