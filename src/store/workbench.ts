import { create } from "zustand";
import { CONFIG } from "@/contracts/config";
import type { ErrorCode } from "@/contracts/errors";
import type {
  ClientWorkbenchState,
  LearnerCognitiveProfile,
  SessionProgress,
  NodeAnalysisView,
  RepoOverviewView,
  EnrichNodeResponse,
  EvaluateFeynmanResponse,
  PersonaMode,
  IngestResponse,
  NodeStateView,
  QuestionState,
  SkillChange,
} from "@/contracts";
import {
  analyzeNodeSafe,
  analyzeOverviewSafe,
  enrichNodeSafe,
  getSessionProgressSafe,
} from "@/lib/api";
import { ERROR_MESSAGES } from "@/lib/messages";

export interface WorkbenchUiSlice {
  pending: Record<string, boolean>;
  errors: Record<string, string | null>;
  last_evaluations: Record<string, EvaluateFeynmanResponse>;
  drafts: Record<string, string>;
  skill_changes: Record<string, SkillChange>;
  presentation_pane: boolean;
  hint_step: number | null;
  offline_persona: PersonaMode;
}

export interface WorkbenchStoreState extends ClientWorkbenchState {
  ui: WorkbenchUiSlice;

  // Actions
  applyIngest: (res: IngestResponse) => void;
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

  setTokensUsed: (tokensUsed: number) => void;
  applyNodeState: (state: NodeStateView) => void;
  applyQuestionState: (nodeId: string, state: QuestionState) => void;
  refreshProgress: () => Promise<void>;
  requestAnalysis: (nodeId: string, retry?: boolean) => void;
  loadRun: (nodeId: string) => Promise<void>;
  reloadRun: (nodeId: string) => Promise<void>;
  openNode: (nodeId: string) => Promise<void>;

  // UI Actions
  setUiPending: (key: string, isPending: boolean) => void;
  setUiError: (key: string, error: string | null) => void;
  setLastEvaluation: (key: string, evaluation: EvaluateFeynmanResponse) => void;
  setDraft: (key: string, text: string) => void;
  setSkillChange: (key: string, change: SkillChange) => void;
  setPresentationPane: (enabled: boolean) => void;
  setHintStep: (step: number | null) => void;
  setOfflinePersona: (persona: PersonaMode) => void;
}

const initialUiSlice: WorkbenchUiSlice = {
  pending: {},
  errors: {},
  last_evaluations: {},
  drafts: {},
  skill_changes: {},
  presentation_pane: false,
  hint_step: null,
  offline_persona: "NEWBIE",
};

/**
 * Thuật toán Kahn sắp xếp thứ tự tô-pô của các node:
 * - Nhiều node cùng sẵn sàng thì lấy `id` tăng dần
 * - Bỏ qua prerequisites trỏ ra ngoài danh sách hoặc trỏ vào chính nó
 * - Node kẹt trong chu trình thì nối vào cuối theo `id` tăng dần
 */
export function topologicalOrder(
  nodes: Array<{ id: string; prerequisites: string[] }> = []
): string[] {
  const nodeMap = new Map<string, { id: string; prerequisites: string[] }>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const node of nodes) {
    const validPrereqs = new Set(
      (node.prerequisites || []).filter(
        (p) => nodeMap.has(p) && p !== node.id
      )
    );

    inDegree.set(node.id, validPrereqs.size);
    for (const p of validPrereqs) {
      adj.get(p)!.push(node.id);
    }
  }

  const ready: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      ready.push(id);
    }
  }
  ready.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const result: string[] = [];
  const visited = new Set<string>();

  while (ready.length > 0) {
    const current = ready.shift()!;
    result.push(current);
    visited.add(current);

    const dependents = adj.get(current) || [];
    for (const dep of dependents) {
      const newDeg = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        ready.push(dep);
        ready.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      }
    }
  }

  if (result.length < nodes.length) {
    const remaining: string[] = [];
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        remaining.push(node.id);
      }
    }
    remaining.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const rem of remaining) {
      result.push(rem);
    }
  }

  return result;
}

// Hàng đợi D-46 nằm trong closure của file (không nằm trong state)
let waiting: string[] = [];
const inFlight = new Set<string>();
let overviewRequested = false;

const PREFETCH_NEXT_NODES = 2; // D-46: 1–2 node kế tiếp

function resetQueue(): void {
  waiting = [];
  inFlight.clear();
  overviewRequested = false;
}

function maybeRequestOverview(
  get: () => WorkbenchStoreState
): void {
  const state = get();
  if (
    !state.session_id ||
    !state.result ||
    !state.result.nodes ||
    state.result.nodes.length === 0
  ) {
    return;
  }
  if (
    overviewRequested ||
    (typeof state.overview === "object" && state.overview !== null)
  ) {
    return;
  }

  // D-83: tổng quan gọi đầu phiên, không chờ analyze-node
  overviewRequested = true;
  const sid = state.session_id;

  void (async () => {
    const res = await analyzeOverviewSafe(sid);
    if (get().session_id !== sid) {
      return;
    }
    if (res?.ok) {
      get().setOverview(res.data.overview);
      get().setTokensUsed(res.data.tokens_used);
    } else if (res) {
      overviewRequested = false;
      const code = res.error?.error?.code as ErrorCode | undefined;
      const rawMsg = res.error?.error?.message;
      const msg =
        (code && ERROR_MESSAGES[code]) ||
        rawMsg ||
        "Lỗi phân tích tổng quan";
      get().setUiError("overview", msg);
    }
  })();
}

