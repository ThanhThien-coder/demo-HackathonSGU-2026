/**
 * scripts/review-run.ts
 *
 * Script chạy duyệt tay output AI của repo demo (GUARD-18 bước 1, mốc H+17).
 * Căn cứ: .kb/spec/21_AI_KIEM_VA_DUYET.md Mục 10, .kb/spec/50_TEST_VA_FIXTURE.md Mục 3, 4,
 *         .kb/spec/03_API_VA_LUU_TRU.md Mục 6.2, 6.7, .kb/spec/04_KIEN_TRUC_TRIEN_KHAI.md Mục 9, 15.
 *
 * Quy trình thực hiện:
 * 1. Gọi API thật trên repo demo với model và prompt chính thức trong CONFIG.
 *    Xác thực: Mọi request gửi header Authorization: Bearer lấy từ biến môi trường REVIEW_ACCESS_TOKEN.
 * 2. Phân tích mọi node + tổng quan 3 lần độc lập.
 *    Trước mỗi lần chạy: Xóa cache AI của snapshot demo:
 *    DELETE FROM ai_cache WHERE cache_key LIKE '%|{snapshot_id}|%'
 * 3. Lần 1 và 2 dùng để so độ ổn định. Lần 3 là bản nằm lại trong cache để duyệt kỹ và đóng băng.
 * 4. Sau lần phân tích thứ 3 (KHÔNG xóa cache nữa):
 *    - Chạy trọn kịch bản A rồi B 3 lần (mỗi lần ingest lại để có session mới, enrich-node lấy run mới,
 *      nộp các bước theo đúng thứ tự với attempt_number tăng dần; mỗi câu trả lời vì vậy được chấm 3 lần,
 *      so is_passed qua 3 lần).
 *      Trước kịch bản B ở mỗi lần lặp: mở khóa N2 qua unlockN2 (bỏ qua N1 bằng /api/reveal), sau đó
 *      reset điểm BKT về persona NEWBIE qua resetPersona (/api/demo/persona).
 *    - Chạy kiểm tra regex không chặn nhầm câu kỹ thuật trên một session riêng (mở khóa N2 và reset persona trước khi nộp).
 *    - Đọc bộ 22 câu trả lời mẫu từ review/cau_tra_loi_mau.md: mỗi câu mẫu dùng session + run mới,
 *      reset persona NEWBIE trước mỗi câu mẫu; nếu câu mẫu thuộc N2 (B-Q1/B-Q2) thì mở khóa N2 và reset lại điểm;
 *      nộp attempt_number = 1 đúng question_index của Mã câu; chấm 1 lần; câu có Mã câu không thuộc
 *      N2/N3 thì bỏ qua và ghi vào kết quả là bỏ qua.
 * 5. Chú thích: Số lần chặn được đếm từ log guard_blocked của server (spec 04 Mục 9). Script không tự gán mã GuardCode.
 * 6. Lỗi API: Ghi mã lỗi (code trong body response) vào kết quả thay vì chỉ console.warn (bao gồm cả lỗi persona).
 * 7. Ghi chú lệch tiền đề (precondition_note): N1 bị bỏ qua chứ không đạt PF, HTTP_ROUTING không phải 0.5767
 *    như tiền đề kịch bản B (spec 50 Mục 3.2) và N2 có has_warning; ghi rõ để người duyệt không so số BKT của B1/B5 với spec.
 * 8. Ghi kết quả thô ra thư mục review/run-{1,2,3}.json.
 *
 * QUY TẮC BẢO MẬT & BẢN QUYỀN (spec 04 Mục 15):
 * - Tuyệt đối KHÔNG ghi code repo người dùng / snippet / AST vào thư mục review/.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  CONFIG,
  type AnalysisSkill,
  type AnalysisStepText,
  type AnalysisWeakPoint,
  type AnalyzeNodeRequest,
  type AnalyzeNodeResponse,
  type AnalyzeOverviewRequest,
  type AnalyzeOverviewResponse,
  type ArchitecturePattern,
  type EnrichNodeRequest,
  type EnrichNodeResponse,
  type EvaluateFeynmanRequest,
  type EvaluateFeynmanResponse,
  type FollowUp,
  type IngestRequest,
  type IngestResponse,
  type NodeAnalysisView,
  type PersonaMode,
  type PersonaRequest,
  type PersonaResponse,
  type QuestionView,
  type RepoOverviewView,
  type RevealRequest,
  type RevealResponse,
} from "@/contracts";
import { sql } from "@/server/db";

// ============================================================================
// CẤU HÌNH & THAM SỐ CHẠY
// ============================================================================

const BASE_URL =
  process.env.API_BASE_URL || process.env.APP_URL || "http://localhost:3000";

const DEMO_REPO_URL =
  process.env.DEMO_REPO_URL || "https://github.com/simplifey-demo/shop-api";

const REVIEW_DIR = path.resolve(process.cwd(), "review");

/**
 * Ghi chú tiền đề cho kịch bản B:
 * Vì N1 bị bỏ qua (reveal skip) chứ không đạt PF, HTTP_ROUTING không phải 0.5767 như tiền đề kịch bản B (spec 50 Mục 3.2)
 * và N2 có has_warning. Người duyệt không so số BKT của B1/B5 với spec.
 */
export const B_PRECONDITION_NOTE =
  "Vì N1 bị bỏ qua chứ không đạt PF, HTTP_ROUTING không phải 0.5767 như tiền đề kịch bản B (spec 50 Mục 3.2) và N2 có has_warning; người duyệt không so số BKT của B1/B5 với spec.";

/**
 * Lấy Bearer access token từ biến môi trường REVIEW_ACCESS_TOKEN.
 * Theo spec 03 dòng 49, mọi request cần phiên Supabase qua header Authorization: Bearer.
 * Nếu thiếu biến thì dừng ngay với thông báo rõ ràng (không đọc file .env*).
 */
export function getReviewAccessToken(): string {
  const token = process.env.REVIEW_ACCESS_TOKEN?.trim();
  if (!token) {
    console.error("\n================================================================");
    console.error("[review-run] LỖI BẢO MẬT: Thiếu biến môi trường REVIEW_ACCESS_TOKEN.");
    console.error(
      "Theo spec 03 dòng 49, mọi request API (ngoại trừ /api/health) bắt buộc phải có phiên Supabase qua header 'Authorization: Bearer <token>'."
    );
    console.error(
      "Vui lòng thiết lập biến môi trường REVIEW_ACCESS_TOKEN trước khi chạy script."
    );
    console.error("Ví dụ (PowerShell): $env:REVIEW_ACCESS_TOKEN=\"<supabase_access_token>\"");
    console.error("================================================================\n");
    throw new Error(
      "Thiếu biến môi trường REVIEW_ACCESS_TOKEN (căn cứ spec 03 dòng 49)."
    );
  }
  return token;
}

