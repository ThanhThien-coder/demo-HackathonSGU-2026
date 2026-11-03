import { create } from "zustand";
import type {
  ClientWorkbenchState,
  ClientStaticEngineResult,
  LearnerCognitiveProfile,
  SessionProgress,
  NodeAnalysisView,
  RepoOverviewView,
  EnrichNodeResponse,
  EvaluateFeynmanResponse,
  PersonaMode,
} from "@/contracts";

export interface WorkbenchUiSlice {
  pending: Record<string, boolean>;
  errors: Record<string, string | null>;
  last_evaluations: Record<string, EvaluateFeynmanResponse>;
  drafts: Record<string, string>;
  presentation_pane: boolean;
  hint_step: number | null;
  offline_persona: PersonaMode;
}

export interface WorkbenchStoreState extends ClientWorkbenchState {
  ui: WorkbenchUiSlice;

  // Actions
  setSession: (
    sessionId: string,
    result: ClientStaticEngineResult | null,
    progress: SessionProgress | null
  ) => void;
  resetSession: () => void;
  setProfile: (profile: LearnerCognitiveProfile | null, clockOffsetMs?: number) => void;
  setProgress: (progress: SessionProgress) => void;
  setAnalysis: (
    nodeId: string,
    analysis: NodeAnalysisView | "PENDING" | "FAILED"
  ) => void;
  setOverview: (overview: RepoOverviewView | "PENDING" | null) => void;
  setRun: (nodeId: string, run: EnrichNodeResponse) => void;
  setActiveNode: (nodeId: string | null) => void;
  setActiveTab: (tab: "XRAY" | "FEYNMAN" | "OVERVIEW") => void;
  setActiveQuestionIndex: (index: number | null) => void;
  setActiveStep: (step: number | null) => void;
  setLastFailedAnswer: (key: string, answer: string) => void;
  setOfflineMode: (enabled: boolean) => void;
  setServerClockOffset: (offsetMs: number) => void;

  // UI Actions
  setUiPending: (key: string, isPending: boolean) => void;
  setUiError: (key: string, error: string | null) => void;
  setLastEvaluation: (key: string, evaluation: EvaluateFeynmanResponse) => void;
  setDraft: (key: string, text: string) => void;
  setPresentationPane: (enabled: boolean) => void;
  setHintStep: (step: number | null) => void;
  setOfflinePersona: (persona: PersonaMode) => void;
}

const initialUiSlice: WorkbenchUiSlice = {
  pending: {},
  errors: {},
  last_evaluations: {},
  drafts: {},
  presentation_pane: false,
  hint_step: null,
  offline_persona: "NEWBIE",
};

export const useWorkbenchStore = create<WorkbenchStoreState>((set) => ({
  session_id: null,
  result: null,
  profile: null,
  progress: null,
  analyses: {},
  overview: null,
  runs: {},
  active_node_id: null,
  active_tab: "XRAY",
  active_question_index: null,
  active_step: 1,
  last_failed_answers: {},
  is_offline_mode: false,
  server_clock_offset_ms: 0,
  ui: initialUiSlice,

  setSession: (sessionId, result, progress) =>
    set({
      session_id: sessionId,
      result,
      progress,
      analyses: {},
      runs: {},
      overview: null,
      active_node_id: result?.nodes?.[0]?.id ?? null,
      active_tab: "XRAY",
      active_step: 1,
      active_question_index: null,
      last_failed_answers: {},
      ui: { ...initialUiSlice },
    }),

  resetSession: () =>
    set({
      session_id: null,
      result: null,
      progress: null,
      analyses: {},
      overview: null,
      runs: {},
      active_node_id: null,
      active_tab: "XRAY",
      active_question_index: null,
      active_step: null,
      last_failed_answers: {},
      ui: initialUiSlice,
    }),

  setProfile: (profile, clockOffsetMs) =>
    set((state) => ({
      profile,
      server_clock_offset_ms:
        clockOffsetMs !== undefined ? clockOffsetMs : state.server_clock_offset_ms,
    })),

  setProgress: (progress) => set({ progress }),

  setAnalysis: (nodeId, analysis) =>
    set((state) => ({
      analyses: {
        ...state.analyses,
        [nodeId]: analysis,
      },
    })),

  setOverview: (overview) => set({ overview }),

  setRun: (nodeId, run) =>
    set((state) => ({
      runs: {
        ...state.runs,
        [nodeId]: run,
      },
    })),

  setActiveNode: (nodeId) =>
    set({
      active_node_id: nodeId,
      active_tab: "XRAY",
      active_step: 1,
      active_question_index: null,
    }),

  setActiveTab: (tab) => set({ active_tab: tab }),

  setActiveQuestionIndex: (index) => set({ active_question_index: index }),

  setActiveStep: (step) => set({ active_step: step }),

  setLastFailedAnswer: (key, answer) =>
    set((state) => ({
      last_failed_answers: {
        ...state.last_failed_answers,
        [key]: answer,
      },
    })),

  setOfflineMode: (is_offline_mode) => set({ is_offline_mode }),

  setServerClockOffset: (server_clock_offset_ms) => set({ server_clock_offset_ms }),

  setUiPending: (key, isPending) =>
    set((state) => ({
      ui: {
        ...state.ui,
        pending: {
          ...state.ui.pending,
          [key]: isPending,
        },
      },
    })),

  setUiError: (key, error) =>
    set((state) => ({
      ui: {
        ...state.ui,
        errors: {
          ...state.ui.errors,
          [key]: error,
        },
      },
    })),

  setLastEvaluation: (key, evaluation) =>
    set((state) => ({
      ui: {
        ...state.ui,
        last_evaluations: {
          ...state.ui.last_evaluations,
          [key]: evaluation,
        },
      },
    })),

  setDraft: (key, text) =>
    set((state) => ({
      ui: {
        ...state.ui,
        drafts: {
          ...state.ui.drafts,
          [key]: text,
        },
      },
    })),

  setPresentationPane: (presentation_pane) =>
    set((state) => ({
      ui: {
        ...state.ui,
        presentation_pane,
      },
    })),

  setHintStep: (hint_step) =>
    set((state) => ({
      ui: {
        ...state.ui,
        hint_step,
      },
    })),

  setOfflinePersona: (offline_persona) =>
    set((state) => ({
      ui: {
        ...state.ui,
        offline_persona,
      },
    })),
}));
