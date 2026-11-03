# BÁO CÁO KIỂM TOÁN TÀI LIỆU TOÀN DIỆN & PHÂN CÔNG ĐỘI HÌNH 3 NGƯỜI (AUDIT REPORT)
## DỰ ÁN: SIMPLIFEY V2 PRO — CODEBASE COGNITIVE TWIN
### *Vai trò: Principal Software Architect & Technical Auditor*

---

| **Thuộc tính** | **Thông số kiểm toán** |
| :--- | :--- |
| **Phân hệ** | `00_CORE_SPEC/00_AUDIT_VA_PHAN_VIEC_3_NGUOI.md` |
| **Mục đích** | Rà soát 8 file đặc tả chính trong 4 phân hệ (`00` đến `03`), vạch trần mâu thuẫn và giao việc cụ thể. Các file tổng hợp/đối chiếu khác: `Kich_Ban_UseCase.md` (chỉ đồng bộ từ file nguồn), `03_SYSTEM_EDGE_CASES_AUDIT.md`, `BAO_CAO_THAM_DINH_GIAM_KHAO.md`, `KyVong45.md`, Roadmap |
| **Cập nhật gần nhất** | 2026-10-28 — đồng bộ toàn bộ spec: contract hợp nhất, bảng số liệu chuẩn (`01_TONG_QUAN_KIEN_TRUC.md` Mục 5), Gate v2, `challenge_token`, decay tính khi đọc, soft-bypass, bỏ Intent Router |
| **Quy tắc kiểm toán** | **Thẳng thắn, Zero Hand-waving, Chuẩn hóa 5 Mục hành động** |
| **Đội hình phân bổ** | **NGƯỜI 1** (Lead / UI), **NGƯỜI 2** (Static Engine), **NGƯỜI 3** (AI & Bayes) |

---

# 1. BẢNG PHÂN BỔ TRÁCH NHIỆM CHÍNH CHO ĐỘI HÌNH 3 NGƯỜI

