/**
 * src/server/ai/__tests__/overview.test.ts
 *
 * Kiểm thử cho lời gọi analyze-overview và cổng gác overview (GUARD-11, AI-19, AI-20).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type ArchitecturePattern,
  type GuardIssue,
  type NodeAnalysis,
  type RepoOverviewRaw,
  type SessionRow,
  type StaticEngineResult,
} from "@/contracts";

vi.mock("../gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gemini")>();
  return {
    ...actual,
    callLLMOnce: vi.fn(),
    retryDelay: vi.fn(async () => true), // D-74 R1: true = được gọi lại
  };
});

vi.mock("../guard/log", () => ({
  logGuardBlock: vi.fn(),
}));

vi.mock("@/server/quota", () => ({
  checkTokenQuota: vi.fn(),
}));

import { checkTokenQuota } from "@/server/quota";
import { callLLMOnce, retryDelay } from "../gemini";
import { logGuardBlock } from "../guard/log";
import { checkOverview } from "../guard/overview";
import {
  analyzeOverview,
  overviewFacts,
  type OverviewUsage,
} from "../overview";
import { overviewRequest, renderRepoSummary } from "../prompts/overview";

const shopApiFixturePath = resolve(
  __dirname,
  "../../engine/__fixtures__/shop-api.json",
);
const overviewFixturePath = resolve(
  __dirname,
  "../__fixtures__/overview.json",
);

const graph: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8"),
);

// Fixture 2.2 thay thế id N2, N3, N5, N7 theo spec 50 Mục 1
const rawOverviewJson = readFileSync(overviewFixturePath, "utf-8")
  .replace(/"<id N2>"/g, '"slice-profile"')
  .replace(/"<id N3>"/g, '"slice-product-list"')
  .replace(/"<id N5>"/g, '"slice-order-checkout"')
  .replace(/"<id N7>"/g, '"slice-revenue-report"');

const baseRawOverview: RepoOverviewRaw = JSON.parse(rawOverviewJson);

function createMinimalAnalysis(
  nodeId: string,
  hasWeakPoints: boolean,
): NodeAnalysis {
  return {
    node_id: nodeId,
    skeleton_only: false,
    skills: [
      {
        skill: "DB_OPTIMIZATION",
        step: 1,
        symbol: "findById",
        reason: "Truy vấn database",
      },
    ],
    architecture: {
      patterns: ["LAYERED"],
      summary: "Chia tầng",
    },
    steps: [{ step: 1, text: "Bước 1" }],
    strengths: [],
    weak_points: hasWeakPoints
      ? [
          {
            skill: "DB_OPTIMIZATION",
            step: 1,
            symbol: "findById",
            what: "Truy vấn trong vòng lặp",
            consequence: "Chậm khi dữ liệu lớn",
          },
        ]
      : [],
  };
}

// analyses tối thiểu đúng kiểu: N2, N3, N5 có weak_points > 0, N7 có weak_points: []
const analyses: Record<string, NodeAnalysis> = {
  "slice-register": createMinimalAnalysis("slice-register", false),
  "slice-profile": createMinimalAnalysis("slice-profile", true),
  "slice-product-list": createMinimalAnalysis("slice-product-list", true),
  "slice-cart": createMinimalAnalysis("slice-cart", false),
  "slice-order-checkout": createMinimalAnalysis("slice-order-checkout", true),
  "slice-send-email": createMinimalAnalysis("slice-send-email", false),
  "slice-revenue-report": createMinimalAnalysis("slice-revenue-report", false),
};

const session: SessionRow = {
  id: "session-test-overview",
  user_id: "user-test-overview",
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 1000,
};

describe("overview (C09 / GUARD-11, AI-19, AI-20)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkOverview (GUARD-11)", () => {
    it("fixture 2.2: gạch nhận xét N7 (không có điểm dở), giữ nhận xét N3+N5 và phần còn lại", () => {
      const issues: GuardIssue[] = [];
      const result = checkOverview(baseRawOverview, graph, analyses, issues);

      expect(result).not.toBeNull();
      expect(issues).toHaveLength(0);

      // Ghi chú N7 bị gạch, chỉ còn ghi chú N3+N5
      expect(result?.notes).toHaveLength(1);
      expect(result?.notes[0].nodes).toEqual([
        "slice-product-list",
        "slice-order-checkout",
      ]);
      expect(result?.notes[0].text).toBe(baseRawOverview.notes[0].text);

      // Layers giữ nguyên N2, N5 vì cả 2 đều có bước MIDDLEWARE
      expect(result?.layers).toHaveLength(1);
      expect(result?.layers[0].layer).toBe("MIDDLEWARE");
      expect(result?.layers[0].nodes).toEqual([
        "slice-profile",
        "slice-order-checkout",
      ]);

      // Không mutate baseRawOverview
      expect(baseRawOverview.notes).toHaveLength(2);
    });

    it("MIDDLEWARE gán thêm N3 ⇒ N3 bị bỏ khỏi mục đó (N2, N5 giữ)", () => {
      const rawWithN3Middleware: RepoOverviewRaw = {
        ...baseRawOverview,
        layers: [
          {
            layer: "MIDDLEWARE",
            role: "Kiểm tra token",
            nodes: [
              "slice-profile",
              "slice-product-list",
              "slice-order-checkout",
            ],
          },
        ],
      };

      const result = checkOverview(rawWithN3Middleware, graph, analyses);
      expect(result).not.toBeNull();
      expect(result?.layers[0].nodes).toEqual([
        "slice-profile",
        "slice-order-checkout",
      ]);
      expect(result?.layers[0].nodes).not.toContain("slice-product-list");
    });

    it('summary có "dòng 5" ⇒ null và issues có O4', () => {
      const badSummaryRaw: RepoOverviewRaw = {
        ...baseRawOverview,
        summary: "Web bán hàng có lỗi xác thực ở dòng 5.",
      };

      const issues: GuardIssue[] = [];
      const result = checkOverview(badSummaryRaw, graph, analyses, issues);

      expect(result).toBeNull();
      expect(issues.some((i) => i.code === "O4")).toBe(true);
    });

    it('summary có "Redis" ⇒ null với O3', () => {
      const badForbiddenRaw: RepoOverviewRaw = {
        ...baseRawOverview,
        summary: "Web bán hàng chia 3 tầng và dùng Redis để cache.",
      };

      const issues: GuardIssue[] = [];
      const result = checkOverview(badForbiddenRaw, graph, analyses, issues);

      expect(result).toBeNull();
      expect(issues.some((i) => i.code === "O3")).toBe(true);
    });

    it('architecture_style lạ ⇒ "OTHER"', () => {
      const unknownStyleRaw: RepoOverviewRaw = {
        ...baseRawOverview,
        architecture_style: "UNKNOWN_CUSTOM_STYLE" as ArchitecturePattern,
      };

      const result = checkOverview(unknownStyleRaw, graph, analyses);
      expect(result).not.toBeNull();
      expect(result?.architecture_style).toBe("OTHER");
    });
  });

  describe("overviewFacts", () => {
    it('overviewFacts của shop-api: root_node_ids = ["slice-product-list", "slice-register"]', () => {
      const facts = overviewFacts(graph);

      expect(facts.root_node_ids).toEqual([
        "slice-product-list",
        "slice-register",
      ]);
      expect(facts.archetype).toBe("WEB_BACKEND");
      expect(facts.framework).toBe("Express");
      expect(facts.tech_stack).toEqual(graph.fingerprint.tech_stack);
      expect(facts.main_path_node_ids.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeOverview", () => {
    it("lần 1 bị gác (null) ⇒ request 2 có <guard_feedback>, logGuardBlock('overview', 1, null, …); lần 2 sạch ⇒ trả bản đã kiểm", async () => {
      const badOverviewRaw: RepoOverviewRaw = {
        ...baseRawOverview,
        summary: "Web bán hàng có lỗi ở dòng 5.",
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: badOverviewRaw,
          tokens_in: 150,
          tokens_out: 80,
        })
        .mockResolvedValueOnce({
          ok: true,
          value: baseRawOverview,
          tokens_in: 160,
          tokens_out: 90,
        });

      const usage: OverviewUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
      const failedIds = new Set<string>();

      const result = await analyzeOverview(
        session,
        graph,
        analyses,
        failedIds,
        usage,
      );

      expect(checkTokenQuota).toHaveBeenCalledWith(session.tokens_used);
      expect(callLLMOnce).toHaveBeenCalledTimes(2);

      // Lần 1 bị gác O4
      expect(logGuardBlock).toHaveBeenCalledWith(
        "overview",
        1,
        null,
        expect.arrayContaining([expect.objectContaining({ code: "O4" })]),
      );

      // Lần 2 request có <guard_feedback>
      const secondCallReq = vi.mocked(callLLMOnce).mock.calls[1][0];
      expect(secondCallReq.user).toContain("<guard_feedback>");
      expect(secondCallReq.user).toContain("O4");

      // Trả bản đã kiểm
      expect(result).not.toBeNull();
      expect(result?.notes).toHaveLength(1);

      // Usage cộng dồn
      expect(usage.requests).toBe(2);
      expect(usage.tokens_in).toBe(310);
      expect(usage.tokens_out).toBe(170);
    });

    it("cả 2 lần hỏng ⇒ trả về null", async () => {
      const badOverviewRaw: RepoOverviewRaw = {
        ...baseRawOverview,
        summary: "Web bán hàng có lỗi ở dòng 5.",
      };

      vi.mocked(callLLMOnce)
        .mockResolvedValueOnce({
          ok: true,
          value: badOverviewRaw,
          tokens_in: 100,
          tokens_out: 50,
        })
        .mockResolvedValueOnce({
          ok: false,
          kind: "INVALID_JSON",
          tokens_in: 20,
          tokens_out: 10,
        });

      const failedIds = new Set<string>();
      const result = await analyzeOverview(session, graph, analyses, failedIds);

      expect(result).toBeNull();
      expect(retryDelay).toHaveBeenCalledTimes(0);
    });

    it("request không chứa snippet code của node nào (kiểm dòng code đặc trưng của N3 không có trong user)", () => {
      const failedIds = new Set<string>();
      const req = overviewRequest(session, graph, analyses, failedIds);

      // Dòng code đặc trưng của N3 trong shop-api
      expect(req.user).not.toContain("productRepo.findAll");
      expect(req.user).not.toContain("categoryRepo.findById(p.categoryId)");
      expect(req.user).not.toContain("this.repo.findOne");

      // Nhưng có tên node và tóm tắt
      expect(req.user).toContain('NODE slice-product-list · "List Products"');
      expect(req.user).toContain("<repo_summary>");
      expect(req.user).toContain("<pattern_catalogue>");
      expect(req.user).toContain("<forbidden_tech>");
      expect(req.user).toContain("Trả JSON tổng quan theo schema.");
    });

    it("node trong failedIds chỉ có dòng NODE và tang trong <repo_summary>", () => {
      const failedIds = new Set<string>(["slice-product-list"]);
      const summary = renderRepoSummary(graph, analyses, failedIds);

      // slice-product-list trong failedIds
      // Khối của node lỗi: chỉ có dòng NODE và dòng tang, tới khối NODE kế tiếp
      const failedBlock = summary
        .split("\nNODE ")
        .find((b) => b.includes('slice-product-list · "List Products"'));
      expect(failedBlock).toBeDefined();
      const failedLines = (failedBlock ?? "").trim().split("\n").map((l) => l.trim());
      expect(failedLines).toHaveLength(2);
      expect(failedLines[1].startsWith("tang: ")).toBe(true);

      // slice-profile không thuộc failedIds có đủ các dòng
      expect(summary).toContain('NODE slice-profile · "User Profile"');
      expect(summary).toContain("  mau: LAYERED");
      expect(summary).toContain("  tom_tat: Chia tầng");
      expect(summary).toContain("  ky_nang: DB_OPTIMIZATION");
      expect(summary).toContain(
        "  diem_do: [DB_OPTIMIZATION] (bước 1) Truy vấn trong vòng lặp",
      );
    });
  });
});
