import { describe, it, expect } from "vitest";
import { buildRoleCard, ENTITY_OP_LABELS } from "../role-card";
import type {
  ClientStaticEngineResult,
  EntityOp,
  HybridArchitecturalNode,
  NodeAnalysisView,
  RepoOverviewView,
  SessionProgress,
} from "@/contracts";

describe("role-card", () => {
  const mockBaseNode: HybridArchitecturalNode = {
    id: "node-products",
    title: "Xem danh sách sản phẩm",
    title_source: "ROUTE",
    title_evidence: "GET /products",
    node_type: "ARCHITECTURAL_DATA_FLOW",
    entry_symbol: "getProducts",
    prerequisites: ["node-auth"],
    position: { x: 0, y: 0 },
    files: ["src/routes/products.ts"],
    languages: ["TYPESCRIPT"],
    support_tier: "RESOLVED",
    cognitive_complexity: 5,
    rank_score: 1.2,
    is_vip_algorithm: false,
    is_capstone: false,
    uncle_bob: {
      instability: 0.5,
      abstractness: 0.5,
      distance: 0,
      diagnosis: "BALANCED",
      is_exempt: false,
    },
    trace_steps: [],
    group_id: "group-products",
    entities: [
      { name: "Product", ops: ["READ"] },
      { name: "Category", ops: ["READ"] },
    ],
    dto_snippet: "",
  };

  const mockResult: ClientStaticEngineResult = {
    engine_version: "1.6.0",
    repo_name: "test-shop",
    snapshot: {
      source: "GITHUB",
      repo_key: "test/shop",
      snapshot_id: "abc1234",
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "",
      ref_label: "main",
    },
    fingerprint: {
      archetype: "WEB_BACKEND",
      primary_language: "TYPESCRIPT",
      language_breakdown: [],
      graph_confidence: "HIGH",
      detected_framework: "Express",
      tech_stack: ["express"],
      is_monorepo: false,
      root_dir_offset: "",
    },
    total_files: 10,
    nodes: [
      {
        ...mockBaseNode,
        id: "node-auth",
        title: "Đăng nhập",
        prerequisites: [],
        entities: [],
      },
      mockBaseNode,
      {
        ...mockBaseNode,
        id: "node-checkout",
        title: "Thanh toán",
        prerequisites: ["node-products"],
        entities: [],
      },
    ],
    edges: [
      {
        id: "node-auth->node-products",
        source: "node-auth",
        target: "node-products",
        via_entities: [],
        confidence: "RESOLVED",
      },
      {
        id: "node-products->node-checkout",
        source: "node-products",
        target: "node-checkout",
        via_entities: [],
        confidence: "RESOLVED",
      },
    ],
    groups: [
      {
        group_id: "group-products",
        key: "products",
        key_kind: "ENTITY",
        node_ids: ["node-products"],
      },
    ],
    file_index: ["src/routes/products.ts"],
    ingestion_report: {
      truncated: false,
      selective_fetch: false,
      code_file_count: 1,
      manifest_count: 1,
      omitted_node_count: 0,
      skipped: {
        garbage: 0,
        binary: 0,
        oversized: 0,
        unsupported_lang: 0,
        quota: 0,
        parse_error: 0,
      },
      warnings: [],
      degraded_mode: null,
      redacted_secret_count: 0,
      engine_ms: 50,
      ingest_ms: 10,
    },
  };

  const mockAnalysis: NodeAnalysisView = {
    node_id: "node-products",
    skills: [],
    architecture: {
      patterns: ["LAYERED"],
      summary:
        "Cho khách xem toàn bộ sản phẩm kèm loại hàng. Người dùng có thể lọc theo giá và danh mục.",
    },
    steps: [],
    strengths: [],
    weak_points: [],
    shared_files: [],
    skeleton_only: false,
  };

  const mockOverview: RepoOverviewView = {
    facts: {
      archetype: "WEB_BACKEND",
      framework: "Express",
      tech_stack: ["express"],
      root_node_ids: ["node-auth"],
      main_path_node_ids: ["node-auth", "node-products", "node-checkout"],
    },
    ai: {
      summary: "Tổng quan hệ thống thương mại điện tử.",
      groups: [{ group_id: "group-products", name: "Sản phẩm & Danh mục" }],
      node_titles: [
        { node_id: "node-products", title: "Danh sách sản phẩm (AI)" },
        { node_id: "node-auth", title: "Xác thực người dùng (AI)" },
        { node_id: "node-checkout", title: "Thực hiện thanh toán (AI)" },
      ],
    },
  };

  const mockProgress: SessionProgress = {
    session_id: "sess-123",
    nodes: {
      "node-products": {
        node_id: "node-products",
        status: "AVAILABLE",
        has_warning: true,
        analysis_failed: false,
        last_run: null,
      },
      "node-auth": {
        node_id: "node-auth",
        status: "COMPLETED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      "node-checkout": {
        node_id: "node-checkout",
        status: "LOCKED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
    },
    tokens_used: 1000,
  };

  describe("T-UI-03: buildRoleCard", () => {
    it("bài đủ dữ liệu: role = đúng câu 1; prerequisites, unlocks, entities đều có phần tử; nhãn ops đúng tiếng Việt", () => {
      const nodeWithAllOps: HybridArchitecturalNode = {
        ...mockBaseNode,
        is_capstone: true,
        entities: [
          {
            name: "Order",
            ops: ["CREATE", "READ", "UPDATE", "DELETE"],
          },
        ],
      };

      const card = buildRoleCard(
        nodeWithAllOps,
        mockResult,
        mockAnalysis,
        mockOverview,
        mockProgress
      );

      // role = đúng câu 1
      expect(card.role).toBe("Cho khách xem toàn bộ sản phẩm kèm loại hàng.");
      // prerequisites, unlocks, entities đều có phần tử
      expect(card.prerequisites).toEqual([
        { node_id: "node-auth", title: "Xác thực người dùng (AI)" },
      ]);
      expect(card.unlocks).toEqual([
        { node_id: "node-checkout", title: "Thực hiện thanh toán (AI)" },
      ]);
      expect(card.entities).toEqual([
        {
          name: "Order",
          ops: ["Tạo", "Đọc", "Sửa", "Xóa"],
        },
      ]);
      // Metadata
      expect(card.node_id).toBe("node-products");
      expect(card.evidence).toBe("GET /products");
      expect(card.is_capstone).toBe(true);
      expect(card.has_warning).toBe(true);
      expect(card.is_algorithmic).toBe(false);
      expect(card.support_tier).toBe("RESOLVED");
    });

    it("bài prerequisites = [], entities = []: 2 mảng đó rỗng, role và unlocks vẫn có", () => {
      const nodeEmptyPrereqEntities: HybridArchitecturalNode = {
        ...mockBaseNode,
        prerequisites: [],
        entities: [],
      };

      const card = buildRoleCard(
        nodeEmptyPrereqEntities,
        mockResult,
        mockAnalysis,
        null,
        null
      );

      expect(card.prerequisites).toEqual([]);
      expect(card.entities).toEqual([]);
      expect(card.role).toBe("Cho khách xem toàn bộ sản phẩm kèm loại hàng.");
      expect(card.unlocks).toEqual([
        { node_id: "node-checkout", title: "Thanh toán" },
      ]);
    });

    it("skeleton_only = true, hoặc chưa có bản phân tích, hoặc PENDING / FAILED: role = null", () => {
      // 1. skeleton_only = true
      const skeletonAnalysis: NodeAnalysisView = {
        ...mockAnalysis,
        skeleton_only: true,
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, skeletonAnalysis, null, null).role
      ).toBeNull();

      // 2. Chưa có bản phân tích (null / undefined)
      expect(
        buildRoleCard(mockBaseNode, mockResult, null, null, null).role
      ).toBeNull();
      expect(
        buildRoleCard(mockBaseNode, mockResult, undefined, null, null).role
      ).toBeNull();

      // 3. PENDING
      expect(
        buildRoleCard(mockBaseNode, mockResult, "PENDING", null, null).role
      ).toBeNull();

      // 4. FAILED
      expect(
        buildRoleCard(mockBaseNode, mockResult, "FAILED", null, null).role
      ).toBeNull();

      // 5. summary rỗng
      const emptySummaryAnalysis: NodeAnalysisView = {
        ...mockAnalysis,
        architecture: { patterns: ["LAYERED"], summary: "   " },
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, emptySummaryAnalysis, null, null)
          .role
      ).toBeNull();
    });

    it("tên bài lấy theo overviewNodeTitle (có overview.ai.node_titles ⇒ dùng tên AI)", () => {
      const card = buildRoleCard(
        mockBaseNode,
        mockResult,
        mockAnalysis,
        mockOverview,
        mockProgress
      );

      expect(card.title).toBe("Danh sách sản phẩm (AI)");
      expect(card.prerequisites[0]?.title).toBe("Xác thực người dùng (AI)");
      expect(card.unlocks[0]?.title).toBe("Thực hiện thanh toán (AI)");

      // Khi không có overview.ai.node_titles ⇒ lùi về title của node
      const cardWithoutAi = buildRoleCard(
        mockBaseNode,
        mockResult,
        mockAnalysis,
        null,
        null
      );
      expect(cardWithoutAi.title).toBe("Xem danh sách sản phẩm");
      expect(cardWithoutAi.prerequisites[0]?.title).toBe("Đăng nhập");
      expect(cardWithoutAi.unlocks[0]?.title).toBe("Thanh toán");
    });

    it("entities thiếu hẳn trên node (engine chưa có B-40) ⇒ entities = [], không lỗi", () => {
      const nodeNoEntities = {
        ...mockBaseNode,
        entities: undefined as unknown as Array<{ name: string; ops: EntityOp[] }>,
      };

      const card = buildRoleCard(
        nodeNoEntities as HybridArchitecturalNode,
        mockResult,
        mockAnalysis,
        null,
        null
      );

      expect(card.entities).toEqual([]);
    });

    it("tách câu 1 ở dấu ., !, ? theo sau là khoảng trắng; giữ dấu câu", () => {
      // Dấu chấm than
      const aExcl: NodeAnalysisView = {
        ...mockAnalysis,
        architecture: {
          patterns: ["LAYERED"],
          summary: "Tạo đơn hàng nhanh chóng! Tiếp tục kiểm tra kho.",
        },
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, aExcl, null, null).role
      ).toBe("Tạo đơn hàng nhanh chóng!");

      // Dấu hỏi chấm
      const aQuest: NodeAnalysisView = {
        ...mockAnalysis,
        architecture: {
          patterns: ["LAYERED"],
          summary: "Bạn có muốn thanh toán không? Hãy xác nhận giỏ hàng.",
        },
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, aQuest, null, null).role
      ).toBe("Bạn có muốn thanh toán không?");

      // Một câu duy nhất kết thúc bằng dấu chấm
      const aSingle: NodeAnalysisView = {
        ...mockAnalysis,
        architecture: {
          patterns: ["LAYERED"],
          summary: "Chỉ có một câu duy nhất.",
        },
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, aSingle, null, null).role
      ).toBe("Chỉ có một câu duy nhất.");

      // Một câu không có dấu câu
      const aNoPunct: NodeAnalysisView = {
        ...mockAnalysis,
        architecture: {
          patterns: ["LAYERED"],
          summary: "Câu này không có chấm",
        },
      };
      expect(
        buildRoleCard(mockBaseNode, mockResult, aNoPunct, null, null).role
      ).toBe("Câu này không có chấm");
    });

    it("is_algorithmic nhận đúng khi node_type hoặc archetype là ALGORITHMIC_CORE", () => {
      const algoNodeByType: HybridArchitecturalNode = {
        ...mockBaseNode,
        node_type: "ALGORITHMIC_CORE",
      };
      expect(
        buildRoleCard(algoNodeByType, mockResult, null, null, null).is_algorithmic
      ).toBe(true);

      const algoNodeByArchetype = {
        ...mockBaseNode,
        node_type: "ARCHITECTURAL_DATA_FLOW",
        archetype: "ALGORITHMIC_CORE",
      } as unknown as HybridArchitecturalNode;
      expect(
        buildRoleCard(algoNodeByArchetype, mockResult, null, null, null)
          .is_algorithmic
      ).toBe(true);

      const normalNode: HybridArchitecturalNode = {
        ...mockBaseNode,
        node_type: "ARCHITECTURAL_DATA_FLOW",
      };
      expect(
        buildRoleCard(normalNode, mockResult, null, null, null).is_algorithmic
      ).toBe(false);
    });

    it("unlocks lọc trùng target và giữ thứ tự cạnh, prerequisites lọc chỉ node có trong result.nodes", () => {
      const customResult: ClientStaticEngineResult = {
        ...mockResult,
        nodes: [mockBaseNode], // Chỉ có mockBaseNode, không có "node-unknown"
        edges: [
          {
            id: "e1",
            source: mockBaseNode.id,
            target: "node-target-1",
            via_entities: [],
            confidence: "RESOLVED",
          },
          {
            id: "e2",
            source: mockBaseNode.id,
            target: "node-target-2",
            via_entities: [],
            confidence: "RESOLVED",
          },
          {
            id: "e3",
            source: mockBaseNode.id,
            target: "node-target-1", // trùng target-1
            via_entities: [],
            confidence: "RESOLVED",
          },
        ],
      };

      const nodeWithUnknownPrereq: HybridArchitecturalNode = {
        ...mockBaseNode,
        prerequisites: ["node-unknown"], // không nằm trong customResult.nodes
      };

      const card = buildRoleCard(
        nodeWithUnknownPrereq,
        customResult,
        null,
        null,
        null
      );

      // Prerequisites trỏ tới node không tồn tại trong result.nodes bị loại bỏ
      expect(card.prerequisites).toEqual([]);

      // Unlocks không trùng target, giữ thứ tự cạnh
      expect(card.unlocks).toEqual([
        { node_id: "node-target-1", title: "node-target-1" },
        { node_id: "node-target-2", title: "node-target-2" },
      ]);
    });

    it("ENTITY_OP_LABELS có đủ 4 nhãn tiếng Việt", () => {
      expect(ENTITY_OP_LABELS).toEqual({
        CREATE: "Tạo",
        READ: "Đọc",
        UPDATE: "Sửa",
        DELETE: "Xóa",
      });
    });
  });
});
