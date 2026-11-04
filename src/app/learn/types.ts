import type {
  NodeAnalysisView,
  RepoOverviewView,
  QuestionView,
  EvaluateFeynmanResponse,
  SkillChange,
  SessionProgress,
  NodeStatus,
} from "@/contracts";

export interface GraphNodeDisplay {
  id: string;
  tier: number;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  status: NodeStatus;
  pKnow: number;
  skills: string[];
  complexity: number;
  fileSnippet?: string;
  attemptsCount?: number;
  hasWarning?: boolean;
}

export interface LearnPageState {
  sessionId: string;
  selectedNodeId: string;
  progress: SessionProgress | null;
  analysis: NodeAnalysisView | null;
  overview: RepoOverviewView | null;
  currentRunId: string | null;
  questions: QuestionView[];
  activeQuestionIndex: number;
  lastEvaluation: EvaluateFeynmanResponse | null;
  lastSkillChange: SkillChange | null;
  tokensUsed: number;
}
