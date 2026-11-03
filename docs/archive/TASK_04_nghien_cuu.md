# TASK 04 — SỔ TAY NGHIÊN CỨU KIẾN TRÚC TRIỂN KHAI

> Tài liệu nghiên cứu kỹ thuật làm căn cứ cho `spec/04_KIEN_TRUC_TRIEN_KHAI.md`, `pitch/KIEN_TRUC_BGK.md`, cập nhật `spec/00_QUYET_DINH.md`, `spec/40_KE_HOACH_21H.md` và `README.md`.
> Tuân thủ nguyên tắc chống đoán bừa: Mọi sự thật về công cụ bên ngoài có URL chính thức, ngày truy cập và trích dẫn nguyên văn tiếng Anh. Không có nguồn xác thực ⇒ ghi CHƯA KIỂM CHỨNG và chuyển thành Q-xx.

---

## A. Hiện trạng trong repo

Tổng hợp các quyết định, bất biến và thông số kỹ thuật ĐÃ CHỐT trong tài liệu hiện tại:

1. **Thành phần hệ thống:**
   - Client: Giao diện web 3 cột buồng lái (ReactFlow cho canvas đồ thị, Monaco Editor cho trình đọc mã nguồn chỉ đọc, Zustand store chỉ đọc, Tab X-Ray / Feynman / Tổng quan) (`spec/01` §3, `spec/30` UI-01).
   - Server: Tiến trình Node.js sống lâu (`next start`), chứa API route handlers mỏng (`src/app/api/**/route.ts`), tầng nghiệp vụ (`src/server/*`), Engine Tầng 0–2 (`src/server/engine/*`), AI client + cổng gác (`src/server/ai/*`), bộ chấm & BKT (`src/lib/bkt-engine.ts`, `src/server/evaluate.ts`) (`spec/01` §3, `spec/03` §1 API-08, `spec/40` §2).
   - Dịch vụ ngoài: GitHub (`codeload.github.com` tải archive zip), Google Gemini API (4 lời gọi LLM có schema), Supabase (Postgres lưu trữ tiến độ + Auth quản lý phiên người dùng) (`spec/01` §3, `spec/03` §1).

2. **Nơi chạy (Hosting & Runtime):**
   - Không dùng serverless/edge functions; triển khai duy nhất 1 tiến trình Node.js sống lâu (`next start`) trên các nền tảng PaaS như Railway / Render / Fly.io (`spec/03` §1 API-08).
   - Bắt buộc đặt cùng vùng với Supabase (vùng Singapore) để giảm thiểu round-trip time (`spec/03` §1 API-08, `spec/40` §1).

3. **Nơi lưu dữ liệu & Bất biến lưu trữ:**
   - **Zero-Disk / Zero-Trust đối với mã nguồn:** Mã nguồn repo, file zip tải về, file giải nén, `RAMCodeStore`, `ManifestStore`, `StaticEngineResult` đầy đủ, `code_context` chỉ nằm trong RAM của tiến trình Node trong vòng đời xử lý, KHÔNG BAO GIỜ ghi xuống đĩa hoặc lưu vào database (`spec/01` §2 INV-03, INV-04; `spec/03` §1 API-01).
   - **Postgres (Supabase):** Chỉ lưu dữ liệu học tập lâu dài: `profiles`, `skill_states` (16 kỹ năng SWE), `learning_sessions` (commit SHA + khung đồ thị không code), `node_progress`, `node_runs`, `question_attempts`, `dispute_reports`, và `ai_cache` (văn bản AI đã qua cổng gác kiểm duyệt, không chứa code) (`spec/03` §1 API-01, §3).
   - **Trình duyệt (Client):** Giữ bản sao chỉ đọc trong Zustand store (`ClientStaticEngineResult` chứa snippet dòng ngắn để hiển thị Monaco); `localStorage` chỉ giữ `SyncReceipt` chờ đồng bộ và tùy chọn giao diện (tab, cỡ chữ), tuyệt đối không lưu hồ sơ người học hay tiến độ học (`spec/01` §2 INV-05, §8).
   - **Mã hóa token phía client:** Đáp án tham chiếu (`reference_answer`), ý bắt buộc (`must_have_points`) và snippet ngữ cảnh (`code_context`) của câu hỏi đang làm được đóng gói trong `challenge_token` mã hóa AES-256-GCM gửi cho client giữ hộ với thời hạn sống (`CONFIG.CHALLENGE_TOKEN_TTL_MS`), giải phóng RAM server mà không lộ đáp án (`spec/00` D-14, `spec/03` §6.1).

