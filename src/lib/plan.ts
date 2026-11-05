// 22 Mục 5–8 — kế hoạch câu hỏi (D-34: luôn ≥ 1 câu) và màu node từ kết quả câu. Hàm thuần.
import { CONFIG } from "@/contracts/config";
import type {
  LearnerCognitiveProfile, LearnerTier, NodeAnalysis, NodeRunView, QuestionFocus,
  QuestionPlanItem, QuestionState, SWESkill,
} from "@/contracts";
import { getDecayedMastery, tierOf } from "./bkt-engine";

type SkillMap = LearnerCognitiveProfile["skills"];

type RunLike = Pick<NodeRunView, "mode" | "started_at" | "finished_at"> & {
  questions: Array<Pick<QuestionState, "question_index" | "skill" | "focus" | "outcome" | "ended_by" | "disputed">>;
};

const CYCLE: QuestionFocus[] = ["FLOW", "ARCHITECTURE", "CHANGE"];
const START: Record<LearnerTier, QuestionFocus> = { NOVICE: "FLOW", PRACTITIONER: "ARCHITECTURE", ARCHITECT: "CHANGE" };
const from = (f: QuestionFocus): QuestionFocus[] => {
  const i = CYCLE.indexOf(f);
  return [...CYCLE.slice(i), ...CYCLE.slice(0, i)];
};

interface PlanItem { skill: SWESkill; tier: LearnerTier; focus: QuestionFocus }

/** BKT-48: bước gửi AI — lọc 1..stepCount, bỏ trùng, tăng dần, không rỗng. */
function stepsFor(it: PlanItem, analysis: NodeAnalysis, stepCount: number): number[] {
  const ev = analysis.skills.find((s) => s.skill === it.skill)?.step;
  const set = new Set<number>();
  const add = (n: number | undefined) => {
    if (n !== undefined && Number.isInteger(n) && n >= 1 && n <= stepCount) set.add(n);
  };
  switch (it.focus) {
    case "WEAKNESS":
      add(ev);
      add(analysis.weak_points.find((w) => w.skill === it.skill)?.step);
      break;
    case "ARCHITECTURE":
      add(1);
      add(ev);
      analysis.strengths.forEach((s) => add(s.step));
      break;
    default:
      for (let i = 1; i <= stepCount; i++) add(i);
  }
  if (set.size === 0) set.add(Math.max(1, Math.min(stepCount, 1)));
  return [...set].sort((a, b) => a - b);
}

/** Mục 6: lập kế hoạch câu hỏi. Không bao giờ trả []. */
export function planNodeQuestions(
  analysis: NodeAnalysis,
  skills: SkillMap,
  now: number,
  stepCount: number,
): QuestionPlanItem[] {
  const order = analysis.skills.map((s) => s.skill);
  const p = (k: SWESkill) => getDecayedMastery(skills[k], now);
  const pc = (k: SWESkill) => skills[k]?.practice_count ?? 0;
  const weak = (k: SWESkill) => analysis.weak_points.some((w) => w.skill === k);
  const archOk = analysis.strengths.length > 0 || analysis.architecture.patterns.some((x) => x !== "OTHER");
  const valid = (f: QuestionFocus) => f !== "ARCHITECTURE" || archOk;
  const byWeakest = (a: SWESkill, b: SWESkill) =>
    p(a) - p(b) || pc(a) - pc(b) || order.indexOf(a) - order.indexOf(b);
  const byPlan = (a: SWESkill, b: SWESkill) => Number(!weak(a)) - Number(!weak(b)) || byWeakest(a, b); // BKT-42

  if (order.length === 0) return [];

  let picks: Array<{ skill: SWESkill; tier: LearnerTier }>;
  const open = order.filter((k) => p(k) < CONFIG.MASTERED_MIN); // BKT-41
  if (open.length > 0) picks = [...open].sort(byPlan).map((k) => ({ skill: k, tier: tierOf(p(k)) }));
  else picks = [{ skill: [...order].sort(byWeakest)[0], tier: "ARCHITECT" }]; // BKT-31, D-34

  const items: PlanItem[] = [];
  const usedNonWeak = new Set<QuestionFocus>();
  const take = (skill: SWESkill, tier: LearnerTier, focus: QuestionFocus) => {
    items.push({ skill, tier, focus });
    if (focus !== "WEAKNESS") usedNonWeak.add(focus);
  };
  const firstFree = (c: QuestionFocus[]) => c.find((f) => !usedNonWeak.has(f)) ?? c[0];

  for (const { skill, tier } of picks) {
    if (weak(skill)) take(skill, tier, "WEAKNESS"); // BKT-46
    else take(skill, tier, firstFree(from(START[tier]).filter(valid)));
  }
  if (CONFIG.NOVICE_SECOND_QUESTION) {
    // BKT-49
    for (const first of items.filter((i) => i.tier === "NOVICE")) {
      const start = first.focus === "WEAKNESS" ? START.NOVICE : from(first.focus)[1];
      take(first.skill, "NOVICE", firstFree(from(start).filter(valid).filter((f) => f !== first.focus)));
    }
  }
  return items.map((it, i) => ({ question_index: i + 1, ...it, step_indices: stepsFor(it, analysis, stepCount) }));
}

/** BKT-70..72: màu node từ run LEARN đã xong. */
export function nodeStatusFromRuns(runs: RunLike[]): "COMPLETED" | "FAILED" | null {
  const done = runs.filter((r) => r.mode === "LEARN" && r.finished_at !== null);
  if (done.length === 0) return null;
  const last = [...done].sort((a, b) => b.started_at - a.started_at)[0];
  const failed = last.questions.some((q) => q.outcome === "FAILED" && !q.disputed);
  return failed ? "FAILED" : "COMPLETED";
}
