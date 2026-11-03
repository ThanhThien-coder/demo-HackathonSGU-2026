# HỌP CHỐT — tối 29/10/2026

> Điền cột **Chốt** (✅ đồng ý đề xuất · ✏️ đổi thành … · ❌ bỏ). Giải thích chi tiết: `CHOT_MUC2_29-10.md` (Mục C = giải thích khái niệm). Họp xong đưa file này cho Claude để viết TASK_05.
> 🟢 = chỉ cần gật · 🟡 = cần bàn · 🔴 = quan trọng, ảnh hưởng nhiều file
>
> **Lưu ý `spec/01` mới** (commit `83ac385`, đã push): luồng học node được viết chi tiết lại — 1 lượt = n câu (1 câu / kỹ năng chưa thạo), tải lại trang thì trả lại đúng lượt đang dở, câu hỏng ⇒ `DROPPED`, "Bỏ qua" ⇒ `/api/reveal`, "Báo sai" ⇒ 🚩. Phần này **khớp** với 3.5, 3.8, 4.2. Nhưng nó **còn nhánh Fast-Track và `REMEDIATION`** ⇒ đụng 3.2, 3.4, 4.3 và sinh thêm câu 3.9.

## 0. KẾT QUẢ HỌP (tối 29/10)

| Trạng thái | Mục |
| :-- | :-- |
| ✅ Chốt theo đề xuất | 1.1 · 1.2 · 1.4 · 1.5 · 1.7 · 1.9 (MIT/Apache, xem thể lệ) · 3.2 · 3.6 · 3.9 · 4.3 · 4.4 · 5.2 · 5.3 · (đã gật trước: 2.1 · 2.2 · 2.5 · 2.6 · 2.9 · 2.10 · 3.1 · 3.7 · 3.8 · 4.5) |
| ✏️ Chốt khác đề xuất | **1.3** dùng **Pino** · **1.8** bỏ BYOK khỏi cả roadmap · **2.7** không làm ô "Thư mục" · **2.8** `MAX_CLEAN_FILES` = **100**, chỉnh sau khi chạy thử · **2.12** không ghi "chọn trước, tải sau" · **3.3** demo hướng **(b)**: khoe cổng gác chặn câu AI bịa tên · **3.4** bỏ viền cam; **thay bằng cách hiển thị kỹ năng đang mài mòn kiểu Duolingo** · **3.5** giữ "Học lại từ đầu" nếu đơn giản, khó thì bỏ · **4.1** **bỏ vé chấm bài** (challenge token) · **5.5** rút gọn `spec/03` |
| ⏳ Chưa chốt | 1.6 (chưa hiểu) · 2.3 · 2.4 · 2.11 · 4.2 (chờ bạn kia đọc) · 4.6 (xem lại theo định hướng mới) · 5.1 · 5.6 · 5.7 · Mục 6 (để sau) |

## 1. Định hướng & hạ tầng

| # | Câu hỏi | Đề xuất | Chốt |
| :-: | :-- | :-- | :-- |
| 1.1 🔴 | Định hướng sản phẩm | **Mã nguồn mở cho cộng đồng + nghiên cứu học thuật (AI ảo giác, AI chấm bài, BKT) + CV.** Không theo thương mại hóa, không bán cho trường. Người dùng tự clone + điền key của họ (như Aider). | |
| 1.2 🔴 | Host (D-27) | **Vercel free**, region `sin1`. Hệ quả: cache RAM không giữ được (mất ⇒ tải lại zip theo SHA, chậm vài giây); **upload zip ≤ 4,5 MB** (dán link GitHub không bị giới hạn). Bỏ Railway / Heroku / Azure. | |
| 1.3 🟢 | Log (D-28) | Tự viết hàm `log()` ~15 dòng in JSON, **không dùng Pino**; cấm ghi code, khóa API, câu trả lời người học. | |
| 1.4 🟢 | Monitoring (D-29) | Log + Observability có sẵn của Vercel + dashboard Supabase. | |
| 1.5 🟢 | CI/CD (D-30) | Vercel tự deploy khi vào `main` (+ link preview mỗi PR); GitHub Actions chạy typecheck + lint + test. | |
| 1.6 🟡 | Queue / tải ngầm (D-31) | Không Redis / queue. **Client tự tải trước 1–2 node kế tiếp**, lần lượt (không tải tất cả: dễ lỗi 429 Gemini free, tốn token). | |
| 1.7 🟢 | Lệch ABI Tree-sitter (D-32) | Đổi bản `web-tree-sitter`, không tự build grammar. | |
| 1.8 🟢 | BYOK (ô nhập API key) | **Không làm ở bản thi**; bản thi dùng 1 key của nhóm. Bản self-host tự có BYOK qua `.env`. | |
| 1.9 🟡 | Giấy phép mã nguồn | MIT (đơn giản nhất) hoặc Apache-2.0. Xem `references/thele.md` về quyền sở hữu sản phẩm thi trước. | |

## 2. Engine — bản đồ code (Người 2)

