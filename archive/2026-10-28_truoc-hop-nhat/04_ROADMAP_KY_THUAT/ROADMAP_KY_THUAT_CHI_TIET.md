# LỘ TRÌNH KỸ THUẬT CHI TIẾT CHO 4 HƯỚNG PHÁT TRIỂN
## DỰ ÁN: SIMPLIFEY V2 PRO — CODEBASE COGNITIVE TWIN
### *Bổ sung kỹ thuật cho Phần III của `KyVong45.md`: mỗi giai đoạn cần nâng cấp công nghệ gì, bổ sung thuật toán nào, đo bằng gì*

---

| **Thuộc tính** | **Nội dung** |
| :--- | :--- |
| **Phân hệ** | `04_ROADMAP_KY_THUAT/ROADMAP_KY_THUAT_CHI_TIET.md` |
| **Căn cứ** | `00_CORE_SPEC`, `01_ENGINE_THUAT_TOAN`, `02_AI_VA_BAYES`, `03_UI_VA_KICH_BAN` |
| **Hiện trạng** | Repo mới có đặc tả + prototype HTML, **chưa có code production**. Giai đoạn 1 vì vậy gồm cả việc chuyển từ prototype sang hệ thống nhiều người dùng. |
| **Nguyên tắc** | Chỉ thêm hạ tầng khi có **ngưỡng đo được** biện minh; không hứa thuật toán mà công cụ hiện có không làm được; con số nào là ước lượng thì ghi rõ là ước lượng. |

---

# 0. CÁC QUYẾT ĐỊNH THIẾT KẾ ĐÃ CHỐT SAU PHẢN BIỆN

| # | Chủ đề | Quyết định |
| :-: | :--- | :--- |
| D1 | Hạ tầng GĐ1 | Ingestion **in-process** trong backend Node (Render/Railway/VPS), có semaphore giới hạn đồng thời. **Không** BullMQ/worker riêng. Redis chỉ cho cache đồ thị + rate limit. |
| D2 | Quan sát cho BKT | Giữ `Obs ∈ {0,1}` cho `pyBKT`; thay ngưỡng cứng 70/70 bằng **hồi quy logistic đã hiệu chuẩn** trên nhãn giảng viên. Soft evidence chỉ là hướng mở rộng tùy chọn. |
| D3 | Độ sâu Slicing | Giữ **Scoped Call-Chain Slicing**. **Không** hứa mini-PDG. Lát cắt bám biến chỉ là tùy chọn best-effort, có đo đạc. |
| D4 | LLM on-prem | Mặc định **sinh tự do + `jsonrepair` + validate schema + retry + fallback AST**; guided decoding chỉ cho trường ngắn, chọn chế độ bằng benchmark. |
| D5 | Caching LLM | **Không dùng Explicit Context Caching** cho system prompt. Dùng **Implicit Caching** (cấu trúc prompt để tiền tố tĩnh đứng đầu) + **Response Cache ở tầng ứng dụng** trên Redis. |
| D6 | Bảo mật mã nguồn B2B | **On-Premise 100%: giữ nguyên định danh** (không alpha-renaming). **Private Cloud LLM: Selective Masking** chỉ che bí mật và tên độc quyền, giữ từ vựng nghiệp vụ. |
| D7 | Hiển thị code | **Giữ Monaco Code Viewer** như các spec hiện có (`03_UI_VA_KICH_BAN`). Roadmap không thay đổi lựa chọn này. |

---

# 1. CÁC KHOẢNG TRỐNG KỸ THUẬT XUYÊN SUỐT

