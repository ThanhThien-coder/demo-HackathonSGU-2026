# CHUẨN HÓA HỢP ĐỒNG DỮ LIỆU TYPESCRIPT (DATA CONTRACTS)
## DỰ ÁN: SIMPLIFEY V2 PRO — CODEBASE COGNITIVE TWIN
### *Bộ Hợp đồng Dữ liệu Bất biến Kết nối Toàn bộ 6 Tầng Xử lý (Phụ trách: NGƯỜI 1 - LEAD)*

---

| **Thuộc tính** | **Thông số kỹ thuật** |
| :--- | :--- |
| **Phân hệ** | `00_CORE_SPEC/02_DATA_CONTRACTS.md` |
| **Người phụ trách** | **NGƯỜI 1 (LEAD ARCHITECT)** |
| **Mục đích** | Đảm bảo tính nhất quán dữ liệu giữa Code Thuần (Tầng 0-2), AI Gemini (Tầng 4), Động cơ BKT (Tầng 5), Client Store và Tầng Lưu trữ Postgres (Mục 4) |
| **Nguyên tắc** | Strict Typing 100%, không dùng `any`, có đầy đủ guard-types và định nghĩa trường |
| **Quy tắc tham chiếu** | Đây là **nguồn chân lý duy nhất** về kiểu dữ liệu. Các file khác **không chép lại** interface; chỉ ghi tên kiểu và trỏ về file này |

---

# 1. HỢP ĐỒNG DỮ LIỆU ĐỒ THỊ & LÁT CẮT (TẦNG 0, 1, 2)

