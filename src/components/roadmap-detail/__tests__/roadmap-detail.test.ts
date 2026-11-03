import { describe, it, expect } from "vitest";
import { buildSessionDetail } from "../sessionDetail";
import type { LearningSessionSummary, SessionProgress } from "@/lib/api";

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
    total_nodes: 3,
    completed_count: 1,
    failed_count: 0,
    can_resume: true,
    resume_blocker: null,
  };

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
      "node-inventory-sync": {
        node_id: "node-inventory-sync",
        status: "LOCKED",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
    },
  };

  it("builds course detail accurately with real node progress", () => {
    const detail = buildSessionDetail(mockSession, mockProgress);
    expect(detail.id).toBe("sess-shop-api-123");
    expect(detail.title).toBe("shop-api");
    expect(detail.lessons).toHaveLength(3);

    const [lesson1, lesson2, lesson3] = detail.lessons;

    expect(lesson1.status).toBe("completed");
    expect(lesson1.progress).toBe(100);
    expect(lesson1.id).toBe("node-order-checkout");

    expect(lesson2.status).toBe("in-progress");
    expect(lesson2.progress).toBe(50);
    expect(lesson2.id).toBe("node-payment-gateway");

    expect(lesson3.status).toBe("locked");
    expect(lesson3.progress).toBe(0);
    expect(lesson3.id).toBe("node-inventory-sync");
  });

  it("handles empty node progress by generating structured steps matching total_nodes", () => {
    const detail = buildSessionDetail(mockSession, null);
    expect(detail.id).toBe("sess-shop-api-123");
    expect(detail.lessons).toHaveLength(3);
    expect(detail.lessons[0].status).toBe("completed");
    expect(detail.lessons[1].status).toBe("in-progress");
    expect(detail.lessons[2].status).toBe("locked");
  });
});