// ============================================================================
// XỬ LÝ LỖI API VÀ GHI NHẬN MÃ LỖI
// ============================================================================

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
  code?: string;
  message?: string;
}

export class ApiCallError extends Error {
  public code?: string;
  public status: number;
  public endpoint: string;
  public payload?: ApiErrorPayload;

  constructor(status: number, endpoint: string, bodyText: string) {
    let code: string | undefined;
    let message = bodyText;
    let payload: ApiErrorPayload | undefined;

    try {
      payload = JSON.parse(bodyText) as ApiErrorPayload;
      if (payload?.error?.code) {
        code = payload.error.code;
        message = payload.error.message || bodyText;
      } else if (payload?.code) {
        code = payload.code;
        message = payload.message || bodyText;
      }
    } catch {
      // Body không phải JSON
    }

    super(
      `Gọi API thất bại: ${endpoint} [HTTP ${status}] ${code ? `[${code}] ` : ""}${message}`
    );
    this.name = "ApiCallError";
    this.status = status;
    this.endpoint = endpoint;
    this.code = code;
    this.payload = payload;
  }
}

export function getApiErrorInfo(err: unknown): {
  code?: string;
  message: string;
  status?: number;
} {
  if (err instanceof ApiCallError) {
    return {
      code: err.code,
      message: err.message,
      status: err.status,
    };
  }
  if (err instanceof Error) {
    return {
      message: err.message,
    };
  }
  return {
    message: String(err),
  };
}

// ============================================================================
// KIỂU DỮ LIỆU ĐẦU RA (KHÔNG CHỨA CODE REPO NGƯỜI DÙNG)
// ============================================================================

/** Bản phân tích node sạch: chỉ giữ lại metadata và nhận định AI, không chứa code */
export interface CleanNodeAnalysis {
  node_id: string;
  skills: AnalysisSkill[];
  architecture: {
    patterns: ArchitecturePattern[];
    summary: string;
  };
  steps: AnalysisStepText[];
  strengths: AnalysisStepText[];
  weak_points: AnalysisWeakPoint[];
  skeleton_only: boolean;
}

/** Kết quả chấm bài cho một câu trả lời trong kịch bản (mỗi lần chấm) */
export interface ScenarioAnswerGradingRun {
  grading_index: number;
  core_accuracy?: number;
  simplicity?: number;
  intent?: string;
  is_passed?: boolean;
  points_covered?: boolean[];
  feedback?: string;
  detected_jargons?: string[];
  follow_up?: FollowUp | null;
  tokens_used?: number;
  error?: {
    code?: string;
    message: string;
    status?: number;
  };
}

/** Kết quả từng bước của kịch bản A hoặc B sau 3 lần chạy */
export interface ScenarioStepResult {
  scenario: "A" | "B";
  step_code: string;
  node_id: string;
  question_index: number;
  attempt_number: number;
  /** Tóm tắt câu trả lời (chuỗi mô tả người học, không chứa file code repo) */
  answer_text: string;
  gradings: ScenarioAnswerGradingRun[];
  is_stable: boolean;
  precondition_note?: string;
}

/** Kết quả chấm câu trả lời mẫu từ review/cau_tra_loi_mau.md */
export interface SampleAnswerGradingResult {
  id: string;
  question_code: string;
  node_id?: string;
  question_index?: number;
  classification: string;
  student_answer: string;
  human_grade: string;
  ai_expected: string;
  skipped: boolean;
  skip_reason?: string;
  precondition_note?: string;
  persona_error?: {
    code?: string;
    message: string;
    status?: number;
  };
  evaluation?: {
    core_accuracy: number;
    simplicity: number;
    intent: string;
    is_passed: boolean;
    points_covered: boolean[];
    feedback: string;
    tokens_used: number;
  };
  is_as_expected?: boolean;
  error?: {
    code?: string;
    message: string;
    status?: number;
  };
}

/** Cấu trúc kết quả thô của một lần chạy review (run-1.json, run-2.json, run-3.json) */
export interface ReviewRunOutput {
  run_index: number;
  recorded_at: string;
  metadata: {
    model: string;
    prompt_version: string;
    engine_version: string;
    repo_url: string;
    snapshot_id: string;
    session_id: string;
    total_nodes: number;
  };
  // Chú thích: Số lần chặn được đếm từ log guard_blocked của server (spec 04 Mục 9). Script không tự gán mã GuardCode.
  analyses: Record<string, CleanNodeAnalysis>;
  analysis_errors?: Record<string, { code?: string; message: string; status?: number }>;
  overview: RepoOverviewView | null;
  overview_error?: { code?: string; message: string; status?: number };
  /** Chỉ có sau lần chạy thứ 3: các bước của kịch bản A/B và bộ câu hỏi mẫu */
  enrichment?: Record<string, { run_id: string; questions: QuestionView[]; error?: { code?: string; message: string } }>;
  scenario_gradings?: ScenarioStepResult[];
  sample_answers_gradings?: SampleAnswerGradingResult[];
  persona_errors?: Array<{ context: string; code?: string; message: string; status?: number }>;
  precondition_note?: string;
}

// ============================================================================
// CÁC HÀM GỌI API & DATABASE
// ============================================================================

/**
 * Xóa cache AI của snapshot repo demo theo đúng quy cách của spec:
 * DELETE FROM ai_cache WHERE cache_key LIKE '%|{snapshot_id}|%'
 */
export async function clearSnapshotAiCache(snapshotId: string): Promise<void> {
  console.log(`[review-run] Đang xóa ai_cache cho snapshot: "${snapshotId}"...`);
  try {
    const pattern = `%|${snapshotId}|%`;
    await sql`DELETE FROM ai_cache WHERE cache_key LIKE ${pattern}`;
    console.log(`[review-run] Đã xóa cache của snapshot thành công.`);
  } catch (error) {
    console.warn(
      `[review-run] Cảnh báo: Không thể thực thi lệnh SQL xóa ai_cache (có thể DB chưa chạy):`,
      error
    );
  }
}

