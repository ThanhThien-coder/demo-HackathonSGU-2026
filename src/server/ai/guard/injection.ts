/**
 * Cổng gác: Regex câu lệnh tấn công (GUARD-15)
 * Nguồn: .kb/spec/21_AI_KIEM_VA_DUYET.md Mục 7
 *
 * Chỉ bắt mẫu câu lệnh gửi hệ thống chấm, có dấu và không dấu.
 * Chạy ở server sau khi kiểm tra độ dài và trùng lặp, trước khi gọi AI.
 */

const INJECTION_PATTERNS = [
  // VI — bỏ qua / phớt lờ / quên (+ mọi, tất cả, các…) hướng dẫn | chỉ thị | chỉ dẫn | prompt | quy tắc chấm…
  String.raw`(?:bỏ\s*qua|bo\s*qua|phớt\s*lờ|phot\s*lo|lờ\s*đi|lo\s*di|quên\s*(?:hết|đi)?|quen\s*(?:het|di)?)\s+(?:(?:hết|het|mọi|moi|tất\s*cả|tat\s*ca|các|cac|những|nhung|toàn\s*bộ|toan\s*bo)\s+)*(?:hướng\s*dẫn|huong\s*dan|chỉ\s*thị|chi\s*thi|chỉ\s*dẫn|chi\s*dan|prompt|(?:quy\s*tắc|quy\s*tac|luật|luat)\s+(?:chấm|cham|hệ\s*thống|he\s*thong|trước|truoc|ở\s*trên|o\s*tren|trên|tren))`,
  // VI — cho / chấm (cho) tôi|em|mình… N điểm | điểm tối đa | full điểm
  String.raw`(?:cho|chấm|cham)\s+(?:cho\s+)?(?:tôi|toi|em|mình|minh|tao|tui|bài\s*này|bai\s*nay|câu\s*này|cau\s*nay)\s+(?:được\s+|duoc\s+)?(?:\d{1,3}\s*(?:điểm|diem|\/\s*100)|(?:điểm|diem)\s+(?:tối\s*đa|toi\s*da|cao\s*nhất|cao\s*nhat|max|full)|(?:full|max)\s*(?:điểm|diem))`,
  // VI — hãy chấm đạt / đúng
  String.raw`(?:hãy|hay)\s+(?:chấm|cham)\s+(?:cho\s+\S+\s+)?(?:là\s+|la\s+)?(?:đạt|dat|đúng|dung|pass|qua|100)`,
  // EN
  String.raw`(?:ignore|disregard|forget)\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:previous\s+|prior\s+|above\s+|earlier\s+)?(?:instructions?|prompts?|rules)`,
  String.raw`(?:give|grade|score|mark)\s+(?:me|this(?:\s+answer)?|it)\s+(?:a\s+|an\s+)?(?:\d{1,3}\s*(?:points?|marks?|\/\s*100)|full\s+(?:points?|marks?|score)|max(?:imum)?\s+(?:points?|marks?|score))`,
  String.raw`system\s*prompt|prompt\s*injection|system\s*override|jailbreak|developer\s*mode|you\s+are\s+now`,
  // Sửa trường JSON / giả thẻ
  String.raw`\b(?:is_passed|core_accuracy|intent)\b\s*["']?\s*[:=]`,
  String.raw`<\s*\/?\s*(?:system|student_answer|code_data|reference_answer|must_have_points|hint_rule|instructions?)\s*>`,
];

export const INJECTION_REGEX = new RegExp(
  INJECTION_PATTERNS.map((p) => `(?:${p})`).join("|"),
  "iu"
);

/**
 * Kiểm tra xem câu trả lời có chứa mẫu injection hay không.
 * Luôn chuẩn hóa Unicode về NFC trước khi kiểm tra regex.
 */
export function isInjection(answer: string): boolean {
  return INJECTION_REGEX.test(answer.normalize("NFC"));
}
