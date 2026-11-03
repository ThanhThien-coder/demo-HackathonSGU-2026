# TASK_04 — Kiến trúc triển khai (nghiên cứu trước, viết sau)

Repo tài liệu tiếng Việt. Đọc `CLAUDE.md` trước. Nhánh phải là `docs/cau-truc-spec` (sai thì dừng, báo lại).

## 0. Luật an toàn — ĐANG CÓ AGENT KHÁC CHẠY SONG SONG

Một agent khác đang sửa `spec/10`, `spec/11`, `spec/20`, `spec/22`, `spec/30` và tạo file trong `archive/2026-10-29_tach-khoi-spec/`. Một người khác đang sửa `spec/01`.

- **Cấm mọi lệnh git ghi**: `add`, `commit`, `checkout`, `restore`, `stash`, `reset`, `switch`, `merge`, `rebase`, `push`. Chỉ được dùng `git status`, `git diff`, `git show`, `git log`.
- **Chỉ được ghi vào đúng các file sau:**
  - `TASK_04_nghien_cuu.md` (mới, ở gốc repo — sổ nghiên cứu)
  - `spec/04_KIEN_TRUC_TRIEN_KHAI.md` (mới)
  - `pitch/KIEN_TRUC_BGK.md` (mới)
  - `spec/00_QUYET_DINH.md` (chỉ THÊM dòng D-xx / Q-xx, không sửa dòng cũ)
  - `spec/40_KE_HOACH_21H.md` (chỉ Mục 3 và Mục 10)
  - `README.md` ở gốc (chỉ thêm `04` vào thứ tự đọc)
- Muốn đọc `spec/01`, `10`, `11`, `20`, `22`, `30` thì đọc bản ổn định: `git show HEAD:spec/<tên file>`. Không mở các file đó để ghi.
- Không sửa `spec/02`, `spec/03`. Nếu thấy cần thêm hằng số hoặc kiểu dữ liệu thì ghi thành Q-xx, không tự thêm.

## 1. Nguyên tắc chống đoán bừa (bắt buộc)

- **Mọi sự thật về công cụ bên ngoài** (giới hạn, giá, vùng, phiên bản, quota, chính sách) phải có **nguồn chính thức** (docs / pricing page / changelog / repo GitHub chính chủ). Blog, StackOverflow, bài AI tổng hợp không tính là nguồn chính.
- Mỗi sự thật ghi: kết luận ngắn, URL, ngày truy cập, trích nguyên văn câu then chốt (tiếng Anh giữ nguyên).
- Không tìm được nguồn hoặc nguồn không nói rõ ⇒ ghi **CHƯA KIỂM CHỨNG**, KHÔNG được dùng như sự thật trong `spec/04` hay `pitch/`; chuyển thành Q-xx.
- **Mọi sự thật về hệ thống của mình** phải dẫn được tới file + mục trong repo (ví dụ `spec/03` §1 API-08). Không có ⇒ không viết.
- Không bịa số đo độ trễ, chi phí, số người dùng chịu được. Số từ nhà cung cấp thì ghi "theo <nguồn>, truy cập <ngày>". Số của mình thì ghi "mục tiêu / ước tính, chưa đo" (`spec/02` §1.1).
- Không hứa "100%". Không ghi là mình phát minh BKT, PageRank, Compound AI, Tree-sitter repo-map.

## 2. Giai đoạn 1 — Đọc hiện trạng trong repo

Đọc (chỉ phần cần): `README.md`; `spec/00` toàn bộ; `git show HEAD:spec/01_KIEN_TRUC_VA_LUONG.md` §2–§9; `spec/02` §1 (CONFIG), §8, §9; `spec/03` §1, §4, §6, §7, §8; `spec/21` phần Đọc nhanh; `spec/40` §2, §3, §10; `pitch/ROADMAP.md` §4; `pitch/PHAN_BIEN_BGK.md` §3.