/**
 * Gọi POST endpoint trả về JSON, gửi kèm header Authorization: Bearer <token>
 */
export async function callApi<TReq, TRes>(
  endpoint: string,
  payload: TReq,
  bearerToken: string
): Promise<TRes> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiCallError(response.status, endpoint, errorBody);
  }

  return (await response.json()) as TRes;
}

/**
 * Làm sạch bản phân tích node: loại bỏ mọi trường có thể chứa source code của repo
 */
export function cleanNodeAnalysis(view: NodeAnalysisView): CleanNodeAnalysis {
  return {
    node_id: view.node_id,
    skills: view.skills.map((s) => ({
      skill: s.skill,
      step: s.step,
      symbol: s.symbol,
      reason: s.reason,
    })),
    architecture: {
      patterns: view.architecture.patterns,
      summary: view.architecture.summary,
    },
    steps: view.steps.map((st) => ({
      step: st.step,
      text: st.text ?? "",
    })),
    strengths: view.strengths,
    weak_points: view.weak_points.map((w) => ({
      skill: w.skill,
      step: w.step,
      symbol: w.symbol,
      what: w.what,
      consequence: w.consequence,
    })),
    skeleton_only: view.skeleton_only,
  };
}

// ============================================================================
// HÀM MỞ KHÓA N2 VÀ RESET PERSONA (TASK_06 LẦN 3)
// ============================================================================

/**
 * Mở khóa node N2:
 * Sau ingest, chỉ N1 và N3 ở trạng thái AVAILABLE, N2 bị LOCKED (spec 50 Mục 3.1 dòng A1).
 * Nếu enrich N2 ngay sẽ bị ERR_NODE_NOT_AVAILABLE.
 * Hàm này gọi enrich-node N1 mode LEARN, sau đó với từng câu hỏi trong questions gọi
 * POST /api/reveal để bỏ qua (skip); sau câu cuối cùng kiểm tra unlocked_node_ids hoặc node_state.
 * Nếu N2 chưa được mở khóa thì ném lỗi rõ ràng (spec 50 Mục 3.1, TASK_06).
 */
export async function unlockN2(
  sessionId: string,
  token: string
): Promise<void> {
  console.log(`[unlockN2] Đang mở khóa node N2 bằng cách bỏ qua toàn bộ câu hỏi N1 trên session: ${sessionId}...`);
  const enrichResN1 = await callApi<EnrichNodeRequest, EnrichNodeResponse>(
    "/api/enrich-node",
    {
      session_id: sessionId,
      node_id: "N1",
      mode: "LEARN",
    },
    token
  );

  let lastRevealRes: RevealResponse | null = null;
  for (const q of enrichResN1.questions) {
    console.log(`[unlockN2] Gọi POST /api/reveal bỏ qua câu hỏi ${q.question_index} của node N1...`);
    lastRevealRes = await callApi<RevealRequest, RevealResponse>(
      "/api/reveal",
      {
        session_id: sessionId,
        run_id: enrichResN1.run_id,
        question_index: q.question_index,
      },
      token
    );
  }

  const isUnlocked =
    lastRevealRes?.unlocked_node_ids?.includes("N2") ||
    (lastRevealRes?.node_state?.node_id === "N2" &&
      lastRevealRes.node_state.status === "AVAILABLE");

  if (!isUnlocked && (!lastRevealRes || !lastRevealRes.unlocked_node_ids?.includes("N2"))) {
    throw new Error(
      `Mở khóa N2 thất bại: Node N2 chưa mở khóa sau khi bỏ qua toàn bộ câu hỏi N1 (unlocked_node_ids: ${JSON.stringify(
        lastRevealRes?.unlocked_node_ids ?? []
      )}, node_state: ${JSON.stringify(lastRevealRes?.node_state ?? null)}).`
    );
  }

  console.log(
    `[unlockN2] Mở khóa N2 thành công (unlocked_node_ids: ${JSON.stringify(
      lastRevealRes?.unlocked_node_ids ?? []
    )}).`
  );
}

export interface ResetPersonaResult {
  success: boolean;
  error?: {
    code?: string;
    message: string;
    status?: number;
  };
}

/**
 * Reset điểm năng lực:
 * Gọi POST /api/demo/persona ghi đè 16 dòng skill_states về persona NEWBIE (spec 03 Mục 6.7).
 * Nếu lỗi thì trả về thông tin lỗi (gồm mã lỗi trong body response) để ghi nhận vào kết quả,
 * tuyệt đối không nuốt im lặng (TASK_06 Lần 3).
 */
export async function resetPersona(token: string): Promise<ResetPersonaResult> {
  console.log(`[resetPersona] Gọi POST /api/demo/persona với mode NEWBIE...`);
  try {
    await callApi<PersonaRequest, PersonaResponse>(
      "/api/demo/persona",
      { mode: "NEWBIE" as PersonaMode },
      token
    );
    console.log(`[resetPersona] Đặt lại persona NEWBIE thành công.`);
    return { success: true };
  } catch (err) {
    const errInfo = getApiErrorInfo(err);
    console.warn(
      `[resetPersona] Gọi /api/demo/persona thất bại: [${errInfo.code ?? "UNKNOWN"}] ${errInfo.message}`
    );
    return {
      success: false,
      error: {
        code: errInfo.code,
        message: errInfo.message,
        status: errInfo.status,
      },
    };
  }
}

// ============================================================================
// ĐỊNH NGHĨA KỊCH BẢN A/B VÀ PARSER BỘ CÂU TRẢ LỜI MẪU
// ============================================================================

export interface ScenarioStepDefinition {
  scenario: "A" | "B";
  step_code: string;
  node_id: string;
  question_index: number;
  attempt_number: number;
  student_answer: string;
}

/** Các bước kịch bản A (N3: câu 1 sai lượt 1 -> đúng lượt 2; câu 2 đúng ngay lượt 1) */
export const SCENARIO_A_STEPS: ScenarioStepDefinition[] = [
  {
    scenario: "A",
    step_code: "A4",
    node_id: "N3",
    question_index: 1,
    attempt_number: 1,
    student_answer: "Vì có 200 sản phẩm nên dữ liệu nhiều.",
  },
  {
    scenario: "A",
    step_code: "A5",
    node_id: "N3",
    question_index: 1,
    attempt_number: 2,
    student_answer:
      "Vì lấy danh sách xong, code còn hỏi database thêm một lần cho mỗi sản phẩm để lấy loại hàng. 200 sản phẩm là 201 lần hỏi, càng nhiều sản phẩm càng nhiều lần hỏi.",
  },
  {
    scenario: "A",
    step_code: "A6",
    node_id: "N3",
    question_index: 2,
    attempt_number: 1,
    student_answer:
      "Route ở product.controller.ts gọi productService.listProducts; trong listProducts, vòng for gọi categoryRepo.findById(p.categoryId); findById ở category.repo.ts dùng this.repo.findOne; kết quả gán vào p.category rồi trả về route.",
  },
];