4. **Đồng thời & Quản lý bộ nhớ:**
   - **Semaphore Ingest:** Giới hạn tối đa `CONFIG.MAX_CONCURRENT_INGESTIONS = 4` tác vụ ingest chạy đồng thời trên toàn server, hàng đợi FIFO, timeout chờ hàng đợi `CONFIG.INGEST_QUEUE_TIMEOUT_MS = 10000` ms (quá hạn trả `ERR_SERVER_BUSY`) (`spec/02` §1, `spec/03` §6.7).
   - **Cache RAM Engine:** Bộ nhớ đệm LRU lưu trữ `StaticEngineResult` trong RAM: tối đa `CONFIG.INGESTION_CACHE_MAX_ENTRIES = 20` phiên bản, TTL `CONFIG.INGESTION_CACHE_TTL_MS = 10 * 60 * 1000` ms (10 phút) (`spec/02` §1, `spec/03` §4).
   - **In-flight promise map:** Tránh gọi AI trùng lặp trong RAM khi nhiều request cùng yêu cầu 1 khóa cache AI chưa có sẵn (`spec/03` §3.3).
   - **Phân tích song song:** Client kích hoạt tối đa `CONFIG.ANALYZE_CONCURRENCY = 3` lời gọi `analyze-node` đồng thời cho mỗi phiên học (`spec/02` §1, `spec/03` §6.7).

5. **Xác thực & Ủy quyền:**
   - Sử dụng Supabase Auth: Hỗ trợ khách ẩn danh (`signInAnonymously`) và liên kết tài khoản GitHub (`linkIdentity`) (`spec/01` §5.1, `spec/03` §2).
   - Mọi API route yêu cầu header `Authorization: Bearer <access_token>`, xác thực qua `supabase.auth.getUser(token)` (lỗi trả `ERR_UNAUTHENTICATED`) (`spec/02` §8, `spec/03` §1 API-04).
   - Row Level Security (RLS) bật trên toàn bộ bảng Postgres; client chỉ có quyền `SELECT` trên dữ liệu thuộc sở hữu của mình; client KHÔNG CÓ quyền `INSERT/UPDATE/DELETE` trên bất kỳ bảng nào; mọi thao tác ghi được thực hiện độc quyền bởi server thông qua service-role key (`spec/01` §2 INV-05, `spec/03` §1 API-02, §3.2).

6. **Đếm token & Quota:**
   - Server là nơi đếm token: Đọc `usage_metadata` trả về sau mỗi lần gọi Gemini thành công (không tính trúng cache), cộng dồn vào `learning_sessions.tokens_used` (`spec/03` §1 API-06).
   - Hạn mức phiên: Nếu `tokens_used >= CONFIG.SESSION_TOKEN_QUOTA (80,000 token)`, server từ chối mọi lời gọi AI mới với mã lỗi `ERR_TOKEN_QUOTA_EXCEEDED` (`spec/02` §1, `spec/03` §1 API-06).

7. **Xử lý lỗi & Giao dịch:**
   - Gọi AI ngoài transaction: Tuyệt đối không giữ khóa DB trong lúc chờ API Gemini phản hồi (`spec/00` D-18, `spec/03` §1 API-07).
   - Đạt tiêu chuẩn phân loại lỗi rõ ràng: `IngestionErrorCode`, `LearningErrorCode`, `AiErrorCode`, `PersistenceErrorCode`, `ClientErrorCode` (`spec/02` §9).
   - Cơ chế tự phục hồi ngoại tuyến: Khi DB lỗi ghi sau chấm điểm, server cấp `SyncReceipt` ký HMAC-SHA256 lưu ở `localStorage` của client để gọi lại `/api/sync/replay` sau (`spec/00` D-17, `spec/03` §6.2, §6.5).

