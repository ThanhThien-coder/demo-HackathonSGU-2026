import { describe, it, expect, vi } from "vitest";
import { CONFIG } from "@/contracts/config";
import { PERSONAS } from "@/contracts/learner";
import type {
  NodeAnalysis,
  CognitiveSkillState,
  LearnerCognitiveProfile,
  SWESkill,
} from "@/contracts";
import {
  getDecayedMastery,
  tierOf,
  isDecaying,
  overallTier,
  updateSkill,
} from "../bkt-engine";
import {
  planNodeQuestions,
  nodeStatusFromRuns,
  type RunLike,
} from "../plan";

const T0 = 1_774_000_000_000;
const TOLERANCE = 5e-5;

function expectClose(actual: number, expected: number, tol = TOLERANCE) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

function makeSkillState(
  skill: SWESkill,
  p: number,
  lastPracticedAt: number = T0,
  practiceCount: number = 1,
  correctCount: number = 1
): CognitiveSkillState {
  return {
    skill,
    p_mastery: p,
    last_practiced_at: lastPracticedAt,
    practice_count: practiceCount,
    correct_count: correctCount,
  };
}

// Fixtures theo spec 22 Mục 11 (T-PLAN)
const fixtureN3: NodeAnalysis = {
  node_id: "slice-product-list",
  skeleton_only: false,
  skills: [
    { skill: "DB_OPTIMIZATION", step: 2, symbol: "findById", reason: "query" },
    { skill: "LAYERED_SEPARATION", step: 1, symbol: "listProducts", reason: "separation" },
  ],
  weak_points: [
    {
      skill: "DB_OPTIMIZATION",
      step: 2,
      symbol: "findById",
      what: "truy vấn trong vòng lặp",
      consequence: "N+1 query",
    },
  ],
  strengths: [{ step: 1, text: "tách biệt controller và service" }],
  architecture: {
    patterns: ["LAYERED", "REPOSITORY"],
    summary: "Kiến trúc phân tầng",
  },
  steps: [
    { step: 1, text: "controller" },
    { step: 2, text: "service" },
    { step: 3, text: "repo" },
  ],
};

const fixtureN2: NodeAnalysis = {
  node_id: "slice-profile",
  skeleton_only: false,
  skills: [
    { skill: "AUTH_SECURITY", step: 2, symbol: "authMiddleware", reason: "jwt" },
    { skill: "HTTP_ROUTING", step: 1, symbol: "getProfile", reason: "routing" },
  ],
  weak_points: [
    {
      skill: "AUTH_SECURITY",
      step: 2,
      symbol: "authMiddleware",
      what: "JWT_SECRET hardcoded",
      consequence: "lộ secret",
    },
  ],
  strengths: [{ step: 2, text: "xác thực qua middleware" }],
  architecture: {
    patterns: ["MIDDLEWARE_CHAIN", "LAYERED"],
    summary: "Xác thực token middleware",
  },
  steps: [
    { step: 1, text: "route" },
    { step: 2, text: "middleware" },
    { step: 3, text: "service" },
  ],
};

const fixtureN5: NodeAnalysis = {
  node_id: "slice-order-checkout",
  skeleton_only: false,
  skills: [
    { skill: "TRANSACTION_INTEGRITY", step: 3, symbol: "checkout", reason: "tx" },
    { skill: "DB_OPTIMIZATION", step: 3, symbol: "checkout", reason: "query" },
    { skill: "HTTP_ROUTING", step: 1, symbol: "postCheckout", reason: "routing" },
  ],
  weak_points: [
    {
      skill: "TRANSACTION_INTEGRITY",
      step: 3,
      symbol: "checkout",
      what: "thiếu transaction",
      consequence: "inconsistency",
    },
    {
      skill: "DB_OPTIMIZATION",
      step: 3,
      symbol: "checkout",
      what: "truy vấn lặp",
      consequence: "slow",
    },
  ],
  strengths: [{ step: 2, text: "kiểm tra giỏ hàng" }],
  architecture: {
    patterns: ["LAYERED", "MIDDLEWARE_CHAIN"],
    summary: "Luồng thanh toán đặt hàng",
  },
  steps: [
    { step: 1, text: "route" },
    { step: 2, text: "service validate" },
    { step: 3, text: "tx commit" },
  ],
};

