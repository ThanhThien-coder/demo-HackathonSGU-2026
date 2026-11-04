import { describe, it, expect, vi } from "vitest";
import {
  CONFIG,
  type AnalyzeNodeResponse,
  type AnalyzeOverviewResponse,
  type ClientStaticEngineResult,
  type EnrichNodeResponse,
  type EvaluateFeynmanResponse,
  type HybridArchitecturalNode,
  type IngestResponse,
  type NodeAnalysisView,
  type PersonaResponse,
  type RepoOverviewView,
  type RevealResponse,
} from "@/contracts";
import {
  createApiCall,
  recordBundle,
  type ApiCall,
  type RecordScenario,
} from "../scripts/record-bundle";
import shopApiJson from "@/server/engine/__fixtures__/shop-api.json";

describe("C10a: record-bundle (scripts/record-bundle.ts)", () => {
  const rawProductNode = shopApiJson.nodes.find((n) => n.id === "slice-product-list");
  if (!rawProductNode) {
    throw new Error("Không tìm thấy slice-product-list trong shop-api.json fixture");
  }

  const mockProductListNode: HybridArchitecturalNode = {
    id: "slice-product-list",
    title: rawProductNode.title,
    title_source: "ROUTE",
    title_evidence: rawProductNode.title_evidence,
    node_type: "ARCHITECTURAL_DATA_FLOW",
    entry_symbol: rawProductNode.entry_symbol,
    prerequisites: [],
    position: { x: rawProductNode.position.x, y: rawProductNode.position.y },
    files: [...rawProductNode.files],
    languages: ["TYPESCRIPT"],
    support_tier: "RESOLVED",
    cognitive_complexity: rawProductNode.cognitive_complexity,
    rank_score: rawProductNode.rank_score,
    is_vip_algorithm: rawProductNode.is_vip_algorithm,
    is_capstone: rawProductNode.is_capstone,
    uncle_bob: {
      instability: rawProductNode.uncle_bob.instability,
      abstractness: rawProductNode.uncle_bob.abstractness,
      distance: rawProductNode.uncle_bob.distance,
      diagnosis: "BALANCED",
      is_exempt: rawProductNode.uncle_bob.is_exempt,
    },
    dto_snippet: rawProductNode.dto_snippet,
    trace_steps: rawProductNode.trace_steps.map((s) => ({
      step_number: s.step_number,
      layer: "ENTRY_POINT",
      file_path: s.file_path,
      function_name: s.function_name,
      line_start: s.line_start,
      line_end: s.line_end,
      snippet: s.snippet,
      snippet_line_map: [...s.snippet_line_map],
    })),
  };

  const mockEngineResult: ClientStaticEngineResult = {
    engine_version: shopApiJson.engine_version,
    repo_name: shopApiJson.repo_name,
    snapshot: {
      source: "GITHUB",
      repo_key: shopApiJson.snapshot.repo_key,
      snapshot_id: shopApiJson.snapshot.snapshot_id,
      snapshot_id_kind: "COMMIT_SHA",
      subdir: shopApiJson.snapshot.subdir,
      ref_label: shopApiJson.snapshot.ref_label,
    },
    fingerprint: {
      archetype: "WEB_BACKEND",
      primary_language: "TYPESCRIPT",
      language_breakdown: [
        {
          language: "TYPESCRIPT",
          tier: "RESOLVED",
          code_bytes: 12500,
        },
      ],
      graph_confidence: "HIGH",
      detected_framework: "Express",
      tech_stack: [...shopApiJson.fingerprint.tech_stack],
      is_monorepo: false,
      root_dir_offset: "",
    },
    total_files: shopApiJson.total_files,
    nodes: [mockProductListNode],
    edges: [],
    file_index: [...shopApiJson.file_index],
    ingestion_report: {
      truncated: false,
      selective_fetch: false,
      code_file_count: 17,
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
      redacted_secret_count: 1,
      engine_ms: 120,
      ingest_ms: 350,
    },
  };

  const mockIngestResponse: IngestResponse = {
    session_id: "root-session-id",
    result: mockEngineResult,
    progress: {
      session_id: "root-session-id",
      nodes: {
        "slice-product-list": {
          node_id: "slice-product-list",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
      },
      tokens_used: 100,
    },
    analyses: {},
    resumed: false,
    from_cache: false,
  };

  const mockAnalysis: NodeAnalysisView = {
    node_id: "slice-product-list",
    skills: [
      {
        skill: "DB_OPTIMIZATION",
        step: 2,
        symbol: "findById",
        reason: "Truy vấn trong vòng lặp",
        file_path: "src/services/product.service.ts",
        line_start: 14,
        line_end: 20,
      },
    ],
    architecture: {
      patterns: ["REPOSITORY"],
      summary: "Sử dụng repository pattern",
    },
    steps: [
      {
        step: 1,
        layer: "ENTRY_POINT",
        file_path: "src/controllers/product.controller.ts",
        line_start: 8,
        line_end: 11,
        text: "Route nhận request",
      },
    ],
    strengths: [],
    weak_points: [],
    shared_files: [],
    skeleton_only: false,
  };

  const mockAnalyzeNodeResponse: AnalyzeNodeResponse = {
    node_id: "slice-product-list",
    analysis: mockAnalysis,
    node_state: {
      node_id: "slice-product-list",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    },
    unlocked_node_ids: [],
    tokens_used: 100,
  };

  const mockOverview: RepoOverviewView = {
    facts: {
      archetype: "WEB_BACKEND",
      framework: "Express",
      tech_stack: ["express", "typeorm"],
      root_node_ids: ["slice-product-list"],
      main_path_node_ids: ["slice-product-list"],
    },
    ai: {
      architecture_style: "LAYERED",
      summary: "Kiến trúc 3 tầng",
      layers: [
        {
          layer: "ENTRY_POINT",
          role: "Nhận HTTP request",
          nodes: ["slice-product-list"],
        },
      ],
      main_flow: "Request đi qua controller tới service và repo",
      notes: [],
    },
  };

  const mockAnalyzeOverviewResponse: AnalyzeOverviewResponse = {
    overview: mockOverview,
    tokens_used: 100,
  };

  const mockPersonaResponse: PersonaResponse = {
    profile: {
      user_id: "demo-user-newbie",
      display_name: "Demo Learner (NEWBIE)",
      skills: {},
      overall_tier: "NOVICE",
    },
    server_now: 1730000000000,
  };

  const mockRestartIngestResponse: IngestResponse = {
    session_id: "persona-session-newbie",
    result: mockEngineResult,
    progress: {
      session_id: "persona-session-newbie",
      nodes: {
        "slice-product-list": {
          node_id: "slice-product-list",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
      },
      tokens_used: 100,
    },
    analyses: {
      "slice-product-list": mockAnalysis,
    },
    resumed: false,
    from_cache: false,
  };

  const mockEnrichNodeResponse: EnrichNodeResponse = {
    node_id: "slice-product-list",
    run_id: "run-newbie-1",
    mode: "LEARN",
    questions: [
      {
        question_index: 1,
        skill: "DB_OPTIMIZATION",
        tier: "NOVICE",
        focus: "WEAKNESS",
        feynman_question: "Vì sao trang chậm khi có 200 sản phẩm?",
        state: {
          question_index: 1,
          feynman_question: "Vì sao trang chậm khi có 200 sản phẩm?",
          skill: "DB_OPTIMIZATION",
          tier: "NOVICE",
          focus: "WEAKNESS",
          attempts_used: 0,
          finished: false,
          outcome: null,
          ended_by: null,
          disputed: false,
          reveal: null,
        },
      },
    ],
    node_state: {
      node_id: "slice-product-list",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    },
    tokens_used: 100,
  };

  const mockEvaluateFailResponse: EvaluateFeynmanResponse = {
    question_index: 1,
    attempt_number: 1,
    core_accuracy: 50,
    simplicity: 70,
    intent: "ANSWER",
    is_passed: false,
    points_covered: [false, false],
    feedback: "Bạn thấy đúng là nhiều sản phẩm thì chậm hơn, nhưng chưa nói vì sao.",
    detected_jargons: [],
    follow_up: {
      type: "CONCEPT",
      question: "Sau khi có danh sách, trang còn cần thêm thông tin gì cho từng sản phẩm?",
      step_index: null,
    },
    question: {
      question_index: 1,
      feynman_question: "Vì sao trang chậm khi có 200 sản phẩm?",
      skill: "DB_OPTIMIZATION",
      tier: "NOVICE",
      focus: "WEAKNESS",
      attempts_used: 1,
      finished: false,
      outcome: null,
      ended_by: null,
      disputed: false,
      reveal: null,
    },
    skill_change: null,
    node_state: {
      node_id: "slice-product-list",
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    },
    unlocked_node_ids: [],
    tokens_used: 100,
  };

  const mockEvaluatePassResponse: EvaluateFeynmanResponse = {
    question_index: 1,
    attempt_number: 2,
    core_accuracy: 90,
    simplicity: 80,
    intent: "ANSWER",
    is_passed: true,
    points_covered: [true, true],
    feedback: "Chính xác! Bạn giải thích đúng vì sao số truy vấn tăng theo số sản phẩm.",
    detected_jargons: ["database"],
    follow_up: null,
    question: {
      question_index: 1,
      feynman_question: "Vì sao trang chậm khi có 200 sản phẩm?",
      skill: "DB_OPTIMIZATION",
      tier: "NOVICE",
      focus: "WEAKNESS",
      attempts_used: 2,
      finished: true,
      outcome: "PASS_AFTER_HINT",
      ended_by: "ANSWER",
      disputed: false,
      reveal: {
        reference_answer: "Vòng lặp gọi categoryRepo.findById cho từng sản phẩm nên tốn 201 truy vấn.",
        must_have_points: [
          "Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng",
          "Số truy vấn tăng theo số sản phẩm, không cố định",
        ],
        fix: "Cho findAll lấy kèm loại hàng hoặc gom categoryId tìm một lần bằng IN.",
      },
    },
    skill_change: {
      skill: "DB_OPTIMIZATION",
      p_before: 0.25,
      p_after: 0.4202,
      outcome: "PASS_AFTER_HINT",
    },
    node_state: {
      node_id: "slice-product-list",
      status: "COMPLETED",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    },
    unlocked_node_ids: [],
    tokens_used: 100,
  };

  const mockRevealResponse: RevealResponse = {
    question: {
      question_index: 1,
      feynman_question: "Vì sao trang chậm khi có 200 sản phẩm?",
      skill: "DB_OPTIMIZATION",
      tier: "NOVICE",
      focus: "WEAKNESS",
      attempts_used: 1,
      finished: true,
      outcome: "FAILED",
      ended_by: "SKIP",
      disputed: false,
      reveal: {
        reference_answer: "Vòng lặp gọi categoryRepo.findById cho từng sản phẩm nên tốn 201 truy vấn.",
        must_have_points: [
          "Mỗi sản phẩm tốn thêm 1 truy vấn để lấy loại hàng",
          "Số truy vấn tăng theo số sản phẩm, không cố định",
        ],
        fix: "Cho findAll lấy kèm loại hàng.",
      },
    },
    skill_change: {
      skill: "DB_OPTIMIZATION",
      p_before: 0.25,
      p_after: 0.1268,
      outcome: "FAILED",
    },
    node_state: {
      node_id: "slice-product-list",
      status: "COMPLETED",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    },
    unlocked_node_ids: [],
  };

  it("Ca 1: Luồng đủ 1 persona × 1 node × 1 câu (lượt 1 chưa đạt, lượt 2 đạt) tạo bundle đúng khóa, đủ trường recorded_from và đúng thứ tự gọi API", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [
        {
          persona: "NEWBIE",
          nodes: [
            {
              node_id: "slice-product-list",
              questions: [
                {
                  question_index: 1,
                  answers: [
                    "Vì có 200 sản phẩm nên dữ liệu nhiều.",
                    "Vì lấy danh sách xong, code còn hỏi database thêm một lần cho mỗi sản phẩm để lấy loại hàng. 200 sản phẩm là 201 lần hỏi.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const callPaths: string[] = [];
    let evalCount = 0;

    const mockApi: ApiCall = async <T>(path: string, body: unknown): Promise<T> => {
      callPaths.push(path);
      if (path === "/api/ingest") {
        const ingestBody = body as { restart?: boolean };
        if (ingestBody.restart) {
          return mockRestartIngestResponse as T;
        }
        return mockIngestResponse as T;
      }
      if (path === "/api/analyze-node") {
        return mockAnalyzeNodeResponse as T;
      }
      if (path === "/api/analyze-overview") {
        return mockAnalyzeOverviewResponse as T;
      }
      if (path === "/api/demo/persona") {
        return mockPersonaResponse as T;
      }
      if (path === "/api/enrich-node") {
        return mockEnrichNodeResponse as T;
      }
      if (path === "/api/evaluate-feynman") {
        evalCount++;
        if (evalCount === 1) {
          return mockEvaluateFailResponse as T;
        }
        return mockEvaluatePassResponse as T;
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    const fixedNow = 1730000000000;
    const bundle = await recordBundle(mockApi, scenario, fixedNow);

    // Kiểm bundle_version
    expect(bundle.bundle_version).toBe("1.0.0");

    // Kiểm recorded_from đủ 6 trường, model/prompt_version khớp CONFIG
    expect(bundle.recorded_from).toEqual({
      repo: "https://github.com/simplifey/shop-api",
      snapshot_id: "5be1c2a01234567890abcdef01234567890abcde",
      engine_version: CONFIG.ENGINE_VERSION,
      prompt_version: CONFIG.PROMPT_VERSION,
      model: CONFIG.LLM_MODEL,
      recorded_at: fixedNow,
    });

    // Kiểm bundle có đúng khóa
    const enrichKey = "slice-product-list:LEARN:NEWBIE";
    expect(bundle.enrich[enrichKey]).toBeDefined();
    expect(bundle.enrich[enrichKey]).toEqual(mockEnrichNodeResponse);

    const scriptKey1 = "slice-product-list:LEARN:NEWBIE:1:1";
    expect(bundle.scripted_answers[scriptKey1]).toBeDefined();
    expect(bundle.scripted_answers[scriptKey1]).toHaveLength(1);
    expect(bundle.scripted_answers[scriptKey1][0].answer).toBe("Vì có 200 sản phẩm nên dữ liệu nhiều.");
    expect(bundle.scripted_answers[scriptKey1][0].response).toEqual(mockEvaluateFailResponse);

    const scriptKey2 = "slice-product-list:LEARN:NEWBIE:1:2";
    expect(bundle.scripted_answers[scriptKey2]).toBeDefined();
    expect(bundle.scripted_answers[scriptKey2]).toHaveLength(1);
    expect(bundle.scripted_answers[scriptKey2][0].answer).toBe(
      "Vì lấy danh sách xong, code còn hỏi database thêm một lần cho mỗi sản phẩm để lấy loại hàng. 200 sản phẩm là 201 lần hỏi."
    );
    expect(bundle.scripted_answers[scriptKey2][0].response).toEqual(mockEvaluatePassResponse);

    // Kiểm thứ tự gọi API: persona trước restart, restart trước enrich
    expect(callPaths).toEqual([
      "/api/ingest",
      "/api/analyze-node",
      "/api/analyze-overview",
      "/api/demo/persona",
      "/api/ingest",
      "/api/enrich-node",
      "/api/evaluate-feynman",
      "/api/evaluate-feynman",
    ]);

    const personaIdx = callPaths.indexOf("/api/demo/persona");
    const restartIdx = callPaths.findIndex((p, idx) => p === "/api/ingest" && idx > 0);
    const enrichIdx = callPaths.indexOf("/api/enrich-node");

    expect(personaIdx).toBeGreaterThan(-1);
    expect(restartIdx).toBeGreaterThan(personaIdx);
    expect(enrichIdx).toBeGreaterThan(restartIdx);
  });

  it("Ca 2: analyze-node làm tokens_used tăng ⇒ recordBundle ném lỗi có chữ 'chưa có trong ai_cache'", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [],
    };

    const mockApi: ApiCall = async <T>(path: string): Promise<T> => {
      if (path === "/api/ingest") {
        return mockIngestResponse as T; // tokens_used = 100
      }
      if (path === "/api/analyze-node") {
        // tokens_used tăng lên 150 > 100
        const cacheMissResponse: AnalyzeNodeResponse = {
          ...mockAnalyzeNodeResponse,
          tokens_used: 150,
        };
        return cacheMissResponse as T;
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    await expect(recordBundle(mockApi, scenario, 1730000000000)).rejects.toThrowError(
      /chưa có trong ai_cache/
    );
  });

  it("Ca 3: Câu có reveal: true, 1 lượt chưa đạt ⇒ có reveals[…:1], có gọi /api/reveal", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [
        {
          persona: "NEWBIE",
          nodes: [
            {
              node_id: "slice-product-list",
              questions: [
                {
                  question_index: 1,
                  answers: ["câu trả lời chưa đạt"],
                  reveal: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const calledPaths: string[] = [];

    const mockApi: ApiCall = async <T>(path: string, body: unknown): Promise<T> => {
      calledPaths.push(path);
      if (path === "/api/ingest") {
        const ingestBody = body as { restart?: boolean };
        if (ingestBody.restart) {
          return mockRestartIngestResponse as T;
        }
        return mockIngestResponse as T;
      }
      if (path === "/api/analyze-node") {
        return mockAnalyzeNodeResponse as T;
      }
      if (path === "/api/analyze-overview") {
        return mockAnalyzeOverviewResponse as T;
      }
      if (path === "/api/demo/persona") {
        return mockPersonaResponse as T;
      }
      if (path === "/api/enrich-node") {
        return mockEnrichNodeResponse as T;
      }
      if (path === "/api/evaluate-feynman") {
        return mockEvaluateFailResponse as T;
      }
      if (path === "/api/reveal") {
        return mockRevealResponse as T;
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    const bundle = await recordBundle(mockApi, scenario, 1730000000000);

    const revealKey = "slice-product-list:LEARN:NEWBIE:1";
    expect(bundle.reveals[revealKey]).toBeDefined();
    expect(bundle.reveals[revealKey]).toEqual(mockRevealResponse);
    expect(calledPaths).toContain("/api/reveal");
  });

  it("Ca 4: Đạt ở lượt 1 ⇒ không gọi lượt 2 dù kịch bản có 2 câu trả lời", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [
        {
          persona: "NEWBIE",
          nodes: [
            {
              node_id: "slice-product-list",
              questions: [
                {
                  question_index: 1,
                  answers: [
                    "Câu trả lời chuẩn đạt ngay lần 1",
                    "Câu trả lời thừa của lượt 2",
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    let evalCalls = 0;

    const mockApi: ApiCall = async <T>(path: string, body: unknown): Promise<T> => {
      if (path === "/api/ingest") {
        const ingestBody = body as { restart?: boolean };
        if (ingestBody.restart) {
          return mockRestartIngestResponse as T;
        }
        return mockIngestResponse as T;
      }
      if (path === "/api/analyze-node") {
        return mockAnalyzeNodeResponse as T;
      }
      if (path === "/api/analyze-overview") {
        return mockAnalyzeOverviewResponse as T;
      }
      if (path === "/api/demo/persona") {
        return mockPersonaResponse as T;
      }
      if (path === "/api/enrich-node") {
        return mockEnrichNodeResponse as T;
      }
      if (path === "/api/evaluate-feynman") {
        evalCalls++;
        return mockEvaluatePassResponse as T; // Đạt ở lượt 1 (is_passed: true, question.finished: true)
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    const bundle = await recordBundle(mockApi, scenario, 1730000000000);

    expect(evalCalls).toBe(1);
    expect(bundle.scripted_answers["slice-product-list:LEARN:NEWBIE:1:1"]).toBeDefined();
    expect(bundle.scripted_answers["slice-product-list:LEARN:NEWBIE:1:2"]).toBeUndefined();
  });

  it("Ca 5: ApiCall lỗi HTTP ⇒ lỗi được ném ra, thông điệp không chứa token", async () => {
    const secretToken = "GIA";
    const originalFetch = globalThis.fetch;

    try {
      // Mock fetch trả HTTP 401 với ApiError
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "ERR_UNAUTHENTICATED",
            message: "Xác thực không hợp lệ",
            retryable: false,
          },
        }),
      });

      const api = createApiCall("http://localhost:3000", secretToken);
      let errorThrown: Error | null = null;
      try {
        await api("/api/analyze-node", { node_id: "test" });
      } catch (err: unknown) {
        if (err instanceof Error) {
          errorThrown = err;
        }
      }

      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("/api/analyze-node");
      expect(errorThrown!.message).toContain("ERR_UNAUTHENTICATED");
      expect(errorThrown!.message).not.toContain(secretToken);
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Mock fetch trả HTTP 500 không parse được JSON
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Cannot parse JSON");
        },
      });

      const api = createApiCall("http://localhost:3000", secretToken);
      let errorThrown: Error | null = null;
      try {
        await api("/api/analyze-overview", {});
      } catch (err: unknown) {
        if (err instanceof Error) {
          errorThrown = err;
        }
      }

      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("/api/analyze-overview");
      expect(errorThrown!.message).toContain("HTTP_500");
      expect(errorThrown!.message).not.toContain(secretToken);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Kiểm soát biên: analysis trong analyze-node là null ⇒ ném lỗi", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [],
    };

    const mockApi: ApiCall = async <T>(path: string): Promise<T> => {
      if (path === "/api/ingest") {
        return mockIngestResponse as T;
      }
      if (path === "/api/analyze-node") {
        const nullAnalysisResponse: AnalyzeNodeResponse = {
          ...mockAnalyzeNodeResponse,
          analysis: null,
        };
        return nullAnalysisResponse as T;
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    await expect(recordBundle(mockApi, scenario, 1730000000000)).rejects.toThrowError(
      /phân tích thất bại/
    );
  });

  it("Kiểm soát biên: analyze-overview làm tokens_used tăng ⇒ ném lỗi", async () => {
    const scenario: RecordScenario = {
      repo_url: "https://github.com/simplifey/shop-api",
      personas: [],
    };

    const mockApi: ApiCall = async <T>(path: string): Promise<T> => {
      if (path === "/api/ingest") {
        return mockIngestResponse as T;
      }
      if (path === "/api/analyze-node") {
        return mockAnalyzeNodeResponse as T;
      }
      if (path === "/api/analyze-overview") {
        const missOverviewResponse: AnalyzeOverviewResponse = {
          ...mockAnalyzeOverviewResponse,
          tokens_used: 200, // Tăng so với 100
        };
        return missOverviewResponse as T;
      }
      throw new Error(`Unhandled mock API path: ${path}`);
    };

    await expect(recordBundle(mockApi, scenario, 1730000000000)).rejects.toThrowError(
      /overview chưa có trong ai_cache/
    );
  });
});
