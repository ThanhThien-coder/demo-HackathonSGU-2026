import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useUserStore,
  formatErrorMessage,
} from "../userStore";
import { PERSONAS, type LearnerCognitiveProfile } from "@/contracts/learner";
import * as apiModule from "@/lib/api";

describe("UserStore & Bước 1, 2, 3 Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useUserStore.setState({
      user: null,
      profile: null,
      serverNow: null,
      serverClockOffsetMs: 0,
      currentPersona: "NEWBIE",
      tokensUsed: 0,
      isLoading: false,
      isSwitchingPersona: false,
      isDeletingAccount: false,
      isDemoModeDisabled: false,
      error: null,
      errorCode: null,
      toast: null,
    });
  });

  describe("Bước 1: GET /api/me (fetchProfile)", () => {
    it("should update profile and compute clock offset on success", async () => {
      const mockServerNow = Date.now() + 5000;
      vi.spyOn(apiModule, "getMeSafe").mockResolvedValue({
        ok: true,
        data: {
          profile: {
            user_id: "user-123",
            display_name: "Nguyễn Văn A",
            overall_tier: "PRACTITIONER",
            skills: {
              HTTP_ROUTING: {
                skill: "HTTP_ROUTING",
                p_mastery: 0.65,
                last_practiced_at: Date.now(),
                practice_count: 5,
                correct_count: 4,
              },
            },
          },
          server_now: mockServerNow,
        },
        error: null,
      });

      await useUserStore.getState().fetchProfile();

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.profile?.display_name).toBe("Nguyễn Văn A");
      expect(state.profile?.overall_tier).toBe("PRACTITIONER");
      expect(state.user?.name).toBe("Nguyễn Văn A");
      expect(state.serverNow).toBe(mockServerNow);
      expect(state.serverClockOffsetMs).toBeGreaterThan(0);
    });

    it("should handle error states with friendly message", async () => {
      vi.spyOn(apiModule, "getMeSafe").mockResolvedValue({
        ok: false,
        data: null,
        error: {
          error: {
            code: "ERR_CLIENT_NETWORK",
            message: "Network Error",
            retryable: true,
          },
        },
      });

      await useUserStore.getState().fetchProfile();

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.errorCode).toBe("ERR_CLIENT_NETWORK");
      expect(state.error).toContain("Mất kết nối");
    });
  });

  describe("Bước 2: POST /api/demo/persona (changePersona)", () => {
    it("should switch persona, update store and trigger success toast", async () => {
      vi.spyOn(apiModule, "switchPersonaSafe").mockResolvedValue({
        ok: true,
        data: {
          profile: {
            user_id: "user-123",
            display_name: "Mid-level dev",
            overall_tier: "PRACTITIONER",
            skills: {},
          },
          server_now: Date.now(),
        },
        error: null,
      });

      const success = await useUserStore.getState().changePersona("MID_LEVEL");

      expect(success).toBe(true);
      const state = useUserStore.getState();
      expect(state.currentPersona).toBe("MID_LEVEL");
      expect(state.profile?.overall_tier).toBe("PRACTITIONER");
      expect(state.toast?.type).toBe("success");
      expect(state.toast?.message).toContain("Đã đổi sang hồ sơ: Mid-level dev");
    });

    it("should hide menu and toast error when ERR_DEMO_MODE_DISABLED is returned", async () => {
      vi.spyOn(apiModule, "switchPersonaSafe").mockResolvedValue({
        ok: false,
        data: null,
        error: {
          error: {
            code: "ERR_DEMO_MODE_DISABLED",
            message: "Demo disabled",
            retryable: false,
          },
        },
      });

      const success = await useUserStore.getState().changePersona("SENIOR_RUSTY");

      expect(success).toBe(false);
      const state = useUserStore.getState();
      expect(state.isDemoModeDisabled).toBe(true);
      expect(state.toast?.type).toBe("error");
      expect(state.toast?.message).toContain("Chế độ đổi persona đang tắt");
    });
  });

  describe("Bước 3: DELETE /api/me (resetAccount)", () => {
    it("should reset state and show toast when deleteMe succeeds", async () => {
      vi.spyOn(apiModule, "deleteMeSafe").mockResolvedValue({
        ok: true,
        data: undefined,
        error: null,
      });

      useUserStore.setState({
        user: { name: "Test User" },
        profile: { user_id: "u1" } as unknown as LearnerCognitiveProfile,
      });

      const success = await useUserStore.getState().resetAccount();

      expect(success).toBe(true);
      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.toast?.type).toBe("success");
      expect(state.toast?.message).toContain("Đã xóa toàn bộ dữ liệu tài khoản.");
    });
  });

  describe("Format Error Messages", () => {
    it("should map spec/30 error codes accurately to Vietnamese messages", () => {
      expect(formatErrorMessage("ERR_UNAUTHENTICATED")).toContain("Phiên đăng nhập đã hết hạn");
      expect(formatErrorMessage("ERR_DEMO_MODE_DISABLED")).toContain("Chế độ đổi persona đang tắt");
      expect(formatErrorMessage("ERR_CLIENT_NETWORK")).toContain("Mất kết nối tới máy chủ");
      expect(formatErrorMessage("ERR_PERSISTENCE_UNAVAILABLE")).toContain("Máy chủ lưu tiến độ đang gặp sự cố");
    });
  });
});
