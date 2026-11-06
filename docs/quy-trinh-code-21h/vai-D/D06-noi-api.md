# D06 — Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1

Làm xong phiếu này, người học có thể đăng nhập GitHub, dán link repo hoặc tải file zip từ trang chủ, chuyển tiếp vào lộ trình tổng quan và màn hình học tập được nối API thật đạt mốc Lát dọc 1.

| Mục | Nội dung |
| :-- | :-- |
| Giờ | 18:30–20:00 (H+6.5 → H+8) · **Lát dọc 1 lúc 20:00** |
| Nhánh | `d/D06-noi-api` |
| Cần có trước | A04, A05, A06; A07 (`analyze-node`, xong 20:00; trong lúc chờ thì phần X-Ray dùng fixture) |
| Mở đường cho | Lát dọc 1, E06 |
| Cách làm | agy viết file · Claude kiểm · bạn kiểm và commit |

**Cách nhanh:** nhắn AI `Làm phiếu D06`, xem [`lam-phieu.md`](../lam-phieu.md). Các bước dưới là cách làm tay.

## Bước 0 — Chuẩn bị (bạn tự gõ)

```powershell
git checkout main; git pull; npm ci; git checkout -b d/D06-noi-api
```

## Bước 1 — Tạo task (dán cho Claude)

```text
Dùng skill tao-task để tạo task tên "D06 — Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1". Nội dung đã chốt sẵn dưới đây: chép đúng vào các mục của task, không thêm bớt, không tự đổi quyết định. Tạo xong thì đưa tôi duyệt, CHƯA giao cho ai làm.

Trước khi tạo task: kiểm các phiếu cần có trước đã có trên nhánh hiện tại (cách kiểm ở `.kb/phieu-can-co.md`). Phiếu này cần: A04, A05, A06; A07 (`analyze-node`, xong 20:00; trong lúc chờ thì phần X-Ray dùng fixture). Thiếu phiếu nào thì DỪNG, báo tôi thiếu gì và đó là việc của vai nào. KHÔNG tự làm thay, KHÔNG tạo task.

## Được đọc
- `.kb/README.md`
- `docs/spec/30_UI.md` Mục 2, 2.1, 2.2, 2.3, 7.2, 7.3, 7.4
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: T13, T14, T26, T28, T30, T31
- `docs/spec/02_CONTRACTS.md` Mục 1, 8, 10
- `docs/spec/50_TEST_VA_FIXTURE.md` Mục 3.4
- `docs/spec/00_QUYET_DINH.md` D-27, D-38, D-46, D-78
- `package.json`
- `src/`

## Được ghi
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/`
- `src/app/register/`
- `src/app/roadmap/`
- `src/app/learn/page.tsx`
- `src/components/home/`
- `src/components/layout/Boot.tsx`
- `src/components/ui/Page.tsx`
- `src/components/learn/LearnShell.tsx`
- `src/components/learn/CockpitHeader.tsx`
- `src/store/workbench.ts`

