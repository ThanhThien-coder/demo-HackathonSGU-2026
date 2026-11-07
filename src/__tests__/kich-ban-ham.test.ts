import { describe, it, expect } from "vitest";
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
  outcomeOf,
  updateSkill,
} from "@/lib/bkt-engine";
import {
  planNodeQuestions,
  nodeStatusFromRuns,
  type RunLike,
} from "@/lib/plan";
import { isInjection } from "@/server/ai/guard/injection";

const T0 = 1_774_000_000_000;
const MS_PER_DAY = CONFIG.MS_PER_DAY;
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

// Fixture N3 (slice-product-list) theo spec 50 Mục 1.2 & spec 22 Mục 11
const fixtureN3: NodeAnalysis = {
  node_id: "slice-product-list",
  skeleton_only: false,
  skills: [
    { skill: "DB_OPTIMIZATION", step: 2, symbol: "findById", reason: "Vòng for gọi findById cho từng sản phẩm" },
    { skill: "LAYERED_SEPARATION", step: 1, symbol: "productService", reason: "Route chỉ gọi productService" },
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
    summary: "Chia 3 tầng",
  },
  steps: [
    { step: 1, text: "controller" },
    { step: 2, text: "service" },
    { step: 3, text: "repo" },
  ],
};

// Fixture N2 (slice-profile) theo spec 50 Mục 1.2 & spec 22 Mục 11
const fixtureN2: NodeAnalysis = {
  node_id: "slice-profile",
  skeleton_only: false,
  skills: [
    { skill: "AUTH_SECURITY", step: 2, symbol: "authMiddleware", reason: "JWT xác thực" },
    { skill: "HTTP_ROUTING", step: 1, symbol: "getProfile", reason: "route profile" },
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
    summary: "Xác thực token qua middleware",
  },
  steps: [
    { step: 1, text: "route" },
    { step: 2, text: "middleware" },
    { step: 3, text: "service" },
  ],
};

// Fixture N5 (slice-order-checkout, Capstone) theo spec 50 Mục 1.2 & spec 22 Mục 11
const fixtureN5: NodeAnalysis = {
  node_id: "slice-order-checkout",
  skeleton_only: false,
  skills: [
    { skill: "TRANSACTION_INTEGRITY", step: 3, symbol: "checkout", reason: "quản lý giao dịch" },
    { skill: "DB_OPTIMIZATION", step: 3, symbol: "checkout", reason: "truy vấn kiểm tra stock" },
    { skill: "HTTP_ROUTING", step: 1, symbol: "postCheckout", reason: "routing" },
  ],
  weak_points: [
    {
      skill: "TRANSACTION_INTEGRITY",
      step: 3,
      symbol: "checkout",
      what: "thiếu transaction",
      consequence: "không bảo đảm toàn vẹn dữ liệu",
    },
    {
      skill: "DB_OPTIMIZATION",
      step: 3,
      symbol: "checkout",
      what: "truy vấn lặp trong vòng for",
      consequence: "chậm khi số lượng mặt hàng lớn",
    },
  ],
  strengths: [{ step: 2, text: "kiểm tra giỏ hàng qua middleware" }],
  architecture: {
    patterns: ["LAYERED", "MIDDLEWARE_CHAIN"],
    summary: "Luồng thanh toán đặt hàng",
  },
  steps: [
    { step: 1, text: "route" },
    { step: 2, text: "middleware" },
    { step: 3, text: "service checkout" },
  ],
};

