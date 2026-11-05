// 22 Mục 3, 4, 7, 10 — BKT, decay, tier, mài mòn. Hàm thuần: không I/O, không Date.now().
import { CONFIG } from "@/contracts/config";
import type {
  CognitiveSkillState, LearnerCognitiveProfile, LearnerTier, NodeOutcome, SWESkill, SkillChange,
} from "@/contracts";

type SkillMap = LearnerCognitiveProfile["skills"];

const TIER_ORDER: Record<LearnerTier, number> = { NOVICE: 0, PRACTITIONER: 1, ARCHITECT: 2 };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** BKT-20: điểm đã decay tại `now`. Chỉ tính khi đọc, không ghi đè p_mastery. */
export function getDecayedMastery(state: CognitiveSkillState | undefined, now: number): number {
  if (!state) return CONFIG.BKT_P_L0;
  const p = state.p_mastery;
  const floor = CONFIG.DECAY_FLOOR;
  if (p <= floor) return p;
  const dtDays = Math.max(0, now - state.last_practiced_at) / CONFIG.MS_PER_DAY;
  return floor + (p - floor) * Math.pow(2, -dtDays / CONFIG.DECAY_HALF_LIFE_DAYS);
}

/** BKT-22 */
export function tierOf(p: number): LearnerTier {
  if (p < CONFIG.TIER_PRACTITIONER_MIN) return "NOVICE";
  if (p < CONFIG.TIER_ARCHITECT_MIN) return "PRACTITIONER";
  return "ARCHITECT";
}

/** BKT-23: tier của trung bình điểm đã decay trên các kỹ năng có practice_count > 0. */
export function overallTier(skills: SkillMap, now: number): LearnerTier {
  const practiced = Object.values(skills).filter(
    (s): s is CognitiveSkillState => !!s && s.practice_count > 0,
  );
  if (practiced.length === 0) return "NOVICE";
  const avg = practiced.reduce((acc, s) => acc + getDecayedMastery(s, now), 0) / practiced.length;
  return tierOf(avg);
}

/** BKT-10, BKT-13: tiên nghiệm = điểm đã decay; kết quả ghi vào p_mastery gốc. */
export function updateSkill(
  skill: SWESkill,
  state: CognitiveSkillState | undefined,
  outcome: NodeOutcome,
  now: number,
): CognitiveSkillState {
  const p = getDecayedMastery(state, now);
  const S = CONFIG.BKT_P_S;
  const G = CONFIG.BKT_P_G;
  const correct = outcome !== "FAILED";
  const gStar = outcome === "PASS_AFTER_HINT" ? CONFIG.BKT_P_G_HINT : CONFIG.BKT_P_G;
  const T = correct ? CONFIG.BKT_P_T_CORRECT : CONFIG.BKT_P_T_INCORRECT;

  const posterior = correct
    ? (p * (1 - S)) / (p * (1 - S) + (1 - p) * gStar)
    : (p * S) / (p * S + (1 - p) * (1 - G));
  const next = clamp(posterior + (1 - posterior) * T, CONFIG.BKT_P_MIN, CONFIG.BKT_P_MAX);

  return {
    skill,
    p_mastery: next,
    last_practiced_at: state ? Math.max(state.last_practiced_at, now) : now,
    practice_count: (state?.practice_count ?? 0) + 1,
    correct_count: (state?.correct_count ?? 0) + (correct ? 1 : 0),
  };
}

/** BKT-24 (D-35): chỉ hiển thị. */
export function isDecaying(state: CognitiveSkillState | undefined, now: number): boolean {
  if (!state) return false;
  return TIER_ORDER[tierOf(getDecayedMastery(state, now))] < TIER_ORDER[tierOf(state.p_mastery)];
}

/** BKT-60 */
export function outcomeOf(isPassed: boolean, attemptsUsed: number): NodeOutcome {
  if (!isPassed) return "FAILED";
  return attemptsUsed === 1 ? "PASS_FIRST" : "PASS_AFTER_HINT";
}

/** BKT-61: p_before là tiên nghiệm đã decay. */
export function computeSkillChange(
  skill: SWESkill,
  state: CognitiveSkillState | undefined,
  outcome: NodeOutcome,
  now: number,
): { next: CognitiveSkillState; change: SkillChange } {
  const next = updateSkill(skill, state, outcome, now);
  return {
    next,
    change: { skill, p_before: getDecayedMastery(state, now), p_after: next.p_mastery, outcome },
  };
}

/** BKT-63 (D-22): hoàn BKT khi "Báo sai". Trả null nếu kỹ năng đã được cập nhật lại sau đó. */
export function revertSkillChange(
  state: CognitiveSkillState,
  change: SkillChange,
): { next: CognitiveSkillState; change: SkillChange } | null {
  if (Math.abs(state.p_mastery - change.p_after) > CONFIG.BKT_REVERT_EPSILON) return null;
  return {
    next: { ...state, p_mastery: change.p_before, practice_count: Math.max(0, state.practice_count - 1) },
    change: { skill: change.skill, p_before: change.p_after, p_after: change.p_before, outcome: change.outcome },
  };
}