| # | Hiện tại (theo spec) | Vấn đề | Hướng nâng cấp |
| :-: | :--- | :--- | :--- |
| G1 | MVP đã có Postgres cho từng người học (`skill_states`, `learning_sessions`, `node_progress`, `feynman_attempts` — `00_CORE_SPEC/04_LUU_TRU_VA_DONG_BO.md`) | Chưa có lớp học / giảng viên → không làm được dashboard cả lớp, chưa đủ trường để fit BKT, không đo KPI | Mở rộng lược đồ MVP: lớp học, event log đầy đủ trường, `llm_calls` |
| G2 | BKT tham số đặt tay ($P(L_0)=0.25$, $P(T\mid\text{Correct})=0.08$, $P(T\mid\text{Incorrect})=0.03$, $P(G)=0.25$, $P(S)=0.12$), ngưỡng `core_accuracy >= 70` | Tham số "đoán" có lý do sư phạm; nhiễu của bộ chấm LLM bị coi là nhãn chắc chắn | Fit EM bằng `pyBKT`; logistic hiệu chuẩn nhãn 0/1 |
| G3 | Nối hàm bằng Two-Pass heuristic | Sai với dynamic dispatch, DI, alias, re-export; ngôn ngữ tier `STRUCTURAL` chỉ có Universal Resolver (cạnh `INFERRED`) + Relaxed Gate | Resolver chính xác hơn (LSP/SCIP) + độ tin cậy trên cạnh |
| G4 | "Slicing" thực chất là call-chain + Nominal Event Bridge | Không phải program slicing theo nghĩa Weiser (PDG) | Đổi tên đúng bản chất; tăng độ mịn best-effort, đo thay vì hứa |
| G5 | Trần 50 file / 15MB, Top 6–8 node | Không dùng được cho monorepo doanh nghiệp | Phân cụm cộng đồng + indexing tăng dần + cache theo commit SHA |
| G6 | Guardrail chỉ chặn bịa symbol + từ khóa ngoài repo | Chưa chống prompt-injection từ comment trong repo; chưa chống nhờ AI trả lời Feynman | Sanitize ngữ cảnh + tín hiệu hành vi |
| G7 | Half-life cố định $h=14$ ngày | Mọi kỹ năng/người học quên như nhau | Half-Life Regression (Settles & Meeder, 2016) |

---

# 2. GIAI ĐOẠN 1 (0–3 THÁNG) — PILOT SGU

**Mục tiêu KPI:** 2 môn, ~200 SV, giảm 60% thời gian soạn đề vấn đáp.
**Bản chất:** biến prototype thành hệ thống nhiều người dùng và **thu thập dữ liệu sạch** cho Giai đoạn 2. Chưa cần thuật toán mới lớn.

### 2.1. Nâng cấp công nghệ
- **Persistence & Auth:** giữ Supabase Postgres + Auth của MVP, thêm provider Google Workspace `@sgu.edu.vn`. Bảng mới thêm vào lược đồ MVP: `courses, enrollments, llm_calls`. Đồ thị vẫn chỉ lưu khung không chứa code (`learning_sessions.graph_skeleton`), không lưu `StaticEngineResult` đầy đủ, để giữ cam kết Zero-Disk với mã nguồn.
- **Event log append-only** (mở rộng bảng `feynman_attempts` của MVP) cho mọi lần nộp Feynman: `{student, node, skill_ids, answer_hash, core_accuracy, simplicity, latency_ms, paste_events, tier, rubric_version, model_version, ts}`. Đây là tập dữ liệu để fit BKT ở Giai đoạn 2, **phải thiết kế ngay từ bây giờ**.
- **Ingestion in-process (quyết định D1):** lúc cao điểm chỉ ~5–10 lượt nạp đồng thời (lớp thực hành ≤40 máy), mỗi lượt <15MB. Chạy trên runtime Node dài hạn, route timeout 60–120s, RAM 1–2GB. Bổ sung hai thứ rẻ tiền: (1) **semaphore ~4** (`p-limit`) với hàng chờ trong bộ nhớ, UI hiển thị "đang xếp hàng"; (2) hủy sớm khi vượt 50 file/15MB. Giữ Zero-Disk.
- **Redis chỉ cho 2 việc:** cache `graph:{repo}@{commit_sha}` (200 SV nộp chung template → parse một lần) và token-bucket rate limit. Nếu chạy 1 instance, bước đầu có thể dùng LRU trong tiến trình + bảng Postgres.
- **Ngưỡng tách worker (quyết định ở GĐ3 dựa trên log):** p95 thời gian ingest > 8s, hoặc RAM đỉnh > 70%, hoặc > 30 lượt nạp đồng thời, hoặc cần chạy > 1 instance web.
- **Giảm lời gọi LLM trùng (quyết định D5):**
  - **Response Cache ở tầng ứng dụng** trên Redis, khóa `enrich:{hash(snippet)+tier}` (và `rubric_version`). Đây mới là thứ **giảm số lời gọi**; mục tiêu >50% lời gọi trùng được xử lý ở đây.
  - **Implicit Caching của Gemini** (bật mặc định cho dòng 2.5 trở lên, không cần cấu hình): chỉ **giảm chi phí token đầu vào** khi tiền tố trùng, **không** giảm số lời gọi và không bảo đảm trúng cache. Cách tận dụng: luôn đặt phần tĩnh (system prompt, JSON Schema, few-shot) **ở đầu** payload, phần động (snippet, tier) ở cuối; thấy `cached_content_token_count` trong `usage_metadata` thì ghi vào `llm_calls`.
  - **Không dùng Explicit Context Caching** cho system prompt: có ngưỡng token tối thiểu (tài liệu Google hiện ghi khoảng 1.024–2.048 token cho Gemini 2.5 Flash tùy trang/phiên bản; các bản cũ ghi 32.768) và phát sinh phí lưu trữ cache; system prompt ~1–2K token thì lợi ích không đáng so với độ phức tạp. Kiểm tra lại tài liệu hiện hành trước khi triển khai.
