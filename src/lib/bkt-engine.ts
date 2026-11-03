import { CONFIG } from "@/contracts/config";
import type {
  SWESkill,
  LearnerTier,
  NodeOutcome,
  CognitiveSkillState,
  LearnerCognitiveProfile,
  SkillChange,
} from "@/contracts";

type SkillMap = LearnerCognitiveProfile["skills"];

const TIER_ORDER: Record<LearnerTier, number> = {
  NOVICE: 0,
  PRACTITIONER: 1,
  ARCHITECT: 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tính điểm thông thạo sau khi bị mài mòn theo thời gian (BKT-20).
 * Nếu chưa có state, trả về CONFIG.BKT_P_L0.
 */
export function getDecayedMastery(
  state: CognitiveSkillState | undefined,
  now: number
): number {
  if (!state) {
    return CONFIG.BKT_P_L0;
  }
  const p = state.p_mastery;
  const floor = CONFIG.DECAY_FLOOR;
  if (p <= floor) {
    return p;
  }
  const elapsedMs = Math.max(0, now - state.last_practiced_at);
  const deltaDays = elapsedMs / CONFIG.MS_PER_DAY;
  const decayFactor = Math.pow(2, -deltaDays / CONFIG.DECAY_HALF_LIFE_DAYS);
  return floor + (p - floor) * decayFactor;
}

/**
 * Xác định bậc người học theo điểm thông thạo (BKT-22).
 */
export function tierOf(p: number): LearnerTier {
  if (p < CONFIG.TIER_PRACTITIONER_MIN) {
    return "NOVICE";
  }
  if (p < CONFIG.TIER_ARCHITECT_MIN) {
    return "PRACTITIONER";
  }
  return "ARCHITECT";
}

/**
 * Tính bậc người học tổng thể trên các kỹ năng đã từng luyện (BKT-23).
 */
export function overallTier(skills: SkillMap, now: number): LearnerTier {
  if (!skills) {
    return "NOVICE";
  }
  const practicedStates = Object.values(skills).filter(
    (s): s is CognitiveSkillState => Boolean(s && s.practice_count > 0)
  );
  if (practicedStates.length === 0) {
    return "NOVICE";
  }
  let totalDecayed = 0;
  for (const s of practicedStates) {
    totalDecayed += getDecayedMastery(s, now);
  }
  const avg = totalDecayed / practicedStates.length;
  return tierOf(avg);
}

/**
 * Kiểm tra xem kỹ năng có đang bị mài mòn làm rớt bậc hay không (BKT-24).
 */
export function isDecaying(
  state: CognitiveSkillState | undefined,
  now: number
): boolean {
  if (!state) {
    return false;
  }
  const decayedMastery = getDecayedMastery(state, now);
  const currentTier = tierOf(decayedMastery);
  const baseTier = tierOf(state.p_mastery);
  return TIER_ORDER[currentTier] < TIER_ORDER[baseTier];
}

/**
 * Xác định kết quả hoàn thành câu hỏi dựa vào tính đúng sai và số lượt thử (BKT-60).
 */
export function outcomeOf(isPassed: boolean, attemptsUsed: number): NodeOutcome {
  if (!isPassed) {
    return "FAILED";
  }
  if (attemptsUsed === 1) {
    return "PASS_FIRST";
  }
  return "PASS_AFTER_HINT";
}

/**
 * Cập nhật BKT sau 1 câu hỏi (BKT-10, BKT-13).
 */
export function updateSkill(
  skill: SWESkill,
  state: CognitiveSkillState | undefined,
  outcome: NodeOutcome,
  now: number
): CognitiveSkillState {
  const p = getDecayedMastery(state, now);
  const s = CONFIG.BKT_P_S;
  let posterior: number;
  let t: number;

  if (outcome === "PASS_FIRST" || outcome === "PASS_AFTER_HINT") {
    const gStar =
      outcome === "PASS_AFTER_HINT" ? CONFIG.BKT_P_G_HINT : CONFIG.BKT_P_G;
    const numerator = p * (1 - s);
    const denominator = numerator + (1 - p) * gStar;
    posterior = numerator / denominator;
    t = CONFIG.BKT_P_T_CORRECT;
  } else {
    const g = CONFIG.BKT_P_G;
    const numerator = p * s;
    const denominator = numerator + (1 - p) * (1 - g);
    posterior = numerator / denominator;
    t = CONFIG.BKT_P_T_INCORRECT;
  }

  const pPrime = clamp(
    posterior + (1 - posterior) * t,
    CONFIG.BKT_P_MIN,
    CONFIG.BKT_P_MAX
  );

  const lastPracticedAt = state
    ? Math.max(state.last_practiced_at, now)
    : now;
  const practiceCount = (state?.practice_count ?? 0) + 1;
  const isCorrect = outcome === "PASS_FIRST" || outcome === "PASS_AFTER_HINT";
  const correctCount = (state?.correct_count ?? 0) + (isCorrect ? 1 : 0);

  return {
    skill,
    p_mastery: pPrime,
    last_practiced_at: lastPracticedAt,
    practice_count: practiceCount,
    correct_count: correctCount,
  };
}

/**
 * Tính toán thay đổi kỹ năng và trạng thái mới (BKT-61).
 */
export function computeSkillChange(
  skill: SWESkill,
  state: CognitiveSkillState | undefined,
  outcome: NodeOutcome,
  now: number
): { next: CognitiveSkillState; change: SkillChange } {
  const pBefore = getDecayedMastery(state, now);
  const next = updateSkill(skill, state, outcome, now);
  const change: SkillChange = {
    skill,
    p_before: pBefore,
    p_after: next.p_mastery,
    outcome,
  };
  return { next, change };
}

/**
 * Hoàn tác thay đổi kỹ năng khi người học Báo sai (BKT-63).
 */
export function revertSkillChange(
  state: CognitiveSkillState,
  change: SkillChange
): { next: CognitiveSkillState; change: SkillChange } | null {
  if (Math.abs(state.p_mastery - change.p_after) > CONFIG.BKT_REVERT_EPSILON) {
    return null;
  }
  const next: CognitiveSkillState = {
    ...state,
    p_mastery: change.p_before,
    practice_count: Math.max(0, state.practice_count - 1),
  };
  const revertedChange: SkillChange = {
    skill: change.skill,
    p_before: change.p_after,
    p_after: change.p_before,
    outcome: change.outcome,
  };
  return { next, change: revertedChange };
}
