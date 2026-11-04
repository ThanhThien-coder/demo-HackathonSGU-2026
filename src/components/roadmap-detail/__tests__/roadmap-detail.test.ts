import { describe, it, expect } from "vitest";
import { buildSessionDetail } from "../sessionDetail";
import type {
  LearningSessionSummary,
  SessionProgress,
  HybridArchitecturalNode,
} from "@/contracts";

describe("Roadmap Session Detail Data Transformation", () => {
  const mockSession: LearningSessionSummary = {
    session_id: "sess-shop-api-123",
    repo_name: "shop-api",
    engine_version: "1.0.0",
    snapshot: {
      source: "GITHUB",
      repo_key: "simplifey/shop-api",
      snapshot_id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      snapshot_id_kind: "COMMIT_SHA",
      subdir: "",
      ref_label: "main",
    },
    created_at: 1730000000000,
    last_active_at: 1730000500000,
    total_nodes: 4,
    completed_count: 1,
    failed_count: 1,
    can_resume: true,
    resume_blocker: null,
  };

  const mockNodes: HybridArchitecturalNode[] = [
    {
      id: "node-order-checkout",
      title: "Xử lý thanh toán đơn hàng",
      title_source: "ENTRY_SYMBOL",
      title_evidence: "POST /orders/checkout",
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: "checkout",
      prerequisites: [],
      position: { x: 0, y: 0 },
      files: ["src/checkout.ts"],
      languages: ["TYPESCRIPT"],
      support_tier: "RESOLVED",
      cognitive_complexity: 5,
      rank_score: 0.8,
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
      dto_snippet: "",
    },
    {
      id: "node-payment-gateway",
      title: "Cổng thanh toán điện tử",
      title_source: "ENTRY_SYMBOL",
      title_evidence: "POST /payment/process",
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: "processPayment",
      prerequisites: ["node-order-checkout"],
      position: { x: 100, y: 100 },
      files: ["src/payment.ts"],
      languages: ["TYPESCRIPT"],
      support_tier: "RESOLVED",
      cognitive_complexity: 4,
      rank_score: 0.6,
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
      dto_snippet: "",
    },
    {
      id: "node-auth-jwt",
      title: "Xác thực JWT Token",
      title_source: "ENTRY_SYMBOL",
      title_evidence: "POST /auth/login",
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: "verifyToken",
      prerequisites: ["node-order-checkout"],
      position: { x: 150, y: 150 },
      files: ["src/auth.ts"],
      languages: ["TYPESCRIPT"],
      support_tier: "RESOLVED",
      cognitive_complexity: 3,
      rank_score: 0.5,
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
      dto_snippet: "",
    },
    {
      id: "node-inventory-sync",
      title: "Đồng bộ tồn kho",
      title_source: "ENTRY_SYMBOL",
      title_evidence: "POST /inventory/sync",
      node_type: "ARCHITECTURAL_DATA_FLOW",
      entry_symbol: "syncInventory",
      prerequisites: ["node-payment-gateway"],
      position: { x: 200, y: 200 },
      files: ["src/inventory.ts"],
      languages: ["TYPESCRIPT"],
      support_tier: "RESOLVED",
      cognitive_complexity: 3,
      rank_score: 0.4,
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
      dto_snippet: "",
    },
  ];

  const mockProgress: SessionProgress = {
    session_id: "sess-shop-api-123",
    tokens_used: 1500,
    nodes: {
      "node-order-checkout": {
        node_id: "node-order-checkout",
        status: "COMPLETED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      "node-payment-gateway": {
        node_id: "node-payment-gateway",
        status: "AVAILABLE",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      "node-auth-jwt": {
        node_id: "node-auth-jwt",
        status: "FAILED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      "node-inventory-sync": {
        node_id: "node-inventory-sync",
        status: "LOCKED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
    },
  };

  it("builds course detail accurately with real node progress and topological order", () => {
    const detail = buildSessionDetail(mockSession, mockProgress, mockNodes);
    expect(detail.id).toBe("sess-shop-api-123");
    expect(detail.title).toBe("shop-api");
    expect(detail.lessons).toHaveLength(4);

    const [lesson1] = detail.lessons;

    // Node 1: Completed
    expect(lesson1.id).toBe("node-order-checkout");
    expect(lesson1.title).toBe("1. Xử lý thanh toán đơn hàng");
    expect(lesson1.description).toBe("POST /orders/checkout");
    expect(lesson1.status).toBe("completed");
    expect(lesson1.progress).toBe(100);

    // Node FAILED -> status "failed" and progress 0
    const failedLesson = detail.lessons.find((l) => l.id === "node-auth-jwt");
    expect(failedLesson).toBeDefined();
    expect(failedLesson?.status).toBe("failed");
    expect(failedLesson?.progress).toBe(0);
    expect(failedLesson?.title).toContain("Xác thực JWT Token");
    expect(failedLesson?.description).toBe("POST /auth/login");

    // Node AVAILABLE -> status "in-progress" and progress 0
    const inProgressLesson = detail.lessons.find(
      (l) => l.id === "node-payment-gateway"
    );
    expect(inProgressLesson).toBeDefined();
    expect(inProgressLesson?.status).toBe("in-progress");
    expect(inProgressLesson?.progress).toBe(0);
    expect(inProgressLesson?.title).toContain("Cổng thanh toán điện tử");

    // Node LOCKED -> status "locked" and progress 0
    const lockedLesson = detail.lessons.find(
      (l) => l.id === "node-inventory-sync"
    );
    expect(lockedLesson).toBeDefined();
    expect(lockedLesson?.status).toBe("locked");
    expect(lockedLesson?.progress).toBe(0);
    expect(lockedLesson?.title).toContain("Đồng bộ tồn kho");

    // Tuyệt đối không còn "Kiến trúc Node" hay "Module Kiến trúc"
    for (const l of detail.lessons) {
      expect(l.title).not.toContain("Kiến trúc Node");
      expect(l.title).not.toContain("Module Kiến trúc");
    }
  });
});
