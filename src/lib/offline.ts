// 30 Mục 8 — chế độ Offline: 0 API, 0 Supabase. Dữ liệu từ public/demo/mock_bundle.json (OfflineMockBundle).
// BKT, màu node, mở khóa tính lại trên trình duyệt bằng bkt-engine / plan / derive; không ghi Postgres.
import { CONFIG } from "@/contracts/config";
import { PERSONAS } from "@/contracts/learner";
import { SWE_SKILLS } from "@/contracts/base";
import type {
  CognitiveSkillState, EnrichNodeResponse, EvaluateFeynmanRequest, EvaluateFeynmanResponse, IngestResponse, LearnerCognitiveProfile,
  MeResponse, NodeRunView, NodeStateView, OfflineMockBundle as OfflineMockBundleType, PersonaMode, ProgressResponse, QuestionState,
  RevealRequest, RevealResponse, SessionProgress,
} from "@/contracts";
import { computeSkillChange, outcomeOf, overallTier } from "./bkt-engine";
import { ERROR_MESSAGES } from "./messages";
import { deriveNodeStates, type ProgressRow } from "./derive";
import { nodeStatusFromRuns } from "./plan";
import { similarity, validateAnswerLength } from "./similarity";

type Fail = { ok: false; error: { code: "ERR_AI_UNAVAILABLE" | "ERR_QUESTION_FINISHED" | "ERR_NODE_NOT_AVAILABLE" | "ERR_ANSWER_TOO_SHORT" | "ERR_ANSWER_TOO_LONG" | "ERR_ATTEMPT_OUT_OF_SYNC" | "ERR_SESSION_NOT_FOUND"; message: string; retryable: boolean } };
type Ok<T> = { ok: true; data: T };

let bundle: OfflineMockBundleType | null = null;
let persona: PersonaMode = "NEWBIE";
let profile: LearnerCognitiveProfile | null = null;
let rows: ProgressRow[] = [];
let runs = new Map<string, EnrichNodeResponse>(); // node_id ⇒ run đang có (câu hỏi có state, không có đáp án khi chưa xong)
let finished = new Set<string>();
const attemptsLog = new Map<string, string>();

const fail = (code: Fail["error"]["code"], message?: string): Fail => ({ ok: false, error: { code, message: message ?? ERROR_MESSAGES[code], retryable: false } });
const runKey = (nodeId: string) => `${nodeId}:LEARN:${persona}`;

export const offlineAvailable = () => bundle !== null;
export const offlineProfile = (): LearnerCognitiveProfile => profile!;
export const offlineBundle = () => bundle;

function buildProfile(p: PersonaMode, now: number): LearnerCognitiveProfile {
  const cfg = PERSONAS[p];
  const skills: LearnerCognitiveProfile["skills"] = {};
  for (const s of SWE_SKILLS) {
    skills[s] = { skill: s, p_mastery: cfg.initial_p_mastery, last_practiced_at: now - cfg.days_idle * CONFIG.MS_PER_DAY, practice_count: 1, correct_count: 1 };
  }
  return { user_id: "offline", display_name: "Chế độ Offline", skills, overall_tier: overallTier(skills, now) };
}

function skeleton() {
  return bundle!.ingest.result.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone }));
}

const runView = (r: EnrichNodeResponse): NodeRunView => ({
  run_id: r.run_id, node_id: r.node_id, mode: r.mode, started_at: 0, finished_at: finished.has(r.node_id) ? 1 : null, questions: r.questions.map((q) => q.state),
});

function nodeState(nodeId: string): NodeStateView {
  const d = deriveNodeStates(skeleton(), rows)[nodeId];
  const r = runs.get(nodeId);
  return { ...d, last_run: r ? runView(r) : null };
}

function progress(): SessionProgress {
  const derived = deriveNodeStates(skeleton(), rows);
  const nodes: SessionProgress["nodes"] = {};
  for (const id of Object.keys(derived)) nodes[id] = { ...derived[id], last_run: runs.get(id) ? runView(runs.get(id)!) : null };
  return { session_id: bundle!.ingest.session_id, nodes, tokens_used: 0 };
}

