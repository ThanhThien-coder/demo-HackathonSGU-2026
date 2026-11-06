"use client";
// 30 Mục 7 — Zustand store. Bản sao CHỈ ĐỌC dữ liệu server (D-02): không tự tính BKT, trạng thái, mở khóa, số lượt, đáp án.
import { create } from "zustand";
import { CONFIG } from "@/contracts/config";
import { PERSONAS } from "@/contracts/learner";
import type {
  ClientWorkbenchState, EnrichNodeResponse, EvaluateFeynmanResponse, IngestResponse, LearningSessionSummary, NodeStateView,
  PersonaMode, SkillChange,
} from "@/contracts";
import { api, type Api, type ApiFail } from "@/lib/api";
import { ERROR_MESSAGES } from "@/lib/messages";
import { offlineApi, offlineBoot, offlineBundle, offlineProfile } from "@/lib/offline";
import { similarity, validateAnswerLength } from "@/lib/similarity";
import { topoOrder } from "@/lib/derive";
import { createClient, signInWithGithub, signOut } from "@/lib/supabase/client";

export interface Toast { id: number; text: string; kind: "info" | "error" | "ok" }
export interface UiState {
  auth: "loading" | "anon" | "user";
  user: { name: string | null; avatar: string | null } | null;
  boot_error: ApiFail | null;
  pending: Record<string, boolean>;
  last_evaluations: Record<string, EvaluateFeynmanResponse>;
  last_changes: Record<string, SkillChange>;
  drafts: Record<string, string>;
  sessions: LearningSessionSummary[] | null;
  metrics: boolean;
  presentation: boolean;
  hint_step: number | null;
  offline_persona: PersonaMode;
  toasts: Toast[];
  overview_open: boolean;
  ingest_error: ApiFail | null;
  ingesting: boolean;
  submit_error: ApiFail | null;
  newly_unlocked: string[];
  quota_stopped: boolean;
}

interface Actions {
  init: () => Promise<void>;
  enterOffline: () => Promise<void>;
  leaveOffline: () => Promise<void>;
  scanUrl: (url: string, subdir?: string) => Promise<void>;
  scanZip: (file: File, subdir?: string) => Promise<void>;
  resumeSession: (id: string, restart?: boolean) => Promise<void>;
  resetSession: () => void;
  openNode: (id: string) => void;
  retryAnalysis: (id: string) => void;
  setActiveStep: (n: number | null) => void;
  setTab: (t: ClientWorkbenchState["active_tab"]) => void;
  setActiveQuestion: (i: number | null) => void;
  setDraft: (key: string, v: string) => void;
  submitAnswer: (text: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  reportWrong: (qi: number, note: string) => Promise<boolean>;
  refreshProgress: () => Promise<void>;
  refreshMe: () => Promise<void>;
  changePersona: (m: PersonaMode) => Promise<void>;
  startQuestions: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  setUi: (p: Partial<UiState>) => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  loadSessions: () => Promise<void>;
}

export type Store = ClientWorkbenchState & { ui: UiState } & Actions;

const LAST_KEY = "sf.last_session";
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } },
};

const emptySession = (): Pick<ClientWorkbenchState, "session_id" | "result" | "progress" | "analyses" | "overview" | "runs" | "active_node_id" | "active_tab" | "active_question_index" | "active_step" | "last_failed_answers"> => ({
  session_id: null, result: null, progress: null, analyses: {}, overview: null, runs: {}, active_node_id: null,
  active_tab: "XRAY", active_question_index: null, active_step: null, last_failed_answers: {},
});

const defaultUi = (): UiState => ({
  auth: "loading", user: null, boot_error: null, pending: {}, last_evaluations: {}, last_changes: {}, drafts: {}, sessions: null,
  metrics: false, presentation: false, hint_step: null, offline_persona: "NEWBIE", toasts: [], overview_open: false,
  ingest_error: null, ingesting: false, submit_error: null, newly_unlocked: [], quota_stopped: false,
});

let toastSeq = 1;
let analysisQueue: string[] = [];
let analysisInflight = 0;
let overviewRequested = false;