```typescript
// ==========================================
// 1. Máy Trạng Thái Hữu Hạn 4 Màu (FSM Status)
// ==========================================
export type NodeStatus = 
  | "LOCKED"      // Màu XÁM: Có node tiền đề chưa đi qua (chưa COMPLETED/FAILED)
  | "AVAILABLE"   // Màu VÀNG: Đã mở khóa, sẵn sàng cho sinh viên click vào học
  | "COMPLETED"   // Màu XANH: Đã vượt qua sát hạch Feynman, hoặc được Fast-Track (is_auto_mastered)
  | "FAILED";     // Màu ĐỎ: Trả lời sai đủ 3 lần, hoặc người học bấm "Bỏ qua node này"
// Lưu ý: "Suy giảm trí nhớ" (viền Vàng Cam) KHÔNG phải trạng thái FSM — chỉ là lớp hiển thị
// tính khi đọc từ LearnerCognitiveProfile (xem 02_BAYES_COGNITIVE_BKT.md Mục 2.4).

// ==========================================
// 2. Nhận diện Hình thái Dự án (Project Archetype)
// ==========================================
export type ProjectArchetype = 
  | "WEB_BACKEND"       // Express, NestJS, FastAPI, Spring Boot
  | "WEB_FRONTEND"      // React, Vue, Next.js (Client SPA/SSR)
  | "MOBILE_APP"        // React Native, Flutter, Expo
  | "DESKTOP_APP"       // Electron, Tauri
  | "CLI_TOOL"          // Commander, Typer, Argparse
  | "ALGORITHM_CORE";   // Package giải thuật thuần

// Mã ngôn ngữ chuẩn hóa, lấy từ Language Registry (UPPER_SNAKE theo tên grammar Tree-sitter).
// VD: "TYPESCRIPT", "PYTHON", "JAVA", "GO", "DART", "RUST", "CSHARP", "PHP", "KOTLIN", "CPP"...
// KHÔNG còn là enum đóng: thêm ngôn ngữ mới = thêm 1 adapter vào registry, không sửa contract.
export type LanguageId = string;

// Mức hỗ trợ của một ngôn ngữ (quyết định độ chính xác của CẠNH, không quyết định việc có vẽ được hay không)
export type LanguageSupportTier =
  | "RESOLVED"      // Có ImportResolver riêng (TS/JS, Python, Java, Go, Dart...) ➔ cạnh & lát cắt độ chính xác cao
  | "STRUCTURAL"    // Có grammar Tree-sitter nhưng chưa có resolver riêng ➔ dùng Universal Resolver, cạnh = suy luận
  | "UNSUPPORTED";  // Không có grammar ➔ chỉ hiển thị cây thư mục / đọc từng file, không dựng DAG

export interface LanguageSupportInfo {
  language: LanguageId;
  tier: LanguageSupportTier;
  code_bytes: number;            // Số byte code của ngôn ngữ này trong phạm vi root_dir_offset
}

export interface ProjectFingerprint {
  archetype: ProjectArchetype;
  primary_language: LanguageId;                 // Ngôn ngữ chiếm nhiều byte code nhất (xem Ingestion Bước 5, Thao tác 5)
  language_breakdown: LanguageSupportInfo[];    // Mọi ngôn ngữ có trong repo, sắp theo code_bytes giảm dần (hỗ trợ repo đa ngôn ngữ)
  graph_confidence: "HIGH" | "MIXED" | "LOW";   // HIGH: >= 80% byte thuộc tier RESOLVED; LOW: >= 50% byte thuộc tier STRUCTURAL
  detected_framework: string; // VD: "NestJS", "React Native", "Flutter", "FastAPI"
  is_monorepo: boolean;
  root_dir_offset: string;    // "" nếu single repo, "server/" hoặc "backend/" nếu monorepo
}

// ==========================================
// 3. Tầng kiến trúc linh hoạt theo Archetype (Canonical Layers)
// ==========================================
export type ArchitecturalLayer = 
  // Dùng chung cho Luồng Nghiệp vụ (Web, Mobile, Desktop, CLI) — thứ tự chuẩn của lát cắt:
  // ENTRY_POINT ➔ MIDDLEWARE (nếu có) ➔ BUSINESS_LOGIC ➔ DATA_ACCESS
  | "ENTRY_POINT"       // Cửa vào: Controller (Web), Screen/Widget (Mobile), Command (CLI)
  | "MIDDLEWARE"        // Chặn giữa: Middleware/Guard/Interceptor/Validator (Web); bước Validate (PROCEDURAL)
  | "BUSINESS_LOGIC"    // Xử lý: Service (Web), ViewModel/Bloc (Mobile), Handler (CLI)
  | "DATA_ACCESS"       // Dữ liệu: Repository/SQL (Web), LocalStore/APIClient (Mobile)
  // Dùng riêng cho Thuật toán VIP
  | "ALGO_SETUP"        // Khởi tạo Heap / Mảng / State
  | "ALGO_EXECUTION"    // Vòng lặp thư giãn cạnh / biến đổi trạng thái
  | "ALGO_TERMINATION"  // Điều kiện dừng & Trả kết quả
  // Tương thích ngược (Legacy Aliases) — không dùng trong code mới
  | "CONTROLLER" | "SERVICE" | "REPOSITORY" | "DATABASE";

export interface LayerDisplayMeta {
  layer: ArchitecturalLayer;
  display_name: string; // VD: Web hiện "Controller", Mobile hiện "Màn hình (Screen)"
  color_badge: string;
}

// Nguồn sinh tên node (Thuật toán 8 — 02_AST_SLICING_GRAPH.md), xếp theo thứ tự ưu tiên.
// Tên chắc: ROUTE, ENTRY_SYMBOL, VIRTUAL. Tên suy ra: DOMAIN_TERMS, DIRECTORY, FILE_BASENAME ➔ UI thêm tiền tố "~".
export type NodeTitleSource =
  | "ROUTE"          // Route HTTP / trang frontend / screen mobile / lệnh CLI đăng ký hàm entry
  | "ENTRY_SYMBOL"   // Tên hàm mở đầu lát cắt (kèm tên class nếu tên hàm chỉ có 1 token)
  | "DOMAIN_TERMS"   // Tối đa 2 từ khóa miền có điểm TF-IDF cao nhất trong các file của lát cắt
  | "DIRECTORY"      // Thư mục gần nhất không phải thư mục chung (src, services...)
  | "FILE_BASENAME"  // Tên file files[0] đã bỏ hậu tố vai trò — bậc cuối, luôn thành công
  | "VIRTUAL";       // Virtual Root / Virtual Node của chế độ suy biến

export interface ExecutionTraceStep {
  step_number: number;
  layer: ArchitecturalLayer;
  display_meta?: LayerDisplayMeta; // Nhãn hiển thị thân thiện trên UI Cột 3
  file_path: string;           // VD: "src/services/order.service.ts"
  function_name: string;       // VD: "checkout"
  line_start: number;          // Tọa độ dòng bắt đầu (1-indexed)
  line_end: number;            // Tọa độ dòng kết thúc
  snippet: string;             // Code hạt nhân 15–30 dòng (trần cứng 30 dòng/step)
  data_in?: string;            // Kiểu dữ liệu nhận vào (VD: "CreateOrderDTO")
  data_out?: string;           // Kiểu dữ liệu trả ra (VD: "OrderEntity")
}

// ==========================================
// 4. Bộ chỉ số Kiến trúc Uncle Bob theo Slice Scope
// ==========================================
export interface UncleBobMetrics {
  instability: number;         // I = Ce / (Ca + Ce), trong đoạn [0, 1]
  abstractness: number;        // A = Na / (Na + Nc), trong đoạn [0, 1]
  distance: number;            // D = |A + I - 1|, trong đoạn [0, 1]
  diagnosis: "BALANCED" | "ZONE_OF_PAIN" | "ZONE_OF_USELESSNESS";
  is_exempt?: boolean;         // true nếu miễn tính (D = 0, BALANCED) khi: lát cắt là UI Screen; lát cắt toàn JS thuần
                               // (không có cú pháp interface); mẫu số Ca+Ce = 0 hoặc Na+Nc = 0; ngôn ngữ STRUCTURAL
                               // chưa khai báo abstractionKinds (xem 02_AST_SLICING_GRAPH.md Thuật toán 6)
}

// ==========================================
// 5. Thử thách ẩn của lát cắt (1 Node = 1 Thử Thách Trọng Tâm)
// ==========================================
export interface HiddenChallenge {
  severity_level: 1 | 2 | 3;   // 1 = Security Fatal (secret lộ, thiếu auth); 2 = Bottleneck/Kiến trúc (N+1, chu trình phụ thuộc); 3 = còn lại
  kind: "SECURITY_FATAL" | "N_PLUS_ONE" | "CIRCULAR_DEPENDENCY" | "MISSING_TRANSACTION" | "LAYER_VIOLATION" | "OTHER";
  file_path: string;
  line_start: number;
  line_end: number;
  // Chỉ dùng ở server để gợi ý cho AI; KHÔNG hiển thị ở Tab 1 (chống lộ đề)
}

// ==========================================
// 6. Cấu trúc 1 Node Lai Kiến Trúc trên ReactFlow
// ==========================================
export interface HybridArchitecturalNode {
  id: string;                    // VD: "slice-order-checkout"
  title: string;                 // VD: "Order Checkout" — sinh tất định bởi Thuật toán 8 (0 token, không do AI đặt)
  title_source: NodeTitleSource; // Nguồn của tên; UI hiện tiền tố "~" khi nguồn thuộc nhóm suy ra
  title_evidence: string;        // Bằng chứng gốc cho tooltip, VD: "POST /orders/checkout", "OrderController.postCheckout"
  node_type: "ARCHITECTURAL_DATA_FLOW" | "ALGORITHMIC_CORE"; // Phân loại luồng dữ liệu vs thuật toán
  status: NodeStatus;            // Trạng thái KHỞI TẠO do Engine tính (mọi root = AVAILABLE, còn lại LOCKED);
                                 // khi chạy, trạng thái thật lấy từ LearnerCognitiveProfile.node_history
  is_auto_mastered?: boolean;    // true nếu được miễn thi do mọi kỹ năng BKT >= 0.92 (Fast-Track)
  preliminary_skills: SWESkill[]; // 1-3 kỹ năng gán tĩnh từ Tầng 2 để xét Auto-Pass trước khi gọi AI
  prerequisites: string[];       // Danh sách ID các node cha (để Dagre phân nhánh)
  position: { x: number; y: number }; // Tọa độ (x, y) do Dagre tính toán
  files: string[];               // Các file trong lát cắt (VD: ["order.controller.ts", "order.service.ts"]). Quy ước: files[0] = file Monaco mở mặc định (SuperNode: file có in-degree từ ngoài cụm cao nhất)
  languages: LanguageId[];       // Các ngôn ngữ của file trong lát cắt
  support_tier: LanguageSupportTier; // Tier THẤP NHẤT trong các file của lát cắt; "STRUCTURAL" ⇒ Cổng gác chạy Relaxed Mode
  cognitive_complexity: number;  // Điểm xoắn não SonarQube của lát cắt
  uncle_bob: UncleBobMetrics;
  is_vip_algorithm: boolean;     // true nếu được cấp vé VIP do thuật toán phức tạp
  hidden_challenge?: HiddenChallenge; // Ứng viên thử thách chính do Engine phát hiện (chỉ server dùng)
  retry_count: number;           // Giá trị khởi tạo = 0. Khi chạy, số lần sai thật lấy từ node_history (tối đa 3)
  trace_steps: ExecutionTraceStep[];
}

// ==========================================
// 7. Toàn bộ đồ thị trả về từ Static Engine
// ==========================================
export interface StaticEngineResult {
  repo_name: string;
  snapshot: RepoSnapshotKey;       // Định danh phiên bản code (commit SHA / SHA-256 zip) — xem Mục 4
  fingerprint: ProjectFingerprint; // Định danh hình thái dự án bóc tách từ Tầng 0
  total_files: number;
  nodes: HybridArchitecturalNode[]; // 6–8 node theo Display Budget (xem 02_AST_SLICING_GRAPH.md Thuật toán 7)
  edges: Array<{
    id: string;
    source: string;
    target: string;
    confidence: "RESOLVED" | "INFERRED"; // RESOLVED: nối bởi ImportResolver riêng; INFERRED: nối bởi Universal Resolver (UI vẽ nét đứt)
    ambiguous?: boolean;                 // true nếu một interface có nhiều implementor (UI vẽ nét đứt)
  }>;
  symbol_whitelist: string[];    // Sổ hộ khẩu Symbol dùng cho Cổng Gác Nhị Phân (quy tắc dựng: 02_AST_SLICING_GRAPH.md §5)
  ingestion_report?: IngestionReport; // Báo cáo cắt giảm / cảnh báo / chế độ suy biến (tùy chọn, không phá kiểu cũ)
}

// ==========================================
// 8. Bảng Mã Lỗi Chuẩn Tầng 0–2 (Nguồn chân lý duy nhất cho UI & Engine)
// ==========================================
export type IngestionErrorCode =
  | "ERR_INVALID_GITHUB_URL"        // Link không phải GitHub / sai cú pháp
  | "ERR_PREFLIGHT_404_OR_PRIVATE"  // Repo không tồn tại HOẶC private (GitHub trả 404 cho cả hai)
  | "ERR_NETWORK_TIMEOUT"           // Probe/stream quá thời gian — KHÔNG được gộp với 404
  | "ERR_BRANCH_NOT_FOUND"          // Không phân giải được ref (branch/tag/SHA)
  | "ERR_EMPTY_REPOSITORY"          // Repo chưa có commit nào
  | "ERR_REPO_UNAVAILABLE_451"      // Repo bị gỡ (DMCA / pháp lý)
  | "ERR_GITHUB_RATE_LIMIT_CDN"     // HTTP 429 từ github.com / codeload
  | "ERR_STREAM_TIMEOUT"            // Tải stream quá STREAM_TIMEOUT_MS
  | "ERR_STREAM_CORRUPTED"          // Stream đứt giữa chừng / zip hỏng chữ ký
  | "ERR_STREAM_QUOTA_EXCEEDED"     // Vượt MAX_STREAM_BYTES (chỉ là lỗi cứng khi chưa nạp được file nào)
  | "ERR_UNSUPPORTED_LANGUAGE"      // Phần lớn code thuộc ngôn ngữ KHÔNG có grammar Tree-sitter nào trong Language Registry (tier UNSUPPORTED). Ngôn ngữ tier STRUCTURAL KHÔNG gây lỗi này
  | "ERR_NO_SOURCE_FILES_FOUND"     // 0 file code hợp lệ (manifest KHÔNG được tính là code)
  | "ERR_NO_ARCHITECTURAL_SLICE";   // Tầng 1–2 không dựng được lát cắt nào sau mọi fallback

export interface IngestionReport {
  truncated: boolean;               // true nếu đã dừng nạp vì chạm quota (giữ phần đã có)
  code_file_count: number;          // Số file code thực sự nạp vào RAMCodeStore
  manifest_count: number;           // Số manifest nạp vào ManifestStore (không tính quota 50)
  skipped: {
    garbage: number;                // Khớp IGNORE_DIR_SEGMENTS / IGNORE_FILE_PATTERNS
    binary: number;                 // Null byte / symlink / LFS pointer
    oversized: number;              // > MAX_SINGLE_FILE_BYTES hoặc dòng quá dài (minified)
    unsupported_lang: number;       // Đuôi file thuộc ngôn ngữ không có grammar trong Language Registry (tier UNSUPPORTED)
    quota: number;                  // Bị loại do FilePriorityScore thấp (ngoài Top-50)
    parse_error: number;            // Tỉ lệ node ERROR của Tree-sitter > 30%
  };
  warnings: string[];               // Thông điệp tiếng Việt hiển thị cho người học
  degraded_mode?: "PROCEDURAL" | "ALGORITHM_COLLECTION"; // Chế độ suy biến của Tầng 1–2 (nếu có)
  redacted_secret_count?: number;   // Số secret đã bị SecretRedactor che trước khi gửi AI
  suspicious_instruction_files?: string[]; // File có comment/string nghi prompt-injection (cờ suspicious_instruction_comment) — không hiển thị cho người học
}
```

