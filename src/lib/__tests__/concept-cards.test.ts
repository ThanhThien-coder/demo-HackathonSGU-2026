import { describe, it, expect } from "vitest";
import { SWE_SKILLS } from "@/contracts";
import { CONCEPT_CARDS, conceptCardOf, skillLabel } from "../concept-cards";

describe("concept-cards — 16 thẻ khái niệm (UI-43)", () => {
  it("Có đủ 16 thẻ, khóa trùng SWE_SKILLS", () => {
    expect(Object.keys(CONCEPT_CARDS).sort()).toEqual([...SWE_SKILLS].sort());
    expect(SWE_SKILLS.length).toBe(16);
  });

  it("Mỗi thẻ đủ tên, 'Là gì', 'Ví dụ đời thường', 'Vì sao quan trọng'", () => {
    for (const skill of SWE_SKILLS) {
      const c = CONCEPT_CARDS[skill];
      expect(c.title.trim().length, `${skill}.title`).toBeGreaterThan(0);
      expect(c.what.trim().length, `${skill}.what`).toBeGreaterThan(0);
      expect(c.example.trim().length, `${skill}.example`).toBeGreaterThan(0);
      expect(c.why.trim().length, `${skill}.why`).toBeGreaterThan(0);
    }
  });

  it("conceptCardOf / skillLabel: mã lạ ⇒ null / giữ nguyên mã", () => {
    expect(conceptCardOf("DB_OPTIMIZATION")?.title).toBe("Tối ưu truy vấn database");
    expect(conceptCardOf("KHONG_CO")).toBeNull();
    expect(skillLabel("LAYERED_SEPARATION")).toBe("Chia tầng");
    expect(skillLabel("KHONG_CO")).toBe("KHONG_CO");
  });
});