| # | Câu hỏi | Đề xuất | Chốt |
| :-: | :-- | :-- | :-- |
| 2.1 🟢 | D-06 node = 1 chức năng xuyên nhiều file | Giữ. | ✅ (đã gật) |
| 2.2 🟢 | D-07 dây nối | Nối khi **dùng chung hàm**; "dễ hơn" = độ phức tạp engine đếm. Node không chung hàm với ai ⇒ đứng riêng, mở từ đầu. | ✅ (đã gật) |
| 2.3 🟡 | D-08 mã node cố định | **Giữ** — chỉ là cách đặt tên (~5 dòng), không thêm truy vấn DB; bỏ thì mở lại phiên mất khớp tiến độ. | |
| 2.4 🟡 | D-09 Hub chỉ chọn trong file cửa vào | Giữ. **Người 2 đọc giải thích** (`CHOT_MUC2` Mục C). | |
| 2.5 🟢 | D-10 engine tất định | Giữ (giới hạn theo số file, không theo thời gian; có `engine_version`). | ✅ (đã gật) |
| 2.6 🟢 | D-11 link | **Chỉ link gốc repo + nhánh mặc định**; link có `/tree/...`, `/blob/...` ⇒ tự cắt, hiện ghi chú. Bảng ví dụ: `CHOT_MUC2` Mục D. | ✅ (đã gật) |
| 2.7 🟡 | Ô "Thư mục" (không bắt buộc) cạnh ô link | **Có** — repo to học từng phần, ví dụ `backend/src/orders`. Rẻ, không cần đoán nhánh. | |
| 2.8 🟡 | Nâng `MAX_CLEAN_FILES` (đang 50) | **Đo ở H+8** với repo thật của nhóm (50 / 100 / 200 file), chọn mức lớn nhất còn kịp mục tiêu thời gian. Không tốn token AI. | |
| 2.9 🟢 | D-12 Capstone = node khó nhất | Giữ. | ✅ (đã gật) |
| 2.10 🟢 | D-19 danh sách tên có thật (chạy ngầm, chặn AI bịa tên) | Giữ. | ✅ (đã gật) |
| 2.11 🟡 | D-24 node nhóm "Thuật toán" + chặng `vnode-*` | Giữ. **Người 2 đọc giải thích** (`CHOT_MUC2` Mục C). | |
| 2.12 🟡 | Repo lớn sau thi | Ghi vào roadmap: **"chọn trước, tải sau"** (lấy danh sách file qua GitHub API ⇒ chỉ tải file cần). | |

## 3. AI & BKT (Người 3)

| # | Câu hỏi | Đề xuất | Chốt |
| :-: | :-- | :-- | :-- |
| 3.1 🟢 | D-13 luật Đạt | Giữ; người học viết tự do, **AI** phải chỉ ra câu nào trong bài thể hiện ý — **so khớp lỏng** (đoạn con, sau chuẩn hóa). | ✅ (đã gật) |
| 3.2 🔴 | **Bỏ Fast-Track** (+ bỏ D-21 persona `SENIOR_ACTIVE`) | Bỏ. BKT vẫn dùng để **chọn hỏi kỹ năng nào** + hiển thị danh hiệu (D-20). **Phải chọn đoạn thay cho kịch bản demo phút 3:20–3:50** (xem 3.3). ⚠️ `spec/01` Mục 5 (mới) có nhánh "kế hoạch rỗng ⇒ Fast-Track, node miễn thi" và bảng Mục 6 có dòng `AVAILABLE → COMPLETED (Fast-Track)` ⇒ phải gỡ + cần câu 3.9. | |
| 3.3 🔴 | Demo phút 3:20–3:50 thay bằng gì | Gợi ý: (a) 2 người học khác nhau mở **cùng 1 node** ⇒ nhận **câu hỏi khác nhau** theo kỹ năng yếu riêng (khoe BKT); hoặc (b) khoe cổng gác chặn 1 câu AI bịa tên. | |
| 3.4 🔴 | Bỏ ôn tập (D-25, run `REMEDIATION` / `DECAY_REVIEW`) | Bỏ. Node đỏ để đỏ. Hỏi thêm: **giữ viền cam "đang quên dần"** (chỉ hiển thị, không có nút ôn)? Đề xuất: giữ. ⚠️ `spec/01` mới còn nhắc `REMEDIATION` (lượt tối đa riêng, "không trừ BKT", "đã ôn đạt" trong chuyển `FAILED → COMPLETED`) ⇒ gỡ. | |
| 3.5 🟡 | "Học lại từ đầu" | Nút tạo **phiên mới** cho cùng repo: tiến độ node làm lại, **điểm kỹ năng giữ nguyên**, câu hỏi mới. | |
| 3.6 🔴 | D-15 cache kết quả AI | **Giữ cache phân tích node + tổng quan** (giống nhau với mọi người, đỡ token, đỡ lỗi 429 lúc demo, dùng cho offline). **Bỏ cache câu hỏi.** Chấm bài không bao giờ cache. | |
| 3.7 🟢 | D-20 danh hiệu, D-23 prompt chấm nhận đủ dữ liệu | Giữ. | ✅ (đã gật) |
| 3.8 🟢 | D-22 "Báo sai" | Giữ; dò lại bằng câu trả lời đã lưu trong DB (`question_attempts.student_answer`), không ghi vào log. `spec/01` mới đã viết chi tiết (🚩, hoàn điểm kỹ năng) — khớp. | ✅ (đã gật) |
| 3.9 🔴 | **Bỏ Fast-Track rồi thì khi kế hoạch câu hỏi rỗng** (mọi kỹ năng của node đã thạo) làm gì? | Đề xuất: **vẫn hỏi 1 câu cho kỹ năng có điểm thấp nhất của node** ⇒ không còn trường hợp "miễn thi", không cần `run_id null`. Người giỏi vẫn được luyện (đúng lý do bỏ Fast-Track). | |

