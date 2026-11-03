/**
 * Test các API còn lại (A11): POST /api/report-wrong (03 Mục 6.4, D-22), POST /api/demo/persona (03 Mục 6.7),
 * GET /api/sessions/{id}/history (03 Mục 2 dòng 4). Mock Postgres bằng DB giả trong RAM có rollback transaction.
 * Số kỳ vọng: 50 Mục 3.2 B4/B5 + 3.4 D18 (0.25 → 0.0791 → hoàn về 0.25), 22 T-REV, T-PER.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIG,
  PERSONAS,
  SWE_SKILLS,
  type ApiError,
  type GraphSkeletonNode,
  type HistoryResponse,
  type PersonaResponse,
  type ReportWrongResponse,
  type RunQuestion,
  type StaticEngineResult,
} from "@/contracts";
import { computeSkillChange, getDecayedMastery } from "@/lib/bkt-engine";
import { deriveNodeStates } from "@/lib/derive";
import shopApiFixture from "@/server/engine/__fixtures__/shop-api.json";
import type { SessionRecord } from "@/server/session";
import { POST as reportPOST } from "../report-wrong/route";
import { POST as personaPOST } from "../demo/persona/route";
import { GET as historyGET } from "../sessions/[id]/history/route";

// ======================= Mock =======================

const { mockGetUser, mockSql, mockTx } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSql: vi.fn(),
  mockTx: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/server/db", () => ({
  sql: mockSql,
  db: { sql: mockSql, tx: mockTx },
}));

// ======================= Dữ liệu =======================

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const RUN_ID = "44444444-4444-4444-8444-444444444444";
const N1 = "slice-register";
const N2 = "slice-profile";
const N4 = "slice-cart";
const T0 = Date.UTC(2026, 10, 7, 12, 0, 0);

const shopApi = shopApiFixture as unknown as StaticEngineResult;
const SKELETON: GraphSkeletonNode[] = shopApi.nodes.map((n) => ({
  node_id: n.id,
  title: n.title,
  prerequisites: n.prerequisites,
  is_capstone: n.is_capstone,
}));

// 50 Mục 3.2 — B4: Q1 AUTH_SECURITY trượt 3 lần ⇒ F (0.25 → 0.0791); B5: Q2 HTTP_ROUTING PF
const B4 = computeSkillChange("AUTH_SECURITY", undefined, "FAILED", T0);

function n2Questions(): RunQuestion[] {
  const common = {
    disputed: false,
    last_answer: "Middleware kiểm tra user có tồn tại không.",
    reference_answer: "authMiddleware dùng jwt.verify với JWT_SECRET viết thẳng trong code.",
    must_have_points: ["Khóa JWT_SECRET viết thẳng trong code"],
    fix: "Đọc JWT_SECRET từ biến môi trường.",
    feynman_question: "Vì sao ai đọc được code cũng giả được token?",
    step_indices: [1],
  };
  return [
    {
      ...common,
      question_index: 1,
      skill: "AUTH_SECURITY",
      tier: "NOVICE",
      focus: "WEAKNESS",
      attempts_used: CONFIG.MAX_ATTEMPTS_PER_QUESTION,
      finished: true,
      outcome: "FAILED",
      ended_by: "ANSWER",
      p_before: B4.change.p_before,
      p_after: B4.change.p_after,
    },
    {
      ...common,
      question_index: 2,
      skill: "HTTP_ROUTING",
      tier: "PRACTITIONER",
      focus: "ARCHITECTURE",
      attempts_used: 1,
      finished: true,
      outcome: "PASS_FIRST",
      ended_by: "ANSWER",
      p_before: 0.5767,
      p_after: 0.8413,
    },
  ];
}

// ======================= DB giả =======================

interface FakeRun {
  id: string;
  session_id: string;
  node_id: string;
  mode: "LEARN";
  questions: RunQuestion[];
  steps: unknown[];
  forbidden_external_keywords: string[];
  started_at: Date;
  finished_at: Date | null;
}
interface FakeSkill {
  user_id: string;
  skill: string;
  p_mastery: number;
  last_practiced_at: Date;
  practice_count: number;
  correct_count: number;
}
interface FakeState {
  profiles: Map<string, { user_id: string; display_name: string | null }>;
  sessions: Map<string, SessionRecord>;
  runs: Map<string, FakeRun>;
  progress: Map<string, { session_id: string; node_id: string; status: "AVAILABLE" | "COMPLETED" | "FAILED" | null; analysis_failed: boolean }>;
  skills: Map<string, FakeSkill>;
  disputes: Array<{ user_id: string; run_id: string; question_index: number; note: string }>;
  attempts: Array<{ id: number; run_id: string; question_index: number; attempt_number: number; skill: string; core_accuracy: number; is_passed: boolean; intent: string; student_answer: string; points_covered: boolean[]; created_at: Date }>;
}

let state: FakeState;
let failWhen: ((text: string) => boolean) | null;

async function fakeSql(strings: TemplateStringsArray, ...v: unknown[]): Promise<unknown[]> {
  const text = strings.join("?").replace(/\s+/g, " ").trim();
  if (failWhen?.(text)) throw Object.assign(new Error("connection terminated"), { code: "57P01" });

  // verifyRunOwnership
  if (text.includes("FROM node_runs r JOIN learning_sessions s")) {
    const [runId, userId] = v as [string, string];
    const run = state.runs.get(runId);
    const s = run ? state.sessions.get(run.session_id) : undefined;
    if (!run || !s || s.user_id !== userId) return [];
    const r = structuredClone(run);
    return [{ ...structuredClone(s), ...r, run_id: r.id }];
  }
  // verifySessionOwnership
  if (text.includes("FROM learning_sessions WHERE id = ? AND user_id = ?")) {
    const s = state.sessions.get(v[0] as string);
    return s && s.user_id === v[1] ? [structuredClone(s)] : [];
  }
  if (text.includes("FROM node_runs WHERE id = ? FOR UPDATE")) {
    const run = state.runs.get(v[0] as string);
    return run ? [structuredClone(run)] : [];
  }
  if (text.startsWith("UPDATE node_runs SET questions")) {
    state.runs.get(v[1] as string)!.questions = JSON.parse(v[0] as string);
    return [];
  }
  if (text.includes("FROM skill_states") && text.includes("FOR UPDATE")) {
    const row = state.skills.get(`${v[0]}|${v[1]}`);
    return row ? [structuredClone(row)] : [];
  }
  if (text.startsWith("UPDATE skill_states SET p_mastery")) {
    const [p, pc, userId, skill] = v as [number, number, string, string];
    const row = state.skills.get(`${userId}|${skill}`)!;
    row.p_mastery = p;
    row.practice_count = pc;
    return [];
  }
  if (text.startsWith("INSERT INTO skill_states") && text.includes("DO UPDATE")) {
    const [user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count] = v as [string, string, number, Date, number, number];
    if (!state.profiles.has(user_id)) throw Object.assign(new Error("violates foreign key"), { code: "23503" });
    state.skills.set(`${user_id}|${skill}`, { user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count });
    return [];
  }
  if (text.startsWith("INSERT INTO dispute_reports")) {
    const [user_id, run_id, question_index, note] = v as [string, string, number, string];
    if (note.length > CONFIG.REPORT_NOTE_MAX_CHARS) throw Object.assign(new Error("check violation"), { code: "23514" });
    state.disputes.push({ user_id, run_id, question_index, note });
    return [];
  }
  if (text.startsWith("SELECT graph_skeleton FROM learning_sessions")) {
    const s = state.sessions.get(v[0] as string);
    return s ? [{ graph_skeleton: structuredClone(s.graph_skeleton) }] : [];
  }
  if (text.startsWith("SELECT node_id, status, analysis_failed FROM node_progress")) {
    return [...state.progress.values()]
      .filter((r) => r.session_id === v[0])
      .map((r) => ({ node_id: r.node_id, status: r.status, analysis_failed: r.analysis_failed }));
  }
  if (text.startsWith("INSERT INTO node_progress")) {
    const [session_id, node_id, status] = v as [string, string, "COMPLETED" | "FAILED"];
    const old = state.progress.get(`${session_id}|${node_id}`);
    state.progress.set(`${session_id}|${node_id}`, { session_id, node_id, status, analysis_failed: old?.analysis_failed ?? false });
    return [];
  }
  if (text.startsWith("INSERT INTO profiles")) {
    const [user_id, display_name] = v as [string, string | null];
    if (!state.profiles.has(user_id)) state.profiles.set(user_id, { user_id, display_name });
    return [];
  }
  if (text.startsWith("SELECT display_name FROM profiles")) {
    const p = state.profiles.get(v[0] as string);
    return p ? [{ display_name: p.display_name }] : [];
  }
  if (text.includes("FROM question_attempts a JOIN node_runs r")) {
    return state.attempts
      .filter((a) => state.runs.get(a.run_id)?.session_id === v[0])
      .sort((x, y) => x.created_at.getTime() - y.created_at.getTime() || x.id - y.id)
      .map((a) => {
        const r = state.runs.get(a.run_id)!;
        return {
          node_id: r.node_id,
          mode: r.mode,
          question_index: a.question_index,
          skill: a.skill,
          attempt_number: a.attempt_number,
          core_accuracy: a.core_accuracy,
          is_passed: a.is_passed,
          intent: a.intent,
          student_answer: a.student_answer,
          created_at: a.created_at,
        };
      });
  }
  throw new Error(`Câu SQL chưa mock: ${text}`);
}

async function fakeTx<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
  const snapshot = structuredClone(state);
  try {
    return await cb(mockSql);
  } catch (err) {
    state = snapshot;
    throw err;
  }
}

/** Trạng thái sau B5: N1 COMPLETED, N2 FAILED (run chốt), AUTH_SECURITY = p_after của B4. */
function seed(opts: { questions?: RunQuestion[]; runFinished?: boolean; authP?: number } = {}): void {
  const runFinished = opts.runFinished ?? true;
  state = {
    profiles: new Map([[USER_A, { user_id: USER_A, display_name: "Lan" }]]),
    sessions: new Map(),
    runs: new Map(),
    progress: new Map(),
    skills: new Map(),
    disputes: [],
    attempts: [],
  };
  state.sessions.set(SESSION_ID, {
    id: SESSION_ID,
    user_id: USER_A,
    source: "GITHUB",
    repo_key: shopApi.snapshot.repo_key,
    snapshot_id: shopApi.snapshot.snapshot_id,
    snapshot_id_kind: "COMMIT_SHA",
    subdir: shopApi.snapshot.subdir,
    ref_label: shopApi.snapshot.ref_label,
    repo_name: shopApi.repo_name,
    engine_version: CONFIG.ENGINE_VERSION,
    tokens_used: 0,
    created_at: new Date(T0).toISOString(),
    last_active_at: new Date(T0).toISOString(),
    graph_skeleton: SKELETON,
  });
  state.runs.set(RUN_ID, {
    id: RUN_ID,
    session_id: SESSION_ID,
    node_id: N2,
    mode: "LEARN",
    questions: opts.questions ?? n2Questions(),
    steps: [],
    forbidden_external_keywords: [],
    started_at: new Date(T0),
    finished_at: runFinished ? new Date(T0) : null,
  });
  state.progress.set(`${SESSION_ID}|${N1}`, { session_id: SESSION_ID, node_id: N1, status: "COMPLETED", analysis_failed: false });
  if (runFinished) {
    state.progress.set(`${SESSION_ID}|${N2}`, { session_id: SESSION_ID, node_id: N2, status: "FAILED", analysis_failed: false });
  }
  state.skills.set(`${USER_A}|AUTH_SECURITY`, {
    user_id: USER_A,
    skill: "AUTH_SECURITY",
    p_mastery: opts.authP ?? B4.next.p_mastery,
    last_practiced_at: new Date(B4.next.last_practiced_at),
    practice_count: B4.next.practice_count,
    correct_count: B4.next.correct_count,
  });
}

