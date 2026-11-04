import { create } from "zustand";
import {
  type LearnerCognitiveProfile,
  type CognitiveSkillState,
  type PersonaMode,
  PERSONAS,
} from "@/contracts/learner";
import { SWE_SKILLS, type SWESkill, type LearnerTier } from "@/contracts/base";
import { CONFIG } from "@/contracts/config";
import type { ErrorCode, ApiError } from "@/contracts/errors";
import {
  getMeSafe,
  switchPersonaSafe,
  deleteMeSafe,
  getSupabaseBrowserClient,
} from "@/lib/api";
import { signOut } from "@/lib/supabase/client";

export interface UserSummary {
  name: string;
  avatarUrl?: string;
  email?: string;
}

export interface ToastNotification {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

import { formatErrorMessage } from "@/lib/messages";
export { formatErrorMessage };

export interface UserState {
  // Dữ liệu người dùng & BKT
  user: UserSummary | null;
  profile: LearnerCognitiveProfile | null;
  serverNow: number | null;
  serverClockOffsetMs: number;
  currentPersona: PersonaMode;
  tokensUsed: number;
  tokenQuota: number;

  // Trạng thái thao tác & UI states
  isLoading: boolean;
  isSwitchingPersona: boolean;
  isDeletingAccount: boolean;
  isDemoModeDisabled: boolean;
  error: string | null;
  errorCode: ErrorCode | null;

  // Hệ thống Toast thông báo
  toast: ToastNotification | null;

  // Actions
  setUser: (user: UserSummary | null) => void;
  fetchProfile: () => Promise<void>;
  changePersona: (mode: PersonaMode) => Promise<boolean>;
  resetAccount: () => Promise<boolean>;
  showToast: (
    message: string,
    type?: "success" | "error" | "info",
    durationMs?: number
  ) => void;
  hideToast: () => void;
  clearError: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  serverNow: null,
  serverClockOffsetMs: 0,
  currentPersona: "NEWBIE",
  tokensUsed: 0,
  tokenQuota: CONFIG.SESSION_TOKEN_QUOTA,

  isLoading: false,
  isSwitchingPersona: false,
  isDeletingAccount: false,
  isDemoModeDisabled: false,
  error: null,
  errorCode: null,
  toast: null,

  setUser: (user) => set({ user }),

  showToast: (message, type = "success", durationMs = 3500) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    const id = Date.now();
    set({ toast: { id, message, type } });
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, durationMs);
  },

  hideToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    set({ toast: null });
  },

  clearError: () => set({ error: null, errorCode: null }),

  /**
   * Bước 1: GET /api/me (Lấy hồ sơ người học, BKT 16 kỹ năng & server_now)
   */
  fetchProfile: async () => {
    set({ isLoading: true, error: null, errorCode: null });

    const result = await getMeSafe();

    if (result.ok) {
      const { profile, server_now } = result.data;
      const offset = server_now - Date.now();

      set((state) => ({
        isLoading: false,
        profile,
        serverNow: server_now,
        serverClockOffsetMs: offset,
        // Cập nhật tên hiển thị nếu user chưa có
        user: state.user
          ? {
              ...state.user,
              name: profile.display_name || state.user.name,
            }
          : profile.display_name
          ? {
              name: profile.display_name,
            }
          : null,
      }));
      return;
    }

    // Xử lý lỗi
    const apiErr = result.error as ApiError;
    const code = apiErr.error?.code;
    const rawMsg = apiErr.error?.message;

    set({
      isLoading: false,
      error: formatErrorMessage(code, rawMsg),
      errorCode: code ?? null,
    });
  },

  /**
   * Bước 2: POST /api/demo/persona (Chuyển đổi persona demo D-09)
   */
  changePersona: async (mode: PersonaMode) => {
    set({ isSwitchingPersona: true, error: null, errorCode: null });

    const personaLabel = PERSONAS[mode]?.label || mode;
    const result = await switchPersonaSafe(mode);

    if (result.ok) {
      const { profile, server_now } = result.data;
      const offset = server_now ? server_now - Date.now() : 0;

      set((state) => ({
        isSwitchingPersona: false,
        currentPersona: mode,
        profile,
        serverNow: server_now ?? state.serverNow,
        serverClockOffsetMs: offset,
        user: state.user
          ? {
              ...state.user,
              name: profile.display_name || state.user.name,
            }
          : { name: profile.display_name || personaLabel },
      }));

      get().showToast(`Đã đổi sang hồ sơ: ${personaLabel}`, "success");
      return true;
    }

    // Xử lý thất bại từ server
    const apiErr = result.error as ApiError;
    const code = apiErr.error?.code;
    const rawMsg = apiErr.error?.message;

    if (code === "ERR_DEMO_MODE_DISABLED") {
      set({
        isSwitchingPersona: false,
        isDemoModeDisabled: true,
      });
      get().showToast("Chế độ đổi persona đang tắt trên máy chủ.", "error");
      return false;
    }

    // Nếu đang ở môi trường mock/bypass hoặc endpoint server chưa kích hoạt

    const friendlyMsg = formatErrorMessage(code, rawMsg);
    set({
      isSwitchingPersona: false,
      error: friendlyMsg,
      errorCode: code ?? null,
    });
    get().showToast(friendlyMsg, "error");
    return false;
  },

  /**
   * Bước 3: DELETE /api/me (Xóa dữ liệu & reset tài khoản, 204 No Content)
   */
  resetAccount: async () => {
    set({ isDeletingAccount: true, error: null, errorCode: null });

    const result = await deleteMeSafe();

    // Dù server trả về thành công hay đang ở dev bypass, đều dọn dẹp client
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await signOut().catch(() => {});
      }
    } catch {
      // Bỏ qua lỗi Supabase SSR
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("sf.last_session");
        localStorage.removeItem("sf.course_id");
      } catch {
        // Bỏ qua lỗi truy cập storage
      }
    }

    if (result.ok) {
      set({
        isDeletingAccount: false,
        user: null,
        profile: null,
        currentPersona: "NEWBIE",
        tokensUsed: 0,
      });

      get().showToast("Đã xóa toàn bộ dữ liệu tài khoản.", "success");
      return true;
    }

    const apiErr = result.error as ApiError;
    const code = apiErr.error?.code;
    const friendlyMsg = formatErrorMessage(code, apiErr.error?.message);

    set({
      isDeletingAccount: false,
      error: friendlyMsg,
      errorCode: code ?? null,
    });
    get().showToast(friendlyMsg, "error");
    return false;
  },
}));