export async function offlineBoot(p: PersonaMode): Promise<{ ok: true; profile: LearnerCognitiveProfile; ingest: IngestResponse } | { ok: false; message: string }> {
  if (!bundle) {
    try {
      const res = await fetch("/demo/mock_bundle.json", { cache: "no-store" });
      if (!res.ok) throw new Error("http");
      bundle = (await res.json()) as OfflineMockBundleType;
    } catch {
      return { ok: false, message: "Không đọc được gói demo Offline (public/demo/mock_bundle.json)." };
    }
  }
  persona = p;
  const now = Date.now();
  profile = buildProfile(p, now);
  rows = [];
  runs = new Map();
  finished = new Set();
  attemptsLog.clear();
  return { ok: true, profile, ingest: { ...bundle.ingest, progress: progress(), resumed: false, from_cache: true } };
}

function toRunQuestions(nodeId: string): EnrichNodeResponse | null {
  const src = bundle!.enrich[runKey(nodeId)];
  if (!src) return null;
  // bản sao, mọi câu chưa xong và không có đáp án (INV-07)
  return {
    ...src,
    questions: src.questions.map((q) => ({ ...q, state: { ...q.state, attempts_used: 0, finished: false, outcome: null, ended_by: q.state.ended_by === "DROPPED" ? "DROPPED" : null, disputed: false, reveal: null } })),
  };
}

const allDone = (r: EnrichNodeResponse) => r.questions.every((q) => q.state.finished);

function finalizeIfDone(nodeId: string): string[] {
  const r = runs.get(nodeId);
  if (!r || !allDone(r) || finished.has(nodeId)) return [];
  const before = deriveNodeStates(skeleton(), rows);
  finished.add(nodeId);
  const status = nodeStatusFromRuns([{
    mode: "LEARN", started_at: 0, finished_at: 1,
    questions: r.questions.map((q) => ({ question_index: q.question_index, skill: q.skill, focus: q.focus, outcome: q.state.ended_by === "DROPPED" ? null : q.state.outcome, ended_by: q.state.ended_by, disputed: q.state.disputed })),
  }]);
  if (status) rows = [...rows.filter((x) => x.node_id !== nodeId), { node_id: nodeId, status, analysis_failed: false }];
  const after = deriveNodeStates(skeleton(), rows);
  return Object.values(after).filter((n) => n.status !== "LOCKED" && before[n.node_id]?.status === "LOCKED").map((n) => n.node_id).sort();
}

function applyFinish(nodeId: string, qi: number, outcome: "PASS_FIRST" | "PASS_AFTER_HINT" | "FAILED", endedBy: "ANSWER" | "SKIP") {
  const r = runs.get(nodeId)!;
  const q = r.questions.find((x) => x.question_index === qi)!;
  const reveal = bundle!.reveals[`${runKey(nodeId)}:${qi}`]?.question.reveal
    ?? bundle!.scripted_answers[`${runKey(nodeId)}:${qi}:1`]?.[0]?.response.question.reveal ?? null;
  const { next, change } = computeSkillChange(q.skill, profile!.skills[q.skill], outcome, Date.now());
  profile = { ...profile!, skills: { ...profile!.skills, [q.skill]: next as CognitiveSkillState } };
  profile = { ...profile, overall_tier: overallTier(profile.skills, Date.now()) };
  q.state = { ...q.state, finished: true, outcome, ended_by: endedBy, reveal };
  return change;
}