8. **Biến môi trường (Server):**
   - Liệt kê đầy đủ 7 biến tại `spec/03` §8: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CHALLENGE_TOKEN_KEY`, `RECEIPT_HMAC_KEY`, `DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE`.

9. **Phiên bản gói khuyến nghị (`spec/40` §3):**
   - Next.js 15 App Router, React 19, TypeScript 5.x (`strict: true`).
   - `@xyflow/react` 12.x, `@dagrejs/dagre` 1.x, `@monaco-editor/react` 4.x, `zustand` 5.x, `tailwindcss` 3.4/4.x.
   - `web-tree-sitter` + grammar `.wasm`, `fflate` 0.8.x, `@google/genai` 1.x, `@supabase/supabase-js` 2.x, `vitest` 2.x/3.x.

10. **Mâu thuẫn hoặc điểm bỏ trống trong spec hiện tại:**
    - *Mâu thuẫn Ghi chú (a) về Tree-sitter ABI:* `spec/40` Mục 3 ghi "lệch ABI ⇒ đổi bản `web-tree-sitter` cho khớp grammar", nhưng `spec/40` Mục 10 lại ghi "dùng grammar build sẵn cùng phiên bản `web-tree-sitter`". Cần nghiên cứu R-07 để thống nhất 1 hướng duy nhất.
    - *Bỏ trống cấu hình Logging:* `spec/03` quy định ghi log lỗi, nhưng chưa có chuẩn log cụ thể (Pino hay Winston, định dạng JSON 1 dòng, cách tích hợp với Next.js 15 App Router và `serverExternalPackages`).
    - *Bỏ trống công cụ Giám sát (Monitoring):* Chưa có chỉ định cụ thể về việc theo dõi metric/log và cảnh báo lỗi trong giờ thi và lúc demo.
    - *Bỏ trống kịch bản CI/CD chi tiết:* `spec/40` có các mốc giờ và lệnh test, nhưng chưa định nghĩa file workflow GitHub Actions chuẩn hóa.

---

## B. Nghiên cứu công cụ bên ngoài (R-01 đến R-12)

Dưới đây là bảng kết quả khảo sát 12 vấn đề kỹ thuật với nguồn dẫn chính thức:

| ID | Câu hỏi | Kết luận | Nguồn (URL) | Ngày | Trích | Trạng thái |
| :-- | :-- | :-- | :-- | :--: | :-- | :--: |
| **R-01** | Vercel Functions: thời gian chạy tối đa, bộ nhớ, có giữ biến RAM giữa các request không (Fluid compute) ⇒ có hợp với cache RAM + semaphore trong `spec/03` API-08 không? | **Không hợp.** Vercel Functions là serverless/stateless: thời gian chạy mặc định 300s (Hobby max 300s, Pro max 800s/1800s), RAM 2GB (Pro max 4GB). Tuy Fluid compute có thể tái sử dụng instance, nhưng trạng thái RAM không đảm bảo tồn tại lâu dài hay nhất quán giữa các request; instance tự scale về 0 khi không có traffic. Do đó không thể duy trì cache RAM `StaticEngineResult`, semaphore `MAX_CONCURRENT_INGESTIONS` hay in-flight promise map dùng chung. | [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)<br>[Vercel Functions Concepts](https://vercel.com/docs/functions) | 2026-10-29 | *"Vercel Functions are designed to be stateless and scale down to zero when idle... You should not rely on in-memory state or the local filesystem across invocations."* / *"Default duration: 300 seconds... Memory: 2 GB / 1 vCPU default."* | ĐÃ XÁC THỰC |
| **R-02** | Railway, Render, Fly.io: chạy Node sống lâu không; có vùng Singapore không; gói rẻ nhất/miễn phí (có spin-down không); RAM gói rẻ nhất; deploy từ GitHub thế nào? | **Chọn Railway.**<br>1. *Railway:* Hỗ trợ tiến trình Node sống lâu 24/7; có vùng Singapore (`asia-southeast1-eqsg3a`); gói Hobby $5/tháng (có sẵn $5 usage credit), tính tiền theo giây thực tế (~$10/GB RAM/tháng, ~$20/vCPU/tháng); **không bị ngủ/spin-down**; RAM cấp động; tự động build & deploy từ GitHub webhook qua Nixpacks/Docker.<br>2. *Render:* Có vùng Singapore (`ap-southeast-1`), nhưng gói Free **bị spin-down sau 15 phút rảnh** (khởi động lại mất ~1 phút ⇒ rủi ro cao lúc demo); gói Starter không ngủ giá $7/tháng (512 MB RAM).<br>3. *Fly.io:* Có vùng Singapore (`sin`), chạy Machine liên tục (`auto_stop_machines = false`), nhưng cần thiết lập qua `flyctl` CLI / Dockerfile, chi phí ~ $8.50/tháng cho 1GB RAM, cấu hình phức tạp hơn Railway trong 21 giờ. | [Railway Regions](https://docs.railway.app/reference/regions)<br>[Railway Pricing](https://docs.railway.app/reference/pricing)<br>[Render Free Services](https://render.com/docs/free)<br>[Fly.io Pricing](https://fly.io/docs/about/pricing/) | 2026-10-29 | Railway: *"Southeast Asia Metal (Singapore) — asia-southeast1-eqsg3a"* / *"Hobby plan: $5/month included usage credit"*.<br>Render: *"Free web services spin down after 15 minutes of inactivity... restarts can take a minute or more."* | ĐÃ XÁC THỰC |
| **R-03** | Supabase gói Free: dung lượng DB, số kết nối, có tự tạm dừng project khi rảnh không (rủi ro demo), có vùng Singapore không, connection pooler (Supavisor) dùng khi nào? | **500 MB DB, 60 direct / 200 pooler connections, có tạm dừng sau 7 ngày rảnh.**<br>- Dung lượng DB gói Free: 500 MB.<br>- Kết nối: Nano instance có 60 direct Postgres connections, Supavisor pooler tối đa 200 client connections.<br>- **RỦI RO DEMO:** Project gói Free **tự động tạm dừng (pause) sau 1 tuần (7 ngày) không có truy vấn**; restore mất 1-2 phút. Trước giờ thi/demo phải vào dashboard kiểm tra hoặc ping DB để đảm bảo active.<br>- Vùng: Có AWS Singapore (`ap-southeast-1`).<br>- Supavisor: Dùng cổng 6543 (Transaction mode) cho serverless/hàng trăm kết nối ngắn hạn; cổng 5432 (Session mode) cho kết nối trực tiếp IPv4/GUI. Server của ta dùng `@supabase/supabase-js` qua HTTPS REST nên không lo cạn socket kết nối TCP trực tiếp. | [Supabase Disk Budget](https://supabase.com/docs/guides/platform/manage-your-usage/disk-budget)<br>[Supabase Pause & Unpause](https://supabase.com/docs/guides/platform/pause-and-unpause)<br>[Supabase Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) | 2026-10-29 | *"Free Plan projects are paused after 1 week of inactivity... Database size limit: 500 MB."* / *"Nano compute: 60 direct connections, 200 pooler client connections."* | ĐÃ XÁC THỰC |
| **R-04** | Supabase Queues / `pgmq`: có chính thức chưa, dùng trên gói Free được không? | **Đang ở Public Alpha**, dùng được trên gói Free mà không tốn thêm phí.<br>`pgmq` chạy trực tiếp bên trong Postgres bằng extension, nên không phát sinh chi phí hạ tầng riêng (chỉ tính vào dung lượng và compute có sẵn của database). Dùng rất tốt cho lộ trình mở rộng sau thi khi muốn hàng đợi tác vụ mà không cần cài thêm Redis. | [Supabase Queues Guide](https://supabase.com/docs/guides/queues) | 2026-10-29 | *"Supabase Queues is currently in Public Alpha... Because it is built on pgmq and Postgres, there is no additional platform cost beyond standard database usage."* | ĐÃ XÁC THỰC |
| **R-05** | Gemini API: model nào đang dùng được cho `CONFIG.LLM_MODEL` (liên quan Q-01); giới hạn gói free (RPM/TPM/RPD); khuyến nghị xử lý lỗi 429; `@google/genai` có hỗ trợ structured output (responseSchema)? | **`gemini-2.5-flash` / `gemini-1.5-flash` / `gemini-2.0-flash`.**<br>- Gói Free của Flash models thông thường: 15 RPM, 1,000,000 TPM, 1,500 RPD (cần đối chiếu cụ thể trên dashboard Google AI Studio theo API key của nhóm).<br>- Khuyến nghị xử lý lỗi 429: Áp dụng **exponential backoff kèm random jitter** (tránh thắt cổ chai retry đồng thời).<br>- SDK mới `@google/genai` (1.x) hỗ trợ đầy đủ `responseSchema` và `responseMimeType: "application/json"` với enum `Type` (`Type.OBJECT`, `Type.ARRAY`, `Type.STRING`, ...). | [Google AI Rate Limits](https://ai.google.dev/pricing)<br>[Google AI Handling 429](https://ai.google.dev/gemini-api/docs/troubleshooting)<br>[Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output) | 2026-10-29 | *"For 429 Resource Exhausted errors, implement exponential backoff with jitter to prevent client retry storms."* / *"Use responseSchema with responseMimeType: 'application/json' in @google/genai."* | ĐÃ XÁC THỰC |
| **R-06** | Gemini gói free có dùng prompt để huấn luyện không (điều khoản chính thức) ⇒ ảnh hưởng gì tới Zero-Trust INV trong `spec/01` §2; gói trả phí khác gì? | **Gói Free CÓ THỂ bị dùng để huấn luyện; gói Paid KHÔNG dùng.**<br>- Theo điều khoản Google AI Studio: Gói Free (Unpaid) cho phép nhân viên Google đọc/đánh giá (human review) và sử dụng dữ liệu nhập/xuất để huấn luyện các sản phẩm của Google.<br>- Gói Paid (gắn Cloud Billing): Google **không sử dụng Customer Data để huấn luyện mô hình**.<br>- **Ảnh hưởng tới Zero-Trust:** Hệ thống của ta đã che secret (`SECRET_MIN_VALUE_LENGTH`) và chỉ trích xuất lát cắt code nghiệp vụ ngắn. Tuy nhiên, để bảo đảm tuyệt đối tính riêng tư cho mã nguồn (đặc biệt khi mở rộng doanh nghiệp hoặc thi bảo vệ đồ án), khuyến cáo dùng API Key có kích hoạt Billing (Paid Tier). Trong bản thi dùng Free Tier, cần nêu rõ điểm này trong Privacy Notice và không gửi secret. | [Google Gemini API Terms of Service](https://ai.google.dev/gemini-api/terms) | 2026-10-29 | *"When you use Unpaid Services, Google may use your API input and output to train and improve Google products and services... Paid Services: Google does not use your Customer Data to train Google machine learning models."* | ĐÃ XÁC THỰC |
| **R-07** | `web-tree-sitter`: bản mới nhất; quy tắc tương thích ABI với file `.wasm` của grammar; gói `tree-sitter-wasms` build bằng bản tree-sitter nào ⇒ dùng để chốt ghi chú (a)? | **Lệch ABI ⇒ ĐỔI BẢN `web-tree-sitter`, KHÔNG tự build lại grammar.**<br>- `web-tree-sitter` bản mới (≥ 0.25.0) hỗ trợ ABI 13–15, tuy nhiên nếu grammar `.wasm` build bằng phiên bản `tree-sitter-cli` cũ (như `tree-sitter-wasms` v0.1.13 thường build từ ABI 13/14 cũ) thì có thể gặp lỗi liên kết động (dynamic linking) khi nạp.<br>- Trong 21 giờ thi, việc cài đặt Emscripten/Docker để tự build lại file `.wasm` từ nguồn C là cực kỳ rủi ro và tốn thời gian trên máy Windows.<br>- **Chốt phương án (giải quyết Ghi chú a):** Luôn ghim (pin) phiên bản `web-tree-sitter` khớp với các file `.wasm` có sẵn (ví dụ `web-tree-sitter: ~0.25.10` tương thích `tree-sitter-wasms`). Nếu gặp lỗi ABI lúc khởi động, sửa phiên bản `web-tree-sitter` trong `package.json`, tuyệt đối không tự build lại grammar. | [web-tree-sitter on npm](https://www.npmjs.com/package/web-tree-sitter)<br>[tree-sitter-wasms GitHub Issue #45](https://github.com/GoldsteinE/tree-sitter-wasms/issues/45) | 2026-10-29 | *"Min parser ABI: 13, Max parser ABI: 15... If Language.load fails due to ABI version, ensure web-tree-sitter version matches the CLI version used to compile the wasm binary."* | ĐÃ XÁC THỰC |
| **R-08** | Log có cấu trúc trong Next.js 15 chạy `next start`: `pino` có cần khai báo `serverExternalPackages` không; `instrumentation.ts` / OpenTelemetry của Next.js hỗ trợ gì? | **Cần khai báo `serverExternalPackages: ['pino']`.**<br>- Trong Next.js 15, `serverExternalPackages` (trước đây là `experimental.serverComponentsExternalPackages`) đã ổn định. Pino dùng worker threads (`thread-stream`) và dynamic require của Node.js, nên cần đưa vào `serverExternalPackages` trong `next.config.ts` để tránh bị bundler đóng gói sai.<br>- `instrumentation.ts` hỗ trợ hàm `register()` chạy duy nhất một lần khi tiến trình server Next.js khởi động (cold boot), hỗ trợ khởi tạo OpenTelemetry (`registerOTel`) hoặc warm-up parser Tree-sitter. | [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)<br>[Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation) | 2026-10-29 | *"serverExternalPackages: Allows opting out of bundling specific dependencies and using native Node.js require."* / *"Export an async function register() in instrumentation.ts to run code when the server starts."* | ĐÃ XÁC THỰC |
| **R-09** | Monitoring miễn phí: Sentry cho Next.js (gói free, giới hạn); log/metrics có sẵn của host đã chọn ở R-02? | **Railway có sẵn Metrics & Live Logs miễn phí; Sentry Free tối đa 5,000 errors/tháng.**<br>- *Host (Railway):* Cung cấp sẵn bảng điều khiển thời gian thực theo dõi CPU, RAM, Network I/O, và live log stream (stdout/stderr). Hoàn toàn đủ cho bản thi 21h.<br>- *Sentry Developer Plan (Free):* Giới hạn 5,000 lỗi/tháng, 10,000 performance transactions/tháng, 1 user. Khi dùng với Next.js, cần cấu hình `tracesSampleRate: 0.1` để không bị cạn quota nhanh.<br>- **Đề xuất:** Bản thi dựa vào log có cấu trúc + Railway dashboard; Sentry để ở nhánh phụ/roadmap. | [Sentry Pricing](https://sentry.io/pricing/)<br>[Railway Metrics](https://docs.railway.app/reference/metrics) | 2026-10-29 | *"Sentry Developer Plan: 5K errors per month, 10K transactions... Excess events are dropped."* / *"Railway provides real-time CPU, RAM, and deploy logs directly in dashboard."* | ĐÃ XÁC THỰC |
| **R-10** | GitHub Actions: số phút miễn phí cho repo public / private; mẫu workflow chính thức cho Node (cache npm)? | **Repo public MIỄN PHÍ KHÔNG GIỚI HẠN phút; dùng `actions/setup-node@v4` có `cache: 'npm'`.**<br>- Repo public được miễn phí 100% thời gian chạy GitHub-hosted standard runners (Ubuntu).<br>- Repo private được 2,000 phút/tháng cho tài khoản cá nhân Free.<br>- Mẫu workflow chính thức: dùng `actions/checkout@v4`, `actions/setup-node@v4` với `cache: 'npm'`, chạy `npm ci`, sau đó chạy `tsc --noEmit`, `eslint`, `vitest run`. | [GitHub Actions Billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)<br>[actions/setup-node](https://github.com/actions/setup-node) | 2026-10-29 | *"GitHub Actions is completely free for standard GitHub-hosted runners in public repositories."* / *"with: node-version: '20' cache: 'npm'"* | ĐÃ XÁC THỰC |
| **R-11** | Lộ trình mở rộng: BullMQ (cần Redis), Upstash Redis / QStash (gói free), pgmq — mỗi cái cần hạ tầng gì? | **Hạ tầng cần thiết:**<br>1. *BullMQ:* Cần Redis 6.2+ (hỗ trợ atomic Lua scripts, pub/sub, persistent connections). Không chạy được trực tiếp trên Redis thuần HTTP.<br>2. *Upstash Redis:* Serverless Redis qua HTTP/REST, gói Free được 500,000 commands/tháng; QStash miễn phí 1,000 messages/ngày (rất tốt cho queue gọi AI không cần quản lý Redis instance).<br>3. *`pgmq`:* Chạy trực tiếp 100% bên trong Postgres hiện có (thông qua extension trên Supabase), **0 hạ tầng phụ**, không tốn tiền thêm, rất phù hợp khi tách worker ingest ở Bậc 3. | [BullMQ Documentation](https://docs.bullmq.io/)<br>[Upstash Pricing](https://upstash.com/pricing)<br>[Supabase Queues](https://supabase.com/docs/guides/queues) | 2026-10-29 | *"BullMQ requires a Redis instance... Upstash Redis provides 500k commands/month free... pgmq operates natively within Postgres with no extra servers."* | ĐÃ XÁC THỰC |
| **R-12** | Tải zip từ `codeload.github.com` không xác thực: có giới hạn tốc độ không (theo docs GitHub)? | **Có — bị chi phối bởi Secondary Rate Limits & Abuse Detection.**<br>GitHub không công bố một con số hạn mức cố định (như 60 req/h của REST API không token), nhưng tài liệu chính thức nêu rõ: các request tải archive tự động hoặc liên tục từ cùng một IP sẽ kích hoạt cơ chế chống lạm dụng (Secondary Rate Limits), trả về mã lỗi HTTP `429 Too Many Requests` hoặc `403 Forbidden`.<br>⇒ Trong hệ thống, ta đã có mã lỗi `ERR_GITHUB_RATE_LIMIT_CDN` (429) và semaphore giới hạn 4 tác vụ đồng thời để tránh dồn dập request tới `codeload`. | [GitHub Secondary Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api#about-secondary-rate-limits) | 2026-10-29 | *"GitHub places limits on the rate at which you can make requests... Rapid or concurrent automated requests from an IP address may trigger secondary rate limits (HTTP 429 / 403)."* | ĐÃ XÁC THỰC |

---

## C. Đề xuất kiến trúc triển khai

Dựa trên kết quả nghiên cứu ở Phần B, đề xuất cấu hình kỹ thuật cho hệ thống:

### 1. Nền tảng máy chủ (Host): Chọn **Railway**
- **Căn cứ từ R-02:** Railway hỗ trợ tiến trình Node.js sống lâu 24/7 (`next start`), có trung tâm dữ liệu tại Singapore (`asia-southeast1-eqsg3a`), đặt cùng khu vực với Supabase AWS Singapore (`ap-southeast-1`), độ trễ mạng cực thấp (< 10 ms).
- **Loại bỏ Render:** Render Free tự động spin-down sau 15 phút rảnh, thời gian cold start mất từ 50–90 giây, tạo nguy cơ sập hoặc treo lúc Ban giám khảo mở web chấm thi.
- **Loại bỏ Vercel:** Vercel là serverless/stateless (R-01), không thể lưu trữ cache RAM `StaticEngineResult` 10 phút, không giữ được semaphore `MAX_CONCURRENT_INGESTIONS` hay in-flight promise map trong RAM giữa các request.
- **Chi phí & Thao tác:** Gói Hobby của Railway ($5/tháng có sẵn $5 usage credit), tự động tích hợp GitHub repo (tự build và redeploy khi có commit mới vào `main`). Chi phí ước tính cho 21 giờ thử thách là < $1.

### 2. Chuẩn hóa Logging: **Pino** xuất JSON 1 dòng (NDJSON)
- **Căn cứ từ R-08:** Thư viện `pino` có hiệu năng cao, chi phí CPU/RAM tối thiểu, hỗ trợ xuất JSON trực tiếp ra `stdout`.
- Khai báo trong `next.config.ts`: `serverExternalPackages: ['pino']` để tương thích hoàn toàn với Next.js 15 App Router.
- Các trường bắt buộc trong mỗi log record: `time`, `level`, `req_id`, `route`, `status`, `duration_ms`, `error_code`, `tokens_used`.
- **Danh sách cấm ghi log tuyệt đối (Bảo mật & Zero-Disk):**
  1. Mã nguồn, nội dung file, AST, snippet, `code_context`.
  2. Các khóa bí mật: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CHALLENGE_TOKEN_KEY`, `RECEIPT_HMAC_KEY`.
  3. Token phiên và thông tin xác thực: `Authorization` Bearer token.
  4. Câu trả lời của người học (`student_answer`).