---

# 2. HỢP ĐỒNG DỮ LIỆU NGỮ CẢNH & AI COPILOT (TẦNG 3, 4)

```typescript
// ==========================================
// 1. Đóng gói Context Sandwich gửi cho Gemini (chỉ tồn tại ở SERVER)
// ==========================================
export interface ContextSandwichPayload {
  macro_context: {
    repo_name: string;
    archetype: ProjectArchetype;
    primary_language: LanguageId;
    graph_confidence: "HIGH" | "MIXED" | "LOW"; // Từ ProjectFingerprint; LOW ⇒ prompt dặn AI không khẳng định chắc chắn quan hệ gọi hàm
    is_monorepo: boolean;
    tech_stack: string[];        // Trích xuất từ mọi manifest trong ManifestStore (package.json, requirements.txt, pom.xml, go.mod, pubspec.yaml...)
    node_id: string;
    node_title: string;          // = HybridArchitecturalNode.title; chỉ đọc — AI không đổi tên node
    node_type: "ARCHITECTURAL_DATA_FLOW" | "ALGORITHMIC_CORE";
    degraded_mode?: "PROCEDURAL" | "ALGORITHM_COLLECTION"; // Có giá trị ⇒ Mode B
    dag_predecessors: string[];  // Node đứng trước
    dag_successors: string[];    // Node đứng sau
  };
  micro_trace: {
    scoped_code_snippet: string; // ≤ 100 dòng code thật (≤ 30 dòng/step), ≤ 1,500 token, đã che secret
    dto_interfaces: string;      // Định nghĩa kiểu dữ liệu DTO liên quan
    hidden_challenge?: HiddenChallenge; // Gợi ý điểm thử thách chính cho AI (nếu Engine phát hiện được)
  };
  invariants: {
    learner_persona_tier: "NOVICE" | "PRACTITIONER" | "ARCHITECT"; // Tier tính từ kỹ năng yếu nhất (BKT Mục 3)
    allowed_skills: SWESkill[];            // = preliminary_skills của node; target_skills AI trả về PHẢI là tập con
    forbidden_external_keywords: string[]; // Dynamic Blacklist đã lọc trừ tech_stack thật
  };
}

// ==========================================
// 2. Dữ liệu mổ xẻ & Thử thách Feynman do AI trả về (bản đầy đủ — chỉ ở SERVER)
// ==========================================
export interface CandidateProbe {
  angle: string;
  probe: string;
  verdict: "SELECTED" | "REJECT" | string;
}

export interface ExecutionStepDisplay {
  step_index: number;
  label: string;
  file_path: string;
  highlight_lines: number[];     // Server ghi đè bằng [line_start..line_end] của trace_steps tương ứng — không tin dòng do AI tự sinh
}

export interface SocraticChallenge {
  feynman_question: string;
  smell_reveal_after_attempt: string; // Điểm Dở + giải pháp chuẩn. Đóng gói vào challenge_token, KHÔNG gửi về client cho tới khi đạt / hết 3 lần thử / bỏ qua
}

export interface EnrichedSliceResponse {
  _internal_reasoning?: {
    candidate_probes: CandidateProbe[];
  };
  internal_design_xray: {
    identified_pattern: string;  // VD: "Layered Architecture + Dependency Injection" (Điểm Hay)
    why_it_works: string;        // Lý do thiết kế (Điểm Hay) — không được nêu Điểm Dở
    execution_steps: ExecutionStepDisplay[]; // Không chứa đáp án lỗi để tránh lộ đề
  };
  referenced_symbols: string[];  // Danh sách các biến/hàm đối chiếu symbol_whitelist (rỗng ⇒ Cổng gác REJECT)
  target_skills: SWESkill[];     // Ánh xạ vào vector q-Matrix 16 kỹ năng SWE; bắt buộc ⊆ allowed_skills
  socratic_challenge: SocraticChallenge; // Thử thách sư phạm Feynman
}

// ==========================================
// 3. Phản hồi gửi về CLIENT của POST /api/enrich-node (Anti-Spoiler)
// ==========================================
export interface ChallengeTokenPayload {   // Server mã hóa AES-GCM thành challenge_token; client không đọc được
  node_id: string;
  feynman_question: string;
  reference_answer: string;                // = smell_reveal_after_attempt
  target_skills: SWESkill[];
  snippet_hash: string;                    // Để bộ chấm lấy đúng đoạn code đã dùng khi hỏi
  issued_at: number;
}

export interface EnrichNodeClientResponse {
  node_id: string;
  internal_design_xray: EnrichedSliceResponse["internal_design_xray"]; // Hiển thị ở Tab 1
  feynman_question: string;                // Hiển thị ở Tab 2
  target_skills: SWESkill[];
  challenge_token: string;                 // Gửi kèm khi nộp bài / xin mở đáp án
  is_fallback: boolean;                    // true nếu Cổng gác REJECT và đây là câu hỏi AST tĩnh
}

export interface EnrichNodeRequest {        // POST /api/enrich-node
  session_id: string;                      // Server tra learning_sessions ⇒ snapshot ⇒ StaticEngineResult (cache hoặc dựng lại)
  node_id: string;
  // KHÔNG gửi learner_persona_tier: server tự tính từ skill_states đã decay (04_LUU_TRU_VA_DONG_BO.md Mục 6.1)
}

// ==========================================
// 4. Nộp bài Feynman & mở đáp án
// ==========================================
export interface EvaluateFeynmanRequest {   // POST /api/evaluate-feynman
  session_id: string;
  node_id: string;
  challenge_token: string;                 // Server giải mã để lấy câu hỏi, đáp án tham chiếu, target_skills, snippet
  student_answer: string;
  attempt_number: 1 | 2 | 3;               // Chỉ để đối chiếu: server tự đếm từ node_progress.retry_count, lệch ⇒ ERR_ATTEMPT_OUT_OF_SYNC
}

export interface RevealRequest {           // POST /api/reveal — khi người học bấm "Bỏ qua node này"
  session_id: string;
  node_id: string;
  challenge_token: string;
}

// ==========================================
// 5. Kết quả Chấm điểm Phản biện Feynman
// ==========================================
export interface FeynmanEvaluationResult {
  core_accuracy: number;         // Hiểu đúng vì sao code viết như vậy + bám đúng code thật (0 - 100). Tiêu chí duy nhất quyết định Đạt
  simplicity: number;            // Điểm cộng: diễn đạt dễ hiểu / có ẩn dụ đời thường (0 - 100). Không ảnh hưởng Đạt/Trượt
  is_passed: boolean;            // true nếu core_accuracy >= 70 (backend tự tính lại, không tin giá trị model trả về)
  feedback: string;              // Nhận xét phản hồi 2 câu từ AI Co-Architect
  detected_jargons: string[];    // Thuật ngữ chuyên ngành xuất hiện trong câu trả lời, chỉ để gợi ý giải nghĩa, không trừ điểm
  smell_reveal?: string;         // Chỉ có khi is_passed === true hoặc attempt_number === 3
}

// ==========================================
// 6. Gói dữ liệu Demo Offline (Ctrl + Shift + D)
// ==========================================
export interface OfflineMockBundle {       // File public/demo/mock_repo_shop.json
  bundle_version: string;
  recorded_from: { repo: string; ref: string; recorded_at: string }; // GHI LẠI từ output thật của engine, không viết tay
  static_result: StaticEngineResult;
  enrich_responses: Record<string, EnrichNodeClientResponse>;          // Theo node_id
  reveal_texts: Record<string, string>;                                // Theo node_id
  sample_evaluations: Record<string, FeynmanEvaluationResult[]>;       // Theo node_id, dùng khi chấm offline
}
```

