// 20 Mục 7 — chấm Feynman: gradeWithAI (AI-27), luật Đạt (AI-30, D-13), gợi ý theo lượt và bậc (AI-31), mẫu tĩnh (AI-32), injectionGrading (AI-33).
import { CONFIG } from "@/contracts/config";
import type { FollowUp, FollowUpType, GradeContext, GradingRaw, LearnerTier, SessionRow } from "@/contracts";
import { fail } from "../errors";
import { assertQuota } from "../quota";
import { callWithRetry } from "./gemini";
import { cleanJargons, logGuardBlock, verifyFollowUp } from "./guard/followup";
import { firstSentences, normText } from "./guard/text";
import { gradeSystem, gradeUser, type GradeExtras } from "./prompts/grade";
import { gradeSchema } from "./schemas";

export const INJECTION_MARKER = "__INJECTION__";

const clamp = (x: number) => Math.min(100, Math.max(0, Math.round(Number.isFinite(x) ? x : 0)));

/** AI-30: ý i chỉ covered khi AI đánh true VÀ quote có thật trong câu trả lời (so khớp lỏng). */
export function coveredFlags(g: GradingRaw, mustHave: string[], answer: string): boolean[] {
  const a = normText(answer);
  return mustHave.map((_, i) => {
    const p = g.points.find((x) => x.index === i + 1);
    if (!p || !p.covered) return false;
    const parts = (p.quote ?? "").split(/…|\.\.\./)
      .map((x) => normText(x).replace(/^[\s"'“”‘’«».,;:!?]+|[\s"'“”‘’«».,;:!?]+$/gu, "")).filter((x) => x.length > 0);
    return parts.length > 0 && parts.join("").length >= CONFIG.GRADING_QUOTE_MIN_CHARS && parts.every((x) => a.includes(x));
  });
}

export const decidePass = (g: GradingRaw, mustHave: string[], answer: string): boolean =>
  g.intent === "ANSWER" && g.core_accuracy >= CONFIG.PASS_CORE_ACCURACY && coveredFlags(g, mustHave, answer).every(Boolean);

/** AI-31 */
export function expectedFollowUpType(attempt: number, maxAttempts: number, tier: LearnerTier): FollowUpType | null {
  if (attempt >= maxAttempts) return null;
  if (tier === "NOVICE") return "CODE_POINTER";
  if (tier === "ARCHITECT") return "CONCEPT";
  return attempt === 1 ? "CONCEPT" : "CODE_POINTER";
}

/** AI-32 */
export function staticHint(type: FollowUpType, t: GradeContext, aiStep: number | null): FollowUp {
  if (type === "CONCEPT") {
    const q = {
      WEAKNESS: "Hãy nghĩ xem đoạn xử lý này có thể gây vấn đề gì tiềm ẩn khi dữ liệu hoặc số lượng người dùng tăng lên?",
      FLOW: "Hãy thử lần theo xem dữ liệu này được tạo ra ở đâu và đi qua những giai đoạn nào trước khi tới đây?",
      ARCHITECTURE: "Hãy nghĩ xem vì sao việc chia nhiệm vụ thành các tầng riêng giúp ích khi cần thêm một chức năng mới?",
      CHANGE: "Hãy nghĩ xem khi sửa yêu cầu này, phần nào của hệ thống bị ảnh hưởng và phần nào không?",
    }[t.focus];
    return { type: "CONCEPT", question: q, step_index: null };
  }
  const idxs = t.step_indices;
  const s = aiStep !== null && idxs.includes(aiStep) ? aiStep : idxs[Math.floor((idxs.length - 1) / 2)];
  const step = t.steps.find((x) => x.step_index === s);
  return {
    type: "CODE_POINTER", step_index: s,
    question: `Hãy đọc kỹ hàm \`${step?.function_name ?? ""}\` trong \`${step?.file_path ?? ""}\`: điều gì xảy ra ở đây trong tình huống của câu hỏi?`,
  };
}

export function staticFeedback(isPassed: boolean, attempt: number, maxAttempts: number): string {
  if (isPassed) return "Bạn đã nêu đúng các ý chính. Làm tốt lắm!";
  if (attempt < maxAttempts) return "Bạn đã đi đúng một phần. Hãy xem gợi ý bên dưới rồi bổ sung thêm.";
  return "Chưa đạt ở lượt cuối. Hãy xem đáp án tham khảo bên dưới để hiểu rõ hơn.";
}

export function decideFollowUp(g: GradingRaw, attempt: number, maxAttempts: number, isPassed: boolean, t: GradeContext, answer: string): FollowUp | null {
  if (isPassed || g.misconception === INJECTION_MARKER) return null;
  const expected = expectedFollowUpType(attempt, maxAttempts, t.tier);
  if (expected === null) return null;
  const ok = g.follow_up_type === expected && g.follow_up_question !== null && verifyFollowUp(g, t, answer, isPassed).follow_up_ok;
  if (ok) return { type: expected, question: g.follow_up_question!, step_index: expected === "CODE_POINTER" ? g.follow_up_step_index : null };
  logGuardBlock("grade", attempt, null, [{ code: "G1" }]);
  return staticHint(expected, t, g.follow_up_step_index);
}

/** AI-33: regex tấn công ⇒ 0 điểm, OFF_TOPIC, không gợi ý, 0 token — vẫn tính 1 lượt. */
export const injectionGrading = (t: Pick<GradeContext, "must_have_points">): GradingRaw => ({
  core_accuracy: 0, simplicity: 0, intent: "OFF_TOPIC",
  points: t.must_have_points.map((_, i) => ({ index: i + 1, covered: false, quote: "" })),
  misconception: INJECTION_MARKER, follow_up_question: null, follow_up_type: null, follow_up_step_index: null,
  feedback: "Câu trả lời có câu lệnh gửi cho hệ thống chấm nên không được chấm. Hãy giải thích đoạn code bằng lời của bạn.",
  detected_jargons: [],
});

const parseGrading = (j: unknown): GradingRaw | null => {
  const o = j as Partial<GradingRaw> | null;
  if (!o || typeof o !== "object" || typeof o.core_accuracy !== "number" || !Array.isArray(o.points) || typeof o.intent !== "string") return null;
  return o as GradingRaw;
};

function normalizeGrading(raw: GradingRaw, t: GradeContext, answer: string): GradingRaw {
  const n = t.must_have_points.length;
  const points = Array.from({ length: n }, (_, i) => {
    const p = raw.points.find((x) => x.index === i + 1);
    return p ? { index: i + 1, covered: !!p.covered, quote: String(p.quote ?? "") } : { index: i + 1, covered: false, quote: "" };
  });
  const intent = (["ANSWER", "GIVE_UP", "OFF_TOPIC"] as const).includes(raw.intent) ? raw.intent : "OFF_TOPIC";
  const off = intent !== "ANSWER";
  return {
    core_accuracy: off ? 0 : clamp(raw.core_accuracy), simplicity: clamp(raw.simplicity ?? 0), intent,
    points: off ? points.map((p) => ({ ...p, covered: false })) : points,
    misconception: String(raw.misconception ?? ""),
    follow_up_question: raw.follow_up_question ?? null, follow_up_type: raw.follow_up_type ?? null,
    follow_up_step_index: Number.isInteger(raw.follow_up_step_index) ? raw.follow_up_step_index : null,
    feedback: String(raw.feedback ?? ""), detected_jargons: cleanJargons(Array.isArray(raw.detected_jargons) ? raw.detected_jargons : [], answer),
  };
}

export async function gradeWithAI(t: GradeContext, answer: string, attempt: number, maxAttempts: number, session: SessionRow, extras: GradeExtras = {}): Promise<GradingRaw> {
  await assertQuota(session.id);
  const hint = expectedFollowUpType(attempt, maxAttempts, t.tier);
  const raw = await callWithRetry(() => ({
    kind: "GRADE" as const, system: gradeSystem(), user: gradeUser(t, answer, attempt, maxAttempts, hint, extras),
    schema: gradeSchema(t.must_have_points.length), sessionId: session.id, parse: parseGrading,
  }));
  if (!raw) return fail("ERR_AI_UNAVAILABLE");
  const g = normalizeGrading(raw, t, answer);
  const isPassed = decidePass(g, t.must_have_points, answer);
  if (!verifyFollowUp(g, t, answer, isPassed).feedback_ok) {
    logGuardBlock("grade", attempt, null, [{ code: "G2" }]);
    g.feedback = staticFeedback(isPassed, attempt, maxAttempts);
  }
  g.feedback = firstSentences(g.feedback, CONFIG.FEEDBACK_MAX_SENTENCES);
  return g;
}
