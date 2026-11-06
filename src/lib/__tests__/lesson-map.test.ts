import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import type {
  ClientStaticEngineResult,
  HybridArchitecturalNode,
  NodeStateView,
  RepoOverviewView,
  SessionProgress,
} from "@/contracts";
import { CONFIG } from "@/contracts";
import { displayTitle } from "@/lib/derive";
import {
  blockedBy,
  cardAction,
  groupOfNode,
  isGroupOpen,
  lessonGroups,
  nodeStatesOf,
  openGroupsAfter,
  startNodeIds,
} from "@/lib/lesson-map";
import { LessonMapView } from "@/app/learn/components/LessonGraphPanel";

const base = shopApiFixture as unknown as ClientStaticEngineResult;

const GROUPS: ClientStaticEngineResult["groups"] = [
  { group_id: "group-entity-user", key: "User", key_kind: "ENTITY", node_ids: ["slice-register", "slice-profile"] },
  { group_id: "group-entity-product", key: "Product", key_kind: "ENTITY", node_ids: ["slice-product-list", "slice-cart"] },
  { group_id: "group-entity-order", key: "Order", key_kind: "ENTITY", node_ids: ["slice-order-checkout", "slice-revenue-report"] },
  { group_id: "group-standalone", key: "Học riêng", key_kind: "STANDALONE", node_ids: ["slice-send-email"] },
];
const result: ClientStaticEngineResult = { ...base, groups: GROUPS };

const overview = (ai: RepoOverviewView["ai"]): RepoOverviewView =>
  ({ facts: {}, ai }) as unknown as RepoOverviewView;
const withAi = overview({
  summary: "Cửa hàng bán hàng online.",
  groups: [{ group_id: "group-entity-product", name: "Mua hàng" }],
  node_titles: [{ node_id: "slice-product-list", title: "Xem danh sách sản phẩm" }],
});

const node = (id: string): HybridArchitecturalNode =>
  result.nodes.find((n) => n.id === id) as HybridArchitecturalNode;
const state = (id: string, status: NodeStateView["status"], analysis_failed = false): NodeStateView =>
  ({ node_id: id, status, has_warning: false, analysis_failed }) as unknown as NodeStateView;
const progressOf = (rows: NodeStateView[]): SessionProgress =>
  ({ nodes: Object.fromEntries(rows.map((r) => [r.node_id, r])) }) as unknown as SessionProgress;

const render = (props: Partial<Parameters<typeof LessonMapView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(LessonMapView, {
      result,
      overview: null,
      progress: null,
      analyses: {},
      activeNodeId: null,
      onSelectNode: () => undefined,
      onRetryAnalysis: () => undefined,
      ...props,
    })
  );

describe("T-UI-01 bản đồ chia nhóm", () => {
  it("T-UI-01: 4 nhóm đúng thứ tự engine, chỉ nhóm chứa mainPath[0] có nhãn", () => {
    const groups = lessonGroups(result, null);
    expect(groups.map((g) => g.group_id)).toEqual(GROUPS.map((g) => g.group_id));
    expect(groups.filter((g) => g.recommended)).toHaveLength(1);
  });

  it("T-UI-01: khi vẽ chỉ nhóm nên học trước mở, có nhãn và số bài", () => {
    const html = render();
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    expect(html).toContain("★ Nên học trước");
    expect(html).toContain("2 bài");
  });

  it("T-UI-01: có tên AI thì hiện tên, nhãn và title ở dòng nhỏ", () => {
    const html = render({
      overview: withAi,
      activeNodeId: "slice-product-list",
    });
    expect(html).toContain("Mua hàng");
    expect(html).toContain("Xem danh sách sản phẩm");
    expect(html).toContain("AI đặt tên");
    expect(html).toContain(`GET /products · ${node("slice-product-list").title}`);
  });

  it("T-UI-01: ai = null dùng key, title, không có nhãn", () => {
    const html = render({ overview: overview(null), activeNodeId: "slice-product-list" });
    expect(html).toContain("Product");
    expect(html).toContain(node("slice-product-list").title);
    expect(html).not.toContain("AI đặt tên");
    expect(html).not.toContain("GET /products · ");
  });

  it("Offline: bundle chưa có groups thì gom theo đầu route, bài không có route vào Học riêng", () => {
    const groups = lessonGroups({ ...base, groups: undefined } as unknown as ClientStaticEngineResult, null);
    expect(groups.flatMap((g) => g.node_ids).sort()).toEqual(base.nodes.map((n) => n.id).sort());
    expect(groups.find((g) => g.node_ids.includes("slice-cart"))?.group_id).toBe("group-route-cart");
    expect(groups.at(-1)).toMatchObject({ group_id: "group-standalone", name: "Học riêng", node_ids: ["slice-send-email"] });
    expect(lessonGroups({ ...base, groups: [] }, null).length).toBe(groups.length);
  });

  it("Offline: bài thuật toán hoặc bài không có cạnh vào Học riêng, route khác hoa thường chung nhóm", () => {
    const n = (id: string, title_evidence: string, node_type = "ARCHITECTURAL_DATA_FLOW") =>
      ({ id, title: id, title_evidence, node_type, prerequisites: [] }) as unknown as HybridArchitecturalNode;
    const groups = lessonGroups(
      {
        ...base,
        groups: [],
        nodes: [
          n("a", "GET /api/v1/Users"),
          n("b", "POST /users/login"),
          n("c", "GET /health"),
          n("d", "GET /users/sort", "ALGORITHMIC_CORE"),
        ],
        edges: [{ id: "e", source: "a", target: "b" }, { id: "f", source: "b", target: "d" }],
      } as unknown as ClientStaticEngineResult,
      null
    );
    expect(groups.map((g) => [g.group_id, g.node_ids])).toEqual([
      ["group-route-users", ["a", "b"]],
      ["group-standalone", ["c", "d"]],
    ]);
  });

  it("D-83: displayTitle cắt tên dài, tiền tố ~ chỉ cho tên engine suy ra", () => {
    const long = "x".repeat(CONFIG.TITLE_MAX_CHARS + 5);
    const n = { ...node("slice-cart"), title: long, title_source: "DIRECTORY" } as HybridArchitecturalNode;
    expect(displayTitle(n, null)).toBe("~" + "x".repeat(CONFIG.TITLE_MAX_CHARS - 1) + "…");
    expect(displayTitle(node("slice-product-list"), withAi)).toBe("Xem danh sách sản phẩm");
  });

  it("D-85: chip Bắt đầu chỉ cho bài gốc có cạnh ra", () => {
    const starts = startNodeIds(result.nodes, result.edges);
    const expected = result.nodes
      .filter((n) => n.prerequisites.length === 0 && result.edges.some((e) => e.source === n.id))
      .map((n) => n.id);
    expect([...starts].sort()).toEqual(expected.sort());
    expect(starts.has("slice-cart")).toBe(false);
    expect(render({ activeNodeId: "slice-product-list" })).toContain("Bắt đầu");
  });
});

