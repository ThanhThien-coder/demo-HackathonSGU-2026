// 02_CONTRACTS Mục 6–7 — người học, BKT, tiến độ, lưu trữ
import type { AnswerIntent, GeneratedQuestionRaw, QuestionFocus, QuestionPlanItem, RunMode } from "./ai";
import type { ArchitecturalLayer, LearnerTier, NodeStatus, SWESkill } from "./base";
import type { RepoSnapshotKey } from "./engine";

export type NodeOutcome = "PASS_FIRST" | "PASS_AFTER_HINT" | "FAILED";

export interface CognitiveSkillState {
  skill: SWESkill;
  p_mastery: number;
  last_practiced_at: number;
  practice_count: number;
  correct_count: number;
}

export interface LearnerCognitiveProfile {
  user_id: string;
  display_name: string | null;
  skills: Partial<Record<SWESkill, CognitiveSkillState>>;
  overall_tier: LearnerTier;
}

export interface QuestionReveal { reference_answer: string; must_have_points: string[]; fix: string }

export interface QuestionState {
  question_index: number;
  feynman_question: string;
  skill: SWESkill;
  tier: LearnerTier;
  focus: QuestionFocus;
  attempts_used: number;
  finished: boolean;
  outcome: NodeOutcome | null;
  ended_by: "ANSWER" | "SKIP" | "DROPPED" | null;
  disputed: boolean;
  reveal: QuestionReveal | null;
}

export interface NodeRunView {
  run_id: string;
  node_id: string;
  mode: RunMode;
  started_at: number;
  finished_at: number | null;
  questions: QuestionState[];
}

export interface NodeStateView {
  node_id: string;
  status: NodeStatus;
  has_warning: boolean;
  analysis_failed: boolean;
  last_run: NodeRunView | null;
}

export interface SessionProgress {
  session_id: string;
  nodes: Record<string, NodeStateView>;
  tokens_used: number;
}

export interface SkillChange { skill: SWESkill; p_before: number; p_after: number; outcome: NodeOutcome }

export type PersonaMode = "NEWBIE" | "MID_LEVEL" | "SENIOR_RUSTY";
export const PERSONAS: Record<PersonaMode, { initial_p_mastery: number; days_idle: number; label: string }> = {
  NEWBIE: { initial_p_mastery: 0.25, days_idle: 0, label: "Sinh viên năm 2" },
  MID_LEVEL: { initial_p_mastery: 0.65, days_idle: 0, label: "Mid-level dev" },
  SENIOR_RUSTY: { initial_p_mastery: 0.95, days_idle: 30, label: "Senior nghỉ 30 ngày (demo mài mòn, D-35)" },
};

// ---------- Mục 7 ----------
export interface GraphSkeletonNode {
  node_id: string;
  title: string;
  prerequisites: string[];
  is_capstone: boolean;
}

export interface LearningSessionSummary {
  session_id: string;
  snapshot: RepoSnapshotKey;
  repo_name: string;
  engine_version: string;
  created_at: number;
  last_active_at: number;
  completed_count: number;
  failed_count: number;
  total_nodes: number;
  can_resume: boolean;
  resume_blocker: "ENGINE_UPDATED" | null;
}

export interface RunStepRef {
  step_index: number;
  layer: ArchitecturalLayer;
  file_path: string;
  function_name: string;
}

export interface AttemptHistoryItem {
  node_id: string;
  node_title: string;
  mode: RunMode;
  question_index: number;
  skill: SWESkill;
  attempt_number: number;
  core_accuracy: number;
  is_passed: boolean;
  intent: AnswerIntent;
  student_answer: string;
  created_at: number;
}

export interface RunQuestion extends QuestionPlanItem, Omit<GeneratedQuestionRaw, "skill"> {
  attempts_used: number;
  finished: boolean;
  outcome: NodeOutcome | null;
  ended_by: "ANSWER" | "SKIP" | "DROPPED" | null;
  disputed: boolean;
  p_before: number | null;
  p_after: number | null;
  last_answer: string | null;
}

export type GradeContext = RunQuestion & { steps: RunStepRef[]; forbidden_external_keywords: string[] };

export interface SessionRow {
  id: string;
  user_id: string;
  engine_version: string;
  tokens_used: number;
}

export type DbTx = unknown;