## 4. Lưu trữ & luồng (Người 1)

| # | Câu hỏi | Đề xuất | Chốt |
| :-: | :-- | :-- | :-- |
| 4.1 🟡 | D-14 "vé chấm bài" (challenge token) | **Giữ** — trên Vercel càng cần (server không giữ được code trong RAM). Người 1 đọc giải thích. | |
| 4.2 🟡 | D-16 lượt học | Giữ; bỏ ôn tập ⇒ mỗi node 1 lượt / phiên. Người 1 đọc giải thích. | |
| 4.3 🟡 | D-17 biên nhận khi DB lỗi + `sync/replay` | **Cắt luôn từ đầu** (vốn nằm trong danh sách "cắt nếu trễ" `spec/40` Mục 6 thứ 4). DB lỗi ⇒ báo "Thử lại". ⚠️ `spec/01` Mục 6 còn ghi `sync/replay` trong bảng chuyển trạng thái ⇒ gỡ nếu cắt. | |
| 4.4 🟢 | D-18 kiểm trước khi gọi AI chấm | Giữ (kiểm phiên, câu hỏi, số lượt, vé, quota, DB trước ⇒ lỗi thì không tốn token). | |
| 4.5 🟢 | D-26 repo đổi | Commit mới ⇒ bản đồ / phiên mới. Phiên đang học luôn **tải zip theo đúng commit SHA**. Bỏ nhánh "repo đã thay đổi". | ✅ (đã gật) |
| 4.6 🟡 | Liên kết tài khoản GitHub | **Cắt luôn từ đầu** (thứ 8 trong `spec/40` Mục 6), chỉ dùng tài khoản khách. | |

## 5. Tài liệu & quy trình

| # | Việc | Đề xuất | Chốt |
| :-: | :-- | :-- | :-- |
| 5.1 🟢 | TASK_05 (Antigravity, 1 phiên) | Áp dụng mọi dòng đã chốt ở 1–4 vào spec + sửa 3 lỗi TASK_04 (số bịa, số ngoài CONFIG, pitch > 15 KB). | |
| 5.2 🟢 | Pitch phải sửa | `KICH_BAN_DEMO` (đoạn Fast-Track) · `PHAN_BIEN_BGK` dòng 58 (link thư mục con) + dòng 76 (câu A1 nhắc Fast-Track / ôn) + thêm hỏi-đáp "lấy gì duy trì" · `ROADMAP` đổi trục sang mã nguồn mở + nghiên cứu · `KIEN_TRUC_BGK` Railway → Vercel. | |
| 5.3 🟡 | Cấu trúc file cho AI (`DE_XUAT_cau_truc_AI.md`) | Làm: `AGENTS.md` + `.agents/rules/` + `.ai/` + `.gitignore`. | |
| 5.4 🟢 | Thư mục tools | Chuyển `hackathon-2026-tools` vào `.ai/tools/` thay vì xóa. | |
| 5.5 🟢 | Rút gọn `spec/03` (36,5 KB) | Không bắt buộc — bỏ qua nếu thiếu thời gian. | |
| 5.6 🔴 | Gộp vào `main` | Sau khi TASK_05 commit, **trước khi chốt spec 30/10**. | |
| 5.7 🟡 | Commit `83ac385` (20:17, đã push) đưa lên git cả **file nháp** (`CHOT_MUC2`, `DE_XUAT`, `HANDOFF`, `TASK_04_*`) và **TASK_04 còn 3 lỗi** | Không hoàn tác. TASK_05 sửa lỗi; xong TASK_05 thì **xóa file nháp** khỏi repo (hoặc chuyển `archive/`) trong cùng commit. Lần sau: chỉ add từng file spec, không add file nháp. | |

## 6. Ngoài repo — ai nhận?

| # | Việc | Người nhận |
| :-: | :-- | :-- |
| 6.1 | Áp phích (10% điểm vòng thử thách) | |
| 6.2 | Tạo tài khoản Supabase + Vercel; lấy Gemini API key và **gọi thử 1 lần** (Q-01 / Q-11: model nào còn dùng được) | |
| 6.3 | Chia vai cho 5 người (spec đang viết cho 3 vai: Người 1 UI + API · Người 2 Engine · Người 3 AI + BKT) | |
| 6.4 | Hỏi BTC Q-02b (thời lượng demo) | |