// ======================= Gọi route =======================

function makeRequest(path: string, method: "GET" | "POST", body?: unknown, token: string | null = "valid-token"): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request(`http://localhost:3000/api/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function report(over: Partial<{ session_id: string; run_id: string; question_index: number; note: string }> = {}) {
  const res = await reportPOST(
    makeRequest("report-wrong", "POST", { session_id: SESSION_ID, run_id: RUN_ID, question_index: 1, note: "AI chấm sai", ...over })
  );
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) as ReportWrongResponse & ApiError };
}

async function persona(body: unknown) {
  const res = await personaPOST(makeRequest("demo/persona", "POST", body));
  return { status: res.status, json: (await res.json()) as PersonaResponse & ApiError };
}

async function history(sessionId = SESSION_ID) {
  const res = await historyGET(makeRequest(`sessions/${sessionId}/history`, "GET"), {
    params: Promise.resolve({ id: sessionId }),
  });
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) as HistoryResponse & ApiError };
}

const authState = () => state.skills.get(`${USER_A}|AUTH_SECURITY`)!;
const q = (i: number) => state.runs.get(RUN_ID)!.questions[i - 1];

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_A, email: "a@test.com" } }, error: null });
  mockSql.mockImplementation(fakeSql);
  mockTx.mockImplementation(fakeTx);
  failWhen = null;
  seed();
});

// ======================= report-wrong =======================

describe("POST /api/report-wrong (03 Mục 6.4, D-22)", () => {
  it("D18: Báo sai Q1 của B4 ⇒ 🚩, AUTH_SECURITY hoàn về 0.25, N2 tính lại màu COMPLETED, N4 hết ⚠", async () => {
    const before = deriveNodeStates(SKELETON, [...state.progress.values()]);
    expect(before[N2].status).toBe("FAILED");
    expect(before[N4].has_warning).toBe(true);
    expect(B4.change.p_after).toBeCloseTo(0.0791, 4);

    const { status, json } = await report();

    expect(status).toBe(200);
    expect(json.question.disputed).toBe(true);
    expect(json.question.outcome).toBe("FAILED");
    expect(json.question.reveal).not.toBeNull();
    // 22 T-REV #1: change đảo chiều 0.0791 → 0.25
    expect(json.skill_change).toMatchObject({ skill: "AUTH_SECURITY", outcome: "FAILED" });
    expect(json.skill_change?.p_before).toBeCloseTo(0.0791, 4);
    expect(json.skill_change?.p_after).toBeCloseTo(0.25, 4);
    expect(authState().p_mastery).toBeCloseTo(0.25, 4);
    expect(authState().practice_count).toBe(B4.next.practice_count - 1);
    expect(authState().correct_count).toBe(B4.next.correct_count);
    expect(authState().last_practiced_at.getTime()).toBe(B4.next.last_practiced_at);
    // Màu node: câu 🚩 bị bỏ qua ⇒ Q2 đạt ⇒ COMPLETED
    expect(json.node_state.status).toBe("COMPLETED");
    expect(state.progress.get(`${SESSION_ID}|${N2}`)?.status).toBe("COMPLETED");
    const after = deriveNodeStates(SKELETON, [...state.progress.values()]);
    expect(after[N4].has_warning).toBe(false);
    // Ghi dispute_reports + lưu cờ disputed
    expect(q(1).disputed).toBe(true);
    expect(state.disputes).toEqual([{ user_id: USER_A, run_id: RUN_ID, question_index: 1, note: "AI chấm sai" }]);
  });

  it("D18 (T-REV #2): điểm đã bị cập nhật lại sau đó (0.2008) ⇒ không hoàn điểm, skill_change null, vẫn 🚩 và tính lại màu", async () => {
    seed({ authP: 0.2008 });
    const { status, json } = await report();

    expect(status).toBe(200);
    expect(json.skill_change).toBeNull();
    expect(authState().p_mastery).toBe(0.2008);
    expect(authState().practice_count).toBe(B4.next.practice_count);
    expect(json.question.disputed).toBe(true);
    expect(json.node_state.status).toBe("COMPLETED");
  });

  it("D24: ghi chú chứa PII và secret ⇒ che theo maskSensitive(redactSecrets(·).code) trước khi lưu", async () => {
    const raw =
      "Chấm sai rồi, liên hệ lan.nguyen@example.com hoặc 0912345678, CCCD 012345678901, key sk-abcdefghijklmnopqrstuvwx";
    const { status } = await report({ note: raw });
    expect(status).toBe(200);

    const stored = state.disputes[0].note;
    for (const s of ["lan.nguyen@example.com", "0912345678", "012345678901", "sk-abcdefghijklmnopqrstuvwx"]) {
      expect(stored).not.toContain(s);
    }
    expect(stored).toContain("<REDACTED_SECRET>");
    expect(stored).toContain("***");
    expect(stored.startsWith("Chấm sai rồi")).toBe(true);
  });

  it("ghi chú dài hơn REPORT_NOTE_MAX_CHARS ⇒ cắt cho vừa check của dispute_reports, không lỗi DB", async () => {
    const { status } = await report({ note: "x".repeat(CONFIG.REPORT_NOTE_MAX_CHARS + 50) });
    expect(status).toBe(200);
    expect([...state.disputes[0].note]).toHaveLength(CONFIG.REPORT_NOTE_MAX_CHARS);
  });

  it("ERR_REPORT_NOT_ALLOWED: câu đạt (PASS_FIRST) ⇒ 403, không đổi gì", async () => {
    const { status, json } = await report({ question_index: 2 });
    expect(status).toBe(403);
    expect(json.error.code).toBe("ERR_REPORT_NOT_ALLOWED");
    expect(json.error.retryable).toBe(false);
    expect(state.disputes).toHaveLength(0);
    expect(q(2).disputed).toBe(false);
  });

  it("ERR_REPORT_NOT_ALLOWED: báo sai lần 2 cùng câu ⇒ 403, điểm không hoàn thêm", async () => {
    expect((await report()).status).toBe(200);
    const pAfterFirst = authState().p_mastery;

    const second = await report();
    expect(second.status).toBe(403);
    expect(second.json.error.code).toBe("ERR_REPORT_NOT_ALLOWED");
    expect(authState().p_mastery).toBe(pAfterFirst);
    expect(state.disputes).toHaveLength(1);
  });

  it("ERR_REPORT_NOT_ALLOWED: câu bỏ qua (ended_by SKIP) và câu chưa xong ⇒ 403", async () => {
    const qs = n2Questions();
    Object.assign(qs[0], { ended_by: "SKIP" });
    Object.assign(qs[1], { finished: false, outcome: null, ended_by: null, attempts_used: 0 });
    seed({ questions: qs, runFinished: false });

    const skipped = await report({ question_index: 1 });
    expect(skipped.status).toBe(403);
    expect(skipped.json.error.code).toBe("ERR_REPORT_NOT_ALLOWED");

    const open = await report({ question_index: 2 });
    expect(open.status).toBe(403);
    expect(open.json.error.code).toBe("ERR_REPORT_NOT_ALLOWED");
  });

  it("run chưa chốt (Q2 còn làm) ⇒ vẫn 🚩 và hoàn điểm, không ghi màu node", async () => {
    const qs = n2Questions();
    Object.assign(qs[1], { finished: false, outcome: null, ended_by: null, attempts_used: 0 });
    seed({ questions: qs, runFinished: false });

    const { status, json } = await report();
    expect(status).toBe(200);
    expect(json.question.disputed).toBe(true);
    expect(json.skill_change?.p_after).toBeCloseTo(0.25, 4);
    expect(json.node_state.status).toBe("AVAILABLE");
    expect(state.progress.has(`${SESSION_ID}|${N2}`)).toBe(false);
  });

  it("tài khoản khác ⇒ ERR_SESSION_NOT_FOUND (API-05), không lộ đáp án", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_B } }, error: null });
    const { status, text, json } = await report();
    expect(status).toBe(404);
    expect(json.error.code).toBe("ERR_SESSION_NOT_FOUND");
    expect(text).not.toContain("JWT_SECRET");
    expect(state.disputes).toHaveLength(0);
  });

  it("Postgres lỗi khi ghi ⇒ ERR_PERSISTENCE_UNAVAILABLE, không đổi gì (D-40)", async () => {
    failWhen = (t) => t.startsWith("INSERT INTO dispute_reports");
    const { status, json } = await report();

    expect(status).toBe(503);
    expect(json.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    expect(mockTx).toHaveBeenCalledTimes(1 + CONFIG.DB_RETRY_DELAYS_MS.length);
    expect(q(1).disputed).toBe(false);
    expect(authState().p_mastery).toBe(B4.next.p_mastery);
    expect(state.progress.get(`${SESSION_ID}|${N2}`)?.status).toBe("FAILED");
  });

  it("thiếu Authorization ⇒ 401", async () => {
    const res = await reportPOST(makeRequest("report-wrong", "POST", {}, null));
    expect(res.status).toBe(401);
  });
});

// ======================= demo/persona =======================

describe("POST /api/demo/persona (03 Mục 6.7)", () => {
  it("ERR_DEMO_MODE_DISABLED: DEMO_MODE chưa bật ⇒ 403, không ghi skill_states", async () => {
    const { status, json } = await persona({ mode: "NEWBIE" });
    expect(status).toBe(403);
    expect(json.error.code).toBe("ERR_DEMO_MODE_DISABLED");
    expect(mockSql).not.toHaveBeenCalled();
    expect(state.skills.size).toBe(1);
  });

  it("ERR_DEMO_MODE_DISABLED: DEMO_MODE khác \"true\" ⇒ 403", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "false");
    const { status, json } = await persona({ mode: "NEWBIE" });
    expect(status).toBe(403);
    expect(json.error.code).toBe("ERR_DEMO_MODE_DISABLED");
  });

  it("SENIOR_RUSTY ⇒ ghi đè đủ 16 dòng: p gốc, last_practiced_at = now − days_idle ngày, count = 1; điểm decay 0.4085, NOVICE (T-PER)", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "true");
    const { status, json } = await persona({ mode: "SENIOR_RUSTY" });

    expect(status).toBe(200);
    const p = PERSONAS.SENIOR_RUSTY;
    const now = json.server_now;
    const rows = [...state.skills.values()].filter((r) => r.user_id === USER_A);
    expect(rows).toHaveLength(SWE_SKILLS.length);
    for (const r of rows) {
      expect(r.p_mastery).toBe(p.initial_p_mastery);
      expect(r.last_practiced_at.getTime()).toBe(now - p.days_idle * CONFIG.MS_PER_DAY);
      expect(r.practice_count).toBe(1);
      expect(r.correct_count).toBe(1);
    }
    // Dòng AUTH_SECURITY cũ (0.0791) bị ghi đè
    expect(authState().p_mastery).toBe(p.initial_p_mastery);
    expect(Object.keys(json.profile.skills)).toHaveLength(SWE_SKILLS.length);
    expect(json.profile.user_id).toBe(USER_A);
    expect(json.profile.display_name).toBe("Lan");
    expect(json.profile.overall_tier).toBe("NOVICE");
    expect(getDecayedMastery(json.profile.skills.AUTH_SECURITY, now)).toBeCloseTo(0.4085, 4);
  });

  it("NEWBIE ⇒ NOVICE; MID_LEVEL ⇒ PRACTITIONER (T-PER)", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "true");
    const newbie = await persona({ mode: "NEWBIE" });
    expect(newbie.json.profile.overall_tier).toBe("NOVICE");
    expect(getDecayedMastery(newbie.json.profile.skills.DB_OPTIMIZATION, newbie.json.server_now)).toBeCloseTo(0.25, 4);

    const mid = await persona({ mode: "MID_LEVEL" });
    expect(mid.json.profile.overall_tier).toBe("PRACTITIONER");
    expect(getDecayedMastery(mid.json.profile.skills.DB_OPTIMIZATION, mid.json.server_now)).toBeCloseTo(0.65, 4);
  });

  it("chỉ ghi cho tài khoản hiện tại; tạo profiles nếu chưa có; không đụng trạng thái node", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "true");
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_B } }, error: null });
    const progressBefore = structuredClone([...state.progress.values()]);

    const { status } = await persona({ mode: "MID_LEVEL" });
    expect(status).toBe(200);
    expect(state.profiles.has(USER_B)).toBe(true);
    expect([...state.skills.values()].filter((r) => r.user_id === USER_B)).toHaveLength(SWE_SKILLS.length);
    expect(authState().p_mastery).toBe(B4.next.p_mastery); // dòng của A giữ nguyên
    expect([...state.progress.values()]).toEqual(progressBefore);
  });

  it("mode không thuộc PERSONAS ⇒ ERR_DEMO_MODE_DISABLED, không ghi gì", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "true");
    const { status, json } = await persona({ mode: "HACKER" });
    expect(status).toBe(403);
    expect(json.error.code).toBe("ERR_DEMO_MODE_DISABLED");
    expect(state.skills.size).toBe(1);
  });

  it("Postgres lỗi giữa chừng ⇒ ERR_PERSISTENCE_UNAVAILABLE, rollback cả 16 dòng", async () => {
    vi.stubEnv(CONFIG.DEMO_MODE_ENV, "true");
    failWhen = (t) => t.startsWith("SELECT display_name FROM profiles");
    const { status, json } = await persona({ mode: "NEWBIE" });
    expect(status).toBe(503);
    expect(json.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
    expect(state.skills.size).toBe(1);
    expect(authState().p_mastery).toBe(B4.next.p_mastery);
  });
});

// ======================= history =======================

describe("GET /api/sessions/{id}/history", () => {
  function addAttempt(id: number, attempt: number, isPassed: boolean, at: number, answer: string) {
    state.attempts.push({
      id,
      run_id: RUN_ID,
      question_index: 1,
      attempt_number: attempt,
      skill: "AUTH_SECURITY",
      core_accuracy: isPassed ? 90 : 40,
      is_passed: isPassed,
      intent: "ANSWER",
      student_answer: answer,
      points_covered: [isPassed],
      created_at: new Date(at),
    });
  }

  it("trả HistoryResponse theo thứ tự thời gian, có node_title, chỉ các trường của AttemptHistoryItem", async () => {
    addAttempt(2, 2, false, T0 + 2000, "Hàm getProfile kiểm tra mật khẩu người dùng.");
    addAttempt(1, 1, false, T0 + 1000, "getProfile lấy user từ database rồi trả về.");

    const { status, text, json } = await history();
    expect(status).toBe(200);
    expect(json.items).toHaveLength(2);
    expect(json.items[0]).toEqual({
      node_id: N2,
      node_title: SKELETON.find((n) => n.node_id === N2)!.title,
      mode: "LEARN",
      question_index: 1,
      skill: "AUTH_SECURITY",
      attempt_number: 1,
      core_accuracy: 40,
      is_passed: false,
      intent: "ANSWER",
      student_answer: "getProfile lấy user từ database rồi trả về.",
      created_at: T0 + 1000,
    });
    expect(json.items[1].attempt_number).toBe(2);
    expect(text).not.toContain("points_covered");
    expect(text).not.toContain("reference_answer");
  });

  it("phiên không có lượt nộp ⇒ items rỗng", async () => {
    const { status, json } = await history();
    expect(status).toBe(200);
    expect(json.items).toEqual([]);
  });

  it("phiên engine cũ vẫn xem được lịch sử", async () => {
    state.sessions.get(SESSION_ID)!.engine_version = "engine-cu";
    addAttempt(1, 1, true, T0, "Khóa JWT_SECRET viết thẳng trong code nên ai cũng ký được token.");
    const { status, json } = await history();
    expect(status).toBe(200);
    expect(json.items).toHaveLength(1);
  });

  it("phiên của người khác / id không phải UUID ⇒ ERR_SESSION_NOT_FOUND", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_B } }, error: null });
    const other = await history();
    expect(other.status).toBe(404);
    expect(other.json.error.code).toBe("ERR_SESSION_NOT_FOUND");

    const bad = await history("khong-phai-uuid");
    expect(bad.status).toBe(404);
  });

  it("Postgres lỗi ⇒ ERR_PERSISTENCE_UNAVAILABLE", async () => {
    failWhen = (t) => t.includes("FROM question_attempts a JOIN node_runs r");
    const { status, json } = await history();
    expect(status).toBe(503);
    expect(json.error.code).toBe("ERR_PERSISTENCE_UNAVAILABLE");
  });
});
