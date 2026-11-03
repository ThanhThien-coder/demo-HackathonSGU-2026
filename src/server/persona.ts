import {
  CONFIG,
  PERSONAS,
  SWE_SKILLS,
  type CognitiveSkillState,
  type LearnerCognitiveProfile,
  type MeResponse,
  type PersonaMode,
  type SWESkill,
} from "@/contracts";
import { sql } from "./db";
import { ApiHttpError } from "./errors";
import { overallTier } from "@/lib/bkt-engine";

/**
 * 03_API_VA_LUU_TRU.md Muc 6.7: demo/persona
 * - Kiem tra DEMO_MODE: process.env[CONFIG.DEMO_MODE_ENV] === "true", nguoc lai ERR_DEMO_MODE_DISABLED (403).
 * - Ghi de 16 dong skill_states cua tai khoan hien tai:
 *   p_mastery = PERSONAS[mode].initial_p_mastery,
 *   last_practiced_at = now - days_idle * CONFIG.MS_PER_DAY,
 *   practice_count = 1,
 *   correct_count = 1.
 * - Tra ve MeResponse (profile moi nhat).
 */
export async function setDemoPersona(
  userId: string,
  mode: PersonaMode
): Promise<MeResponse> {
  const isDemo = process.env.DEMO_MODE === "true" || process.env[CONFIG.DEMO_MODE_ENV] === "true";
  if (!isDemo) {
    throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");
  }

  const personaConfig = PERSONAS[mode];
  if (!personaConfig) {
    throw new ApiHttpError("ERR_DEMO_MODE_DISABLED");
  }

  const serverNow = Date.now();
  const lastPracticedDate = new Date(
    serverNow - personaConfig.days_idle * CONFIG.MS_PER_DAY
  );

  // Dam bao profile nguoi dung ton tai
  await sql`
    INSERT INTO profiles (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;

  // Upsert 16 dong skill_states trong 1 query
  for (const skill of SWE_SKILLS) {
    await sql`
      INSERT INTO skill_states (
        user_id, skill, p_mastery, last_practiced_at, practice_count, correct_count
      )
      VALUES (
        ${userId},
        ${skill},
        ${personaConfig.initial_p_mastery},
        ${lastPracticedDate},
        1,
        1
      )
      ON CONFLICT (user_id, skill) DO UPDATE SET
        p_mastery = EXCLUDED.p_mastery,
        last_practiced_at = EXCLUDED.last_practiced_at,
        practice_count = EXCLUDED.practice_count,
        correct_count = EXCLUDED.correct_count
    `;
  }

  // Doc profile
  const profileRows = await sql<Array<{ display_name: string | null }>>`
    SELECT display_name
    FROM profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const displayName = profileRows[0]?.display_name ?? null;

  // Doc lai 16 dong skill_states
  const skillRows = await sql<
    Array<{
      skill: SWESkill;
      p_mastery: number;
      last_practiced_at: string;
      practice_count: number;
      correct_count: number;
    }>
  >`
    SELECT skill, p_mastery, last_practiced_at, practice_count, correct_count
    FROM skill_states
    WHERE user_id = ${userId}
  `;

  const skills: Partial<Record<SWESkill, CognitiveSkillState>> = {};
  for (const row of skillRows) {
    skills[row.skill] = {
      skill: row.skill,
      p_mastery: Number(row.p_mastery),
      last_practiced_at: new Date(row.last_practiced_at).getTime(),
      practice_count: Number(row.practice_count),
      correct_count: Number(row.correct_count),
    };
  }

  const overall = overallTier(skills, serverNow);

  const profile: LearnerCognitiveProfile = {
    user_id: userId,
    display_name: displayName,
    skills,
    overall_tier: overall,
  };

  return {
    profile,
    server_now: serverNow,
  };
}
