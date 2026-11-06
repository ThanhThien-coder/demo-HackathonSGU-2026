# D03 — Bản đồ bài học từ fixture

Làm xong phiếu này, người học thấy cột trái Bản đồ bài học dựng bằng ReactFlow từ fixture: đồ thị luôn hiện, các thẻ node hiển thị trạng thái và biểu tượng.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 14:30–16:00 (H+2.5 → H+4) · **Mốc H+4: hiện bản đồ từ fixture** |
| Nhánh | `d/D03-ban-do` |
| Cần có trước | D02, E01 (fixture `shop-api`) |
| Mở đường cho | D05 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D03`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

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
- `docs/spec/30_UI.md` Mục 4, 5
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T1, T20, T32, T35
- `docs/spec/01_KIEN_TRUC_VA_LUONG.md` Mục 2
- `docs/spec/02_CONTRACTS.md` Mục 1, 3, 10
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 1
- `package.json`
- `src/`

## Được ghi
- `src/components/canvas/DagCanvas.tsx`
- `src/components/canvas/GraphNodeCard.tsx`
- `src/components/canvas/FlowEdge.tsx`
- `src/components/learn/LessonGraphPanel.tsx`
- `src/app/dev/page.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết `src/components/canvas/DagCanvas.tsx` sử dụng ReactFlow hiển thị các node theo tọa độ `node.position` (INV-10), `nodesDraggable`, `nodesConnectable`, `elementsSelectable = false`, Controls góc dưới trái, bọc tải chậm bằng `next/dynamic` với tùy chọn `ssr: false` theo `docs/spec/30_UI.md` Mục 4.
3. Viết `src/components/canvas/GraphNodeCard.tsx`: nền, viền, chữ lấy từ `--st-*`, có vạch màu bên trái và nhãn trạng thái kèm biểu tượng (INV-11), ⚠ khi có cảnh báo, ★ Capstone, tiền tố `~` cho tên suy ra cắt ngắn theo `CONFIG.TITLE_MAX_CHARS` (T20), node `LOCKED` không cho bấm (T1).
4. Viết `src/components/canvas/FlowEdge.tsx`: `RESOLVED` nét liền, `INFERRED` nét đứt, lớp phủ chuyển động riêng theo `docs/spec/30_UI.md` Mục 4, không dùng `animated` của xyflow; `prefers-reduced-motion` thì không vẽ lớp này.
5. Viết cột trái `src/components/learn/LessonGraphPanel.tsx` theo `docs/spec/30_UI.md` Mục 4: đầu cột "Bản đồ bài học", "{n} node", chip "Độ tin cậy đồ thị", ngôn ngữ, `detected_framework`, "Repo tuần tự", "Đã che {n} nội dung nhạy cảm", "Bỏ qua {n} file ▾"; dải cảnh báo đóng được (`LOW` không đóng được); `DagCanvas`; chú giải 4 trạng thái, ⚠, cạnh chắc chắn / suy luận. Đồ thị luôn hiện, không có nút mở, không có ngăn kéo.
6. Dựng trang nháp `src/app/dev/page.tsx` nạp dữ liệu từ fixture `src/server/engine/__fixtures__/shop-api.json` của Vai E để kiểm tra hiển thị bản đồ.
7. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Bấm node (lỗi D-07, T35):** có `onNodeClick`, hoặc `pointer-events-auto` cho card. Tắt kéo, chọn mà không có `onNodeClick` thì ReactFlow đặt `pointerEvents: none`, nên không bấm được node. Mở bài thì đưa node đó vào giữa khung. Nút "Thử lại phân tích" trong node vẫn bấm được.
- **Cỡ lúc mở (lỗi D-01, `30` Mục 4):** vừa khung nếu đọc được, không thì phóng quanh node đang mở hoặc node `AVAILABLE` đầu tiên. Không dùng `fitView` lúc mở, vì zoom xuống 0,20–0,32 thì chữ gần như không đọc được. Có nút xem toàn cảnh.
- **Cảnh báo thời gian (lỗi B-10):** dải cảnh báo không hiện cảnh báo `engine_ms` cho người học.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- ReactFlow được đặt trong cột trái `LessonGraphPanel`, bọc qua `next/dynamic` với `ssr: false`.
- `LessonGraphPanel` có đủ đầu cột, dải cảnh báo, chú giải 4 trạng thái, ⚠, cạnh nét đứt theo `docs/spec/30_UI.md` Mục 4.
- Tên node suy ra quá dài được cắt gọn bằng `…` kèm tiền tố `~` theo `CONFIG.TITLE_MAX_CHARS` (T20).
- Màu sắc node luôn đi kèm biểu tượng và nhãn chữ (INV-11). Node `LOCKED` không phản hồi khi nhấp chuột (T1).
- Cột trái đọc được tên bài lúc mở, kéo xem đủ 20 node, không chồng nhau (T32).

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
- [ ] Mở trình duyệt tại `/dev` thấy 7 node N1–N7 của `shop-api` hiển thị đầy đủ trên canvas ReactFlow ở cột trái.
- [ ] Cột trái có đủ đầu cột và chú giải 4 trạng thái, cảnh báo ⚠, cạnh nét đứt (`docs/spec/30_UI.md` Mục 4).
- [ ] Bấm hoặc nhấn Enter trên node `LOCKED` không có phản hồi và không gửi request (`docs/spec/50_TEST_VA_FIXTURE.md` Mục 6 T1).
- [ ] Lúc mở, đồ thị ở cỡ đọc được quanh bài đang học, kéo xem được hết (T32).
- [ ] Bấm node mở vào được bài, node vào giữa khung; node `LOCKED` không vào được; "Thử lại phân tích" chạy (T35).

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
git add src/components/canvas/FlowEdge.tsx
git commit -m "feat(ui): cạnh đồ thị có chuyển động"
git add src/components/learn/LessonGraphPanel.tsx
git commit -m "feat(ui): cột trái bản đồ bài học"
git add src/app/dev/page.tsx
git commit -m "feat(ui): trang nháp nạp fixture shop-api"
git pull --rebase origin main
git push -u origin d/D03-ban-do
gh pr create --base main --title "D03 — Bản đồ bài học từ fixture" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Mốc H+4: hiện bản đồ từ fixture. Vai A merge khi CI xanh.

## Tiếp theo

→ [D04](D04-monaco.md)
