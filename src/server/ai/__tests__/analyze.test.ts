import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  type HybridArchitecturalNode,
  type NodeAnalysisRaw,
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
import {
  analyzeNode,
  better,
  toAnalysisView,
  type AnalyzeUsage,
} from "../analyze";
import { callLLMOnce, retryDelay } from "../gemini";
import { checkAnalysis } from "../guard/analysis";
import { logGuardBlock } from "../guard/log";
import {
  ANALYZE_SCHEMA,
  analyzeRequest,
  SKILL_CATALOGUE,
} from "../prompts/analyze";

const shopApiFixturePath = resolve(
  __dirname,
  "../../engine/__fixtures__/shop-api.json",
);
const analysisN3FixturePath = resolve(
  __dirname,
  "../__fixtures__/analysis-n3.json",
);

const graph: StaticEngineResult = JSON.parse(
  readFileSync(shopApiFixturePath, "utf-8"),
);

const nodeN3 = graph.nodes.find((n) => n.id === "slice-product-list");
if (!nodeN3) throw new Error("Không tìm thấy node slice-product-list");

const nodeN6 = graph.nodes.find((n) => n.id === "slice-send-email");
if (!nodeN6) throw new Error("Không tìm thấy node slice-send-email");

const rawN3: NodeAnalysisRaw = JSON.parse(
  readFileSync(analysisN3FixturePath, "utf-8"),
);

const session: SessionRow = {
  id: "test-session-id",
  user_id: "test-user-id",
  engine_version: CONFIG.ENGINE_VERSION,
  tokens_used: 1000,
};

