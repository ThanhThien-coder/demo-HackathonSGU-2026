# D09 — Trang phụ, menu, trình chiếu

Làm xong phiếu này, website có thêm màn hình lịch sử học tập, báo cáo kết quả, menu cài đặt tài khoản và chọn persona, cùng chế độ trình chiếu demo phóng to màn hình chuyên nghiệp.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 00:30–03:00 (H+12.5 → H+15) |
| Nhánh | `d/D09-phu` |
| Cần có trước | D08 |
| Mở đường cho | D10 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D09`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

Làm Bước 0–2 trước khi đi ngủ (khoảng 00:00–00:30):

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D09-phu
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D09 — Trang phụ, menu, trình chiếu". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: D08. Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 2.1, 2.2, 2.3, 6.2, 9, 11, Test bắt buộc T29, T12
- `docs/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `docs/spec/00_QUYET_DINH.md` D-22
- `docs/doc-de-hieu/07_ke_hoach_21h.md` Mục 3
- `package.json`
- `src/`

## Được ghi
- `src/app/history/`
- `src/app/report/`
- `src/app/how-it-works/`
- `src/components/how-it-works/`
- `src/components/home/`
- `public/assets/`
- `src/components/layout/SettingsDropdown.tsx`
- `src/app/learn/components/ReportWrongDialog.tsx`
- `src/app/learn/components/CockpitHeader.tsx`
- `src/app/globals.css`
- `src/store/workbench.ts`
- `src/app/learn/page.tsx`
- `src/app/learn/components/CodeSnippetViewer.tsx`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Thực hiện nghiêm túc theo thứ tự ưu tiên:
   - Ưu tiên 1: Viết màn hình lịch sử `src/app/history/` và báo cáo `src/app/report/` (`docs/spec/30_UI.md` Mục 2.1).
   - Ưu tiên 2: Viết menu cài đặt tài khoản và chọn persona trong `src/components/layout/SettingsDropdown.tsx`, đồng hồ token trên `src/app/learn/components/CockpitHeader.tsx`.
   - Ưu tiên 3: Viết hộp thoại "Báo sai" `src/app/learn/components/ReportWrongDialog.tsx` (`docs/spec/30_UI.md` Mục 6.2, D-22). Sau khi gửi báo sai, gọi lại `GET /api/sessions/{id}/progress` và cập nhật màu node (T12).
   - Ưu tiên 4: Hiện thực hỗ trợ responsive di động, hiệu ứng chuyển động giảm thiểu `prefers-reduced-motion` trong `src/app/globals.css`, và chế độ trình chiếu phóng to khung đang xem theo `CONFIG.UI_PRESENTATION_FOCUS_PCT` và `CONFIG.UI_PRESENTATION_FONT_SCALE` (`docs/spec/30_UI.md` Mục 2.2, 11).
   - Ưu tiên 5 (cắt được khi thiếu giờ): Trang trí trang chủ `src/components/home/`, trang giới thiệu cách hoạt động `src/app/how-it-works/`, `src/components/how-it-works/`, và hình ảnh trong `public/assets/`.
3. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Báo sai (lỗi D-15):** `handleReportWrongSubmit` lấy `run_id` từ `runs[nodeId]`, thiếu thì lấy `progress.nodes[id].last_run.run_id`. Bản cũ `return` im lặng với node đã xong mở lại sau khi tải trang. `applyQuestionState` và `evalKey` cũng phải chạy với `last_run`. Không tìm được run thì báo lỗi.
- Cửa sổ Báo sai: bỏ chữ "(D-22)", "BKT", đổi "hoàn lại ngay lập tức" thành hoàn lại nếu điểm chưa bị câu khác đổi (BKT-63), xóa ô lý do sau khi gửi. `skill_change = null` thì báo rõ.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Các màn hình lịch sử, báo cáo hiển thị chuẩn xác dữ liệu từ store / API.
- Hộp thoại Báo sai gọi cập nhật progress và đổi trạng thái câu thành cờ 🚩 (T12).
- Chế độ trình chiếu phóng to đúng tỷ lệ theo hằng số cấu hình.
- Chỉ được đụng các file của D01–D08 có tên trong mục Được ghi.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không người canh lúc đêm: bước nào quá 30 phút thì dừng bước đó, ghi báo cáo, sang bước sau. Mọi phần trang trí ở đây cắt được theo kế hoạch 21h khi trễ giờ.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D09 — Trang phụ, menu, trình chiếu" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần. Bạn đi ngủ từ 00:30 đến 03:00, để agy tự chạy.

## Bước 3 — Bạn kiểm: thế nào là xong

Làm Bước 3 khi bạn thức dậy lúc 03:00:

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Thử nghiệm T29: điều hướng bằng bàn phím (Tab/Enter) chuyển focus chính xác và viền focus luôn nhìn thấy rõ.
- [ ] Bật `prefers-reduced-motion` trong cài đặt hệ thống hoặc trình duyệt: các hiệu ứng chuyển động tắt hoàn toàn.
- [ ] Thử T12 của `docs/spec/30_UI.md`: báo sai một câu thấy cờ 🚩, có request `progress`, màu node cập nhật.
- [ ] Tải lại trang, mở node `FAILED`, gửi báo sai: có `POST /api/report-wrong`, có toast, cửa sổ đóng, câu có 🚩. Báo sai hết câu `FAILED` thì node thành `COMPLETED`.

```text
Task "D09 — Trang phụ, menu, trình chiếu" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/history/ src/app/report/
git commit -m "feat(ui): màn hình lịch sử và báo cáo học tập"
git add src/components/layout/SettingsDropdown.tsx src/app/learn/components/CockpitHeader.tsx
git commit -m "feat(ui): menu cài đặt, chọn persona và đồng hồ token"
git add src/app/learn/components/ReportWrongDialog.tsx
git commit -m "feat(ui): hộp thoại báo sai và cập nhật tiến độ"
git add src/app/globals.css src/store/workbench.ts src/app/learn/page.tsx src/app/learn/components/CodeSnippetViewer.tsx
git commit -m "feat(ui): responsive di động và chế độ trình chiếu"
git add src/app/how-it-works/ src/components/how-it-works/ src/components/home/ public/assets/
git commit -m "feat(ui): trang trí trang chủ và trang how-it-works"
git pull --rebase origin main
git push -u origin d/D09-phu
gh pr create --base main --title "D09 — Trang phụ, menu, trình chiếu" --body "Closes #<số Issue>"
```

Báo Vai A review và merge sau khi thức dậy lúc 03:00. Vai A merge khi CI xanh.

## Tiếp theo

→ [D10](D10-hoan-thien.md)
