/**
 * src/server/mock-dev-store.ts
 *
 * Bộ Giả Lập In-Memory Cục Bộ (Local Mock Store) cho SimpliFey.
 * Cho phép nhà phát triển trải nghiệm và kiểm thử 100% tính năng của toàn bộ web app
 * (Home, Learn/Cockpit, Roadmap, Report, Settings, Persona, BKT, Feynman)
 * trực tiếp trên máy mà KHÔNG CẦN Supabase Cloud, Postgres server hay Gemini API Key.
 *
 * CÁCH SỬ DỤNG:
 * - Bật: Thêm `LOCAL_DEV_MOCK="true"` và `NEXT_PUBLIC_BYPASS_AUTH="true"` vào `.env.local`.
 * - Tắt/Xóa: Xóa 2 biến trên khỏi `.env.local` hoặc xóa file này để project trở lại nguyên trạng sạch sẽ 100%.
 */

import {
  CONFIG,
  PERSONAS,
  SWE_SKILLS,
  type AnalyzeNodeResponse,
  type AnalyzeOverviewResponse,
  type AttemptHistoryItem,
  type CognitiveSkillState,
  type EnrichNodeResponse,
  type EvaluateFeynmanRequest,
  type EvaluateFeynmanResponse,
  type HistoryResponse,
  type IngestResponse,
  type LearnerCognitiveProfile,
  type LearningSessionSummary,
  type MeResponse,
  type NodeAnalysisView,
  type NodeStateView,
  type PersonaMode,
  type ProgressResponse,
  type QuestionState,
  type QuestionView,
  type RepoOverviewView,
  type RevealResponse,
  type RunMode,
  type RunQuestion,
  type SessionsResponse,
  type SkillChange,
  type StaticEngineResult,
  type SWESkill,
} from "@/contracts";
import { overallTier } from "@/lib/bkt-engine";
import shopApiFixture from "./engine/__fixtures__/shop-api.json";
import analysisFixture from "./ai/__fixtures__/analysis-n3.json";
import overviewFixture from "./ai/__fixtures__/overview.json";
import questionsFixture from "./ai/__fixtures__/questions-n3.json";

export function isLocalMockEnabled(): boolean {
  return (
    process.env.LOCAL_DEV_MOCK === "true" ||
    process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"
  );
}

export const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@simplifey.dev",
  display_name: "Demo Learner (Local Mock)",
};

const DEMO_SESSION_ID = "00000000-0000-0000-0000-000000000002";
const DEMO_RUN_ID = "00000000-0000-0000-0000-000000000003";

// Trạng thái trong RAM
class MockDevStore {
  private currentPersona: PersonaMode = "NEWBIE";
  private skillStates: Record<SWESkill, CognitiveSkillState>;
  private nodeStatuses: Record<string, "AVAILABLE" | "COMPLETED" | "FAILED" | "LOCKED">;
  private attemptHistory: AttemptHistoryItem[] = [];
  private openRunQuestions: RunQuestion[] = [];

  constructor() {
    this.skillStates = this.initSkills("NEWBIE");
    this.nodeStatuses = {
      "slice-register": "COMPLETED",
      "slice-profile": "AVAILABLE",
      "slice-product-list": "AVAILABLE",
      "slice-cart": "LOCKED",
      "slice-order-checkout": "LOCKED",
      "slice-revenue-report": "LOCKED",
      "slice-send-email": "LOCKED",
    };
    this.initHistory();
  }

  private initSkills(mode: PersonaMode): Record<SWESkill, CognitiveSkillState> {
    const config = PERSONAS[mode] ?? PERSONAS.NEWBIE;
    const now = Date.now();
    const lastPracticed = now - config.days_idle * CONFIG.MS_PER_DAY;
    const res = {} as Record<SWESkill, CognitiveSkillState>;
    for (const skill of SWE_SKILLS) {
      res[skill] = {
        skill,
        p_mastery: config.initial_p_mastery,
        last_practiced_at: lastPracticed,
        practice_count: 3,
        correct_count: 2,
      };
    }
    return res;
  }

  private initHistory() {
    this.attemptHistory = [
      {
        node_id: "slice-register",
        node_title: "User Registration",
        mode: "LEARN",
        question_index: 1,
        skill: "DTO_VALIDATION",
        attempt_number: 1,
        core_accuracy: 90,
        is_passed: true,
        intent: "ANSWER",
        student_answer: "Validation decorator kiểm tra dữ liệu trước khi vào controller.",
        created_at: Date.now() - 3600 * 1000,
      },
      {
        node_id: "slice-register",
        node_title: "User Registration",
        mode: "LEARN",
        question_index: 2,
        skill: "AUTH_SECURITY",
        attempt_number: 1,
        core_accuracy: 85,
        is_passed: true,
        intent: "ANSWER",
        student_answer: "Mật khẩu được băm bằng bcrypt salt rounds = 10.",
        created_at: Date.now() - 3000 * 1000,
      },
    ];
  }

