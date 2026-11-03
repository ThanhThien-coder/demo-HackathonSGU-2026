/**
 * src/server/ai/grade.ts
 *
 * Xử lý lời gọi evaluate-feynman (chấm bài) theo spec 20 Mục 7 và spec 21 Mục 6.
 * (AI-27, AI-30 -> AI-34, GUARD-13, GUARD-14, GUARD-22).
 */

import { CONFIG } from "@/contracts";
import type {
  EvaluateFeynmanResponse,
  FollowUp,
  FollowUpType,
  GradeContext,
  GradingRaw,
  GuardIssue,
  NodeStateView,
  QuestionState,
  RunQuestion,
  SessionRow,
  SkillChange,
} from "@/contracts";
import { outcomeOf } from "@/lib/bkt-engine";
import { ApiHttpError } from "@/server/errors";
import { checkTokenQuota } from "@/server/quota";
import { callLLMWithRetry } from "./gemini";
import { firstSentences, normText } from "./guard/text";
import { verifyFollowUp } from "./guard/followup";
import { logGuardBlock } from "./guard/log";
import { gradeRequest } from "./prompts/grade";

export interface GradeUsage {
  tokens_in: number;
  tokens_out: number;
  requests: number;
}

export const INJECTION_MARKER = "__INJECTION__";

/**
 * Tạo kết quả giả lập khi câu trả lời bị chặn bởi regex tấn công (AI-33).
 */
export const injectionGrading = (
  t: Pick<RunQuestion, "must_have_points">
): GradingRaw => ({
  core_accuracy: 0,
  simplicity: 0,
  intent: "OFF_TOPIC",
  points: t.must_have_points.map((_, i) => ({
    index: i + 1,
    covered: false,
    quote: "",
  })),
  misconception: INJECTION_MARKER,
  follow_up_question: null,
  follow_up_type: null,
  follow_up_step_index: null,
  feedback:
    "Câu trả lời có câu lệnh gửi cho hệ thống chấm nên không được chấm. Hãy giải thích đoạn code bằng lời của bạn.",
  detected_jargons: [],
});

/**
 * Chuẩn hóa kết quả thô của AI đủ 5 ý theo AI-27:
 * (1) core_accuracy, simplicity kẹp [0, 100]
 * (2) points thành n = must_have_points.length mục index = 1..n: thiếu => false/"", trùng giữ đầu, ngoài khoảng bỏ
 * (3) intent !== "ANSWER" => core_accuracy = 0, mọi covered = false
 * (4) follow_up_step_index không nguyên => null
 * (5) detected_jargons lọc theo 21 GUARD-14: giữ mục có normText(j) khác rỗng và nằm trong normText(answer), bỏ trùng
 */
export function normalizeGrading(
  raw: GradingRaw,
  t: GradeContext,
  answer: string
): GradingRaw {
  // (1) Kẹp [0, 100]
  const core_accuracy = Math.min(100, Math.max(0, raw.core_accuracy));
  const simplicity = Math.min(100, Math.max(0, raw.simplicity));

  // (2) points index 1..n
  const n = t.must_have_points.length;
  const points: Array<{ index: number; covered: boolean; quote: string }> = [];
  const rawPoints = Array.isArray(raw.points) ? raw.points : [];

  for (let i = 1; i <= n; i++) {
    const found = rawPoints.find((p) => p.index === i);
    if (found) {
      points.push({
        index: i,
        covered: Boolean(found.covered),
        quote: typeof found.quote === "string" ? found.quote : "",
      });
    } else {
      points.push({
        index: i,
        covered: false,
        quote: "",
      });
    }
  }

  // (3) intent !== "ANSWER"
  let finalCoreAccuracy = core_accuracy;
  if (raw.intent !== "ANSWER") {
    finalCoreAccuracy = 0;
    for (const p of points) {
      p.covered = false;
    }
  }

  // (4) follow_up_step_index không nguyên
  let follow_up_step_index = raw.follow_up_step_index;
  if (follow_up_step_index !== null && !Number.isInteger(follow_up_step_index)) {
    follow_up_step_index = null;
  }

  // (5) detected_jargons lọc GUARD-14
  const normAns = normText(answer);
  const detected_jargons: string[] = [];
  const seenJargons = new Set<string>();

  if (Array.isArray(raw.detected_jargons)) {
    for (const j of raw.detected_jargons) {
      if (typeof j === "string") {
        const nj = normText(j);
        if (nj.length > 0 && normAns.includes(nj)) {
          if (!seenJargons.has(nj)) {
            seenJargons.add(nj);
            detected_jargons.push(j);
          }
        }
      }
    }
  }

  return {
    core_accuracy: finalCoreAccuracy,
    simplicity,
    intent: raw.intent,
    points,
    misconception: raw.misconception,
    follow_up_question: raw.follow_up_question,
    follow_up_type: raw.follow_up_type,
    follow_up_step_index,
    feedback: raw.feedback,
    detected_jargons,
  };
}

