# 01 — Kiểm kê tính năng và cắt râu ria

> Nguồn: `docs/spec/*`, `docs/doc-de-hieu/07_ke_hoach_21h.md` Mục 3, code của repo tập `demo-HackathonSGU-2026` (chỉ đọc), `review/loi_da_gap.md`.
> Cột "File backend repo tập" là **tên file để bám cấu trúc**, không phải để chép. Đường dẫn trong cột này là đường dẫn **ở repo tập** (UI của repo tập nằm trong `src/app/learn/components/`). Đường dẫn ở repo thi lấy theo mục "File được sửa" của từng phiếu (UI theo `spec/30`: `src/components/learn/`). Trong giờ thi, code được viết mới theo mô tả trong phiếu và spec.
> Độ khó: **D** dễ (≤ 1 lượt agent 30–45 phút) · **V** vừa (2–3 lượt) · **K** khó (≥ 4 lượt, dễ sai). Đây là ước tính, chưa đo.

## 1. Luật chọn

- **Giữ:** giám khảo thấy được trong 5 phút demo (`pitch/KICH_BAN_DEMO.md` Mục 2), hoặc có trong danh sách không bao giờ cắt.
- **Tối giản:** cần có để luồng chính chạy, nhưng chỉ làm đường thẳng: không xử lý ca hiếm, không có màn hình riêng.
- **Cắt:** giám khảo khó thấy, hoặc đã có trong thứ tự cắt của `07_ke_hoach_21h.md` Mục 3. Cắt nghĩa là **không code trong giờ thi**. Nếu còn nút thì ẩn nút.

**Danh sách không bao giờ cắt** (lấy từ `07_ke_hoach_21h.md` Mục 3, thêm 3 mục do thể lệ và mục tiêu chấm): bản đồ tất định · phần X-Ray · câu hỏi + chấm + gợi ý · BKT ở server · offline mode · cổng gác · đăng nhập GitHub · bản chạy trên Cloud Run · cả 5 người đều có commit.

## 2. Nhóm A — tính năng giữ lại

