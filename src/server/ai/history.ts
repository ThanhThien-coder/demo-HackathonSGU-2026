/**
 * src/server/ai/history.ts
 *
 * Dữ liệu D-74 cho prompt (20 AI-22, AI-27, AI-28):
 * - A5b: ý bắt buộc người học đã hụt theo kỹ năng (khối <learner_history> khi đặt câu hỏi).
 * - A5a: câu trả lời và ý đã trúng của lượt trước (khối <previous_answer>, <previous_points> khi chấm).
 * - M1: tên hàm của bài khác có trong câu trả lời (khối <referenced_steps> khi chấm, chỉ tên, không code — D-36).
 */
import { CONFIG, type StaticEngineResult, type SWESkill } from "@/contracts";
import { sql } from "../db";
import { logger } from "../log";

/** Một dòng lượt cuối của một câu (nội bộ). */
export interface LastAttemptRow {
  skill: SWESkill;
  attempt_number: number;
  is_passed: boolean;
  points_covered: boolean[];
  points: unknown; // node_runs.questions[i].must_have_points
}

/**
 * A5b (hàm thuần): một ý là hụt khi lượt cuối của câu đã hết lượt có points_covered[i] = false.
 * rows đã xếp mới nhất trước; mỗi kỹ năng tối đa CONFIG.HISTORY_MISSED_POINTS_MAX ý.
 */
export function pickMissed(rows: LastAttemptRow[]): Partial<Record<SWESkill, string[]>> {
  const out: Partial<Record<SWESkill, string[]>> = {};
  for (const r of rows) {
    if (r.is_passed || r.attempt_number < CONFIG.MAX_ATTEMPTS_PER_QUESTION) continue;
    if (!Array.isArray(r.points)) continue;
    const list = out[r.skill] ?? [];
    r.points.forEach((p, i) => {
      if (
        typeof p === "string" &&
        r.points_covered[i] === false &&
        list.length < CONFIG.HISTORY_MISSED_POINTS_MAX &&
        !list.includes(p)
      ) {
        list.push(p);
      }
    });
    if (list.length > 0) out[r.skill] = list;
  }
  return out;
}

/**
 * A5b: đọc ý đã hụt của người học (mọi phiên của cùng user_id) cho các kỹ năng trong kế hoạch.
 * DB lỗi ⇒ {} (bỏ khối, không chặn việc đặt câu hỏi).
 */
export async function loadMissedPoints(
  userId: string,
  skills: SWESkill[],
): Promise<Partial<Record<SWESkill, string[]>>> {
  if (skills.length === 0) return {};
  try {
    const rows = await sql<LastAttemptRow[]>`
      WITH last AS (
        SELECT DISTINCT ON (qa.run_id, qa.question_index)
          qa.run_id, qa.question_index, qa.skill, qa.attempt_number, qa.is_passed, qa.points_covered, qa.created_at
        FROM question_attempts qa
        JOIN node_runs r ON r.id = qa.run_id
        JOIN learning_sessions s ON s.id = r.session_id
        WHERE s.user_id = ${userId} AND qa.skill::text = ANY(${skills})
        ORDER BY qa.run_id, qa.question_index, qa.attempt_number DESC
      )
      SELECT last.skill, last.attempt_number, last.is_passed, last.points_covered,
             r.questions -> (last.question_index - 1) -> 'must_have_points' AS points
      FROM last JOIN node_runs r ON r.id = last.run_id
      ORDER BY last.created_at DESC
      LIMIT 200
    `;
    return pickMissed(rows);
  } catch (err: unknown) {
    logger.warn({ event: "missed_points_failed", err_name: err instanceof Error ? err.name : typeof err });
    return {};
  }
}

/**
 * A5a: câu trả lời và ý đã trúng của lượt gần nhất cùng câu. Không có hoặc DB lỗi ⇒ null (bỏ 2 khối).
 */
export async function loadPreviousAttempt(
  runId: string,
  questionIndex: number,
): Promise<{ answer: string; points: boolean[] } | null> {
  try {
    const rows = await sql<Array<{ student_answer: string; points_covered: boolean[] }>>`
      SELECT student_answer, points_covered FROM question_attempts
      WHERE run_id = ${runId} AND question_index = ${questionIndex}
      ORDER BY attempt_number DESC
      LIMIT 1
    `;
    const r = rows[0];
    return r ? { answer: r.student_answer, points: r.points_covered } : null;
  } catch (err: unknown) {
    logger.warn({ event: "previous_attempt_failed", err_name: err instanceof Error ? err.name : typeof err });
    return null;
  }
}

/** Một tên hàm của bài khác (nội bộ, chỉ tên — D-36). */
export interface ReferencedStep {
  function_name: string;
  file_path: string;
  title: string;
  conditional: boolean;
}

const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const shortName = (f: string) => f.split(".").pop() ?? f;

/**
 * M1 (hàm thuần): bước của node khác có phần cuối function_name trùng tên trong câu trả lời.
 * Bỏ tên đã có trong bài đang chấm; bài điều kiện (prerequisites) xếp trước; tối đa CONFIG.GRADE_REFERENCED_MAX.
 */
export function findReferencedSteps(
  graph: StaticEngineResult,
  nodeId: string,
  answer: string,
  ownNames: Set<string>,
): ReferencedStep[] {
  const words = new Set(answer.match(IDENT_RE) ?? []);
  if (words.size === 0) return [];
  const ownShort = new Set([...ownNames].map(shortName));
  const cur = graph.nodes.find((n) => n.id === nodeId);
  const prereq = new Set(cur?.prerequisites ?? []);
  const found: ReferencedStep[] = [];
  const nodes = [...graph.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const n of nodes) {
    if (n.id === nodeId) continue;
    const steps = [...n.trace_steps].sort((a, b) => a.step_number - b.step_number);
    for (const s of steps) {
      const short = shortName(s.function_name);
      if (!words.has(short) || ownNames.has(s.function_name) || ownShort.has(short)) continue;
      if (found.some((f) => f.function_name === s.function_name)) continue;
      found.push({ function_name: s.function_name, file_path: s.file_path, title: n.title, conditional: prereq.has(n.id) });
    }
  }
  const ordered = [...found.filter((f) => f.conditional), ...found.filter((f) => !f.conditional)];
  return ordered.slice(0, CONFIG.GRADE_REFERENCED_MAX);
}