```text
┌────────────────────────────────┬────────────────────────────────────────────────────────┐
│ THÀNH VIÊN                     │ PHẠM VI QUẢN LÝ VÀ TRÁCH NHIỆM BẮT BUỘC               │
├────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 👑 NGƯỜI 1: LEAD ARCHITECT     │ • Quản lý phân hệ: 00_CORE_SPEC/ & 03_UI_VA_KICH_BAN/  │
│ (Fullstack & UI Cockpit)       │ • Giữ quyền khóa Data Contracts bất biến giữa các tầng │
│                                │ • Xây dựng Tri-Pane UI (ReactFlow, Monaco, FSM 4 màu)  │
│                                │ • Đảm bảo Kịch bản Pitching & Demo 5 phút trơn tru     │
├────────────────────────────────┼────────────────────────────────────────────────────────┤
│ ⚙️ NGƯỜI 2: STATIC ENGINE DEV   │ • Quản lý phân hệ: 01_ENGINE_THUAT_TOAN/ (Tầng 0, 1, 2)│
│ (AST, Tarjan & Slicing)        │ • Ingestion Stream Unzip vào RAM + TreePruner lọc rác  │
│                                │ • Tree-sitter WASM bóc hàm + Tarjan SCC khử chu trình  │
│                                │ • PageRank Sink Filter + Scoped Slicing + Uncle Bob    │
│                                │ • Cam kết: Chạy < 1.5s, 0 Token AI, Zero-Disk         │
├────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 🧠 NGƯỜI 3: AI & COGNITIVE DEV │ • Quản lý phân hệ: 02_AI_VA_BAYES/ (Tầng 3, 4, 5)     │
│ (LLM Orchestrator & Bayes BKT) │ • Context Sandwich Slicing gửi Gemini Flash Structured │
│                                │ • Cổng Gác Nhị Phân 2 Chốt (AST Whitelist + Blacklist) │
│                                │ • Động cơ BKT + q-Matrix 16 chiều + Half-Life Decay    │
│                                │ • Cam kết: Latency JIT 1.2s - 1.8s, Zero Hallucination │
└────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

# 2. KIỂM TOÁN CHI TIẾT TỪNG FILE TRONG 4 THƯ MỤC CỐT LÕI

---

### PHÂN HỆ `00_CORE_SPEC/` [PHỤ TRÁCH: NGƯỜI 1 - LEAD]

#### FILE 1: `00_CORE_SPEC/01_TONG_QUAN_KIEN_TRUC.md`
1. **Tóm tắt nội dung hiện có (Đạt 95%):**
   - Đã bóc tách rõ ràng luồng 6 tầng liên hoàn từ Tầng 0 đến Tầng 5 bằng sơ đồ Mermaid.
   - Làm rõ ranh giới giữa Code Thuần toán học (0 Token, < 1.5s) và AI JIT (1.2s – 1.8s).
   - Xác lập nguyên tắc bất biến: 1 Node = 1 Lát cắt Nghiệp vụ Xuyên File; Quy trình 2 Pha (X-Ray & Feynman).
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Cần đồng bộ thuật ngữ với các file con: Ở Tầng 3 và 4 cần khẳng định rõ cơ chế 3 bước của Cột 3 (Stepper $\to$ Spot Bottleneck $\to$ Feynman Prove) để không bị nhầm lẫn giữa việc "xem điểm hay điểm dở" và "tự lộ đáp án sát hạch".
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - Bổ sung bảng đối sánh các phương án kiến trúc bị bác bỏ (Anti-patterns: PDF RAG, Full-AST PDG, Multi-turn MCTS) để làm tư liệu phòng thủ trước Ban Giám khảo.
4. **Checklist giao việc cụ thể cho NGƯỜI 1:**
   - [x] Khóa cấu trúc sơ đồ Mermaid 6 tầng.
   - [ ] Bổ sung mục *"Các quyết định kiến trúc bị bác bỏ & lý do"* (Architectural Decision Records - ADR).

---

#### FILE 2: `00_CORE_SPEC/02_DATA_CONTRACTS.md`
1. **Tóm tắt nội dung hiện có (Đạt 98%):**
   - Đã định nghĩa TypeScript Interfaces chuẩn xác: `NodeStatus`, `ExecutionTraceStep`, `UncleBobMetrics`, `HybridArchitecturalNode`, `ContextSandwichPayload`, `EnrichedSliceResponse`, `FeynmanEvaluationResult`, `CognitiveSkillState`.
   - Có đầy đủ 16 kỹ năng SWE chuẩn trong ma trận $q$-Matrix.
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Cần đồng bộ kiểu dữ liệu cho giao diện Buồng lái Socratic (Cockpit Socratic Card).
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - ~~Interface cho thông số Fallback Mock JSON phòng khi mất mạng (`OfflineMockBundle`)~~ — đã bổ sung (contract Mục 2.6).
4. **Checklist giao việc cụ thể cho NGƯỜI 1:**
   - [x] Bổ sung interface `OfflineMockBundle` (đặc tả; file mock phải ghi lại từ output thật trong giờ thi).
   - [x] Hợp nhất `LearnerCognitiveProfile` (gộp các trường của BKT), thêm `EnrichNodeClientResponse`, `ChallengeTokenPayload`, `EvaluateFeynmanRequest`, `RevealRequest`, `HiddenChallenge`, `NodeProgressRecord`; đưa `MIDDLEWARE` thành layer chính thức.
   - [ ] Đóng băng hợp đồng dữ liệu, gửi cho Người 2 và Người 3 để bắt đầu triển khai code mà không bị lệch kiểu.

---

### PHÂN HỆ `01_ENGINE_THUAT_TOAN/` [PHỤ TRÁCH: NGƯỜI 2]

#### FILE 3: `01_ENGINE_THUAT_TOAN/01_INGESTION_STREAM.md`
1. **Tóm tắt nội dung hiện có (Đạt 75%):**
   - Đã nói được cơ chế Stream Unzip từ URL `codeload.github.com` vào RAM và regex lọc rác TreePruner.
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - ~~Còn nhắc `isomorphic-git`~~ — đã hết; Tầng 0 dùng `unzipper` trên buffer RAM (Central-Directory-First).
   - ~~Thiếu cách giải quyết branch mặc định~~ — đã có Bước 3 `RefResolver` (`archive/HEAD.zip`, dự phòng `main ➔ master ➔ dev`).
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - ~~Pre-Flight HEAD Probe~~ — đã có Bước 2 (≤ 300ms, enum `ProbeResult`).
   - ~~Mã lỗi riêng~~ — dùng `IngestionErrorCode` trong contract.
   - ~~Upload `.zip`~~ — đã có Bước 0 `ZipUploadReceiver`.
4. **Checklist giao việc cụ thể cho NGƯỜI 2 (Khuôn chuẩn 5 Mục):**
   - [ ] **Input:** URL GitHub string `https://github.com/:owner/:repo`.
   - [ ] **Logic:** Chuẩn hóa link $\to$ HEAD Probe (≤ 300ms) $\to$ RefResolver $\to$ gom zip vào buffer RAM, đọc Central Directory $\to$ TreePruner neo segment + `FilePriorityScore` $\to$ giải nén chọn lọc. Hoặc nhận `.zip` tải lên (Bước 0).
   - [ ] **Fallback:** Ref theo `archive/HEAD.zip`, dự phòng `main ➔ master ➔ dev`. Vượt 15MB nén mà chưa có file nào ⇒ `ERR_STREAM_QUOTA_EXCEEDED`; đã có file ⇒ cắt cụt + warning.
   - [ ] **Output JSON:** `Map<string, string>` chứa tối đa 50 file code sạch.
   - [ ] **SLA:** Thời gian tải và giải nén $0.8\text{s} – 1.2\text{s}$ (bảng số liệu chuẩn Tổng quan Mục 5).