| Mã | Tính năng | Quyết định | Độ khó | Bẫy đã gặp ở bản tập | Phụ thuộc | File backend repo tập (bám tên) | Người |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| A01 | Đăng nhập GitHub qua Supabase (D-44) | Giữ | V | Site URL còn `localhost`; sau proxy Cloud Run `request.url` mang host nội bộ, phải dùng `x-forwarded-host` (`01_deploy.md` Mục 4.4) | Supabase OAuth App làm trước giờ thi | `src/server/auth.ts`, `src/lib/supabase/client.ts`, `src/app/auth/callback/route.ts` | Thiện |
| A02 | Dán link → tải zip trong RAM (Tầng 0) | Giữ | V | 3 giả định codeload phải kiểm ở H+1 (`doc-de-hieu/07_ke_hoach_21h.md` Mục 2); GitHub trả 429 khi thử repo lớn (E06-09) | contracts engine | `src/server/engine/ingest/url.ts`, `probe.ts`, `download.ts` | Thiện |
| A03 | Giải nén, lọc rác, che secret, chọn ≤ `CONFIG.MAX_CLEAN_FILES` file | Giữ | V | File test thành bài Capstone (E06-12); thư mục `__MACOSX`; tên file hoa thường; tỉ lệ nén (zip bomb) | A02 | `ingest/unzip.ts`, `prune.ts`, `secrets.ts`, `priority.ts`, `ingest/index.ts` | Thiện |
| A04 | Kéo thả `.zip` ≤ `CONFIG.MAX_UPLOAD_BYTES` | Giữ | D | Kiểm cỡ ở client trước khi gửi | A03 | `src/app/api/ingest/route.ts` (multipart `archive`) | Thiện (server), Phát (UI) |
| A05 | Vân tay tối giản: ngôn ngữ chính, framework | **Tối giản** | D | File repo tập dài 1.154 dòng, phần lớn không hiện trên UI | A03 | `ingest/fingerprint.ts` (chỉ giữ `language_breakdown`, `detected_framework`) | Thiện |
| A06 | Parser Tree-sitter WASM (TS, TSX, JS, Java) | Giữ | V | Lệch ABI grammar (D-32); quên `serverExternalPackages: ["web-tree-sitter"]`; quên `outputFileTracingIncludes` cho `.wasm` và `queries/*.scm` (D-70) | grammar `.wasm` tải từ bản phát hành chính thức | `src/server/engine/graph/parser.ts`, `registry.ts`, `queries/*.scm` | Minh |
| A07 | Danh bạ tên, resolver TS/JS | Giữ | K | Import qua barrel, alias trong `tsconfig` | A06 | `graph/symbols.ts`, `graph/resolvers/ts_js.ts`, `engine/jsonc.ts` | Minh |
| A08 | Đồ thị gọi hàm, điểm entry Express/Nest/Next | Giữ | K | — | A07 | `graph/callgraph.ts`, `graph/whitelist.ts` | Minh |
| A09 | Lát cắt và node (`trace_steps`, `snippet`, `snippet_line_map`, `dto_snippet`) | Giữ | K | Node 0 bước (E06-11); bước `<module>` | A08 | `graph/slicing.ts`, `graph/nodes.ts` | Minh |
| A10 | Khử chu trình, xếp hạng, giữ ≤ `CONFIG.DISPLAY_MAX_NODES` bài (D-88) | Giữ | V | — | A09 | `graph/tarjan.ts`, `graph/pagerank.ts`, `graph/index.ts` | Minh |
| A11 | Nhóm bài, cạnh phụ thuộc (D-84, D-85) | **Tối giản**: thực thể lấy theo đoạn đầu route, không đọc thực thể từ code | V | — | A09 | `graph/data-deps.ts` (rút gọn) | Minh |
| A12 | Tên bài do code đặt | **Tối giản**: route + tên hàm | D | — | A09 | `graph/naming.ts` (rút gọn) | Minh |
| A13 | Java + Spring Boot (repo demo Q-03) | Giữ, **có cổng H+11** | K | `.java` không được nhận (E06-10) | A06–A09 | `graph/resolvers/java.ts`, `graph/spring.ts` | Minh |
| A14 | Phiên học, snapshot Postgres (D-59), mở lại phiên | Giữ | V | — | A03, DB | `src/server/session.ts`, `src/server/cache.ts`, `src/app/api/ingest/route.ts`, `src/app/api/sessions/route.ts` | Thiện |
| A15 | `analyze-node`: bước, điểm hay, điểm dở, kỹ năng | Giữ | V | Cắt giữa JSON do trần token ra (C-02); điểm dở bị cổng gác lọc hết (C-06, C-09); `summary` không nói bài làm gì (C-07) | A09, Gemini | `src/server/ai/analyze.ts`, `prompts/analyze.ts`, `guard/analysis.ts`, `src/app/api/analyze-node/route.ts` | Nhân |
| A16 | `enrich-node`: câu hỏi theo kế hoạch BKT | Giữ | K | Quan hệ giữa các dòng bị nói sai (C-03); câu FLOW chép X-Ray là trả lời được (C-04); **câu hỏi quá khó (ghi chú 1)** | A15, A19 | `src/lib/plan.ts`, `src/server/ai/questions.ts`, `prompts/questions.ts`, `guard/questions.ts`, `src/server/enrich.ts`, `src/app/api/enrich-node/route.ts` | Nhân |
| A17 | `evaluate-feynman`: chấm, gợi ý 3 nấc | Giữ | K | **Luật Đạt quá chặt, gõ bậy bị mất lượt (ghi chú 6)** | A16, A19 | `src/server/ai/grade.ts`, `prompts/grade.ts`, `guard/followup.ts`, `src/server/evaluate.ts`, `src/app/api/evaluate-feynman/route.ts` | Nhân |
| A18 | Bỏ qua câu → hiện đáp án | Giữ | D | — | A17 | `src/server/reveal.ts`, `src/app/api/reveal/route.ts` | Nhân |
| A19 | BKT ở server, mở khóa node | Giữ | V | — | DB | `src/lib/bkt-engine.ts`, `src/lib/derive.ts`, `src/server/progress.ts` | Nhân (hàm thuần), Thiện (`progress.ts`) |
| A20 | Cổng gác: tên bịa, công nghệ ngoài repo, chèn lệnh | Giữ, **nới** (chỉ chặn 3 lỗi nặng) | V | `guard_blocked` làm chậm `enrich-node` (ghi chú 3, mới nghi) | — | `guard/names.ts`, `guard/forbidden.ts`, `guard/injection.ts`, `guard/text.ts`, `guard/log.ts` | Nhân |
| A21 | Bộ lọc an toàn: che email, SĐT, CCCD, secret, chặn từ xấu (D-65) | Giữ | D | — | — | `src/lib/moderation.ts` | Nhân |
| A22 | Offline mode (`Ctrl+Shift+D`, `mock_bundle.json`) | Giữ | V | Bundle phải ghi lại **trong giờ thi** sau khi đóng băng, không dùng bundle của repo tập | A15–A19 | `src/lib/offline.ts`, `scripts/record-bundle.ts`, `public/demo/mock_bundle.json` | Nhân (logic), Phát (UI) |
| A23 | Trang học 3 cột theo `prototype.html` | Giữ | V | **Giao diện không giống HTML (ghi chú 5)** | fixture | `src/app/learn/*` | Phát |
| A24 | Monaco chỉ đọc, mỗi file 1 tab, chỉ code của bước | Giữ | V | Tự host Monaco, không tải CDN | A23 | `src/components/code/CodePane.tsx`, `slice-model.ts`, `src/app/learn/components/CodeSnippetViewer.tsx` | Phát |
| A25 | Tour X-Ray: thẻ vai trò → bước → tóm tắt | Giữ | V | — | A24, A15 | `src/app/learn/components/XRayPanel.tsx`, `RoleCard.tsx`, `SkillChips.tsx` | Phát |
| A26 | Feynman: câu, ô trả lời, kết quả, gợi ý mở bước, đáp án mẫu | Giữ | V | Kết quả hiện trong hộp thoại thay vì trong cột (ghi chú 5) | A17 | `src/app/learn/components/FeynmanQuestionSection.tsx` | Phát |
| A27 | Giải thích đoạn chọn (D-82) | Giữ | V | **Nút không hiện (ghi chú 4)** | A24 | `src/components/code/SelectionPopover.tsx`, `src/server/ai/explain.ts`, `prompts/explain.ts`, `guard/explain.ts`, `src/app/api/explain-selection/route.ts` | Nhân (server), Phát (UI) |
| A28 | Mài mòn chỉ hiển thị (D-35) | Giữ | D | — | A19 | `SkillChips.tsx`, hàm `getDecayedMastery` trong `bkt-engine.ts` | Phát |
| A29 | Persona demo (`SENIOR_RUSTY`) | Giữ | D | — | A19 | `src/server/persona.ts`, `src/app/api/demo/persona/route.ts` | Thiện |
| A30 | `/api/health`, `AI_DISABLED`, hạn mức token phiên | Giữ | D | — | — | `src/app/api/health/route.ts`, `src/server/ai/gemini.ts`, `src/server/quota.ts` | Thiện, Nhân |
| A31 | Bản chạy Cloud Run + Vercel dự phòng | Giữ | V | **Chưa từng chạy được trên GCP** | A30 | ngoài code | Thiện |
| A32 | CI: typecheck, lint, test khi mở PR | **Tối giản** | D | — | — | `.github/workflows/ci.yml` | Thiện |
| A33 | Trang chủ: đăng nhập, ô link, thả zip, "Tiếp tục học" | Giữ | V | Đồng hồ quét cập nhật 100 ms một lần làm vẽ lại cả trang 1.013 dòng (ghi chú 3, mới nghi) | A01, A14 | `src/app/page.tsx`, `src/components/home/*` | Phát, rồi bàn giao Thiện |
| A34 | Tổng quan nhịp 1 (facts, 0 API) | Giữ | D | — | A10 | `src/lib/overview-view.ts` | Phát |
| A35 | Chủ đề tối mặc định, có chủ đề sáng | Giữ | D | Repo tập chỉ có nền trắng | — | `src/app/globals.css` | Phát |