export const offlineApi = {
  getMe: async (): Promise<Ok<MeResponse>> => ({ ok: true, data: { profile: profile!, server_now: Date.now() } }),
  getProgress: async (): Promise<Ok<ProgressResponse>> => ({ ok: true, data: { progress: progress() } }),
  analyzeOverview: async () => fail("ERR_OVERVIEW_NOT_READY" as never),
  analyzeNode: async () => fail("ERR_AI_UNAVAILABLE", "Chế độ Offline không gọi AI."),

  enrichNode: async (_sid: string, nodeId: string): Promise<Ok<EnrichNodeResponse> | Fail> => {
    const existing = runs.get(nodeId);
    if (existing) return { ok: true, data: { ...existing, node_state: nodeState(nodeId) } };
    if (nodeState(nodeId).status !== "AVAILABLE") return fail("ERR_NODE_NOT_AVAILABLE");
    const r = toRunQuestions(nodeId);
    if (!r) return fail("ERR_AI_UNAVAILABLE", "Kịch bản offline không có câu hỏi cho node / persona này.");
    runs.set(nodeId, r);
    return { ok: true, data: { ...r, node_state: nodeState(nodeId) } };
  },

  evaluate: async (b: EvaluateFeynmanRequest): Promise<Ok<EvaluateFeynmanResponse> | Fail> => {
    const bad = validateAnswerLength(b.student_answer);
    if (bad) return fail(bad);
    const nodeId = [...runs.entries()].find(([, r]) => r.run_id === b.run_id)?.[0];
    if (!nodeId) return fail("ERR_SESSION_NOT_FOUND");
    const r = runs.get(nodeId)!;
    const q = r.questions.find((x) => x.question_index === b.question_index);
    if (!q) return fail("ERR_SESSION_NOT_FOUND");
    if (q.state.finished) return fail("ERR_QUESTION_FINISHED");
    if (b.attempt_number !== q.state.attempts_used + 1) return fail("ERR_ATTEMPT_OUT_OF_SYNC");
    const opts = bundle!.scripted_answers[`${runKey(nodeId)}:${b.question_index}:${b.attempt_number}`] ?? [];
    let best: (typeof opts)[number] | null = null;
    let bestSim = 0;
    for (const o of opts) { const s = similarity(b.student_answer, o.answer); if (s > bestSim) { bestSim = s; best = o; } }
    if (!best || bestSim < CONFIG.ANSWER_DUPLICATE_SIMILARITY) return fail("ERR_AI_UNAVAILABLE", "Chế độ offline chỉ chấm được câu trả lời trong kịch bản."); // không tính lượt
    const scripted = best.response;
    q.state = { ...q.state, attempts_used: q.state.attempts_used + 1 };
    attemptsLog.set(`${b.run_id}:${b.question_index}`, b.student_answer);
    let change = null;
    let unlocked: string[] = [];
    const passed = scripted.is_passed;
    if (passed || q.state.attempts_used >= CONFIG.MAX_ATTEMPTS_PER_QUESTION) {
      change = applyFinish(nodeId, b.question_index, outcomeOf(passed, q.state.attempts_used), "ANSWER");
      unlocked = finalizeIfDone(nodeId);
    }
    const state: QuestionState = q.state;
    return {
      ok: true,
      data: { ...scripted, question_index: b.question_index, attempt_number: b.attempt_number, question: state, follow_up: state.finished ? null : scripted.follow_up,
        skill_change: change, node_state: nodeState(nodeId), unlocked_node_ids: unlocked, tokens_used: 0 },
    };
  },

  reveal: async (b: RevealRequest): Promise<Ok<RevealResponse> | Fail> => {
    const nodeId = [...runs.entries()].find(([, r]) => r.run_id === b.run_id)?.[0];
    if (!nodeId) return fail("ERR_SESSION_NOT_FOUND");
    const q = runs.get(nodeId)!.questions.find((x) => x.question_index === b.question_index);
    if (!q) return fail("ERR_SESSION_NOT_FOUND");
    if (q.state.finished) return fail("ERR_QUESTION_FINISHED");
    const change = applyFinish(nodeId, b.question_index, "FAILED", "SKIP");
    const unlocked = finalizeIfDone(nodeId);
    return { ok: true, data: { question: q.state, skill_change: change, node_state: nodeState(nodeId), unlocked_node_ids: unlocked } };
  },
};
