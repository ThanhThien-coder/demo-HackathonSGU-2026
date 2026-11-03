import { describe, it, expect } from "vitest";
import shopApiFixture from "../server/engine/__fixtures__/shop-api.json";
import analysisN3Fixture from "../server/ai/__fixtures__/analysis-n3.json";
import overviewFixture from "../server/ai/__fixtures__/overview.json";
import questionsN3Fixture from "../server/ai/__fixtures__/questions-n3.json";
import gradingN3Q1Fixture from "../server/ai/__fixtures__/grading-n3-q1.json";
import { CONFIG } from "../contracts/config";
import { SWE_SKILLS, ARCHITECTURE_PATTERNS } from "../contracts/base";
import type {
  StaticEngineResult,
  NodeAnalysisRaw,
  RepoOverviewRaw,
  GeneratedQuestionRaw,
  GradingRaw,
  RepoSnapshotKey,
  ProjectArchetype,
  GraphConfidence,
  NodeType,
  NodeTitleSource,
  LanguageSupportTier,
  UncleBobMetrics,
  ArchitecturalLayer,
  GraphEdge,
  DegradedMode,
  AnswerIntent,
  FollowUpType,
} from "../contracts";

// Danh sách giá trị runtime lấy đúng từ định nghĩa kiểu trong src/contracts (không tự bịa)
const SNAPSHOT_SOURCES = ["GITHUB", "ZIP"] as const satisfies readonly RepoSnapshotKey["source"][];
const SNAPSHOT_ID_KINDS = ["COMMIT_SHA", "ARCHIVE_HASH"] as const satisfies readonly RepoSnapshotKey["snapshot_id_kind"][];
const PROJECT_ARCHETYPES = [
  "WEB_BACKEND",
  "WEB_FRONTEND",
  "MOBILE_APP",
  "DESKTOP_APP",
  "CLI_TOOL",
  "ALGORITHM_CORE",
] as const satisfies readonly ProjectArchetype[];
const GRAPH_CONFIDENCES = ["HIGH", "MIXED", "LOW"] as const satisfies readonly GraphConfidence[];
const NODE_TYPES = ["ARCHITECTURAL_DATA_FLOW", "ALGORITHMIC_CORE"] as const satisfies readonly NodeType[];
const NODE_TITLE_SOURCES = [
  "ROUTE",
  "ENTRY_SYMBOL",
  "DOMAIN_TERMS",
  "DIRECTORY",
  "FILE_BASENAME",
  "VIRTUAL",
] as const satisfies readonly NodeTitleSource[];
const LANGUAGE_SUPPORT_TIERS = ["RESOLVED", "STRUCTURAL", "UNSUPPORTED"] as const satisfies readonly LanguageSupportTier[];
const UNCLE_BOB_DIAGNOSES = ["BALANCED", "ZONE_OF_PAIN", "ZONE_OF_USELESSNESS"] as const satisfies readonly UncleBobMetrics["diagnosis"][];
const EDGE_CONFIDENCES = ["RESOLVED", "INFERRED"] as const satisfies readonly GraphEdge["confidence"][];
const DEGRADED_MODES = ["PROCEDURAL"] as const satisfies readonly DegradedMode[];
const ARCHITECTURAL_LAYERS = [
  "ENTRY_POINT",
  "MIDDLEWARE",
  "BUSINESS_LOGIC",
  "DATA_ACCESS",
  "ALGO_SETUP",
  "ALGO_EXECUTION",
  "ALGO_TERMINATION",
] as const satisfies readonly ArchitecturalLayer[];
const ANSWER_INTENTS = ["ANSWER", "GIVE_UP", "OFF_TOPIC"] as const satisfies readonly AnswerIntent[];
const FOLLOW_UP_TYPES = ["CONCEPT", "CODE_POINTER"] as const satisfies readonly FollowUpType[];