## Việc cần làm
1. Dùng skill doc-spec đọc đúng các mục ở Được đọc.
2. Viết màn hình đăng nhập `src/app/login/`, `src/app/register/` (chuyển sang `/login`) và `LoginScreen` trong `src/components/home/Home.tsx` hỗ trợ đăng nhập GitHub qua Supabase Auth, truyền tham số `next` cho `/auth/callback` chuyển hướng đúng sau khi đăng nhập, kèm thẻ "Bản demo Offline". Không dựa vào `?error=auth_failed`. Không có token hay đường tắt bỏ qua đăng nhập.
3. Viết trang chủ `src/app/page.tsx` dùng `src/components/home/Home.tsx`, `SessionList.tsx`: ô nhập link GitHub (ô rỗng ⇒ nút tắt, chỉ nhận link gốc repo D-38, có ghi chú "Chỉ hỗ trợ nhánh mặc định."), vùng thả .zip (≤ `CONFIG.MAX_UPLOAD_BYTES`), `IngestOverlay` có đồng hồ thật, danh sách phiên trước để "Học tiếp" hoặc "Học lại từ đầu" (T30: gọi `POST /api/ingest` với `restart: true`).
4. Viết `src/components/ui/Page.tsx` (`PageHeader`, `MetricCard`, `StatusPill`, `EmptyState`) và trang `src/app/roadmap/`: `/roadmap` là danh sách phiên học, `/roadmap/[courseId]` là danh sách bài của một phiên theo tô-pô (`StatusPill`, "Mở bài").
5. Viết trang học tập `src/app/learn/page.tsx` dùng `src/components/learn/LearnShell.tsx`: từ `lg` trang cao đúng màn hình, 3 cột tự cuộn: trái `LessonGraphPanel`, giữa `CodeSnippetViewer` + `ProblemsPanel`, phải `LearnSidePanel`; nhỏ hơn `lg` 1 cột theo thứ tự bản đồ → code → bảng dưới → X-Ray / Feynman (`docs/spec/30_UI.md` Mục 2.2). Ẩn/hiện khung và kéo tỉ lệ làm ở D09. Viết thanh trên `src/components/learn/CockpitHeader.tsx` theo Mục 2.3, có "Tổng quan kiến trúc", chip "Repo lớn", Monorepo và hộp thoại "Đổi thư mục phân tích" (`subdir_override`). Quét repo xong chuyển hướng vào `/learn?session=<id>`, tự mở cửa sổ Tổng quan (`ui.overview_open`), đặt `active_node_id = null`. Nếu thiếu tham số `session` thì tự chuyển về `/roadmap`, trừ khi có cờ `?offline=1`.
6. Viết hàng đợi phân tích D-46 trong `src/store/workbench.ts`: chỉ gọi `analyze-node` cho node đang mở và 1–2 node kế tiếp theo thứ tự tô-pô, tối đa `CONFIG.ANALYZE_CONCURRENCY` đồng thời. Xử lý các ca T14 (nút "Thử lại phân tích"), T28 (mở lại phiên giữa chừng vẫn đúng lượt và cùng `run_id`).
7. State dùng chung giữa bản đồ, code và Feynman đặt trong `src/store/workbench.ts`, không nhân bản bằng `useState` trong page.
8. Viết `src/components/layout/Boot.tsx` chạy 1 lần cho cả app theo `docs/spec/30_UI.md` Mục 7.2, gắn vào `src/app/layout.tsx`.
9. Dùng skill kiem-contract so code với `docs/spec/02_CONTRACTS.md`.


**Bắt buộc theo bản chạy thử** (chi tiết lỗi ở `docs/quy-trinh-code-21h/loi-can-sua.md`):
- **Đổi phiên (lỗi D-11):** store khác `sessionId` thì gọi `resetSession()` trước khi tải, đang tải hiện màn chờ.
- **Tiến độ (lỗi D-09):** không dùng chữ "cần ôn" (D-35). Hiện rõ số bài đã học và số bài chưa đạt.
- **Thanh trên (lỗi D-14, B-16):** không có thanh cuộn, nút không dạt lệch, dùng chung một kiểu nút. `ref_label` rỗng ⇒ `repo_name · @ sha7`.
- **Hai thẻ repo (lỗi D-10):** thẻ phiên hiện thêm mã commit hoặc ngày tạo.
- **Số đo:** dùng "Đã che {n} nội dung nhạy cảm", không dùng "Khóa bí mật đã che", vì số này đếm cả email.

## Tiêu chí xong
- Lệnh kiểm: `npx tsc --noEmit && npm run build`
- Đăng nhập GitHub hoạt động chuẩn xác, truyền `next` cho callback auth.
- Quét xong vào `/learn?session=<id>`, cửa sổ Tổng quan tự mở với `active_node_id = null`; đóng lại thì cột giữa và cột phải nhắc chọn node.
- Từ `lg` thấy đủ 3 cột, mỗi cột cuộn riêng; nhỏ hơn `lg` còn 1 cột, không cuộn ngang.
- Thiếu `session` thì tự chuyển về `/roadmap` (ngoại lệ `?offline=1`).
- Hàng đợi phân tích D-46 chỉ gửi tối đa 1–2 node kế tiếp (T13). Thử lại phân tích khi lỗi (T14).
- Không tạo mock trong route hoặc store giả phía server; API lỗi thì hiển thị thông báo lỗi.

