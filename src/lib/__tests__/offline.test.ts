import { describe, it, expect, beforeEach } from "vitest";
import {
  setOfflineMode,
  setOfflinePersona,
  buildOfflineProfile,
  getOfflineProfile,
  resetOfflineRuntime,
  offlineProgress,
  offlineNodeOfRun,
  offlineIngestRepo,
  offlineEnrichNode,
  offlineEvaluateFeynman,
  offlineRevealQuestion,
  offlineGetOverview,
  offlineGetAnalysis,
} from "../offline";
import {
  getMeSafe,
  switchPersonaSafe,
  getSessionProgressSafe,
  analyzeNodeSafe,
  getSessionsSafe,
  evaluateFeynmanSafe,
  revealSafe,
} from "../api";
import { computeSkillChange } from "../bkt-engine";
import type { OfflineMockBundle } from "@/contracts";

describe("Offline Mode (D08a & spec/30_UI.md Section 8)", () => {
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
        file_index: ["src/order.service.ts", "src/payment.service.ts"],
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
        nodes: [
          {
            id: "node-1",
            title: "Order Service",
            title_source: "ENTRY_SYMBOL",
            title_evidence: "OrderService.createOrder",
            node_type: "ARCHITECTURAL_DATA_FLOW",
            entry_symbol: "createOrder",
            prerequisites: [],
            position: { x: 0, y: 0 },
            files: ["src/order.service.ts"],
            languages: ["TYPESCRIPT"],
            support_tier: "RESOLVED",
            cognitive_complexity: 5,
            rank_score: 1.0,
            is_vip_algorithm: false,
            is_capstone: false,
            uncle_bob: {
              instability: 0.2,
              abstractness: 0.1,
              distance: 0.1,
              diagnosis: "BALANCED",
              is_exempt: false,
            },
            trace_steps: [],
            dto_snippet: "",
            group_id: "",
            entities: [],
          },
          {
            id: "node-2",
            title: "Payment Service",
            title_source: "ENTRY_SYMBOL",
            title_evidence: "PaymentService.processPayment",
            node_type: "ARCHITECTURAL_DATA_FLOW",
            entry_symbol: "processPayment",
            prerequisites: ["node-1"],
            position: { x: 200, y: 0 },
            files: ["src/payment.service.ts"],
            languages: ["TYPESCRIPT"],
            support_tier: "RESOLVED",
            cognitive_complexity: 8,
            rank_score: 0.8,
            is_vip_algorithm: false,
            is_capstone: true,
            uncle_bob: {
              instability: 0.3,
              abstractness: 0.2,
              distance: 0.1,
              diagnosis: "BALANCED",
              is_exempt: false,
            },
            trace_steps: [],
            dto_snippet: "",
            group_id: "",
            entities: [],
          },
        ],
        groups: [],
        edges: [
          {
            id: "node-1->node-2",
            source: "node-1",
            target: "node-2",
            confidence: "RESOLVED",
            via_entities: [],
          },
        ],
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
      "node-2": {
        node_id: "node-2",
        skills: [
          {
            skill: "AUTH_SECURITY",
            step: 1,
            symbol: "verifyPaymentToken",
            reason: "JWT authentication",
            file_path: "src/payment.service.ts",
            line_start: 5,
            line_end: 20,
          },
        ],
        architecture: {
          patterns: ["LAYERED"],
          summary: "Payment token verification",
        },
        steps: [
          {
            step: 1,
            layer: "BUSINESS_LOGIC",
            file_path: "src/payment.service.ts",
            line_start: 5,
            line_end: 20,
            text: "Verify signature",
          },
        ],
        strengths: [{ step: 1, text: "Strict signature checking" }],
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
        main_path_node_ids: ["node-1", "node-2"],
      },
      ai: {
        summary: "E-commerce order system",
        groups: [],
        node_titles: [{ node_id: "node-1", title: "Đặt đơn hàng" }],
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
      "node-2:LEARN:NEWBIE": {
        run_id: "run-offline-2",
        node_id: "node-2",
        mode: "LEARN",
        questions: [
          {
            question_index: 0,
            feynman_question: "Giải thích cách xác thực token JWT khi thanh toán?",
            skill: "AUTH_SECURITY",
            tier: "NOVICE",
            focus: "FLOW",
            state: {
              question_index: 0,
              feynman_question: "Giải thích cách xác thực token JWT khi thanh toán?",
              skill: "AUTH_SECURITY",
              tier: "NOVICE",
              focus: "FLOW",
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
          node_id: "node-2",
          status: "LOCKED",
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
              p_after: 0.9999, // Fake number in bundle to verify computation
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
      "node-1:LEARN:NEWBIE:0:3": [
        {
          answer: "Lần 3 vẫn trả lời sai về transaction isolation level không đúng chuẩn quy định.",
          response: {
            question_index: 0,
            attempt_number: 3,
            core_accuracy: 0.2,
            simplicity: 0.4,
            intent: "ANSWER",
            is_passed: false,
            points_covered: [false],
            feedback: "Chưa đạt sau 3 lần thử.",
            detected_jargons: [],
            follow_up: null,
            question: {
              question_index: 0,
              feynman_question: "Giải thích cách hệ thống tránh xung đột khi trừ tồn kho?",
              skill: "DB_OPTIMIZATION",
              tier: "NOVICE",
              focus: "ARCHITECTURE",
              attempts_used: 3,
              finished: true,
              outcome: "FAILED",
              ended_by: "ANSWER",
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
              p_after: 0.9999,
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
            tokens_used: 0,
          },
        },
      ],
      "node-2:LEARN:NEWBIE:0:1": [
        {
          answer: "Sử dụng JWT token có chữ ký HMAC SHA-256 để xác thực danh tính người dùng qua Authorization header.",
          response: {
            question_index: 0,
            attempt_number: 1,
            core_accuracy: 0.92,
            simplicity: 0.88,
            intent: "ANSWER",
            is_passed: true,
            points_covered: [true],
            feedback: "Rất tốt về xác thực JWT!",
            detected_jargons: [],
            follow_up: null,
            question: {
              question_index: 0,
              feynman_question: "Giải thích cách xác thực token JWT khi thanh toán?",
              skill: "AUTH_SECURITY",
              tier: "NOVICE",
              focus: "FLOW",
              attempts_used: 1,
              finished: true,
              outcome: "PASS_FIRST",
              ended_by: "ANSWER",
              disputed: false,
              reveal: {
                reference_answer: "Xác thực JWT token bằng secret key và kiểm tra expiration time.",
                must_have_points: ["JWT signature", "Expiration"],
                fix: "Không cần sửa",
              },
            },
            skill_change: {
              skill: "AUTH_SECURITY",
              p_before: 0.25,
              p_after: 0.9999, // Fake number in bundle
              outcome: "PASS_FIRST",
            },
            node_state: {
              node_id: "node-2",
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
          p_after: 0.9999,
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
      "node-2:LEARN:NEWBIE:0": {
        question: {
          question_index: 0,
          feynman_question: "Giải thích cách xác thực token JWT khi thanh toán?",
          skill: "AUTH_SECURITY",
          tier: "NOVICE",
          focus: "FLOW",
          attempts_used: 1,
          finished: true,
          outcome: "FAILED",
          ended_by: "SKIP",
          disputed: false,
          reveal: {
            reference_answer: "Xác thực JWT token bằng secret key và kiểm tra expiration time.",
            must_have_points: ["JWT signature", "Expiration"],
            fix: "Cần chú ý hạn dùng",
          },
        },
        skill_change: {
          skill: "AUTH_SECURITY",
          p_before: 0.25,
          p_after: 0.9999,
          outcome: "FAILED",
        },
        node_state: {
          node_id: "node-2",
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
    resetOfflineRuntime();
  });

  it("buildOfflineProfile generates 16 SWE skills with proper tier", () => {
    const profile = buildOfflineProfile("NEWBIE");
    expect(profile.user_id).toBe("offline-newbie");
    expect(profile.overall_tier).toBe("NOVICE");
    expect(Object.keys(profile.skills).length).toBe(16);
    expect(profile.skills.DB_OPTIMIZATION?.p_mastery).toBe(0.25);
  });

  it("offlineProgress initially has root node AVAILABLE and child node LOCKED", () => {
    const prog = offlineProgress();
    expect(prog.session_id).toBe("offline-session-123");
    expect(prog.nodes["node-1"]?.status).toBe("AVAILABLE");
    expect(prog.nodes["node-2"]?.status).toBe("LOCKED");
  });

  it("offlineIngestRepo returns the bundled ingest data with current offline progress", () => {
    const res = offlineIngestRepo();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.session_id).toBe("offline-session-123");
      expect(res.data.result.repo_name).toBe("demo-repo");
      expect(res.data.progress.nodes["node-1"]?.status).toBe("AVAILABLE");
      expect(res.data.progress.nodes["node-2"]?.status).toBe("LOCKED");
    }
  });

  it("offlineEnrichNode initializes run and preserves state on subsequent calls", () => {
    const res1 = offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.data.questions.length).toBe(1);
      expect(res1.data.questions[0].state.attempts_used).toBe(0);
      expect(res1.data.node_state.status).toBe("AVAILABLE");
      expect(res1.data.node_state.last_run).not.toBeNull();
    }

    // Call enrich again, state should be preserved
    const res2 = offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.data.run_id).toBe("run-offline-1");
      expect(res2.data.questions[0].state.attempts_used).toBe(0);
    }
  });

  it("offlineEnrichNode returns error when key is missing", () => {
    const res = offlineEnrichNode("node-unknown", "LEARN", "NEWBIE");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.error.code).toBe("ERR_ANALYSIS_NOT_READY");
    }
  });

  it("offlineNodeOfRun resolves node_id from run_id", () => {
    expect(offlineNodeOfRun("run-offline-1")).toBe("node-1");
    expect(offlineNodeOfRun("run-offline-2")).toBe("node-2");
    expect(offlineNodeOfRun("run-non-existent")).toBeNull();
  });

  it("offlineEvaluateFeynman validates answer length", () => {
    const shortRes = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, "ngắn");
    expect(shortRes.ok).toBe(false);
    if (!shortRes.ok) {
      expect(shortRes.error.error.code).toBe("ERR_ANSWER_TOO_SHORT");
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

  it("2 node khác nhau chấm đúng kịch bản của node đó", () => {
    // Enrich both nodes
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    offlineEnrichNode("node-2", "LEARN", "NEWBIE");

    const answerNode1 =
      "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.";
    const res1 = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, answerNode1);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.data.is_passed).toBe(true);
      expect(res1.data.feedback).toContain("transaction lock");
    }

    const answerNode2 =
      "Sử dụng JWT token có chữ ký HMAC SHA-256 để xác thực danh tính người dùng qua Authorization header.";
    const res2 = offlineEvaluateFeynman("node-2", "LEARN", 0, 1, answerNode2);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.data.is_passed).toBe(true);
      expect(res2.data.feedback).toContain("xác thực JWT");
    }
  });

  it("skill_change tính từ computeSkillChange chứ không lấy số trong bundle", () => {
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    const before = getOfflineProfile().skills.DB_OPTIMIZATION;
    const exactAnswer =
      "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.";
    const res = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, exactAnswer);

    expect(res.ok).toBe(true);
    if (res.ok) {
      // In bundle, p_after is fake 0.9999
      expect(res.data.skill_change).not.toBeNull();
      expect(res.data.skill_change?.p_after).not.toBe(0.9999);
      const expected = computeSkillChange(
        "DB_OPTIMIZATION",
        before,
        res.data.question.outcome!,
        Date.now()
      ).change.p_after;
      expect(res.data.skill_change?.p_after).toBeCloseTo(expected, 3);
      expect(getOfflineProfile().skills.DB_OPTIMIZATION?.p_mastery).toBeCloseTo(expected, 3);
    }
  });

  it("hoàn thành run ⇒ node COMPLETED, node con hết LOCKED, unlocked_node_ids đúng", () => {
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");

    // Before finishing node-1, node-2 is LOCKED
    expect(offlineProgress().nodes["node-2"]?.status).toBe("LOCKED");

    const exactAnswer =
      "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.";
    const res = offlineEvaluateFeynman("node-1", "LEARN", 0, 1, exactAnswer);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.node_state.status).toBe("COMPLETED");
      expect(res.data.unlocked_node_ids).toEqual(["node-2"]);

      // In offlineProgress(), node-2 is now AVAILABLE
      const prog = offlineProgress();
      expect(prog.nodes["node-1"]?.status).toBe("COMPLETED");
      expect(prog.nodes["node-2"]?.status).toBe("AVAILABLE");
    }
  });

  it("câu trượt hết lượt ⇒ FAILED và node con mở khóa kèm cảnh báo (soft-bypass)", () => {
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");

    const failAnswer =
      "Lần 3 vẫn trả lời sai về transaction isolation level không đúng chuẩn quy định.";
    const res = offlineEvaluateFeynman("node-1", "LEARN", 0, 3, failAnswer);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.is_passed).toBe(false);
      expect(res.data.question.outcome).toBe("FAILED");
      expect(res.data.node_state.status).toBe("FAILED");
      expect(res.data.unlocked_node_ids).toEqual(["node-2"]);

      const prog = offlineProgress();
      expect(prog.nodes["node-1"]?.status).toBe("FAILED");
      expect(prog.nodes["node-2"]?.status).toBe("AVAILABLE");
      expect(prog.nodes["node-2"]?.has_warning).toBe(true);
    }
  });

  it("đổi persona ⇒ tiến độ về ban đầu", () => {
    // 1. Complete node-1
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    const exactAnswer =
      "Hệ thống sử dụng database transaction và pessimistic locking để khóa hàng tồn kho trước khi trừ.";
    offlineEvaluateFeynman("node-1", "LEARN", 0, 1, exactAnswer);
    expect(offlineProgress().nodes["node-1"]?.status).toBe("COMPLETED");

    // 2. Switch persona to MID_LEVEL
    setOfflinePersona("MID_LEVEL");

    // Progress resets: node-1 returns to AVAILABLE, node-2 returns to LOCKED
    const prog = offlineProgress();
    expect(prog.nodes["node-1"]?.status).toBe("AVAILABLE");
    expect(prog.nodes["node-2"]?.status).toBe("LOCKED");
    expect(getOfflineProfile().skills.DB_OPTIMIZATION?.p_mastery).toBe(0.65);
  });

  it("offlineRevealQuestion returns reveal, computes skill change, and updates progress", () => {
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    const res = offlineRevealQuestion("node-1", "LEARN", 0);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.question.reveal?.reference_answer).toContain("SELECT FOR UPDATE");
      expect(res.data.question.outcome).toBe("FAILED");
      expect(res.data.question.ended_by).toBe("SKIP");
      expect(res.data.skill_change.p_after).not.toBe(0.9999);
      expect(res.data.node_state.status).toBe("FAILED");
      expect(res.data.unlocked_node_ids).toEqual(["node-2"]);
    }
  });

  it("api.ts safe wrappers integrate with offline mode correctly", async () => {
    // 1. getMeSafe returns runtime profile
    const meRes = await getMeSafe();
    expect(meRes.ok).toBe(true);
    if (meRes.ok) {
      expect(meRes.data.profile.user_id).toBe("offline-newbie");
    }

    // 2. switchPersonaSafe updates persona and returns updated profile
    const switchRes = await switchPersonaSafe("MID_LEVEL");
    expect(switchRes.ok).toBe(true);
    if (switchRes.ok) {
      expect(switchRes.data.profile.user_id).toBe("offline-mid_level");
      expect(switchRes.data.profile.skills.DB_OPTIMIZATION?.p_mastery).toBe(0.65);
    }

    // Switch back to NEWBIE for following tests
    await switchPersonaSafe("NEWBIE");

    // 3. getSessionProgressSafe returns offlineProgress
    const progRes = await getSessionProgressSafe("any-session");
    expect(progRes.ok).toBe(true);
    if (progRes.ok) {
      expect(progRes.data.progress.nodes["node-1"]?.status).toBe("AVAILABLE");
    }

    // 4. analyzeNodeSafe returns node_state from offlineProgress
    const analyzeRes = await analyzeNodeSafe({ session_id: "any-session", node_id: "node-1" });
    expect(analyzeRes.ok).toBe(true);
    if (analyzeRes.ok) {
      expect(analyzeRes.data.node_state.node_id).toBe("node-1");
      expect(analyzeRes.data.node_state.status).toBe("AVAILABLE");
    }

    // 5. getSessionsSafe constructs session without hardcoded demo strings
    const sessionsRes = await getSessionsSafe();
    expect(sessionsRes.ok).toBe(true);
    if (sessionsRes.ok) {
      expect(sessionsRes.data.sessions.length).toBe(1);
      expect(sessionsRes.data.sessions[0].session_id).toBe("offline-session-123");
      expect(sessionsRes.data.sessions[0].total_nodes).toBe(2);
      expect(sessionsRes.data.sessions[0].completed_count).toBe(0);
      expect(sessionsRes.data.sessions[0].failed_count).toBe(0);
    }

    // 6. evaluateFeynmanSafe routes run_id to correct node
    offlineEnrichNode("node-1", "LEARN", "NEWBIE");
    offlineEnrichNode("node-2", "LEARN", "NEWBIE");

    const evalNode2 = await evaluateFeynmanSafe({
      session_id: "offline-session-123",
      run_id: "run-offline-2",
      question_index: 0,
      attempt_number: 1,
      student_answer:
        "Sử dụng JWT token có chữ ký HMAC SHA-256 để xác thực danh tính người dùng qua Authorization header.",
    });
    expect(evalNode2.ok).toBe(true);
    if (evalNode2.ok) {
      expect(evalNode2.data.is_passed).toBe(true);
      expect(evalNode2.data.feedback).toContain("xác thực JWT");
    }

    // 7. evaluateFeynmanSafe with unknown run_id returns ERR_ANALYSIS_NOT_READY
    const evalUnknown = await evaluateFeynmanSafe({
      session_id: "offline-session-123",
      run_id: "run-unknown-xyz",
      question_index: 0,
      attempt_number: 1,
      student_answer: "Câu trả lời hợp lệ nhưng run_id không tồn tại.",
    });
    expect(evalUnknown.ok).toBe(false);
    if (!evalUnknown.ok) {
      expect(evalUnknown.error.error.code).toBe("ERR_ANALYSIS_NOT_READY");
      expect(evalUnknown.error.error.message).toBe("Không tìm thấy lượt học offline.");
    }

    // 8. revealSafe with unknown run_id returns ERR_ANALYSIS_NOT_READY
    const revealUnknown = await revealSafe({
      session_id: "offline-session-123",
      run_id: "run-unknown-xyz",
      question_index: 0,
    });
    expect(revealUnknown.ok).toBe(false);
    if (!revealUnknown.ok) {
      expect(revealUnknown.error.error.code).toBe("ERR_ANALYSIS_NOT_READY");
      expect(revealUnknown.error.error.message).toBe("Không tìm thấy lượt học offline.");
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
