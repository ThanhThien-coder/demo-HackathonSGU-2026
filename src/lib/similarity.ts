/**
 * Đo độ dài câu trả lời và độ tương đồng Levenshtein (GUARD-16)
 * Nguồn: .kb/spec/21_AI_KIEM_VA_DUYET.md Mục 8
 *
 * Dùng chung giữa client và server. Mọi lỗi ở đây không tính lượt nộp.
 */

import { CONFIG } from "@/contracts/config";

/**
 * Kiểm tra độ dài câu trả lời của người học theo ngưỡng trong CONFIG.
 * - Sau khi bỏ toàn bộ khoảng trắng, nếu số code point < CONFIG.ANSWER_MIN_CHARS: ERR_ANSWER_TOO_SHORT
 * - Tổng số code point > CONFIG.ANSWER_MAX_CHARS: ERR_ANSWER_TOO_LONG (không cắt bớt)
 * - Hợp lệ: trả về null
 */
export function validateAnswerLength(a: string): "ERR_ANSWER_TOO_SHORT" | "ERR_ANSWER_TOO_LONG" | null {
  if ([...a.replace(/\s/gu, "")].length < CONFIG.ANSWER_MIN_CHARS) {
    return "ERR_ANSWER_TOO_SHORT";
  }
  if ([...a].length > CONFIG.ANSWER_MAX_CHARS) {
    return "ERR_ANSWER_TOO_LONG";
  }
  return null;
}

/**
 * Chuẩn hóa chuỗi về mảng code point:
 * Chuẩn hóa NFC -> chữ thường -> gộp các khoảng trắng liên tiếp thành 1 dấu cách -> trim 2 đầu.
 */
const collapse =(s: string): string[] => [
  ...s.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim(),
];

/**
 * Khoảng cách Levenshtein chuẩn (chèn / xóa / thay thế = 1) trên mảng code point.
 */
export function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const aChar = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const bChar = b[j - 1];
      const cost = aChar === bChar ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // xóa
        curr[j - 1] + 1,   // chèn
        prev[j - 1] + cost // thay thế
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[n];
}

/**
 * Độ tương đồng Levenshtein: 1 - Levenshtein / max(len)
 * Nếu cả hai chuỗi sau khi collapse đều rỗng, trả về 1.
 */
export function similarity(a: string, b: string): number {
  const A = collapse(a);
  const B = collapse(b);
  if (A.length === 0 && B.length === 0) {
    return 1;
  }
  return 1 - levenshtein(A, B) / Math.max(A.length, B.length);
}