describe("Kiểm tra khớp kiểu contracts spec/02 Mục 3, 5 bằng satisfies", () => {
  it("shop-api.json khớp kiểu StaticEngineResult (spec/02 Mục 3)", () => {
    // 1. Kiểm tra runtime các trường enum trước khi ép kiểu
    expect(SNAPSHOT_SOURCES).toContain(shopApiFixture.snapshot.source);
    expect(SNAPSHOT_ID_KINDS).toContain(shopApiFixture.snapshot.snapshot_id_kind);
    expect(PROJECT_ARCHETYPES).toContain(shopApiFixture.fingerprint.archetype);
    expect(typeof shopApiFixture.fingerprint.primary_language).toBe("string");
    expect(shopApiFixture.fingerprint.primary_language.length).toBeGreaterThan(0);
    expect(GRAPH_CONFIDENCES).toContain(shopApiFixture.fingerprint.graph_confidence);

    for (const lb of shopApiFixture.fingerprint.language_breakdown) {
      expect(LANGUAGE_SUPPORT_TIERS).toContain(lb.tier);
    }

    for (const node of shopApiFixture.nodes) {
      expect(NODE_TYPES).toContain(node.node_type);
      expect(NODE_TITLE_SOURCES).toContain(node.title_source);
      expect(LANGUAGE_SUPPORT_TIERS).toContain(node.support_tier);
      expect(UNCLE_BOB_DIAGNOSES).toContain(node.uncle_bob.diagnosis);
      for (const step of node.trace_steps) {
        expect(ARCHITECTURAL_LAYERS).toContain(step.layer);
      }
    }

    for (const edge of shopApiFixture.edges) {
      expect(EDGE_CONFIDENCES).toContain(edge.confidence);
    }

    if (shopApiFixture.ingestion_report.degraded_mode !== null) {
      expect(DEGRADED_MODES).toContain(shopApiFixture.ingestion_report.degraded_mode);
    }

    // 2. Ép kiểu qua biến có kiểu rõ ràng và kiểm satisfies
    const typed = shopApiFixture as StaticEngineResult;
    const data = typed satisfies StaticEngineResult;

    expect(data.engine_version).toBe(CONFIG.ENGINE_VERSION);
    expect(data.repo_name).toBe("shop-api");
    expect(data.snapshot.source).toBe("GITHUB");
    expect(data.snapshot.repo_key).toBe("simplifey/shop-api");
    expect(data.snapshot.snapshot_id_kind).toBe("COMMIT_SHA");
    expect(data.snapshot.ref_label).toBe("main");

    expect(data.fingerprint.archetype).toBe("WEB_BACKEND");
    expect(data.fingerprint.primary_language).toBe("TYPESCRIPT");
    expect(data.fingerprint.graph_confidence).toBe("HIGH");
    expect(data.fingerprint.detected_framework).toBe("Express");
    expect(data.fingerprint.tech_stack).toEqual([
      "express",
      "typeorm",
      "pg",
      "zod",
      "jsonwebtoken",
    ]);

    expect(Array.isArray(data.nodes)).toBe(true);
    expect(data.nodes.length).toBe(7);
    expect(Array.isArray(data.edges)).toBe(true);
    expect(data.edges.length).toBe(6);
    expect(Array.isArray(data.symbol_whitelist)).toBe(true);
    expect(Array.isArray(data.file_index)).toBe(true);
    expect(data.total_files).toBe(17);

    expect(data.ingestion_report.truncated).toBe(false);
    expect(data.ingestion_report.selective_fetch).toBe(false);
    expect(data.ingestion_report.code_file_count).toBe(17);
    expect(data.ingestion_report.manifest_count).toBe(1);
    expect(data.ingestion_report.omitted_node_count).toBe(0);
    expect(data.ingestion_report.degraded_mode).toBeNull();
  });

  it("analysis-n3.json khớp kiểu NodeAnalysisRaw (spec/02 Mục 5.1)", () => {
    // 1. Kiểm tra runtime các trường enum trước khi ép kiểu
    for (const s of analysisN3Fixture.skills) {
      expect(SWE_SKILLS).toContain(s.skill);
    }
    for (const p of analysisN3Fixture.architecture.patterns) {
      expect(ARCHITECTURE_PATTERNS).toContain(p);
    }
    for (const wp of analysisN3Fixture.weak_points) {
      expect(SWE_SKILLS).toContain(wp.skill);
    }

    // 2. Ép kiểu qua biến có kiểu rõ ràng và kiểm satisfies
    const typed = analysisN3Fixture as NodeAnalysisRaw;
    const data = typed satisfies NodeAnalysisRaw;

    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.skills.length).toBe(3);

    // Kỹ năng 1: DB_OPTIMIZATION ở bước 2
    expect(data.skills[0]).toEqual({
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "findById",
      reason: "Vòng `for` gọi `categoryRepo.findById` cho từng sản phẩm",
    });

    // Kỹ năng 2: LAYERED_SEPARATION ở bước 1
    expect(data.skills[1]).toEqual({
      skill: "LAYERED_SEPARATION",
      step: 1,
      symbol: "productService",
      reason: "Route chỉ gọi `productService.listProducts`, không tự truy vấn database",
    });

    // Chỗ cố ý sai theo spec/50 Mục 2.1: AUTH_SECURITY ở bước 3 (symbol verifyToken)
    expect(data.skills[2]).toEqual({
      skill: "AUTH_SECURITY",
      step: 3,
      symbol: "verifyToken",
      reason: "Kiểm tra quyền trước khi tìm loại hàng",
    });

    // Kiến trúc
    expect(data.architecture.patterns).toEqual(["LAYERED", "REPOSITORY"]);
    expect(data.architecture.summary).toBe(
      "Chia 3 tầng: route nhận yêu cầu, service xử lý, repository làm việc với database."
    );

    // Bước
    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps.length).toBe(3);
    expect(data.steps[0].step).toBe(1);
    expect(data.steps[1].step).toBe(2);
    expect(data.steps[2].step).toBe(3);

    // Điểm mạnh
    expect(Array.isArray(data.strengths)).toBe(true);
    expect(data.strengths.length).toBe(1);
    expect(data.strengths[0].step).toBe(1);

    // Điểm dở
    expect(Array.isArray(data.weak_points)).toBe(true);
    expect(data.weak_points.length).toBe(1);
    expect(data.weak_points[0]).toEqual({
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "findById",
      what: "Vòng `for` gọi `categoryRepo.findById` cho từng sản phẩm.",
      consequence: "Càng nhiều sản phẩm, database bị hỏi càng nhiều lần, trang càng chậm.",
    });
  });

  it("overview.json khớp kiểu RepoOverviewRaw (spec/02 Mục 5.2)", () => {
    // 1. Kiểm tra runtime các trường enum trước khi ép kiểu
    expect(ARCHITECTURE_PATTERNS).toContain(overviewFixture.architecture_style);
    for (const l of overviewFixture.layers) {
      expect(ARCHITECTURAL_LAYERS).toContain(l.layer);
    }

    // 2. Ép kiểu qua biến có kiểu rõ ràng và kiểm satisfies
    const typed = overviewFixture as RepoOverviewRaw;
    const data = typed satisfies RepoOverviewRaw;

    expect(data.architecture_style).toBe("LAYERED");
    expect(data.summary).toBe(
      "Web bán hàng chia 3 tầng. Các trang cần đăng nhập đi qua `authMiddleware` kiểm tra JWT."
    );

    expect(Array.isArray(data.layers)).toBe(true);
    expect(data.layers.length).toBe(1);
    expect(data.layers[0]).toEqual({
      layer: "MIDDLEWARE",
      role: "Kiểm tra token trước khi vào trang cần đăng nhập",
      nodes: ["<id N2>", "<id N5>"],
    });

    expect(data.main_flow).toBe(
      "Đăng ký, xem hồ sơ, thêm vào giỏ rồi thanh toán; thanh toán xong gửi email xác nhận."
    );

    expect(Array.isArray(data.notes)).toBe(true);
    expect(data.notes.length).toBe(2);

    expect(data.notes[0]).toEqual({
      text: "Hai chỗ truy vấn database trong vòng lặp, sẽ chậm khi dữ liệu lớn.",
      nodes: ["<id N3>", "<id N5>"],
    });

    // Chỗ cố ý sai theo spec/50 Mục 2.2: nhận xét không căn cứ về báo cáo doanh thu N7
    expect(data.notes[1]).toEqual({
      text: "Báo cáo doanh thu cũng truy vấn trong vòng lặp.",
      nodes: ["<id N7>"],
    });
  });

  it("questions-n3.json khớp kiểu GeneratedQuestionRaw[] (spec/02 Mục 5.3)", () => {
    // 1. Kiểm tra runtime các trường enum trước khi ép kiểu
    for (const q of questionsN3Fixture) {
      expect(SWE_SKILLS).toContain(q.skill);
    }

    // 2. Ép kiểu qua biến có kiểu rõ ràng và kiểm satisfies
    const typed = questionsN3Fixture as GeneratedQuestionRaw[];
    const data = typed satisfies GeneratedQuestionRaw[];

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);

    // Câu 1
    const q1 = data[0];
    expect(q1.skill).toBe("DB_OPTIMIZATION");
    expect(q1.feynman_question).toBe(
      "Trang danh sách có 200 sản phẩm. Vì sao càng nhiều sản phẩm thì trang càng chậm?"
    );
    expect(q1.reference_answer).toBe(
      "Sau khi `productRepo.findAll` lấy danh sách 1 lần, vòng lặp gọi `categoryRepo.findById` cho từng sản phẩm. Mỗi sản phẩm tốn thêm 1 truy vấn, nên 200 sản phẩm thành 201 truy vấn."
    );
    expect(q1.must_have_points).toEqual([
      "Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng",
      "Số truy vấn tăng theo số sản phẩm, không cố định",
    ]);
    expect(q1.must_have_points.length).toBeGreaterThanOrEqual(CONFIG.MUST_HAVE_POINTS_MIN);
    expect(q1.must_have_points.length).toBeLessThanOrEqual(CONFIG.MUST_HAVE_POINTS_MAX);
    expect(q1.fix).toBe(
      "Cho findAll lấy kèm loại hàng (relations: ['category']) ⇒ còn 1 truy vấn; hoặc gom các categoryId rồi tìm 1 lần bằng IN (...) ⇒ còn 2 truy vấn."
    );

    // Câu 2
    const q2 = data[1];
    expect(q2.skill).toBe("LAYERED_SEPARATION");
    expect(q2.feynman_question).toBe(
      "Sản phẩm trả về có thêm thông tin loại hàng. Loại hàng đó từ đâu mà có?"
    );
    expect(q2.reference_answer).toBe(
      "Route ở `product.controller.ts` gọi `productService.listProducts`; trong `listProducts`, vòng `for` gọi `categoryRepo.findById(p.categoryId)`; `findById` ở `category.repo.ts` dùng `this.repo.findOne`; kết quả gán vào `p.category` rồi trả về route."
    );
    expect(q2.must_have_points).toEqual([
      "Nêu đúng đường đi: route gọi service, service nhờ repo tìm loại hàng",
      "Loại hàng tìm theo `categoryId` của từng sản phẩm rồi gắn vào sản phẩm trước khi trả về",
    ]);
    expect(q2.must_have_points.length).toBeGreaterThanOrEqual(CONFIG.MUST_HAVE_POINTS_MIN);
    expect(q2.must_have_points.length).toBeLessThanOrEqual(CONFIG.MUST_HAVE_POINTS_MAX);
    expect(q2.fix).toBe("Không có lỗi cần sửa ở góc này.");
  });

  it("grading-n3-q1.json khớp kiểu GradingRaw (spec/02 Mục 5.4)", () => {
    // 1. Kiểm tra runtime các trường enum trước khi ép kiểu
    expect(ANSWER_INTENTS).toContain(gradingN3Q1Fixture.intent);
    if (gradingN3Q1Fixture.follow_up_type !== null) {
      expect(FOLLOW_UP_TYPES).toContain(gradingN3Q1Fixture.follow_up_type);
    }

    // 2. Ép kiểu qua biến có kiểu rõ ràng và kiểm satisfies
    const typed = gradingN3Q1Fixture as GradingRaw;
    const data = typed satisfies GradingRaw;

    expect(data.core_accuracy).toBe(50);
    expect(data.simplicity).toBe(70);
    expect(data.intent).toBe("ANSWER");

    expect(Array.isArray(data.points)).toBe(true);
    expect(data.points.length).toBe(2);
    expect(data.points[0]).toEqual({ index: 1, covered: false, quote: "" });
    expect(data.points[1]).toEqual({ index: 2, covered: false, quote: "" });

    expect(data.misconception).toBe(
      "Nghĩ trang chậm do dữ liệu lớn, chưa thấy mỗi sản phẩm tốn thêm một truy vấn."
    );
    expect(data.follow_up_question).toBe(
      "Sau khi có danh sách, trang còn cần thêm thông tin gì cho từng sản phẩm? Thông tin đó được lấy bằng cách nào?"
    );
    expect(data.follow_up_type).toBe("CONCEPT");
    expect(data.follow_up_step_index).toBeNull();
    expect(data.feedback).toBe(
      "Bạn thấy đúng là nhiều sản phẩm thì chậm hơn, nhưng chưa nói vì sao."
    );
    expect(data.detected_jargons).toEqual([]);
  });
});