Ghi vào `TASK_04_nghien_cuu.md`, phần **A. Hiện trạng**: liệt kê ngắn những gì spec ĐÃ chốt về: thành phần, nơi chạy, nơi lưu dữ liệu, đồng thời (semaphore, in-flight map, cache RAM), xác thực, đếm token, xử lý lỗi, biến môi trường, phiên bản gói. Mỗi dòng có dẫn file + mục. Ghi thêm chỗ spec **mâu thuẫn hoặc bỏ trống**.

## 3. Giai đoạn 2 — Nghiên cứu bên ngoài

Trả lời từng câu dưới đây trong phần **B. Nghiên cứu** của sổ, dạng bảng `| ID | Câu hỏi | Kết luận | Nguồn (URL) | Ngày | Trích | Trạng thái |`:

| ID | Câu hỏi |
| :-- | :-- |
| R-01 | Vercel Functions: thời gian chạy tối đa, bộ nhớ, có giữ được biến trong RAM giữa các request không (Fluid compute?) ⇒ có hợp với cache RAM + semaphore trong `spec/03` API-08 không |
| R-02 | Railway, Render, Fly.io: chạy được tiến trình Node sống lâu không; có vùng Singapore không; gói rẻ nhất / gói miễn phí hiện tại (có bị ngủ khi rảnh không — Render free có spin-down?); RAM gói rẻ nhất; deploy từ GitHub thế nào |
| R-03 | Supabase gói Free: dung lượng DB, số kết nối, **có tự tạm dừng project khi không hoạt động không** (rủi ro demo), có vùng Singapore không, connection pooler (Supavisor) dùng khi nào |
| R-04 | Supabase Queues / `pgmq`: có chính thức chưa, dùng trên gói Free được không |
| R-05 | Gemini API: model nào đang dùng được cho `CONFIG.LLM_MODEL` (liên quan Q-01); giới hạn gói free (RPM / TPM / RPD); khuyến nghị xử lý lỗi 429; `@google/genai` có hỗ trợ structured output (responseSchema) |
| R-06 | **Gemini gói free có dùng prompt để huấn luyện không** (điều khoản chính thức) ⇒ ảnh hưởng gì tới Zero-Trust INV trong `spec/01` §2; gói trả phí khác gì |
| R-07 | `web-tree-sitter`: bản mới nhất; quy tắc tương thích ABI với file `.wasm` của grammar; gói `tree-sitter-wasms` build bằng bản tree-sitter nào ⇒ dùng để chốt ghi chú (a) |
| R-08 | Log có cấu trúc trong Next.js 15 chạy `next start`: `pino` có cần khai báo `serverExternalPackages` không; `instrumentation.ts` / OpenTelemetry của Next.js hỗ trợ gì |
| R-09 | Monitoring miễn phí: Sentry cho Next.js (gói free, giới hạn); log/metrics có sẵn của host đã chọn ở R-02 |
| R-10 | GitHub Actions: số phút miễn phí cho repo public / private; mẫu workflow chính thức cho Node (cache npm) |
| R-11 | Lộ trình mở rộng: BullMQ (cần Redis), Upstash Redis / QStash (gói free), pgmq — mỗi cái cần hạ tầng gì |
| R-12 | Tải zip từ `codeload.github.com` không xác thực: có giới hạn tốc độ không (theo docs GitHub) |

Xong giai đoạn 2 thì viết phần **C. Đề xuất** trong sổ: chọn host (so sánh theo yêu cầu: Node sống lâu, Singapore, không ngủ lúc demo, chi phí), chọn công cụ log, monitoring, CI. Mỗi lựa chọn dẫn tới R-xx làm căn cứ. Chưa đủ căn cứ ⇒ ghi Q-xx.

**Mặc định đã chốt với nhóm (không đổi, chỉ tìm căn cứ):** bản thi KHÔNG dùng queue ngoài (Redis/RabbitMQ/BullMQ); giữ semaphore + in-flight map trong tiến trình; queue chỉ nằm trong lộ trình mở rộng.

