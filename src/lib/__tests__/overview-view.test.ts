import { describe, it, expect } from "vitest";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import { buildOverviewFacts, buildDiscovered } from "../overview-view";
import type {
  ClientStaticEngineResult,
  NodeAnalysisView,
  SessionProgress,
} from "@/contracts";

describe("overview-view", () => {
  const clientResult = shopApiFixture as unknown as ClientStaticEngineResult;

  it("T33 facts: root_node_ids đúng 2 node slice-product-list, slice-register; main_path_node_ids khác rỗng; tầng MIDDLEWARE có đúng 3 node", () => {
    const facts = buildOverviewFacts(clientResult);

    // root_node_ids đúng 2 node
    expect(facts.root_node_ids).toEqual([
      "slice-product-list",
      "slice-register",
    ]);

    // main_path_node_ids khác rỗng
    expect(facts.main_path_node_ids.length).toBeGreaterThan(0);

    // tầng MIDDLEWARE có đúng 3 node
    const middlewareLayer = facts.layer_map.find(
      (l) => l.layer === "MIDDLEWARE"
    );
    expect(middlewareLayer).toBeDefined();
    expect(middlewareLayer?.node_ids.length).toBe(3);
    expect(middlewareLayer?.node_ids).toEqual(
      expect.arrayContaining([
        "slice-cart",
        "slice-order-checkout",
        "slice-profile",
      ])
    );

    // Thông tin cơ bản
    expect(facts.archetype).toBe("WEB_BACKEND");
    expect(facts.framework).toBe("Express");
    expect(facts.tech_stack).toContain("express");
  });

  it("T34 discovered: 2 bản phân tích ⇒ done = 2, total = 7, gom đủ điểm dở; thêm 1 bản ⇒ done = 3", () => {
    const n2Analysis: NodeAnalysisView = {
      node_id: "slice-profile",
      skills: [
        {
          skill: "AUTH_SECURITY",
          step: 2,
          symbol: "authMiddleware",
          reason: "Kiểm tra token JWT trong middleware",
          file_path: "src/middlewares/auth.middleware.ts",
          line_start: 3,
          line_end: 12,
        },
      ],
      architecture: {
        patterns: ["LAYERED"],
        summary: "Phân tầng bảo mật qua middleware.",
      },
      steps: [
        {
          step: 2,
          layer: "MIDDLEWARE",
          file_path: "src/middlewares/auth.middleware.ts",
          line_start: 3,
          line_end: 12,
          text: "Xác thực token",
        },
      ],
      strengths: [],
      weak_points: [
        {
          skill: "AUTH_SECURITY",
          step: 2,
          symbol: "authMiddleware",
          what: "JWT secret lưu cố định trong file mã nguồn",
          consequence: "Dễ bị lộ secret nếu mã nguồn bị lộ",
          file_path: "src/middlewares/auth.middleware.ts",
          line_start: 3,
          line_end: 12,
        },
      ],
      shared_files: [],
      skeleton_only: false,
    };

    const n3Analysis: NodeAnalysisView = {
      node_id: "slice-product-list",
      skills: [
        {
          skill: "DB_OPTIMIZATION",
          step: 2,
          symbol: "findById",
          reason: "Vòng lặp gọi cơ sở dữ liệu N+1",
          file_path: "src/services/product.service.ts",
          line_start: 14,
          line_end: 20,
        },
      ],
      architecture: {
        patterns: ["LAYERED", "REPOSITORY"],
        summary: "Phân tầng kiến trúc gồm Controller, Service và Repository.",
      },
      steps: [
        {
          step: 2,
          layer: "BUSINESS_LOGIC",
          file_path: "src/services/product.service.ts",
          line_start: 14,
          line_end: 20,
          text: "Lấy danh sách",
        },
      ],
      strengths: [],
      weak_points: [
        {
          skill: "DB_OPTIMIZATION",
          step: 2,
          symbol: "findById",
          what: "Vòng for gọi categoryRepo.findById cho từng sản phẩm",
          consequence: "Càng nhiều sản phẩm thì DB bị query bấy nhiêu lần",
          file_path: "src/services/product.service.ts",
          line_start: 14,
          line_end: 20,
        },
      ],
      shared_files: [],
      skeleton_only: false,
    };

    const analyses2: Record<string, NodeAnalysisView> = {
      "slice-profile": n2Analysis,
      "slice-product-list": n3Analysis,
    };

    const discovered2 = buildDiscovered(clientResult, analyses2, null);

    // 2 bản phân tích ⇒ done = 2, total = 7
    expect(discovered2.done).toBe(2);
    expect(discovered2.total).toBe(7);

    // Gom đủ điểm dở của N2 và N3
    expect(discovered2.weak_points).toHaveLength(2);
    expect(discovered2.weak_points).toEqual(
      expect.arrayContaining([
        {
          node_id: "slice-profile",
          what: "JWT secret lưu cố định trong file mã nguồn",
          skill: "AUTH_SECURITY",
        },
        {
          node_id: "slice-product-list",
          what: "Vòng for gọi categoryRepo.findById cho từng sản phẩm",
          skill: "DB_OPTIMIZATION",
        },
      ])
    );

    // Thêm 1 bản phân tích (object) ⇒ done = 3
    const n1Analysis: NodeAnalysisView = {
      node_id: "slice-register",
      skills: [
        {
          skill: "DTO_VALIDATION",
          step: 1,
          symbol: "validateRegisterDto",
          reason: "Kiểm tra tính hợp lệ dữ liệu",
          file_path: "src/routes/auth.routes.ts",
          line_start: 6,
          line_end: 9,
        },
      ],
      architecture: {
        patterns: ["LAYERED"],
        summary: "Đăng ký tài khoản",
      },
      steps: [],
      strengths: [],
      weak_points: [],
      shared_files: [],
      skeleton_only: false,
    };

    const analyses3 = {
      ...analyses2,
      "slice-register": n1Analysis,
    };

    const discovered3 = buildDiscovered(clientResult, analyses3, null);
    expect(discovered3.done).toBe(3);
    expect(discovered3.total).toBe(7);

    // Thêm trường hợp 1 node bị analysis_failed trong progress ⇒ done cũng tính
    const progressWithFailed: SessionProgress = {
      session_id: "test-session",
      tokens_used: 100,
      nodes: {
        "slice-cart": {
          node_id: "slice-cart",
          status: "AVAILABLE",
          has_warning: true,
          analysis_failed: true,
          last_run: null,
        },
      },
    };

    const discoveredWithFailed = buildDiscovered(
      clientResult,
      analyses2,
      progressWithFailed
    );
    expect(discoveredWithFailed.done).toBe(3);
    expect(discoveredWithFailed.total).toBe(7);
  });
});
