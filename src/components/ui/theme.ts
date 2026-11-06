"use client";
// Chủ đề sáng / tối. Lưu trong `localStorage["sf.prefs"].theme` (30 Mục 1: chỉ sf.last_session, sf.prefs; bọc try/catch).
// Thẻ <html data-theme> được gán sớm bằng THEME_INIT_SCRIPT (layout.tsx) để không nháy màu khi tải trang.
import { create } from "zustand";
import { PREFS_KEY } from "./theme-script";

export type Theme = "dark" | "light";

function save(theme: Theme) {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, theme }));
  } catch { /* bỏ qua */ }
}

interface ThemeStore {
  theme: Theme;
  hydrate: () => void;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeStore>((set, get) => ({
  theme: "dark",
  hydrate: () => {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    if (t !== get().theme) set({ theme: t });
  },
  setTheme: (t) => {
    const html = document.documentElement;
    html.classList.add("theme-anim");
    html.dataset.theme = t;
    window.setTimeout(() => html.classList.remove("theme-anim"), 450);
    save(t);
    set({ theme: t });
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