5. **Bổ sung sau đợt rà soát edge case 2026-10-28** (chi tiết: `03_SYSTEM_EDGE_CASES_AUDIT.md` mục 1A, ma trận §7 của file Ingestion). Mã lỗi dùng `IngestionErrorCode` trong `02_DATA_CONTRACTS.md` (thay cho `ERR_REPO_NOT_FOUND` / `ERR_REPO_TOO_LARGE` / `ERR_BRANCH_RESOLVE` ở mục 3):
   - [ ] **🔴 Ưu tiên 1:** Central-Directory-First + `FilePriorityScore` (Case 1.14) và `ManifestStore` đủ manifest (Case 1.15).
   - [ ] **🔴** `NotebookExtractor` cho `.ipynb` (Case 1.5); `ERR_UNSUPPORTED_LANGUAGE` + `SfcScriptExtractor` (Case 1.16).
   - [ ] **🔴** Probe trả enum `ProbeResult`, tách `ERR_NETWORK_TIMEOUT` khỏi 404 (Case 1.10); `ERR_EMPTY_REPOSITORY` / `ERR_REPO_UNAVAILABLE_451` / gợi ý submodule (Case 1.11); `pipeline()` + retry 1 lần (Case 1.12).
   - [ ] **🔴** `SecretRedactor` trước khi code rời Tầng 0 (Case 1.20 — phối hợp Người 3).
   - [ ] **🟡** `UrlNormalizer` (1.9), Longest-Prefix Ref + `zip/:ref` (1.3), byte counter 2 lớp + trần giải nén (1.2), regex rác neo segment (1.13), encoding/BOM/CRLF (1.17), symlink/LFS/minified (1.18), semaphore + LRU cache (1.19).
   - [ ] **Kiểm chứng bằng `curl -I`:** `archive/HEAD.zip` redirect, header `Content-Length` của codeload, data descriptor trong zip codeload.

---

#### FILE 4: `01_ENGINE_THUAT_TOAN/02_AST_SLICING_GRAPH.md`
1. **Tóm tắt nội dung hiện có (Đạt 90%):**
   - Đã định nghĩa chuẩn Two-Pass Symbol Resolution, Tarjan SCC, PageRank, Cognitive Complexity, Uncle Bob Scope Slicing, Dagre Layout và đặt tên node tất định (Thuật toán 8).
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Cần mô tả thuật toán **Utility Sink Filtering** bằng các bước code cụ thể: lọc các node có $\text{Out-degree} = 0$ thuộc danh sách tên file rác (`logger`, `db`, `config`, `util`) trước khi nhân ma trận PageRank.
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - Bảng quy tắc Regex phát hiện endpoint của các framework phổ biến (Express, NestJS, Spring Boot, FastAPI, Gin).
4. **Checklist giao việc cụ thể cho NGƯỜI 2 (Khuôn chuẩn 5 Mục):**
   - [ ] **Input:** `Map<string, string>` từ Tầng 0.
   - [ ] **Logic:** Quét `tags.scm` lập 3 bảng băm $\to$ Chạy Tarjan Condensation $\to$ Chạy PageRank Sink Filter lấy Top Hubs $\to$ Rút Scoped Slicing 3 hàm $\to$ Display Budget $\to$ Đặt tên node (Thuật toán 8) $\to$ Chạy Dagre Layout tính $(x, y)$.
   - [ ] **Fallback:** Nếu đồ thị rời rạc không có Controller $\to$ dùng Cognitive Complexity cấp Vé VIP cho file thuật toán làm node chính.
   - [ ] **Output JSON:** Cấu trúc `StaticEngineResult` chuẩn theo `02_DATA_CONTRACTS.md`.
   - [ ] **SLA:** Toàn bộ hoàn thành trong $< 0.25$ giây trên CPU.