---

# 3. HỢP ĐỒNG DỮ LIỆU ĐỘNG CƠ NHẬN THỨC BAYES (TẦNG 5)

```typescript
// ==========================================
// 1. Không gian 16 Kỹ năng SWE Chuẩn Cố định (q-Matrix)
// ==========================================
export const SWE_SKILLS = [
  "HTTP_ROUTING",
  "DTO_VALIDATION",
  "AUTH_SECURITY",
  "DEPENDENCY_INJECTION",
  "LAYERED_SEPARATION",
  "DB_OPTIMIZATION",
  "ASYNC_CONCURRENCY",
  "TRANSACTION_INTEGRITY",
  "ERROR_HANDLING",
  "STATE_MANAGEMENT",
  "ALGORITHMIC_COMPLEXITY",
  "MEMORY_MANAGEMENT",
  "API_CONTRACT_DESIGN",
  "CACHING_STRATEGY",
  "RATE_LIMIT_RESILIENCE",
  "DATA_SERIALIZATION"
] as const;

export type SWESkill = typeof SWE_SKILLS[number];

// ==========================================
// 2. Trạng thái Bộ nhớ Nhận thức BKT
//    Nguồn chân lý: Postgres (bảng skill_states, node_progress — 04_LUU_TRU_VA_DONG_BO.md Mục 4), CHỈ server ghi.
//    Zustand ở client giữ bản sao chỉ đọc do server trả về; client không tự gọi updateBKTState.
// ==========================================
export interface CognitiveSkillState {
  skill: SWESkill;
  p_mastery: number;           // P(L_t) GỐC sau lần cập nhật BKT gần nhất ∈ [0.01, 0.99]. Decay KHÔNG ghi đè trường này
  last_practiced_at: number;   // Timestamp (mili-giây) lần nộp bài gần nhất có kỹ năng này
  practice_count: number;      // Tổng số lần nộp bài liên quan đến kỹ năng
  correct_count: number;       // Số lần trả lời đạt
  // decayed_p_mastery KHÔNG lưu: tính khi đọc bằng getDecayedMastery(record, now) (BKT Mục 4)
}

export interface NodeProgressRecord {
  node_id: string;
  status: NodeStatus;
  is_auto_mastered: boolean;
  has_warning: boolean;        // true nếu node được mở khóa khi có node cha FAILED (soft-bypass) — UI hiện tam giác vàng. Không lưu DB: suy ra khi đọc
  retry_count: number;         // Số lần trả lời sai (0–3); = 3 ⇒ FAILED
  last_attempt_at: number;
}

export interface LearnerCognitiveProfile {
  user_id: string;             // = auth.users.id của Supabase (khách ẩn danh cũng có)
  overall_tier: "NOVICE" | "PRACTITIONER" | "ARCHITECT";
  last_updated_at: number;
  skills: Record<SWESkill, CognitiveSkillState>; // Đi theo NGƯỜI HỌC, dùng chung mọi repo
  node_history: Record<string, NodeProgressRecord>; // Theo node_id, CHỈ của phiên học đang mở (node_id chỉ duy nhất trong 1 snapshot)
}

// ==========================================
// 3. Cấu hình Giả lập Persona Demo
// ==========================================
export type PersonaMode = "NEWBIE" | "MID_LEVEL" | "SENIOR_RUSTY";

export interface PersonaConfig {
  mode: PersonaMode;
  name: string;
  description: string;
  initial_p_mastery: number;   // NEWBIE 0.25, MID_LEVEL 0.65, SENIOR_RUSTY 0.95
  simulated_days_idle: number; // Số ngày nghỉ để demo Half-Life Decay (SENIOR_RUSTY = 30)
}

// ==========================================
// 4. Trạng thái Bộ nhớ Đệm Nạp Ngầm (Pre-fetch Cache Store)
// ==========================================
export interface ClientWorkbenchState {
  active_node_id: string | null;
  active_tab: "XRAY_WALKTHROUGH" | "FEYNMAN_CHALLENGE";
  node_cache: Record<string, EnrichNodeClientResponse>; // Cache nạp ngầm; trúng cache ⇒ hiển thị ngay, không skeleton
  is_prefetching: boolean;
  is_offline_mode: boolean;    // true khi đã bấm Ctrl + Shift + D (nạp OfflineMockBundle) — không ghi Postgres
  user_profile: LearnerCognitiveProfile;
  session_id: string | null;   // Phiên học đang mở (learning_sessions.id); null trước khi quét repo
  pending_receipts: SyncReceipt[]; // Biên nhận chờ đồng bộ khi Postgres lỗi (Mục 4) — bản duy nhất giữ ở localStorage
}
```

