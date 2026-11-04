import type {
  CognitiveSkillState,
  LearnerCognitiveProfile,
  MeResponse,
  SWESkill,
} from "@/contracts";
import { authenticateRequest } from "@/server/auth";
import { sql } from "@/server/db";
import { toErrorResponse } from "@/server/errors";
import { overallTier } from "@/lib/bkt-engine";

export const dynamic = "force-dynamic";

// 03_API_VA_LUU_TRU Muc 2: GET /api/me -> MeResponse, tao profiles neu chua co
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    const serverNow = Date.now();

    // 1. Tao profiles neu chua co
    await sql`
      INSERT INTO profiles (user_id, display_name)
      VALUES (${user.id}, ${user.display_name ?? null})
      ON CONFLICT (user_id) DO UPDATE
        SET display_name = COALESCE(profiles.display_name, EXCLUDED.display_name)
    `;

    // 2. Doc profile
    const profileRows = await sql<Array<{ display_name: string | null }>>`
      SELECT display_name
      FROM profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;
    const displayName = profileRows[0]?.display_name ?? user.display_name ?? null;

    // 3. Doc skill_states
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
      WHERE user_id = ${user.id}
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
      user_id: user.id,
      display_name: displayName,
      skills,
      overall_tier: overall,
    };

    const responseBody: MeResponse = {
      profile,
      server_now: serverNow,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// 03_API_VA_LUU_TRU Muc 2: DELETE /api/me -> 204, Xoa auth.users => cascade moi bang
export async function DELETE(request: Request): Promise<Response> {
  try {
    const user = await authenticateRequest(request);
    await sql`DELETE FROM auth.users WHERE id = ${user.id}`;
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