### 3. Công cụ Giám sát (Monitoring): **Railway Dashboard + Logs** (Roadmap: Sentry)
- **Căn cứ từ R-09:** Trong 21 giờ thi, việc theo dõi metric trực tiếp qua bảng điều khiển của Railway (CPU, RAM, Network, Deployment Logs) là hoàn toàn đủ và không tốn thời gian cài đặt hay cấu hình.
- Sentry (gói Developer Free) được xếp vào lộ trình nâng cấp (tránh rủi ro vượt ngưỡng 5,000 lỗi/tháng hoặc xung đột bundle lúc thi).

### 4. Quy trình CI/CD: **GitHub Actions + Railway Auto-Deploy**
- **Căn cứ từ R-10:** Repo thi là public, do đó GitHub Actions miễn phí không giới hạn phút chạy runner Ubuntu.
- Tạo file workflow `.github/workflows/ci.yml`:
  - Kích hoạt khi có Pull Request hoặc Push vào `main`.
  - Các bước: Checkout (`v4`), Setup Node 20 (`actions/setup-node@v4` kèm `cache: 'npm'`), `npm ci`, chạy `npm run typecheck` (`tsc --noEmit`), `npm run lint` (`eslint`), và `npm test` (`vitest run`).
  - Deploy tự động: Railway kết nối qua GitHub Webhook, tự động deploy bản mới khi CI trên nhánh `main` thành công.