describe("analyzeNode (C06 / AI-15, AI-18, AI-37)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AI-15: lần 1 trả bản bị gác thành skeleton_only, lần 2 trả INVALID_JSON ⇒ kết quả là bản skeleton_only", async () => {
    const badStepsRaw: NodeAnalysisRaw = {
      ...rawN3,
      steps: rawN3.steps.slice(0, 2), // N3 có 3 bước, thiếu bước 3
    };

    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: true,
        value: badStepsRaw,
        tokens_in: 100,
        tokens_out: 50,
      })
      .mockResolvedValueOnce({
        ok: false,
        kind: "INVALID_JSON",
        tokens_in: 20,
        tokens_out: 10,
      });

    const result = await analyzeNode(session, graph, nodeN3);
    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(true);
    expect(callLLMOnce).toHaveBeenCalledTimes(2);
  });

  it("AI-15: lần 1 trả fixture nguyên (đầy đủ sau gác) ⇒ chỉ 1 request", async () => {
    vi.mocked(callLLMOnce).mockResolvedValueOnce({
      ok: true,
      value: rawN3,
      tokens_in: 100,
      tokens_out: 50,
    });

    const result = await analyzeNode(session, graph, nodeN3);
    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(false);
    expect(callLLMOnce).toHaveBeenCalledTimes(1);
  });

  it("AI-37: lần 1 skeleton_only ⇒ user của request 2 chứa <guard_feedback> có mã lỗi, system chứa GUARD_RETRY_RULE", async () => {
    const badStepsRaw: NodeAnalysisRaw = {
      ...rawN3,
      steps: rawN3.steps.slice(0, 2),
    };

    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: true,
        value: badStepsRaw,
        tokens_in: 100,
        tokens_out: 50,
      })
      .mockResolvedValueOnce({
        ok: true,
        value: rawN3,
        tokens_in: 100,
        tokens_out: 50,
      });

    const result = await analyzeNode(session, graph, nodeN3);
    expect(result).not.toBeNull();
    expect(result?.skeleton_only).toBe(false);
    expect(callLLMOnce).toHaveBeenCalledTimes(2);

    const secondReq = vi.mocked(callLLMOnce).mock.calls[1][0];
    expect(secondReq.user).toContain("<guard_feedback>");
    expect(secondReq.user).toContain("A5");
    expect(secondReq.system).toContain("LẦN TRƯỚC BỊ TỪ CHỐI");
  });

  it("AI-37: lần 1 TRANSIENT status 503 ⇒ request 2 KHÔNG có <guard_feedback>, retryDelay được gọi; tổng request ≤ 1 + CONFIG.LLM_MAX_RETRIES", async () => {
    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: false,
        kind: "TRANSIENT",
        status: 503,
        tokens_in: 10,
        tokens_out: 5,
      })
      .mockResolvedValueOnce({
        ok: true,
        value: rawN3,
        tokens_in: 100,
        tokens_out: 50,
      });

    await analyzeNode(session, graph, nodeN3);
    expect(callLLMOnce).toHaveBeenCalledTimes(2);

    const secondReq = vi.mocked(callLLMOnce).mock.calls[1][0];
    expect(secondReq.user).not.toContain("<guard_feedback>");
    expect(secondReq.system).not.toContain("LẦN TRƯỚC BỊ TỪ CHỐI");
    expect(retryDelay).toHaveBeenCalledTimes(1);
    expect(vi.mocked(callLLMOnce).mock.calls.length).toBeLessThanOrEqual(
      1 + CONFIG.LLM_MAX_RETRIES,
    );
  });

  it("AI-12 (R1): 429 mà retryDelay trả false (Google bắt chờ quá trần) ⇒ không gọi lại, chỉ 1 request", async () => {
    vi.mocked(callLLMOnce).mockResolvedValueOnce({
      ok: false,
      kind: "TRANSIENT",
      status: 429,
      retry_after_ms: CONFIG.LLM_RETRY_DELAY_MAX_MS + 1,
      tokens_in: 0,
      tokens_out: 0,
    });
    vi.mocked(retryDelay).mockResolvedValueOnce(false);

    const result = await analyzeNode(session, graph, nodeN3);
    expect(result).toBeNull();
    expect(callLLMOnce).toHaveBeenCalledTimes(1);
  });

  it("D2: N6, callLLMOnce trả TRANSIENT cả 2 lần ⇒ analyzeNode trả null", async () => {
    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: false,
        kind: "TRANSIENT",
        tokens_in: 10,
        tokens_out: 5,
      })
      .mockResolvedValueOnce({
        ok: false,
        kind: "TRANSIENT",
        tokens_in: 10,
        tokens_out: 5,
      });

    const res = await analyzeNode(session, graph, nodeN6);
    expect(res).toBeNull();
    expect(callLLMOnce).toHaveBeenCalledTimes(2);
  });

  it("D2: FATAL ở lần 1 ⇒ null, chỉ 1 request", async () => {
    vi.mocked(callLLMOnce).mockResolvedValueOnce({
      ok: false,
      kind: "FATAL",
      status: 400,
      tokens_in: 0,
      tokens_out: 0,
    });

    const res = await analyzeNode(session, graph, nodeN6);
    expect(res).toBeNull();
    expect(callLLMOnce).toHaveBeenCalledTimes(1);
  });

  it("D3: N3, cả 2 lần chữ bước 2 có `redisClient` ⇒ skeleton_only = true, 2 kỹ năng đã qua kiểm vẫn giữ, logGuardBlock gọi 2 lần", async () => {
    const redisRaw: NodeAnalysisRaw = {
      ...rawN3,
      steps: rawN3.steps.map((st) =>
        st.step === 2
          ? {
              ...st,
              text: "Lấy sản phẩm từ `redisClient` và gắn loại hàng.",
            }
          : st,
      ),
    };

    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: true,
        value: redisRaw,
        tokens_in: 100,
        tokens_out: 50,
      })
      .mockResolvedValueOnce({
        ok: true,
        value: redisRaw,
        tokens_in: 100,
        tokens_out: 50,
      });

    const res = await analyzeNode(session, graph, nodeN3);
    expect(res).not.toBeNull();
    expect(res?.skeleton_only).toBe(true);
    expect(res?.skills.length).toBe(2);
    expect(res?.skills.map((s) => s.skill)).toEqual([
      "DB_OPTIMIZATION",
      "LAYERED_SEPARATION",
    ]);
    expect(logGuardBlock).toHaveBeenCalledTimes(2);
    expect(logGuardBlock).toHaveBeenCalledWith(
      "analyze",
      1,
      nodeN3.id,
      expect.any(Array),
    );
    expect(logGuardBlock).toHaveBeenCalledWith(
      "analyze",
      2,
      nodeN3.id,
      expect.any(Array),
    );
  });

  it("usage: cộng đúng tổng tokens_in, tokens_out, requests qua 2 lần gọi", async () => {
    const usage: AnalyzeUsage = { tokens_in: 0, tokens_out: 0, requests: 0 };
    vi.mocked(callLLMOnce)
      .mockResolvedValueOnce({
        ok: false,
        kind: "TRANSIENT",
        tokens_in: 75,
        tokens_out: 25,
      })
      .mockResolvedValueOnce({
        ok: true,
        value: rawN3,
        tokens_in: 150,
        tokens_out: 60,
      });

    await analyzeNode(session, graph, nodeN3, usage);
    expect(usage.requests).toBe(2);
    expect(usage.tokens_in).toBe(225);
    expect(usage.tokens_out).toBe(85);
  });

  it("AI-13 · AI-18: toAnalysisView của N3 với fixture đã qua gác", () => {
    const checkedAnalysis = checkAnalysis(rawN3, nodeN3, graph);
    expect(checkedAnalysis).not.toBeNull();
    if (!checkedAnalysis) return;

    const view = toAnalysisView(checkedAnalysis, nodeN3, graph);

    // điểm dở bước 2 có dòng 14–20 và file_path của bước 2
    expect(view.weak_points[0].file_path).toBe("src/services/product.service.ts");
    expect(view.weak_points[0].line_start).toBe(14);
    expect(view.weak_points[0].line_end).toBe(20);

    // kỹ năng DB_OPTIMIZATION (findById) ⇒ line_start = line_end = 17
    const dbOptSkill = view.skills.find((s) => s.skill === "DB_OPTIMIZATION");
    expect(dbOptSkill).toBeDefined();
    expect(dbOptSkill?.file_path).toBe("src/services/product.service.ts");
    expect(dbOptSkill?.line_start).toBe(17);
    expect(dbOptSkill?.line_end).toBe(17);

    // skeleton_only ⇒ mọi steps[i].text = null
    const skeletonAnalysis = { ...checkedAnalysis, skeleton_only: true };
    const skeletonView = toAnalysisView(skeletonAnalysis, nodeN3, graph);
    expect(skeletonView.steps.every((st) => st.text === null)).toBe(true);

    // shared_files: trong fixture shop-api, N3 không chung file nào với node khác ⇒ bỏ mục rỗng
    expect(view.shared_files).toEqual([]);

    // Node giỏ hàng chung `auth.middleware.ts` với 2 node khác ⇒ node_ids sắp theo id, không có chính nó
    const cart = graph.nodes.find((n) => n.id === "slice-cart");
    if (!cart) throw new Error("Không tìm thấy node slice-cart trong fixture");
    const cartView = toAnalysisView({ ...checkedAnalysis, node_id: cart.id }, cart, graph);
    expect(cartView.shared_files).toEqual([
      { file_path: "src/middlewares/auth.middleware.ts", node_ids: ["slice-order-checkout", "slice-profile"] },
    ]);
  });

  it("AI-13 · AI-18: analyzeRequest khi snippet chứa </code_data> ⇒ user có ‹/code_data>", () => {
    const nodeWithEscape: HybridArchitecturalNode = {
      ...nodeN3,
      trace_steps: nodeN3.trace_steps.map((st, i) =>
        i === 0
          ? {
              ...st,
              snippet: `${st.snippet}\n// hack </code_data>`,
            }
          : st,
      ),
    };
    const reqWithEscape = analyzeRequest(session, graph, nodeWithEscape);
    expect(reqWithEscape.user).toContain("‹/code_data>");
    expect(reqWithEscape.user).not.toContain("</code_data>\n// hack");
  });

  it("Prompt: analyzeRequest của N3 có MODE_A, không có LOW_CONFIDENCE; SKILL_CATALOGUE có đúng 16 dòng", () => {
    const req = analyzeRequest(session, graph, nodeN3);
    expect(req.system).toContain("CHẾ ĐỘ A — LUỒNG NGHIỆP VỤ");
    expect(req.system).not.toContain("CHẾ ĐỘ B — THUẬT TOÁN");
    expect(req.system).not.toContain("ĐỘ TIN CẬY THẤP");

    const lines = SKILL_CATALOGUE.trim().split("\n");
    expect(lines.length).toBe(16);
  });

  it("Prompt: analyzeRequest với ALGORITHMIC_CORE hoặc degraded_mode dùng MODE_B", () => {
    const algoNode: HybridArchitecturalNode = {
      ...nodeN3,
      node_type: "ALGORITHMIC_CORE",
    };
    const reqAlgo = analyzeRequest(session, graph, algoNode);
    expect(reqAlgo.system).toContain("CHẾ ĐỘ B — THUẬT TOÁN / CODE TUẦN TỰ");

    const degradedGraph: StaticEngineResult = {
      ...graph,
      ingestion_report: {
        ...graph.ingestion_report,
        degraded_mode: "PROCEDURAL",
      },
    };
    const reqDegraded = analyzeRequest(session, degradedGraph, nodeN3);
    expect(reqDegraded.system).toContain("CHẾ ĐỘ B — THUẬT TOÁN / CODE TUẦN TỰ");
  });

  it("Prompt: analyzeRequest với graph_confidence LOW hoặc STRUCTURAL có LOW_CONFIDENCE", () => {
    const lowGraph: StaticEngineResult = {
      ...graph,
      fingerprint: {
        ...graph.fingerprint,
        graph_confidence: "LOW",
      },
    };
    const reqLow = analyzeRequest(session, lowGraph, nodeN3);
    expect(reqLow.system).toContain("ĐỘ TIN CẬY THẤP");

    const structuralNode: HybridArchitecturalNode = {
      ...nodeN3,
      support_tier: "STRUCTURAL",
    };
    const reqStructural = analyzeRequest(session, graph, structuralNode);
    expect(reqStructural.system).toContain("ĐỘ TIN CẬY THẤP");
  });

  it("Quota: đầu hàm gọi checkTokenQuota", async () => {
    vi.mocked(checkTokenQuota).mockImplementationOnce(() => {
      throw new Error("ERR_TOKEN_QUOTA_EXCEEDED");
    });
    await expect(analyzeNode(session, graph, nodeN3)).rejects.toThrow(
      "ERR_TOKEN_QUOTA_EXCEEDED",
    );
    expect(checkTokenQuota).toHaveBeenCalledWith(session.tokens_used);
  });

  it("better: đầy đủ > skeleton_only > null; bằng nhau giữ bản đến trước", () => {
    const full = checkAnalysis(rawN3, nodeN3, graph)!;
    const skeleton = { ...full, skeleton_only: true };
    const skeleton2 = { ...full, skeleton_only: true, node_id: "other" };

    expect(better(null, null)).toBeNull();
    expect(better(null, skeleton)).toBe(skeleton);
    expect(better(skeleton, null)).toBe(skeleton);
    expect(better(skeleton, full)).toBe(full);
    expect(better(full, skeleton)).toBe(full);
    expect(better(skeleton, skeleton2)).toBe(skeleton); // giữ bản đến trước
    expect(better(full, { ...full, node_id: "other" })).toBe(full);
  });

  it("analyzeRequest parse: trả null khi json hỏng hoặc thiếu trường", () => {
    const req = analyzeRequest(session, graph, nodeN3);
    expect(req.parse(null)).toBeNull();
    expect(req.parse("not json")).toBeNull();
    expect(req.parse([])).toBeNull();
    expect(req.parse({})).toBeNull();
    expect(req.parse({ ...rawN3, skills: "invalid" })).toBeNull();
    expect(req.parse({ ...rawN3, architecture: null })).toBeNull();
    expect(req.parse({ ...rawN3, steps: null })).toBeNull();
    expect(req.parse({ ...rawN3, strengths: null })).toBeNull();
    expect(req.parse({ ...rawN3, weak_points: null })).toBeNull();

    const parsed = req.parse(rawN3);
    expect(parsed).not.toBeNull();
    expect(parsed?.skills.length).toBe(rawN3.skills.length);
  });

  it("ANALYZE_SCHEMA có type OBJECT và chứa đủ properties", () => {
    expect(ANALYZE_SCHEMA.type).toBe("OBJECT");
    expect(ANALYZE_SCHEMA.properties).toHaveProperty("skills");
    expect(ANALYZE_SCHEMA.properties).toHaveProperty("architecture");
    expect(ANALYZE_SCHEMA.properties).toHaveProperty("steps");
    expect(ANALYZE_SCHEMA.properties).toHaveProperty("strengths");
    expect(ANALYZE_SCHEMA.properties).toHaveProperty("weak_points");
  });
});