---

# 4. HỢP ĐỒNG DỮ LIỆU TẦNG LƯU TRỮ & ĐỒNG BỘ (POSTGRES)

Bảng, luồng ghi và quy tắc: [`04_LUU_TRU_VA_DONG_BO.md`](04_LUU_TRU_VA_DONG_BO.md). Postgres **không** lưu mã nguồn hay snippet.

```typescript
// ==========================================
// 1. Định danh phiên bản code
// ==========================================
export interface RepoSnapshotKey {
  source: "GITHUB" | "ZIP";
  repo_key: string;              // "owner/repo" hoặc tên file zip
  snapshot_id: string;           // Commit SHA 40 ký tự (đọc từ comment zip) hoặc SHA-256 buffer zip
  snapshot_id_kind: "COMMIT_SHA" | "ARCHIVE_HASH"; // ARCHIVE_HASH ⇒ không tự mở lại được, phải upload lại
  subdir: string;                // "" khi phân tích cả repo
  ref_label?: string;            // Branch/tag người dùng nhập — chỉ để hiển thị
}

// ==========================================
// 2. Khung đồ thị lưu DB (KHÔNG chứa code)
// ==========================================
export interface GraphSkeletonNode {
  node_id: string;
  title: string;
  prerequisites: string[];
  preliminary_skills: SWESkill[];
  is_capstone: boolean;          // Capstone Lock (02_BAYES_COGNITIVE_BKT.md Mục 3.3) — server cần khi xét Fast-Track
}

// ==========================================
// 3. Phiên học
// ==========================================
export interface LearningSessionSummary {   // GET /api/sessions
  session_id: string;
  snapshot: RepoSnapshotKey;
  repo_name: string;
  created_at: number;
  last_active_at: number;
  completed_count: number;
  failed_count: number;
  total_nodes: number;
  can_resume: boolean;           // false nếu snapshot_id_kind = "ARCHIVE_HASH" hoặc nguồn ZIP (phải upload lại)
}

export type IngestRequest =                 // POST /api/ingest
  | { repoUrl: string }                     // Quét mới (JSON); upload zip dùng multipart trường "archive"
  | { session_id: string };                 // Mở lại phiên cũ: server tải lại đúng commit SHA

export interface IngestResponse {
  result: StaticEngineResult;
  session_id: string;
  profile: LearnerCognitiveProfile;         // node_history đã ghép từ node_progress của phiên này
}

// ==========================================
// 4. Phản hồi sau mỗi lần ghi tiến độ
// ==========================================
export interface EvaluateFeynmanResponse extends FeynmanEvaluationResult {
  profile: LearnerCognitiveProfile;         // Bản mới sau BKT — client thay thế toàn bộ, không tự tính
  unlocked_node_ids: string[];              // Node vừa mở (kể cả Fast-Track)
  sync_receipt?: SyncReceipt;               // Chỉ có khi Postgres lỗi (04_LUU_TRU_VA_DONG_BO.md Mục 7.1)
}

export interface SyncReceipt {              // Server ký HMAC-SHA256; client chỉ giữ hộ và gửi lại qua POST /api/sync/replay
  receipt_id: string;
  user_id: string;
  session_id: string;
  node_id: string;
  kind: "EVALUATE" | "REVEAL" | "REVIEW";
  payload: string;                          // JSON đã chuẩn hóa của QUAN SÁT (attempt_number, is_passed, target_skills, điểm, câu trả lời) — server tính lại BKT khi replay, không tin giá trị điểm kỹ năng
                                            // receipt_id đã ghi (cột unique feynman_attempts.receipt_id) ⇒ replay lần 2 bị bỏ qua
  issued_at: number;
  signature: string;
}

// ==========================================
// 5. Mã lỗi tầng lưu trữ
// ==========================================
export type PersistenceErrorCode =
  | "ERR_UNAUTHENTICATED"          // Thiếu phiên Supabase (khách cũng phải có phiên ẩn danh)
  | "ERR_SESSION_NOT_FOUND"        // session_id không tồn tại hoặc không thuộc người dùng
  | "ERR_SESSION_SOURCE_EXPIRED"   // Cache hết hạn và không tải lại được (nguồn ZIP / ARCHIVE_HASH / commit đã bị xóa) ⇒ mời upload lại
  | "ERR_ATTEMPT_OUT_OF_SYNC"      // attempt_number lệch retry_count trên server (thường do 2 tab)
  | "ERR_NODE_NOT_AVAILABLE"       // Nộp bài cho node LOCKED / COMPLETED / FAILED
  | "ERR_PERSISTENCE_UNAVAILABLE"; // Postgres lỗi sau 2 lần thử lại và không phát được sync_receipt
```