5. **Bổ sung sau đợt rà soát edge case 2026-10-28** (chi tiết: `03_SYSTEM_EDGE_CASES_AUDIT.md` mục 1B, ma trận §7 của file AST):
   - [ ] **🔴 Ưu tiên 1 (quyết định đồ thị đúng hay sai):** Pass 2 trên AST + `FieldTypeMap` thay regex substring (Case 1.23); Interface ➔ Impl / DI (1.24); `ImportResolver` đa ngôn ngữ, đọc `tsconfig.paths` từ `ManifestStore` (1.25); cạnh Route/Middleware (1.26).
   - [ ] **🔴 Đa ngôn ngữ theo tầng (Person 2 chính, Person 1 sửa contract, Person 3 gắn Relaxed Gate theo tier):** `LanguageRegistry` (adapter `{extensions, wasmGrammar, queryFile, importResolver?, ingressPatterns?, abstractionKinds?}`); tier `RESOLVED` (có `importResolver`) vs `STRUCTURAL` (Universal Resolver, Thao tác 2b, cạnh `INFERRED`); `ProjectFingerprint` thêm `language_breakdown`, `graph_confidence`; `edges[].confidence`; bỏ enum đóng `primary_language`; `ERR_UNSUPPORTED_LANGUAGE` chỉ cho ngôn ngữ không có grammar; UI vẽ cạnh `INFERRED` nét đứt + huy hiệu độ tin cậy đồ thị.
   - [ ] **🔴** Phân nhánh 0 cạnh theo số file: `PROCEDURAL` vs `ALGORITHM_COLLECTION` (1.31, 1.1, 1.4); `DATA_SINK_PATTERNS` + control dependence + trần dòng/token (1.33).
   - [ ] **🟡** Tỉ lệ node `ERROR` (1.22), khóa `file#symbol` + arrow/default export (1.27), SCC khổng lồ (1.28), PageRank dangling + basename match (1.29), `INGRESS_PATTERNS` đa framework (1.30), nesting theo AST cho Python (1.32), Uncle Bob mẫu số 0 / JS thuần (1.34), Display Budget + mọi root AVAILABLE + deterministic (1.35), warm-up grammar + `ENGINE_BUDGET_MS` (1.36), whitelist có field/tham số (1.37).
   - [ ] **🔴 Đặt tên node (Case 1.38 — Person 2 chính, Person 1 sửa contract + UI):** Thuật toán 8 (thang 5 bậc `ROUTE` ➔ `ENTRY_SYMBOL` ➔ `DOMAIN_TERMS` ➔ `DIRECTORY` ➔ `FILE_BASENAME`, tên `VIRTUAL`, khử trùng, lọc route theo entropy); ghi `title_source` + `title_evidence`; kiểm thử trên 3–5 repo mẫu và ghi lại các tên chưa tự nhiên.

---

### PHÂN HỆ `02_AI_VA_BAYES/` [PHỤ TRÁCH: NGƯỜI 3]

#### FILE 5: `02_AI_VA_BAYES/01_LLM_PIPELINE_GUARDRAIL.md`
1. **Tóm tắt nội dung hiện có (Đạt 70%):**
   - Đã đặc tả Single-Pass Contrastive CoT, 2 endpoint JIT, Cổng Gác Nhị Phân v2, `challenge_token`, ngân sách token (Mục 1.4). Intent Router đã **bỏ** (là lần gọi LLM thứ 3), thay bằng nút "Bỏ qua node" ở client.
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - ~~"0.4 giây" và "Actor-Critic 2 lượt"~~ — đã thay bằng **Single-Pass Contrastive CoT** (1 lượt gọi, $1.2\text{s} - 1.8\text{s}$).
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - ~~Đặc tả Cổng Gác Nhị Phân 2 Chốt~~ — đã có (Gate v2: mảng rỗng bị REJECT, chuẩn hóa tên, Chốt 2 quét mọi trường văn bản, Relaxed theo `node.support_tier`).
   - Còn thiếu: bộ eval 20–30 câu trả lời gắn nhãn, đo token/độ trễ thật bằng `usage_metadata`.
