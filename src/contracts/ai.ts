// 02_CONTRACTS Mục 5 — AI: đầu vào, đầu ra thô, bản đã kiểm
import type {
  ArchitecturalLayer, ArchitecturePattern, DegradedMode, GraphConfidence, LearnerTier,
  NodeType, ProjectArchetype, SWESkill,
} from "./base";

// ---------- 5.1 analyze-node ----------
export interface AnalysisSkill { skill: SWESkill; step: number; symbol: string; reason: string }
export interface AnalysisStepText { step: number; text: string }
export interface AnalysisWeakPoint { skill: SWESkill; step: number; symbol: string; what: string; consequence: string }

export interface NodeAnalysisRaw {
  skills: AnalysisSkill[];
  architecture: { patterns: ArchitecturePattern[]; summary: string };
  steps: AnalysisStepText[];
  strengths: AnalysisStepText[];
  weak_points: AnalysisWeakPoint[];
}

export interface NodeAnalysis extends NodeAnalysisRaw {
  node_id: string;
  skeleton_only: boolean;
}

export interface NodeAnalysisView {
  node_id: string;
  skills: Array<AnalysisSkill & { file_path: string; line_start: number; line_end: number }>;
  architecture: { patterns: ArchitecturePattern[]; summary: string };
  steps: Array<{ step: number; layer: ArchitecturalLayer; file_path: string; line_start: number; line_end: number; text: string | null }>;
  strengths: AnalysisStepText[];
  weak_points: Array<AnalysisWeakPoint & { file_path: string; line_start: number; line_end: number }>;
  shared_files: Array<{ file_path: string; node_ids: string[] }>;
  skeleton_only: boolean;
}

// ---------- 5.2 analyze-overview ----------
export interface RepoOverviewRaw {
  architecture_style: ArchitecturePattern;
  summary: string;
  layers: Array<{ layer: ArchitecturalLayer; role: string; nodes: string[] }>;
  main_flow: string;
  notes: Array<{ text: string; nodes: string[] }>;
}
export interface RepoOverviewView {
  facts: {
    archetype: ProjectArchetype; framework: string | null; tech_stack: string[];
    root_node_ids: string[]; main_path_node_ids: string[];
  };
  ai: RepoOverviewRaw | null;
}

// ---------- 5.3 enrich-node ----------
export type QuestionFocus = "FLOW" | "ARCHITECTURE" | "WEAKNESS" | "CHANGE";
export type RunMode = "LEARN";

export interface QuestionPlanItem {
  question_index: number;
  skill: SWESkill;
  tier: LearnerTier;
  focus: QuestionFocus;
  step_indices: number[];
}

export interface GeneratedQuestionRaw {
  skill: SWESkill;
  feynman_question: string;
  reference_answer: string;
  must_have_points: string[];
  fix: string;
}

export interface QuestionPromptPayload {
  macro_context: {
    repo_name: string; archetype: ProjectArchetype; tech_stack: string[];
    graph_confidence: GraphConfidence; degraded_mode: DegradedMode | null;
    node_id: string; node_title: string; node_type: NodeType;
  };
  micro_trace: { scoped_code_snippet: string; dto_interfaces: string };
  node_analysis: Pick<NodeAnalysis, "steps" | "strengths" | "architecture" | "weak_points">;
  invariants: {
    questions_plan: Array<Pick<QuestionPlanItem, "skill" | "tier" | "focus" | "step_indices">>;
    forbidden_external_keywords: string[];
  };
}

// ---------- 5.4 evaluate-feynman ----------
export type AnswerIntent = "ANSWER" | "GIVE_UP" | "OFF_TOPIC";
export type FollowUpType = "CONCEPT" | "CODE_POINTER";

export interface GradingRaw {
  core_accuracy: number;
  simplicity: number;
  intent: AnswerIntent;
  points: Array<{ index: number; covered: boolean; quote: string }>;
  misconception: string;
  follow_up_question: string | null;
  follow_up_type: FollowUpType | null;
  follow_up_step_index: number | null;
  feedback: string;
  detected_jargons: string[];
}

export type GuardCall = "analyze" | "overview" | "questions" | "grade";
export type GuardCode =
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7"
  | "O1" | "O2" | "O3" | "O4"
  | "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6" | "Q7" | "Q8"
  | "G1" | "G2";
export interface GuardIssue {
  code: GuardCode;
  question?: number;
  step?: number;
  name?: string;
}
export interface GuardLogEntry {
  event: "guard_blocked";
  call: GuardCall;
  attempt: number;
  node_id: string | null;
  codes: GuardCode[];
  prompt_version: string;
  llm_model: string;
}
