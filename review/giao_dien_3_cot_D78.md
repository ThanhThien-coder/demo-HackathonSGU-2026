# Giao diện 3 cột (đề xuất D-78) — báo cáo, test tay, chuẩn bị deploy

Ngày làm: 06/11/2026. **Chưa commit.**

> **Cập nhật 06/11/2026:** D-78, D-79 đã ghi vào `docs/spec/00_QUYET_DINH.md`; `docs/spec` đã sửa theo code. Mục 1 và phần "Lệch spec" dưới đây giữ lại làm lịch sử. Việc còn lại: Mục 7.

## 1. Đề xuất D-78 (chưa ghi vào `spec/00_QUYET_DINH.md`)

> **D-78** — `/learn` từ `lg` chia 3 cột kiểu IDE: **trái** "Bản đồ bài học" (đồ thị luôn hiện, không còn ngăn kéo), **giữa** Code (Monaco chỉ đọc), **phải** 2 tab **X-Ray / Feynman** (`active_tab`). Dưới `lg` xếp 1 cột dọc (bản đồ → code → X-Ray/Feynman), không cuộn ngang. Tổng quan kiến trúc vẫn là cửa sổ, mở bằng nút ở thanh trên và **tự mở 1 lần** khi vừa nạp phiên mà chưa chọn bài. Trình chiếu: cột code `CONFIG.UI_PRESENTATION_FOCUS_PCT`, 2 cột còn lại chia đều (đúng chú thích sẵn có của hằng này). Thay bố cục của D-77.

Các mục của spec 30 cần sửa theo:

| Mục | Sửa |
| :-- | :-- |
| Đọc nhanh, sơ đồ | "Ngăn kéo · Đồ thị bài học" ⇒ "Cột trái · Bản đồ bài học"; X-Ray, Feynman là 2 tab cột phải |
| 2.2 | Bố cục 3 cột; bỏ `GraphSidebarButton` |
| 2.3 | Chip framework chuyển sang đầu cột trái (theo ảnh); thanh trên giữ `archetype`, Monorepo/Repo lớn, "Đổi thư mục", đo, token, nút |
| 3 | Bỏ `GraphSidebarButton`, `LessonGraphDrawer` ⇒ `LessonGraphPanel`; X-Ray tách khỏi `CodeSnippetViewer` ⇒ `LearnSidePanel` (tab) |
| 4 | Bỏ chữ "ngăn kéo", bỏ "đóng ngăn kéo" khi bấm node; thêm "đưa node đang mở vào giữa khung" |
| 6 | Câu đầu: "Chưa chọn node ⇒ mở cửa sổ Tổng quan (1 lần khi nạp phiên)"; 6.2 "thu gọn X-Ray khi trả lời" ⇒ "chuyển sang tab Feynman" |
| 11 | "Từ `lg` ⇒ 2 cột" ⇒ "3 cột" |
| Test T35 | "ngăn kéo đóng" ⇒ bỏ |
| File khác | `01`, `04` theo cột "File" của D-77 |

## 2. Đã làm

