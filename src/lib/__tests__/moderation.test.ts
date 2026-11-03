/**
 * src/lib/__tests__/moderation.test.ts
 *
 * Kiểm thử mức hàm cho bộ lọc an toàn moderation.ts theo spec 50 Mục 3.4:
 * D22, D25, D26, D27.
 */

import { describe, it, expect } from "vitest";
import {
  hasInappropriateWords,
  maskSensitive,
  BAD_WORDS,
} from "../moderation";

describe("D22: Không chặn từ kỹ thuật", () => {
  it("D22: Câu trả lời kỹ thuật chứa từ kill, attack, hack không bị chặn", () => {
    const technicalInputs = [
      "Code uses process.kill() when receiving SIGTERM",
      "Hàm này ngăn chặn tấn công brute force và ddos attack",
      "Tránh trường hợp hệ thống bị hack hoặc kẻ xấu inject payload",
      "Background daemon worker will terminate and abort hanging requests",
      "kill -9 pid để giải phóng tài nguyên",
    ];

    for (const input of technicalInputs) {
      expect(hasInappropriateWords(input)).toBe(false);
    }
  });

  it("D22: BAD_WORDS không chứa bất kỳ từ kỹ thuật nào", () => {
    const technicalKeywords = [
      "kill",
      "attack",
      "hack",
      "daemon",
      "terminate",
      "abort",
    ];
    for (const kw of technicalKeywords) {
      expect(BAD_WORDS).not.toContain(kw);
    }
  });
});

describe("D25: Che email, SĐT VN, giữ nguyên hằng số và số dòng", () => {
  it("D25: comment chứa support@shop-demo.vn và 0912345678 bị che, const ts = 10912345678 không bị che, số lượng \\n không đổi", () => {
    const input = [
      "// Liên hệ hỗ trợ: support@shop-demo.vn hoặc 0912345678",
      "const ts = 10912345678;",
      "const phone = '+84912345678';",
    ].join("\n");

    const masked = maskSensitive(input);
    const lines = masked.split("\n");

    // So sánh dòng comment đã che email và SĐT
    expect(lines[0]).toBe("// Liên hệ hỗ trợ: *** hoặc ***");
    expect(lines[0]).not.toContain("support@shop-demo.vn");
    expect(lines[0]).not.toContain("0912345678");

    // Dòng const ts = 10912345678; còn nguyên
    expect(lines[1]).toBe("const ts = 10912345678;");

    // Dòng phone cũng được che
    expect(lines[2]).toBe("const phone = '***';");

    // Số lượng dòng \n bảo toàn tuyệt đối
    const inputNewlines = (input.match(/\n/g) || []).length;
    const maskedNewlines = (masked.match(/\n/g) || []).length;
    expect(maskedNewlines).toBe(inputNewlines);
    expect(maskedNewlines).toBe(2);
  });
});

describe("D26: Che email (phần secret chờ B04)", () => {
  it("D26: Che email thành *** trong câu trả lời (phần secret chờ B04)", () => {
    const input = "Email liên hệ là developer@example.com";
    const masked = maskSensitive(input);

    expect(masked).toBe("Email liên hệ là ***");
    expect(masked).not.toContain("developer@example.com");
  });

  it("D26: Câu trả lời chứa secret đã che và email thì email bị che thành *** (phần secret chờ B04)", () => {
    const input =
      "Khóa API là <REDACTED_SECRET> và email liên hệ là developer@example.com";
    const masked = maskSensitive(input);

    expect(masked).toContain("<REDACTED_SECRET>");
    expect(masked).toContain("***");
    expect(masked).not.toContain("developer@example.com");
  });
});

describe("D27: Xử lý NFD và từ xấu trong từ dài hơn", () => {
  it("D27: Câu trả lời có từ xấu gõ dạng NFD vẫn bị chặn", () => {
    // Tạo chuỗi dạng NFD (ký tự phân rã)
    const nfdDit = "địt".normalize("NFD");
    const nfdDuMa = "đụ má".normalize("NFD");
    const nfdLon = "lồn".normalize("NFD");

    expect(nfdDit).not.toBe("địt"); // Xác nhận NFD khác binary với NFC
    expect(hasInappropriateWords(`Câu trả lời chứa từ ${nfdDit} ở giữa`)).toBe(
      true
    );
    expect(hasInappropriateWords(`Bực mình quá ${nfdDuMa}`)).toBe(true);
    expect(hasInappropriateWords(`Trông như cái ${nfdLon}`)).toBe(true);
  });

  it("D27: Từ xấu nằm trong một từ dài hơn không bị chặn", () => {
    const harmlessWords = [
      "chiến dịch quảng bá",
      "xung đột tài nguyên giữa các luồng",
      "phân định rõ vai trò",
      "tra cứu trong từ điển",
      "tác vụ này có tính xác định cao",
      "địtaa",
      "ađịt",
      "lồna",
      "blồn",
      "cặcc",
      "buồii",
    ];

    for (const text of harmlessWords) {
      expect(hasInappropriateWords(text)).toBe(false);
    }
  });
});

describe("Bảo vệ bổ sung: CCCD 12 số và che từ xấu trong văn bản", () => {
  it("Che CCCD 12 số bắt đầu bằng 0", () => {
    const input = "Số CCCD của tôi là 012345678901 ngày cấp 2022";
    const masked = maskSensitive(input);
    expect(masked).toBe("Số CCCD của tôi là *** ngày cấp 2022");
  });

  it("Che từ xấu trong văn bản và giữ nguyên các từ hợp lệ", () => {
    const input = "Hàm này viết ngu như chó đẻ, cần refactor lại";
    const masked = maskSensitive(input);
    expect(masked).toBe("Hàm này viết ngu như ***, cần refactor lại");
  });

  it("Bảo toàn số lượng \\n khi có nhiều dòng liên tiếp", () => {
    const multiline = "Dòng 1: test@gmail.com\n\nDòng 3: 0987654321\n\n\nDòng 6";
    const masked = maskSensitive(multiline);
    const beforeN = (multiline.match(/\n/g) || []).length;
    const afterN = (masked.match(/\n/g) || []).length;
    expect(afterN).toBe(beforeN);
    expect(afterN).toBe(5);
  });

  it("Từ xấu bị xuống dòng giữa chừng (ví dụ 'chó' + xuống dòng + 'đẻ') bị che và số dấu xuống dòng không đổi", () => {
    const input = "Hàm này viết ngu như chó\nđẻ, cần refactor lại";
    const masked = maskSensitive(input);

    expect(masked).toBe("Hàm này viết ngu như ***\n, cần refactor lại");
    expect(masked).not.toContain("chó");
    expect(masked).not.toContain("đẻ");

    const inputNewlines = (input.match(/\n/g) || []).length;
    const maskedNewlines = (masked.match(/\n/g) || []).length;
    expect(maskedNewlines).toBe(inputNewlines);
    expect(maskedNewlines).toBe(1);
  });
});
