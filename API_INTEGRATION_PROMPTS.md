# CẨM NANG PROMPT TÍCH HỢP TOÀN BỘ API & AUTH CHO SIMPLIFEY (STEP-BY-STEP)

> Tài liệu này chứa toàn bộ prompt chi tiết cho từng bước tích hợp API từ backend vào frontend theo chuẩn quy cách [`spec/03_API_VA_LUU_TRU.md`](./spec/03_API_VA_LUU_TRU.md) và [`spec/02_CONTRACTS.md`](./spec/02_CONTRACTS.md).  
> **Thứ tự thực hiện:** Làm tuần tự từ Bước 0 đến Bước 13 để đảm bảo các phụ thuộc (Base Client, Auth OAuth, Store) luôn có sẵn trước khi gắn logic nghiệp vụ.

---

## MỤC LỤC LỘ TRÌNH TÍCH HỢP

- [Bước 0: Khởi tạo Base API Client & Error Handler](#bước-0-khởi-tạo-base-api-client--error-handler)
- [Bước 0.5: Tích hợp GET /auth/callback & Đăng nhập GitHub OAuth (D-44)](#bước-05-tích-hợp-get-authcallback--đăng-nhập-github-oauth-d-44)
- **Nhóm I: Quản lý Người dùng & Hồ sơ (User & Profile)**
  - [Bước 1: GET /api/me](#bước-1-tích-hợp-get-apime)
  - [Bước 2: POST /api/demo/persona](#bước-2-tích-hợp-post-apidemopersona)
  - [Bước 3: DELETE /api/me](#bước-3-tích-hợp-delete-apime)
- **Nhóm II: Khởi tạo Repo & Quản lý Phiên (Ingest & Sessions)**
  - [Bước 4: POST /api/ingest](#bước-4-tích-hợp-post-apiingest)
  - [Bước 5: GET /api/sessions](#bước-5-tích-hợp-get-apisessions)
  - [Bước 6: GET /api/sessions/{id}/progress](#bước-6-tích-hợp-get-apisessionsidprogress)
  - [Bước 7: GET /api/sessions/{id}/history](#bước-7-tích-hợp-get-apisessionsidhistory)
- **Nhóm III: Phân tích Kiến trúc bằng AI (AI Analysis)**
  - [Bước 8: POST /api/analyze-node](#bước-8-tích-hợp-post-apianalyze-node)
  - [Bước 9: POST /api/analyze-overview](#bước-9-tích-hợp-post-apianalyze-overview)
- **Nhóm IV: Học tập Feynman & Động cơ BKT (Learning & Evaluation)**
  - [Bước 10: POST /api/enrich-node](#bước-10-tích-hợp-post-apienrich-node)
  - [Bước 11: POST /api/evaluate-feynman](#bước-11-tích-hợp-post-apievaluate-feynman)
  - [Bước 12: POST /api/reveal](#bước-12-tích-hợp-post-apireveal)
  - [Bước 13: POST /api/report-wrong](#bước-13-tích-hợp-post-apireport-wrong)

---

## BƯỚC 0: Khởi tạo Base API Client & Error Handler

```markdown
# NHIỆM VỤ: THIẾT LẬP BASE API CLIENT & XỬ LÝ LỖI TOÀN DỰ ÁN
Hãy tạo module gọi API nền tảng cho frontend tại `src/lib/api.ts` dựa trên chuẩn `spec/03_API_VA_LUU_TRU.md` và `spec/02_CONTRACTS.md`.

## Yêu cầu kỹ thuật:
1. **Kiểu dữ liệu lỗi (`ApiError`):**
   - Định nghĩa interface `ApiError` đúng chuẩn spec/02 Mục 9: `{ error: { code: ErrorCode, message: string, retryable: boolean, details?: Record<string, string | number | boolean> } }`.
   - Hàm tiện ích `isApiError(err: unknown): err is ApiError`.
2. **Hàm `apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T>`:**
   - Tự động lấy `access_token` từ phiên Supabase Auth (`supabase.auth.getSession()`) và gắn header `Authorization: Bearer <token>`.
   - Tự động set `Content-Type: application/json` (nếu body không phải FormData).
   - Nếu mạng mất kết nối hoặc parse JSON hỏng, chuẩn hóa lỗi về mã `ERR_CLIENT_NETWORK`.
   - Xử lý HTTP status không 2xx: parse body JSON trả về `ApiError`, không quăng ngoại lệ unhandled.
3. **Quản lý Base URL:** Đọc từ `process.env.NEXT_PUBLIC_API_URL || ""` (hỗ trợ gọi relative trong Next.js App Router).

## Tiêu chí hoàn thành:
- File `src/lib/api.ts` biên dịch không lỗi TypeScript.
- Export đầy đủ hàm `apiFetch`, các kiểu `ApiError`, `ErrorCode`.
```

---

## BƯỚC 0.5: Tích hợp `GET /auth/callback` & Đăng nhập GitHub OAuth (D-44)

```markdown
# NHIỆM VỤ: TÍCH HỢP ROUTE HANDLER GET /auth/callback & LUỒNG ĐĂNG NHẬP GITHUB OAUTH

## 1. Thông tin Route Handler & Luồng Auth
- **Route Handler:** `src/app/auth/callback/route.ts` (Method: `GET`)
- **Mục đích:** Hoàn tất chu trình xác thực GitHub OAuth qua PKCE code exchange theo quy chuẩn `spec/03_API_VA_LUU_TRU.md` Mục 2 ("Đăng nhập GitHub"), `spec/04_KIEN_TRUC_TRIEN_KHAI.md` Mục 15 dòng 445 và Quyết định `D-44`.
- **Nguyên lý hoạt động:**
  1. Người dùng bấm nút "Đăng nhập GitHub" trên Navbar/Landing page.
  2. Client gọi `supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: `${origin}/auth/callback?next=${destination}` } })`.
  3. GitHub xác thực người dùng và redirect về URL: `/auth/callback?code=...&next=...`.
  4. Route handler `GET` nhận `code`, khởi tạo `createServerClient` (từ `@supabase/ssr`), gọi `supabase.auth.exchangeCodeForSession(code)` để sinh session cookie.
  5. Chống lỗ hổng Open Redirect: kiểm tra tham số `next` bằng hàm `safeNextPath(next, origin)`, chỉ cho phép redirect nội bộ (bắt đầu bằng `/`), nếu không an toàn thì fallback về `/`.
  6. Redirect người dùng về trang đích với phiên đăng nhập hợp lệ.

## 2. Phạm vi can thiệp:
1. **Cài đặt thư viện SSR:** Đảm bảo dự án đã có `@supabase/ssr` và `@supabase/supabase-js`.
2. **Tạo Route Handler:** `src/app/auth/callback/route.ts`:
   ```typescript
   import { type NextRequest, NextResponse } from "next/server";
   import { createServerClient } from "@supabase/ssr";

   export const dynamic = "force-dynamic";

   function safeNextPath(rawNext: string | null, origin: string): string {
     if (!rawNext || !rawNext.startsWith("/")) return "/";
     try {
       const target = new URL(rawNext, origin);
       if (target.origin !== origin) return "/";
       return `${target.pathname}${target.search}${target.hash}`;
     } catch {
       return "/";
     }
   }

   export async function GET(request: NextRequest) {
     const { searchParams, origin } = new URL(request.url);
     const code = searchParams.get("code");
     const next = safeNextPath(searchParams.get("next"), origin);

     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

     if (!supabaseUrl || !supabaseAnonKey) {
       return NextResponse.redirect(new URL("/", origin));
     }

     if (code) {
       const response = NextResponse.redirect(new URL(next, origin));
       const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
         cookies: {
           getAll() {
             return request.cookies.getAll();
           },
           setAll(cookiesToSet) {
             cookiesToSet.forEach(({ name, value, options }) => {
               response.cookies.set(name, value, options);
             });
           },
         },
       });

       const { error } = await supabase.auth.exchangeCodeForSession(code);
       if (!error) {
         return response;
       }
     }

     return NextResponse.redirect(new URL("/?error=auth_failed", origin));
   }
   ```
3. **Khởi tạo Browser Client:** `src/lib/supabase/client.ts`:
   ```typescript
   import { createBrowserClient } from "@supabase/ssr";

   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );
   }
   ```
4. **Gắn sự kiện Đăng nhập & Đăng xuất trên Giao diện:**
   - Tại `src/components/layout/Navbar.tsx` hoặc nút *"Đăng nhập GitHub"*:
     ```typescript
     const handleLogin = async () => {
       const supabase = createClient();
       await supabase.auth.signInWithOAuth({
         provider: "github",
         options: {
           redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
         },
       });
     };
     ```
   - Tại Menu Người dùng / Settings Dropdown:
     Gắn nút *"Đăng xuất"* gọi `await supabase.auth.signOut()` và đưa về màn hình đăng nhập.

## 3. Tiêu chí hoàn thành:
- Bấm "Đăng nhập GitHub" chuyển hướng mượt sang GitHub, sau đó redirect về `/auth/callback` và quay lại ứng dụng với session cookie hợp lệ.
- Bearer token sẵn sàng trong Supabase session để phục vụ `GET /api/me` ở Bước 1.
```

---

## BƯỚC 1: Tích hợp `GET /api/me`

```markdown
# NHIỆM VỤ: TÍCH HỢP API GET /api/me (LẤY HỒ SƠ NGƯỜI HỌC & BKT 16 KỸ NĂNG)

## 1. Thông tin API
- **Endpoint:** `GET /api/me`
- **Header:** `Authorization: Bearer <access_token>`
- **Response:** `MeResponse` (xem `spec/02_CONTRACTS.md` Mục 8)
  ```typescript
  interface MeResponse {
    profile: {
      user_id: string;
      overall_tier: "NOVICE" | "PRACTITIONER" | "ARCHITECT";
      skills: Record<SWESkill, {
        p_mastery: number;        // Điểm gốc (0.01 - 0.99)
        last_practiced_at: number; // Timestamp
        practice_count: number;
      }>;
    };
    server_now: number; // Dùng để tính mài mòn decay thời gian thực
  }
  ```

## 2. Phạm vi can thiệp:
- Thêm hàm `getMe(): Promise<MeResponse>` trong `src/lib/api.ts`.
- Tạo hoặc cập nhật Store người dùng (Zustand hoặc React Context): lưu `profile` và `server_clock_offset_ms = server_now - Date.now()`.
- Gắn vào `Header`: hiển thị avatar, tên người dùng thật từ Supabase user, và badge danh hiệu (`overall_tier`).
- Cập nhật trang Báo cáo (`src/app/report/page.tsx`): hiển thị 16 kỹ năng và tính toán điểm đã decay theo công thức ở `spec/22`.

## 3. Tiêu chí hoàn thành:
- Khi tải lại trang, thông tin người dùng và điểm kỹ năng được fetch tự động.
- Không crash khi chưa đăng nhập (hiển thị UI Guest/Login CTA).
```

---

## BƯỚC 2: Tích hợp `POST /api/demo/persona`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/demo/persona (CHUYỂN ĐỔI PERSONA DEMO)

## 1. Thông tin API
- **Endpoint:** `POST /api/demo/persona`
- **Request Body:** `{ mode: "NEWBIE" | "MID_LEVEL" | "SENIOR_RUSTY" }`
- **Response:** `PersonaResponse` (tương đương `MeResponse`)
- **Lỗi riêng:** `ERR_DEMO_MODE_DISABLED` (khi server tắt cờ demo).

## 2. Phạm vi can thiệp:
- Thêm hàm `switchPersona(mode: PersonaMode): Promise<MeResponse>` trong `src/lib/api.ts`.
- Gắn logic vào Menu Persona trên `Header` (`src/components/Header.tsx`):
  - Khi người dùng click chọn "Sinh viên năm 2", "Mid-level dev", hoặc "Senior nghỉ 30 ngày":
  - Bật loading nhẹ trên nút chọn.
  - Gửi request đến API.
  - Cập nhật lại store `profile` ngay khi có response.
  - Toast thông báo: *"Đã đổi sang hồ sơ: [Tên Persona]"*.
- Nếu server trả về `ERR_DEMO_MODE_DISABLED`, tự động ẩn menu chọn persona.

## 3. Tiêu chí hoàn thành:
- Chuyển persona trên Header làm thay đổi điểm số và thanh đo kỹ năng trên toàn bộ ứng dụng mà không cần F5.
```

---

## BƯỚC 3: Tích hợp `DELETE /api/me`

```markdown
# NHIỆM VỤ: TÍCH HỢP API DELETE /api/me (XÓA DỮ LIỆU & RESET TÀI KHOẢN)

## 1. Thông tin API
- **Endpoint:** `DELETE /api/me`
- **Header:** `Authorization: Bearer <access_token>`
- **Response:** Status `204 No Content`

## 2. Phạm vi can thiệp:
- Thêm hàm `deleteAccount(): Promise<void>` trong `src/lib/api.ts`.
- Mở rộng menu Cài đặt / Settings Dropdown (`src/components/Header.tsx`):
  - Thêm tùy chọn *"Xóa tài khoản & làm lại từ đầu"* (màu đỏ nguy hiểm).
  - Khi bấm, hiển thị `Dialog` xác nhận với cảnh báo rõ ràng: *"Toàn bộ lịch sử học tập và điểm kỹ năng sẽ bị xóa vĩnh viễn. Không thể hoàn tác."*
  - Khi xác nhận xóa:
    - Gọi API `DELETE /api/me`.
    - Gọi tiếp `supabase.auth.signOut()`.
    - Dọn dẹp local storage và điều hướng về trang chủ `/`.
    - Toast thông báo: *"Đã xóa toàn bộ dữ liệu tài khoản."*

## 3. Tiêu chí hoàn thành:
- Xác nhận 2 bước an toàn. Sau khi xóa tài khoản, hệ thống đưa người dùng về trạng thái chưa đăng nhập.
```

---

## BƯỚC 4: Tích hợp `POST /api/ingest`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/ingest (QUÉT REPO GITHUB & MỞ PHIÊN HỌC)

## 1. Thông tin API
- **Endpoint:** `POST /api/ingest`
- **Request Body (hỗ trợ cả JSON và FormData):**
  - Quét repo qua link: `{ repo_url: string, subdir_override?: string }`
  - Quét qua file .zip: `multipart/form-data` chứa file trong trường `archive`
  - Mở lại phiên: `{ session_id: string, restart?: boolean }`
- **Response:** `IngestResponse` (`session_id`, `result`, `progress`, `analyses`, `resumed`, `from_cache`).
- **Mã lỗi Ingest:** `ERR_INVALID_GITHUB_URL`, `ERR_EMPTY_REPOSITORY`, `ERR_STREAM_QUOTA_EXCEEDED`, `ERR_UNSUPPORTED_LANGUAGE`, `ERR_NO_ARCHITECTURAL_SLICE`, v.v.

## 2. Phạm vi can thiệp:
- Thêm hàm `ingestRepo(data: IngestRequest | FormData): Promise<IngestResponse>` trong `src/lib/api.ts`.
- Cập nhật Trang chủ (`src/app/page.tsx`):
  - Xóa bỏ giả lập `setTimeout`.
  - Kết nối ô nhập link GitHub: Kiểm tra regex trước khi gửi, gọi `POST /api/ingest`.
  - Hỗ trợ kéo thả file `.zip` (kiểm tra cỡ file trước khi gửi theo `CONFIG.MAX_UPLOAD_BYTES`).
  - Hiển thị Overlay trạng thái quét repo thật: đồng hồ đếm thời gian, báo cáo phát hiện số lượng node và ngôn ngữ.
  - Khi quét thành công: lưu `session_id` và điều hướng người dùng sang trang `/learn?session={session_id}`.
  - Hiển thị thông báo lỗi thân thiện dưới ô nhập tương ứng với mã lỗi trả về.

## 3. Tiêu chí hoàn thành:
- Nhập link repo GitHub thật hoặc kéo thả file zip chạy được quy trình quét. Lỗi repo được báo chi tiết.
```

---

## BƯỚC 5: Tích hợp `GET /api/sessions`

```markdown
# NHIỆM VỤ: TÍCH HỢP API GET /api/sessions (DANH SÁCH PHIÊN HỌC GẦN ĐÂY)

## 1. Thông tin API
- **Endpoint:** `GET /api/sessions`
- **Response:** `SessionsResponse`
  ```typescript
  interface SessionsResponse {
    sessions: Array<{
      session_id: string;
      repo_name: string;
      engine_version: string;
      created_at: number;
      last_active_at: number;
      completed_count: number;
      failed_count: number;
      total_nodes: number;
      can_resume: boolean;
      resume_blocker: "ENGINE_UPDATED" | null;
    }>;
  }
  ```

## 2. Phạm vi can thiệp:
- Thêm hàm `getSessions(): Promise<SessionsResponse>` trong `src/lib/api.ts`.
- Cập nhật Trang chủ (`src/app/page.tsx`):
  - Hiển thị section *"Tiếp tục học"* bên dưới thanh tìm kiếm nếu người dùng có phiên cũ.
  - Mỗi thẻ hiển thị: Tên repo, tỉ lệ hoàn thành (`completed_count / total_nodes`), số node trượt, thời gian hoạt động cuối.
  - Bấm "Học tiếp" sẽ gọi `POST /api/ingest { session_id }` và mở trang learn.
- Cập nhật Trang Roadmap (`src/app/roadmap/page.tsx`):
  - Thay mock data các khóa học bằng danh sách các repo/phiên học thực tế của người dùng.

## 3. Tiêu chí hoàn thành:
- Người dùng thấy danh sách chính xác các repo họ đã từng phân tích và bấm vào học tiếp được ngay.
```

---

## BƯỚC 6: Tích hợp `GET /api/sessions/{session_id}/progress`

```markdown
# NHIỆM VỤ: TÍCH HỢP API GET /api/sessions/{id}/progress (TIẾN ĐỘ ĐỒ THỊ BÀI HỌC)

## 1. Thông tin API
- **Endpoint:** `GET /api/sessions/{session_id}/progress`
- **Response:** `ProgressResponse`
  ```typescript
  interface ProgressResponse {
    progress: {
      session_id: string;
      tokens_used: number;
      nodes: Record<string, {
        status: "LOCKED" | "AVAILABLE" | "COMPLETED" | "FAILED";
        attempts_count: number;
        has_warning: boolean;
      }>;
    };
  }
  ```

## 2. Phạm vi can thiệp:
- Thêm hàm `getSessionProgress(sessionId: string): Promise<ProgressResponse>` trong `src/lib/api.ts`.
- Cập nhật Panel "Đồ thị bài học" (Drawer trong `src/app/learn/page.tsx` - node `5-1751`):
  - Fetch tiến độ đồ thị khi mở Drawer.
  - Cập nhật trạng thái từng node:
    - `LOCKED`: Viền xám, icon ổ khóa, không bấm được.
    - `AVAILABLE`: Viền màu cam nhịp sáng, có thể click để bắt đầu học.
    - `COMPLETED`: Viền xanh lá, icon tích xanh.
    - `FAILED`: Viền đỏ, icon cảnh báo.
  - Cập nhật chỉ số token tiêu tốn trên Header (`tokens_used` / quota).

## 3. Tiêu chí hoàn thành:
- Trạng thái các bài học trên Drawer đồ thị phản ánh đúng tiến độ lưu trong cơ sở dữ liệu.
```

---

## BƯỚC 7: Tích hợp `GET /api/sessions/{session_id}/history`

```markdown
# NHIỆM VỤ: TÍCH HỢP API GET /api/sessions/{id}/history (LỊCH SỬ NỘP BÀI)

## 1. Thông tin API
- **Endpoint:** `GET /api/sessions/{session_id}/history`
- **Response:** `HistoryResponse`
  ```typescript
  interface HistoryResponse {
    items: Array<{
      node_id: string;
      node_title: string;
      mode: "LEARN" | "EXAM";
      question_index: number;
      skill: SWESkill;
      attempt_number: number;
      core_accuracy: number;
      is_passed: boolean;
      intent: string;
      student_answer: string;
      created_at: number;
    }>;
  }
  ```

## 2. Phạm vi can thiệp:
- Thêm hàm `getSessionHistory(sessionId: string): Promise<HistoryResponse>` trong `src/lib/api.ts`.
- Cập nhật Trang Báo cáo phiên học (`src/app/report/page.tsx` - node `5-562`):
  - Lấy `session_id` từ URL params (`/report?session=...`).
  - Đổ dữ liệu thật vào danh sách *"Lịch sử trả lời câu hỏi"*.
  - Hiển thị chi tiết từng câu: Tên kỹ năng, lần nộp thứ mấy, thanh % độ chính xác `core_accuracy`, badge Đạt/Chưa đạt, và đoạn văn bản câu trả lời của người học.
  - Hiển thị trạng thái rỗng nếu phiên học chưa có câu trả lời nào.

## 3. Tiêu chí hoàn thành:
- Trang báo cáo hiển thị chính xác mọi câu trả lời người học đã từng gõ trong phiên học đó.
```

---

## BƯỚC 8: Tích hợp `POST /api/analyze-node`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/analyze-node (PHÂN TÍCH KIẾN TRÚC NODE BẰNG AI)

## 1. Thông tin API
- **Endpoint:** `POST /api/analyze-node`
- **Request Body:** `{ session_id: string, node_id: string }`
- **Response:** `AnalyzeNodeResponse`
  - `analysis`: `{ patterns, summary, execution_flow, weak_points, strengths, cognitive_complexity }`
  - `node_state`: Trạng thái node sau phân tích.
  - `tokens_used`: Tổng token AI đã dùng.
- **Lỗi:** `ERR_TOKEN_QUOTA_EXCEEDED` (khi hết hạn mức AI).

## 2. Phạm vi can thiệp:
- Thêm hàm `analyzeNode(sessionId: string, nodeId: string): Promise<AnalyzeNodeResponse>` trong `src/lib/api.ts`.
- Cập nhật trang Buồng lái (`src/app/learn/page.tsx`):
  - Khi người dùng chọn một node trên đồ thị:
  - Nếu node chưa có dữ liệu trong cache: bật hiệu ứng Skeleton Shimmer trên cột Code và tab X-Ray.
  - Gọi `POST /api/analyze-node`.
  - Khi có kết quả:
    - Render mẫu kiến trúc (`patterns`), độ phức tạp (`cognitive_complexity`).
    - Render danh sách các bước luồng thực thi và code snippet thật vào khung xem code.
    - Render các điểm yếu kiến trúc `weak_points` kèm nhãn bắt buộc: *"Nhận định của AI"*.
    - Đánh dấu ⚠️ cảnh báo trên các dòng code tương ứng.

## 3. Tiêu chí hoàn thành:
- Chọn bài học nào thì code và phân tích kiến trúc AI của bài đó hiện ra chính xác kèm trạng thái loading mượt mà.
```

---

## BƯỚC 9: Tích hợp `POST /api/analyze-overview`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/analyze-overview (TỔNG QUAN TOÀN CẢNH REPO)

## 1. Thông tin API
- **Endpoint:** `POST /api/analyze-overview`
- **Request Body:** `{ session_id: string }`
- **Response:** `AnalyzeOverviewResponse`
  - `overview`: `{ architecture_style, summary, main_flow, layers, notes }`
  - `tokens_used`: Số token tiêu tốn.
- **Lỗi riêng:** `ERR_OVERVIEW_NOT_READY` (khi vẫn còn node trong repo chưa phân tích xong).

## 2. Phạm vi can thiệp:
- Thêm hàm `analyzeOverview(sessionId: string): Promise<AnalyzeOverviewResponse>` trong `src/lib/api.ts`.
- Cập nhật Tab "Tổng quan" ở trang Learn hoặc trang Roadmap chi tiết (`src/app/roadmap/[courseId]/page.tsx`):
  - Thêm một khối hiển thị *"Bức tranh kiến trúc tổng thể của hệ thống"*.
  - Hiển thị phong cách kiến trúc tổng quan (Layered, Microservices, Clean Architecture...).
  - Hiển thị luồng dữ liệu chính xuyên suốt từ Entry Point đến Data Access.
  - Luôn gắn nhãn disclaimer: *"Nhận định của AI — có thể chưa chính xác"*.
  - Nếu API trả lỗi `ERR_OVERVIEW_NOT_READY`: hiển thị thông báo *"Hệ thống đang tiếp tục phân tích các thành phần còn lại để dựng bức tranh toàn cảnh"*.

## 3. Tiêu chí hoàn thành:
- Người học đọc được bản tóm tắt kiến trúc tổng quan toàn bộ repo mà không cần mở từng file code.
```

---

## BƯỚC 10: Tích hợp `POST /api/enrich-node`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/enrich-node (SINH CÂU HỎI FEYNMAN CHO BÀI HỌC)

## 1. Thông tin API
- **Endpoint:** `POST /api/enrich-node`
- **Request Body:** `{ session_id: string, node_id: string, mode: "LEARN" | "EXAM" }`
- **Response:** `EnrichNodeResponse`
  - `run_id`: Mã phiên làm bài.
  - `questions`: Danh sách các câu hỏi Feynman (chỉ gồm nội dung câu hỏi, kỹ năng đo lường, tier, tuyệt đối chưa có đáp án).
  - `node_state`: Trạng thái node.
- **Lỗi:** `ERR_ANALYSIS_NOT_READY`, `ERR_NODE_NOT_AVAILABLE`, `ERR_TOKEN_QUOTA_EXCEEDED`.

## 2. Phạm vi can thiệp:
- Thêm hàm `enrichNode(sessionId: string, nodeId: string, mode?: "LEARN" | "EXAM"): Promise<EnrichNodeResponse>` trong `src/lib/api.ts`.
- Cập nhật Tab Feynman tại buồng lái (`src/app/learn/page.tsx`):
  - Sau khi node có bản phân tích, tự động gọi `enrich-node` để lấy câu hỏi.
  - Hiển thị thẻ đề bài Feynman:
    - Tiêu đề câu hỏi (ví dụ: `Câu 1/2 · DB_OPTIMIZATION · NOVICE`).
    - Nội dung câu hỏi giải thích khái niệm bằng ngôn ngữ đơn giản.
    - Đặt lại form nhập bài làm về trạng thái trống, reset số lượt làm bài.
  - Lưu `run_id` vào state của trang để dùng cho bước chấm bài.

## 3. Tiêu chí hoàn thành:
- Câu hỏi Feynman được sinh động dựa trên kỹ năng người học còn yếu tại node đó, không còn dùng câu hỏi hardcode.
```

---

## BƯỚC 11: Tích hợp `POST /api/evaluate-feynman`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/evaluate-feynman (CHẤM BÀI FEYNMAN & CẬP NHẬT BKT)

## 1. Thông tin API
- **Endpoint:** `POST /api/evaluate-feynman`
- **Request Body:**
  ```typescript
  interface EvaluateFeynmanRequest {
    session_id: string;
    run_id: string;
    question_index: number;
    student_answer: string;
    attempt_number: number;
  }
  ```
- **Response:** `EvaluateFeynmanResponse`
  - `is_passed`: Đạt hay trượt.
  - `core_accuracy`: Điểm độ chính xác (0 - 1).
  - `feedback`: Nhận xét sư phạm từ AI.
  - `detected_jargons`: Các thuật ngữ đao to búa lớn bị AI phát hiện.
  - `follow_up`: Gợi ý tiếp theo (nếu chưa đạt) kèm `step_index` trỏ đến code.
  - `skill_change`: Thay đổi điểm kỹ năng BKT (`p_before` → `p_after`).
  - `question.reveal`: Đáp án chuẩn (chỉ xuất hiện khi câu hỏi kết thúc).
- **Lỗi:** `ERR_ANSWER_TOO_SHORT`, `ERR_ANSWER_DUPLICATE`, `ERR_ATTEMPT_OUT_OF_SYNC`, `ERR_TOKEN_QUOTA_EXCEEDED`.

## 2. Phạm vi can thiệp:
- Thêm hàm `evaluateFeynman(data: EvaluateFeynmanRequest): Promise<EvaluateFeynmanResponse>` trong `src/lib/api.ts`.
- Cập nhật Form làm bài tại `src/app/learn/page.tsx`:
  - Bắt sự kiện bấm nút *"Gửi đánh giá"* hoặc phím tắt `Ctrl + Enter`.
  - Validate client trước khi gửi: Kiểm tra độ dài câu trả lời (tối thiểu `CONFIG.ANSWER_MIN_CHARS`), chống spam submit liên tục (disable nút trong khi gọi API).
  - Khi có response:
    - **Nếu ĐẠT (`is_passed = true`):**
      - Hiển thị chúc mừng, vẽ thanh độ chính xác màu xanh lá.
      - Hiển thị chip cập nhật điểm BKT (ví dụ: `0.6500 → 0.7850`).
      - Mở panel đáp án mẫu (`reference_answer` + `must_have_points`).
      - Hiện nút *"Câu tiếp theo"* hoặc *"Hoàn thành node"*.
    - **Nếu CHƯA ĐẠT (`is_passed = false`):**
      - Hiển thị thẻ Gợi ý màu tím (`follow_up.question`).
      - Nếu có `step_index`: tự động cuộn khung code tới bước đó và tô sáng vạch viền tím để người học tham khảo lại.
      - Cập nhật số lượt còn lại (ví dụ: `Lượt 2/3`).

## 3. Tiêu chí hoàn thành:
- Quy trình chấm bài Feynman hoạt động thực tế với AI Gemini. Điểm số BKT cập nhật chuẩn xác theo từng câu trả lời.
```

---

## BƯỚC 12: Tích hợp `POST /api/reveal`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/reveal (BỎ QUA CÂU NÀY & MỞ ĐÁP ÁN MẪU)

## 1. Thông tin API
- **Endpoint:** `POST /api/reveal`
- **Request Body:** `{ session_id: string, run_id: string, question_index: number }`
- **Response:** `RevealResponse`
  - `question`: Chứa `reveal` gồm `{ reference_answer, must_have_points, fix }`.
  - `skill_change`: Cập nhật giảm điểm BKT cho kỹ năng đó (tính là FAILED).
  - `node_state`: Trạng thái node.
  - `unlocked_node_ids`: Danh sách node con mở khóa.

## 2. Phạm vi can thiệp:
- Thêm hàm `revealAnswer(data: RevealRequest): Promise<RevealResponse>` trong `src/lib/api.ts`.
- Cập nhật giao diện làm bài tại `src/app/learn/page.tsx`:
  - Bổ sung nút *"Bỏ qua câu này"* cạnh nút "Gửi đánh giá".
  - Khi click: Mở `Dialog` xác nhận: *"Câu này sẽ tính là CHƯA ĐẠT cho kỹ năng này và hiển thị đáp án mẫu của AI. Bạn có chắc chắn muốn bỏ qua?"*
  - Khi xác nhận:
    - Gọi API `POST /api/reveal`.
    - Khóa ô nhập liệu câu hiện tại.
    - Đánh dấu trạng thái câu là ❌ Chưa Đạt.
    - Hiển thị `RevealPanel`: Đáp án tham khảo của AI, các ý bắt buộc cần có, và cách khắc phục lỗi.
    - Hiển thị chip giảm điểm BKT và chuyển sang nút *"Câu tiếp theo"*.

## 3. Tiêu chí hoàn thành:
- Người học có thể bỏ qua câu hỏi khó, xem đáp án chuẩn và chịu phạt điểm BKT theo đúng luật sư phạm D-15.
```

---

## BƯỚC 13: Tích hợp `POST /api/report-wrong`

```markdown
# NHIỆM VỤ: TÍCH HỢP API POST /api/report-wrong (BÁO SAI KẾT QUẢ CHẤM CỦA AI)

## 1. Thông tin API
- **Endpoint:** `POST /api/report-wrong`
- **Request Body:** `{ session_id: string, run_id: string, question_index: number, note: string }`
- **Response:** `ReportWrongResponse`
  - `question`: Câu hỏi chuyển sang cờ 🚩 `disputed = true`.
  - `skill_change`: Hoàn lại giá trị điểm BKT trước khi bị chấm sai.
  - `node_state`: Tính toán lại màu của node mà không tính câu bị báo sai.
- **Ràng buộc:** Chỉ được báo sai các câu có kết quả `FAILED`, tối đa 1 lần / câu, ghi chú tối đa 500 ký tự.

## 2. Phạm vi can thiệp:
- Thêm hàm `reportWrong(data: ReportWrongRequest): Promise<ReportWrongResponse>` trong `src/lib/api.ts`.
- Cập nhật giao diện xem kết quả tại `src/app/learn/page.tsx`:
  - Nút *"Báo sai"* chỉ hiển thị khi câu hỏi có kết quả `FAILED` và chưa từng báo sai.
  - Khi click: Mở `ReportModal` (hoặc modal feedback hiện có):
    - Cho phép người học nhập lý do vì sao cho rằng AI chấm sai (có bộ đếm ký tự `0/500`).
    - Nút *"Gửi báo sai"* gọi `POST /api/report-wrong`.
  - Khi thành công:
    - Gắn icon cờ 🚩 đỏ cạnh câu hỏi.
    - Toast thông báo: *"Đã ghi nhận báo sai. Điểm kỹ năng của bạn đã được hoàn lại."*
    - Cập nhật lại màu sắc của node nếu việc hoàn điểm làm node đạt điều kiện hoàn thành.
    - Ẩn nút Báo sai để tránh bấm lần 2.

## 3. Tiêu chí hoàn thành:
- Người học khiếu nại được kết quả chấm sai của AI, điểm số BKT được rollback an toàn theo đúng luật D-22.
```
