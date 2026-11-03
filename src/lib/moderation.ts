/**
 * src/lib/moderation.ts
 *
 * Bộ lọc an toàn & che dữ liệu nhạy cảm theo D-65, spec 04 Mục 13 ý 5.
 * Dùng chung cho cả server và client (nếu cần), 0 token, regex thuần.
 */

/**
 * Regex nguyên từ (word boundary) hỗ trợ Unicode và khoảng trắng.
 * (?<![\p{L}\p{N}_]) từ_quét (?![\p{L}\p{N}_]) với flag "iu".
 * Khoảng trắng trong từ quét khớp \s+ (GUARD-07).
 */
export const wordRe = (k: string): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`,
    "iu"
  );

/**
 * Danh sách từ xấu cấm: lưu dạng NFC chữ thường (D-65).
 * Chỉ bao gồm từ ngữ có dấu và cụm từ rõ nghĩa (xúc phạm, tục tĩu rõ ràng).
 * Tuyệt đối không bắt dạng không dấu mơ hồ (cac, lon) để tránh chặn nhầm code/tên biến;
 * Không chứa các từ kỹ thuật phổ biến (kill, attack, hack, daemon, terminate, abort...).
 */
export const BAD_WORDS: readonly string[] = [
  "địt con mẹ",
  "địt mẹ mày",
  "địt cụ mày",
  "địt bà mày",
  "địt mẹ",
  "địt cụ",
  "địt bà",
  "địt",
  "đụ con mẹ",
  "đụ má mày",
  "đụ mẹ mày",
  "đụ má",
  "đụ mẹ",
  "đụ mạ",
  "đụ",
  "đéo mẹ",
  "đéo",
  "cái lồn",
  "con lồn",
  "lồn",
  "cái cặc",
  "con cặc",
  "đầu cặc",
  "cặc",
  "cái buồi",
  "đầu buồi",
  "buồi",
  "chó đẻ",
  "thằng chó",
  "đồ chó",
  "đồ khốn nạn",
  "khốn nạn",
  "đồ khốn",
  "súc sinh",
  "mẹ kiếp",
  "con đĩ",
  "đĩ mẹ",
  "đĩ",
  "chịch",
].map((w) => w.normalize("NFC").toLowerCase());

// Regex email theo spec 04 Mục 13 ý 5: [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Regex SĐT VN theo spec 04 Mục 13 ý 5: (?<!\d)(\+84|0)(3|5|7|8|9)[0-9]{8}(?!\d)
const VN_PHONE_RE = /(?<!\d)(?:\+84|0)[35789]\d{8}(?!\d)/g;

// Regex CCCD 12 số theo spec 04 Mục 13 ý 5: \b0[0-9]{11}\b
const CCCD_RE = /\b0[0-9]{11}\b/g;

/**
 * Kiểm tra xem văn bản có chứa từ xấu trong BAD_WORDS hay không.
 * Luôn chuẩn hóa text sang NFC trước khi kiểm tra (D-65, D27).
 */
export function hasInappropriateWords(text: string): boolean {
  if (!text) return false;
  const norm = text.normalize("NFC");
  return BAD_WORDS.some((w) => wordRe(w).test(norm));
}

/**
 * Che email, SĐT VN, CCCD 12 số và từ xấu thành ***, bảo toàn số lượng dòng \n.
 * Cửa repo và bài làm dùng hàm này để làm sạch PII trước khi gửi AI và lưu DB (D-65, spec 04 Mục 13 ý 5).
 */
export function maskSensitive(text: string): string {
  if (!text) {
    return "";
  }

  let result = text.normalize("NFC");

  // 1. Che email
  result = result.replace(EMAIL_RE, "***");

  // 2. Che SĐT VN
  result = result.replace(VN_PHONE_RE, "***");

  // 3. Che CCCD 12 số
  result = result.replace(CCCD_RE, "***");

  // 4. Che từ xấu (ưu tiên cụm dài hơn trước)
  const sortedBadWords = [...BAD_WORDS].sort((a, b) => b.length - a.length);
  for (const bw of sortedBadWords) {
    const re = new RegExp(wordRe(bw).source, "giu");
    result = result.replace(re, (match) => {
      const newlines = (match.match(/\n/g) || []).length;
      return "***" + "\n".repeat(newlines);
    });
  }

  return result;
}
