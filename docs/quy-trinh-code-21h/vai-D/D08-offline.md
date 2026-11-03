# D08 — Áp response, đổi màu, mở khóa, Offline

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:30 (H+10 → H+12.5) · **Lát dọc 2 lúc 00:00** |
| Nhánh | `d/D08-offline` |
| Cần có trước | D07, C02, C03; A10 (`evaluate-feynman`, `reveal`, xong 00:00; trong lúc chờ thì dùng fixture chấm của Vai E) |
| Mở đường cho | Lát dọc 2, E07, E09 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D08-offline
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D08 — Áp response, đổi màu, mở khóa, Offline". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D07, C02, C03; A10 (`evaluate-feynman`, `reveal`, xong 00:00; trong lúc chờ thì dùng fixture chấm của Vai E). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 7.5, 8, Test bắt buộc T2, T4, T18, T19, T17
- `.kb/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `.kb/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.1, 4
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-06
- `.kb/spec/00_QUYET_DINH.md` D-02, D-40
- `package.json`
- `src/`

## Được ghi
- `src/store/workbench.ts`
- `src/lib/offline.ts`
- `src/components/header/AppHeader.tsx`
- `src/lib/__tests__/offline.test.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết logic áp response trong `src/store/workbench.ts`, cập nhật trạng thái node, gọi `GET /api/sessions/{id}/progress` khi mở khóa hoặc đổi màu (UI-76), xử lý lỗi nộp bài (UI-77) theo `.kb/spec/30_UI.md` Mục 7.5.
3. Viết `src/lib/offline.ts` cùng chữ ký với `api.ts`, dùng khóa `OfflineMockBundle` (`.kb/spec/30_UI.md` Mục 8, `.kb/spec/02_CONTRACTS.md` Mục 10), cập nhật BKT và trạng thái node tại chỗ. Viết test trong `src/lib/__tests__/offline.test.ts`; test tự dựng một bundle nhỏ kiểu `OfflineMockBundle` từ fixture trong `src/server/ai/__fixtures__/` của Vai E. Không tạo `public/demo/mock_bundle.json` (file thật do Vai C ghi lúc 05:00, phiếu C10).
4. Viết cơ chế bật tắt Offline bằng `Ctrl+Shift+D`, `?offline=1`, hiển thị nhãn cảnh báo cố định trong `src/components/header/AppHeader.tsx` (UI-60), và hỗ trợ persona offline (UI-62) theo `.kb/spec/30_UI.md` Mục 8.
5. Xử lý ca T17 của `.kb/spec/30_UI.md` Test bắt buộc: nộp bài gặp `ERR_PERSISTENCE_UNAVAILABLE` thì hiện "Thử lại", lượt không đổi, `localStorage` không lưu biên nhận.
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/lib/__tests__/offline.test.ts && npm run build`
- Nhãn Offline luôn hiển thị khi bật `Ctrl+Shift+D`, không gọi API học tập hay Supabase (X-06 của `.kb/spec/50_TEST_VA_FIXTURE.md`).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/contracts/*`. Thiếu kiểu hoặc kiểu sai thì đổi trạng thái `kẹt` và ghi rõ cần Vai A sửa gì.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Chế độ offline không gọi `/api/*` học tập, không gọi Supabase.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D08 — Áp response, đổi màu, mở khóa, Offline" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx vitest run src/lib/__tests__/offline.test.ts && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Bạn nhấn `Ctrl+Shift+D` thấy nhãn Offline cố định trên header; tab Network của DevTools không có request `/api/` hay Supabase. Lúc này chưa có `public/demo/mock_bundle.json` nên màn hình báo bundle lỗi và vẫn giữ chế độ Offline, đó là đúng `.kb/spec/30_UI.md` Mục 8 (thử với gói thật ở D10, sau 05:00).
- [ ] Thử nghiệm T2 và T4: node đổi màu chính xác và mở khóa các node tiếp theo sau khi nộp bài đạt.

- [ ] Thử T17 của `.kb/spec/30_UI.md`: giả lập DB lỗi khi nộp thấy "Thử lại", lượt không đổi.
```text
Task "D08 — Áp response, đổi màu, mở khóa, Offline" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/store/workbench.ts
git commit -m "feat(ui): áp kết quả, đổi màu, mở khóa"
git add src/lib/offline.ts src/lib/__tests__/offline.test.ts
git commit -m "feat(ui): chế độ offline"
git add src/components/header/AppHeader.tsx
git commit -m "feat(ui): bật tắt offline, nhãn"
git pull --rebase origin main
git push -u origin d/D08-offline
gh pr create --base main --title "D08 — Áp response, đổi màu, mở khóa, Offline" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Lát dọc 2. Vai A merge khi CI xanh.

## Tiếp theo

→ [D09](D09-phu.md)