  public getMe(): MeResponse {
    const now = Date.now();
    const profile: LearnerCognitiveProfile = {
      user_id: DEMO_USER.id,
      display_name: DEMO_USER.display_name,
      skills: this.skillStates,
      overall_tier: overallTier(this.skillStates, now),
    };
    return { profile, server_now: now };
  }

  public setPersona(mode: PersonaMode): MeResponse {
    this.currentPersona = mode;
    this.skillStates = this.initSkills(mode);
    return this.getMe();
  }

  public getSessions(): SessionsResponse {
    const session: LearningSessionSummary = {
      session_id: DEMO_SESSION_ID,
      snapshot: {
        source: "GITHUB",
        repo_key: "simplifey/shop-api",
        snapshot_id: "a1b2c3d4e5f6071829304a5b6c7d8e9f01234567",
        snapshot_id_kind: "COMMIT_SHA",
        subdir: "",
        ref_label: "main",
      },
      repo_name: "shop-api (Kiến trúc Đặt hàng & Bán lẻ)",
      engine_version: CONFIG.ENGINE_VERSION,
      created_at: Date.now() - 86400 * 1000,
      last_active_at: Date.now() - 600 * 1000,
      completed_count: 1,
      failed_count: 0,
      total_nodes: shopApiFixture.nodes.length,
      can_resume: true,
      resume_blocker: null,
    };
    return { sessions: [session] };
  }

  public ingest(): IngestResponse {
    const progress = this.getProgress(DEMO_SESSION_ID).progress;
    return {
      session_id: DEMO_SESSION_ID,
      result: shopApiFixture as unknown as StaticEngineResult,
      progress,
      analyses: {},
      resumed: true,
      from_cache: true,
    };
  }

  public getProgress(sessionId: string): ProgressResponse {
    const nodes: Record<string, NodeStateView> = {};
    for (const n of shopApiFixture.nodes) {
      const status = this.nodeStatuses[n.id] ?? "LOCKED";
      nodes[n.id] = {
        node_id: n.id,
        status: status as any,
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      };
    }
    return {
      progress: {
        session_id: sessionId,
        nodes,
        tokens_used: 1250,
      },
    };
  }

  public getHistory(sessionId: string): HistoryResponse {
    return { items: this.attemptHistory };
  }

  public analyzeNode(sessionId: string, nodeId: string): AnalyzeNodeResponse {
    const progress = this.getProgress(sessionId).progress;
    const nodeState = progress.nodes[nodeId] ?? {
      node_id: nodeId,
      status: "AVAILABLE",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    };

    const nodeAnalysis: NodeAnalysisView = {
      node_id: nodeId,
      skills: (analysisFixture.skills as any) ?? [],
      architecture: {
        patterns: ["LAYERED"],
        summary: "Luồng xử lý kiến trúc đi qua Controller -> Service -> Repository.",
      },
      steps: [
        {
          step: 1,
          layer: "ENTRY_POINT",
          file_path: "src/orders/orders.controller.ts",
          line_start: 12,
          line_end: 28,
          text: "Nhận yêu cầu HTTP POST và kiểm tra DTO đầu vào",
        },
        {
          step: 2,
          layer: "BUSINESS_LOGIC",
          file_path: "src/orders/orders.service.ts",
          line_start: 45,
          line_end: 90,
          text: "Thực thi nghiệp vụ kiểm tra tồn kho và tính tổng đơn hàng",
        },
      ],
      strengths: [],
      weak_points: [],
      shared_files: [],
      skeleton_only: false,
    };

    return {
      node_id: nodeId,
      analysis: nodeAnalysis,
      node_state: nodeState,
      unlocked_node_ids: [],
      tokens_used: 450,
    };
  }

  public analyzeOverview(sessionId: string): AnalyzeOverviewResponse {
    const overview: RepoOverviewView = {
      facts: {
        archetype: "WEB_BACKEND",
        framework: "NestJS / Express",
        tech_stack: ["typescript", "nestjs", "postgres", "typeorm"],
        root_node_ids: ["slice-register", "slice-product-list"],
        main_path_node_ids: [
          "slice-register",
          "slice-profile",
          "slice-cart",
          "slice-order-checkout",
        ],
      },
      ai: overviewFixture as any,
    };
    return { overview, tokens_used: 680 };
  }

