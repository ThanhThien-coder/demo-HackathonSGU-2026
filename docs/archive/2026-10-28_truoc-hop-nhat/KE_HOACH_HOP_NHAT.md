# Kế hoạch: Audit toàn bộ spec SimpliFey V2 Pro + hợp nhất thành "gói đặc tả để code"

> **Bản lịch sử — KHÔNG phải căn cứ.** Kế hoạch lập ngày 28/10/2026, thực hiện xong 29/10/2026 (từng nằm ở `Plan.md` gốc repo). Kết quả là `spec/` + `pitch/`; khi lệch, `spec/` đúng. Những chỗ spec cuối khác kế hoạch dưới đây:
> - B13: chuỗi đúng (không làm tròn giữa chừng) là 0.7439 → 0.8495 (`22` BKT-02, T-CHAIN); 0.7440 / 0.8496 là số làm tròn từng bước.
> - D-02: `enrich-node` nhận thêm `mode` (`LEARN` / `REMEDIATION` / `DECAY_REVIEW`); `session_mode` thành `RunMode`.
> - A2: không có bảng `question_results`; kết quả từng câu nằm trong `node_runs` + `question_attempts` (D-16); cache AI là bảng `ai_cache` (D-15).
> - C2: `skill_results` thành `SkillChange`.
> - Mục 4: `spec/` thực tế ≈ 400 KB (mục tiêu 250–300 KB); 6 file 41–45 KB.
> - Mục 6: câu hỏi mở cuối cùng ở `spec/00_QUYET_DINH.md` Mục 3.
> - Mục 7: bước đọc nguội do phiên Claude mới (không có ngữ cảnh viết spec) thực hiện thay cho subagent.

## 1. Context

**Hiện trạng tài liệu.**
- 19 file MD (không tính `archive/`), tổng ≈ **825 KB ≈ 300K token**.
- Mỗi sự thật bị viết lại ở 4–6 nơi, và các bản chép đã lệch nhau.
- Nguyên nhân chính khiến chưa vào code được **không phải số file**. Nguyên nhân là **3 bản thiết kế chấm điểm/BKT đang cùng tồn tại và chưa ai chốt**:
  - v1.1 (Thiện);
  - thang gợi ý 3 nấc (Nhân, merge `ddbdc1f`);
  - thiết kế mới `03_VI_DU_LUONG_DU_LIEU_AI.md`, file này tự ghi "Hai file spec trên chưa sửa".
- Kèm theo đó, contract còn thiếu nhiều mảnh mà code cần.

**Ràng buộc cứng** (`references/thele.md:48-50, 124-133`):
- Giờ code: **12g00 31/10 → 09g00 01/11/2026**, tức khoảng **21 giờ**.
- Repo thi phải trống; chỉ commit trong giờ thi mới được tính.
- **Cấm bulk-commit code viết sẵn.** Mọi thành viên phải có commit.
- Slide nộp trước 09g30.

⇒ **Bộ MD chính là thứ đội mang vào phòng thi để AI code.** Bộ tài liệu cần đạt:
- mỗi sự thật chỉ nằm ở 1 chỗ;
- đủ kiểu dữ liệu cho mọi endpoint;
- hằng số tập trung một nơi;
- có test vector;
- có thứ tự build.

## 2. Quyết định đã chốt (từ câu trả lời của bạn)

| ID | Quyết định | Hệ quả phải sửa khi viết lại |
| :-- | :-- | :-- |
| **D-01** | **Thiết kế 03_VI_DU là chuẩn.** | Xem bảng tách dòng ngay bên dưới. |
| **D-02** | **Server lập kế hoạch câu hỏi + chạy BKT.** `planNodeQuestions`, BKT, Fast-Track, mở khóa đều chạy trong transaction ở server, đọc từ `skill_states`. | `enrich-node` chỉ nhận `{session_id, node_id}`. Bỏ mọi chỗ client tự tính BKT (`01_LLM:63-82, 495-512`). Bỏ ghi chú localStorage (`BKT:565`, `03_VI_DU:132`). |
| **D-03** | **Chấp nhận toàn bộ 💡**: #1, #6, #9, #15, #17, #19, #20, #21, #22, #23, #24, #25b, #25d. | Xem bảng tách dòng ngay bên dưới. |
| **D-04** | **Phạm vi 09g00 01/11 = toàn bộ spec**: mọi phần 🟢 + tầng lưu trữ `04_LUU` (khách ẩn danh, GitHub link, resume theo SHA, sync receipt, persona) + Language Registry như spec engine. | Các mục 🔵 của 03_VI_DU (ôn node đỏ, ôn khi decay, `session_mode`, Relaxed Mode, nhiều phiên bản câu hỏi, câu thứ 2 cho NOVICE, xoáy ý hổng) vẫn viết **đủ để code**, xếp trong hàng đợi build sau lõi. File kế hoạch 21 giờ có **thứ tự cắt dự phòng** khi trễ giờ (chỉ để phòng, không đổi phạm vi). |
| **D-05** | **Gộp thành `spec/` + `pitch/`**, file cũ `git mv` vào `archive/`. | Xem Mục 4. |

