import { describe, it, expect, beforeEach } from "vitest";
import {
  setOfflineMode,
  setOfflinePersona,
  buildOfflineProfile,
  offlineIngestRepo,
  offlineEnrichNode,
  offlineEvaluateFeynman,
  offlineRevealQuestion,
  offlineGetOverview,
  offlineGetAnalysis,
} from "../offline";
import type { OfflineMockBundle } from "@/contracts";

describe("Offline Mode (D08 & spec/30_UI.md Section 8)", () => {
  const mockBundle: OfflineMockBundle = {
    bundle_version: "1.0.0",
    recorded_from: {
      repo: "simplifey/demo-repo",
      snapshot_id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      engine_version: "1.0.0",
      prompt_version: "1.0.0",
      model: "gemini-2.5-flash",
      recorded_at: 1730000000000,
    },
    ingest: {
      session_id: "offline-session-123",
      resumed: false,
      from_cache: true,
      result: {
        engine_version: "1.0.0",
        repo_name: "demo-repo",
        snapshot: {
          source: "GITHUB",
          repo_key: "simplifey/demo-repo",
          snapshot_id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
          snapshot_id_kind: "COMMIT_SHA",
          subdir: "",
          ref_label: "main",
        },
        fingerprint: {
          archetype: "WEB_BACKEND",
          primary_language: "TYPESCRIPT",
          language_breakdown: [
            { language: "TYPESCRIPT", code_bytes: 1000, tier: "RESOLVED" },
          ],
          graph_confidence: "HIGH",
          detected_framework: "NestJS",
          tech_stack: ["typescript", "nestjs"],
          is_monorepo: false,
          root_dir_offset: "",
        },
        total_files: 5,
        file_index: ["src/order.service.ts"],
        ingestion_report: {
          truncated: false,
          selective_fetch: false,
          code_file_count: 5,
          manifest_count: 1,
          omitted_node_count: 0,
          skipped: { garbage: 0, binary: 0, oversized: 0, unsupported_lang: 0, quota: 0, parse_error: 0 },
          warnings: [],
          degraded_mode: null,
          redacted_secret_count: 0,
          engine_ms: 100,
          ingest_ms: 50,
        },
        nodes: [],
        edges: [],
      },
      progress: {
        session_id: "offline-session-123",
        tokens_used: 0,
        nodes: {},
      },
      analyses: {},
    },
    analyses: {
      "node-1": {
        node_id: "node-1",
        skills: [
          {
            skill: "DB_OPTIMIZATION",
            step: 1,
            symbol: "findOrderById",
            reason: "Uses indexed lookup",
            file_path: "src/order.service.ts",
            line_start: 10,
            line_end: 25,
          },
        ],
        architecture: {
          patterns: ["LAYERED"],
          summary: "Order transactional processing",
        },
        steps: [
          {
            step: 1,
            layer: "BUSINESS_LOGIC",
            file_path: "src/order.service.ts",
            line_start: 10,
            line_end: 25,
            text: "Order query with lock",
          },
        ],
        strengths: [{ step: 1, text: "Clean database query" }],
        weak_points: [],
        shared_files: [],
        skeleton_only: false,
      },
    },
    overview: {
      facts: {
        archetype: "WEB_BACKEND",
        framework: "NestJS",
        tech_stack: ["TypeScript", "NestJS", "PostgreSQL"],
        root_node_ids: ["node-1"],
        main_path_node_ids: ["node-1"],
      },
      ai: {
        architecture_style: "LAYERED",
        summary: "E-commerce order system",
        layers: [{ layer: "BUSINESS_LOGIC", role: "Business Logic", nodes: ["node-1"] }],
        main_flow: "Request -> Controller -> Service -> Database",
        notes: [],
      },
    },
    enrich: {
      "node-1:LEARN:NEWBIE": {
        run_id: "run-offline-1",
        node_id: "node-1",
        mode: "LEARN",
        questions: [
          {
            question_index: 0,
            feynman_question: "Giải thích cách hệ thống tránh xung đột khi trừ tồn kho?",
            skill: "DB_OPTIMIZATION",
            tier: "NOVICE",
            focus: "ARCHITECTURE",
            state: {
              question_index: 0,
              feynman_question: "Giải thích cách hệ thống tránh xung đột khi trừ tồn kho?",
              skill: "DB_OPTIMIZATION",
              tier: "NOVICE",
              focus: "ARCHITECTURE",
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
          node_id: "node-1",
          status: "AVAILABLE",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        tokens_used: 0,
      },
    },
    scripted_answers: {
      "node-1:LEARN:NEWBIE:0:1": [
        {
          answer: "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.",
          response: {
            question_index: 0,
            attempt_number: 1,
            core_accuracy: 0.9,
            simplicity: 0.85,
            intent: "ANSWER",
            is_passed: true,
            points_covered: [true],
            feedback: "Chính xác! Bạn đã hiểu đúng cơ chế transaction lock.",
            detected_jargons: [],
            follow_up: null,
            question: {
              question_index: 0,
              feynman_question: "Giải thích cách hệ thống tránh xung đột khi trừ tồn kho?",
              skill: "DB_OPTIMIZATION",
              tier: "NOVICE",
              focus: "ARCHITECTURE",
              attempts_used: 1,
              finished: true,
              outcome: "PASS_FIRST",
              ended_by: "ANSWER",
              disputed: false,
              reveal: {
                reference_answer: "Sử dụng SELECT FOR UPDATE để khóa hàng tồn kho trong transaction.",
                must_have_points: ["Transaction", "Pessimistic lock"],
                fix: "Không cần sửa",
              },
            },
            skill_change: {
              skill: "DB_OPTIMIZATION",
              p_before: 0.25,
              p_after: 0.45,
              outcome: "PASS_FIRST",
            },
            node_state: {
              node_id: "node-1",
              status: "COMPLETED",
              has_warning: false,
              analysis_failed: false,
              last_run: null,
            },
            unlocked_node_ids: [],
            tokens_used: 0,
          },
        },
      ],
    },
    reveals: {
      "node-1:LEARN:NEWBIE:0": {
        question: {
          question_index: 0,
          feynman_question: "Giải thích cách hệ thống tránh xung đột khi trừ tồn kho?",
          skill: "DB_OPTIMIZATION",
          tier: "NOVICE",
          focus: "ARCHITECTURE",
          attempts_used: 1,
          finished: true,
          outcome: "FAILED",
          ended_by: "SKIP",
          disputed: false,
          reveal: {
            reference_answer: "Sử dụng SELECT FOR UPDATE để khóa hàng tồn kho trong transaction.",
            must_have_points: ["Transaction", "Pessimistic lock"],
            fix: "Cần chú ý khóa hàng",
          },
        },
        skill_change: {
          skill: "DB_OPTIMIZATION",
          p_before: 0.25,
          p_after: 0.2,
          outcome: "FAILED",
        },
        node_state: {
          node_id: "node-1",
          status: "FAILED",
          has_warning: false,
          analysis_failed: false,
          last_run: null,
        },
        unlocked_node_ids: [],
      },
    },
  };

  beforeEach(() => {
    setOfflineMode(true, mockBundle);
    setOfflinePersona("NEWBIE");
  });

  it("buildOfflineProfile generates 16 SWE skills with proper tier", () => {
    const profile = buildOfflineProfile("NEWBIE");
    expect(profile.user_id).toBe("offline-newbie");
    expect(profile.overall_tier).toBe("NOVICE");
    expect(Object.keys(profile.skills).length).toBe(16);
    expect(profile.skills.DB_OPTIMIZATION?.p_mastery).toBe(0.25);
  });

  it("offlineIngestRepo returns the bundled ingest data", () => {
    const res = offlineIngestRepo();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.session_id).toBe("offline-session-123");
      expect(res.data.result.repo_name).toBe("demo-repo");
    }
  });

  it("offlineEnrichNode returns enrichment when key exists", () => {
    const res = offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.questions.length).toBe(1);
    }
  });

  it("offlineEnrichNode returns error when key is missing", () => {
    const res = offlineEnrichNode("node-unknown", "LEARN", "NEWBIE");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.error.code).toBe("ERR_ANALYSIS_NOT_READY");
    }
  });

  it("offlineEvaluateFeynman validates answer length", () => {
    const shortRes = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, "ngắn");
    expect(shortRes.ok).toBe(false);
    if (!shortRes.ok) {
      expect(shortRes.error.error.code).toBe("ERR_ANSWER_TOO_SHORT");
    }
  });

  it("offlineEvaluateFeynman succeeds for scripted answers matching similarity >= 0.8", () => {
    const exactAnswer =
      "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.";
    const res = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, exactAnswer);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.is_passed).toBe(true);
      expect(res.data.feedback).toContain("Chính xác");
    }
  });

  it("offlineEvaluateFeynman rejects unscripted answers with ERR_ANSWER_INAPPROPRIATE", () => {
    const offTopicAnswer =
      "Tôi nghĩ là cứ trừ bình thường thôi không cần locking gì cả đâu nhé.";
    const res = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, offTopicAnswer);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.error.code).toBe("ERR_ANSWER_INAPPROPRIATE");
      expect(res.error.error.message).toContain("Chế độ offline chỉ chấm được câu trả lời trong kịch bản");
    }
  });

  it("offlineRevealQuestion returns reveal explanation", () => {
    const res = offlineRevealQuestion("node-1", "LEARN", 0);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.question.reveal?.reference_answer).toContain("SELECT FOR UPDATE");
    }
  });

  it("offlineGetOverview and offlineGetAnalysis return bundled views", () => {
    const overviewRes = offlineGetOverview();
    expect(overviewRes.ok).toBe(true);
    if (overviewRes.ok) {
      expect(overviewRes.data.facts.archetype).toBe("WEB_BACKEND");
    }

    const analysisRes = offlineGetAnalysis("node-1");
    expect(analysisRes.ok).toBe(true);
    if (analysisRes.ok) {
      expect(analysisRes.data.node_id).toBe("node-1");
    }
  });
});
