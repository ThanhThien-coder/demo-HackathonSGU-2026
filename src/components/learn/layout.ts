"use client";
// Bố cục trang học kiểu IDE (đề xuất D-78): ẩn/hiện cột trái, bảng dưới, cột phải + tỉ lệ kéo được.
// Chỉ là tùy chọn giao diện, lưu trong `localStorage["sf.prefs"].layout` (30 Mục 1: chỉ sf.last_session, sf.prefs; bọc try/catch).
import { create } from "zustand";

export interface LayoutPrefs {
  showLeft: boolean;
  showRight: boolean;
  showPanel: boolean;
  leftPct: number;   // % bề rộng hàng 3 cột
  rightPct: number;
  panelPct: number;  // % chiều cao cột giữa
}

export const LAYOUT_DEFAULT: LayoutPrefs = { showLeft: true, showRight: true, showPanel: false, leftPct: 24, rightPct: 31, panelPct: 30 };
export const LAYOUT_LIMIT = { leftMin: 14, leftMax: 42, rightMin: 22, rightMax: 46, centerMin: 26, panelMin: 14, panelMax: 65 } as const;

const PREFS_KEY = "sf.prefs";

function readPrefs(): Record<string, unknown> {
  try { const raw = localStorage.getItem(PREFS_KEY); return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}; } catch { return {}; }
}
function writeLayout(l: LayoutPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), layout: l })); } catch { /* bỏ qua */ }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Ép tỉ lệ vào giới hạn, bảo đảm cột giữa còn ≥ centerMin. */
export function normalize(l: LayoutPrefs): LayoutPrefs {
  let left = clamp(l.leftPct, LAYOUT_LIMIT.leftMin, LAYOUT_LIMIT.leftMax);
  let right = clamp(l.rightPct, LAYOUT_LIMIT.rightMin, LAYOUT_LIMIT.rightMax);
  const over = (l.showLeft ? left : 0) + (l.showRight ? right : 0) - (100 - LAYOUT_LIMIT.centerMin);
  if (over > 0) {
    if (l.showRight) right = Math.max(LAYOUT_LIMIT.rightMin, right - over);
    else left = Math.max(LAYOUT_LIMIT.leftMin, left - over);
  }
  return { ...l, leftPct: left, rightPct: right, panelPct: clamp(l.panelPct, LAYOUT_LIMIT.panelMin, LAYOUT_LIMIT.panelMax) };
}

interface LayoutStore extends LayoutPrefs {
  hydrated: boolean;
  dragging: boolean;
  hydrate: () => void;
  toggle: (k: "showLeft" | "showRight" | "showPanel") => void;
  set: (p: Partial<LayoutPrefs>, persist?: boolean) => void;
  setDragging: (d: boolean) => void;
  reset: () => void;
}

const pick = (s: LayoutPrefs): LayoutPrefs => ({
  showLeft: s.showLeft, showRight: s.showRight, showPanel: s.showPanel, leftPct: s.leftPct, rightPct: s.rightPct, panelPct: s.panelPct,
});

export const useLayout = create<LayoutStore>((set, get) => ({
  ...LAYOUT_DEFAULT,
  hydrated: false,
  dragging: false,
  hydrate: () => {
    if (get().hydrated) return;
    const saved = readPrefs().layout as Partial<LayoutPrefs> | undefined;
    const ok = saved && typeof saved === "object";
    set({ ...normalize({ ...LAYOUT_DEFAULT, ...(ok ? saved : {}) }), hydrated: true });
  },
  toggle: (k) => { set({ [k]: !get()[k] } as Pick<LayoutPrefs, typeof k>); writeLayout(pick(get())); },
  set: (p, persist = true) => { set(normalize({ ...pick(get()), ...p })); if (persist) writeLayout(pick(get())); },
  setDragging: (d) => { set({ dragging: d }); if (!d) writeLayout(pick(get())); },
  reset: () => { set({ ...LAYOUT_DEFAULT }); writeLayout(LAYOUT_DEFAULT); },
}));