**D-01 — nội dung thiết kế chuẩn (03_VI_DU):**
- **AI được gọi ở 4 chỗ:** `analyze-node` (1 lần/node/repo, cache dùng chung), `analyze-overview`, `enrich-node` (chỉ đặt câu hỏi), `evaluate-feynman`.
- **Tab 1** hiện cả điểm hay lẫn điểm dở, gắn nhãn "Nhận định của AI".
- **Câu hỏi:** mỗi kỹ năng chưa thạo (< 0.92) có 1 câu. Có 4 góc hỏi `focus` (`FLOW`, `ARCHITECTURE`, `WEAKNESS`, `CHANGE`), chọn theo bảng góc × tier.
- **Mỗi câu** có thang 3 nấc gợi ý riêng và 1 lần cập nhật BKT theo `NodeOutcome`.
- **Màu node:** XANH khi mọi câu đạt, ĐỎ khi có ≥ 1 câu trượt.
- **Đáp án:** `reference_answer` + `must_have_points` + `fix`.
- **Bỏ** `hidden_challenge` và bảng gán kỹ năng tĩnh; **AI gắn kỹ năng kèm bằng chứng**.
- **Tham số:** `temperature 0`, quota **80k**, tối đa 3 lời gọi phân tích cùng lúc.

**D-01 — hệ quả phải sửa:**
- **4 bất biến trong CLAUDE.md:** Pha 1 không lộ điểm dở; 2 điểm JIT; 1 lời gọi/node; câu dự phòng AST.
- **Bảng §5:** khoảng 58.5k token cho người học đầu tiên, khoảng 22k cho người sau, ≈ $0.05/phiên (tính lại sau khi chốt model).
- **Pitch/KyVong:** "< 1.000đ/phiên".

**D-03 — hệ quả của các 💡 đã chấp nhận:**
- **#1:** regex chống injection chỉ bắt câu lệnh.
- **#6:** bỏ câu dự phòng AST. Câu hỏng thì gọi lại 1 lần, vẫn hỏng thì bỏ câu đó; hỏng hết thì hiện nút "Thử lại".
- **#9:** AI lỗi khi chấm thì không tính lượt. Hết quota với repo thật thì khóa nộp bài.
- **#15:** nút thành "Bỏ qua câu này", ghi `FAILED` cho đúng kỹ năng của câu đó.
- **#17:** chấp nhận cho demo.
- **#19:** viền cam chỉ hiện khi điểm gốc ≥ 0.45 và điểm đã decay < 0.45.
- **#20:** node phân tích lỗi thì giữ VÀNG kèm nút "Thử lại", node con mở kèm tam giác.
- **#21:** chốt tên dựa trên whitelist ∪ code của node ∪ tên file.
- **#22:** bỏ prefetch.
- **#23:** mỗi kỹ năng tối đa 1 điểm dở.
- **#24:** danh sách từ cấm so theo tên gói, quét nguyên từ.
- **#25b:** thêm nút "Báo sai".
- **#25d:** AI phải trích đúng câu của người học làm bằng chứng cho từng ý bắt buộc.

## 3. Kết quả audit (ghi chú "→" là cách xử lý)

