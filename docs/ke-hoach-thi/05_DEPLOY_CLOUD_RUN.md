# 05 — Deploy Google Cloud Run và đường lùi

> Người làm: **Thiện**. Không ghi giá trị bí mật vào file này, vào repo hay vào chat nhóm đông người.
> Lệnh dưới đây là lệnh vận hành, không phải code sản phẩm. Thay `<project-id>`, `<url-supabase>`, `<anon-key>` bằng giá trị thật lúc chạy.

## 1. Kết luận xác minh deploy

**Đã làm:** đọc `.github/workflows/deploy.yml`, `Dockerfile`, `next.config.ts`, `.env.example`, `src/instrumentation.ts`, `src/server/ai/gemini.ts` của repo tập.

**Chưa làm:** không chạy `gh run list --workflow deploy.yml` và `gh run view --log-failed`, vì người dùng đã dặn trong phiên này chỉ đọc file trên máy, không đụng repo. Vì vậy **chưa có log lỗi thật**. Đề bài cho biết 3 lần chạy gần nhất ngày 06/11 đều thất bại và bản đang sống là Vercel. Trưởng nhóm nên tự chạy 2 lệnh trên trước 11:00 để xem lỗi thật (Q-16).

**Nguyên nhân nghi ngờ** (đọc code, chưa chứng minh):

| # | Nghi vấn | Căn cứ trong file |
| :-- | :-- | :-- |
| 1 | Thiếu secret: workflow dừng ngay nếu thiếu `SUPABASE_*` | `deploy.yml` dòng 79–82, 137–140 |
| 2 | WIF chưa dựng xong; nếu dùng khóa thì `GCP_SA_KEY` có thể chưa có | `deploy.yml` dòng 54–65 |
| 3 | Artifact Registry repo `simplifey` hoặc 2 service Cloud Run chưa được tạo sẵn. Workflow chỉ đổi image, giả định service và biến môi trường đã đặt trên Cloud Run | `deploy.yml` dòng 5, 193–197 |
| 4 | Revision không khởi động được: `instrumentation.ts` gọi `assertGeminiEnv()`, hàm này ném lỗi khi thiếu `GEMINI_BACKEND` hoặc thiếu `GOOGLE_CLOUD_PROJECT` | `src/instrumentation.ts` dòng 11–13; `src/server/ai/gemini.ts` dòng 29–43 |
| 5 | Smoke test cần tài khoản bot email trên Supabase dev và biến `DEMO_REPO_URL` | `deploy.yml` dòng 224–257 |
| 6 | Cổng duyệt `production` cần GitHub Environment đã tạo | `deploy.yml` dòng 284 |

**Những gì chưa từng chạy được trên GCP** (rủi ro lớn nhất): một revision Cloud Run khởi động thành công; nạp secret từ Secret Manager; gọi Vertex AI `gemini-3.5-flash-lite` ở `location: "global"` từ service account; đăng nhập GitHub quay về URL `*.run.app`; nạp grammar `.wasm` và `queries/*.scm` trong bản build trên Cloud Run; rollback revision.

**Quyết định cho giờ thi (GD-03, Q-03):** không gỡ lỗi `deploy.yml` trong giờ thi. Đường chính là **deploy tay bằng `gcloud run deploy --source`** từ máy Thiện, làm ngay từ 13:20 (TH-04) để lộ lỗi sớm. Không có staging, không có smoke bot (B18). Lịch deploy: 13:20 (khung), 20:00 (lát dọc 1), 23:00 (lát dọc 2), 00:15 (bản cho kiểm tay ban đêm), 04:05 (đóng băng), 05:00 (có bundle Offline), muộn nhất 08:00 (sửa lỗi chặn demo).

## 2. Việc trước giờ thi (không phải code, làm trên console)