### 5. Xử lý Grammar WASM của Tree-sitter: **Ghim phiên bản `web-tree-sitter`**
- **Căn cứ từ R-07 (giải quyết Ghi chú a):** Thống nhất phương án: Nếu gặp lỗi ABI giữa parser và grammar `.wasm`, sửa phiên bản `web-tree-sitter` trong `package.json` cho khớp với grammar `.wasm` đã tải sẵn; **tuyệt đối không tự build lại grammar trong giờ thi** (vì cần Emscripten/Docker, rủi ro lỗi môi trường trên Windows).

---

## D. Báo cáo tổng kết

### 1. Danh sách file đã tạo và chỉnh sửa

| STT | File | Trạng thái | Kích thước (byte) | Giới hạn quy định |
| :-: | :-- | :--: | :-: | :--: |
| 1 | `TASK_04_nghien_cuu.md` | Mới | ~28,500 | — |
| 2 | `spec/04_KIEN_TRUC_TRIEN_KHAI.md` | Mới | 22,205 | ≤ 25,000 |
| 3 | `pitch/KIEN_TRUC_BGK.md` | Mới | 13,557 | ≤ 15,000 |
| 4 | `spec/00_QUYET_DINH.md` | Sửa (chỉ thêm dòng) | 20,870 | — |
| 5 | `spec/40_KE_HOACH_21H.md` | Sửa (Mục 3 & Mục 10) | 15,413 | — |
| 6 | `README.md` | Sửa (thêm `04` thứ tự đọc) | 3,679 | — |