function pump(
  get: () => WorkbenchStoreState,
  set: (
    partial:
      | Partial<WorkbenchStoreState>
      | ((state: WorkbenchStoreState) => Partial<WorkbenchStoreState>)
  ) => void
): void {
  const sid = get().session_id;
  if (!sid) return;

  while (inFlight.size < CONFIG.ANALYZE_CONCURRENCY && waiting.length > 0) {
    const nodeId = waiting.shift()!;
    inFlight.add(nodeId);

    void (async () => {
      const res = await analyzeNodeSafe(sid, nodeId);
      inFlight.delete(nodeId);

      if (get().session_id !== sid) {
        return;
      }

      if (res?.ok) {
        const data = res.data;
        const analysisVal = data.analysis ?? "FAILED";
        get().setAnalysis(nodeId, analysisVal);
        get().setTokensUsed(data.tokens_used);
        get().applyNodeState(data.node_state);
        if (data.unlocked_node_ids && data.unlocked_node_ids.length > 0) {
          void get().refreshProgress();
        }
        if (
          get().active_node_id === nodeId &&
          data.analysis !== null &&
          typeof data.analysis === "object"
        ) {
          void get().loadRun(nodeId);
        }
      } else if (res) {
        const code = res.error?.error?.code as ErrorCode | undefined;
        const rawMsg = res.error?.error?.message;
        const msg =
          (code && ERROR_MESSAGES[code]) ||
          rawMsg ||
          "Lỗi phân tích bài học";

        if (code === "ERR_TOKEN_QUOTA_EXCEEDED") {
          get().setAnalysis(nodeId, "FAILED");
          for (const w of waiting) {
            get().setAnalysis(w, "FAILED");
          }
          waiting = [];
        } else {
          get().setAnalysis(nodeId, "FAILED");
        }
        get().setUiError("analyze:" + nodeId, msg);
      }

      pump(get, set);
      maybeRequestOverview(get);
    })();
  }
}