export const useWorkbench = create<Store>((set, get) => {
  const backend = (): Api => (get().is_offline_mode ? (offlineApi as unknown as Api) : api);
  const setUi = (p: Partial<UiState>) => set((s) => ({ ui: { ...s.ui, ...p } }));
  const pend = (key: string, on: boolean) => set((s) => { const pending = { ...s.ui.pending }; if (on) pending[key] = true; else delete pending[key]; return { ui: { ...s.ui, pending } }; });
  const toast = (text: string, kind: Toast["kind"] = "info") => {
    const id = toastSeq++;
    set((s) => ({ ui: { ...s.ui, toasts: [...s.ui.toasts, { id, text, kind }] } }));
    setTimeout(() => get().dismissToast(id), 5000);
  };

  const applyNodeState = (ns: NodeStateView | undefined) => {
    if (!ns) return;
    set((s) => s.progress ? { progress: { ...s.progress, nodes: { ...s.progress.nodes, [ns.node_id]: ns } } } : {});
  };
  const applyTokens = (n: number) => set((s) => s.progress ? { progress: { ...s.progress, tokens_used: n } } : {});

  const fail = (e: ApiFail, quiet = false) => {
    if (e.code === "ERR_UNAUTHENTICATED") { setUi({ auth: "anon" }); return; }
    if (!quiet) toast(e.message || ERROR_MESSAGES[e.code], "error");
  };

  // ---------- hàng đợi phân tích (D-46) ----------
  const nextNodes = (from: string | null, count: number): string[] => {
    const { result, analyses } = get();
    if (!result) return [];
    const order = topoOrder(result.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone })));
    const start = from ? order.indexOf(from) + 1 : 0;
    return order.slice(start).filter((id) => !analyses[id]).slice(0, count);
  };

  const maybeOverview = async () => {
    const s = get();
    if (s.is_offline_mode || !s.session_id || !s.result || overviewRequested) return;
    const done = s.result.nodes.every((n) => {
      const a = s.analyses[n.id];
      return (a && a !== "PENDING") || s.progress?.nodes[n.id]?.analysis_failed;
    });
    if (!done) return;
    overviewRequested = true;
    setUi({});
    const sid = s.session_id;
    set({ overview: "PENDING" });
    const r = await backend().analyzeOverview(sid);
    if (get().session_id !== sid) return;
    if (r.ok) { set({ overview: r.data.overview }); applyTokens(r.data.tokens_used); }
    else { overviewRequested = !(r.error.code === "ERR_OVERVIEW_NOT_READY"); set({ overview: null }); if (r.error.code !== "ERR_OVERVIEW_NOT_READY") fail(r.error, true); }
  };

  const pump = async () => {
    const sid = get().session_id;
    if (!sid || get().is_offline_mode) return;
    while (analysisInflight < CONFIG.ANALYZE_CONCURRENCY && analysisQueue.length > 0 && !get().ui.quota_stopped) {
      const id = analysisQueue.shift()!;
      const cur = get().analyses[id];
      if (cur && cur !== "PENDING" && cur !== "FAILED") continue;
      analysisInflight++;
      set((s) => ({ analyses: { ...s.analyses, [id]: "PENDING" } }));
      void (async () => {
        const r = await api.analyzeNode(sid, id);
        analysisInflight--;
        if (get().session_id !== sid) return;
        if (r.ok) {
          set((s) => ({ analyses: { ...s.analyses, [id]: r.data.analysis ?? "FAILED" } }));
          applyNodeState(r.data.node_state);
          applyTokens(r.data.tokens_used);
          if (r.data.unlocked_node_ids.length > 0) void get().refreshProgress();
          if (get().active_node_id === id) maybeEnrich(id);
        } else {
          set((s) => ({ analyses: { ...s.analyses, [id]: "FAILED" } }));
          if (r.error.code === "ERR_TOKEN_QUOTA_EXCEEDED") {
            analysisQueue = [];
            setUi({ quota_stopped: true });
            set((s) => ({ analyses: Object.fromEntries(Object.entries(s.analyses).map(([k, v]) => [k, v === "PENDING" ? "FAILED" : v])) as typeof s.analyses }));
            fail(r.error);
          } else fail(r.error, true);
        }
        void pump();
        void maybeOverview();
      })();
    }
  };

  const queueAnalysis = (ids: string[], front = false) => {
    const fresh = ids.filter((id) => { const a = get().analyses[id]; return !a || a === "FAILED"; });
    analysisQueue = front ? [...fresh, ...analysisQueue.filter((x) => !fresh.includes(x))] : [...analysisQueue, ...fresh.filter((x) => !analysisQueue.includes(x))];
    void pump();
  };

  // ---------- enrich (7.4) ----------
  const maybeEnrich = (id: string) => {
    const s = get();
    if (!s.session_id) return;
    const a = s.analyses[id];
    const ns = s.progress?.nodes[id];
    if (!a || a === "PENDING" || a === "FAILED" || !ns) return;
    const open = s.runs[id] && !s.runs[id].questions.every((q) => q.state.finished);
    if (open || s.ui.pending[`enrich:${id}`]) return;
    const need = (ns.status === "AVAILABLE" && !ns.last_run) || (ns.last_run && ns.last_run.finished_at === null);
    if (!need) return;
    void runEnrich(id);
  };

  const runEnrich = async (id: string) => {
    const sid = get().session_id;
    if (!sid) return;
    pend(`enrich:${id}`, true);
    const r = await backend().enrichNode(sid, id);
    pend(`enrich:${id}`, false);
    if (get().session_id !== sid) return;
    if (!r.ok) {
      if (r.error.code === "ERR_ANALYSIS_NOT_READY") { queueAnalysis([id], true); return; }
      setUi({ submit_error: r.error });
      fail(r.error, r.error.code === "ERR_NODE_NOT_AVAILABLE");
      return;
    }
    setUi({ submit_error: null });
    set((s) => ({ runs: { ...s.runs, [id]: r.data }, active_question_index: s.active_node_id === id ? firstOpen(r.data) : s.active_question_index }));
    applyNodeState(r.data.node_state);
    applyTokens(r.data.tokens_used);
  };

  const firstOpen = (run: EnrichNodeResponse): number | null => run.questions.find((q) => !q.state.finished)?.question_index ?? null;

  const applyIngest = (r: IngestResponse, opts: { offline?: boolean } = {}) => {
    analysisQueue = []; analysisInflight = 0; overviewRequested = false;
    set({
      ...emptySession(), session_id: r.session_id, result: r.result, progress: r.progress, analyses: { ...r.analyses }, runs: {},
      is_offline_mode: !!opts.offline,
    });
    setUi({ ingesting: false, ingest_error: null, overview_open: false, quota_stopped: false, last_evaluations: {}, last_changes: {}, newly_unlocked: [] });
    if (!opts.offline) ls.set(LAST_KEY, r.session_id);
    if (!opts.offline) { queueAnalysis(nextNodes(null, 2)); void maybeOverview(); }
  };

  const doIngest = async (call: () => Promise<{ ok: true; data: IngestResponse } | { ok: false; error: ApiFail }>, label: string) => {
    setUi({ ingesting: true, ingest_error: null });
    const r = await call();
    if (!r.ok) { setUi({ ingesting: false, ingest_error: r.error }); if (r.error.code === "ERR_SESSION_NOT_FOUND") ls.del(LAST_KEY); return; }
    applyIngest(r.data);
    setUi({ overview_open: true });
    if (r.data.resumed) {
      const done = Object.values(r.data.progress.nodes).filter((n) => n.status === "COMPLETED").length;
      toast(`Đã mở lại ${r.data.result.repo_name} — ${done}/${r.data.result.nodes.length} node`, "ok");
    }
    void label;
  };

  return {
    ...emptySession(),
    profile: null, is_offline_mode: false, server_clock_offset_ms: 0,
    ui: defaultUi(),

    toast, dismissToast: (id) => set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })),
    setUi,
    setActiveStep: (n) => set({ active_step: n }),
    setTab: (t) => set({ active_tab: t }),
    setActiveQuestion: (i) => set({ active_question_index: i }),
    setDraft: (key, v) => set((s) => ({ ui: { ...s.ui, drafts: { ...s.ui.drafts, [key]: v } } })),

    init: async () => {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (params?.get("offline") === "1") { await get().enterOffline(); return; }
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setUi({ auth: "anon" }); return; }
      const meta = data.session.user.user_metadata ?? {};
      setUi({ auth: "user", user: { name: (meta.full_name ?? meta.user_name ?? null) as string | null, avatar: (meta.avatar_url ?? null) as string | null }, boot_error: null });
      const me = await api.getMe();
      if (!me.ok) { setUi({ boot_error: me.error }); return; }
      set({ profile: me.data.profile, server_clock_offset_ms: me.data.server_now - Date.now() });
      await get().loadSessions();
      const last = ls.get(LAST_KEY);
      const cand = get().ui.sessions?.find((x) => x.session_id === last && x.can_resume);
      if (cand && !get().session_id) await doIngest(() => api.ingestSession(cand.session_id), "resume");
    },

    loadSessions: async () => {
      const r = await api.getSessions();
      if (r.ok) setUi({ sessions: r.data.sessions });
    },

    enterOffline: async () => {
      setUi({ ingesting: true });
      const b = await offlineBoot(get().ui.offline_persona);
      if (!b.ok) { setUi({ ingesting: false }); toast(b.message, "error"); return; }
      set({ ...emptySession(), is_offline_mode: true, profile: b.profile, server_clock_offset_ms: 0 });
      applyIngest(b.ingest, { offline: true });
      set({ is_offline_mode: true, overview: offlineBundle()?.overview ?? null }); // bundle đã có bản phân tích mọi node ⇒ giai đoạn "học hết"
      setUi({ auth: "user", overview_open: true, boot_error: null });
    },

    leaveOffline: async () => {
      set({ ...emptySession(), is_offline_mode: false, profile: null });
      setUi({ auth: "loading" });
      await get().init();
    },

    scanUrl: (url, subdir) => doIngest(() => api.ingestUrl(url.trim(), subdir), "url"),
    scanZip: (file, subdir) => doIngest(() => api.ingestZip(file, subdir), "zip"),
    resumeSession: (id, restart = false) => doIngest(() => api.ingestSession(id, restart), "resume"),

    resetSession: () => {
      analysisQueue = []; analysisInflight = 0; overviewRequested = false;
      ls.del(LAST_KEY);
      set({ ...emptySession() });
      setUi({ overview_open: false, last_evaluations: {}, last_changes: {} });
      void get().loadSessions();
    },

    openNode: (id) => {
      const s = get();
      const ns = s.progress?.nodes[id];
      if (!ns || ns.status === "LOCKED") return; // 0 request
      set({ active_node_id: id, active_step: 1, active_question_index: null, active_tab: "XRAY" });
      setUi({ hint_step: null, overview_open: false, submit_error: null });
      if (!s.is_offline_mode) {
        const a = s.analyses[id];
        if (!a || a === "FAILED") queueAnalysis([id, ...nextNodes(id, 2)], true);
        else queueAnalysis(nextNodes(id, 2), false);
      }
      maybeEnrich(id);
      const run = get().runs[id];
      if (run) set({ active_question_index: firstOpen(run) ?? run.questions[0]?.question_index ?? null });
    },

    retryAnalysis: (id) => { set((s) => ({ analyses: { ...s.analyses, [id]: "FAILED" } })); queueAnalysis([id], true); },

    startQuestions: () => {
      const id = get().active_node_id;
      if (!id) return;
      set({ active_tab: "FEYNMAN" });
      if (!get().runs[id]) maybeEnrich(id);
    },

    refreshProgress: async () => {
      const sid = get().session_id;
      if (!sid) return;
      const r = await backend().getProgress(sid);
      if (get().session_id !== sid) return;
      if (!r.ok) { fail(r.error, true); return; }
      const before = get().progress?.nodes ?? {};
      const newly = Object.values(r.data.progress.nodes).filter((n) => n.status !== "LOCKED" && before[n.node_id]?.status === "LOCKED").map((n) => n.node_id);
      set({ progress: r.data.progress });
      if (newly.length) { setUi({ newly_unlocked: newly }); setTimeout(() => setUi({ newly_unlocked: [] }), 1500); }
    },

    refreshMe: async () => {
      if (get().is_offline_mode) { set({ profile: offlineProfile() }); return; }
      const r = await api.getMe();
      if (r.ok) set({ profile: r.data.profile, server_clock_offset_ms: r.data.server_now - Date.now() });
    },

    submitAnswer: async (text) => {
      const s = get();
      const id = s.active_node_id;
      const run = id ? s.runs[id] : null;
      const qi = s.active_question_index;
      if (!s.session_id || !run || qi === null) return;
      const q = run.questions.find((x) => x.question_index === qi);
      if (!q || q.state.finished) return;
      const key = `${run.run_id}:${qi}`;
      const bad = validateAnswerLength(text);
      if (bad) { setUi({ submit_error: { code: bad, message: ERROR_MESSAGES[bad], retryable: false } }); return; }
      const last = s.last_failed_answers[key];
      if (last && similarity(text, last) >= CONFIG.ANSWER_DUPLICATE_SIMILARITY) {
        setUi({ submit_error: { code: "ERR_ANSWER_DUPLICATE", message: ERROR_MESSAGES.ERR_ANSWER_DUPLICATE, retryable: false } });
        return;
      }
      if ((s.progress?.tokens_used ?? 0) >= CONFIG.SESSION_TOKEN_QUOTA && !s.is_offline_mode) return;
      setUi({ submit_error: null });
      pend(`submit:${key}`, true);
      const started = Date.now();
      const r = await backend().evaluate({ session_id: s.session_id, run_id: run.run_id, question_index: qi, student_answer: text, attempt_number: q.state.attempts_used + 1 });
      const rest = CONFIG.SUBMIT_DEBOUNCE_MS - (Date.now() - started);
      if (rest > 0) await new Promise((res) => setTimeout(res, rest));
      pend(`submit:${key}`, false);
      if (get().session_id !== s.session_id) return;
      if (!r.ok) {
        const e = r.error;
        if (e.code === "ERR_ATTEMPT_OUT_OF_SYNC" || e.code === "ERR_QUESTION_FINISHED") {
          toast(ERROR_MESSAGES.ERR_ATTEMPT_OUT_OF_SYNC, "info");
          if (id) { set((st) => { const runs = { ...st.runs }; delete runs[id]; return { runs }; }); void runEnrich(id); }
          return;
        }
        setUi({ submit_error: e });
        if (e.code === "ERR_TOKEN_QUOTA_EXCEEDED") toast(e.message, "error");
        return;
      }
      const d = r.data;
      set((st) => {
        const runs = { ...st.runs };
        const cur = runs[run.node_id];
        if (cur) runs[run.node_id] = { ...cur, questions: cur.questions.map((x) => (x.question_index === qi ? { ...x, state: d.question } : x)), node_state: d.node_state };
        return {
          runs,
          last_failed_answers: d.is_passed ? st.last_failed_answers : { ...st.last_failed_answers, [key]: text },
          ui: { ...st.ui, last_evaluations: { ...st.ui.last_evaluations, [key]: d }, last_changes: d.skill_change ? { ...st.ui.last_changes, [key]: d.skill_change } : st.ui.last_changes, hint_step: d.follow_up?.type === "CODE_POINTER" ? d.follow_up.step_index : st.ui.hint_step },
          active_step: d.follow_up?.type === "CODE_POINTER" && d.follow_up.step_index ? d.follow_up.step_index : st.active_step,
        };
      });
      applyNodeState(d.node_state);
      applyTokens(d.tokens_used);
      if (d.skill_change) void get().refreshMe();
      if (d.unlocked_node_ids.length > 0 || d.node_state.status !== "AVAILABLE") void get().refreshProgress();
    },

    skipQuestion: async () => {
      const s = get();
      const id = s.active_node_id;
      const run = id ? s.runs[id] : null;
      const qi = s.active_question_index;
      if (!s.session_id || !run || qi === null) return;
      const key = `${run.run_id}:${qi}`;
      pend(`submit:${key}`, true);
      const r = await backend().reveal({ session_id: s.session_id, run_id: run.run_id, question_index: qi });
      pend(`submit:${key}`, false);
      if (!r.ok) { fail(r.error); return; }
      set((st) => {
        const runs = { ...st.runs };
        const cur = runs[run.node_id];
        if (cur) runs[run.node_id] = { ...cur, questions: cur.questions.map((x) => (x.question_index === qi ? { ...x, state: r.data.question } : x)), node_state: r.data.node_state };
        return { runs, ui: { ...st.ui, last_changes: { ...st.ui.last_changes, [key]: r.data.skill_change } } };
      });
      applyNodeState(r.data.node_state);
      void get().refreshMe();
      if (r.data.unlocked_node_ids.length > 0 || r.data.node_state.status !== "AVAILABLE") void get().refreshProgress();
    },

    reportWrong: async (qi, note) => {
      const s = get();
      const id = s.active_node_id;
      const run = id ? s.runs[id] : null;
      if (!s.session_id || !run || s.is_offline_mode) return false;
      const r = await api.reportWrong({ session_id: s.session_id, run_id: run.run_id, question_index: qi, note });
      if (!r.ok) {
        fail(r.error);
        if (r.error.code === "ERR_REPORT_NOT_ALLOWED" && id) { set((st) => { const runs = { ...st.runs }; delete runs[id]; return { runs }; }); void runEnrich(id); }
        return false;
      }
      const key = `${run.run_id}:${qi}`;
      set((st) => {
        const runs = { ...st.runs };
        const cur = runs[run.node_id];
        if (cur) runs[run.node_id] = { ...cur, questions: cur.questions.map((x) => (x.question_index === qi ? { ...x, state: r.data.question } : x)), node_state: r.data.node_state };
        return { runs, ui: { ...st.ui, last_changes: r.data.skill_change ? { ...st.ui.last_changes, [key]: r.data.skill_change } : st.ui.last_changes } };
      });
      applyNodeState(r.data.node_state);
      toast("Đã ghi nhận — nhóm sẽ xem lại câu này", "ok");
      if (r.data.skill_change) void get().refreshMe();
      void get().refreshProgress();
      return true;
    },

    changePersona: async (m) => {
      if (get().is_offline_mode) {
        setUi({ offline_persona: m });
        const b = await offlineBoot(m);
        if (!b.ok) { toast(b.message, "error"); return; }
        set({ profile: b.profile, runs: {}, active_question_index: null });
        applyIngest(b.ingest, { offline: true });
        set({ is_offline_mode: true, overview: offlineBundle()?.overview ?? null });
        return;
      }
      const r = await api.setPersona(m);
      if (!r.ok) { if (r.error.code === "ERR_DEMO_MODE_DISABLED") toast(r.error.message, "error"); else fail(r.error); return; }
      set({ profile: r.data.profile, server_clock_offset_ms: r.data.server_now - Date.now() });
    },

    signIn: async () => { await signInWithGithub("/"); },
    logout: async () => {
      await signOut();
      ls.del(LAST_KEY);
      set({ ...emptySession(), profile: null });
      setUi({ auth: "anon", user: null, sessions: null });
    },
    deleteAccount: async () => {
      const r = await api.deleteMe();
      if (!r.ok) { fail(r.error); return; }
      try { Object.keys(localStorage).filter((k) => k.startsWith("sf.")).forEach((k) => localStorage.removeItem(k)); } catch { /* bỏ qua */ }
      await get().logout();
      if (typeof window !== "undefined") window.location.reload();
    },
  };
});

export const PERSONA_LIST = Object.entries(PERSONAS) as Array<[PersonaMode, (typeof PERSONAS)[PersonaMode]]>;
