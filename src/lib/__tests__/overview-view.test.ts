import { describe, it, expect } from "vitest";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import {
  buildOverviewFacts,
  overviewGroups,
  overviewNodeTitle,
  overviewFallback,
  startNodeId,
} from "../overview-view";
import type {
  ClientStaticEngineResult,
  RepoOverviewView,
} from "@/contracts";

describe("overview-view", () => {
  const clientResult = shopApiFixture as unknown as ClientStaticEngineResult;

  describe("buildOverviewFacts", () => {
    it("trả về đúng 5 trường facts (archetype, framework, tech_stack, root_node_ids, main_path_node_ids)", () => {
      const facts = buildOverviewFacts(clientResult);

      expect(facts.root_node_ids).toEqual([
        "slice-product-list",
        "slice-register",
      ]);
      expect(facts.main_path_node_ids.length).toBeGreaterThan(0);
      expect(facts.archetype).toBe("WEB_BACKEND");
      expect(facts.framework).toBe("Express");
      expect(facts.tech_stack).toContain("express");
    });
  });

  describe("overviewGroups", () => {
    it("khi result.groups có phần tử: giữ đúng thứ tự engine, ưu tiên tên AI, thiếu tên AI thì dùng key, chép nguyên node_ids", () => {
      const mockResult: ClientStaticEngineResult = {
        ...clientResult,
        groups: [
          {
            group_id: "group-auth",
            key: "AuthKey",
            key_kind: "ROUTE_PREFIX",
            node_ids: ["slice-register", "slice-profile"],
          },
          {
            group_id: "group-products",
            key: "ProductKey",
            key_kind: "ENTITY",
            node_ids: ["slice-product-list"],
          },
        ],
      };

      // 1. Khi overview = null ⇒ dùng key
      const groupsWithoutAi = overviewGroups(mockResult, null);
      expect(groupsWithoutAi).toEqual([
        {
          group_id: "group-auth",
          name: "AuthKey",
          node_ids: ["slice-register", "slice-profile"],
        },
        {
          group_id: "group-products",
          name: "ProductKey",
          node_ids: ["slice-product-list"],
        },
      ]);

      // 2. Khi overview.ai.groups có tên ⇒ dùng tên AI
      const mockOverview: RepoOverviewView = {
        facts: {
          archetype: "WEB_BACKEND",
          framework: "Express",
          tech_stack: ["express"],
          root_node_ids: ["slice-register"],
          main_path_node_ids: ["slice-register"],
        },
        ai: {
          summary: "Tóm tắt AI",
          groups: [
            { group_id: "group-auth", name: "Xác thực tài khoản" },
          ],
          node_titles: [],
        },
      };

      const groupsWithAi = overviewGroups(mockResult, mockOverview);
      expect(groupsWithAi[0].name).toBe("Xác thực tài khoản");
      expect(groupsWithAi[1].name).toBe("ProductKey"); // Không có trong AI ⇒ fallback về key
    });

    it("khi result.groups rỗng/thiếu: nhóm dự phòng theo route prefix (bỏ /api, /v1), standalone vào Học riêng ở cuối cùng", () => {
      const mockResultNoGroups: ClientStaticEngineResult = {
        ...clientResult,
        groups: [],
        edges: [
          { id: "e1", source: "n-order", target: "n-pay", via_entities: [], confidence: "RESOLVED" },
          { id: "e2", source: "n-user", target: "n-order", via_entities: [], confidence: "RESOLVED" },
        ],
        nodes: [
          {
            ...clientResult.nodes[0],
            id: "n-order",
            title: "Tạo đơn",
            title_evidence: "POST /orders/checkout",
            node_type: "ARCHITECTURAL_DATA_FLOW",
          },
          {
            ...clientResult.nodes[0],
            id: "n-pay",
            title: "Thanh toán",
            title_evidence: "POST /orders/pay",
            node_type: "ARCHITECTURAL_DATA_FLOW",
          },
          {
            ...clientResult.nodes[0],
            id: "n-user",
            title: "Lấy user",
            title_evidence: "GET /api/v1/users/:id",
            node_type: "ARCHITECTURAL_DATA_FLOW",
          },
          {
            ...clientResult.nodes[0],
            id: "n-algo",
            title: "Tính giá chiết khấu",
            title_evidence: "calculateDiscount",
            node_type: "ALGORITHMIC_CORE",
          },
          {
            ...clientResult.nodes[0],
            id: "n-isolated",
            title: "Hàm tiện ích độc lập",
            title_evidence: "GET /tools/format",
            node_type: "ARCHITECTURAL_DATA_FLOW",
            // không có cạnh vào/ra trong edges ⇒ thành standalone
          },
        ],
      };

      const groups = overviewGroups(mockResultNoGroups, null);

      // Thứ tự xuất hiện node:
      // n-order (orders) -> group-route-orders
      // n-pay (orders) -> cùng group-route-orders
      // n-user (/api/v1/users -> users) -> group-route-users
      // n-algo (ALGORITHMIC_CORE) -> group-standalone
      // n-isolated (không có cạnh) -> group-standalone
      // "Học riêng" luôn ở cuối!
      expect(groups).toHaveLength(3);

      expect(groups[0]).toEqual({
        group_id: "group-route-orders",
        name: "orders",
        node_ids: ["n-order", "n-pay"],
      });

      expect(groups[1]).toEqual({
        group_id: "group-route-users",
        name: "users",
        node_ids: ["n-user"],
      });

      expect(groups[2]).toEqual({
        group_id: "group-standalone",
        name: "Học riêng",
        node_ids: ["n-algo", "n-isolated"],
      });
    });

    it("trả về mảng rỗng khi result null hoặc không có node", () => {
      expect(overviewGroups(null, null)).toEqual([]);
      expect(overviewGroups({ nodes: [] } as never, null)).toEqual([]);
    });
  });

  describe("overviewNodeTitle", () => {
    it("trả về title từ AI nếu có, thiếu thì lấy node.title, không có node thì lấy nodeId", () => {
      const mockResult: ClientStaticEngineResult = {
        ...clientResult,
        nodes: [
          {
            ...clientResult.nodes[0],
            id: "node-1",
            title: "Tiêu đề Code 1",
          },
          {
            ...clientResult.nodes[0],
            id: "node-2",
            title: "Tiêu đề Code 2",
          },
        ],
      };

      const mockOverview: RepoOverviewView = {
        facts: {
          archetype: "WEB_BACKEND",
          framework: null,
          tech_stack: [],
          root_node_ids: [],
          main_path_node_ids: [],
        },
        ai: {
          summary: "Tóm tắt",
          groups: [],
          node_titles: [
            { node_id: "node-1", title: "Tiêu đề tiếng Việt từ AI" },
          ],
        },
      };

      // 1. Có trong AI
      expect(overviewNodeTitle(mockResult, mockOverview, "node-1")).toBe(
        "Tiêu đề tiếng Việt từ AI"
      );

      // 2. Không có trong AI ⇒ node.title
      expect(overviewNodeTitle(mockResult, mockOverview, "node-2")).toBe(
        "Tiêu đề Code 2"
      );

      // 3. Node không tồn tại trong result.nodes ⇒ nodeId
      expect(overviewNodeTitle(mockResult, mockOverview, "node-unknown")).toBe(
        "node-unknown"
      );
    });
  });

  describe("overviewFallback", () => {
    it("tạo câu fallback có framework và không có framework đúng định dạng", () => {
      const mockResult: ClientStaticEngineResult = {
        ...clientResult,
        repo_name: "shop-api",
        groups: [
          { group_id: "g1", key: "G1", key_kind: "ENTITY", node_ids: ["n1"] },
          { group_id: "g2", key: "G2", key_kind: "ENTITY", node_ids: ["n2"] },
        ],
        nodes: [{ id: "n1" } as never, { id: "n2" } as never, { id: "n3" } as never],
      };

      const factsWithFramework = {
        archetype: "WEB_BACKEND" as const,
        framework: "Express",
        tech_stack: ["express"],
        root_node_ids: ["n1"],
        main_path_node_ids: ["n1", "n2"],
      };

      const text1 = overviewFallback(mockResult, factsWithFramework);
      expect(text1).toBe("shop-api dùng Express có 3 bài, chia thành 2 nhóm.");

      const factsNoFramework = {
        ...factsWithFramework,
        framework: null,
      };

      const text2 = overviewFallback(mockResult, factsNoFramework);
      expect(text2).toBe("shop-api có 3 bài, chia thành 2 nhóm.");
    });
  });

  describe("startNodeId", () => {
    it("ưu tiên mainPath(result)[0] khi có", () => {
      const expected = buildOverviewFacts(clientResult).main_path_node_ids[0];
      expect(expected).toBeTruthy();
      expect(startNodeId(clientResult, null)).toBe(expected);
    });

    it("result thiếu edges (bundle cũ) ⇒ không lỗi, vẫn ra bài bắt đầu", () => {
      const noEdges = { ...clientResult, edges: undefined } as unknown as ClientStaticEngineResult;
      expect(() => startNodeId(noEdges, null)).not.toThrow();
      expect(startNodeId(noEdges, null)).toBeTruthy();
    });

    it("không có bài hoặc không có result ⇒ null", () => {
      const empty: ClientStaticEngineResult = { ...clientResult, nodes: [], edges: [], groups: [] };
      expect(startNodeId(empty, null)).toBeNull();
      expect(startNodeId(null, null)).toBeNull();
    });
  });
});