/**
 * Kiểm tra các ý bắt buộc có được trích dẫn hợp lệ theo so khớp lỏng (AI-30, D-13).
 */
export function coveredFlags(
  g: GradingRaw,
  mustHave: string[],
  answer: string
): boolean[] {
  if (g.intent === "OFF_TOPIC") {
    return mustHave.map(() => false);
  }
  const a = normText(answer);
  return mustHave.map((_, i) => {
    const p = g.points.find((x) => x.index === i + 1);
    if (!p || !p.covered) return false;
    const parts = p.quote
      .split(/…|\.\.\./)
      .map((x) =>
        normText(x).replace(/^[\s"'“”‘’«».,;:!?]+|[\s"'“”‘’«».,;:!?]+$/gu, "")
      )
      .filter((x) => x.length > 0);
    return (
      parts.length > 0 &&
      parts.join("").length >= CONFIG.GRADING_QUOTE_MIN_CHARS &&
      parts.every((x) => a.includes(x))
    );
  });
}

/**
 * Quyết định đạt (AI-30, D-13):
 * intent === "ANSWER" VÀ core_accuracy >= CONFIG.PASS_CORE_ACCURACY VÀ mọi ý đều covered.
 */
export const decidePass = (
  g: GradingRaw,
  mustHave: string[],
  answer: string
): boolean =>
  g.intent === "ANSWER" &&
  g.core_accuracy >= CONFIG.PASS_CORE_ACCURACY &&
  coveredFlags(g, mustHave, answer).every(Boolean);

/**
 * Loại gợi ý mong đợi theo số lượt (AI-31):
 * attempt >= maxAttempts => null (lượt cuối, hiện đáp án)
 * attempt === 1 => "CONCEPT"
 * attempt > 1 => "CODE_POINTER"
 */
export function expectedFollowUpType(
  attempt: number,
  maxAttempts: number
): FollowUpType | null {
  if (attempt >= maxAttempts) return null;
  return attempt === 1 ? "CONCEPT" : "CODE_POINTER";
}

/**
 * Mẫu gợi ý tĩnh (AI-32) khi AI trượt cổng gác.
 */
export function staticHint(
  type: FollowUpType,
  t: GradeContext,
  aiStep?: number | null
): FollowUp {
  if (type === "CONCEPT") {
    let question = "Hãy suy nghĩ thêm về cách các thành phần trong đoạn code phối hợp với nhau.";
    if (t.focus === "WEAKNESS") {
      question = "Đoạn code này có thể gặp vấn đề gì tiềm ẩn khi xử lý dữ liệu lớn hoặc trường hợp đặc biệt?";
    } else if (t.focus === "FLOW") {
      question = "Dữ liệu được tiếp nhận, xử lý và truyền qua các bước trong luồng này như thế nào?";
    } else if (t.focus === "ARCHITECTURE") {
      question = "Các phần trong đoạn code được phân chia trách nhiệm và tách tầng như thế nào?";
    } else if (t.focus === "CHANGE") {
      question = "Nếu cần thay đổi yêu cầu hoặc sửa đoạn code này, những phần nào sẽ bị ảnh hưởng?";
    }
    return { type: "CONCEPT", question, step_index: null };
  }

  // CODE_POINTER
  let s: number;
  if (aiStep !== null && aiStep !== undefined && t.step_indices.includes(aiStep)) {
    s = aiStep;
  } else {
    const midIdx = Math.floor((t.step_indices.length - 1) / 2);
    s = t.step_indices[midIdx] ?? t.step_indices[0];
  }

  const step = t.steps.find((st) => st.step_index === s);
  const fnName = step ? step.function_name : `bước ${s}`;
  const question = `Điều gì xảy ra ở hàm \`${fnName}\` khi thực hiện thao tác này?`;

  return { type: "CODE_POINTER", question, step_index: s };
}

/**
 * Mẫu phản hồi tĩnh (AI-32) khi AI trượt cổng gác.
 */
export function staticFeedback(
  isPassed: boolean,
  attempt: number,
  maxAttempts: number
): string {
  if (isPassed) {
    return "Chúc mừng bạn đã trả lời chính xác và đầy đủ các ý!";
  }
  if (attempt < maxAttempts) {
    return "Bạn đã nêu được một số ý đúng, hãy tham khảo thêm gợi ý bên dưới để hoàn thiện câu trả lời.";
  }
  return "Bạn đã dùng hết số lượt trả lời cho câu hỏi này. Hãy xem đáp án mẫu bên dưới để đối chiếu.";
}

/**
 * Quyết định gợi ý trả về cho người học (AI-31).
 */
export function decideFollowUp(
  g: GradingRaw,
  attempt: number,
  maxAttempts: number,
  isPassed: boolean,
  t: GradeContext,
  answer: string
): FollowUp | null {
  if (isPassed || g.misconception === INJECTION_MARKER) return null;
  const expected = expectedFollowUpType(attempt, maxAttempts);
  if (expected === null) return null;

  const ok =
    g.follow_up_type === expected &&
    g.follow_up_question !== null &&
    verifyFollowUp(g, t, answer, isPassed).follow_up_ok;

  return ok
    ? {
        type: expected,
        question: g.follow_up_question!,
        step_index: expected === "CODE_POINTER" ? g.follow_up_step_index : null,
      }
    : staticHint(expected, t, g.follow_up_step_index);
}

/**
 * Lời gọi chấm chính bằng AI (AI-27, AI-37).
 */
export async function gradeWithAI(
  t: GradeContext,
  answer: string,
  attempt: number,
  maxAttempts: number,
  session: SessionRow,
  opts?: { usage?: GradeUsage; nodeId?: string }
): Promise<GradingRaw> {
  checkTokenQuota(session.tokens_used);

  const req = gradeRequest(t, answer, attempt, maxAttempts, session);
  const outcome = await callLLMWithRetry(req);

  if (opts?.usage) {
    opts.usage.tokens_in += outcome.tokens_in;
    opts.usage.tokens_out += outcome.tokens_out;
    opts.usage.requests += 1;
  }

  if (!outcome.ok) {
    throw new ApiHttpError(outcome.code);
  }

  const g = normalizeGrading(outcome.value, t, answer);
  const isPassed = decidePass(g, t.must_have_points, answer);

  const expected = expectedFollowUpType(attempt, maxAttempts);
  const verification = verifyFollowUp(g, t, answer, isPassed);

  const issues: GuardIssue[] = [];
  const aiHintOk =
    g.follow_up_type === expected && g.follow_up_question !== null && verification.follow_up_ok;
  if (expected !== null && !isPassed && !aiHintOk) {  // khớp điều kiện dùng mẫu tĩnh của decideFollowUp
    issues.push({ code: "G1" });
  }
  if (!verification.feedback_ok) {
    issues.push({ code: "G2" });
  }
  if (issues.length > 0) {
    logGuardBlock("grade", 1, opts?.nodeId ?? null, issues);
  }

  if (!verification.feedback_ok) {
    g.feedback = staticFeedback(isPassed, attempt, maxAttempts);
  }
  g.feedback = firstSentences(g.feedback, CONFIG.FEEDBACK_MAX_SENTENCES);

  return g;
}

/**
 * Chuyển kết quả chấm thành response hoàn chỉnh gửi client (AI-34).
 */
export function toEvaluateResponse(
  g: GradingRaw,
  t: GradeContext,
  answer: string,
  attempt: number,
  maxAttempts: number,
  extra: {
    questionState: QuestionState;
    skillChange: SkillChange | null;
    nodeState: NodeStateView;
    unlockedNodeIds: string[];
    tokensUsed: number;
  }
): EvaluateFeynmanResponse {
  const isPassed = decidePass(g, t.must_have_points, answer);
  const points_covered = coveredFlags(g, t.must_have_points, answer);
  const follow_up = decideFollowUp(g, attempt, maxAttempts, isPassed, t, answer);

  const isFinished = isPassed || attempt >= maxAttempts;
  const question: QuestionState = {
    ...extra.questionState,
    attempts_used: attempt,
    finished: isFinished,
    outcome: isFinished ? outcomeOf(isPassed, attempt) : extra.questionState.outcome,
    reveal: isFinished
      ? {
          reference_answer: t.reference_answer,
          must_have_points: t.must_have_points,
          fix: t.fix,
        }
      : null,
  };

  return {
    question_index: t.question_index,
    attempt_number: attempt,
    core_accuracy: g.core_accuracy,
    simplicity: g.simplicity,
    intent: g.intent,
    is_passed: isPassed,
    points_covered,
    feedback: g.feedback,
    detected_jargons: g.detected_jargons,
    follow_up,
    question,
    skill_change: extra.skillChange,
    node_state: extra.nodeState,
    unlocked_node_ids: extra.unlockedNodeIds,
    tokens_used: extra.tokensUsed,
  };
}