  public enrichNode(sessionId: string, nodeId: string, mode: RunMode): EnrichNodeResponse {
    const progress = this.getProgress(sessionId).progress;
    const nodeState = progress.nodes[nodeId];

    const questions: QuestionView[] = (questionsFixture as any[]).map((q, idx) => ({
      question_index: idx + 1,
      skill: q.skill ?? "HTTP_ROUTING",
      tier: "NOVICE",
      focus: "FLOW",
      feynman_question: q.feynman_question ?? "Hãy giải thích cách thức luồng xử lý nhận request và xác thực dữ liệu.",
      state: {
        question_index: idx + 1,
        feynman_question: q.feynman_question ?? "Hãy giải thích cách thức luồng xử lý nhận request.",
        skill: q.skill ?? "HTTP_ROUTING",
        tier: "NOVICE",
        focus: "FLOW",
        attempts_used: 0,
        finished: false,
        outcome: null,
        ended_by: null,
        disputed: false,
        reveal: null,
      },
    }));

    return {
      node_id: nodeId,
      run_id: DEMO_RUN_ID,
      mode: mode || "LEARN",
      questions,
      node_state: nodeState,
      tokens_used: 820,
    };
  }

  public evaluateFeynman(req: EvaluateFeynmanRequest): EvaluateFeynmanResponse {
    const skill: SWESkill = "HTTP_ROUTING";
    const prev = this.skillStates[skill]?.p_mastery ?? 0.65;
    const nextP = Math.min(0.99, prev + 0.08);

    this.skillStates[skill] = {
      ...this.skillStates[skill],
      p_mastery: nextP,
      last_practiced_at: Date.now(),
      practice_count: (this.skillStates[skill]?.practice_count ?? 0) + 1,
      correct_count: (this.skillStates[skill]?.correct_count ?? 0) + 1,
    };

    // Mở khóa node tiếp theo
    this.nodeStatuses["slice-profile"] = "COMPLETED";
    this.nodeStatuses["slice-cart"] = "AVAILABLE";

    const skillChange: SkillChange = {
      skill,
      p_before: prev,
      p_after: nextP,
      outcome: "PASS_FIRST",
    };

    this.attemptHistory.unshift({
      node_id: "slice-profile",
      node_title: "User Profile",
      mode: "LEARN",
      question_index: req.question_index,
      skill,
      attempt_number: req.attempt_number,
      core_accuracy: 92,
      is_passed: true,
      intent: "ANSWER",
      student_answer: req.student_answer,
      created_at: Date.now(),
    });

    const questionState: QuestionState = {
      question_index: req.question_index,
      feynman_question: "Hãy giải thích luồng xử lý khi người dùng cập nhật hồ sơ cá nhân.",
      skill,
      tier: "NOVICE",
      focus: "FLOW",
      attempts_used: req.attempt_number,
      finished: true,
      outcome: "PASS_FIRST",
      ended_by: "ANSWER",
      disputed: false,
      reveal: {
        reference_answer: "Controller nhận request, JwtAuthGuard xác thực token và Service cập nhật database.",
        must_have_points: ["JWT Token validation", "Service business logic", "Repository update"],
        fix: "Giải thích rất rõ ràng, đáp ứng đầy đủ các ý cốt lõi.",
      },
    };

    const nodeState: NodeStateView = {
      node_id: "slice-profile",
      status: "COMPLETED",
      has_warning: false,
      analysis_failed: false,
      last_run: null,
    };

    return {
      question_index: req.question_index,
      attempt_number: req.attempt_number,
      core_accuracy: 92,
      simplicity: 88,
      intent: "ANSWER",
      is_passed: true,
      points_covered: [true, true, true],
      feedback: "Bạn đã nắm rất vững luồng kiến trúc! Các khái niệm kỹ thuật được giải thích tự nhiên, chính xác.",
      detected_jargons: [],
      follow_up: null,
      question: questionState,
      skill_change: skillChange,
      node_state: nodeState,
      unlocked_node_ids: ["slice-cart"],
      tokens_used: 1100,
    };
  }

  public reveal(nodeId: string, questionIndex: number): RevealResponse {
    const questionState: QuestionState = {
      question_index: questionIndex,
      feynman_question: "Hãy giải thích cơ chế bảo mật và giao dịch trong đơn hàng.",
      skill: "TRANSACTION_INTEGRITY",
      tier: "PRACTITIONER",
      focus: "ARCHITECTURE",
      attempts_used: 1,
      finished: true,
      outcome: "FAILED",
      ended_by: "SKIP",
      disputed: false,
      reveal: {
        reference_answer: "Sử dụng database transaction qua queryRunner.startTransaction() để đảm bảo tính nguyên tử.",
        must_have_points: ["Bắt đầu transaction", "Commit khi thành công", "Rollback khi gặp lỗi"],
        fix: "Hãy chú ý đến việc giải phóng kết nối database trong khối finally.",
      },
    };

    return {
      question: questionState,
      skill_change: {
        skill: "TRANSACTION_INTEGRITY",
        p_before: 0.65,
        p_after: 0.58,
        outcome: "FAILED",
      },
      node_state: {
        node_id: nodeId || "slice-order-checkout",
        status: "AVAILABLE",
        has_warning: false,
        analysis_failed: false,
        last_run: null,
      },
      unlocked_node_ids: [],
    };
  }
}

export const mockDevStore = new MockDevStore();