4. **Checklist giao việc cụ thể cho NGƯỜI 3 (Khuôn chuẩn 5 Mục):**
   - [ ] **Input:** `ContextSandwichPayload` (≤ 100 dòng code sạch, ≤ 1,500 token, DTO, Persona tier, `allowed_skills`, Blacklist).
   - [ ] **Logic:** Gửi Gemini 2.5 Flash ép kiểu Structured Output JSON Schema $\to$ Đón kết quả chạy qua Cổng Gác Nhị Phân (0.001s).
   - [ ] **Fallback:** Nếu `referenced_symbols` chứa tên biến không có trong AST $\to$ HỦY kết quả của AI, kích hoạt câu hỏi cú pháp AST an toàn.
   - [ ] **Output JSON:** `EnrichedSliceResponse` chuẩn.
   - [ ] **SLA:** Thời gian phản hồi thực tế $1.2\text{s} – 1.8\text{s}$; không symbol/công nghệ bịa nào lọt qua Cổng gác (cổng gác không kiểm chứng ngữ nghĩa, không tuyên bố "0% ảo giác").
   - [ ] **Liên tầng (rà soát 2026-10-28):** Chỉ nhận code đã qua `SecretRedactor`, dùng vị trí secret làm `hidden_challenge` Security Fatal (Case 1.20); đóng khung code repo như dữ liệu không tin cậy, đọc cờ `suspicious_instruction_comment` (Case 1.21); chuyển Mode B khi `ingestion_report.degraded_mode` có giá trị.

---

#### FILE 6: `02_AI_VA_BAYES/02_BAYES_COGNITIVE_BKT.md`
1. **Tóm tắt nội dung hiện có (Đạt 95%):**
   - Đầy đủ 4 tham số BKT ($P(L_0), P(T), P(G), P(S)$), công thức Bayes cập nhật đúng/sai, ma trận $q$-Matrix 16 kỹ năng, Thang tiến hóa 3 bậc và Half-Life Decay.
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Cần chỉ rõ quy tắc ánh xạ từ 2 điểm Rubric của AI (`core_accuracy`, `simplicity`) sang biến nhị phân $\text{Obs} \in \{\text{Correct}, \text{Incorrect}\}$.
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - Đoạn mã hàm JavaScript tính toán cập nhật BKT mẫu để Người 3 copy dùng ngay trên Zustand Store.
4. **Checklist giao việc cụ thể cho NGƯỜI 3 (Khuôn chuẩn 5 Mục):**
   - [ ] **Input:** Kết quả chấm Rubric từ AI + Vector $q_j$ của câu hỏi + Trạng thái $P(L_{t-1})$.
   - [ ] **Logic:** Tính $\text{Obs}$ $\to$ Cập nhật $P(L_{t-1} \mid \text{Obs})$ theo công thức Bayes $\to$ Tính bước tiếp thu $P(T)$ $\to$ Cập nhật đồng thời các kỹ năng bật cờ trong $q_j$.
   - [ ] **Fallback:** Chống tràn số hoặc chia cho 0 khi xác suất chạm cận $0.0$ hoặc $1.0$ (kẹp giá trị trong khoảng $[0.01, 0.99]$).
   - [ ] **Output JSON:** `LearnerCognitiveProfile` mới.
   - [ ] **SLA:** Thực thi $< 0.002$ giây.
   - [ ] **Rà soát 2026-10-28 (tầng lưu trữ):** BKT chuyển lên server. `src/lib/bkt-engine.ts` giữ nguyên hàm thuần, dùng chung client/server; chỉ server gọi `updateBKTState` trong transaction `evaluate-feynman`; viết `applyUnlocksAndFastTrack` và `deriveNodeStates` (`04_LUU_TRU_VA_DONG_BO.md` Mục 4, 6.2).

---

### PHÂN HỆ `03_UI_VA_KICH_BAN/` [PHỤ TRÁCH: NGƯỜI 1 - LEAD]