const fixtureX: NodeAnalysis = {
  node_id: "algo-helper",
  skeleton_only: false,
  skills: [
    { skill: "HTTP_ROUTING", step: 1, symbol: "route", reason: "routing" },
    { skill: "DTO_VALIDATION", step: 1, symbol: "validate", reason: "dto" },
    { skill: "ERROR_HANDLING", step: 2, symbol: "errorHandler", reason: "error" },
  ],
  weak_points: [],
  strengths: [{ step: 1, text: "xử lý dữ liệu chuẩn" }],
  architecture: {
    patterns: ["LAYERED"],
    summary: "Kiến trúc tầng xử lý",
  },
  steps: [
    { step: 1, text: "route & validate" },
    { step: 2, text: "handle error" },
  ],
};

const fixtureXPrime: NodeAnalysis = {
  ...fixtureX,
  strengths: [],
  architecture: {
    patterns: ["OTHER"],
    summary: "Không có pattern kiến trúc cụ thể",
  },
};

describe("plan.ts — Kế hoạch câu hỏi & trạng thái node", () => {
  describe("T-PLAN — planNodeQuestions", () => {
    it("P-A: Trace A (N3, hồ sơ rỗng)", () => {
      const plan = planNodeQuestions(fixtureN3, {}, T0, 3);
      expect(plan).toHaveLength(2);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "DB_OPTIMIZATION",
        tier: "NOVICE",
        focus: "WEAKNESS",
        step_indices: [2],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "LAYERED_SEPARATION",
        tier: "NOVICE",
        focus: "FLOW",
        step_indices: [1, 2, 3],
      });
    });

    it("P-B: Trace B (N2, HTTP_ROUTING 0.5767)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.5767, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureN2, skills, T0, 3);
      expect(plan).toHaveLength(2);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "AUTH_SECURITY",
        tier: "NOVICE",
        focus: "WEAKNESS",
        step_indices: [2],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "HTTP_ROUTING",
        tier: "PRACTITIONER",
        focus: "ARCHITECTURE",
        step_indices: [1, 2],
      });
    });

    it("P-C: Capstone, 2 kỹ năng (N5, HTTP/DTO/AUTH 0.9532, DB 0.8413, TRANSACTION 0.5767)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.9532, T0, 1, 1),
        DTO_VALIDATION: makeSkillState("DTO_VALIDATION", 0.9532, T0, 1, 1),
        AUTH_SECURITY: makeSkillState("AUTH_SECURITY", 0.9532, T0, 1, 1),
        DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.8413, T0, 1, 1),
        TRANSACTION_INTEGRITY: makeSkillState("TRANSACTION_INTEGRITY", 0.5767, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureN5, skills, T0, 3);
      expect(plan).toHaveLength(2);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "TRANSACTION_INTEGRITY",
        tier: "PRACTITIONER",
        focus: "WEAKNESS",
        step_indices: [3],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "DB_OPTIMIZATION",
        tier: "ARCHITECT",
        focus: "WEAKNESS",
        step_indices: [3],
      });
    });

    it("P-D: Capstone đã thạo (N5, mọi kỹ năng 0.95, practice_count 1)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        TRANSACTION_INTEGRITY: makeSkillState("TRANSACTION_INTEGRITY", 0.95, T0, 1, 1),
        DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.95, T0, 1, 1),
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.95, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureN5, skills, T0, 3);
      expect(plan).toHaveLength(1);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "TRANSACTION_INTEGRITY",
        tier: "ARCHITECT",
        focus: "WEAKNESS",
        step_indices: [3],
      });
    });

    it("P-D2: Kế hoạch rỗng ⇒ 1 câu (N3, DB 0.96, LAYERED 0.93, practice_count 1)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.96, T0, 1, 1),
        LAYERED_SEPARATION: makeSkillState("LAYERED_SEPARATION", 0.93, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureN3, skills, T0, 3);
      expect(plan).toHaveLength(1);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "LAYERED_SEPARATION",
        tier: "ARCHITECT",
        focus: "CHANGE",
        step_indices: [1, 2, 3],
      });
    });

    it("P-G1: Xoay góc (X, cả 3 kỹ năng 0.65)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.65, T0, 1, 1),
        DTO_VALIDATION: makeSkillState("DTO_VALIDATION", 0.65, T0, 1, 1),
        ERROR_HANDLING: makeSkillState("ERROR_HANDLING", 0.65, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureX, skills, T0, 2);
      expect(plan).toHaveLength(3);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "HTTP_ROUTING",
        tier: "PRACTITIONER",
        focus: "ARCHITECTURE",
        step_indices: [1],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "DTO_VALIDATION",
        tier: "PRACTITIONER",
        focus: "CHANGE",
        step_indices: [1, 2],
      });
      expect(plan[2]).toEqual({
        question_index: 3,
        skill: "ERROR_HANDLING",
        tier: "PRACTITIONER",
        focus: "FLOW",
        step_indices: [1, 2],
      });
    });

    it("P-G2: Thiếu ARCHITECTURE (X', cả 3 kỹ năng 0.65)", () => {
      const skills: LearnerCognitiveProfile["skills"] = {
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.65, T0, 1, 1),
        DTO_VALIDATION: makeSkillState("DTO_VALIDATION", 0.65, T0, 1, 1),
        ERROR_HANDLING: makeSkillState("ERROR_HANDLING", 0.65, T0, 1, 1),
      };
      const plan = planNodeQuestions(fixtureXPrime, skills, T0, 2);
      expect(plan).toHaveLength(3);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "HTTP_ROUTING",
        tier: "PRACTITIONER",
        focus: "CHANGE",
        step_indices: [1, 2],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "DTO_VALIDATION",
        tier: "PRACTITIONER",
        focus: "FLOW",
        step_indices: [1, 2],
      });
      expect(plan[2]).toEqual({
        question_index: 3,
        skill: "ERROR_HANDLING",
        tier: "PRACTITIONER",
        focus: "CHANGE",
        step_indices: [1, 2],
      });
    });

    it("P-H: NOVICE_SECOND_QUESTION = true (N3, hồ sơ rỗng)", async () => {
      vi.resetModules();
      vi.doMock("@/contracts/config", async (importOriginal) => {
        const actual = await importOriginal<typeof import("@/contracts/config")>();
        return {
          ...actual,
          CONFIG: {
            ...actual.CONFIG,
            NOVICE_SECOND_QUESTION: true,
          },
        };
      });

      const { planNodeQuestions: planDynamic } = await import("../plan");
      const plan = planDynamic(fixtureN3, {}, T0, 3);
      expect(plan).toHaveLength(4);
      expect(plan[0]).toEqual({
        question_index: 1,
        skill: "DB_OPTIMIZATION",
        tier: "NOVICE",
        focus: "WEAKNESS",
        step_indices: [2],
      });
      expect(plan[1]).toEqual({
        question_index: 2,
        skill: "LAYERED_SEPARATION",
        tier: "NOVICE",
        focus: "FLOW",
        step_indices: [1, 2, 3],
      });
      expect(plan[2]).toEqual({
        question_index: 3,
        skill: "DB_OPTIMIZATION",
        tier: "NOVICE",
        focus: "ARCHITECTURE",
        step_indices: [1, 2],
      });
      expect(plan[3]).toEqual({
        question_index: 4,
        skill: "LAYERED_SEPARATION",
        tier: "NOVICE",
        focus: "CHANGE",
        step_indices: [1, 2, 3],
      });

      vi.doUnmock("@/contracts/config");
      vi.resetModules();
    });
  });

  describe("T-RUN — nodeStatusFromRuns", () => {
    it("#1: LEARN có câu FAILED chưa disputed ⇒ FAILED", () => {
      const runs: RunLike[] = [
        {
          mode: "LEARN",
          started_at: T0,
          finished_at: T0 + 1000,
          questions: [
            {
              question_index: 1,
              skill: "AUTH_SECURITY",
              focus: "WEAKNESS",
              outcome: "FAILED",
              ended_by: "ANSWER",
              disputed: false,
            },
            {
              question_index: 2,
              skill: "HTTP_ROUTING",
              focus: "ARCHITECTURE",
              outcome: "PASS_FIRST",
              ended_by: "ANSWER",
              disputed: false,
            },
          ],
        },
      ];
      expect(nodeStatusFromRuns(runs)).toBe("FAILED");
    });

    it("#2: #1 với câu AUTH disputed = true ⇒ COMPLETED", () => {
      const runs: RunLike[] = [
        {
          mode: "LEARN",
          started_at: T0,
          finished_at: T0 + 1000,
          questions: [
            {
              question_index: 1,
              skill: "AUTH_SECURITY",
              focus: "WEAKNESS",
              outcome: "FAILED",
              ended_by: "ANSWER",
              disputed: true,
            },
            {
              question_index: 2,
              skill: "HTTP_ROUTING",
              focus: "ARCHITECTURE",
              outcome: "PASS_FIRST",
              ended_by: "ANSWER",
              disputed: false,
            },
          ],
        },
      ];
      expect(nodeStatusFromRuns(runs)).toBe("COMPLETED");
    });

    it("#3: LEARN có câu DROPPED, các câu còn lại đạt ⇒ COMPLETED", () => {
      const runs: RunLike[] = [
        {
          mode: "LEARN",
          started_at: T0,
          finished_at: T0 + 1000,
          questions: [
            {
              question_index: 1,
              skill: "AUTH_SECURITY",
              focus: "WEAKNESS",
              outcome: null,
              ended_by: "DROPPED",
              disputed: false,
            },
            {
              question_index: 2,
              skill: "HTTP_ROUTING",
              focus: "ARCHITECTURE",
              outcome: "PASS_FIRST",
              ended_by: "ANSWER",
              disputed: false,
            },
          ],
        },
      ];
      expect(nodeStatusFromRuns(runs)).toBe("COMPLETED");
    });

    it("#4: Chưa có run LEARN hoàn thành ⇒ null", () => {
      expect(nodeStatusFromRuns([])).toBeNull();
      const unfinishedRuns: RunLike[] = [
        {
          mode: "LEARN",
          started_at: T0,
          finished_at: null,
          questions: [],
        },
      ];
      expect(nodeStatusFromRuns(unfinishedRuns)).toBeNull();
    });
  });

  describe("T-PER — Persona demo", () => {
    const personaCases: Array<{
      mode: keyof typeof PERSONAS;
      expectedDecayed: number;
      expectedTier: "NOVICE" | "PRACTITIONER" | "ARCHITECT";
      expectedIsDecaying: boolean;
      expectedPassFirst: number;
      expectedPassHint: number;
      expectedFailed: number;
      expectedOverallTier: "NOVICE" | "PRACTITIONER" | "ARCHITECT";
    }> = [
      {
        mode: "NEWBIE",
        expectedDecayed: 0.25,
        expectedTier: "NOVICE",
        expectedIsDecaying: false,
        expectedPassFirst: 0.5767,
        expectedPassHint: 0.4202,
        expectedFailed: 0.0791,
        expectedOverallTier: "NOVICE",
      },
      {
        mode: "MID_LEVEL",
        expectedDecayed: 0.65,
        expectedTier: "PRACTITIONER",
        expectedIsDecaying: false,
        expectedPassFirst: 0.8779,
        expectedPassHint: 0.7845,
        expectedFailed: 0.2522,
        expectedOverallTier: "PRACTITIONER",
      },
      {
        mode: "SENIOR_RUSTY",
        expectedDecayed: 0.4085,
        expectedTier: "NOVICE",
        expectedIsDecaying: true,
        expectedPassFirst: 0.7319,
        expectedPassHint: 0.5847,
        expectedFailed: 0.1265,
        expectedOverallTier: "NOVICE",
      },
    ];

    for (const tc of personaCases) {
      it(`Persona ${tc.mode}: kiểm tra theo bảng T-PER`, () => {
        const persona = PERSONAS[tc.mode];
        const now = T0;
        const lastPracticedAt = now - persona.days_idle * CONFIG.MS_PER_DAY;
        const state: CognitiveSkillState = {
          skill: "DB_OPTIMIZATION",
          p_mastery: persona.initial_p_mastery,
          last_practiced_at: lastPracticedAt,
          practice_count: 1,
          correct_count: 1,
        };

        const decayed = getDecayedMastery(state, now);
        expectClose(decayed, tc.expectedDecayed);

        const tier = tierOf(decayed);
        expect(tier).toBe(tc.expectedTier);

        const decaying = isDecaying(state, now);
        expect(decaying).toBe(tc.expectedIsDecaying);

        const resPassFirst = updateSkill("DB_OPTIMIZATION", state, "PASS_FIRST", now);
        expectClose(resPassFirst.p_mastery, tc.expectedPassFirst);

        const resPassHint = updateSkill("DB_OPTIMIZATION", state, "PASS_AFTER_HINT", now);
        expectClose(resPassHint.p_mastery, tc.expectedPassHint);

        const resFailed = updateSkill("DB_OPTIMIZATION", state, "FAILED", now);
        expectClose(resFailed.p_mastery, tc.expectedFailed);

        const profileSkills: LearnerCognitiveProfile["skills"] = {
          DB_OPTIMIZATION: state,
        };
        const calculatedOverallTier = overallTier(profileSkills, now);
        expect(calculatedOverallTier).toBe(tc.expectedOverallTier);
      });
    }
  });
});