describe("T-UI-02 bấm thẻ", () => {
  it("T-UI-02: LOCKED ra toast Cần xong, không mở bài", () => {
    expect(cardAction("LOCKED", ["Xem danh sách sản phẩm"])).toEqual({
      kind: "TOAST",
      message: "Cần xong: Xem danh sách sản phẩm",
    });
  });

  it("T-UI-02: các trạng thái còn lại mở bài", () => {
    for (const s of ["AVAILABLE", "COMPLETED", "FAILED"] as const) {
      expect(cardAction(s, [])).toEqual({ kind: "OPEN" });
    }
  });

  it("T-UI-02: thẻ khóa có aria-disabled và dòng Cần xong", () => {
    const html = render({
      activeNodeId: "slice-cart",
      progress: progressOf([state("slice-profile", "AVAILABLE"), state("slice-cart", "LOCKED")]),
    });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(`Cần xong: ${node("slice-profile").title}`);
  });

  it("T-UI-02: mở bài ở nhóm đang đóng thì nhóm đó mở, nhóm khác giữ nguyên", () => {
    const groups = lessonGroups(result, null);
    const open = { "group-entity-product": true, "group-entity-user": false };
    expect(groupOfNode(groups, "slice-send-email")?.group_id).toBe("group-standalone");
    expect(openGroupsAfter(open, groups, "slice-send-email")).toEqual({ ...open, "group-standalone": true });
    expect(openGroupsAfter(open, groups, null)).toBe(open);
  });

  it("Đổi phiên: state còn nhóm phiên cũ thì nhóm nên học trước của phiên mới vẫn mở", () => {
    const groups = lessonGroups(result, null);
    const recommended = groups.find((g) => g.recommended)!;
    const other = groups.find((g) => !g.recommended)!;
    const staleOpen = { "group-entity-phien-cu": true };
    expect(isGroupOpen(staleOpen, recommended)).toBe(true);
    expect(isGroupOpen(staleOpen, other)).toBe(false);
    expect(isGroupOpen({ [recommended.group_id]: false }, recommended)).toBe(false);
  });

  it("D-03: cha FAILED hoặc phân tích lỗi đã thông, cha chưa học thì chặn", () => {
    const states = nodeStatesOf(
      result.nodes,
      progressOf([
        state("slice-profile", "FAILED"),
        state("slice-register", "AVAILABLE", true),
        state("slice-product-list", "COMPLETED"),
        state("slice-cart", "AVAILABLE"),
      ])
    );
    expect(blockedBy(node("slice-cart"), states)).toEqual([]);
    expect(blockedBy(node("slice-profile"), states)).toEqual([]);
    expect(blockedBy(node("slice-order-checkout"), states)).toEqual(["slice-cart"]);
  });

  it("chưa có progress thì suy trạng thái từ prerequisites", () => {
    const states = nodeStatesOf(result.nodes, null);
    expect(states["slice-product-list"].status).toBe("AVAILABLE");
    expect(states["slice-cart"].status).toBe("LOCKED");
  });
});
