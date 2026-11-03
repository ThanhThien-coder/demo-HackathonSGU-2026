# D03 — Cột 1 Bản đồ từ fixture

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4: hiện bản đồ từ fixture** |
| Nhánh | `d/D03-ban-do` |
| Cần có trước | D02, E01 (fixture `shop-api`) |
| Mở đường cho | D05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D03-ban-do
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D03 — Cột 1 Bản đồ từ fixture". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 4, 5, Test bắt buộc T1, T20, T32
- `.kb/spec/01_KIEN_TRUC_VA_LUONG.md` Mục 2
- `.kb/spec/02_CONTRACTS.md` Mục 1, 3, 10
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 1
- `package.json`
- `src/`

## Được ghi
- `src/components/canvas/DagCanvas.tsx`
- `src/components/canvas/CanvasToolbar.tsx`
- `src/components/canvas/GraphNodeCard.tsx`
- `src/app/dev/page.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/components/canvas/DagCanvas.tsx` sử dụng ReactFlow hiển thị các node theo tọa độ `node.position` (INV-10), tắt kéo thả `nodesDraggable = false`, tắt nối cạnh `nodesConnectable = false`, bọc tải chậm bằng `next/dynamic` với tùy chọn `ssr: false` theo `.kb/spec/30_UI.md` Mục 4, 5 dòng cuối.
3. Viết `src/components/canvas/GraphNodeCard.tsx`: 4 màu theo `status` kèm biểu tượng (INV-11), ⚠ khi có cảnh báo, biểu tượng ★ Capstone, tiền tố `~` cho tên suy ra cắt ngắn theo `CONFIG.TITLE_MAX_CHARS`, node `LOCKED` không cho bấm (`.kb/spec/30_UI.md` Mục 4).
4. Viết `src/components/canvas/CanvasToolbar.tsx`, chú giải, và trang nháp `src/app/dev/page.tsx` nạp fixture `src/server/engine/__fixtures__/shop-api.json` của Vai E để hiện bản đồ (`.kb/spec/30_UI.md` Mục 4).
5. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Tên node suy ra từ thư mục quá dài được cắt gọn bằng `…` kèm tiền tố `~` (`.kb/spec/30_UI.md` T20).

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
Dùng skill giao-task-agy giao task "D03 — Cột 1 Bản đồ từ fixture" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Mở trình duyệt tại `/dev` thấy 7 node N1–N7 của `shop-api` hiển thị đầy đủ trên canvas ReactFlow.
- [ ] Bấm hoặc nhấn Enter trên node `LOCKED` không có phản hồi và không gửi request (`.kb/spec/30_UI.md` T1).

```text
Task "D03 — Cột 1 Bản đồ từ fixture" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/canvas/DagCanvas.tsx
git commit -m "feat(ui): bản đồ ReactFlow"
git add src/components/canvas/GraphNodeCard.tsx
git commit -m "feat(ui): thẻ node"
git add src/components/canvas/CanvasToolbar.tsx src/app/dev/page.tsx
git commit -m "feat(ui): thanh canvas, trang nháp"
git pull --rebase origin main
git push -u origin d/D03-ban-do
gh pr create --base main --title "D03 — Cột 1 Bản đồ từ fixture" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Mốc H+4: hiện bản đồ từ fixture. Vai A merge khi CI xanh.

## Tiếp theo

→ [D04](D04-monaco.md)
