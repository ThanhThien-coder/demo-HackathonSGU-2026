import { CONFIG } from "@/contracts/config";
import type {
  NodeAnalysis,
  QuestionPlanItem,
  NodeRunView,
  QuestionState,
  SWESkill,
  LearnerTier,
  QuestionFocus,
  LearnerCognitiveProfile,
} from "@/contracts";
import { getDecayedMastery, tierOf } from "./bkt-engine";

type SkillMap = LearnerCognitiveProfile["skills"];

export type RunLike = Pick<NodeRunView, "mode" | "started_at" | "finished_at"> & {
  questions: Array<
    Pick<
      QuestionState,
      "question_index" | "skill" | "focus" | "outcome" | "ended_by" | "disputed"
    >
  >;
};

const CYCLE: QuestionFocus[] = ["FLOW", "ARCHITECTURE", "CHANGE"];

const START_BY_TIER: Record<LearnerTier, QuestionFocus> = {
  NOVICE: "FLOW",
  PRACTITIONER: "ARCHITECTURE",
  ARCHITECT: "CHANGE",
};

function getCycleFrom(start: QuestionFocus): QuestionFocus[] {
  const idx = CYCLE.indexOf(start);
  if (idx === -1) {
    return [...CYCLE];
  }
  return [...CYCLE.slice(idx), ...CYCLE.slice(0, idx)];
}

function getStepIndices(
  focus: QuestionFocus,
  skill: SWESkill,
  analysis: NodeAnalysis,
  stepCount: number
): number[] {
  const maxStep = Math.max(1, stepCount);
  const inRange = (s: number) => Number.isInteger(s) && s >= 1 && s <= maxStep;

  if (focus === "FLOW" || focus === "CHANGE") {
    return Array.from({ length: maxStep }, (_, i) => i + 1);
  }

  const stepSet = new Set<number>();
  const evStep = analysis.skills.find((s) => s.skill === skill)?.step;

  if (focus === "WEAKNESS") {
    if (evStep !== undefined && inRange(evStep)) {
      stepSet.add(evStep);
    }
    for (const wp of analysis.weak_points) {
      if (wp.skill === skill && inRange(wp.step)) {
        stepSet.add(wp.step);
      }
    }
  } else if (focus === "ARCHITECTURE") {
    stepSet.add(1);
    if (evStep !== undefined && inRange(evStep)) {
      stepSet.add(evStep);
    }
    if (analysis.strengths) {
      for (const st of analysis.strengths) {
        if (inRange(st.step)) {
          stepSet.add(st.step);
        }
      }
    }
  }

  const sorted = Array.from(stepSet)
    .filter(inRange)
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return [1];
  }
  return sorted;
}

/**
 * Lập kế hoạch câu hỏi cho một node học (BKT-41..49, BKT-31, D-34).
 * Luôn trả về ít nhất 1 câu hỏi khi analysis.skills không rỗng.
 */