## Cấm
- Không sửa file ngoài mục Được ghi, không đọc `.env*`.
- Không sửa `src/server/`, `src/app/api/`, `src/app/auth/`, `src/contracts/*`.
- Không tự đặt con số: hằng số lấy từ `CONFIG`, số kỳ vọng trong test lấy đúng từ spec.
- Không chép nguyên khối code dài từ spec.
- Không chạy `git add`, `git commit`, `git push`, `ak xong`. Không tự ghi trạng thái `xong`.
- Không commit file làm việc của agent (`.agents/`, prompt nháp) và ảnh không dùng.
```

Đọc task Claude tạo, thấy khớp với phiếu này thì sang Bước 2.

## Bước 2 — Giao agy và kiểm (dán cho Claude)

```text
Dùng skill giao-task-agy giao task "D06 — Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1" vừa tạo cho agy. Khi agy xong, dùng skill kiem-task để kiểm: đọc báo cáo, chạy lệnh kiểm trong Tiêu chí xong, đọc git diff, so từng tiêu chí. KHÔNG chạy `ak xong`, KHÔNG `git add`, KHÔNG commit, KHÔNG push, kể cả khi đạt. Chỉ báo lại cho tôi: kết quả lệnh kiểm (dán nguyên), danh sách file đã đổi, từng tiêu chí đạt hay chưa, điều chưa chắc.
```

agy chạy quá 30 phút chưa xong ⇒ nhắn Claude dừng, chia task theo các nhóm commit ở Bước 4, giao lại từng phần.

## Bước 3 — Bạn kiểm: thế nào là xong

- [ ] Claude báo lệnh kiểm xanh, và bạn tự chạy lại `npx tsc --noEmit && npm run build` cũng xanh.
- [ ] `git status` chỉ có các file ở mục Được ghi.
- [ ] Người chạy tay: dán link repo demo ⇒ nạp bản đồ thành công, cửa sổ Tổng quan tự mở ⇒ đóng cửa sổ, bấm node ⇒ hiện code ở cột giữa, tab X-Ray ở cột phải với dữ liệu phân tích thật.
- [ ] DevTools (Network): chỉ gửi yêu cầu `analyze-node` cho node đang mở và 1–2 node kế tiếp (D-46, `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6 T13).
- [ ] Thử T31 ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: chưa đăng nhập mở `/` thấy màn hình "Đăng nhập GitHub"; đăng xuất thì quay về màn hình đó.
- [ ] Thử T14, T28, T30 ở `docs/spec/50_TEST_VA_FIXTURE.md` Mục 6: node phân tích lỗi có nút "Thử lại phân tích"; tải lại trang giữa chừng vẫn đúng lượt; "Học lại từ đầu" ra phiên mới.
- [ ] Mở phiên A, về Lộ trình, mở phiên B: không thấy bài của A.
- [ ] Ở 1366px và 1920px, thấy đủ 3 cột; thanh trên không có thanh cuộn, nút không dạt lệch.

```text
Task "D06 — Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1" chưa đạt: <ghi lỗi bạn thấy>. Chạy `ak lai` cho task đó với lý do trên, rồi làm lại đúng như Bước 2 của phiếu này (không commit).
```

Làm lại tối đa 1 lần; vẫn sai thì dán cho Claude: "Sửa trực tiếp các lỗi trên trong đúng các file ở Được ghi, chạy lại lệnh kiểm, KHÔNG commit", hoặc tự sửa. **Đạt hết các ô** thì bạn tự gõ `ak xong TASK_<số task Claude đã tạo>`.

## Bước 4 — Commit và PR (bạn tự gõ)

```powershell
git add src/app/login/ src/app/register/ src/app/page.tsx src/components/home/
git commit -m "feat(ui): trang chủ và đăng nhập qua supabase"
git add src/app/roadmap/ src/components/ui/Page.tsx
git commit -m "feat(ui): trang lộ trình học tập"
git add src/app/layout.tsx src/components/layout/Boot.tsx
git commit -m "feat(ui): khởi động app"
git add src/app/learn/ src/components/learn/LearnShell.tsx src/components/learn/CockpitHeader.tsx src/store/workbench.ts
git commit -m "feat(ui): trang học 3 cột nối api lát dọc 1 và hàng đợi phân tích"
git pull --rebase origin main
git push -u origin d/D06-noi-api
gh pr create --base main --title "D06 — Trang chủ, đăng nhập, lộ trình, nối API lát dọc 1" --body "Closes #<số Issue>"
```

Báo cả nhóm hoàn thành Lát dọc 1. Vai A merge khi CI xanh.

## Tiếp theo

→ [D07](D07-feynman.md)