- **Rate-limit & quota phía server:** Vòng 3 (10.000 token/phiên) hiện chỉ ở client nên bypass được → token-bucket theo user/IP trong Redis, ngân sách token lưu DB.
- **Tuân thủ:** màn hình đồng ý theo Nghị định 13/2023/NĐ-CP; ẩn danh `student_id` khi xuất dữ liệu nghiên cứu.

### 2.2. Thuật toán và thành phần bổ sung
1. **Bộ tạo đề vấn đáp cho giảng viên** (quyết định KPI 60%): `POST /api/generate-oral-exam`. Đầu vào: slice + `skill_states` của lớp/SV. Chọn câu hỏi bằng **tối đa hóa độ phủ kỹ năng yếu** (greedy cho hàm submodular: chọn tập $N$ câu tối đa hóa $\sum_k (1-P(L_k))$ trên các kỹ năng chưa được phủ) + **MMR** chống trùng ý; gán mức Bloom theo Tier; xuất DOCX/PDF kèm rubric và đáp án gợi ý. Vẫn đi qua Cổng Gác Nhị Phân.
2. **Dashboard giảng viên:** heatmap SV × 16 kỹ năng ($P(L)$); "điểm mù" top-k mỗi SV = node có $P(L)<0.5$ xếp theo PageRank (đã có từ Tầng 2).
3. **Phát hiện nhờ AI/chép đáp án:** tín hiệu hành vi (sự kiện paste, tốc độ gõ so với độ dài, đổi tab) + **câu hỏi truy vấn kế tiếp** dựa trên chính câu trả lời khi nghi ngờ. Chỉ gắn cờ, không tự động phạt.
4. **Sanitize ngữ cảnh chống prompt-injection:** escape/loại comment và chuỗi chứa mệnh lệnh ("ignore previous…") trước khi vào Context Sandwich; bọc snippet trong delimiter và dặn mô hình coi là dữ liệu. Thêm **Chốt 3** cho Cổng Gác: output không chứa URL/lệnh lạ.
5. **Debounce theo ngữ nghĩa:** giữ Jaccard làm bước lọc rẻ, thêm so sánh embedding để bắt diễn đạt lại cùng ý.