### A. Chặn code
- **A1. Ba mô hình chấm/BKT.** → D-01 + D-02.
- **A2. Hai lược đồ DB** (`04_LUU §4` và `02_BAYES §5`).
  - → Giữ `04_LUU`.
  - → Thay `feynman_attempts` + `node_progress.retry_count` bằng kết quả **theo từng câu**: bảng `question_results`. Trạng thái node suy ra từ đó.
  - → Thêm bảng cache cho `node_analysis`, `repo_overview`, `question_cache`. Bảng này **không chứa code**, chỉ chứa văn bản AI đã qua kiểm. Vì vậy cache dùng chung giữa nhiều instance và không mất khi restart (giải CẤN #2).
- **A3. Chưa định nghĩa "1 node" được dựng thế nào**: Hub (file) → lát cắt, phạm vi forward, 1 step là gì, phân loại tầng, Slice Merger, quy tắc `node.id`, cạnh giữa các node lấy từ đâu.
  - → Viết quy tắc mặc định cụ thể vào `00_QUYET_DINH`, Người 2 xác nhận trước 30/10. Mặc định đề xuất:
    - 1 node = 1 entry đã đăng ký (route/command/screen);
    - đi forward tối đa 4 bước nhảy hàm;
    - 1 step = 1 hàm;
    - `id` = `slice-` + slug của tên node + hậu tố băm đường dẫn entry;
    - cạnh A → B khi hai lát cắt dùng chung hàm và A có độ phức tạp thấp hơn, rồi rút gọn bắc cầu.
- **A4. Trường không có thuật toán sinh.**
  - → `preliminary_skills` giờ lấy từ kết quả `analyze-node`.
  - → `hidden_challenge` bỏ.
  - → Phải định nghĩa: `cognitive_complexity` cấp lát cắt (lấy max); `is_capstone` (complexity cao nhất, hòa thì Rank Score cao nhất) đưa vào `HybridArchitecturalNode`; `data_in/out`, `display_meta`, `detected_framework` (tính được thì tính, không thì bỏ khỏi contract).
- **A5. Engine không tất định** (`AST:122` cắt file theo thời gian thực; `ING:273` băm buffer đã bị cắt; thiếu `engine_version`).
  - → Bỏ việc cắt theo thời gian, thay bằng trần số file cố định.
  - → Băm toàn bộ buffer.
  - → Thêm `engine_version` vào `learning_sessions` và cache key.
- **A6. Lộ dữ liệu xuống client.** `StaticEngineResult` gửi xuống client có `suspicious_instruction_files`; `...grading` làm lộ `misconception`.
  - → Tách `ClientStaticEngineResult`.
  - → Server lọc whitelist các trường trả về.
- **A7. Không ai nói rõ thứ gì phải chạy lúc 09g00.** → D-04 + câu hỏi gửi BTC ngày 30/10 (Mục 6).

### B. Luồng gãy
- **B1. Không ôn được node COMPLETED** vì evaluate chặn mọi trạng thái khác AVAILABLE. → Dùng `session_mode: DECAY_REVIEW` (Trace E): chỉ cập nhật BKT, không đổi màu node.
- **B2. "Ôn tập lại" FAILED → AVAILABLE khóa ngược node con** (`04_LUU:146`). → Bỏ chuyển trạng thái này. Remediation giữ node ĐỎ cho tới khi đạt (Trace B5).
- **B3. Remediation có 2 phiên bản.** → Chỉ giữ phiên bản của Trace B5.
- **B4. Bỏ qua/reveal có 3 cách xử lý.** → Dùng #15. Thêm `RevealResponse`.
- **B5. Viền cam bật ngay sau khi đạt.** → Dùng #19.
- **B6. Transaction evaluate có lỗ:**
  - gọi Gemini trước khi kiểm trạng thái;
  - `FOR UPDATE` không khóa được gì khi chưa có dòng;
  - không kiểm `node_id` trong token;
  - token không có TTL và không gắn session/user.
  - → Đổi thứ tự: kiểm tra → khóa → gọi AI → ghi. Upsert dòng trước khi khóa. Token gắn `session_id`, `user_id`, có `exp`.
- **B7. Postgres sập thì nhánh `sync_receipt` không chạy được.** → Định nghĩa lại: hết lần thử lại thì trả `ERR_PERSISTENCE_UNAVAILABLE` cho nút "Thử lại". Receipt chỉ ký khi đã đọc được trạng thái.
- **B8. Prefetch.** → Bỏ (#22).
- **B9. Hết quota thì chấm bằng `sample_evaluations`.** → Dùng #9.
- **B10. Prompt chưa đủ để code:**
  - prompt chấm không nhận câu hỏi;
  - không có `responseSchema`;
  - rubric có khoảng trống;
  - câu fallback AST không chấm được.
  - → Viết prompt nguyên văn và schema cho cả 4 lời gọi, thống nhất rubric. Bỏ fallback AST (#6).
- **B11. Guardrail:** tin danh sách tên do AI tự khai; so chuỗi con; không quét đáp án; phạm vi whitelist mâu thuẫn. → Dùng #21, #24, CẤN #7. Chốt whitelist ở **phạm vi repo**.
- **B12. PageRank đẩy Repository lên làm Hub** (tôi tự tính: C 0.184, S 0.341, R 0.474). → Chỉ bầu Hub trong số node là entry/ingress. PageRank chỉ dùng để xếp hạng.
- **B13. Lỗi tính toán:**
  - Bảng Case 4 ở `BKT:270-277` sai; chuỗi đúng là 0.4202 → 0.5957 → 0.7440 → 0.8496.
  - Trace C bỏ qua node tiên quyết.
  - Công thức decay cũ còn ở `BAO_CAO_LUONG:89,775,910`, `EDGE:594`, `GIAO_TRINH:533`.
  - → Sửa hết, chuyển vào `50_TEST`.
- **B14. Ingestion:**
  - code ném lỗi quota trong khi phần mô tả nói giữ phần đã tải;
  - streaming fallback mở lại lỗi chọn `client/` trước `server/`;
  - thử ref dài-nhất-trước với trần 4 lần nên không bao giờ tới `main`;
  - thông báo lỗi khuyên dùng link `/tree`, nhưng codeload luôn zip cả repo;
  - regex che secret nhiều dòng làm lệch số dòng.
  - → Sửa trong `10_ENGINE_INGEST`.

### C. Contract
- **C1. Thiếu type:**
  - `MeResponse` (tách dữ liệu người học khỏi dữ liệu phiên);
  - `RevealResponse`, review, `sync/replay`, `persona`, `NodeAnalysis`, `RepoOverview`;
  - `ApiError` chung;
  - mã lỗi tầng AI.
- **C2. Trường đang dùng nhưng contract không có:** `intent`, `follow_up_*`, `NodeOutcome`, `skill_results`, `must_have_points`, `fix`, `question_index`, `step_indices`, `tech_stack`, `dto_interfaces`, `go_module_path`.
  - `tech_stack` và `dto_interfaces` phải lưu được, nếu không thì sau khi giải phóng `RAMCodeStore` sẽ không dựng lại được prompt.
- **C3. Kiểu sai:**
  - `Record<SWESkill,…>` phải là `Partial`;
  - `verdict` có dạng "SELECTED - …" nên không so sánh bằng `===` được;
  - `ChallengeTokenPayload` có 4 phiên bản.

### D. Số liệu trôi khỏi §5
- **Fast-Track:** 0.85 ở ROADMAP và cockpit.
- **temperature:** 0.2, 0 hay 0.1?
- **Quota:** 50k, 80k hay 10k?
- **Ngưỡng trượt:** < 60 hay < 70?
- **Độ dài tối đa:** 500 hay 2000?
- **Kiểm trùng:** Levenshtein, entropy hay Jaccard?
- **SLA:** `README:75` ghi "< 0.25s" cho cả Tầng 0–2.
- **Tier ARCHITECT** bỏ hở giá trị ≥ 0.92; `overall_tier` chưa có công thức.
- **~60 hằng số** engine/ingest không có trong §5.

→ Đưa tất cả vào **một bảng CONFIG** trong `02_CONTRACTS`.

### E. Nói quá và vệ sinh
- **Nói quá:** "lần đầu tiên", "Zero Hallucination", "hơn 100 ngôn ngữ", "Duolingo dùng BKT"; cockpit còn Intent Router.
- **Vệ sinh:**
  - `index.html` đã xóa nhưng vẫn được trích;
  - khoảng 100 anchor `#L` sai;
  - bất biến ở `TQ` đánh số 1, 2, 3, 6, 4, 5;
  - `03_VI_DU` không có trong README;
  - checklist trộn "spec xong" với "code xong".

### G. Thiếu hẳn
- Cây thư mục repo thi và `app/api/*/route.ts`.
- Biến môi trường, version pin, nguồn grammar `.wasm`.
- Definition of Done và test plan.
- Repo demo thật (hiện là repo tự bịa).
- Kế hoạch 21 giờ, quy ước commit, slide/poster.
- Câu "tuyệt đối không sinh code" chưa có điều kiện thoát.
- **Rủi ro thể lệ:** dán nguyên khối code từ spec rồi commit một lần có thể bị coi là bulk-commit. → Quy ước commit nhỏ, gõ hoặc sinh trong giờ thi.

## 4. Cấu trúc mới

```
README.md                         ≤ 80 dòng: sản phẩm, thứ tự đọc theo vai, trạng thái
CLAUDE.md                         viết lại: bất biến mới (D-01..D-03), "spec freeze 30/10", bản đồ spec/
spec/                             GÓI ĐỂ CODE — AI chỉ cần đọc thư mục này
  00_QUYET_DINH.md                D-xx (đã chốt) · Q-xx (mở: owner, hạn) · nơi DUY NHẤT có trạng thái đề xuất
  01_KIEN_TRUC_VA_LUONG.md        sơ đồ tầng, bất biến INV-xx, vòng đời node & câu hỏi: mỗi chuyển trạng thái = ai gọi · endpoint · payload · ghi bảng · client nhận
  02_CONTRACTS.md                 MỌI type + req/res mọi endpoint + ApiError + mã lỗi + bảng CONFIG duy nhất
  03_API_VA_LUU_TRU.md            bảng endpoint, SQL, RLS, transaction, deriveNodeStates, token, sync, cache bảng
  10_ENGINE_INGEST.md             Tầng 0
  11_ENGINE_DO_THI.md             Tầng 1–2 (định nghĩa node/lát cắt/cạnh/id, tất định)
  20_AI_GOI_VA_PROMPT.md          4 lời gọi: payload, prompt nguyên văn, responseSchema, cache key, quota, lỗi
  21_AI_KIEM_VA_DUYET.md          bảng kiểm từng lời gọi, chốt tên, từ cấm, regex, "Báo sai", quy trình duyệt tay (0.9)
  22_BKT_VA_KE_HOACH_CAU_HOI.md   planNodeQuestions, góc×tier, BKT theo câu, Fast-Track, Capstone, decay/viền cam, remediation, decay review
  30_UI.md                        layout, component, Zustand store (chỉ đọc), Tab 1/Tab 2/tổng quan, map lỗi → thông điệp, offline
  40_KE_HOACH_21H.md              cây thư mục repo thi, env, version, thứ tự build + mốc giờ theo người, mock để làm song song, DoD, thứ tự cắt dự phòng, quy ước commit
  50_TEST_VA_FIXTURE.md           repo demo + trace A–E làm test end-to-end, test vector BKT/decay/plan/derive/guardrail/naming/ingest, chỉ mục edge case → test
pitch/   KICH_BAN_DEMO.md · PHAN_BIEN_BGK.md (KyVong45 + Q&A BAO_CAO_THAM_DINH) · LUONG_DE_HIEU.md · ROADMAP.md
references/   GIAO_TRINH (sửa số cho khớp spec, ghi "minh họa") · thele.md
prototype/cockpit_demo.html   ghi rõ "lỗi thời"
archive/2026-10-28_truoc-hop-nhat/   toàn bộ file cũ (git mv)
```

**Ánh xạ file cũ → file mới:**

| File mới | Lấy nội dung từ |
| :-- | :-- |
| `02_CONTRACTS` | `02_DATA_CONTRACTS`, `TQ §5`, hằng số trong ING/AST, phần đề xuất contract trong `03_VI_DU §8` |
| `03_API_VA_LUU_TRU` | `04_LUU_TRU` |
| `10` / `11` | `01_INGESTION`, `02_AST`, các luật trong `EDGE` |
| `20` / `21` / `22` | `01_LLM`, `02_BAYES`, `03_VI_DU §0, §2–6` |
| `01_KIEN_TRUC_VA_LUONG` | `TQ §1–3`, `BAO_CAO_LUONG` (phần luồng); thay thế `Kich_Ban_UseCase` |
| `00_QUYET_DINH` | `00_AUDIT`, bảng trạng thái của `BAO_CAO_THAM_DINH`, `03_VI_DU §7`, `LUONG` Phần 7 |

**Nguyên tắc viết để AI code nhanh và đúng:**
1. Mỗi sự thật ở 1 chỗ. Nơi khác chỉ nhắc **tên**: tên type, khóa `CONFIG.X`, mã luật `ENG-12`.
2. Luật mang mã ID; test trích dẫn theo mã luật.
3. Mọi file module dùng chung khuôn: Input type → Output type → hàm + chữ ký + đường dẫn trong repo thi → thuật toán đánh số (tham số là khóa CONFIG) → lỗi/fallback → test bắt buộc → ngoài phạm vi.
4. Không đưa lý do, ẩn dụ, lịch sử vào `spec/`. Mỗi file ≤ ~40 KB.
5. Mục tiêu dung lượng `spec/` ≈ 250–300 KB.

## 5. Các bước thực hiện

1. **Tôi viết phần xương sống, theo thứ tự:**
   - `00_QUYET_DINH` (D-01..05, quy tắc mặc định cho A3/A4, danh sách Q mở);
   - `02_CONTRACTS` (sửa A4–A6, C1–C3, CONFIG);
   - `03_API_VA_LUU_TRU` (sửa A2, B1–B7, B9);
   - `01_KIEN_TRUC_VA_LUONG`.
2. **4 subagent viết song song.** Mỗi agent nhận phần xương sống, các file nguồn, khuôn viết và danh sách lỗi phải sửa:
   - (a) `10` + `11` engine (A3, A5, B12, B14);
   - (b) `20` + `21` AI (B10, B11, D-03);
   - (c) `22` BKT (B1–B5, B13);
   - (d) `30_UI` + `pitch/` (E).
3. **Tôi viết `40_KE_HOACH_21H` và `50_TEST_VA_FIXTURE`.** Trace A–E đã được kiểm số lại; sửa Trace C và Case 4 trước khi chuyển vào.
4. **Dọn dẹp:**
   - `git mv` file cũ vào `archive/2026-10-28_truoc-hop-nhat/`;
   - `prototype/`;
   - ghi nhận việc xóa `index.html`;
   - viết lại README.md và CLAUDE.md;
   - sửa số trong GIAO_TRINH.
   - **Không commit** trừ khi bạn yêu cầu.
5. Kiểm chứng (Mục 7) và vá các lỗ hổng tìm thấy.

## 6. Câu hỏi còn mở (ghi vào 00_QUYET_DINH, không chặn việc viết lại)

- **Q-01. Model.** `03_VI_DU:214` báo `gemini-2.5-flash` trả 404; ứng viên là `gemini-3.5-flash-lite`. Tôi chưa kiểm chứng được. Người 3 cần đo free tier và chạy bộ duyệt tay trước 30/10. Spec sẽ đọc tên model từ `CONFIG.LLM_MODEL`.
- **Q-02. Hỏi BTC ngày 30/10:**
  - sau 09g00 01/11 có được commit tiếp không;
  - mỗi đội thuyết trình bao lâu;
  - có được mang tài liệu spec/prompt vào phòng thi không.
- **Q-03. Chọn repo demo thật** (thay repo `shop-api` tự bịa). Cần có trước khi duyệt tay và ghi lại `OfflineMockBundle`.
- **Q-04.** Người 2 xác nhận quy tắc mặc định của A3/A4.

## 7. Kiểm chứng

- **Script quét `spec/`:**
  - mọi tên type được nhắc đều được định nghĩa trong `02_CONTRACTS`;
  - mọi endpoint đều có type request/response và danh sách mã lỗi;
  - mọi link tương đối đều tồn tại;
  - không còn chữ "đề xuất / CẤN / 💡 / chưa sửa" ngoài `00_QUYET_DINH`;
  - không file nào vượt 45 KB.
- **Grep các ngưỡng** (0.92, 0.45, 80,000, 70, 14, 0.25…): chỉ được xuất hiện trong bảng CONFIG và trong `50_TEST`.
- **Chạy lại test vector** BKT, decay và `planNodeQuestions` bằng script trong scratchpad.
- **Cold-read test:** một subagent mới chỉ đọc `spec/`, lập kế hoạch code cho từng module và liệt kê mọi câu còn phải hỏi. Còn câu hỏi thì vá và chạy lại cho tới khi sạch.
- **Đối chiếu bất biến:** CLAUDE.md mới khớp `01_KIEN_TRUC_VA_LUONG`.