| File | Việc |
| :-- | :-- |
| `src/components/learn/LearnShell.tsx` | Khung 3 cột / 1 cột; trình chiếu 20/60/20; Tổng quan tự mở 1 lần; màn chưa đăng nhập; **sửa vòng lặp** mở lại phiên lỗi |
| `src/components/learn/LessonGraphPanel.tsx` (mới) | Cột trái: tiêu đề, "{n} node", chip độ tin cậy / ngôn ngữ / framework / Repo tuần tự / che nội dung nhạy cảm / bỏ qua file (popover `skipped`), cảnh báo (đóng được trừ khi `LOW`), đồ thị, chú giải 4 màu + ⚠ + cạnh |
| `src/components/learn/LessonGraphDrawer.tsx` | Xóa (thay bằng Panel) |
| `src/components/canvas/DagCanvas.tsx`, `GraphNodeCard.tsx` | Mở ở cỡ đọc được quanh bài đang học; chọn bài ⇒ đưa node vào giữa; thẻ node mới (vạch màu trạng thái, nhãn trạng thái, n file) |
| `src/components/learn/CodeSnippetViewer.tsx` | Chip bước (số + tầng + tên file, ⚠), dòng đường dẫn · hàm · dòng x–y · Bước k/n, Monaco, chú giải màu, nút Trình chiếu |
| `src/components/code/MonacoPane.tsx` | Theme `simplifey` theo token Mục 11 |
| `src/components/learn/LearnSidePanel.tsx` (mới) | 2 tab X-Ray / Feynman; Feynman tắt + tooltip khi chưa có bản phân tích |
| `src/components/learn/XRayPanel.tsx` | Kiểu mới; nút lớn "Bắt đầu trả lời (n) →" (giữ chữ spec), "Thử lại" khi enrich lỗi |
| `src/components/learn/FeynmanQuestionSection.tsx` | Kiểu mới; Ý bắt buộc ✓/✗ theo lần chấm cuối (UI-54); Báo sai hiện nhưng tắt ở Offline |
| `src/components/learn/CockpitHeader.tsx` | Thanh trên gọn; "Đổi thư mục" bằng hộp thoại (thay `window.prompt`), quét xong cập nhật URL |
| `src/components/layout/Navbar.tsx` | Logo, menu trang, nhãn Offline (tooltip `recorded_from`), ô Persona, tài khoản + bậc |
| `src/components/home/Home.tsx` | Hero, ô link có icon, vùng thả, thẻ Offline + phím tắt; **lớp phủ đang quét có đồng hồ thật** (Mục 2.1); "Thử lại" khi lỗi `retryable`; tô vùng thả khi lỗi cần .zip; thẻ "Đang mở phiên"; Offline vào thẳng `/learn` |
| `src/components/ui/common.tsx` | `LogoMark`, `Kbd` |
| `src/app/globals.css` | Style ReactFlow, thanh cuộn; **sửa node không bấm được** |
| `src/app/roadmap/[courseId]/page.tsx` | **Sửa vòng lặp** mở phiên lỗi, báo lỗi |
| `src/app/auth/callback/route.ts` | **Sửa origin chuyển hướng sau proxy** |
| `src/store/workbench.ts` | Bỏ cờ `drawer_open`; `enterOffline` bật `ui.ingesting` lúc nạp bundle |

### Lỗi thật đã sửa (ngoài đổi kiểu)

1. **Bấm node trên đồ thị không mở bài**: xyflow đặt `pointer-events: none` cho node khi `nodesDraggable=false` và `elementsSelectable=false`, cú bấm rơi xuống lớp nền. Đã bật lại bằng CSS `.sf-flow .react-flow__node`.
2. **Đăng nhập GitHub hỏng sau deploy**: `/auth/callback` chuyển hướng theo `request.url`, mà bản standalone sau proxy mang host nội bộ. Đo ở bản build: `Host: x.a.run.app` ⇒ trước khi sửa ra `https://localhost:3001/learn`, sau khi sửa ra `https://x.a.run.app/learn`. Chống open redirect vẫn giữ (`next=//evil.com` ⇒ `/`).
3. **Gọi ingest lặp vô hạn** khi mở `/learn?session=<id lỗi>` hoặc `/roadmap/<id lỗi>` lúc đã đăng nhập.
4. Bấm "Mở bản demo Offline" ở màn đăng nhập không chuyển sang trang học.

### Đợt 2 — bố cục kiểu VS Code, kéo tỉ lệ, màu và hiệu ứng

| File | Việc |
| :-- | :-- |
| `src/components/learn/layout.ts` (mới) | Store bố cục: ẩn/hiện trái · bảng dưới · phải, tỉ lệ %, giới hạn (cột giữa ≥ 26%), lưu `localStorage["sf.prefs"].layout` |
| `src/components/learn/Splitter.tsx` (mới) | Vạch kéo dọc/ngang: chuột, chạm, phím ← → / ↑ ↓ (2%), bấm đúp hoặc Home ⇒ đặt lại |
| `src/components/learn/LayoutControls.tsx` (mới) | 4 nút như VS Code (Tùy chỉnh bố cục · Bản đồ · Bảng dưới · X-Ray/Feynman), menu có Trình chiếu và "Đặt lại bố cục" |
| `src/components/learn/ProblemsPanel.tsx` (mới) | Bảng dưới cột code: tab "Điểm dở — Nhận định của AI" và "Luồng" (bấm dòng ⇒ nhảy tới bước) |
| `src/components/home/HeroArt.tsx` (mới) | Hình minh họa trang chủ (trang trí): bản đồ nhỏ 4 trạng thái, cạnh chạy chấm |
| `LearnShell.tsx` | Bố cục flex + vạch kéo; phím tắt **Ctrl+B** (bản đồ), **Ctrl+Alt+B** (X-Ray/Feynman), **Ctrl+Alt+J** (bảng dưới); khung ẩn/hiện có hiệu ứng trượt |
| `globals.css`, `common.tsx` và các khung | Nền có quầng sáng nhẹ, khung `.sf-panel`, nút chính vàng chuyển sắc, tab trượt, hộp thoại / menu bật mềm, mục X-Ray hiện lần lượt, thẻ node nổi khi rê chuột, nút "Bắt đầu trả lời" phát sáng. `prefers-reduced-motion` ⇒ tắt hết |