#### FILE 7: `03_UI_VA_KICH_BAN/01_UI_TRI_PANE_FSM.md`
1. **Tóm tắt nội dung hiện có (Đạt 95%):**
   - Đặc tả rõ ràng bố cục 3 cột (25% - 45% - 30%), ReactFlow Canvas 4 màu, Monaco Code Viewer, Tab X-Ray và Tab Feynman.
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Cần làm rõ sự kiện tương tác giữa Cột 3 và Cột 2: Khi bấm `Step 1` ở Cột 3 thì Cột 2 nhận props gì để tự cuộn dòng và đổi màu highlight.
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - Bảng màu Hex cụ thể cho Theme Cyberpunk/Graphite (để AI sinh CSS đồng nhất).
4. **Checklist giao việc cụ thể cho NGƯỜI 1:**
   - [ ] Định nghĩa bảng mã màu CSS tokens trong file: `#0F172A` (Nền), `#F59E0B` (Vàng Available), `#10B981` (Xanh Completed), `#EF4444` (Đỏ Failed).
   - [ ] Ráp Zustand Store quản lý trạng thái chọn Node đồng bộ cả 3 cột.
   - [ ] **Rà soát 2026-10-28:** Hiển thị `ingestion_report.warnings` (repo bị cắt bớt, chế độ suy biến); cho chọn lại thư mục phân tích khi phát hiện nhiều backend (Case 1.7); Monaco mở `files[0]` khi click SuperNode (Case 1.6); vẽ nét đứt cho cạnh `ambiguous` (Case 1.24); mọi node root đều `AVAILABLE` (Case 1.35); ánh xạ đủ các mã `IngestionErrorCode` sang thông điệp UI; tiền tố `~` + tooltip `title_evidence` cho tên node (Case 1.38).
   - [ ] **Tầng lưu trữ (`04_LUU_TRU_VA_DONG_BO.md` Mục 9):** tạo project Supabase cùng vùng với server; 5 bảng + RLS; đăng nhập khách + nút "Lưu tiến độ bằng GitHub" (`linkIdentity`); `GET /api/me`, `GET /api/sessions` + danh sách "Tiếp tục học"; mở lại phiên bằng `session_id`; nhãn "Chưa đồng bộ"; tài khoản demo riêng cho từng persona. Người 2 thêm Thao tác 2b (đọc commit SHA từ comment zip) và **kiểm chứng thực nghiệm** trên zip thật của codeload.

---

#### FILE 8: `03_UI_VA_KICH_BAN/02_KICH_BAN_PITCH_DEMO.md`
1. **Tóm tắt nội dung hiện có (Đạt 95%):**
   - Có kịch bản từng phút cho 5 phút thuyết trình và 9 câu hỏi bẫy kèm câu trả lời (Q9 về lưu trữ thêm ngày 2026-10-28).
2. **Những điểm còn mơ hồ, rườm rà hoặc mâu thuẫn:**
   - Đã sửa (2026-10-28): bỏ cảnh hiện lỗi N+1 ở Tab 1; bỏ các khẳng định "100%", "an toàn tuyệt đối"; Q3 (PageRank), Q6 (chống chép), Q7 (offline là dữ liệu ghi lại), Q8 (Nominal Event Bridge thuộc lộ trình).
   - Còn mở: thời lượng mỗi đội chưa có trong thể lệ — cần hỏi BTC.
3. **Những phần đang thiếu thốn cần bổ sung gấp:**
   - Phím tắt bí mật kích hoạt chế độ Demo Offline: `Ctrl + Shift + D` để nạp ngay file Mock JSON nếu Wi-Fi hội trường bị rớt.
4. **Checklist giao việc cụ thể cho NGƯỜI 1:**
   - [ ] Chuẩn bị sẵn file `public/demo/mock_repo_shop.json` chuẩn chỉnh 100%.
   - [ ] Luyện tập thuyết trình khớp khớp từng giây với đồng hồ bấm giờ 5 phút.

---

# 3. KẾT LUẬN & CHỈ THỊ HÀNH ĐỘNG NGAY
* Toàn bộ 8 file tài liệu đã được quy hoạch mạch lạc, không còn tình trạng dẫm chân lên nhau.
* **Người 1, Người 2, Người 3** căn cứ vào checklist trên để nắm trọn trách nhiệm của mình, sẵn sàng bước sang giai đoạn hiện thực hóa mã nguồn (Implementation Phase) khi có chỉ thị tiếp theo!
