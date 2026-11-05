// 03 Mục 6.3, 6.4, 6.7 — reveal (bỏ qua câu), report-wrong (D-22), persona.
import { CONFIG } from "@/contracts/config";
import { PERSONAS } from "@/contracts/learner";
import type {
  MeResponse, PersonaMode, ReportWrongRequest, ReportWrongResponse, RevealRequest, RevealResponse, SkillChange,
} from "@/contracts";
import { revertSkillChange } from "@/lib/bkt-engine";
import { maskSensitive } from "@/lib/moderation";
import { sql } from "./db";
import { redactSecrets } from "./engine/ingest/secrets";
import { fail } from "./errors";
import { applyBkt, finalizeRunIfDone, loadNodeStates, recomputeNodeColor, toQuestionState } from "./progress";
import {
  asQ, dbRead, getOwnedSession, getRunOwned, insertDispute, loadProfile, lockSkill, saveRunQuestions, saveSkill, upsertPersona, withDbRetry,
} from "./store";

export async function revealQuestion(req: RevealRequest, userId: string): Promise<RevealResponse> {
  const now = Date.now();
  const session = await getOwnedSession(req.session_id, userId);
  const pre = await dbRead(() => getRunOwned(sql, req.run_id, session.id));
  if (!pre.questions[req.question_index - 1]) return fail("ERR_SESSION_NOT_FOUND");
  return withDbRetry(() => sql.begin(async (tx) => {
    const db = asQ(tx);
    const run = await getRunOwned(db, req.run_id, session.id, true);
    const q = run.questions[req.question_index - 1];
    if (!q) return fail("ERR_SESSION_NOT_FOUND");
    if (q.finished || run.finished_at) return fail("ERR_QUESTION_FINISHED");
    q.finished = true; q.outcome = "FAILED"; q.ended_by = "SKIP";
    const change = await applyBkt(db, userId, q.skill, "FAILED", now);
    q.p_before = change.p_before; q.p_after = change.p_after;
    await saveRunQuestions(db, run.id, run.questions);
    const unlocked = await finalizeRunIfDone(db, session, { ...run });
    const states = await loadNodeStates(db, session);
    return { question: toQuestionState(q), skill_change: change, node_state: states[run.node_id], unlocked_node_ids: unlocked };
  }));
}

export async function reportWrong(req: ReportWrongRequest, userId: string): Promise<ReportWrongResponse> {
  const session = await getOwnedSession(req.session_id, userId);
  const pre = await dbRead(() => getRunOwned(sql, req.run_id, session.id));
  if (!pre.questions[req.question_index - 1]) return fail("ERR_SESSION_NOT_FOUND");
  const note = maskSensitive(redactSecrets(String(req.note ?? "")).code).slice(0, CONFIG.REPORT_NOTE_MAX_CHARS);
  return withDbRetry(() => sql.begin(async (tx) => {
    const db = asQ(tx);
    const run = await getRunOwned(db, req.run_id, session.id, true);
    const q = run.questions[req.question_index - 1];
    if (!q || q.outcome !== "FAILED" || q.ended_by !== "ANSWER" || q.disputed) return fail("ERR_REPORT_NOT_ALLOWED");
    q.disputed = true;
    let skillChange: SkillChange | null = null;
    if (q.p_before !== null && q.p_after !== null && q.outcome) {
      const state = await lockSkill(db, userId, q.skill, Date.now());
      const rev = revertSkillChange(state, { skill: q.skill, p_before: q.p_before, p_after: q.p_after, outcome: q.outcome });
      if (rev) { await saveSkill(db, userId, rev.next); skillChange = rev.change; }
    }
    await saveRunQuestions(db, run.id, run.questions);
    await insertDispute(db, userId, run.id, req.question_index, note);
    if (run.finished_at) await recomputeNodeColor(db, session, run);
    const states = await loadNodeStates(db, session);
    return { question: toQuestionState(q), skill_change: skillChange, node_state: states[run.node_id] };
  }));
}

export async function setPersona(mode: PersonaMode, userId: string): Promise<MeResponse> {
  if (process.env[CONFIG.DEMO_MODE_ENV] !== "true") return fail("ERR_DEMO_MODE_DISABLED");
  const p = PERSONAS[mode];
  if (!p) return fail("ERR_DEMO_MODE_DISABLED");
  const now = Date.now();
  await withDbRetry(() => upsertPersona(userId, p.initial_p_mastery, now - p.days_idle * CONFIG.MS_PER_DAY));
  const profile = await dbRead(() => loadProfile(sql, userId, now));
  return { profile, server_now: now };
}