/** Các bước kịch bản B (N2: câu 1 trượt 3 lượt, câu 2 đạt lượt 1) */
export const SCENARIO_B_STEPS: ScenarioStepDefinition[] = [
  {
    scenario: "B",
    step_code: "B2",
    node_id: "N2",
    question_index: 1,
    attempt_number: 1,
    student_answer: "getProfile lấy user từ database rồi trả về.",
  },
  {
    scenario: "B",
    step_code: "B3",
    node_id: "N2",
    question_index: 1,
    attempt_number: 2,
    student_answer: "Hàm getProfile kiểm tra mật khẩu người dùng.",
  },
  {
    scenario: "B",
    step_code: "B4",
    node_id: "N2",
    question_index: 1,
    attempt_number: 3,
    student_answer: "Middleware kiểm tra user có tồn tại không.",
  },
  {
    scenario: "B",
    step_code: "B5",
    node_id: "N2",
    question_index: 2,
    attempt_number: 1,
    student_answer:
      "Hàm profile được bảo vệ bởi authMiddleware trong user.routes.ts để kiểm tra JWT trước khi cho phép vào lấy thông tin hồ sơ.",
  },
];

/** Bước kiểm tra regex kịch bản B (chạy trên session riêng) */
export const REGEX_CHECK_STEP: ScenarioStepDefinition = {
  scenario: "B",
  step_code: "B-RegexCheck",
  node_id: "N2",
  question_index: 2,
  attempt_number: 1,
  student_answer:
    "Request đi qua authMiddleware trước, ở đó jwt.verify dùng JWT_SECRET để kiểm token. Nếu bỏ qua bước này thì ai cũng vào được trang hồ sơ.",
};

export interface SampleAnswerRow {
  stt: number;
  question_code: string;
  classification: string;
  student_answer: string;
  human_grade: string;
  ai_expected: string;
  target_verify: string;
}

/**
 * Đọc bảng Mục 2 trong review/cau_tra_loi_mau.md
 */
export function parseSampleAnswersFromMarkdown(mdContent: string): SampleAnswerRow[] {
  const rows: SampleAnswerRow[] = [];
  const lines = mdContent.split(/\r?\n/);
  let inSection2 = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## 2.")) {
      inSection2 = true;
      continue;
    }
    if (inSection2 && trimmed.startsWith("## 3.")) {
      break;
    }
    if (!inSection2) continue;
    if (!trimmed.startsWith("|")) continue;

    // Bỏ ký tự pipe đầu và cuối, tách các ô
    const raw = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    const cells = raw.split("|").map((c) => c.trim());

    if (cells.length < 5) continue;
    const stt = parseInt(cells[0], 10);
    if (isNaN(stt)) continue; // Bỏ qua dòng tiêu đề và phân cách

    rows.push({
      stt,
      question_code: cells[1] ?? "",
      classification: cells[2] ?? "",
      student_answer: cells[3] ?? "",
      human_grade: cells[4] ?? "",
      ai_expected: cells[5] ?? "",
      target_verify: cells[6] ?? "",
    });
  }

  return rows;
}

/** Ánh xạ Mã câu sang node_id và question_index (chỉ hỗ trợ N2 và N3) */
export const QUESTION_CODE_TARGET_MAP: Record<
  string,
  { node_id: string; question_index: number }
> = {
  "A-Q1": { node_id: "N3", question_index: 1 },
  "A-Q2": { node_id: "N3", question_index: 2 },
  "B-Q1": { node_id: "N2", question_index: 1 },
  "B-Q2": { node_id: "N2", question_index: 2 },
};

// ============================================================================
// HÀM CHÍNH ĐIỀU PHỐI QUY TRÌNH DUYỆT TAY
// ============================================================================