export function planNodeQuestions(
  analysis: NodeAnalysis,
  skills: SkillMap,
  now: number,
  stepCount: number
): QuestionPlanItem[] {
  const order = analysis.skills.map((s) => s.skill);
  if (order.length === 0) {
    return [];
  }

  const getDecayed = (k: SWESkill) =>
    getDecayedMastery(skills ? skills[k] : undefined, now);
  const getPracticeCount = (k: SWESkill) => skills?.[k]?.practice_count ?? 0;
  const hasWeak = (k: SWESkill) =>
    analysis.weak_points.some((w) => w.skill === k);

  const archOk = Boolean(
    (analysis.strengths && analysis.strengths.length > 0) ||
      (analysis.architecture?.patterns &&
        analysis.architecture.patterns.some((p) => p !== "OTHER"))
  );

  const isValidFocus = (f: QuestionFocus) => f !== "ARCHITECTURE" || archOk;

  const byWeakest = (a: SWESkill, b: SWESkill) => {
    const diffP = getDecayed(a) - getDecayed(b);
    if (Math.abs(diffP) > 1e-9) {
      return diffP;
    }
    const diffPc = getPracticeCount(a) - getPracticeCount(b);
    if (diffPc !== 0) {
      return diffPc;
    }
    return order.indexOf(a) - order.indexOf(b);
  };

  const byPlan = (a: SWESkill, b: SWESkill) => {
    const aWeak = hasWeak(a) ? 1 : 0;
    const bWeak = hasWeak(b) ? 1 : 0;
    if (aWeak !== bWeak) {
      return bWeak - aWeak;
    }
    return byWeakest(a, b);
  };

  let picks: Array<{ skill: SWESkill; tier: LearnerTier }>;
  const open = order.filter((k) => getDecayed(k) < CONFIG.MASTERED_MIN);
  if (open.length > 0) {
    const sortedOpen = [...open].sort(byPlan);
    picks = sortedOpen.map((k) => ({
      skill: k,
      tier: tierOf(getDecayed(k)),
    }));
  } else {
    const weakest = [...order].sort(byWeakest)[0];
    picks = [{ skill: weakest, tier: "ARCHITECT" as LearnerTier }];
  }

  const items: Array<{
    skill: SWESkill;
    tier: LearnerTier;
    focus: QuestionFocus;
  }> = [];
  const usedNonWeak = new Set<QuestionFocus>();

  const pickFocus = (skill: SWESkill, tier: LearnerTier): QuestionFocus => {
    if (hasWeak(skill)) {
      return "WEAKNESS";
    }
    const cycle = getCycleFrom(START_BY_TIER[tier]).filter(isValidFocus);
    const available = cycle.find((f) => !usedNonWeak.has(f));
    const chosen = available ?? cycle[0];
    usedNonWeak.add(chosen);
    return chosen;
  };

  for (const pick of picks) {
    const focus = pickFocus(pick.skill, pick.tier);
    items.push({ skill: pick.skill, tier: pick.tier, focus });
  }

  if (CONFIG.NOVICE_SECOND_QUESTION) {
    const noviceFirstItems = items.filter((it) => it.tier === "NOVICE");
    for (const first of noviceFirstItems) {
      let startFocus: QuestionFocus;
      if (first.focus === "WEAKNESS") {
        startFocus = START_BY_TIER.NOVICE;
      } else {
        const cycleFromFirst = getCycleFrom(first.focus);
        startFocus = cycleFromFirst[1];
      }
      const candidates = getCycleFrom(startFocus)
        .filter(isValidFocus)
        .filter((f) => f !== first.focus);

      const available = candidates.find((f) => !usedNonWeak.has(f));
      const chosen = available ?? candidates[0];
      usedNonWeak.add(chosen);
      items.push({ skill: first.skill, tier: "NOVICE", focus: chosen });
    }
  }

  // BKT-50 (D-81): câu 1 luôn là FLOW; áp sau BKT-46, BKT-49, các câu khác giữ thứ tự
  let flowIdx = items.findIndex((it) => it.focus === "FLOW");
  if (flowIdx < 0) {
    flowIdx = items.findIndex((it) => it.focus !== "WEAKNESS");
    if (flowIdx >= 0) {
      items[flowIdx] = { ...items[flowIdx], focus: "FLOW" };
    } else if (items.length > 0) {
      items.unshift({ skill: items[0].skill, tier: items[0].tier, focus: "FLOW" });
      flowIdx = 0;
    }
  }
  if (flowIdx > 0) {
    items.unshift(...items.splice(flowIdx, 1));
  }

  return items.map((it, idx) => ({
    question_index: idx + 1,
    skill: it.skill,
    tier: it.tier,
    focus: it.focus,
    step_indices: getStepIndices(it.focus, it.skill, analysis, stepCount),
  }));
}

/**
 * Xác định trạng thái của node dựa trên kết quả các run LEARN (BKT-70..72).
 */
export function nodeStatusFromRuns(
  runs: RunLike[]
): "COMPLETED" | "FAILED" | null {
  const completedRuns = runs.filter(
    (r) =>
      r.mode === "LEARN" &&
      r.finished_at !== null &&
      r.finished_at !== undefined
  );
  if (completedRuns.length === 0) {
    return null;
  }
  const lastRun = completedRuns[completedRuns.length - 1];
  const hasFailed = lastRun.questions.some(
    (q) => q.outcome === "FAILED" && !q.disputed
  );
  return hasFailed ? "FAILED" : "COMPLETED";
}