## 3. Nhóm B — râu ria, cắt hoặc làm tối giản

| Mã | Tính năng | Quyết định | Lý do (giám khảo có thấy không) | Tiết kiệm (ước tính) |
| :-- | :-- | :-- | :-- | :-- |
| B01 | Tải chọn lọc repo lớn (D-63) | Cắt | Repo demo nhỏ hơn `CONFIG.MAX_STREAM_BYTES`; đã có trong `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 1 | 2–3 giờ engine |
| B02 | Go, Dart, tầng `STRUCTURAL`, entry mobile (D-57, D-58), React Native | Cắt | Đã cắt theo D-76 và `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 1 | — |
| B03 | Resolver Python | **Cắt từ đầu** | Repo demo không dùng Python. Nếu cắt thì pitch **không được nói** "đã kiểm chứng Python" (xem `06_THUYET_TRINH_VA_TRUOC_GIO_THI.md`) | 1–2 giờ |
| B04 | Nút "Báo sai" + bảng `dispute_reports` (D-22) | Cắt | `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 2 | 1 giờ |
| B05 | Màn hình lịch sử `/history` | Chuyển sang mảng độc lập của Quý, link ẩn được | `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 3 | 1 giờ của nhóm chính |
| B06 | AI tổng quan + AI đặt tên bài (`analyze-overview`, D-83 phần AI) | Cắt, giữ nhịp 1 (`facts`) | `doc-de-hieu/07_ke_hoach_21h.md` Mục 3 bước 4; bớt 1 lời gọi AI | 2 giờ |
| B07 | `/report` (RadarChart), `/roadmap`, `/roadmap/[courseId]` | Cắt | Không có trong kịch bản demo; `/roadmap/[id]` là trang chậm nhất khi đo ở dev (ghi chú 3) | 2 giờ UI |
| B08 | ReactFlow + Dagre | Cắt | `spec/30` Mục 4: bản đồ là danh sách nhóm, không vẽ đồ thị. `position` gán theo tầng tô-pô đơn giản | Bớt gói nặng, 1 giờ |
| B09 | Kéo vạch chia khung, menu bố cục, bảng dưới `ProblemsPanel`, phím `Ctrl+Alt+J/B` | Cắt; giữ 2 nút ẩn/hiện cột như `prototype.html` | Không có trong kịch bản demo | 1,5 giờ UI |
| B10 | Chế độ trình chiếu | **Tối giản**: 1 nút phóng cỡ chữ code theo `CONFIG.UI_PRESENTATION_FONT_SCALE` | Có ích trên máy chiếu, bản đầy đủ thì tốn công | 0,5 giờ |
| B11 | Popover thẻ khái niệm trong X-Ray (D-81) | Cắt khỏi trang học. 16 thẻ hiển thị ở `/how-it-works` (mảng độc lập) | Chip kỹ năng đã có nhãn + câu `skills[].reason` | 1 giờ UI |
| B12 | Chỉ số Uncle Bob I·A·D, độ phức tạp nhận thức trong "Chi tiết bài" | Cắt | `<details>` đóng sẵn, giám khảo không mở | 1,5 giờ engine |
| B13 | Node thuật toán `ALGORITHMIC_CORE`, nối D-56, chế độ B của prompt | Cắt | Repo web nghiệp vụ hầu như không có | 2 giờ |
| B14 | Chế độ `degraded` / PROCEDURAL đầy đủ | **Tối giản**: không có entry ⇒ `ERR_NO_ARCHITECTURAL_SLICE` | Repo demo có entry rõ | 1 giờ |
| B15 | Đổi thư mục phân tích (`subdir_override`), chip monorepo | Cắt | Không có trong demo | 1 giờ |
| B16 | "Học lại từ đầu" (D-42), chip `ENGINE_UPDATED` | Cắt | Thi chỉ có 1 bản engine; muốn làm lại thì dùng "Xóa tài khoản" | 0,5 giờ |
| B17 | Bảng chi phí `ai_usage` (D-66 L1/L2) | **Tối giản**: 1 lệnh INSERT, không có màn hình | Không hiện trên UI | 0,5 giờ |
| B18 | Staging S2, smoke test bằng bot, cổng duyệt production, 2 image Docker | Cắt khỏi đường găng; deploy tay `--source` | Pipeline chưa từng chạy được (xem `05_DEPLOY_CLOUD_RUN.md`) | 2–4 giờ gỡ lỗi |
| B19 | Budget alert, Uptime check, CodeQL, Dependabot | Làm trên console **trước giờ thi** (không phải code), hoặc bỏ | Không thấy trên sân khấu | — |
| B20 | Lottie, `HeroArt`, glow, ping, hiệu ứng phóng node | Cắt; giữ chuyển màu và shimmer | Nghi gây giật (ghi chú 3); bundle nặng (`animation-robot.json` 163 KB) | 0,5 giờ, bớt giật |
| B21 | Menu cài đặt nhiều mục (`SettingsDropdown` 398 dòng) | **Tối giản**: Đăng xuất, Xóa tài khoản, Mở Offline | — | 1 giờ |
| B22 | Kiểm hậu kỳ phức tạp của cổng gác: đếm bước FLOW, kiểm số dòng, đếm câu feedback | Chuyển sang **chỉ ghi log**, không chặn | Ghi chú 6; bớt gọi lại AI | Bớt độ trễ |
| B23 | Log chuẩn hóa đầy đủ (`spec/04` Mục 9) | **Tối giản**: `pino` 1 dòng JSON, không bao giờ log code hay câu trả lời | — | 0,5 giờ |
| B24 | Luồng UI riêng cho mã lỗi hiếm (451, gợi ý submodule…) | **Tối giản**: bảng `ERROR_MESSAGES` vẫn đủ mọi khóa (bắt buộc để biên dịch), không làm luồng riêng | — | 0,5 giờ |
| B25 | Xử lý nhiều tab cùng nộp ở client | **Tối giản**: server vẫn kiểm `ERR_ATTEMPT_OUT_OF_SYNC`, client chỉ tải lại run | — | 0,5 giờ |