Giữ đúng màu trạng thái INV-11 và nền `--bg`. Trình chiếu vẫn ép 20/60/20 (bỏ qua tỉ lệ đã kéo). Bảng dưới là phần **thêm ngoài spec 30** (đọc lại dữ liệu `analyses` và `trace_steps`, không có cách sửa), mặc định ẩn.

### Đợt 3 — chủ đề sáng / tối, bảng màu mới, cạnh chuyển động

| File | Việc |
| :-- | :-- |
| `src/app/globals.css` | Màu chuyển sang biến CSS theo `html[data-theme]` (`@theme inline`). **Tối "graphite"**: nền `#0b0f16`, khung `#121823`, vàng `#f2aa3c`, xanh `#3fbf7f`, đỏ `#f0565c`, khóa `#5b6578`, tím `#b197f2`, lam `#5aaefc`. **Sáng "giấy"**: nền `#e9edf3` (không trắng tinh), khung `#f6f8fb`, chữ `#1b2432`, màu trạng thái đậm hơn để đủ tương phản. Đổi chủ đề có chuyển màu mềm 0.35 s. `--color-white` trỏ tới `--ink` để các lớp phủ `bg-white/5` dùng được ở cả 2 chủ đề |
| `src/components/ui/theme.ts`, `theme-script.ts` (mới), `layout.tsx`, `Boot.tsx`, `Navbar.tsx` | Nút ☀/☾ trên thanh trên; lưu `sf.prefs.theme`; script gán chủ đề trước khi vẽ ⇒ tải lại không nháy màu |
| `src/components/canvas/FlowEdge.tsx` (mới), `DagCanvas.tsx` | Cạnh có **vệt sáng + chấm chạy** theo hướng học (màu theo nguồn: xanh xong, đỏ chưa đạt, vàng sẵn sàng, xám mờ chạy chậm khi nguồn chưa mở); cạnh nối node đang mở có quầng sáng. Nét gốc giữ luật 30 Mục 4 (liền / đứt, màu theo nguồn), **không** dùng `animated` của xyflow. Đồ thị, Monaco (2 theme), hình minh họa đổi màu theo chủ đề |
| `src/components/home/Home.tsx` | Sửa ô nhập link bị 2 khung viền (viền focus của `input` chồng lên viền khung ngoài) |

**Đợt 4 (thay bảng màu đợt 3):** tối kiểu "nebula" (theo ảnh tham chiếu Dark X) — nền `#09080f`, khung `#12101a`, quầng sáng tím `#7c3aed` / hồng `#db2777` / xanh `#3b64f6` ở mép; **màu nhấn giao diện** (nút chính, tab, focus, thanh kéo, logo, thanh kỹ năng) chuyển sang tím `--accent #8b5cf6` → hồng `--accent-2 #e04fa0`. Sáng kiểu "oải hương" — nền `#e4e2ec`, khung `#efeef5` (không trắng tinh). **Màu trạng thái node giữ nghĩa INV-11** (vàng sẵn sàng, xanh hoàn thành, đỏ chưa đạt, xám chưa mở); bước đang xem trong code vẫn vàng, gợi ý vẫn tím (UI-32). Sửa **viền focus kép**: quy tắc `:focus-visible` toàn cục đưa vào `@layer base` để `outline-none` đè được; ô link dùng lớp `.sf-field` (khung ngoài sáng tím, ô trong không viền) — lỗi này cũng làm ô trả lời Feynman và ô "Đổi thư mục" có viền đôi.