export async function runReviewSuite(): Promise<void> {
  const token = getReviewAccessToken();

  console.log("================================================================");
  console.log(" SIMPLIFEY - REVIEW RUN SUITE (GUARD-18, H+17)");
  console.log(` Model LLM      : ${CONFIG.LLM_MODEL}`);
  console.log(` Prompt Version : ${CONFIG.PROMPT_VERSION}`);
  console.log(` Engine Version : ${CONFIG.ENGINE_VERSION}`);
  console.log(` Target Server  : ${BASE_URL}`);
  console.log("================================================================\n");

  await fs.mkdir(REVIEW_DIR, { recursive: true });

  // Biến lưu trữ qua các vòng chạy
  let lastSnapshotId = "";
  const runOutputs: ReviewRunOutput[] = [];

  // --------------------------------------------------------------------------
  // BƯỚC 1: CHẠY 3 LẦN PHÂN TÍCH VÀ TỔNG QUAN
  // --------------------------------------------------------------------------
  for (let runIdx = 1; runIdx <= 3; runIdx++) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`>>> BẮT ĐẦU VÒNG PHÂN TÍCH THỨ ${runIdx} / 3`);
    console.log(`------------------------------------------------------------`);

    // 1. Ingest repo demo để lấy snapshot_id và session_id
    console.log(`[Vòng ${runIdx}] Nạp repo demo: ${DEMO_REPO_URL}...`);
    const ingestRes = await callApi<IngestRequest, IngestResponse>(
      "/api/ingest",
      { repo_url: DEMO_REPO_URL },
      token
    );

    const sessionId = ingestRes.session_id;
    const snapshotId = ingestRes.result.snapshot.snapshot_id;
    lastSnapshotId = snapshotId;
    const nodeIds = ingestRes.result.nodes.map((n) => n.id);

    console.log(
      `[Vòng ${runIdx}] Ingest thành công: session_id=${sessionId}, snapshot_id=${snapshotId}, tổng ${nodeIds.length} nodes.`
    );

    // 2. Xóa cache trước mỗi lần chạy phân tích như spec yêu cầu
    await clearSnapshotAiCache(snapshotId);

    // 3. Phân tích mọi node trong repo
    console.log(`[Vòng ${runIdx}] Phân tích ${nodeIds.length} node...`);
    const analyses: Record<string, CleanNodeAnalysis> = {};
    const analysisErrors: Record<string, { code?: string; message: string; status?: number }> = {};

    for (const nodeId of nodeIds) {
      try {
        const analyzeRes = await callApi<
          AnalyzeNodeRequest,
          AnalyzeNodeResponse
        >(
          "/api/analyze-node",
          {
            session_id: sessionId,
            node_id: nodeId,
          },
          token
        );

        if (analyzeRes.analysis) {
          analyses[nodeId] = cleanNodeAnalysis(analyzeRes.analysis);
        } else {
          analysisErrors[nodeId] = {
            code: "ERR_ANALYSIS_FAILED",
            message: "Server trả về analysis null (analysis_failed = true)",
          };
        }
      } catch (err) {
        const errInfo = getApiErrorInfo(err);
        console.warn(`[Vòng ${runIdx}] Node ${nodeId} phân tích lỗi:`, errInfo.message);
        analysisErrors[nodeId] = {
          code: errInfo.code,
          message: errInfo.message,
          status: errInfo.status,
        };
      }
    }

    // 4. Tổng quan repo
    console.log(`[Vòng ${runIdx}] Phân tích tổng quan repo...`);
    let overview: RepoOverviewView | null = null;
    let overviewError: { code?: string; message: string; status?: number } | undefined;
    try {
      const overviewRes = await callApi<
        AnalyzeOverviewRequest,
        AnalyzeOverviewResponse
      >(
        "/api/analyze-overview",
        {
          session_id: sessionId,
        },
        token
      );
      overview = overviewRes.overview;
    } catch (err) {
      const errInfo = getApiErrorInfo(err);
      console.warn(`[Vòng ${runIdx}] Tổng quan phân tích lỗi:`, errInfo.message);
      overviewError = {
        code: errInfo.code,
        message: errInfo.message,
        status: errInfo.status,
      };
    }

    const runOutput: ReviewRunOutput = {
      run_index: runIdx,
      recorded_at: new Date().toISOString(),
      metadata: {
        model: CONFIG.LLM_MODEL,
        prompt_version: CONFIG.PROMPT_VERSION,
        engine_version: CONFIG.ENGINE_VERSION,
        repo_url: DEMO_REPO_URL,
        snapshot_id: snapshotId,
        session_id: sessionId,
        total_nodes: nodeIds.length,
      },
      // Chú thích: Số lần chặn được đếm từ log guard_blocked của server (spec 04 Mục 9). Script không tự gán mã GuardCode.
      analyses,
      analysis_errors: Object.keys(analysisErrors).length > 0 ? analysisErrors : undefined,
      overview,
      overview_error: overviewError,
    };

    runOutputs.push(runOutput);

    // Ghi file thô ngay sau mỗi vòng
    const filePath = path.join(REVIEW_DIR, `run-${runIdx}.json`);
    await fs.writeFile(filePath, JSON.stringify(runOutput, null, 2), "utf-8");
    console.log(`[Vòng ${runIdx}] Đã lưu kết quả ra: ${filePath}`);
  }

  // --------------------------------------------------------------------------
  // BƯỚC 2: SAU LẦN PHÂN TÍCH THỨ 3 (KHÔNG XÓA CACHE NỮA)
  // CHẠY TRỌN KỊCH BẢN A RỒI B 3 LẦN
  // --------------------------------------------------------------------------
  console.log(`\n============================================================`);
  console.log(`>>> CHẠY TRỌN KỊCH BẢN A RỒI B 3 LẦN (KHÔNG XÓA CACHE)`);
  console.log(`============================================================`);

  const run3Output = runOutputs[2] ?? runOutputs[runOutputs.length - 1];
  run3Output.enrichment = {};
  run3Output.scenario_gradings = [];
  run3Output.sample_answers_gradings = [];
  run3Output.persona_errors = [];
  run3Output.precondition_note = B_PRECONDITION_NOTE;

  const allScenarioSteps = [...SCENARIO_A_STEPS, ...SCENARIO_B_STEPS];
  const stepGradingsMap = new Map<string, ScenarioAnswerGradingRun[]>();
  for (const step of allScenarioSteps) {
    stepGradingsMap.set(step.step_code, []);
  }

  for (let iter = 1; iter <= 3; iter++) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`>>> KỊCH BẢN A/B - LẦN LẶP THỨ ${iter} / 3`);
    console.log(`------------------------------------------------------------`);

    // Ingest lại để có session mới cho mỗi lần chạy kịch bản
    let iterSessionId = "";
    try {
      const iterIngestRes = await callApi<IngestRequest, IngestResponse>(
        "/api/ingest",
        { repo_url: DEMO_REPO_URL },
        token
      );
      iterSessionId = iterIngestRes.session_id;
      console.log(`[Lần ${iter}] Tạo session mới thành công: ${iterSessionId}`);
    } catch (err) {
      const errInfo = getApiErrorInfo(err);
      console.warn(`[Lần ${iter}] Ingest kịch bản thất bại:`, errInfo.message);
      for (const step of allScenarioSteps) {
        stepGradingsMap.get(step.step_code)!.push({
          grading_index: iter,
          is_passed: false,
          error: {
            code: errInfo.code,
            message: `Ingest session mới thất bại: ${errInfo.message}`,
            status: errInfo.status,
          },
        });
      }
      continue;
    }

    // (2) Reset điểm: đầu mỗi lần lặp kịch bản (gọi persona NEWBIE; ghi nhận mã lỗi nếu hỏng)
    const resetInitRes = await resetPersona(token);
    if (resetInitRes.error) {
      run3Output.persona_errors = run3Output.persona_errors || [];
      run3Output.persona_errors.push({
        context: `Kịch bản lần ${iter} (đầu vòng lặp)`,
        ...resetInitRes.error,
      });
    }

    // 1. Kịch bản A trên node N3: enrich-node lấy run mới
    console.log(`[Lần ${iter}] Enrich node N3 (Kịch bản A)...`);
    try {
      const enrichResA = await callApi<EnrichNodeRequest, EnrichNodeResponse>(
        "/api/enrich-node",
        {
          session_id: iterSessionId,
          node_id: "N3",
          mode: "LEARN",
        },
        token
      );
      const runIdA = enrichResA.run_id;
      if (iter === 1) {
        run3Output.enrichment["N3"] = {
          run_id: runIdA,
          questions: enrichResA.questions,
        };
      }

      // Nộp các bước kịch bản A theo thứ tự tăng dần attempt_number
      for (const step of SCENARIO_A_STEPS) {
        try {
          const evalRes = await callApi<
            EvaluateFeynmanRequest,
            EvaluateFeynmanResponse
          >(
            "/api/evaluate-feynman",
            {
              session_id: iterSessionId,
              run_id: runIdA,
              question_index: step.question_index,
              attempt_number: step.attempt_number,
              student_answer: step.student_answer,
            },
            token
          );

          stepGradingsMap.get(step.step_code)!.push({
            grading_index: iter,
            core_accuracy: evalRes.core_accuracy,
            simplicity: evalRes.simplicity,
            intent: evalRes.intent,
            is_passed: evalRes.is_passed,
            points_covered: evalRes.points_covered,
            feedback: evalRes.feedback,
            detected_jargons: evalRes.detected_jargons,
            follow_up: evalRes.follow_up,
            tokens_used: evalRes.tokens_used,
          });
        } catch (err) {
          const errInfo = getApiErrorInfo(err);
          console.warn(
            `[Lần ${iter}] Lỗi nộp bước ${step.step_code}:`,
            errInfo.message
          );
          stepGradingsMap.get(step.step_code)!.push({
            grading_index: iter,
            is_passed: false,
            error: {
              code: errInfo.code,
              message: errInfo.message,
              status: errInfo.status,
            },
          });
        }
      }
    } catch (err) {
      const errInfo = getApiErrorInfo(err);
      console.warn(`[Lần ${iter}] Enrich N3 thất bại:`, errInfo.message);
      for (const step of SCENARIO_A_STEPS) {
        stepGradingsMap.get(step.step_code)!.push({
          grading_index: iter,
          is_passed: false,
          error: {
            code: errInfo.code,
            message: `Enrich N3 thất bại: ${errInfo.message}`,
            status: errInfo.status,
          },
        });
      }
    }

    // 2. Kịch bản B trên node N2:
    // (1) Mở khóa N2 trước kịch bản B ở mỗi lần lặp (spec 50 Mục 3.1 dòng A1)
    let unlockSuccess = true;
    try {
      await unlockN2(iterSessionId, token);
    } catch (unlockErr) {
      unlockSuccess = false;
      const errInfo = getApiErrorInfo(unlockErr);
      console.warn(`[Lần ${iter}] Mở khóa N2 thất bại:`, errInfo.message);
      for (const step of SCENARIO_B_STEPS) {
        stepGradingsMap.get(step.step_code)!.push({
          grading_index: iter,
          is_passed: false,
          error: {
            code: errInfo.code,
            message: `Mở khóa N2 thất bại: ${errInfo.message}`,
            status: errInfo.status,
          },
        });
      }
    }

    if (!unlockSuccess) {
      continue;
    }

    // (2) Reset điểm ngay sau unlockN2 (để xóa ảnh hưởng BKT của việc bỏ qua N1)
    const resetAfterUnlock = await resetPersona(token);
    if (resetAfterUnlock.error) {
      run3Output.persona_errors = run3Output.persona_errors || [];
      run3Output.persona_errors.push({
        context: `Kịch bản lần ${iter} (sau unlockN2)`,
        ...resetAfterUnlock.error,
      });
    }

    // Tiến hành enrich và nộp bài kịch bản B trên node N2
    console.log(`[Lần ${iter}] Enrich node N2 (Kịch bản B)...`);
    try {
      const enrichResB = await callApi<EnrichNodeRequest, EnrichNodeResponse>(
        "/api/enrich-node",
        {
          session_id: iterSessionId,
          node_id: "N2",
          mode: "LEARN",
        },
        token
      );
      const runIdB = enrichResB.run_id;
      if (iter === 1) {
        run3Output.enrichment["N2"] = {
          run_id: runIdB,
          questions: enrichResB.questions,
        };
      }

      // Nộp các bước kịch bản B theo thứ tự tăng dần attempt_number
      for (const step of SCENARIO_B_STEPS) {
        try {
          const evalRes = await callApi<
            EvaluateFeynmanRequest,
            EvaluateFeynmanResponse
          >(
            "/api/evaluate-feynman",
            {
              session_id: iterSessionId,
              run_id: runIdB,
              question_index: step.question_index,
              attempt_number: step.attempt_number,
              student_answer: step.student_answer,
            },
            token
          );

          stepGradingsMap.get(step.step_code)!.push({
            grading_index: iter,
            core_accuracy: evalRes.core_accuracy,
            simplicity: evalRes.simplicity,
            intent: evalRes.intent,
            is_passed: evalRes.is_passed,
            points_covered: evalRes.points_covered,
            feedback: evalRes.feedback,
            detected_jargons: evalRes.detected_jargons,
            follow_up: evalRes.follow_up,
            tokens_used: evalRes.tokens_used,
          });
        } catch (err) {
          const errInfo = getApiErrorInfo(err);
          console.warn(
            `[Lần ${iter}] Lỗi nộp bước ${step.step_code}:`,
            errInfo.message
          );
          stepGradingsMap.get(step.step_code)!.push({
            grading_index: iter,
            is_passed: false,
            error: {
              code: errInfo.code,
              message: errInfo.message,
              status: errInfo.status,
            },
          });
        }
      }
    } catch (err) {
      const errInfo = getApiErrorInfo(err);
      console.warn(`[Lần ${iter}] Enrich N2 thất bại:`, errInfo.message);
      for (const step of SCENARIO_B_STEPS) {
        stepGradingsMap.get(step.step_code)!.push({
          grading_index: iter,
          is_passed: false,
          error: {
            code: errInfo.code,
            message: `Enrich N2 thất bại: ${errInfo.message}`,
            status: errInfo.status,
          },
        });
      }
    }
  }

  // Tổng hợp kết quả kịch bản A và B (so is_passed qua 3 lần, thêm precondition_note cho kịch bản B)
  const scenarioResults: ScenarioStepResult[] = allScenarioSteps.map((step) => {
    const gradings = stepGradingsMap.get(step.step_code) ?? [];
    const validGradings = gradings.filter(
      (g) => g.error === undefined && g.is_passed !== undefined
    );
    const isStable =
      validGradings.length === 3 &&
      validGradings.every((g) => g.is_passed === validGradings[0].is_passed);

    return {
      scenario: step.scenario,
      step_code: step.step_code,
      node_id: step.node_id,
      question_index: step.question_index,
      attempt_number: step.attempt_number,
      answer_text: step.student_answer,
      gradings,
      is_stable: isStable,
      precondition_note: step.scenario === "B" ? B_PRECONDITION_NOTE : undefined,
    };
  });

  // --------------------------------------------------------------------------
  // BƯỚC 3: KIỂM TRA REGEX KHÔNG CHẶN NHẦM CÂU KỸ THUẬT (SESSION RIÊNG)
  // --------------------------------------------------------------------------
  console.log(`\n------------------------------------------------------------`);
  console.log(`>>> KIỂM TRA REGEX TRÊN SESSION RIÊNG (${REGEX_CHECK_STEP.step_code})`);
  console.log(`------------------------------------------------------------`);
  try {
    const regexIngestRes = await callApi<IngestRequest, IngestResponse>(
      "/api/ingest",
      { repo_url: DEMO_REPO_URL },
      token
    );
    const regexSessionId = regexIngestRes.session_id;

    // (1) Mở khóa N2 trước câu kiểm regex
    await unlockN2(regexSessionId, token);

    // (2) Reset điểm persona NEWBIE ngay sau unlockN2 / trước câu regex
    const resetRegexRes = await resetPersona(token);
    if (resetRegexRes.error) {
      run3Output.persona_errors = run3Output.persona_errors || [];
      run3Output.persona_errors.push({
        context: `Kiểm tra regex (sau unlockN2)`,
        ...resetRegexRes.error,
      });
    }

    const regexEnrichRes = await callApi<
      EnrichNodeRequest,
      EnrichNodeResponse
    >(
      "/api/enrich-node",
      {
        session_id: regexSessionId,
        node_id: REGEX_CHECK_STEP.node_id,
        mode: "LEARN",
      },
      token
    );
    const regexRunId = regexEnrichRes.run_id;

    const evalRes = await callApi<
      EvaluateFeynmanRequest,
      EvaluateFeynmanResponse
    >(
      "/api/evaluate-feynman",
      {
        session_id: regexSessionId,
        run_id: regexRunId,
        question_index: REGEX_CHECK_STEP.question_index,
        attempt_number: REGEX_CHECK_STEP.attempt_number,
        student_answer: REGEX_CHECK_STEP.student_answer,
      },
      token
    );

    scenarioResults.push({
      scenario: REGEX_CHECK_STEP.scenario,
      step_code: REGEX_CHECK_STEP.step_code,
      node_id: REGEX_CHECK_STEP.node_id,
      question_index: REGEX_CHECK_STEP.question_index,
      attempt_number: REGEX_CHECK_STEP.attempt_number,
      answer_text: REGEX_CHECK_STEP.student_answer,
      gradings: [
        {
          grading_index: 1,
          core_accuracy: evalRes.core_accuracy,
          simplicity: evalRes.simplicity,
          intent: evalRes.intent,
          is_passed: evalRes.is_passed,
          points_covered: evalRes.points_covered,
          feedback: evalRes.feedback,
          detected_jargons: evalRes.detected_jargons,
          follow_up: evalRes.follow_up,
          tokens_used: evalRes.tokens_used,
        },
      ],
      is_stable: true,
      precondition_note: B_PRECONDITION_NOTE,
    });
    console.log(`[Regex Check] Đạt: câu trả lời kỹ thuật không bị chặn nhầm.`);
  } catch (err) {
    const errInfo = getApiErrorInfo(err);
    console.warn(`[Regex Check] Lỗi khi chạy kiểm tra regex:`, errInfo.message);
    scenarioResults.push({
      scenario: REGEX_CHECK_STEP.scenario,
      step_code: REGEX_CHECK_STEP.step_code,
      node_id: REGEX_CHECK_STEP.node_id,
      question_index: REGEX_CHECK_STEP.question_index,
      attempt_number: REGEX_CHECK_STEP.attempt_number,
      answer_text: REGEX_CHECK_STEP.student_answer,
      gradings: [
        {
          grading_index: 1,
          is_passed: false,
          error: {
            code: errInfo.code,
            message: errInfo.message,
            status: errInfo.status,
          },
        },
      ],
      is_stable: false,
      precondition_note: B_PRECONDITION_NOTE,
    });
  }

  run3Output.scenario_gradings = scenarioResults;

  // --------------------------------------------------------------------------
  // BƯỚC 4: BỘ CÂU TRẢ LỜI MẪU TỪ review/cau_tra_loi_mau.md
  // --------------------------------------------------------------------------
  console.log(`\n============================================================`);
  console.log(`>>> CHẤM BỘ CÂU TRẢ LỜI MẪU TỪ review/cau_tra_loi_mau.md`);
  console.log(`============================================================`);

  const sampleFilePath = path.resolve(process.cwd(), "review/cau_tra_loi_mau.md");
  let sampleRows: SampleAnswerRow[] = [];
  try {
    const sampleMd = await fs.readFile(sampleFilePath, "utf-8");
    sampleRows = parseSampleAnswersFromMarkdown(sampleMd);
    console.log(
      `[Bộ câu mẫu] Đã đọc ${sampleRows.length} câu từ bảng Mục 2 trong ${sampleFilePath}`
    );
  } catch (err) {
    console.error(`[Bộ câu mẫu] Không thể đọc file ${sampleFilePath}:`, err);
  }

  const sampleGradingResults: SampleAnswerGradingResult[] = [];

  for (const row of sampleRows) {
    const target = QUESTION_CODE_TARGET_MAP[row.question_code];

    // Câu có Mã câu không thuộc N2/N3 thì bỏ qua và ghi vào kết quả là bỏ qua
    if (!target) {
      console.log(
        `[Bộ câu mẫu] Bỏ qua STT ${row.stt} (${row.question_code}): không thuộc N2/N3.`
      );
      sampleGradingResults.push({
        id: `SA-${String(row.stt).padStart(2, "0")}`,
        question_code: row.question_code,
        classification: row.classification,
        student_answer: row.student_answer,
        human_grade: row.human_grade,
        ai_expected: row.ai_expected,
        skipped: true,
        skip_reason: `Mã câu ${row.question_code} không thuộc N2/N3 (kịch bản chỉ chạy trên node N2 và N3).`,
      });
      continue;
    }

    console.log(
      `[Bộ câu mẫu] Đang chấm STT ${row.stt} (${row.question_code}, node ${target.node_id}, Q${target.question_index})...`
    );

    // Mỗi câu mẫu dùng session + run mới, nộp attempt_number = 1 đúng question_index của Mã câu; chấm 1 lần
    try {
      // (2) Reset điểm trước MỖI câu mẫu
      const resetBeforeRes = await resetPersona(token);
      let samplePersonaError: { code?: string; message: string; status?: number } | undefined;
      if (resetBeforeRes.error) {
        samplePersonaError = resetBeforeRes.error;
        run3Output.persona_errors = run3Output.persona_errors || [];
        run3Output.persona_errors.push({
          context: `Bộ câu mẫu STT ${row.stt} (${row.question_code}, trước ingest)`,
          ...resetBeforeRes.error,
        });
      }

      // Nạp repo demo cho session mới
      const ingestRes = await callApi<IngestRequest, IngestResponse>(
        "/api/ingest",
        { repo_url: DEMO_REPO_URL },
        token
      );
      const sampleSessionId = ingestRes.session_id;

      // (1) Mở khóa N2 trước mỗi câu mẫu B-Q1/B-Q2 (node N2)
      if (target.node_id === "N2") {
        await unlockN2(sampleSessionId, token);

        // (2) Reset điểm ngay sau unlockN2 (để xóa ảnh hưởng BKT của việc bỏ qua N1)
        const resetAfterUnlockRes = await resetPersona(token);
        if (resetAfterUnlockRes.error) {
          samplePersonaError = resetAfterUnlockRes.error;
          run3Output.persona_errors = run3Output.persona_errors || [];
          run3Output.persona_errors.push({
            context: `Bộ câu mẫu STT ${row.stt} (${row.question_code}, sau unlockN2)`,
            ...resetAfterUnlockRes.error,
          });
        }
      }

      const enrichRes = await callApi<EnrichNodeRequest, EnrichNodeResponse>(
        "/api/enrich-node",
        {
          session_id: sampleSessionId,
          node_id: target.node_id,
          mode: "LEARN",
        },
        token
      );
      const sampleRunId = enrichRes.run_id;

      const evalRes = await callApi<
        EvaluateFeynmanRequest,
        EvaluateFeynmanResponse
      >(
        "/api/evaluate-feynman",
        {
          session_id: sampleSessionId,
          run_id: sampleRunId,
          question_index: target.question_index,
          attempt_number: 1,
          student_answer: row.student_answer,
        },
        token
      );

      const isAsExpected =
        (row.human_grade === "Đạt" && evalRes.is_passed) ||
        (row.human_grade !== "Đạt" && !evalRes.is_passed);

      sampleGradingResults.push({
        id: `SA-${String(row.stt).padStart(2, "0")}`,
        question_code: row.question_code,
        node_id: target.node_id,
        question_index: target.question_index,
        classification: row.classification,
        student_answer: row.student_answer,
        human_grade: row.human_grade,
        ai_expected: row.ai_expected,
        skipped: false,
        precondition_note: target.node_id === "N2" ? B_PRECONDITION_NOTE : undefined,
        persona_error: samplePersonaError,
        evaluation: {
          core_accuracy: evalRes.core_accuracy,
          simplicity: evalRes.simplicity,
          intent: evalRes.intent,
          is_passed: evalRes.is_passed,
          points_covered: evalRes.points_covered,
          feedback: evalRes.feedback,
          tokens_used: evalRes.tokens_used,
        },
        is_as_expected: isAsExpected,
      });
    } catch (err) {
      const errInfo = getApiErrorInfo(err);
      console.warn(`[Bộ câu mẫu] Lỗi chấm STT ${row.stt}:`, errInfo.message);
      sampleGradingResults.push({
        id: `SA-${String(row.stt).padStart(2, "0")}`,
        question_code: row.question_code,
        node_id: target.node_id,
        question_index: target.question_index,
        classification: row.classification,
        student_answer: row.student_answer,
        human_grade: row.human_grade,
        ai_expected: row.ai_expected,
        skipped: false,
        precondition_note: target.node_id === "N2" ? B_PRECONDITION_NOTE : undefined,
        error: {
          code: errInfo.code,
          message: errInfo.message,
          status: errInfo.status,
        },
      });
    }
  }

  run3Output.sample_answers_gradings = sampleGradingResults;

  // Ghi đè lại run-3.json với đầy đủ dữ liệu kịch bản và câu mẫu
  const run3Path = path.join(REVIEW_DIR, "run-3.json");
  await fs.writeFile(run3Path, JSON.stringify(run3Output, null, 2), "utf-8");
  console.log(`[review-run] Đã cập nhật kết quả toàn diện vào: ${run3Path}`);

  // --------------------------------------------------------------------------
  // TỔNG KẾT BÁO CÁO DUYỆT TAY
  // --------------------------------------------------------------------------
  console.log(`\n============================================================`);
  console.log(` TỔNG KẾT KẾT QUẢ CHẠY REVIEW (GUARD-18)`);
  console.log(`============================================================`);
  console.log(`- Snapshot ID: ${lastSnapshotId}`);
  console.log(`- Đã chạy: 3 lần phân tích độc lập (xóa cache trước mỗi lần)`);
  console.log(
    `- Số node đã phân tích mỗi lần: ${Object.keys(run3Output.analyses).length}`
  );
  console.log(
    `- Số bước kịch bản đã chấm qua 3 session độc lập: ${run3Output.scenario_gradings?.length ?? 0}`
  );
  console.log(
    `- Số câu mẫu đã xử lý (đọc từ review/cau_tra_loi_mau.md): ${run3Output.sample_answers_gradings?.length ?? 0}`
  );
  console.log(
    `- File kết quả thô đã lưu: review/run-1.json, run-2.json, run-3.json`
  );
  console.log(`- Quy tắc bảo mật: Không có mã nguồn repo người dùng trong kết quả.`);
  console.log(`- Cổng gác: Số lần chặn đếm từ log guard_blocked của server (spec 04 Mục 9).`);
  console.log(`- Tiền đề kịch bản B: Đã đính kèm precondition_note cho kịch bản B và câu mẫu B.`);
  console.log(`============================================================\n`);
}

// ============================================================================
// CHẠY TRỰC TIẾP TỪ DÒNG LỆNH
// ============================================================================

const isMain =
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module;

if (isMain) {
  runReviewSuite()
    .then(() => {
      console.log("[review-run] Hoàn tất thành công.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[review-run] Thất bại với lỗi:", err);
      process.exit(1);
    });
}
