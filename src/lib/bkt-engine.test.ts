import { describe, expect, it } from "vitest";
import type { CognitiveSkillState, NodeOutcome } from "@/contracts";
import {
  computeSkillChange, getDecayedMastery, isDecaying, outcomeOf, overallTier,
  revertSkillChange, tierOf, updateSkill,
} from "./bkt-engine";

const T0 = 1_774_000_000_000;
const DAY = 86_400_000;
const st = (p: number, n = 1, c = 1, at = T0): CognitiveSkillState =>
  ({ skill: "DB_OPTIMIZATION", p_mastery: p, last_practiced_at: at, practice_count: n, correct_count: c });
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(5e-5);
const step = (p: number, o: NodeOutcome) => updateSkill("DB_OPTIMIZATION", st(p), o, T0).p_mastery;

describe("T-BKT cập nhật 1 bước", () => {
  const rows: Array<[number, number, number, number]> = [
    [0.25, 0.5767, 0.4202, 0.0791],
    [0.5767, 0.8413, 0.7292, 0.2036],
    [0.8413, 0.9532, 0.9109, 0.4752],
    [0.9, 0.9718, 0.9454, 0.6025],
    [0.0791, 0.2936, 0.2008, 0.0432],
    [0.4092, 0.7324, 0.5854, 0.1268],
    [0.99, 0.99, 0.99, 0.9424],
    [0.01, 0.1116, 0.0961, 0.0316],
  ];
  rows.forEach(([p, f, h, x], i) =>
    it(`dòng ${i + 1}`, () => {
      close(step(p, "PASS_FIRST"), f);
      close(step(p, "PASS_AFTER_HINT"), h);
      close(step(p, "FAILED"), x);
    }));
});

describe("T-CHAIN", () => {
  it("PASS_AFTER_HINT lặp từ 0.25 không làm tròn giữa chừng (BKT-02)", () => {
    let s: CognitiveSkillState | undefined;
    const out: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = updateSkill("DB_OPTIMIZATION", s, "PASS_AFTER_HINT", T0);
      out.push(s.p_mastery);
    }
    close(out[0], 0.4202); close(out[1], 0.5957); close(out[2], 0.7439); close(out[3], 0.8495);
  });
});

describe("T-UPD", () => {
  it("1: thiếu state, PASS_AFTER_HINT", () => {
    const r = updateSkill("DB_OPTIMIZATION", undefined, "PASS_AFTER_HINT", T0);
    close(r.p_mastery, 0.4202);
    expect([r.last_practiced_at, r.practice_count, r.correct_count]).toEqual([T0, 1, 1]);
  });
  it("2: thiếu state, FAILED", () => {
    const r = updateSkill("AUTH_SECURITY", undefined, "FAILED", T0);
    close(r.p_mastery, 0.0791);
    expect([r.practice_count, r.correct_count]).toEqual([1, 0]);
  });
  it("3: tiên nghiệm decay @30", () => {
    const r = updateSkill("DB_OPTIMIZATION", st(0.9532, 3, 3), "PASS_FIRST", T0 + 30 * DAY);
    close(r.p_mastery, 0.7324);
    expect([r.last_practiced_at, r.practice_count, r.correct_count]).toEqual([T0 + 30 * DAY, 4, 4]);
  });
  it("4: đồng hồ lệch ⇒ giữ last_practiced_at lớn hơn", () => {
    const r = updateSkill("DB_OPTIMIZATION", st(0.25, 1, 1, T0 + 5 * DAY), "PASS_FIRST", T0);
    close(r.p_mastery, 0.5767);
    expect(r.last_practiced_at).toBe(T0 + 5 * DAY);
  });
  it("5, 6: computeSkillChange", () => {
    const a = computeSkillChange("AUTH_SECURITY", undefined, "FAILED", T0).change;
    close(a.p_before, 0.25); close(a.p_after, 0.0791);
    const b = computeSkillChange("DB_OPTIMIZATION", st(0.9532, 3, 3), "FAILED", T0 + 30 * DAY);
    close(b.change.p_before, 0.4092); close(b.change.p_after, 0.1268);
    expect([b.next.practice_count, b.next.correct_count]).toEqual([4, 3]);
  });
});

describe("T-REV", () => {
  it("1: hoàn BKT", () => {
    const { next, change } = computeSkillChange("AUTH_SECURITY", undefined, "FAILED", T0);
    const r = revertSkillChange(next, change)!;
    expect(r.next.p_mastery).toBeCloseTo(0.25, 9);
    expect([r.next.practice_count, r.next.correct_count]).toEqual([0, 0]);
    close(r.change.p_before, 0.0791); close(r.change.p_after, 0.25);
  });
  it("2: đã cập nhật lại ⇒ null", () => {
    const { next, change } = computeSkillChange("AUTH_SECURITY", undefined, "FAILED", T0);
    expect(revertSkillChange({ ...next, p_mastery: 0.2008 }, change)).toBeNull();
  });
});

describe("T-DEC", () => {
  const cases: Array<[number, number, number]> = [
    [0.5767, 9, 0.4592], [0.5767, 10, 0.4491], [0.9532, 25, 0.454], [0.9532, 26, 0.4441],
    [0.9532, 30, 0.4092], [0.95, 30, 0.4085], [0.8413, 7, 0.6681], [0.4202, 10, 0.3537],
    [0.0791, 30, 0.0791], [0.25, 100, 0.25],
  ];
  cases.forEach(([p, d, want]) => it(`${p} @${d}`, () => close(getDecayedMastery(st(p), T0 + d * DAY), want)));
  it("thiếu state ⇒ 0.25; now < last ⇒ giữ nguyên", () => {
    expect(getDecayedMastery(undefined, T0)).toBe(0.25);
    expect(getDecayedMastery(st(0.9532), T0 - DAY)).toBe(0.9532);
  });
});

describe("T-TIER / T-MM / T-OUT", () => {
  it("tierOf", () => {
    expect(tierOf(0.4499)).toBe("NOVICE");
    expect(tierOf(0.45)).toBe("PRACTITIONER");
    expect(tierOf(0.7499)).toBe("PRACTITIONER");
    expect(tierOf(0.75)).toBe("ARCHITECT");
    expect(tierOf(0.99)).toBe("ARCHITECT");
  });
  it("overallTier", () => {
    expect(overallTier({}, T0)).toBe("NOVICE");
    expect(overallTier({ AUTH_SECURITY: st(0.25, 0, 0) }, T0)).toBe("NOVICE");
    expect(overallTier({ DB_OPTIMIZATION: st(0.4202), LAYERED_SEPARATION: st(0.5767) }, T0)).toBe("PRACTITIONER");
  });
  it("isDecaying", () => {
    expect(isDecaying(st(0.5767), T0)).toBe(false);
    expect(isDecaying(st(0.5767), T0 + 9 * DAY)).toBe(false);
    expect(isDecaying(st(0.5767), T0 + 10 * DAY)).toBe(true);
    expect(isDecaying(st(0.8413), T0 + 7 * DAY)).toBe(true);
    expect(isDecaying(st(0.0791), T0 + 30 * DAY)).toBe(false);
    expect(isDecaying(undefined, T0)).toBe(false);
  });
  it("outcomeOf", () => {
    expect(outcomeOf(true, 1)).toBe("PASS_FIRST");
    expect(outcomeOf(true, 2)).toBe("PASS_AFTER_HINT");
    expect(outcomeOf(true, 3)).toBe("PASS_AFTER_HINT");
    expect(outcomeOf(false, 3)).toBe("FAILED");
  });
});