**Đợt 5 — Design System chủ đề sáng kiểu developer tool (Linear / Vercel / GitHub Light):**
- Token sáng: nền `#F8FAFC`, mọi thẻ / khung / cột `#FFFFFF`, nền phụ `#F1F5F9` (header bảng, thanh tiêu đề code, tab chưa chọn), viền `#E2E8F0` (rê ⇒ `#CBD5E1` / tím `#C084FC`), bóng `0 1px 2px rgba(15,23,42,.05)`; chữ chính `#0F172A`, mô tả `#475569`, metadata `#64748B` + monospace (token mới `--subtle`, `--text-2`). Mesh gradient giữ nhưng rất nhạt.
- Màu trạng thái node theo token `--st-*` (nền / viền / chữ): xanh `#F0FDF4/#86EFAC/#15803D`, vàng `#FFFBEB/#FDE68A/#B45309`, đỏ `#FEF2F2/#FECACA/#B91C1C`, xám `#F8FAFC/#CBD5E1/#64748B`; chủ đề tối có bộ tương ứng. Dùng ở thẻ node, nhãn trạng thái Lộ trình, nhãn Đạt / Chưa đạt ở Lịch sử, thẻ số liệu Báo cáo.
- Nút: chính `purple-600 → indigo-600` (rê: 700), **tắt ⇒ `slate-200` / chữ `slate-400` / viền `slate-300`**; phụ nền trắng, viền `slate-300`, chữ `slate-700`. Thanh trên: trắng 85% + blur, tab đang mở `purple-100 / purple-900`.
- Đồ thị: lưới chấm 16px `#CBD5E1`. Feynman: câu hỏi AI dạng bong bóng chat có badge "AI hỏi", ô trả lời trắng có focus `purple-600` + vòng `purple-500/10`; gợi ý, đáp án mẫu, nhận định AI ở Tổng quan là callout viền trái `purple-500` nền `purple-50/50`.
- Trang phụ dựng lại bằng `src/components/ui/Page.tsx` (`PageHeader`, `MetricCard`, `StatusPill`, `EmptyState`): Lịch sử và danh sách phiên là bảng kẻ dòng có hover, Báo cáo có thẻ số liệu (nhãn nhỏ viết hoa trên, số lớn đậm dưới) và bảng tỉ lệ đạt theo kỹ năng, Lộ trình / Cách học cùng kiểu thẻ.

**Lệch spec cần ghi nhận:** 30 Mục 11 và INV-11 ghi cứng `--bg #0F172A` và bộ màu cũ; giờ màu tối đổi sang "graphite" và có thêm chủ đề sáng — cần thêm 1 quyết định (đề xuất **D-79**: "2 chủ đề sáng/tối theo biến CSS; giữ nghĩa 4 màu trạng thái, đổi giá trị màu") nếu muốn spec khớp code.

## 3. Bỏ vì spec 30 không có (chờ bạn quyết)

Ô link + "Tải .zip" trên thanh trên của `/learn` · "Repo mẫu" · nhãn "Lưu tạm trong RAM" · Under the hood · dải số liệu FILE/HÀM/CẠNH GỌI/PHÂN GIẢI/CHU TRÌNH · tua thời gian · chủ đề sáng · phím Ctrl+K · chip "Thử với: Express + Prisma…" · dãy 3 tính năng ở trang chủ · dòng "Code thật của repo · không qua AI" · Fast-Track (D-34) · "Cần ôn lại" / Hao mòn ở chú giải (D-35) · thanh "x/y bài · z%" ở cột trái (bạn chọn theo spec). Nhãn nút X-Ray giữ chữ spec "Bắt đầu trả lời (n)" thay cho "Tôi đã hiểu → Bắt đầu thử thách".

## 4. Đã kiểm / chưa kiểm

**Đã chạy:** `npm run typecheck` ✓ · `npm run lint` ✓ (0 cảnh báo) · `npm test` ✓ 142 passed, 22 skipped (21 test tích hợp cần `TEST_DATABASE_URL`, **chưa chạy lại**) · `npm run build` ✓ · chạy bản standalone (`node .next/standalone/server.js`): `/api/health` 200, đủ 3 header bảo mật, `/api/me` `/api/sessions` `/api/ingest` khi chưa đăng nhập trả `ERR_UNAUTHENTICATED`.

