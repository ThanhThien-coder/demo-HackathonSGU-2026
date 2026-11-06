import { describe, it, expect } from "vitest";
import { CONFIG } from "@/contracts/config";
import { ERROR_MESSAGES } from "@/lib/messages";
import {
  explanationKey,
  explainButtonState,
  shortSelection,
  explainErrorText,
} from "../selection-explain";

describe("src/lib/selection-explain.ts (D-82, UI-34, D19)", () => {
  describe("explanationKey", () => {
    it("định dạng đúng {node_id}:{step_number}:{line_start}:{col_start}-{line_end}:{col_end}", () => {
      const key = explanationKey("node-auth", 2, {
        line_start: 14,
        col_start: 3,
        line_end: 18,
        col_end: 25,
      });
      expect(key).toBe("node-auth:2:14:3-18:25");
    });
  });

  describe("explainButtonState", () => {
    it("trả về visible = false khi đang ở chế độ offline", () => {
      const state = explainButtonState("const x = 1;", true);
      expect(state).toEqual({
        visible: false,
        disabled: false,
        tooltip: null,
      });
    });

    it("trả về visible = false khi đoạn chọn rỗng hoặc chỉ có khoảng trắng", () => {
      expect(explainButtonState("", false)).toEqual({
        visible: false,
        disabled: false,
        tooltip: null,
      });
      expect(explainButtonState("   \n\t  ", false)).toEqual({
        visible: false,
        disabled: false,
        tooltip: null,
      });
    });

    it("trả về disabled = true và tooltip khi đoạn chọn dài hơn CONFIG.EXPLAIN_SELECTION_MAX_CHARS", () => {
      const longText = "a".repeat(CONFIG.EXPLAIN_SELECTION_MAX_CHARS + 1);
      const state = explainButtonState(longText, false);
      expect(state).toEqual({
        visible: true,
        disabled: true,
        tooltip: "Chọn đoạn ngắn hơn",
      });
    });

    it("trả về visible = true, disabled = false, tooltip = null khi đoạn chọn hợp lệ", () => {
      const validText = "const token = await verifyToken(req);";
      const state = explainButtonState(validText, false);
      expect(state).toEqual({
        visible: true,
        disabled: false,
        tooltip: null,
      });

      // Kiểm tra giá trị đúng biên giới hạn
      const boundaryText = "x".repeat(CONFIG.EXPLAIN_SELECTION_MAX_CHARS);
      const boundaryState = explainButtonState(boundaryText, false);
      expect(boundaryState).toEqual({
        visible: true,
        disabled: false,
        tooltip: null,
      });
    });
  });

  describe("shortSelection", () => {
    it("gộp nhiều khoảng trắng và xuống dòng thành một dấu cách duy nhất", () => {
      const text = "   const   x   =\n\t  await   fetchData();   ";
      expect(shortSelection(text)).toBe("const x = await fetchData();");
    });

    it("giữ nguyên văn bản khi độ dài nhỏ hơn hoặc bằng 40 ký tự", () => {
      const shortText = "const status = 200;";
      expect(shortSelection(shortText)).toBe("const status = 200;");

      const exactly40 = "1234567890123456789012345678901234567890";
      expect(shortSelection(exactly40)).toBe(exactly40);
      expect(shortSelection(exactly40).length).toBe(40);
    });

    it("cắt lấy 40 ký tự đầu và nối thêm dấu '…' khi độ dài lớn hơn 40 ký tự", () => {
      const over40 = "const token = await verifyJwtTokenFromHeader(req);";
      const result = shortSelection(over40);
      expect(result).toBe(over40.slice(0, 40) + "…");
      expect(result.startsWith(over40.slice(0, 40))).toBe(true);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("explainErrorText", () => {
    it("trả về câu chuẩn cho ERR_AI_UNAVAILABLE", () => {
      expect(explainErrorText("ERR_AI_UNAVAILABLE")).toBe(
        "AI đang bận — chưa giải thích được đoạn này."
      );
    });

    it("trả về thông điệp từ ERROR_MESSAGES cho ERR_SELECTION_INVALID", () => {
      expect(explainErrorText("ERR_SELECTION_INVALID")).toBe(
        ERROR_MESSAGES.ERR_SELECTION_INVALID
      );
    });

    it("trả về thông điệp từ ERROR_MESSAGES cho ERR_EXPLAIN_LIMIT", () => {
      expect(explainErrorText("ERR_EXPLAIN_LIMIT")).toBe(
        ERROR_MESSAGES.ERR_EXPLAIN_LIMIT
      );
    });

    it("trả về thông điệp từ ERROR_MESSAGES cho các mã lỗi khác nếu có", () => {
      expect(explainErrorText("ERR_CLIENT_NETWORK")).toBe(
        ERROR_MESSAGES.ERR_CLIENT_NETWORK
      );
    });

    it("trả về câu dự phòng cho mã lỗi lạ hoặc null/undefined", () => {
      expect(explainErrorText("ERR_UNKNOWN_CODE" as unknown as Parameters<typeof explainErrorText>[0])).toBe(
        "Chưa giải thích được đoạn này."
      );
      expect(explainErrorText(null)).toBe("Chưa giải thích được đoạn này.");
      expect(explainErrorText(undefined)).toBe("Chưa giải thích được đoạn này.");
    });
  });
});
