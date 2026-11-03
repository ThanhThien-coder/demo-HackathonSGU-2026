/**
 * src/server/persona.ts
 *
 * POST /api/demo/persona (03 Muc 6.7, 5.4; 22 Muc 9).
 * Chi khi process.env[CONFIG.DEMO_MODE_ENV] === "true"; ghi de du 16 dong skill_states cua TAI KHOAN HIEN TAI.
 * Khong goi ingest, khong doi trang thai node. Tra PersonaResponse (= MeResponse).
 */

import {
  CONFIG,
  PERSONAS,
  SWE_SKILLS,
  type CognitiveSkillState,
  type LearnerCognitiveProfile,
  type PersonaMode,
  type PersonaRequest,
  type PersonaResponse,
  type SWESkill,
} from "@/contracts";
import { overallTier } from "@/lib/bkt-engine";
import type { AuthenticatedUser } from "./auth";
import { db } from "./db";
import { ApiHttpError } from "./errors";
import { withDbRetry } from "./progress";

export function isDemoModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CONFIG.DEMO_MODE_ENV] === "true";
}

const isPersonaMode = (v: unknown): v is PersonaMode =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(PERSONAS, v);

/**
 * Body JSON tho => PersonaRequest. Contract khong co ma loi rieng cho mode la:
 * mode khong thuoc PERSONAS ⇒ ERR_DEMO_MODE_DISABLED (khong dung duoc persona voi yeu cau nay).
 */
export function toPersonaRequest(body: unknown): PersonaRequest {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (!isPersonaMode(b.mode)) throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");
  return { mode: b.mode };
}

/** 16 dong skill_states cua persona tai thoi diem now (03 Muc 6.7). */
export function personaSkillStates(mode: PersonaMode, now: number): CognitiveSkillState[] {
  const p = PERSONAS[mode];
  const lastPracticedAt = now - p.days_idle * CONFIG.MS_PER_DAY;
  return SWE_SKILLS.map((skill) => ({
    skill,
    p_mastery: p.initial_p_mastery,
    last_practiced_at: lastPracticedAt,
    practice_count: 1,
    correct_count: 1,
  }));
}

export async function applyPersona(
  req: PersonaRequest,
  user: AuthenticatedUser,
  now: number = Date.now()
): Promise<PersonaResponse> {
  if (!isDemoModeEnabled()) throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");

  const states = personaSkillStates(req.mode, now);

  const displayName = await withDbRetry(() =>
    db.tx(async (tx) => {
      // skill_states.user_id tham chieu profiles: tao profiles neu chua co (nhu GET /api/me), khong doi display_name
      await tx`
        INSERT INTO profiles (user_id, display_name)
        VALUES (${user.id}, ${user.display_name ?? null})
        ON CONFLICT (user_id) DO NOTHING
      `;

      for (const s of states) {
        await tx`
          INSERT INTO skill_states (user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count)
          VALUES (
            ${user.id}, ${s.skill}, ${s.p_mastery}, ${new Date(s.last_practiced_at)},
            ${s.practice_count}, ${s.correct_count}
          )
          ON CONFLICT (user_id, skill) DO UPDATE SET
            p_mastery = EXCLUDED.p_mastery,
            last_practiced_at = EXCLUDED.last_practiced_at,
            practice_count = EXCLUDED.practice_count,
            correct_count = EXCLUDED.correct_count
        `;
      }

      const rows = await tx<Array<{ display_name: string | null }>>`
        SELECT display_name
        FROM profiles
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      return rows[0]?.display_name ?? user.display_name ?? null;
    })
  );

  // Du 16 ky nang vua ghi ⇒ ho so dung bang gia tri da ghi, khong can doc lai skill_states
  const skills: Partial<Record<SWESkill, CognitiveSkillState>> = {};
  for (const s of states) skills[s.skill] = s;

  const profile: LearnerCognitiveProfile = {
    user_id: user.id,
    display_name: displayName,
    skills,
    overall_tier: overallTier(skills, now),
  };
  return { profile, server_now: now };
}