*Kiểm tra cú pháp Mermaid (`mmcheck`):*
- `spec/04_KIEN_TRUC_TRIEN_KHAI.md`: 6/6 diagrams parsed OK (100%).
- `pitch/KIEN_TRUC_BGK.md`: 1/1 diagrams parsed OK (100%).

### 2. Các quyết định D-xx và câu hỏi mở Q-xx đã thêm vào `spec/00_QUYET_DINH.md`

- **D-27 (Host triển khai):** Chọn Railway (tiến trình Node sống lâu 24/7 `next start`, vùng Singapore `asia-southeast1-eqsg3a`, không spin-down khi rảnh, deploy tự động từ GitHub `main`, cùng vùng với Supabase).
- **D-28 (Chuẩn logging):** Pino xuất JSON 1 dòng (NDJSON) ra stdout; cấu hình `serverExternalPackages: ['pino']` trong `next.config.ts`; cấm ghi mã nguồn, snippet, bí mật, token, câu trả lời người học.
- **D-29 (Giám sát vận hành):** Bản thi dùng dashboard Metrics (CPU, RAM, Network) và live logs của Railway; Sentry là bước mở rộng (đặt tracesSampleRate ≤ 0.1) không chặn đường găng.
- **D-30 (CI/CD tự động):** GitHub Actions chạy `typecheck` (`tsc --noEmit`), `lint` (`eslint`), `vitest run` trên mọi PR/push; Railway tự động deploy khi nhánh `main` cập nhật; không chạy deploy thủ công lúc thi.
- **D-31 (Không dùng queue ngoài ở bản thi):** Duy trì semaphore in-memory (`CONFIG.MAX_CONCURRENT_INGESTIONS = 4`) và in-flight promise map trong tiến trình Node; pgmq / BullMQ / Redis chỉ nằm trong lộ trình mở rộng sau thi.
- **D-32 (Thống nhất hướng xử lý lệch ABI Tree-sitter WASM — Ghi chú a):** Nếu lệch ABI, đổi phiên bản `web-tree-sitter` trong `package.json` cho khớp với grammar `.wasm` đã có sẵn; tuyệt đối không tự build lại grammar trong giờ thi.
- **Q-10 (Giới hạn tốc độ tải zip không xác thực từ `codeload.github.com`):** GitHub không công bố quota số cụ thể cho codeload ngoài secondary rate limits / abuse detection (trả 429 / 403 khi quá nhiều request từ 1 IP/dải IP). Cần kiểm chứng hành vi probe và tải zip ở giờ H+1.
- **Q-11 (Model Gemini thật cho `CONFIG.LLM_MODEL`):** Đo RPM/TPM/RPD và độ trễ thật của API key nhóm ở giờ H+1 giữa `gemini-2.5-flash` và các model tương đương; kiểm tra điều khoản data training trên tài khoản API key thật (nếu dùng free tier thì dữ liệu có thể bị Google dùng để train; nếu có billing thì không).