| Việc | Ai | Xong khi |
| :-- | :-- | :-- |
| Tạo project GCP, gắn billing (credit cuộc thi), bật API `run`, `cloudbuild`, `artifactregistry`, `secretmanager`, `aiplatform` | Thiện | `gcloud services list --enabled` có đủ 5 API |
| Tạo service account `simplifey-runner`, cấp `roles/aiplatform.user` và `roles/secretmanager.secretAccessor` | Thiện | Thấy role trong IAM |
| Tạo secret `DATABASE_URL` (Supavisor port 6543), `GITHUB_TOKEN` (chỉ đọc repo công khai), `SUPABASE_SERVICE_ROLE_KEY`, và `GEMINI_API_KEY` để dự phòng (chỉ dùng nếu Q-04 chọn) | Thiện | Mỗi secret có 1 phiên bản |
| **Đánh thức** project Supabase production (gói free tự dừng sau 1 tuần không hoạt động) | Thiện | Dashboard báo project đang chạy |
| GitHub OAuth App cho Supabase production; Redirect URLs có `http://localhost:3000/**`, `https://simplifey-prod-*.run.app/auth/callback`, `https://<app>.vercel.app/auth/callback` | Thiện | Đăng nhập thử ở localhost được |
| Tài khoản Vercel (đăng nhập bằng GitHub của Thiện), chọn vùng Function `sin1` | Thiện | — |
| Budget alert $20/tháng với 3 mốc 50/80/100% (`spec/05` Mục 6) | Thiện | Có email xác nhận |
| Mỗi người có key Google AI Studio riêng để chạy ở máy | Cả 5 | Gọi thử được 1 lần |
| Tài khoản GitHub demo, đăng nhập sẵn trên máy demo | Phát | — |
| `gcloud auth login` và `gcloud config set project <project-id>` trên máy Thiện | Thiện | `gcloud config list` đúng project |

## 3. Deploy tay (TH-04, TH-10, TH-14, TH-17)

Lệnh deploy, theo bảng cấu hình của `spec/05` Mục 1 và `01_deploy.md` Mục 4.5:

```bash
gcloud run deploy simplifey-prod --source . --region asia-southeast1 --allow-unauthenticated --service-account simplifey-runner@<project-id>.iam.gserviceaccount.com --cpu 1 --memory 2Gi --min-instances 1 --max-instances 4 --concurrency 40 --timeout 300s --cpu-boost --set-secrets="DATABASE_URL=DATABASE_URL:latest,GITHUB_TOKEN=GITHUB_TOKEN:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest" --set-env-vars="DEMO_MODE=false,GEMINI_BACKEND=vertex,GOOGLE_CLOUD_PROJECT=<project-id>,AI_DISABLED=false" --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=<url-supabase>,NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>,NEXT_PUBLIC_DEMO_MODE=false"
```

**Các lần deploy sau** (TH-10, TH-14, TH-16, TH-17, TH-18) dùng lệnh ngắn dưới đây. Lệnh này giữ nguyên biến môi trường và secret đã đặt trên service, kể cả khi cổng G3 đã chuyển sang `studio`. **Không chạy lại lệnh dài ở trên**, vì nó đặt lại `GEMINI_BACKEND=vertex` và bỏ `GEMINI_API_KEY`. Biến build có được nhớ giữa các lần `--source` hay không thì CHƯA KIỂM CHỨNG, nên lệnh ngắn vẫn truyền lại `--set-build-env-vars`.

```bash
gcloud run deploy simplifey-prod --source . --region asia-southeast1 --set-build-env-vars="NEXT_PUBLIC_SUPABASE_URL=<url-supabase>,NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>,NEXT_PUBLIC_DEMO_MODE=false"
```

Sau mỗi lần deploy, xem biến còn đúng không:

```bash
gcloud run services describe simplifey-prod --region asia-southeast1 --format=yaml
```

**3 bẫy phải kiểm ngay ở lần deploy đầu (13:20–14:00):**

1. **Biến `NEXT_PUBLIC_*` được ghi cứng lúc build** (D-72), nên phải truyền lúc build. `--set-env-vars` chỉ có tác dụng lúc chạy. Kế hoạch dùng cờ `--set-build-env-vars`. **CHƯA KIỂM CHỨNG** cờ này có tác dụng với `--source` ở phiên bản `gcloud` trên máy Thiện. Kiểm bằng cách mở trang, xem nút đăng nhập có gọi đúng URL Supabase không. Không được thì chuyển sang Dockerfile có `ARG` (cổng G2).
2. **Buildpacks và `output: "standalone"`:** Buildpacks chạy `npm start` (`next start`), mà `next start` không hợp với chế độ standalone. Vì vậy TH-01 **không bật** standalone. Chỉ bật khi chuyển sang Dockerfile. Buildpacks có chạy script `build` hay không: **CHƯA KIỂM CHỨNG**, xem log Cloud Build lần đầu. Nếu không chạy thì thêm biến build `GOOGLE_NODE_RUN_SCRIPTS=build` (tên biến cũng chưa kiểm chứng, đối chiếu tài liệu Google Cloud Buildpacks).
3. **Revision không khởi động:** xem log bằng lệnh dưới, tìm lỗi ném từ `instrumentation.ts`.

