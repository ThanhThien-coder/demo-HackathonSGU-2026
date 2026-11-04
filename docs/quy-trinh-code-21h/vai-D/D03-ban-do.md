# D03 — Bản đồ bài học từ fixture

Làm xong phiếu này, người học có thể mở ngăn kéo bản đồ lộ trình bằng ReactFlow từ fixture, nhìn thấy cấu trúc đồ thị bài học phân cấp với các thẻ node trực quan hiển thị trạng thái và biểu tượng.

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
Dùng skill tao-task để tạo task tên "D03 — Bản đồ bài học từ fixture". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D02, E01 (fixture `shop-api`). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 4, 5, Test bắt buộc T1, T20, T32
- `docs/spec/01_KIEN_TRUC_VA_LUONG.md` Mục 2
- `docs/spec/02_CONTRACTS.md` Mục 1, 3, 10
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 1
- `package.json`
- `src/`

## Được ghi
- `src/components/canvas/DagCanvas.tsx`
- `src/components/canvas/CanvasToolbar.tsx`
- `src/components/canvas/GraphNodeCard.tsx`
- `src/app/learn/components/LessonGraphDrawer.tsx`
- `src/app/learn/components/GraphSidebarButton.tsx`
- `src/app/dev/page.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/components/canvas/DagCanvas.tsx` sử dụng ReactFlow hiển thị các node theo tọa độ `node.position` (INV-10), tắt kéo thả `nodesDraggable = false`, tắt nối cạnh `nodesConnectable = false`, bọc tải chậm bằng `next/dynamic` với tùy chọn `ssr: false` theo `docs/spec/30_UI.md` Mục 4.
3. Viết `src/components/canvas/GraphNodeCard.tsx`: 4 màu theo `status` kèm biểu tượng và chữ (INV-11), ⚠ khi có cảnh báo, biểu tượng ★ Capstone, tiền tố `~` cho tên suy ra cắt ngắn theo `CONFIG.TITLE_MAX_CHARS` (T20), node `LOCKED` không cho bấm (T1).
4. Viết `src/components/canvas/CanvasToolbar.tsx` nhận props `{ fingerprint: ProjectFingerprint; report: ClientStaticEngineResult["ingestion_report"] }` theo `docs/spec/30_UI.md` Mục 3 và 4: hiển thị độ tin cậy `graph_confidence` (xanh/vàng/đỏ), chip ngôn ngữ `language_breakdown`, số lượng node, `degraded_mode` ("Repo tuần tự"), số bí mật đã che `redacted_secret_count`, cảnh báo khi bị cắt bớt (`truncated`, `omitted_node_count > 0`); có bảng chú giải 4 màu trạng thái, cảnh báo ⚠, cạnh nét đứt suy luận; và các nút điều khiển thu phóng, căn giữa đồ thị.
5. Viết ngăn kéo bản đồ `src/app/learn/components/LessonGraphDrawer.tsx` chứa `DagCanvas`, nút mở bản đồ bên cạnh `src/app/learn/components/GraphSidebarButton.tsx`, tự động gọi `fitView` mỗi khi ngăn kéo được mở ra (T32).
6. Dựng trang nháp `src/app/dev/page.tsx` nạp dữ liệu từ fixture `src/server/engine/__fixtures__/shop-api.json` của Vai E để kiểm tra hiển thị bản đồ.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- ReactFlow được đặt trong ngăn kéo bản đồ `LessonGraphDrawer`, bọc qua `next/dynamic` với `ssr: false`.
- `CanvasToolbar` nhận props `fingerprint` và `report`; có đủ chú giải 4 màu, cảnh báo ⚠, cạnh nét đứt theo `docs/spec/30_UI.md` Mục 3 và 4.
- Tên node suy ra quá dài được cắt gọn bằng `…` kèm tiền tố `~` theo `CONFIG.TITLE_MAX_CHARS` (T20).
- Màu sắc node luôn đi kèm biểu tượng và nhãn chữ (INV-11). Node `LOCKED` không phản hồi khi nhấp chuột (T1).
- Tự động gọi `fitView` khi mở ngăn kéo (T32).

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`. Không tạo mock trong route hoặc store giả phía server. Chờ API chỉ dùng fixture qua trang nháp `/dev`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D03 — Bản đồ bài học từ fixture" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Mở trình duyệt tại `/dev` thấy 7 node N1–N7 của `shop-api` hiển thị đầy đủ trên canvas ReactFlow trong ngăn kéo.
- [ ] `CanvasToolbar` có đủ thông tin thanh canvas và bảng chú giải 4 màu, cảnh báo ⚠, cạnh nét đứt (`docs/spec/30_UI.md` Mục 3, 4).
- [ ] Bấm hoặc nhấn Enter trên node `LOCKED` không có phản hồi và không gửi request (`docs/spec/30_UI.md` T1).
- [ ] Mở ngăn kéo thấy đồ thị tự động căn giữa khung nhìn qua `fitView` (T32).

```text
Task "D03 — Bản đồ bài học từ fixture" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/canvas/DagCanvas.tsx
git commit -m "feat(ui): bản đồ ReactFlow"
git add src/components/canvas/GraphNodeCard.tsx
git commit -m "feat(ui): thẻ node 4 màu kèm icon và nhãn"
git add src/components/canvas/CanvasToolbar.tsx
git commit -m "feat(ui): thanh công cụ canvas"
git add src/app/learn/components/LessonGraphDrawer.tsx src/app/learn/components/GraphSidebarButton.tsx
git commit -m "feat(ui): ngăn kéo bản đồ bài học"
git add src/app/dev/page.tsx
git commit -m "feat(ui): trang nháp nạp fixture shop-api"
git pull --rebase origin main
git push -u origin d/D03-ban-do
gh pr create --base main --title "D03 — Bản đồ bài học từ fixture" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Mốc H+4: hiện bản đồ từ fixture. Vai A merge khi CI xanh.

## Tiếp theo

→ [D04](D04-monaco.md)