## 4. Giai đoạn 3 — Viết `spec/04_KIEN_TRUC_TRIEN_KHAI.md`

File quy chuẩn: chỉ quy định, không văn giải thích, không lý do dài (lý do để ở `pitch/`). ≤ 25 000 byte. Mở đầu bằng khung **Đọc nhanh** giống `spec/02`, `spec/03`. Không chép lại nội dung đã có ở file khác — dẫn sang (một sự thật một chỗ). Các mục:

1. **Đọc nhanh** — 5–8 gạch đầu dòng + bảng "ai đọc mục nào".
2. **Sơ đồ ngữ cảnh** (Mermaid `flowchart`): người học, hệ thống, GitHub, Gemini, Supabase.
3. **Sơ đồ triển khai** (Mermaid): cái gì chạy ở đâu — trình duyệt, tiến trình Node trên host đã chọn (vùng), Supabase (vùng), Gemini; ghi giao thức trên mũi tên (HTTPS, Bearer token, Postgres qua supabase-js).
4. **Sơ đồ module trong server** (Mermaid): ánh xạ thư mục ở `spec/40` §2 → thành phần (api, engine, ai, guard, bkt, lib, db) và chiều phụ thuộc giữa chúng.
5. **Bảng thành phần**: `| Thành phần | Trách nhiệm | Nhận (kiểu ở 02) | Trả (kiểu ở 02) | Lưu ở đâu | Spec chi tiết |`. Tên kiểu phải có thật trong `spec/02` (kiểm bằng tìm chuỗi).
6. **Luồng dữ liệu qua ranh giới** (Mermaid `sequenceDiagram`, 3 sơ đồ): (a) mở repo → engine → đồ thị; (b) mở node → analyze-node / enrich-node; (c) nộp câu trả lời → evaluate-feynman → BKT → transaction ghi DB. Chỉ vẽ **dữ liệu nào đi qua ranh giới nào, dạng gì, có được lưu không** (trình duyệt ↔ server ↔ Supabase ↔ Gemini ↔ GitHub). Logic từng bước thì dẫn sang `spec/01` §5, không vẽ lại.
7. **Bảng dữ liệu theo vị trí**: RAM server / Postgres / trình duyệt / không bao giờ lưu — dẫn `spec/01` §8, chỉ bổ sung cột "thời gian sống" và "ai được đọc".
8. **Đồng thời & hàng đợi (bản thi)**: semaphore ingest, in-flight map, xử lý 429 của Gemini; hằng số dẫn tên `CONFIG.*` có thật ở `spec/02`; thiếu ⇒ Q-xx.
9. **Logging**: định dạng 1 dòng JSON, trường bắt buộc (thời gian, mức, request id, route, mã lỗi, độ trễ, token), **danh sách cấm ghi** (source code, nội dung file, access token, câu trả lời người học, khóa API).
10. **Monitoring**: các số theo dõi (thời gian engine, token mỗi lời gọi, tỉ lệ trúng cache, số 429 / 5xx) và xem ở đâu (theo R-09).
11. **Lỗi & suy biến**: dẫn `spec/02` §9 và `spec/01` §9, chỉ thêm "lỗi nào ghi log mức nào".
12. **Môi trường & CI/CD**: dev / prod; GitHub Actions chạy typecheck + lint + vitest; deploy từ `main`; biến môi trường dẫn `spec/03` §8.
13. **Bảo mật vận hành**: xác thực, RLS (dẫn `spec/03`), bí mật chỉ ở server, Zero-Disk, điều khoản dữ liệu Gemini (theo R-06).
14. **Giới hạn mở rộng của bản thi**: 4 nút thắt (RAM/CPU khi ingest, quota Gemini, cache RAM của 1 tiến trình, kết nối Postgres) — mỗi cái: giới hạn hiện tại (dẫn CONFIG hoặc R-xx), dấu hiệu sớm, bước mở rộng kế tiếp (dẫn sang `pitch/KIEN_TRUC_BGK.md`).

