import { describe, it, expect } from "vitest";
import { CONFIG } from "@/contracts/config";
import type { CognitiveSkillState, SkillChange } from "@/contracts";
import {
  getDecayedMastery,
  tierOf,
  overallTier,
  isDecaying,
  outcomeOf,
  updateSkill,
  computeSkillChange,
  revertSkillChange,
} from "../bkt-engine";

const T0 = 1_774_000_000_000;
const MS_PER_DAY = CONFIG.MS_PER_DAY;
const TOLERANCE = 5e-5;

function expectClose(actual: number, expected: number, tol = TOLERANCE) {
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

function makeState(
  p: number,
  lastPracticedAt: number = T0,
  practiceCount: number = 1,
  correctCount: number = 1
): CognitiveSkillState {
  return {
    skill: "DB_OPTIMIZATION",
    p_mastery: p,
    last_practiced_at: lastPracticedAt,
    practice_count: practiceCount,
    correct_count: correctCount,
  };
}

describe("bkt-engine", () => {
  describe("T-BKT — cập nhật 1 bước", () => {
    const testCases: Array<{
      p: number;
      passFirst: number;
      passHint: number;
      failed: number;
    }> = [
      { p: 0.25, passFirst: 0.5767, passHint: 0.4202, failed: 0.0791 },
      { p: 0.5767, passFirst: 0.8413, passHint: 0.7292, failed: 0.2036 },
      { p: 0.8413, passFirst: 0.9532, passHint: 0.9109, failed: 0.4752 },
      { p: 0.9, passFirst: 0.9718, passHint: 0.9454, failed: 0.6025 },
      { p: 0.0791, passFirst: 0.2936, passHint: 0.2008, failed: 0.0432 },
      { p: 0.4092, passFirst: 0.7324, passHint: 0.5854, failed: 0.1268 },
      { p: 0.99, passFirst: 0.99, passHint: 0.99, failed: 0.9424 },
      { p: 0.01, passFirst: 0.1116, passHint: 0.0961, failed: 0.0316 },
    ];

    for (const [index, tc] of testCases.entries()) {
      it(`hàng #${index + 1}: p = ${tc.p}`, () => {
        const state = makeState(tc.p, T0);
        const resPassFirst = updateSkill("DB_OPTIMIZATION", state, "PASS_FIRST", T0);
        expectClose(resPassFirst.p_mastery, tc.passFirst);

        const resPassHint = updateSkill("DB_OPTIMIZATION", state, "PASS_AFTER_HINT", T0);
        expectClose(resPassHint.p_mastery, tc.passHint);

        const resFailed = updateSkill("DB_OPTIMIZATION", state, "FAILED", T0);
        expectClose(resFailed.p_mastery, tc.failed);
      });
    }
  });

  describe("T-CHAIN — chuỗi từ 0.25, đủ độ chính xác (BKT-02)", () => {
    it("chuỗi PASS_FIRST từ 0.25 qua 5 lần liên tiếp", () => {
      const expected = [0.5767, 0.8413, 0.9532, 0.9873, 0.99];
      let state: CognitiveSkillState | undefined = undefined;

      for (let i = 0; i < expected.length; i++) {
        state = updateSkill("HTTP_ROUTING", state, "PASS_FIRST", T0);
        expectClose(state.p_mastery, expected[i]);
      }
    });

    it("chuỗi PASS_AFTER_HINT từ 0.25 qua 5 lần liên tiếp", () => {
      const expected = [0.4202, 0.5957, 0.7439, 0.8495, 0.9159];
      let state: CognitiveSkillState | undefined = undefined;

      for (let i = 0; i < expected.length; i++) {
        state = updateSkill("HTTP_ROUTING", state, "PASS_AFTER_HINT", T0);
        expectClose(state.p_mastery, expected[i]);
      }
    });

    it("chuỗi FAILED từ 0.25 qua 5 lần liên tiếp", () => {
      const expected = [0.0791, 0.0432, 0.0369, 0.0359, 0.0357];
      let state: CognitiveSkillState | undefined = undefined;

      for (let i = 0; i < expected.length; i++) {
        state = updateSkill("HTTP_ROUTING", state, "FAILED", T0);
        expectClose(state.p_mastery, expected[i]);
      }
    });
  });

  describe("T-UPD — updateSkill / computeSkillChange", () => {
    it("#1: updateSkill với state undefined, PASS_AFTER_HINT", () => {
      const next = updateSkill("DB_OPTIMIZATION", undefined, "PASS_AFTER_HINT", T0);
      expectClose(next.p_mastery, 0.4202);
      expect(next.last_practiced_at).toBe(T0);
      expect(next.practice_count).toBe(1);
      expect(next.correct_count).toBe(1);
    });

    it("#2: updateSkill với state undefined, FAILED", () => {
      const next = updateSkill("AUTH_SECURITY", undefined, "FAILED", T0);
      expectClose(next.p_mastery, 0.0791);
      expect(next.last_practiced_at).toBe(T0);
      expect(next.practice_count).toBe(1);
      expect(next.correct_count).toBe(0);
    });

    it("#3: state { 0.9532, T0, 3, 3 }, PASS_FIRST @30", () => {
      const state = makeState(0.9532, T0, 3, 3);
      const now = T0 + 30 * MS_PER_DAY;
      const next = updateSkill("DB_OPTIMIZATION", state, "PASS_FIRST", now);
      expectClose(next.p_mastery, 0.7324);
      expect(next.last_practiced_at).toBe(now);
      expect(next.practice_count).toBe(4);
      expect(next.correct_count).toBe(4);
    });

    it("#4: state { 0.25, last_practiced_at: T0+5d, 1, 1 }, PASS_FIRST, now = T0", () => {
      const lastPracticed = T0 + 5 * MS_PER_DAY;
      const state = makeState(0.25, lastPracticed, 1, 1);
      const next = updateSkill("DB_OPTIMIZATION", state, "PASS_FIRST", T0);
      expectClose(next.p_mastery, 0.5767);
      expect(next.last_practiced_at).toBe(lastPracticed);
      expect(next.practice_count).toBe(2);
      expect(next.correct_count).toBe(2);
    });

    it("#5: computeSkillChange(AUTH_SECURITY, undefined, FAILED, T0)", () => {
      const res = computeSkillChange("AUTH_SECURITY", undefined, "FAILED", T0);
      expectClose(res.change.p_before, 0.25);
      expectClose(res.change.p_after, 0.0791);
      expect(res.change.outcome).toBe("FAILED");
      expect(res.change.skill).toBe("AUTH_SECURITY");
    });

    it("#6: state DB { 0.9532, T0, 3, 3 }, FAILED, @30", () => {
      const state = makeState(0.9532, T0, 3, 3);
      const now = T0 + 30 * MS_PER_DAY;
      const res = computeSkillChange("DB_OPTIMIZATION", state, "FAILED", now);
      expectClose(res.change.p_before, 0.4092);
      expectClose(res.change.p_after, 0.1268);
      expectClose(res.next.p_mastery, 0.1268);
      expect(res.next.last_practiced_at).toBe(now);
      expect(res.next.practice_count).toBe(4);
      expect(res.next.correct_count).toBe(3);
    });
  });

  describe("T-REV — revertSkillChange (D-22)", () => {
    it("#1: hoàn tác thành công khi state.p_mastery khớp p_after", () => {
      const { next: stateAfter, change } = computeSkillChange(
        "AUTH_SECURITY",
        undefined,
        "FAILED",
        T0
      );
      const reverted = revertSkillChange(stateAfter, change);
      expect(reverted).not.toBeNull();
      expectClose(reverted!.next.p_mastery, 0.25);
      expect(reverted!.next.last_practiced_at).toBe(T0);
      expect(reverted!.next.practice_count).toBe(0);
      expect(reverted!.next.correct_count).toBe(0);
      expectClose(reverted!.change.p_before, change.p_after);
      expectClose(reverted!.change.p_after, 0.25);
      expect(reverted!.change.outcome).toBe("FAILED");
      expect(reverted!.change.skill).toBe("AUTH_SECURITY");
    });

    it("#2: trả về null khi state.p_mastery không khớp p_after (đã cập nhật lại sau đó)", () => {
      const change: SkillChange = {
        skill: "AUTH_SECURITY",
        p_before: 0.25,
        p_after: 0.079113924,
        outcome: "FAILED",
      };
      const modifiedState: CognitiveSkillState = {
        skill: "AUTH_SECURITY",
        p_mastery: 0.2008,
        last_practiced_at: T0,
        practice_count: 2,
        correct_count: 0,
      };
      const reverted = revertSkillChange(modifiedState, change);
      expect(reverted).toBeNull();
    });
  });

  describe("T-DEC — getDecayedMastery", () => {
    const cases = [
      { p: 0.5767, days: 9, expected: 0.4592 },
      { p: 0.5767, days: 10, expected: 0.4491 },
      { p: 0.9532, days: 25, expected: 0.454 },
      { p: 0.9532, days: 26, expected: 0.4441 },
      { p: 0.9532, days: 30, expected: 0.4092 },
      { p: 0.95, days: 30, expected: 0.4085 },
      { p: 0.8413, days: 7, expected: 0.6681 },
      { p: 0.4202, days: 10, expected: 0.3537 },
      { p: 0.0791, days: 30, expected: 0.0791 },
      { p: 0.25, days: 100, expected: 0.25 },
    ];

    for (const [idx, c] of cases.entries()) {
      it(`#${idx + 1}: p=${c.p}, Δt=${c.days}d => ${c.expected}`, () => {
        const state = makeState(c.p, T0);
        const actual = getDecayedMastery(state, T0 + c.days * MS_PER_DAY);
        expectClose(actual, c.expected);
      });
    }

    it("#11: state thiếu (undefined) => 0.2500", () => {
      expectClose(getDecayedMastery(undefined, T0), 0.25);
      expectClose(getDecayedMastery(undefined, T0 + 100 * MS_PER_DAY), 0.25);
    });

    it("#12: now < last_practiced_at => giữ nguyên điểm", () => {
      const state = makeState(0.9532, T0);
      const actual = getDecayedMastery(state, T0 - 1000);
      expectClose(actual, 0.9532);
    });
  });

  describe("T-TIER — tierOf / overallTier", () => {
    it("tierOf cho từng khoảng ngưỡng", () => {
      expect(tierOf(0.01)).toBe("NOVICE");
      expect(tierOf(0.4499)).toBe("NOVICE");
      expect(tierOf(0.45)).toBe("PRACTITIONER");
      expect(tierOf(0.7499)).toBe("PRACTITIONER");
      expect(tierOf(0.75)).toBe("ARCHITECT");
      expect(tierOf(0.92)).toBe("ARCHITECT");
      expect(tierOf(0.99)).toBe("ARCHITECT");
    });

    it("overallTier khi hồ sơ rỗng", () => {
      expect(overallTier({}, T0)).toBe("NOVICE");
    });

    it("overallTier khi kỹ năng có practice_count = 0", () => {
      const skills = {
        AUTH_SECURITY: {
          skill: "AUTH_SECURITY" as const,
          p_mastery: 0.25,
          last_practiced_at: T0,
          practice_count: 0,
          correct_count: 0,
        },
      };
      expect(overallTier(skills, T0)).toBe("NOVICE");
    });

    it("overallTier với 2 kỹ năng đã luyện", () => {
      const skills = {
        DB_OPTIMIZATION: {
          skill: "DB_OPTIMIZATION" as const,
          p_mastery: 0.4202,
          last_practiced_at: T0,
          practice_count: 1,
          correct_count: 1,
        },
        LAYERED_SEPARATION: {
          skill: "LAYERED_SEPARATION" as const,
          p_mastery: 0.5767,
          last_practiced_at: T0,
          practice_count: 1,
          correct_count: 1,
        },
      };
      expect(overallTier(skills, T0)).toBe("PRACTITIONER");
    });
  });

  describe("T-MM — isDecaying (D-35)", () => {
    it("#1: 0.5767 @0 => false", () => {
      const state = makeState(0.5767, T0);
      expect(isDecaying(state, T0)).toBe(false);
    });

    it("#2: 0.5767 @9 => false (chưa rớt bậc)", () => {
      const state = makeState(0.5767, T0);
      expect(isDecaying(state, T0 + 9 * MS_PER_DAY)).toBe(false);
    });

    it("#3: 0.5767 @10 => true (0.4491: PRACTITIONER => NOVICE)", () => {
      const state = makeState(0.5767, T0);
      expect(isDecaying(state, T0 + 10 * MS_PER_DAY)).toBe(true);
    });

    it("#4: 0.8413 @7 => true (0.6681: ARCHITECT => PRACTITIONER)", () => {
      const state = makeState(0.8413, T0);
      expect(isDecaying(state, T0 + 7 * MS_PER_DAY)).toBe(true);
    });

    it("#5: 0.0791 @30 => false (điểm ≤ sàn)", () => {
      const state = makeState(0.0791, T0);
      expect(isDecaying(state, T0 + 30 * MS_PER_DAY)).toBe(false);
    });

    it("#6: State thiếu (undefined) => false", () => {
      expect(isDecaying(undefined, T0)).toBe(false);
    });
  });

  describe("T-OUT — outcomeOf", () => {
    it("isPassed=true, attemptsUsed=1 => PASS_FIRST", () => {
      expect(outcomeOf(true, 1)).toBe("PASS_FIRST");
    });

    it("isPassed=true, attemptsUsed=2 => PASS_AFTER_HINT", () => {
      expect(outcomeOf(true, 2)).toBe("PASS_AFTER_HINT");
    });

    it("isPassed=true, attemptsUsed=3 => PASS_AFTER_HINT", () => {
      expect(outcomeOf(true, 3)).toBe("PASS_AFTER_HINT");
    });

    it("isPassed=false, attemptsUsed=3 => FAILED", () => {
      expect(outcomeOf(false, 3)).toBe("FAILED");
    });
  });
});
