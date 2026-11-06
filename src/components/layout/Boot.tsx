"use client";
// 30 Mục 7.2 — khởi động 1 lần cho cả ứng dụng (đăng nhập, hồ sơ, danh sách phiên) + phím tắt Offline (Ctrl+Shift+D).
import { useEffect } from "react";
import { useWorkbench } from "@/store/workbench";
import { useTheme } from "@/components/ui/theme";

export function Boot() {
  const init = useWorkbench((s) => s.init);
  useEffect(() => {
    useTheme.getState().hydrate();
    void init();
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const s = useWorkbench.getState();
        if (s.is_offline_mode) void s.leaveOffline(); else void s.enterOffline();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [init]);
  return null;
}
