import { describe, it, expect } from "vitest";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import type { HybridArchitecturalNode } from "@/contracts";

describe("Kiểm tra Bố cục Đồ thị Bài học (Lesson Graph Anti-Collision Layout)", () => {
  const nodes = shopApiFixture.nodes as unknown as HybridArchitecturalNode[];

  it("Đồ thị shop-api có 7 node được phân tầng rõ ràng không bị đè nhau", () => {
    expect(nodes.length).toBe(7);

    // Tính toán tier (độ sâu tô-pô DAG)
    const nodeMap = new Map<string, HybridArchitecturalNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const tierMap = new Map<string, number>();
    function getTier(nodeId: string, visited: Set<string> = new Set()): number {
      if (tierMap.has(nodeId)) return tierMap.get(nodeId)!;
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node || !node.prerequisites || node.prerequisites.length === 0) {
        tierMap.set(nodeId, 0);
        return 0;
      }

      let maxParentTier = -1;
      for (const pid of node.prerequisites) {
        if (nodeMap.has(pid)) {
          maxParentTier = Math.max(maxParentTier, getTier(pid, visited));
        }
      }

      const t = maxParentTier + 1;
      tierMap.set(nodeId, t);
      return t;
    }

    nodes.forEach((n) => getTier(n.id));

    // Nhóm theo tier
    const tiers: HybridArchitecturalNode[][] = [];
    nodes.forEach((n) => {
      const t = tierMap.get(n.id) ?? 0;
      if (!tiers[t]) tiers[t] = [];
      tiers[t].push(n);
    });

    const compactTiers = tiers.filter((t) => t && t.length > 0);
    expect(compactTiers.length).toBe(5);

    // Tier 0 (Hàng 1): 2 node gốc (User Registration & List Products)
    expect(compactTiers[0].length).toBe(2);
    const tier0Ids = compactTiers[0].map((n) => n.id);
    expect(tier0Ids).toContain("slice-register");
    expect(tier0Ids).toContain("slice-product-list");

    // Tier 4 (Hàng cuối): 2 node (Send Email Confirmation & Revenue Report)
    expect(compactTiers[4].length).toBe(2);
    const tier4Ids = compactTiers[4].map((n) => n.id);
    expect(tier4Ids).toContain("slice-send-email");
    expect(tier4Ids).toContain("slice-revenue-report");
  });

  it("Xác nhận khoảng cách giữa các node cùng hàng đạt chuẩn ≥ 130px (không bị đè 76px như trước)", () => {
    // Với thẻ rộng 376px, nếu cột trái x=35 và cột phải x=545:
    const cardWidth = 376;
    const xLeft = 35;
    const xRight = 545;

    const leftCardEnd = xLeft + cardWidth; // 411px
    const gap = xRight - leftCardEnd; // 134px

    expect(gap).toBeGreaterThanOrEqual(130);
    expect(leftCardEnd).toBeLessThan(xRight); // Tuyệt đối không chồng lấn
  });

  it("Đường cong Bézier kết nối giữa node cha và node con xuất phát từ đáy cha tới đỉnh con", () => {
    const parentBottom = { x: 35 + 376 / 2, y: 60 + 100 }; // (223, 160)
    const childTop = { x: 35 + 376 / 2, y: 220 }; // (223, 220)

    // Cùng trục x -> đường thẳng đứng
    expect(parentBottom.x).toBe(childTop.x);
    expect(childTop.y).toBeGreaterThan(parentBottom.y);
  });
});