### 2.3. Đo lường & rủi ro
- Đo **baseline** thời gian soạn đề của GV *trước* pilot — không có baseline thì con số 60% không bảo vệ được. Thêm: SUS/NPS, tỉ lệ Gate reject, chi phí token thực tế/SV, tỉ lệ trúng Response Cache.
- Repo SV viết bằng ngôn ngữ chưa có resolver riêng (PHP/C#…) → vẫn dựng đồ thị ở tier `STRUCTURAL` kèm huy hiệu "độ tin cậy thấp"; chỉ ngôn ngữ **không có grammar** mới hiển thị thông báo "chưa hỗ trợ" rõ ràng thay vì đồ thị rỗng.

---

# 3. GIAI ĐOẠN 2 (3–6 THÁNG) — ĐATN & PAPER

**Mục tiêu KPI (gốc):** AUC ≥ 0.82, RMSE ≤ 0.28, giảm 45% điểm mù kiến trúc. **Đây là giai đoạn nặng thuật toán nhất.**

### 3.1. Mô hình hóa người học (BKT)
- **Fit EM (Baum-Welch)** bằng `pyBKT` trên log Giai đoạn 1, theo từng kỹ năng. Ràng buộc chống suy biến: $P(G)+P(S)<1$, $P(G)\le0.3$, $P(S)\le0.3$.
- **Ablation:** BKT chuẩn → BKT + Forgetting (Khajah 2016) → Individualized BKT (Yudelson 2013); baseline PFA và Elo/IRT 1PL; DKT/SAKT làm cận trên. Với ~200 SV, dữ liệu ít, kỳ vọng BKT ngang hoặc hơn — đó là luận điểm "minh bạch mà vẫn chính xác". Kiểm tra phiên bản `pyBKT` có hỗ trợ `forgets`/`multilearn`/`multiprior` trước khi cam kết ablation.
- **Thay ngưỡng cứng 70/70 (quyết định D2):** `pyBKT` chỉ nhận $\text{Obs}\in\{0,1\}$. Huấn luyện **hồi quy logistic 2 đặc trưng** (`core_accuracy`, `simplicity`) trên ≥300 câu do GV chấm → $P(\text{Obs}=1)$, chọn ngưỡng tại điểm vận hành tối ưu (F1 hoặc Youden) rồi xuất nhãn 0/1. Nhiễu LLM được **$P(G)$, $P(S)$ của EM hấp thụ** — cách làm chuẩn và đủ cho ĐATN.
  - Tập hiệu chuẩn phải **tách** khỏi tập đánh giá AUC (chống rò rỉ).
  - AUC của BKT đo khả năng dự đoán **nhãn do LLM chấm**, không phải "mức làm chủ thật" → cần tiêu chí ngoài: tương quan $P(L)$ với kết quả **vấn đáp có người chấm**.
  - Câu hỏi gắn 2 kỹ năng (`target_skills`) → nhân bản dòng cho mỗi kỹ năng khi fit.
  - *Tùy chọn, ngoài đường găng:* soft evidence — cập nhật online chỉ là trộn likelihood theo $q$; phần khó là fit EM, nếu làm thì tối ưu likelihood forward bằng `scipy.optimize`, không viết lại Baum-Welch.
- **Half-Life Regression** thay $h=14$: $h = 2^{\theta\cdot x}$, đặc trưng gồm số lần đúng/sai, độ khó kỹ năng, khoảng cách ôn; dùng để lập lịch ôn tập.
- **Kiểm định q-Matrix:** hiện spec chỉ nêu vài kỹ năng ($k_1,k_5,k_7,k_{16}$). Cần (i) taxonomy đủ 16 kỹ năng có định nghĩa vận hành; (ii) 2 chuyên gia gán $q$, tính **Cohen's κ**; (iii) so sánh log-likelihood khi bỏ/thêm một kỹ năng khỏi $q$.

### 3.2. Hiệu chuẩn bộ chấm Feynman (LLM-as-judge)
- Tập vàng ≥300 câu, **2 GV chấm độc lập**; báo **Quadratic Weighted κ ≥ 0.7** giữa LLM–người và người–người.
- Giảm nhiễu: self-consistency $n=3$ lấy median; few-shot anchor 60/80/95; kiểm tra verbosity bias; thử judge thứ hai (model khác).
- Ghi `rubric_version` + `model_version` để tái lập.

### 3.3. Đánh giá Slicing (quyết định D3)
- **Giữ Scoped Call-Chain làm xương sống** (Controller → thân hàm Service → lời gọi DB). Tree-sitter chỉ cho cú pháp: không có kiểu, alias, con trỏ hay CFG nên **không hứa mini-PDG**.
- **Thuật ngữ:** call-chain slicing không phải program slicing theo nghĩa Weiser. Trong ĐATN/paper gọi là **"Scoped Call-Chain Slicing"** (hoặc "architectural slicing") và nêu rõ khác biệt.
- **Tùy chọn tăng độ mịn — lát cắt bám biến best-effort:** duyệt **AST** (không Regex trên text, vì Regex không phân biệt phạm vi/chuỗi/comment): thu binding từ `variable_declarator`, `assignment_expression`, bóc đệ quy `object_pattern/array_pattern`; lập chuỗi def→use trong thân hàm; nối tham số sang hàm được gọi nếu resolve được. Gặp tái gán trong nhánh/vòng lặp, alias, spread, `eval`/dynamic key → **mở rộng thành cả câu lệnh/hàm** và hạ độ tin cậy; không resolve được → **fallback cả hàm**.
- **Đo thay vì hứa:** báo tỉ lệ hàm áp dụng được, mức giảm số dòng trung bình, độ phủ so với nhãn tay. Lợi ích không rõ thì ghi nhận là kết quả âm.
- **Bộ nhãn tay 30–40 repo SV** (2 người gán slice "đúng"): đo precision/recall cạnh gọi hàm và overlap slice, so với (a) Aider-style repo-map, (b) gom theo thư mục. Đây là bằng chứng thực nghiệm cho luận điểm "Inverse EdTech".
- **Độ tin cậy cạnh:** import tĩnh = 1.0; qua `InterfaceImplMap` = 0.8; heuristic theo tên = 0.5. UI vẽ nét đứt cho cạnh < 0.8; Relaxed Gate dùng ngưỡng này thay vì cờ bật/tắt theo ngôn ngữ.
- Dùng số Super-Node từ Tarjan SCC làm đặc trưng "độ khó" của node.

### 3.4. Thiết kế thí nghiệm
- **Architecture Blindspot Rate** = (số node SV không giải thích được trong vấn đáp có người chấm) / (tổng node trong slice). Ground truth là vấn đáp người chấm, **không** dùng điểm của hệ thống (tránh vòng tròn).
- A/B ngẫu nhiên (SimpliFey vs tự học); power analysis ($d=0.5$, $\alpha=0.05$, power $0.8$ ⇒ khoảng 64 SV/nhóm — ước lượng); phân tích **ANCOVA** với pre-test làm hiệp biến.
- Đánh giá BKT bằng cross-validation **tách theo SV**. Báo AUC, RMSE, log-loss, **ECE**, khoảng tin cậy bootstrap.

### 3.5. Điều chỉnh KPI đề xuất
- AUC ≥ 0.82 là rất cao so với văn liệu BKT (thường khoảng 0.70–0.78, ước lượng). Đề xuất: "**AUC cao hơn baseline PFA/Elo có ý nghĩa thống kê, mục tiêu ≥ 0.78, kéo giãn 0.82**".
- Định nghĩa Blindspot Rate theo Mục 3.4 trước khi báo con số 45%.

---

# 4. GIAI ĐOẠN 3 (6–12 THÁNG) — THƯƠNG MẠI HÓA

**Mục tiêu KPI:** 1.000 MAU; 2 doanh nghiệp On-Premise; chi phí vận hành < $15/tháng.

## 4A. B2C — Pro Mock Defense
- **Hội thoại Socratic nhiều lượt:** FSM hội thoại (Zustand hoặc XState) PROBE → FOLLOW_UP → CHALLENGE → CLOSE; mỗi lượt vẫn qua Cổng Gác.
- **Chọn câu hỏi kế tiếp theo Computerized Adaptive Testing:** chọn câu **tối đa hóa giảm entropy kỳ vọng** của phân phối $P(L)$ trên 16 kỹ năng, thay cho thang Tier theo ngưỡng. Với BKT 2 trạng thái tính được dạng đóng, vẫn 0 token.
- **Mô phỏng hội đồng:** 3 persona (khắt khe / hiệu năng / bảo mật) = 3 system prompt + bộ kỹ năng ưu tiên; xuất báo cáo sau buổi bảo vệ.
- **Giọng nói:** Web Speech API → Whisper/Gemini audio; tốc độ nói/ngập ngừng chỉ là tín hiệu phụ, **không** đưa vào BKT.
- **Repo riêng tư:** GitHub App/OAuth quyền fine-grained `contents:read`, token chỉ sống trong bộ nhớ; vẫn stream, không ghi đĩa.
- **Thanh toán & quan sát:** PayOS/VNPay/MoMo + Stripe, bảng `subscriptions` + webhook idempotent; OpenTelemetry + Langfuse.
- **Chi phí:** con số "$110–120/tháng cho 1.000 MAU" (KyVong45) hiện chỉ tính token. Tách "chi phí LLM biên/người dùng" (ước lượng ≈ $0.03/phiên, `00_CORE_SPEC/01_TONG_QUAN_KIEN_TRUC.md` Mục 5) khỏi "chi phí hạ tầng cố định" (Postgres, Redis, hosting) để không bị bắt bẻ; cập nhật con số khi có số đo thật từ pilot.

## 4B. B2B — Developer Onboarding On-Premise
**Đóng gói:** Docker Compose/Helm gồm `web`, `postgres`, `redis`, (`worker` chỉ khi vượt ngưỡng ở Mục 2.1) và LLM nội bộ (vLLM/Ollama, ví dụ Qwen2.5-Coder).

**Đầu ra có cấu trúc trên LLM nội bộ (quyết định D4)** — chọn bằng benchmark trên phần cứng thật của khách (1 GPU 24GB hoặc CPU):
- **(A) Mặc định:** few-shot ép JSON → `jsonrepair` sửa cú pháp → **validate bằng zod/ajv** (`jsonrepair` chỉ sửa cú pháp, không bảo đảm đúng kiểu/trường) → retry 1 lần → vẫn lỗi thì **fallback câu hỏi AST** của Cổng Gác. Cổng Gác vẫn chạy sau cùng.
- **(B) Guided cho trường ngắn:** `target_skills`, `severity`, `question_type`.
- **(C) Guided toàn schema:** chỉ bật nếu benchmark cho thấy overhead chấp nhận được (ngưỡng đề xuất < ~15%) và **cache grammar đã biên dịch** (xgrammar/llguidance).
- Mức tụt tốc độ khi guided toàn schema là **giả thuyết cần đo**, không viết thành sự thật.
- **Nút thắt chính là độ dài đầu ra:** `_internal_reasoning` + 3 `candidate_probes` khiến mô hình nhỏ sinh rất nhiều token. Giảm bằng: schema rút gọn (bỏ `candidate_probes`, giữ 1 dòng lý do); **Two-Stage Prompting** (X-Ray tự do ngắn, rồi câu hỏi Socratic nhỏ); stream từng trường lên UI và dùng lại Speculative Pre-fetching; lượng tử hóa AWQ/GGUF Q4; prefix caching của vLLM; Response Cache theo `hash(snippet)+tier`.
- Đo lại chất lượng hỏi-đáp và tỉ lệ Gate reject so với Gemini Flash; đặt mục tiêu p95 độ trễ `enrich-node` (ví dụ ≤ 8s) trước khi cam kết với khách.

**Bảo vệ mã nguồn theo mô hình triển khai (quyết định D6):**

| Mô hình | Xử lý | Lý do |
| :--- | :--- | :--- |
| **On-Premise 100%** (vLLM/Ollama trong LAN) | **Giữ nguyên định danh.** Không alpha-renaming, không xóa comment/chuỗi. | Dữ liệu không rời mạng nội bộ; ngữ nghĩa nghiệp vụ (`updateStock`, `checkout`) là nguyên liệu để sinh ẩn dụ Feynman ("bồi bàn chạy vào bếp"). |
| **Private Cloud LLM bên ngoài** | **Selective Masking cục bộ:** quét bí mật (gitleaks-style regex + Shannon entropy), API key, token, email, domain nội bộ, và **danh sách tên độc quyền do khách cung cấp** (tên dự án, tên sản phẩm); giữ nguyên danh/động từ nghiệp vụ chung (`order`, `checkout`, `stock`, `user`). | Che đúng thứ nhạy cảm mà vẫn giữ ngữ nghĩa để câu hỏi Feynman còn chất lượng. |

- **Không** alpha-renaming hàng loạt (`calcCommission → fn_07`): làm mất ngữ nghĩa, mô hình không thể ví von.
- Không xóa nguyên chuỗi literal: câu SQL như `UPDATE inventory SET stock = stock - ?` mang ngữ nghĩa cần thiết; chỉ che phần là bí mật/định danh độc quyền.
- Giữ bảng ánh xạ ngược cục bộ để khôi phục phần đã che khi hiển thị. **Chốt 1 của Cổng Gác đối chiếu theo tên đã che.**
- Regex không bắt được mọi định danh độc quyền → cho phép khách cấu hình danh sách từ cấm/che và có chế độ **xem trước payload** trước khi gửi ra ngoài.

**Bảo mật doanh nghiệp:** SSO SAML/OIDC, RBAC, audit log bất biến, SBOM + ký image (cosign), chế độ air-gapped.

**Mở rộng quy mô repo (bỏ trần 50 file):**
- Indexing tăng dần theo commit, tái dùng cache theo blob hash.
- **Phân cụm cộng đồng (Louvain/Leiden)** trên đồ thị gọi hàm tạo "vùng nghiệp vụ"; PageRank chạy trong từng cụm; giữ ngân sách 6–8 node ở mức tổng quan và drill-down vào cụm con (mở rộng Sub-graph Expand).
- Adapter ingestion chung `Source.fetchTree(ref)` cho GitLab/Bitbucket/Azure DevOps.

**Thuật toán riêng cho onboarding:** hotspot = churn × cognitive complexity từ `git log` (kiểu Tornhill); bản đồ sở hữu tri thức từ `git blame` + bus factor theo module; lộ trình 3 ngày = sắp xếp topo trên DAG + chọn tập node tối đa hóa giá trị trong ngân sách thời gian (knapsack có ràng buộc tiên quyết), bỏ qua node Fast-Track ($P(L)\ge0.85$).

**Đánh giá:** time-to-first-meaningful-PR và điểm bài kiểm tra kiến trúc cuối tuần đầu, nhóm dùng vs không dùng.

---

# 5. GIAI ĐOẠN 4 (DÀI HẠN) — HỆ SINH THÁI DEVTOOL

**Mục tiêu KPI:** VS Code & JetBrains, API kiểm toán kiến trúc cho CI/CD, 5 ngôn ngữ, 10.000 lượt tải.

### 5.1. Kiến trúc dùng lại lõi
- **Tách `simplifey-core`** (TypeScript, không phụ thuộc UI/Next.js): ingestion adapter → parse → graph → slice → metrics → BKT. Các bên còn lại là client mỏng gọi lõi qua **JSON-RPC (kiểu LSP)**: Web, VS Code, JetBrains, CI.
- **VS Code:** lõi chạy trong extension host (Node); webview tái dùng bundle **ReactFlow + Monaco Code Viewer** (Monaco vốn là editor của VS Code); BKT lưu cục bộ ở `globalState`, đồng bộ cloud tùy chọn.
- **JetBrains:** plugin Kotlin gọi lõi như sidecar Node qua JSON-RPC (ra bản đầu nhanh nhất); chỉ viết lại bằng PSI nếu có nhu cầu.
- **Resolver chính xác nhờ IDE:** thay Two-Pass heuristic bằng `vscode.executeDefinitionProvider/ReferenceProvider` (LSP) hoặc chỉ mục **SCIP** (có indexer cho TS, Java/Kotlin, Python, Go); heuristic giữ làm fallback. Đo cải thiện bằng bộ nhãn tay ở Giai đoạn 2.
- **Phân tích tăng dần khi gõ:** tree-sitter incremental parse (`tree.edit` + reparse), file watcher, debounce 300–500ms, chỉ tính lại slice chứa file đổi.

### 5.2. "Cognitive Architecture Audit" cho CI/CD
- **Chạy theo diff:** với mỗi PR, xác định slice bị chạm (đồ thị trước/sau) và tính **delta chu trình** (Tarjan SCC mới?), **delta $D=|A+I-1|$** (cảnh báo nếu rơi vào `ZONE_OF_PAIN`), và **rủi ro tri thức** (slice bị sửa mà ít hơn $N$ người đạt $P\ge0.85$ ⇒ gắn nhãn cần reviewer am hiểu).
- **Luật kiến trúc khai báo** kiểu ArchUnit (`layer(controller) may not call layer(repository)`), chỉ kiểm tra trên cạnh có độ tin cậy ≥ ngưỡng.
- **Đầu ra:** SARIF 2.1 (GitHub Code Scanning), bình luận PR, GitHub Action / GitLab CI template.

### 5.3. Hỗ trợ đa ngôn ngữ theo tầng (Language Registry)

Mục tiêu không phải "chỉ 5 ngôn ngữ" mà là **mọi ngôn ngữ có grammar Tree-sitter**, chia hai tầng (xem `01_ENGINE_THUAT_TOAN/02_AST_SLICING_GRAPH.md` §3.0 và Thao tác 2b):

- **Tầng nền `STRUCTURAL` (mặc định cho mọi ngôn ngữ có grammar):** thêm ngôn ngữ = thêm file `.wasm` + `.scm`, không viết code thuật toán. Symbol chính xác (từ AST); cạnh suy luận bằng Universal Resolver, gắn `confidence: INFERRED`, UI vẽ nét đứt, **không đảm bảo 100%**.
- **Tầng `RESOLVED` (nâng cấp có chọn lọc):** viết thêm `importResolver` riêng cho ngôn ngữ phổ biến ⇒ cạnh và lát cắt chính xác cao. Khởi điểm: TS/JS, Python, Java, Go, Dart. Ứng viên tiếp theo theo mức phổ biến trong đồ án SV: C#, PHP, Kotlin, Rust.
- Tiêu chí nâng tầng: ngôn ngữ đạt **conformance test** (precision/recall cạnh trên bộ nhãn tay) vượt ngưỡng đã đặt trước.

Độ khó riêng của 5 ngôn ngữ khởi điểm khi nâng độ chính xác:

| Ngôn ngữ | Thách thức | Xử lý |
| :--- | :--- | :--- |
| Java | DI Spring (`@Autowired`, interface→impl) | Mở rộng `InterfaceImplMap` bằng quét annotation + `@Qualifier`/`@Primary` |
| Go | Interface thỏa mãn ngầm | So khớp **method-set** của struct với interface |
| Python | Decorator định tuyến (FastAPI/Flask), duck typing | Bắt decorator làm `ENTRY_POINT`; cạnh duck-typing độ tin cậy thấp |
| Dart | Cầu BLoC/Provider/Riverpod ngoài `on<Event>` | Mở rộng Nominal Event Bridge cho từng thư viện state |
| TypeScript | Path alias, re-export, barrel file | `tsconfig` project references / TS compiler API |

Mọi ngôn ngữ dùng grammar tree-sitter + truy vấn `tags.scm`/`.scm` của adapter (không còn Regex fallback theo tên ngôn ngữ); bộ **conformance test** (repo mẫu + kết quả mong đợi) chạy trong CI trước mỗi bản phát hành.

### 5.4. Phân phối & đo KPI
Telemetry **opt-in**, ẩn danh; theo dõi retention D7/D30 chứ không chỉ lượt tải; WASM đóng gói trong bundle và nạp lười theo ngôn ngữ thực sự có trong repo, bundle gọn vì ảnh hưởng đánh giá trên Marketplace.

---

# 6. BẢNG TỔNG HỢP

| Giai đoạn | Công nghệ mới | Thuật toán mới | Mức ưu tiên |
| :---: | :--- | :--- | :--- |
| **1** | Mở rộng Postgres của MVP (lớp học, `llm_calls`), đăng nhập Google SGU, Redis (cache đồ thị + rate limit + response cache), ingestion in-process có semaphore | Greedy submodular + MMR chọn đề; phát hiện gian lận hành vi; chống prompt-injection | **Cao** — không có dữ liệu thì GĐ2 không làm được |
| **2** | `pyBKT`, công cụ ghi thí nghiệm (MLflow/Langfuse) | EM-BKT, BKT+Forgetting, logistic hiệu chuẩn nhãn 0/1, HLR, κ/QWK, ANCOVA, lát cắt bám biến best-effort, edge confidence | **Cao nhất** — nền cho paper và mọi bước sau |
| **3A** | XState, STT mạnh hơn, PayOS/Stripe | CAT bằng expected information gain | Trung bình |
| **3B** | Docker/Helm, vLLM/Ollama, `jsonrepair`+zod, SSO | Leiden, hotspot churn×complexity, bus factor, knapsack lộ trình, Selective Masking | Cao nếu theo đuổi B2B |
| **4** | `simplifey-core` + JSON-RPC, LSP/SCIP, SARIF, GitHub Action | Incremental parse, delta-D/delta-SCC, luật kiến trúc, method-set matching (Go), DI resolution (Java) | Trung bình — phụ thuộc kết quả GĐ3 |
