/**
 * src/server/ai/guard/__tests__/analysis.test.ts
 *
 * Test cổng gác kiểm bản phân tích (GUARD-10, GUARD-22) theo spec 21 Mục 3 và Mục 6.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type GuardIssue,
  type HybridArchitecturalNode,
  type NodeAnalysisRaw,
  type StaticEngineResult,
} from "@/contracts";
import { logGuardBlocked } from "@/server/log";
import { checkAnalysis, type WeakPointStats } from "../analysis";
import { logGuardBlock } from "../log";

vi.mock("@/server/log", () => ({
  logGuardBlocked: vi.fn(),
}));

const shopApiFixturePath = resolve(
  __dirname,
  "../../../engine/__fixtures__/shop-api.json"
);
const analysisN3FixturePath = resolve(
  __dirname,
  "../../__fixtures__/analysis-n3.json"
);

const graph: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8")
);
const nodeN3 = graph.nodes.find((n) => n.id === "slice-product-list");
if (!nodeN3) {
  throw new Error("Không tìm thấy node slice-product-list trong fixture");
}
const node: HybridArchitecturalNode = nodeN3;

const raw: NodeAnalysisRaw = JSON.parse(
  readFileSync(analysisN3FixturePath, "utf-8")
);

describe("checkAnalysis (GUARD-10 & GUARD-22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GUARD-10 ca 1: fixture 2.1 nguyên => gạch AUTH_SECURITY, giữ 2 kỹ năng, skeleton_only = false", () => {
    const issues: GuardIssue[] = [];
    const result = checkAnalysis(raw, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(false);
    expect(result?.node_id).toBe(node.id);
    expect(result?.skills).toHaveLength(2);
    expect(result?.skills.map((s) => s.skill)).toEqual([
      "DB_OPTIMIZATION",
      "LAYERED_SEPARATION",
    ]);

    // verifyToken không có ở bước 3 => issues có đúng 1 mục A1 với name: "verifyToken"
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("A1");
    expect(issues[0].name).toBe("verifyToken");

    // Không có mã A6 (findOne và các tên khác đều hợp lệ)
    expect(issues.some((i) => i.code === "A6")).toBe(false);
  });

  it("GUARD-10 ca 2: steps chỉ giữ 2 mục => skeleton_only = true, 2 kỹ năng giữ, mọi reason = '', steps = []", () => {
    const cloned = structuredClone(raw);
    cloned.steps = cloned.steps.slice(0, 2);

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(true);
    expect(result?.node_id).toBe(node.id);
    expect(result?.skills).toHaveLength(2);
    expect(result?.skills.every((s) => s.reason === "")).toBe(true);
    expect(result?.steps).toEqual([]);
    expect(result?.strengths).toEqual([]);
    expect(result?.weak_points).toEqual([]);
    expect(result?.architecture.summary).toBe("");
  });

  it("GUARD-10 ca 3: chữ bước 2 thêm `verifyToken` => skeleton_only = true", () => {
    const cloned = structuredClone(raw);
    cloned.steps[1].text += " có gọi `verifyToken`";

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(true);
    expect(issues.some((i) => i.code === "A6" && i.name === "verifyToken")).toBe(
      true
    );
    expect(issues.some((i) => i.code === "A7")).toBe(true);
  });

  it("GUARD-10 ca 3 (ca riêng): chữ bước 2 thêm 'dòng 99' => skeleton_only = true", () => {
    const cloned = structuredClone(raw);
    cloned.steps[1].text += " tham khảo dòng 99";

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(true);
    expect(issues.some((i) => i.code === "A6")).toBe(true);
    expect(issues.some((i) => i.code === "A7")).toBe(true);
  });

  it("GUARD-10 ca 4: thêm điểm dở kỹ năng AUTH_SECURITY => điểm đó bị gạch (có A3)", () => {
    const cloned = structuredClone(raw);
    cloned.weak_points.push({
      skill: "AUTH_SECURITY",
      step: 3,
      symbol: "verifyToken",
      what: "Thiếu kiểm tra quyền xác thực",
      consequence: "Mọi người đều có thể xem danh sách",
    });

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.weak_points).toHaveLength(1);
    expect(result?.weak_points[0].skill).toBe("DB_OPTIMIZATION");
    expect(
      issues.some((i) => i.code === "A3" && i.name === "verifyToken")
    ).toBe(true);
  });

  it("GUARD-10 ca 4: thêm điểm dở thứ 2 cùng DB_OPTIMIZATION => chỉ giữ điểm đầu", () => {
    const cloned = structuredClone(raw);
    cloned.weak_points.push({
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "productRepo",
      what: "Gọi findAll lấy toàn bộ sản phẩm không phân trang",
      consequence: "Quá tải bộ nhớ",
    });

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).not.toBeNull();
    expect(result?.weak_points).toHaveLength(1);
    expect(result?.weak_points[0].symbol).toBe("findById");
    // Điểm thứ 2 hợp lệ, chỉ bị bỏ vì vượt WEAK_POINTS_PER_SKILL_MAX, không phải A3
    expect(issues.some((i) => i.code === "A3")).toBe(false);
  });

  it("GUARD-10 ca 4: mọi kỹ năng sai => trả null", () => {
    const cloned = structuredClone(raw);
    for (const s of cloned.skills) {
      s.symbol = "nonExistentSymbol";
    }

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result).toBeNull();
    expect(issues.some((i) => i.code === "A1")).toBe(true);
  });

  it("GUARD-22: steps chỉ 2 mục => issues có A5, logGuardBlock ghi entry đầy đủ, không trùng mã, không có name/step", () => {
    const cloned = structuredClone(raw);
    cloned.steps = cloned.steps.slice(0, 2);

    const issues: GuardIssue[] = [];
    const result = checkAnalysis(cloned, node, graph, issues);

    expect(result?.skeleton_only).toBe(true);
    expect(issues.some((i) => i.code === "A5")).toBe(true);
    expect(issues.some((i) => i.code === "A7")).toBe(true);

    logGuardBlock("analyze", 1, node.id, issues);

    expect(logGuardBlocked).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(logGuardBlocked).mock.calls[0][0];

    expect(entry.event).toBe("guard_blocked");
    expect(entry.call).toBe("analyze");
    expect(entry.attempt).toBe(1);
    expect(entry.node_id).toBe(node.id);
    expect(entry.codes).toContain("A5");
    expect(entry.codes).toContain("A7");
    // Không trùng mã:
    expect(new Set(entry.codes).size).toBe(entry.codes.length);
    expect(entry.prompt_version).toBe(CONFIG.PROMPT_VERSION);
    expect(entry.llm_model).toBe(CONFIG.LLM_MODEL);
    // Entry không có khóa name, step:
    expect("name" in entry).toBe(false);
    expect("step" in entry).toBe(false);
  });

  it("C-09 thống kê lọc điểm dở: đếm đúng theo từng lý do, kept chỉ tính điểm được giữ", () => {
    const db = raw.weak_points[0];
    const raw2: NodeAnalysisRaw = {
      ...raw,
      weak_points: [
        db,
        { skill: "AUTH_SECURITY", step: 3, symbol: "verifyToken", what: "x", consequence: "y" },
        { ...db, step: 99 },
        { ...db, symbol: "khongCoTrongCode" },
        { ...db },
      ],
    };
    const stats = {} as WeakPointStats;
    const result = checkAnalysis(raw2, node, graph, [], stats);

    expect(result?.skeleton_only).toBe(false);
    expect(result?.weak_points).toHaveLength(1);
    expect(stats).toEqual({
      raw: 5,
      kept: 1,
      bad_step: 1,
      skill_not_chosen: 1,
      symbol_not_in_step: 1,
      over_limit: 1,
      strengths_raw: raw.strengths.length,
      strengths_kept: raw.strengths.length,
    });
  });

  it("Thêm: gọi checkAnalysis không truyền issues cho ra kết quả toEqual khi truyền []", () => {
    const resultWithoutIssues = checkAnalysis(raw, node, graph);
    const issuesArray: GuardIssue[] = [];
    const resultWithIssues = checkAnalysis(raw, node, graph, issuesArray);

    expect(resultWithoutIssues).toEqual(resultWithIssues);
  });
});