**Đã kiểm trên trình duyệt (Offline, dev và bản production):** đồ thị hiện sẵn · Tổng quan tự mở 1 lần · bấm node mở bài (code + X-Ray) · node LOCKED không làm gì, tooltip "Hoàn thành trước: …" · "Bắt đầu trả lời (2)" chuyển tab Feynman · nộp câu sai ⇒ 35 điểm + gợi ý `CODE_POINTER` + Monaco tô bước 2 vạch tím · nộp lại y hệt ⇒ `ERR_ANSWER_DUPLICATE` · nộp câu đúng ⇒ đáp án 3 phần + chip `DB_OPTIMIZATION: 0.2500 → 0.4202` (khớp T4) · Bỏ qua ⇒ xác nhận ⇒ ❌ + đáp án + "Chưa đạt — các node sau vẫn mở, kèm ⚠" · Trình chiếu 60/20/20, chữ 16px, Esc thoát, nhãn Offline vẫn hiện · Persona `SENIOR_RUSTY` ⇒ 0.4085 "đang mài mòn" (khớp T5) · màn 390px 1 cột, không cuộn ngang.

**Chưa kiểm:** mọi luồng **online** cần đăng nhập GitHub (quét repo thật, phân tích AI, Báo sai online, Lịch sử, Báo cáo, Xóa tài khoản) · bàn phím đầy đủ (T29) · `prefers-reduced-motion` · đồ thị 20 node ở 1366×768 (T32: bundle Offline chỉ có 3 node).

## 5. Test tay ngày mai

### Offline (không cần mạng)

1. `npm run dev` ⇒ http://localhost:3000 ⇒ "Mở bản demo Offline" (hoặc `Ctrl+Shift+D`).
2. Đóng Tổng quan ⇒ bấm **List Products** ⇒ "Bắt đầu trả lời (2)".
3. Câu 1 (DB_OPTIMIZATION): nộp `Vì có 200 sản phẩm nên dữ liệu nhiều.` ⇒ gợi ý + vạch tím bước 2; nộp lại y hệt ⇒ báo trùng; nộp `Vì code hỏi cơ sở dữ liệu thêm một lần cho mỗi sản phẩm, nên càng nhiều sản phẩm càng nhiều lần hỏi.` ⇒ đạt, đáp án, chip điểm.
4. Câu 2 (LAYERED_SEPARATION): đúng = `Dữ liệu đi từ route qua service xuống repo, nên khi đổi nơi lưu chỉ tầng repo phải sửa.` · hoặc "Bỏ qua câu này".
5. **User Profile**: câu 1 đúng = `Khóa nằm thẳng trong mã nguồn, nên nếu lộ mã nguồn thì kẻ xấu tự ký token giả được.` · câu 2 đúng = `Middleware xác thực chạy trước hàm xử lý chính, nếu đổi thứ tự thì hàm chính chạy khi chưa xác thực.` ⇒ **Order Checkout** mở khóa.
6. **Order Checkout** (3 câu): `Các lệnh ghi chạy riêng, không nằm trong một giao dịch, nên lỗi ở bước cuối để lại tồn kho đã bị trừ mà không có đơn.` · `Mỗi mặt hàng gọi cơ sở dữ liệu trong vòng lặp, nên số truy vấn tăng theo số mặt hàng.` · `Dùng POST vì thao tác tạo đơn mới, và có middleware xác thực để chỉ người đăng nhập đặt hàng.`
7. Gõ câu ngoài kịch bản ⇒ "Chế độ offline chỉ chấm được câu trả lời trong kịch bản" (T19). Đổi Persona ở thanh trên; Trình chiếu; thu hẹp cửa sổ.

### Online (cần `.env.local` đủ biến)

T1 node khóa · T2 trượt 3 lần ⇒ đỏ + Báo sai · T12 Báo sai · T13 bấm ngay node chưa phân tích (Network: chỉ node đó + 1–2 node kế tiếp, ≤ 3 song song) · T16 hai tab · T25 hết quota · T26 link sai / private / zip > 4.5 MB / link `/tree/…` · T28 tải lại giữa chừng · T30 "Học lại từ đầu" · T31 đăng nhập / đăng xuất · T33–T34 Tổng quan · "Đổi thư mục" với repo monorepo.

