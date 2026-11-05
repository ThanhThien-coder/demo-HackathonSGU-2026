// 21 GUARD-16 — kiểm câu trả lời trước khi chấm; dùng chung client và server.
import { CONFIG } from "@/contracts/config";

export function validateAnswerLength(a: string): "ERR_ANSWER_TOO_SHORT" | "ERR_ANSWER_TOO_LONG" | null {
  if ([...a.replace(/\s/gu, "")].length < CONFIG.ANSWER_MIN_CHARS) return "ERR_ANSWER_TOO_SHORT";
  if ([...a].length > CONFIG.ANSWER_MAX_CHARS) return "ERR_ANSWER_TOO_LONG";
  return null;
}

const collapse = (s: string) => [...s.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim()];

function levenshtein(A: string[], B: string[]): number {
  if (A.length === 0) return B.length;
  if (B.length === 0) return A.length;
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

/** 1 − Levenshtein / max(len) trên mảng code point đã chuẩn hóa. */
export function similarity(a: string, b: string): number {
  const A = collapse(a);
  const B = collapse(b);
  return A.length === 0 && B.length === 0 ? 1 : 1 - levenshtein(A, B) / Math.max(A.length, B.length);
}