describe("Kịch bản mức hàm (Spec 50 Mục 3 & Spec 22)", () => {
  describe("3.1. Kịch bản A — Lan (người mới), N3: câu 1 sai → gợi ý → đúng; câu 2 đúng ngay", () => {
    it("A3: Lập kế hoạch câu hỏi cho N3 (hồ sơ rỗng)", () => {
      const plan = planNodeQuestions(fixtureN3, {}, T0, 3);
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "LAYERED_SEPARATION", "NOVICE", "FLOW", [1, 2, 3]],
        [2, "DB_OPTIMIZATION", "NOVICE", "WEAKNESS", [2]],
      ]);
    });

    it("A4: Nộp Q1 lượt 1 (chưa đạt) — outcome chưa chốt, BKT chưa đổi", () => {
      const outcome = outcomeOf(false, 1);
      expect(outcome).toBe("FAILED");
      // BKT chỉ cập nhật khi xong câu; ở lượt 1 chưa xong nên điểm kỹ năng vẫn là mặc định BKT_P_L0 = 0.25
      expect(CONFIG.BKT_P_L0).toBe(0.25);
    });

    it("A5: Nộp Q1 lượt 2 — đạt PAH, DB_OPTIMIZATION 0.25 → 0.4202", () => {
      const outcome = outcomeOf(true, 2);
      expect(outcome).toBe("PASS_AFTER_HINT");

      const nextState = updateSkill("DB_OPTIMIZATION", undefined, "PASS_AFTER_HINT", T0);
      expectClose(nextState.p_mastery, 0.4202);
      expect(nextState.practice_count).toBe(1);
      expect(nextState.correct_count).toBe(1);
      expect(nextState.last_practiced_at).toBe(T0);
    });

    it("A6: Nộp Q2 lượt 1 (đúng) — PF, LAYERED_SEPARATION 0.25 → 0.5767; N3 COMPLETED", () => {
      const outcome = outcomeOf(true, 1);
      expect(outcome).toBe("PASS_FIRST");

      const nextState = updateSkill("LAYERED_SEPARATION", undefined, "PASS_FIRST", T0);
      expectClose(nextState.p_mastery, 0.5767);
      expect(nextState.practice_count).toBe(1);
      expect(nextState.correct_count).toBe(1);

      // Chốt trạng thái node từ run
      const run: RunLike = {
        mode: "LEARN",
        started_at: T0,
        finished_at: T0 + 1000,
        questions: [
          {
            question_index: 1,
            skill: "DB_OPTIMIZATION",
            focus: "WEAKNESS",
            outcome: "PASS_AFTER_HINT",
            ended_by: "ANSWER",
            disputed: false,
          },
          {
            question_index: 2,
            skill: "LAYERED_SEPARATION",
            focus: "FLOW",
            outcome: "PASS_FIRST",
            ended_by: "ANSWER",
            disputed: false,
          },
        ],
      };
      expect(nodeStatusFromRuns([run])).toBe("COMPLETED");
    });

    it("A7: Đọc lại trạng thái — kỹ năng không có nhãn 'đang mài mòn' (Δt = 0)", () => {
      const stateDb = makeSkillState("DB_OPTIMIZATION", 0.4202, T0, 1, 1);
      const stateLayered = makeSkillState("LAYERED_SEPARATION", 0.5767, T0, 1, 1);

      expectClose(getDecayedMastery(stateDb, T0), 0.4202);
      expectClose(getDecayedMastery(stateLayered, T0), 0.5767);

      expect(isDecaying(stateDb, T0)).toBe(false);
      expect(isDecaying(stateLayered, T0)).toBe(false);
    });
  });

  describe("3.2. Kịch bản B — Lan, N2: câu 1 trượt 3 lần, câu 2 đạt ⇒ ĐỎ", () => {
    // Trước đó N1 đạt PF ở HTTP_ROUTING => 0.5767
    const skillsBeforeB: LearnerCognitiveProfile["skills"] = {
      HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.5767, T0, 1, 1),
    };

    it("B1: enrich-node N2 LEARN — Q1 AUTH_SECURITY NOVICE WEAKNESS; Q2 HTTP_ROUTING PRACTITIONER ARCHITECTURE", () => {
      const plan = planNodeQuestions(fixtureN2, skillsBeforeB, T0, 3);
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "HTTP_ROUTING", "PRACTITIONER", "FLOW", [1, 2, 3]],
        [2, "AUTH_SECURITY", "NOVICE", "WEAKNESS", [2]],
      ]);
    });

    it("B4: Q1 lượt 3 không đạt — FAILED; AUTH_SECURITY 0.25 → 0.0791", () => {
      const outcome = outcomeOf(false, 3);
      expect(outcome).toBe("FAILED");

      const nextState = updateSkill("AUTH_SECURITY", undefined, "FAILED", T0);
      expectClose(nextState.p_mastery, 0.0791);
      expect(nextState.practice_count).toBe(1);
      expect(nextState.correct_count).toBe(0);
    });

    it("B5: Q2 lượt 1 đúng — PF; HTTP_ROUTING 0.5767 → 0.8413; run xong ⇒ N2 FAILED", () => {
      const stateHttp = skillsBeforeB.HTTP_ROUTING!;
      const outcome = outcomeOf(true, 1);
      expect(outcome).toBe("PASS_FIRST");

      const nextState = updateSkill("HTTP_ROUTING", stateHttp, "PASS_FIRST", T0);
      expectClose(nextState.p_mastery, 0.8413);
      expect(nextState.practice_count).toBe(2);
      expect(nextState.correct_count).toBe(2);

      // Chốt run LEARN: có ít nhất 1 câu FAILED chưa disputed => FAILED (đỏ)
      const run: RunLike = {
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
      };
      expect(nodeStatusFromRuns([run])).toBe("FAILED");
    });

    it("B-Regex: Kiểm tra câu trả lời kỹ thuật chứa cụm 'nếu bỏ qua bước này' không bị chặn", () => {
      const studentAnswer =
        "Request đi qua authMiddleware trước, ở đó jwt.verify dùng JWT_SECRET để kiểm token. Nếu bỏ qua bước này thì ai cũng vào được trang hồ sơ.";
      expect(isInjection(studentAnswer)).toBe(false);
    });
  });

  describe("3.3. Kịch bản C — Minh (đã có hồ sơ): node đã thạo vẫn hỏi 1 câu, Capstone", () => {
    // Hồ sơ Minh theo spec 50 Mục 3.3
    const skillsMinh: LearnerCognitiveProfile["skills"] = {
      HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.9532, T0, 1, 1),
      DTO_VALIDATION: makeSkillState("DTO_VALIDATION", 0.9532, T0, 1, 1),
      AUTH_SECURITY: makeSkillState("AUTH_SECURITY", 0.9532, T0, 1, 1),
      DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.8413, T0, 1, 1),
      TRANSACTION_INTEGRITY: makeSkillState("TRANSACTION_INTEGRITY", 0.5767, T0, 1, 1),
    };

    it("C4: N3 LEARN — Q1 DB_OPTIMIZATION PF: 0.8413 → 0.9532; Q2 LAYERED_SEPARATION PF: 0.25 → 0.5767 ⇒ COMPLETED", () => {
      // Kiểm tra plan cho N3 với hồ sơ Minh
      const plan = planNodeQuestions(fixtureN3, skillsMinh, T0, 3);
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "LAYERED_SEPARATION", "NOVICE", "FLOW", [1, 2, 3]],
        [2, "DB_OPTIMIZATION", "ARCHITECT", "WEAKNESS", [2]],
      ]);

      // Q1 PF: 0.8413 → 0.9532
      const nextDb = updateSkill("DB_OPTIMIZATION", skillsMinh.DB_OPTIMIZATION, "PASS_FIRST", T0);
      expectClose(nextDb.p_mastery, 0.9532);

      // Q2 PF: 0.25 → 0.5767
      const nextLayered = updateSkill("LAYERED_SEPARATION", undefined, "PASS_FIRST", T0);
      expectClose(nextLayered.p_mastery, 0.5767);

      // Run status
      const run: RunLike = {
        mode: "LEARN",
        started_at: T0,
        finished_at: T0 + 1000,
        questions: [
          {
            question_index: 1,
            skill: "DB_OPTIMIZATION",
            focus: "WEAKNESS",
            outcome: "PASS_FIRST",
            ended_by: "ANSWER",
            disputed: false,
          },
          {
            question_index: 2,
            skill: "LAYERED_SEPARATION",
            focus: "FLOW",
            outcome: "PASS_FIRST",
            ended_by: "ANSWER",
            disputed: false,
          },
        ],
      };
      expect(nodeStatusFromRuns([run])).toBe("COMPLETED");
    });

    it("C6: N5 Capstone LEARN — Bỏ DB và HTTP (đã thạo); Chỉ hỏi TRANSACTION_INTEGRITY PRACTITIONER WEAKNESS; PAH: 0.5767 → 0.7292 ⇒ COMPLETED", () => {
      // Hồ sơ trước C6: DB_OPTIMIZATION đã lên 0.9532 (ở C4), HTTP_ROUTING là 0.9532 (hoặc 0.9873), TRANSACTION_INTEGRITY là 0.5767
      const skillsBeforeC6: LearnerCognitiveProfile["skills"] = {
        ...skillsMinh,
        DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.9532, T0, 2, 2),
      };

      const plan = planNodeQuestions(fixtureN5, skillsBeforeC6, T0, 3);
      // Cả DB_OPTIMIZATION (0.9532) và HTTP_ROUTING (0.9532) đều >= CONFIG.MASTERED_MIN (0.92)
      // Chỉ còn TRANSACTION_INTEGRITY (0.5767) < 0.92
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "TRANSACTION_INTEGRITY", "PRACTITIONER", "FLOW", [1, 2, 3]],
        [2, "TRANSACTION_INTEGRITY", "PRACTITIONER", "WEAKNESS", [3]],
      ]);

      // PAH: 0.5767 → 0.7292
      const nextTx = updateSkill(
        "TRANSACTION_INTEGRITY",
        skillsBeforeC6.TRANSACTION_INTEGRITY,
        "PASS_AFTER_HINT",
        T0
      );
      expectClose(nextTx.p_mastery, 0.7292);

      const run: RunLike = {
        mode: "LEARN",
        started_at: T0,
        finished_at: T0 + 1000,
        questions: [
          {
            question_index: 1,
            skill: "TRANSACTION_INTEGRITY",
            focus: "WEAKNESS",
            outcome: "PASS_AFTER_HINT",
            ended_by: "ANSWER",
            disputed: false,
          },
        ],
      };
      expect(nodeStatusFromRuns([run])).toBe("COMPLETED");
    });

    it("C7: Biến thể mọi kỹ năng của N5 >= MASTERED_MIN — vẫn hỏi 1 câu kỹ năng yếu nhất, tier ARCHITECT (BKT-31)", () => {
      const skillsAllMastered: LearnerCognitiveProfile["skills"] = {
        TRANSACTION_INTEGRITY: makeSkillState("TRANSACTION_INTEGRITY", 0.95, T0, 1, 1),
        DB_OPTIMIZATION: makeSkillState("DB_OPTIMIZATION", 0.95, T0, 1, 1),
        HTTP_ROUTING: makeSkillState("HTTP_ROUTING", 0.95, T0, 1, 1),
      };

      const plan = planNodeQuestions(fixtureN5, skillsAllMastered, T0, 3);
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "TRANSACTION_INTEGRITY", "ARCHITECT", "FLOW", [1, 2, 3]],
        [2, "TRANSACTION_INTEGRITY", "ARCHITECT", "WEAKNESS", [3]],
      ]);
    });
  });

  describe("3.5. Kịch bản E — Huy quay lại sau 30 ngày (mài mòn, chỉ hiển thị)", () => {
    const lastPracticedDb = T0 - 30 * MS_PER_DAY;
    const lastPracticedLayered = T0 - 7 * MS_PER_DAY;

    const stateDb = makeSkillState("DB_OPTIMIZATION", 0.9532, lastPracticedDb, 3, 3);
    const stateLayered = makeSkillState("LAYERED_SEPARATION", 0.8413, lastPracticedLayered, 2, 2);

    it("E1: Đọc trạng thái — điểm decay khớp spec và cả 2 đều có nhãn 'đang mài mòn' (BKT-24)", () => {
      const decayedDb = getDecayedMastery(stateDb, T0);
      expectClose(decayedDb, 0.4092);

      const decayedLayered = getDecayedMastery(stateLayered, T0);
      expectClose(decayedLayered, 0.6681);

      // DB_OPTIMIZATION rớt từ ARCHITECT (0.9532) xuống NOVICE (0.4092)
      expect(tierOf(stateDb.p_mastery)).toBe("ARCHITECT");
      expect(tierOf(decayedDb)).toBe("NOVICE");
      expect(isDecaying(stateDb, T0)).toBe(true);

      // LAYERED_SEPARATION rớt từ ARCHITECT (0.8413) xuống PRACTITIONER (0.6681)
      expect(tierOf(stateLayered.p_mastery)).toBe("ARCHITECT");
      expect(tierOf(decayedLayered)).toBe("PRACTITIONER");
      expect(isDecaying(stateLayered, T0)).toBe(true);
    });

    it("E2: Lập kế hoạch N3 LEARN theo điểm đã decay — Q1 DB_OPTIMIZATION NOVICE WEAKNESS; Q2 LAYERED_SEPARATION PRACTITIONER ARCHITECTURE", () => {
      const skillsHuy: LearnerCognitiveProfile["skills"] = {
        DB_OPTIMIZATION: stateDb,
        LAYERED_SEPARATION: stateLayered,
      };

      const plan = planNodeQuestions(fixtureN3, skillsHuy, T0, 3);
      // BKT-50 (D-81): câu 1 là FLOW; spec/50 Mục 3 chưa cập nhật thứ tự này
      expect(plan.map((q) => [q.question_index, q.skill, q.tier, q.focus, q.step_indices])).toEqual([
        [1, "LAYERED_SEPARATION", "PRACTITIONER", "FLOW", [1, 2, 3]],
        [2, "DB_OPTIMIZATION", "NOVICE", "WEAKNESS", [2]],
      ]);
    });

    it("E3a: Q1 đúng ngay (PF) — 0.4092 → 0.7324; nhãn 'đang mài mòn' tắt", () => {
      const nextDb = updateSkill("DB_OPTIMIZATION", stateDb, "PASS_FIRST", T0);
      expectClose(nextDb.p_mastery, 0.7324);
      expect(nextDb.last_practiced_at).toBe(T0);
      expect(nextDb.practice_count).toBe(4);
      expect(nextDb.correct_count).toBe(4);

      // Nhãn đang mài mòn tắt vì Δt = 0
      expect(isDecaying(nextDb, T0)).toBe(false);
    });

    it("E3b: Q1 đúng sau gợi ý (PAH) — 0.4092 → 0.5854", () => {
      const nextDb = updateSkill("DB_OPTIMIZATION", stateDb, "PASS_AFTER_HINT", T0);
      expectClose(nextDb.p_mastery, 0.5854);
      expect(nextDb.practice_count).toBe(4);
      expect(nextDb.correct_count).toBe(4);
    });

    it("E3c: Q1 sai 3 lần (FAILED) — 0.4092 → 0.1268", () => {
      const nextDb = updateSkill("DB_OPTIMIZATION", stateDb, "FAILED", T0);
      expectClose(nextDb.p_mastery, 0.1268);
      expect(nextDb.practice_count).toBe(4);
      expect(nextDb.correct_count).toBe(3);
    });
  });

  describe("3.6. Persona SENIOR_RUSTY (Spec 50 Mục 3.6 & Spec 22 T-PER)", () => {
    it("SENIOR_RUSTY: P gốc 0.95 sau 30 ngày decay = 0.4085, tier NOVICE, isDecaying = true, và các cập nhật BKT", () => {
      const persona = PERSONAS.SENIOR_RUSTY;
      expect(persona.initial_p_mastery).toBe(0.95);
      expect(persona.days_idle).toBe(30);

      const lastPracticed = T0 - persona.days_idle * MS_PER_DAY;
      const stateRusty: CognitiveSkillState = {
        skill: "DB_OPTIMIZATION",
        p_mastery: persona.initial_p_mastery,
        last_practiced_at: lastPracticed,
        practice_count: 1,
        correct_count: 1,
      };

      // Điểm sau decay
      const decayed = getDecayedMastery(stateRusty, T0);
      expectClose(decayed, 0.4085);

      // Tier theo điểm decay
      expect(tierOf(decayed)).toBe("NOVICE");

      // Nhãn mài mòn
      expect(isDecaying(stateRusty, T0)).toBe(true);

      // Cập nhật BKT từ tiên nghiệm 0.4085 theo Spec 22 T-PER
      const resPF = updateSkill("DB_OPTIMIZATION", stateRusty, "PASS_FIRST", T0);
      expectClose(resPF.p_mastery, 0.7319);

      const resPAH = updateSkill("DB_OPTIMIZATION", stateRusty, "PASS_AFTER_HINT", T0);
      expectClose(resPAH.p_mastery, 0.5847);

      const resF = updateSkill("DB_OPTIMIZATION", stateRusty, "FAILED", T0);
      expectClose(resF.p_mastery, 0.1265);

      // overallTier
      const profile: LearnerCognitiveProfile["skills"] = {
        DB_OPTIMIZATION: stateRusty,
      };
      expect(overallTier(profile, T0)).toBe("NOVICE");

      // Kế hoạch câu hỏi với hồ sơ SENIOR_RUSTY: mọi câu hỏi đều mang tier NOVICE
      const plan = planNodeQuestions(fixtureN3, profile, T0, 3);
      expect(plan.every((item) => item.tier === "NOVICE")).toBe(true);
    });
  });
});