## 6. Chuẩn bị deploy (Cloud Run, theo `Dockerfile` sẵn có)

- **Build arg** (ghi cứng vào bundle): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEMO_MODE` (`true` nếu muốn hiện Persona).
- **Biến runtime** (Cloud Run, Secret Manager): `DATABASE_URL`, `GEMINI_API_KEY` (hoặc `GOOGLE_CLOUD_PROJECT` + `GEMINI_BACKEND=vertex`), `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN` (tùy chọn, cho tải chọn lọc repo lớn), `DEMO_MODE=true` (bật `/api/demo/persona`, phải đi cùng `NEXT_PUBLIC_DEMO_MODE`), `AI_DISABLED` (khóa khẩn cấp), `LOG_LEVEL`.
- **Supabase → Authentication → URL Configuration:** thêm `https://<domain-cloud-run>/auth/callback` vào Redirect URLs, đặt Site URL = domain đó. GitHub OAuth app trỏ callback về Supabase như cũ.
- Lệnh mẫu:

```bash
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... --build-arg NEXT_PUBLIC_DEMO_MODE=true -t simplifey .
```

```bash
docker run --rm -p 8080:8080 --env-file .env.local -e DEMO_MODE=true simplifey
```

## 7. Lệch còn lại, cần sửa code hoặc quyết định

Đối chiếu code với spec ngày 06/11/2026, có bấm thử bản Offline bằng trình duyệt. Luồng online chưa bấm thử.

| # | Vấn đề | Bằng chứng | Hướng xử lý |
| :-: | :-- | :-- | :-- |
| 1 | Trình chiếu làm cột phải tràn mép màn hình, nút "Bỏ qua câu này" bị cắt | Màn 1440: cột phải đo được 1147–1467. `LearnShell` đặt `lg:min-w-[320px]` trong khi 20% chỉ khoảng 285px. T41 sẽ trượt | Sửa code |
| 2 | Tải lại trang thì mất nút "Báo sai" của node đã xong, và `RunReadOnly` không hiện "Ý bắt buộc" | `maybeEnrich` không gọi lại khi run đã xong, nên `runs[id]` rỗng. D-22 không giới hạn việc này | Sửa code hoặc chốt giới hạn |
| 3 | `/roadmap/[courseId]` không có đường vào, `/report` không vào được từ danh sách phiên | `SessionList` chỉ dẫn tới `/learn` và `/history` | Thêm link hoặc bỏ trang |
| 4 | `/roadmap` ở Offline trắng trang | `auth` là `user` nhưng `SessionList` trả `null` khi Offline | Thêm `EmptyState` |
| 5 | Lỗi `ERR_DEMO_MODE_DISABLED` chỉ có toast, ô Persona vẫn hiện | `changePersona` trong `workbench.ts` | Ẩn ô nếu muốn đúng ý cũ |
| 6 | Bundle Offline là bản viết tay 3 node, trong khi kịch bản demo nói "ghi lại từ một lần chạy thật" | `recorded_from.model` = "viết tay — chưa ghi từ Gemini" | Ghi lại bundle thật, hoặc đổi câu nói |
| 7 | `scripts/review-run.ts`, `scripts/record-bundle.ts` chưa có, nên số đo ở `ket_qua_duyet.md` chưa có căn cứ | Không có thư mục `scripts/`. `loi_da_gap.md` vẫn ghi "chưa chạy" | Chạy duyệt thật hoặc gỡ số |
| 8 | Gói `lottie-react`, `class-variance-authority` khai trong `package.json` nhưng không dùng | Không file nào trong `src/` import | Gỡ nếu không cần |
| 9 | Lỗi đặt câu hỏi (`enrich-node`) hiện nhầm chữ của chấm bài | `questions.ts` trả `ERR_AI_UNAVAILABLE`, `messages.ts` chỉ có 1 câu "AI chấm bài đang bận — bài chưa được chấm, không tính lượt." `30` Mục 10 yêu cầu câu riêng cho đặt câu hỏi và phân tích | Sửa code |
| 10 | Chú thích trong code còn chữ cũ: "đề xuất D-78", "CodePane", "ô vàng" | `LearnShell.tsx`, `layout.ts`, `MonacoPane.tsx`, `common.tsx` | Sửa khi tiện |
