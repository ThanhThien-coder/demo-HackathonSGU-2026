import { describe, it, expect } from "vitest";
import { validateAnswerLength, similarity, levenshtein } from "../similarity";
import { CONFIG } from "@/contracts/config";

describe("GUARD-16: Kiểm câu trả lời trước khi chấm (src/lib/similarity.ts)", () => {
  describe("validateAnswerLength", () => {
    it('trả về ERR_ANSWER_TOO_SHORT khi câu trả lời bỏ khoảng trắng < ANSWER_MIN_CHARS ("  abc  def  ")', () => {
      // "  abc  def  " có 6 ký tự không phải khoảng trắng < CONFIG.ANSWER_MIN_CHARS (15)
      expect(validateAnswerLength("  abc  def  ")).toBe("ERR_ANSWER_TOO_SHORT");
    });

    it("trả về ERR_ANSWER_TOO_SHORT khi câu trả lời rỗng hoặc chỉ chứa khoảng trắng", () => {
      expect(validateAnswerLength("")).toBe("ERR_ANSWER_TOO_SHORT");
      expect(validateAnswerLength("   \t\n  ")).toBe("ERR_ANSWER_TOO_SHORT");
    });

    it("trả về ERR_ANSWER_TOO_LONG khi tổng số code point > ANSWER_MAX_CHARS (2001 ký tự)", () => {
      const long2001 = "a".repeat(CONFIG.ANSWER_MAX_CHARS + 1);
      expect(validateAnswerLength(long2001)).toBe("ERR_ANSWER_TOO_LONG");
    });

    it("trả về null khi số ký tự đạt ngưỡng trần đúng ANSWER_MAX_CHARS (2000 ký tự)", () => {
      const exact2000 = "a".repeat(CONFIG.ANSWER_MAX_CHARS);
      expect(validateAnswerLength(exact2000)).toBeNull();
    });

    it("trả về null cho câu trả lời hợp lệ đủ độ dài", () => {
      const valid = "Hàm findById được gọi 200 lần trong vòng for lặp sản phẩm.";
      expect(validateAnswerLength(valid)).toBeNull();
    });

    it("xử lý đúng theo code point Unicode (emoji có 2 UTF-16 code units nhưng là 1 code point)", () => {
      // 14 emoji (14 code point < CONFIG.ANSWER_MIN_CHARS 15)
      const shortEmoji = "🚀".repeat(CONFIG.ANSWER_MIN_CHARS - 1);
      expect(validateAnswerLength(shortEmoji)).toBe("ERR_ANSWER_TOO_SHORT");

      // 15 emoji (15 code point >= CONFIG.ANSWER_MIN_CHARS)
      const validEmoji = "🚀".repeat(CONFIG.ANSWER_MIN_CHARS);
      expect(validateAnswerLength(validEmoji)).toBeNull();

      // 2001 emoji (2001 code point > CONFIG.ANSWER_MAX_CHARS)
      const longEmoji = "🚀".repeat(CONFIG.ANSWER_MAX_CHARS + 1);
      expect(validateAnswerLength(longEmoji)).toBe("ERR_ANSWER_TOO_LONG");
    });
  });

  describe("similarity", () => {
    it('trả về 1 khi 2 câu chỉ khác nhau về viết hoa và khoảng trắng (similarity("200 truy vấn", " 200  Truy vấn ") = 1)', () => {
      expect(similarity("200 truy vấn", " 200  Truy vấn ")).toBe(1);
    });

    it('trả về < 0.8 cho 2 câu diễn đạt khác nhau (similarity("200 truy vấn, vì có 200 sản phẩm.", "201: findAll 1 lần rồi findById 200 lần") < 0.8)', () => {
      const sim = similarity(
        "200 truy vấn, vì có 200 sản phẩm.",
        "201: findAll 1 lần rồi findById 200 lần"
      );
      expect(sim).toBeLessThan(CONFIG.ANSWER_DUPLICATE_SIMILARITY);
    });

    it("trả về 1 khi cả hai chuỗi rỗng sau khi collapse", () => {
      expect(similarity("", "")).toBe(1);
      expect(similarity("   \n\t", "  ")).toBe(1);
    });

    it("trả về 0 khi một chuỗi rỗng và một chuỗi có ký tự", () => {
      expect(similarity("", "hello")).toBe(0);
      expect(similarity("world", "")).toBe(0);
    });

    it("trả về 1 cho 2 chuỗi giống hệt nhau", () => {
      const text = "Kiến trúc hệ thống sử dụng Clean Architecture";
      expect(similarity(text, text)).toBe(1);
    });
  });

  describe("chuẩn hóa và levenshtein", () => {
    it("similarity chuẩn hóa NFC, chữ thường và gộp khoảng trắng trước khi so", () => {
      expect(similarity("  HÀM   FindById  ", "hàm findbyid")).toBe(1);
      expect(similarity("Hàm".normalize("NFD"), "hàm")).toBe(1);
    });

    it("levenshtein tính đúng khoảng cách sửa chuỗi trên mảng code point", () => {
      expect(levenshtein(["a", "b", "c"], ["a", "b", "c"])).toBe(0);
      expect(levenshtein(["a", "b", "c"], ["a", "d", "c"])).toBe(1);
      expect(levenshtein([], ["a", "b"])).toBe(2);
      expect(levenshtein(["a", "b"], [])).toBe(2);
      expect(levenshtein(["k", "i", "t", "t", "e", "n"], ["s", "i", "t", "t", "i", "n", "g"])).toBe(3);
    });
  });
});
