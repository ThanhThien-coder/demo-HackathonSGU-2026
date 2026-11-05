// 21 Mục 6–7 — kiểm output chấm (GUARD-13/14), regex câu lệnh tấn công (GUARD-15), ghi mã lỗi (GUARD-22).
import { CONFIG } from "@/contracts/config";
import type { GradeContext, GradingRaw, GuardCall, GuardCode, GuardIssue, GuardLogEntry } from "@/contracts";
import { log } from "../../log";
import { LOC_RE, backticks, checkNames, findForbidden, gradeScope, identWords, norm, normText, stripLineRefs } from "./text";

const nums = (s: string) => new Set(s.match(/\d+/g) ?? []);

/** Lộ con số: có trong đáp án / ý bắt buộc, KHÔNG có trong câu hỏi và KHÔNG có trong câu trả lời. */
export function leaksNumbers(text: string, t: GradeContext, answer: string): boolean {
  const secret = nums(`${t.reference_answer} ${t.must_have_points.join(" ")}`);
  const known = new Set([...nums(t.feynman_question), ...nums(answer)]);
  for (const n of nums(text)) if (secret.has(n) && !known.has(n)) return true;
  return false;
}

export function verifyFollowUp(g: GradingRaw, t: GradeContext, answer: string, isPassed: boolean): { follow_up_ok: boolean; feedback_ok: boolean } {
  const sc = gradeScope(t, answer);
  const q = g.follow_up_question ?? "";
  let fok = q.trim().length > 0 && (g.follow_up_type === "CONCEPT" || g.follow_up_type === "CODE_POINTER");
  fok = fok && findForbidden([q], t.forbidden_external_keywords).length === 0 && checkNames([q], sc).length === 0;
  if (fok && g.follow_up_type === "CONCEPT") {
    const lastNames = t.steps.map((s) => norm(s.function_name.split(".").pop() ?? ""));
    const qWords = identWords(q);
    const baseNames = t.steps.map((s) => s.file_path.split("/").pop()!.toLowerCase());
    fok = backticks(q).length === 0 && !LOC_RE.test(q) && !baseNames.some((b) => q.toLowerCase().includes(b)) &&
      !lastNames.some((n) => n && qWords.has(n)) && !leaksNumbers(q, t, answer);
  } else if (fok) {
    const idx = g.follow_up_step_index;
    const stepIdx = t.steps.map((s) => s.step_index);
    fok = Number.isInteger(idx) && stepIdx.includes(idx as number) && !leaksNumbers(stripLineRefs(q.replace(new RegExp(LOC_RE.source, "giu"), "")), t, answer);
  }
  const f = g.feedback ?? "";
  let bok = f.trim().length > 0 && findForbidden([f], t.forbidden_external_keywords).length === 0 && checkNames([f], sc).length === 0;
  if (bok && !isPassed) {
    const ansWords = identWords(answer);
    const namesOk = backticks(f).every((b) => (b.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []).every((w) => ansWords.has(norm(w))));
    const loc = LOC_RE.exec(f);
    const locOk = !loc || normText(answer).includes(normText(loc[0]));
    bok = namesOk && locOk && !leaksNumbers(f, t, answer);
  }
  return { follow_up_ok: fok, feedback_ok: bok };
}

export function cleanJargons(list: string[], answer: string): string[] {
  const a = normText(answer);
  return [...new Set(list.filter((j) => normText(j) && a.includes(normText(j))))];
}

// ---------- GUARD-15 ----------
const INJECTION_PATTERNS = [
  String.raw`(?:bỏ\s*qua|bo\s*qua|phớt\s*lờ|phot\s*lo|lờ\s*đi|lo\s*di|quên\s*(?:hết|đi)?|quen\s*(?:het|di)?)\s+(?:(?:hết|het|mọi|moi|tất\s*cả|tat\s*ca|các|cac|những|nhung|toàn\s*bộ|toan\s*bo)\s+)*(?:hướng\s*dẫn|huong\s*dan|chỉ\s*thị|chi\s*thi|chỉ\s*dẫn|chi\s*dan|prompt|(?:quy\s*tắc|quy\s*tac|luật|luat)\s+(?:chấm|cham|hệ\s*thống|he\s*thong|trước|truoc|ở\s*trên|o\s*tren|trên|tren))`,
  String.raw`(?:cho|chấm|cham)\s+(?:cho\s+)?(?:tôi|toi|em|mình|minh|tao|tui|bài\s*này|bai\s*nay|câu\s*này|cau\s*nay)\s+(?:được\s+|duoc\s+)?(?:\d{1,3}\s*(?:điểm|diem|\/\s*100)|(?:điểm|diem)\s+(?:tối\s*đa|toi\s*da|cao\s*nhất|cao\s*nhat|max|full)|(?:full|max)\s*(?:điểm|diem))`,
  String.raw`(?:hãy|hay)\s+(?:chấm|cham)\s+(?:cho\s+\S+\s+)?(?:là\s+|la\s+)?(?:đạt|dat|đúng|dung|pass|qua|100)`,
  String.raw`(?:ignore|disregard|forget)\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:previous\s+|prior\s+|above\s+|earlier\s+)?(?:instructions?|prompts?|rules)`,
  String.raw`(?:give|grade|score|mark)\s+(?:me|this(?:\s+answer)?|it)\s+(?:a\s+|an\s+)?(?:\d{1,3}\s*(?:points?|marks?|\/\s*100)|full\s+(?:points?|marks?|score)|max(?:imum)?\s+(?:points?|marks?|score))`,
  String.raw`system\s*prompt|prompt\s*injection|system\s*override|jailbreak|developer\s*mode|you\s+are\s+now`,
  String.raw`\b(?:is_passed|core_accuracy|intent)\b\s*["']?\s*[:=]`,
  String.raw`<\s*\/?\s*(?:system|student_answer|code_data|reference_answer|must_have_points|hint_rule|instructions?)\s*>`,
];
export const INJECTION_REGEX = new RegExp(INJECTION_PATTERNS.map((p) => `(?:${p})`).join("|"), "iu");
export const isInjection = (answer: string) => INJECTION_REGEX.test(answer.normalize("NFC"));

// ---------- GUARD-22 ----------
export function logGuardBlock(call: GuardCall, attempt: number, nodeId: string | null, issues: GuardIssue[]): void {
  const codes = [...new Set(issues.map((i) => i.code))] as GuardCode[];
  const entry: GuardLogEntry = {
    event: "guard_blocked", call, attempt, node_id: nodeId, codes, prompt_version: CONFIG.PROMPT_VERSION, llm_model: CONFIG.LLM_MODEL,
  };
  log.warn(entry);
}