## 4. Thứ tự cắt khi trễ ≥ 1 giờ (bổ sung cho `doc-de-hieu/07_ke_hoach_21h.md` Mục 3)

Đã cắt từ đầu: B01–B04, B06–B09, B11–B16, B18. Khi một cổng ở [`04_TIMELINE_VA_PHU_THUOC.md`](04_TIMELINE_VA_PHU_THUOC.md) Mục 6 báo trễ, cắt tiếp **từ trên xuống**:

1. **Java/Spring (A13):** demo bằng repo TS/JS dự phòng (Q-02). Người quyết: Thiện cùng Minh, ở cổng H+11.
2. **`/history` (B05):** ẩn link bằng `src/lib/nav.ts` (Thiện sửa 1 dòng).
3. **Persona online (A29):** chỉ dùng persona trong Offline.
4. **Phần "Còn dùng ở" của popover giải thích (A27):** chỉ còn "Là gì" và "Ở đây".
5. **Chủ đề sáng (A35):** chỉ giữ chủ đề tối.
6. **Danh sách "Tiếp tục học" (A33):** chỉ giữ mở lại phiên gần nhất từ `sf.last_session`.

Không bao giờ cắt: danh sách ở Mục 1.

## 5. Kết luận khả thi

- Phạm vi giữ lại (nhóm A, sau khi tối giản) có **35 mục**. Đường găng là engine (Minh) và trang học (Phát). Tính tải theo giờ ở `04` Mục 3.
- Với 5 người, mốc đóng băng 04:00 **chỉ khả thi** khi: (1) cắt toàn bộ nhóm B như bảng trên; (2) engine làm TS/JS trước, Java chốt ở H+11; (3) deploy tay, không gỡ lỗi pipeline trong giờ thi; (4) mỗi agent chạy quá 30 phút thì chia nhỏ, làm lại tối đa 1 lần.
- Nếu cổng H+8 (lát dọc 1) trễ quá 1 giờ thì **không còn khả thi** giữ cả Java lẫn giải thích đoạn chọn đầy đủ. Khi đó cắt theo Mục 4.
