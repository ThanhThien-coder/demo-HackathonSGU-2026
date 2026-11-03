# D06 — Màn hình đầu, đăng nhập, nối API lát dọc 1

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 18:30–20:00 (H+6.5 → H+8) · **Lát dọc 1 lúc 20:00** |
| Nhánh | `d/D06-noi-api` |
| Cần có trước | A04, A05, A06; A07 (`analyze-node`, xong 20:00; trong lúc chờ thì Tab 1 dùng fixture) |
| Mở đường cho | Lát dọc 1, E06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D06-noi-api
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D06 — Màn hình đầu, đăng nhập, nối API lát dọc 1". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

## Được đọc
- `.kb/README.md`
- `.kb/spec/30_UI.md` Mục 2.1, 2.3, 7.2, 7.3, 7.4, Test bắt buộc T13, T26, T31, T14, T28, T30
- `.kb/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `.kb/spec/50_TEST_VA_FIXTURE.md` Mục 3.4
- `.kb/spec/00_QUYET_DINH.md` D-27, D-38, D-46
- `package.json`
- `src/`

## Được ghi
- `src/components/landing/Landing.tsx`
- `src/components/landing/RepoInput.tsx`
- `src/components/landing/ZipDropzone.tsx`
- `src/components/landing/ResumeList.tsx`
- `src/components/landing/IngestOverlay.tsx`
- `src/components/header/AppHeader.tsx`
- `src/app/page.tsx`
- `src/store/workbench.ts`
- `src/components/cockpit/XRayTab.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết màn hình đầu `Landing.tsx`, nút đăng nhập GitHub, ô link `RepoInput.tsx` (chặn ô rỗng, chỉ nhận link gốc repo D-38), vùng thả .zip `ZipDropzone.tsx` (kiểm cỡ ≤ `CONFIG.MAX_UPLOAD_BYTES`, sai dạng báo lỗi UI-11), danh sách phiên `ResumeList.tsx`, và lớp phủ `IngestOverlay.tsx` (`.kb/spec/30_UI.md` Mục 2.1).
3. Hiện thực khởi động app trong `src/app/page.tsx`, kiểm tra auth, gọi `GET /api/me`, `GET /api/sessions`, "Tiếp tục học", và header `AppHeader.tsx` (`.kb/spec/30_UI.md` Mục 7.2).
4. Viết hàng đợi phân tích trong `src/store/workbench.ts` (D-46, `CONFIG.ANALYZE_CONCURRENCY`), xử lý sự kiện bấm node chuyển `active_node_id` và ưu tiên phân tích (`.kb/spec/30_UI.md` Mục 7.3, 7.4, UI-73, UI-74).
5. Xử lý các ca của `.kb/spec/30_UI.md` Test bắt buộc: T14 (node `analysis_failed` hiện nút "Thử lại phân tích" trong `XRayTab.tsx`), T28 (tải lại trang tự mở lại phiên, bấm node nhận cùng `run_id`), T30 ("Học lại từ đầu" gọi `POST /api/ingest` với `restart: true`).
6. Dùng skill kiem-contract so code với `.kb/spec/02_CONTRACTS.md`.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`

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
Dùng skill giao-task-agy giao task "D06 — Màn hình đầu, đăng nhập, nối API lát dọc 1" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Người chạy tay: dán link repo demo ⇒ nạp bản đồ thành công ⇒ bấm node ⇒ Tab 1 hiển thị dữ liệu phân tích thật.
- [ ] DevTools (Network): chỉ gửi yêu cầu `analyze-node` cho node đang mở và 1–2 node kế tiếp (D-46, `.kb/spec/30_UI.md` T13).
- [ ] Thử T31 của `.kb/spec/30_UI.md`: chưa đăng nhập mở `/` thấy màn hình "Đăng nhập GitHub"; đăng xuất thì quay về màn hình đó.

- [ ] Thử T14, T28, T30 của `.kb/spec/30_UI.md`: node phân tích lỗi có nút "Thử lại phân tích"; tải lại trang giữa chừng vẫn đúng lượt; "Học lại từ đầu" ra phiên mới.
```text
Task "D06 — Màn hình đầu, đăng nhập, nối API lát dọc 1" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/components/landing/Landing.tsx src/components/landing/RepoInput.tsx src/components/landing/ZipDropzone.tsx src/components/landing/ResumeList.tsx src/components/landing/IngestOverlay.tsx
git commit -m "feat(ui): màn hình đầu, đăng nhập"
git add src/components/header/AppHeader.tsx src/app/page.tsx src/store/workbench.ts
git commit -m "feat(ui): khởi động, tiếp tục học, hàng đợi phân tích, bấm node"
git add src/components/cockpit/XRayTab.tsx
git commit -m "feat(ui): thử lại phân tích"
git pull --rebase origin main
git push -u origin d/D06-noi-api
gh pr create --base main --title "D06 — Màn hình đầu, đăng nhập, nối API lát dọc 1" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Lát dọc 1. Vai A merge khi CI xanh.

## Tiếp theo

→ [D07](D07-tab2.md)