## 5. Giai đoạn 4 — Viết `pitch/KIEN_TRUC_BGK.md`

≤ 15 000 byte, viết cho BGK đọc (được giải thích lý do). Nội dung:
1. **Bảng stack theo mẫu BTC** (Frontend, Backend, AI, Database, Cache & Queue, Logging, Monitoring, Container, CI/CD, Deployment, File Storage, API Docs, Auth, Code Sandbox), 4 cột: *Chọn | Vì sao | Không chọn | Vì sao không*. Mỗi lý do dẫn R-xx hoặc file spec. Bắt buộc có: không cần sandbox chạy code (hệ thống chỉ phân tích tĩnh — dẫn spec); không có File Storage (Zero-Disk); không dùng queue ngoài ở bản thi.
2. **Lộ trình mở rộng theo bậc** (bảng + 1 sơ đồ Mermaid): Bậc 1 một tiến trình → Bậc 2 nhiều instance (sticky session hoặc cache chung Redis) → Bậc 3 tách worker ingest qua queue → Bậc 4 gọi AI qua hàng đợi giới hạn tốc độ. Mỗi bậc: dấu hiệu cần lên bậc, thay đổi trong code, hạ tầng thêm (dẫn R-11).
3. **6–8 hỏi–đáp**: sao không dùng queue; chịu được bao nhiêu người (trả lời trung thực: chưa đo, nêu nút thắt); Gemini sập / hết quota; sao không Vercel; có chạy code người dùng không; log có lộ code không; Supabase tạm dừng lúc demo thì sao.
4. **Nguồn**: danh sách URL + ngày truy cập.

## 6. Giai đoạn 5 — Sửa nhỏ

- `spec/00`: thêm D-27 trở đi (host, chuẩn log, monitoring, CI, không queue ngoài ở bản thi) vào **Mục 2 "Mặc định chờ xác nhận"** (không phải Mục 1), và Q-10 trở đi cho điểm chưa kiểm chứng. Kiểm số ID chưa bị dùng trước khi thêm.
- `spec/40` Mục 3: thêm 1 dòng dẫn sang `spec/04`. **Ghi chú (a):** Mục 3 ("lệch ABI ⇒ đổi bản `web-tree-sitter` cho khớp grammar") và Mục 10 ("dùng grammar build sẵn cùng phiên bản `web-tree-sitter`") nói hai hướng khác nhau — dựa vào R-07 chốt MỘT hướng, sửa cả hai chỗ cho khớp.
- `README.md` gốc: thêm `spec/04` vào thứ tự đọc (vai nào đọc).

## 7. Tự kiểm trước khi báo xong

Chạy ở gốc repo:
```
node "C:/Users/Admin/Desktop/hackathon-2026-tools/mmcheck/check.mjs" spec/04_KIEN_TRUC_TRIEN_KHAI.md
node "C:/Users/Admin/Desktop/hackathon-2026-tools/mmcheck/check.mjs" pitch/KIEN_TRUC_BGK.md
git status
```
Đạt khi: mọi sơ đồ OK; `git status` chỉ có thêm/đổi đúng các file ở Mục 0 (ngoài các file của agent kia); kích thước trong giới hạn. Mermaid: nhãn có ký tự đặc biệt `( ) / : <` thì đặt trong ngoặc kép `A["..."]`.

## 8. Báo cáo

Ghi cuối `TASK_04_nghien_cuu.md`, phần **D. Báo cáo**: các file đã tạo/sửa + byte; các D-xx, Q-xx đã thêm; R-xx nào CHƯA KIỂM CHỨNG; mâu thuẫn tìm thấy trong spec mà chưa sửa (vì nằm ngoài phạm vi). Không commit — người khác sẽ kiểm và commit. **Bước cuối cùng:** tạo file rỗng `DONE_TASK_04` ở gốc repo để báo đã xong.