export const useWorkbenchStore = create<WorkbenchStoreState>((set, get) => ({
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

  applyIngest: (res) => {
    resetQueue();
    set((state) => ({
      session_id: res.session_id,
      result: res.result,
      progress: res.progress,
      analyses: { ...res.analyses },
      runs: {},
      overview: null,
      active_node_id: null,
      active_tab: "XRAY",
      active_step: null,
      active_question_index: null,
      last_failed_answers: {},
      ui: {
        ...initialUiSlice,
        offline_persona: state.ui.offline_persona,
      },
    }));
  },

  resetSession: () => {
    resetQueue();
    set((state) => ({
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
      ui: {
        ...initialUiSlice,
        offline_persona: state.ui.offline_persona,
      },
    }));
  },

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
    set((state) => ({
      active_node_id: nodeId,
      active_tab: "XRAY",
      active_step: nodeId ? 1 : null,
      active_question_index: null,
      ui: {
        ...state.ui,
        hint_step: null,
      },
    })),

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

  setTokensUsed: (tokensUsed) =>
    set((state) => {
      if (!state.progress) return {};
      return {
        progress: {
          ...state.progress,
          tokens_used: tokensUsed,
        },
      };
    }),

  applyNodeState: (nodeState) =>
    set((state) => {
      if (!state.progress) return {};
      return {
        progress: {
          ...state.progress,
          nodes: {
            ...state.progress.nodes,
            [nodeState.node_id]: nodeState,
          },
        },
      };
    }),

  applyQuestionState: (nodeId, questionState) =>
    set((state) => {
      const run = state.runs[nodeId];
      if (!run || !run.questions) return {};
      return {
        runs: {
          ...state.runs,
          [nodeId]: {
            ...run,
            questions: run.questions.map((q) =>
              q.question_index === questionState.question_index
                ? { ...q, state: questionState }
                : q
            ),
          },
        },
      };
    }),

  refreshProgress: async () => {
    const sid = get().session_id;
    if (!sid) return;
    const res = await getSessionProgressSafe(sid);
    if (res?.ok && res.data && get().session_id === sid) {
      get().setProgress(res.data.progress);
    }
  },

  requestAnalysis: (nodeId: string, retry = false) => {
    const state = get();
    if (!state.session_id || !state.result) return;
    if ((state.progress?.tokens_used ?? 0) >= CONFIG.SESSION_TOKEN_QUOTA) return;

    const targets: string[] = [];
    const currentAnalysis = state.analyses[nodeId];
    const isAnalysisObj =
      typeof currentAnalysis === "object" && currentAnalysis !== null;

    if (!inFlight.has(nodeId) && (retry || !isAnalysisObj)) {
      targets.push(nodeId);
    }

    const topo = topologicalOrder(state.result.nodes || []);
    const nodeIdx = topo.indexOf(nodeId);
    if (nodeIdx !== -1) {
      let prefetched = 0;
      for (let i = nodeIdx + 1; i < topo.length; i++) {
        if (prefetched >= PREFETCH_NEXT_NODES) break;
        const nextId = topo[i];
        const nextAnalysis = state.analyses[nextId];
        const isFailed = Boolean(state.progress?.nodes?.[nextId]?.analysis_failed);
        const isEmpty =
          !nextAnalysis ||
          (waiting.includes(nextId) && nextAnalysis === "PENDING");
        if (isEmpty && !inFlight.has(nextId) && !isFailed) {
          targets.push(nextId);
          prefetched++;
        }
      }
    }

    // Node đang trong waiting mà không thuộc targets thì xóa nhãn "PENDING" khỏi analyses
    const updatedAnalyses = { ...get().analyses };
    for (const w of waiting) {
      if (!targets.includes(w) && updatedAnalyses[w] === "PENDING") {
        delete updatedAnalyses[w];
      }
    }
    const updatedErrors = { ...get().ui.errors };
    for (const targetId of targets) {
      updatedAnalyses[targetId] = "PENDING";
      delete updatedErrors["analyze:" + targetId];
    }

    waiting = [...targets];

    set((s) => ({
      analyses: updatedAnalyses,
      ui: {
        ...s.ui,
        errors: updatedErrors,
      },
    }));

    maybeRequestOverview(get); // D-46, D-83: tổng quan trước, rồi mới tải trước node
    pump(get, set);
  },

  loadRun: async (nodeId: string) => {
    const state = get();
    const sid = state.session_id;
    if (!sid) return;

    const analysis = state.analyses[nodeId];
    if (typeof analysis !== "object" || analysis === null) return;
    if (state.ui.pending["enrich:" + nodeId]) return;
    if (state.runs[nodeId]) return;

    const ns = state.progress?.nodes?.[nodeId];
    if (!ns) return;

    const isAvailableNoRun =
      ns.status === "AVAILABLE" && (ns.last_run === null || ns.last_run === undefined);
    const isUnfinishedRun = ns.last_run?.finished_at === null;

    if (!isAvailableNoRun && !isUnfinishedRun) return;

    get().setUiPending("enrich:" + nodeId, true);

    try {
      const res = await enrichNodeSafe(sid, nodeId, "LEARN");
      if (get().session_id !== sid) return;

      if (res?.ok) {
        const data = res.data;
        get().setRun(nodeId, data);
        get().setTokensUsed(data.tokens_used);
        get().applyNodeState(data.node_state);

        if (get().active_node_id === nodeId) {
          const pendingQuestion = (data.questions || []).find(
            (q) => !q.state.finished && q.state.ended_by !== "DROPPED"
          );
          get().setActiveQuestionIndex(
            pendingQuestion !== undefined ? pendingQuestion.question_index : null
          );
        }
      } else if (res) {
        const code = res.error?.error?.code as ErrorCode | undefined;
        const rawMsg = res.error?.error?.message;
        const msg =
          (code && ERROR_MESSAGES[code]) ||
          rawMsg ||
          "Lỗi tải câu hỏi bài học";
        get().setUiError("enrich:" + nodeId, msg);
      }
    } finally {
      if (get().session_id === sid) {
        get().setUiPending("enrich:" + nodeId, false);
      }
    }
  },

  reloadRun: async (nodeId: string) => {
    const state = get();
    const sid = state.session_id;
    if (!sid) return;

    if (state.ui.pending["enrich:" + nodeId]) return;

    get().setUiPending("enrich:" + nodeId, true);

    try {
      const res = await enrichNodeSafe(sid, nodeId, "LEARN");
      if (get().session_id !== sid) return;

      if (res?.ok) {
        const data = res.data;
        get().setRun(nodeId, data);
        get().setTokensUsed(data.tokens_used);
        get().applyNodeState(data.node_state);

        if (get().active_node_id === nodeId) {
          const pendingQuestion = (data.questions || []).find(
            (q) => !q.state.finished && q.state.ended_by !== "DROPPED"
          );
          get().setActiveQuestionIndex(
            pendingQuestion !== undefined ? pendingQuestion.question_index : null
          );
        }
      } else if (res) {
        const code = res.error?.error?.code as ErrorCode | undefined;
        const rawMsg = res.error?.error?.message;
        const msg =
          (code && ERROR_MESSAGES[code]) ||
          rawMsg ||
          "Lỗi tải câu hỏi bài học";
        get().setUiError("enrich:" + nodeId, msg);
      }
    } finally {
      if (get().session_id === sid) {
        get().setUiPending("enrich:" + nodeId, false);
      }
    }
  },

  openNode: async (nodeId: string) => {
    if (get().active_node_id === nodeId) {
      return;
    }
    get().setActiveNode(nodeId);
    get().requestAnalysis(nodeId);
    await get().loadRun(nodeId);
  },

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

  setSkillChange: (key, change) =>
    set((state) => ({
      ui: {
        ...state.ui,
        skill_changes: {
          ...state.ui.skill_changes,
          [key]: change,
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
