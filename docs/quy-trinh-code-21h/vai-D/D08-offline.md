# D08 — Áp response, đổi màu, mở khóa, Offline

Làm xong phiếu này, hệ thống sẽ tự động cập nhật màu sắc node và mở khóa bài học tiếp theo sau khi chấm đạt, đồng thời kích hoạt chế độ Offline tự vận hành hoàn chỉnh đạt mốc Lát dọc 2.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 22:00–00:30 (H+10 → H+12.5) · **Lát dọc 2 lúc 00:00** |
| Nhánh | `d/D08-offline` |
| Cần có trước | D07, C02, C03; A10 (`evaluate-feynman`, `reveal`, xong 00:00; trong lúc chờ thì dùng fixture chấm của Vai E) |
| Mở đường cho | Lát dọc 2, E07, E09 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D08`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

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
- `docs/spec/30_UI.md` Mục 7.5, 8
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T2, T4, T17, T18, T19
- `docs/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `docs/spec/22_BKT_VA_KE_HOACH_CAU_HOI.md` Mục 1.1, 4
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 4 X-06
- `docs/spec/00_QUYET_DINH.md` D-02, D-40
- `package.json`
- `src/`

## Được ghi
- `src/store/workbench.ts`
- `src/lib/offline.ts`
- `src/lib/__tests__/offline.test.ts`
- `src/lib/api.ts`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Boot.tsx`
- `src/components/learn/FeynmanQuestionSection.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết logic áp response trong `src/store/workbench.ts`, cập nhật trạng thái node, gọi `GET /api/sessions/{id}/progress` khi mở khóa hoặc đổi màu (UI-76), xử lý lỗi nộp bài (UI-77) theo `docs/spec/30_UI.md` Mục 7.5.
3. Viết `src/lib/offline.ts` có cùng chữ ký hàm với `api.ts`, dùng kiểu `OfflineMockBundle` (`docs/spec/30_UI.md` Mục 8, `docs/spec/02_CONTRACTS.md` Mục 10), tự cập nhật BKT và trạng thái node tại chỗ trên client. Viết unit test trong `src/lib/__tests__/offline.test.ts`: test tự dựng bundle nhỏ từ fixture của Vai E; tuyệt đối không tạo `public/demo/mock_bundle.json` (đây là việc của C10).
4. Viết cơ chế bật tắt Offline bằng phím tắt `Ctrl+Shift+D` (gắn ở `src/components/layout/Boot.tsx`), tham số URL `?offline=1` hoặc nút "Mở bản demo Offline", hiển thị nhãn cảnh báo Offline cố định trên thanh điều hướng `src/components/layout/Navbar.tsx` (UI-60), hỗ trợ persona offline (UI-62) theo `docs/spec/30_UI.md` Mục 8.
5. Xử lý ca T17 ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: nộp bài gặp `ERR_PERSISTENCE_UNAVAILABLE` thì `FeynmanQuestionSection.tsx` hiện nút "Thử lại", số lượt không đổi, `localStorage` không lưu biên nhận thừa.
6. Offline phải tự nạp gói dữ liệu cả khi mở thẳng `?offline=1`, và chấm, xem đáp án theo đúng node đang học, không cố định một node.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx vitest run src/lib/__tests__/offline.test.ts && npm run build`
- Nhãn Offline luôn hiển thị khi kích hoạt `Ctrl+Shift+D` hoặc `?offline=1`, không phát sinh request mạng nào tới `/api/*` học tập hay Supabase (X-06).
- Node đổi màu và mở khóa chính xác sau khi nộp bài đạt (T2, T4).
- Test offline tự dựng bundle nhỏ độc lập, không tạo `public/demo/mock_bundle.json`.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Chế độ offline không gọi `/api/*` học tập, không gọi Supabase.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
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
- [ ] Bạn nhấn `Ctrl+Shift+D` thấy nhãn Offline cố định trên thanh điều hướng; tab Network của DevTools không có request `/api/` hay Supabase.
- [ ] Thử nghiệm T2 và T4: node đổi màu chính xác và mở khóa các node tiếp theo sau khi nộp bài đạt.
- [ ] Thử T17 ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: giả lập DB lỗi khi nộp thấy nút "Thử lại", lượt không đổi.

```text
Task "D08 — Áp response, đổi màu, mở khóa, Offline" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/store/workbench.ts
git commit -m "feat(ui): áp kết quả chấm, đổi màu và mở khóa node"
git add src/lib/offline.ts src/lib/__tests__/offline.test.ts
git commit -m "feat(ui): chế độ offline độc lập"
git add src/lib/api.ts src/components/layout/Navbar.tsx src/components/layout/Boot.tsx src/components/learn/FeynmanQuestionSection.tsx
git commit -m "feat(ui): phím tắt bật tắt offline và nhãn navbar"
git pull --rebase origin main
git push -u origin d/D08-offline
gh pr create --base main --title "D08 — Áp response, đổi màu, mở khóa, Offline" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Lát dọc 2. Vai A merge khi CI xanh.

## Tiếp theo

→ [D09](D09-phu.md)