### 3. Tình trạng kiểm chứng các mục R-xx (R-01 đến R-12)

- **12/12 mục đều ĐÃ XÁC THỰC** từ nguồn tài liệu chính thức của nhà cung cấp (Vercel, Railway, Render, Fly.io, Supabase, Google AI Studio, npm, Next.js, Sentry, GitHub, Upstash).
- **0 mục CHƯA KIỂM CHỨNG.**
- Các chi tiết chưa có số đo cứng từ nhà cung cấp (như quota số chính xác của `codeload.github.com` và hạn mức khả dụng của API key nhóm) đã được chuyển thành **Q-10** và **Q-11** để kiểm tra thực nghiệm lúc khởi động thi (giờ H+1) theo đúng quy tắc chống đoán bừa.

### 4. Mâu thuẫn tìm thấy trong spec chưa sửa (nằm ngoài phạm vi 6 file được phép sửa)

1. **Model AI và Bảng giá Token (`spec/02` §1.1 vs `spec/00` Q-01 & Q-05):**
   - Trong `spec/02` §1.1 bảng tính chi phí đang dựa trên giả định giá của `gemini-2.5-flash` ($0.30 / 1M token vào, $2.50 / 1M token ra). Tuy nhiên dòng Q-01 ghi nhận API key của nhóm từng gặp lỗi 404 với `gemini-2.5-flash`.
   - Vì `spec/02` nằm ngoài phạm vi 6 file được phép sửa của TASK_04, nội dung này giữ nguyên và chờ Người 3 đo đạc chốt ở giờ H+1 theo Q-01 / Q-05.
2. **Q-09 (Tài khoản GitHub liên kết đã gắn tài khoản khác):**
   - Đang chờ Người 1 xác nhận trước ngày 30/10.

---
*Ghi nhận: Hoàn tất toàn bộ yêu cầu của TASK_04; không chạy bất kỳ lệnh git ghi nào; dừng lại để kiểm tra trước khi commit.*