```bash
gcloud run services logs read simplifey-prod --region asia-southeast1 --limit 50
```

Sau lần deploy đầu: đổi Site URL của Supabase production sang URL Cloud Run; thêm URL vào Homepage của GitHub OAuth App.

**Dockerfile (chỉ khi cổng G2 không đạt):** multi-stage `node:22-slim` theo `spec/05` Mục 3 (deps, builder có `ARG` cho `NEXT_PUBLIC_*`, runner không root, chép `public/` và `queries/`), bật `output: "standalone"`, rồi deploy bằng `--source` (Cloud Build tự dùng Dockerfile khi thấy file này). Hạn cứng: **không làm Docker sau 00:00** (cổng G6 đóng mọi nhánh Docker lúc 02:00).

## 4. Kiểm Vertex AI (cổng G3, 20:15)

- Trên bản Cloud Run, mở 1 bài ⇒ `analyze-node` trả phân tích. Lỗi `403` / `PERMISSION_DENIED` ⇒ kiểm role `roles/aiplatform.user` của `simplifey-runner`. Lỗi `404` model ⇒ model chưa mở ở Vertex `global`.
- Không sửa được trong 15 phút ⇒ áp **Q-04** (mặc định có, trái D-66): đặt `GEMINI_BACKEND=studio` và nạp `GEMINI_API_KEY` từ Secret Manager.

```bash
gcloud run services update simplifey-prod --region asia-southeast1 --update-env-vars GEMINI_BACKEND=studio --update-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

- Ngắt AI khẩn cấp (D-66): đổi `AI_DISABLED` thành `true` bằng cùng lệnh `services update`.

## 5. Đường lùi (thứ tự theo `spec/05` Mục 5, đã bỏ bước staging)

| Bước | Khi nào | Làm gì | Đã thử chưa |
| :-- | :-- | :-- | :-- |
| 1 | Bản mới lỗi | Cloud Run Console ⇒ `simplifey-prod` ⇒ Revisions ⇒ Manage Traffic ⇒ 100% về revision cũ | Thử ở TH-16 (00:15), ghi thời gian thật |
| 2 | Cloud Run lỗi 5xx 2 lần liền, hoặc mất kết nối quá 15 giây | Chuyển sang tab Vercel đã đăng nhập sẵn (mục tiêu dưới 5 giây theo `spec/05`, chưa đo) | Mở và đăng nhập ở TH-16 |
| 3 | Mạng hội trường chết, hoặc AI hết hạn mức | `Ctrl+Shift+D` ⇒ Offline | Chạy ở NH-12 (04:00), tắt mạng thật |

Vercel deploy tự động khi merge `main` (kênh dự phòng, D-30). Biến trên Vercel: `GEMINI_BACKEND=studio` + `GEMINI_API_KEY`. Đổi biến thì bấm Redeploy.

## 6. Sổ đo

Sổ đo là 1 file ghi chú chung của đội, **nằm ngoài repo thi**. Mỗi dòng có: giờ đo, môi trường (máy / Cloud Run / Vercel), đường đo, lần đầu hay lần sau, số đo, người đo, ghi chú (mạng, RAM trống). **Không ghi số chưa đo. Không làm tròn đẹp.**

| Lúc đo | Phiếu | Đo gì |
| :-- | :-- | :-- |
| 13:00 | NH-01 | 3 lần gọi Gemini từ máy |
| 14:00 | TH-04 | Thời gian build và deploy lần đầu |
| 20:15 | TH-10, TH-11 | `ingest_ms + engine_ms` của repo demo trên Cloud Run |
| 23:00 | TH-14 | 6 đường × 2 lần (ghi chú 3) |
| 00:15 | TH-16 | Thời gian rollback |
| 04:00 | TH-17 | 6 đường × 2 lần trên production đóng băng (số này lên slide) |
