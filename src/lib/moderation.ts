// D-65: lọc từ ngữ không phù hợp (0 token, 0 DB). Danh sách ngắn, dùng chung server/client.
export const BAD_WORDS: string[] = [
  "fuck", "shit", "bitch", "asshole", "dm", "đm", "địt", "dit me", "đụ", "cặc", "lồn", "đéo", "vãi lồn", "clm", "vcl",
];

const norm = (s: string) => s.normalize("NFC").toLowerCase();

const wordRe = (k: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`,
    "iu",
  );

export function hasInappropriateWords(text: string): boolean {
  const t = norm(text);
  return BAD_WORDS.some((w) => wordRe(w).test(t));
}

// PII (email, SĐT, CCCD) ⇒ *** trước khi gửi AI và lưu DB (D-65)
export function maskSensitiveWithCount(text: string): { text: string; count: number } {
  let count = 0;
  const hit = () => { count++; return "***"; };
  const out = text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, hit)
    .replace(/(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/g, hit)
    .replace(/(?<!\d)\d{12}(?!\d)/g, hit);
  return { text: out, count };
}

export const maskSensitive = (text: string): string => maskSensitiveWithCount(text).text;
