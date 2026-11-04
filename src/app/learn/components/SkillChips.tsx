"use client";

import React from "react";
import { Activity, RefreshCw } from "lucide-react";
import type { NodeAnalysisView } from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { useUserStore } from "@/stores/userStore";
import { useWorkbenchStore } from "@/store/workbench";
import { getDecayedMastery, tierOf, isDecaying } from "@/lib/bkt-engine";

export interface SkillChipsProps {
  analysis: NodeAnalysisView;
  onSelectStep?: (step: number) => void;
}

/**
 * Hiển thị chip kỹ năng theo dõi mài mòn theo thời gian (BKT-24, D-35).
 */
export function SkillChips({ analysis, onSelectStep }: SkillChipsProps) {
  const profile = useUserStore((s) => s.profile);
  const serverClockOffset = useWorkbenchStore(
    (s) => s.server_clock_offset_ms ?? 0
  );
  const now = Date.now() + serverClockOffset;

  if (!analysis.skills || analysis.skills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider flex items-center gap-1.5">
        <Activity className="size-3.5 text-[#004cff]" />
        Kỹ năng
      </span>
      <div className="flex flex-wrap gap-2">
        {analysis.skills.map((s, idx) => {
          const baseTooltip = `Vì: ${s.reason} — bước ${s.step} · \`${s.symbol}\` · ${s.file_path} dòng ${s.line_start}–${s.line_end}`;

          // Không có profile: chỉ hiện mã, không bịa điểm
          if (!profile) {
            return (
              <button
                key={idx}
                type="button"
                title={baseTooltip}
                onClick={() => onSelectStep?.(s.step)}
                className="text-[11px] font-semibold bg-[#f2f3ff] hover:bg-[#eaedff] active:bg-[#dce3ff] text-[#004cff] px-2.5 py-1 rounded-md border border-[#eaedff] cursor-pointer transition-colors"
              >
                {s.skill}
              </button>
            );
          }

          const skillState = profile.skills?.[s.skill];
          const decayed = getDecayedMastery(skillState, now);
          const decayedStr = decayed.toFixed(4);
          const tier = tierOf(decayed);
          const decaying = isDecaying(skillState, now);
          const pMastery = skillState?.p_mastery ?? CONFIG.BKT_P_L0;

          // Thanh dài theo điểm đã decay, độ đậm = điểm đã decay / p_mastery
          const barWidthPct = Math.min(100, Math.max(0, decayed * 100));
          const barOpacity =
            pMastery > 0 ? Math.min(1, Math.max(0.08, decayed / pMastery)) : 1;

          // Đã giảm mà chưa rớt bậc ⇒ không nhãn, title thêm "Điểm gốc {p_mastery} — đã giảm còn {điểm} vì lâu chưa luyện"
          let title = baseTooltip;
          if (decaying) {
            title = `${baseTooltip}\nĐiểm gốc ${pMastery} — đã giảm còn ${decayedStr} vì lâu chưa luyện (đang mài mòn)`;
          } else if (pMastery - decayed > 1e-4) {
            title = `${baseTooltip} — Điểm gốc ${pMastery} — đã giảm còn ${decayedStr} vì lâu chưa luyện`;
          }

          return (
            <button
              key={idx}
              type="button"
              title={title}
              onClick={() => onSelectStep?.(s.step)}
              className="group flex flex-col gap-1 text-[11px] font-semibold bg-[#f2f3ff] hover:bg-[#eaedff] active:bg-[#dce3ff] text-[#004cff] px-2.5 py-1.5 rounded-lg border border-[#eaedff] cursor-pointer transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>{s.skill}</span>
                <span className="font-mono text-[10px] text-[#554337] bg-white/80 px-1 rounded border border-[#eaedff]">
                  {decayedStr}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#64748b]">
                  {tier}
                </span>
                {decaying && (
                  <span className="text-[10px] font-bold text-[#dc2626] bg-[#fee2e2] border border-[#fca5a5] px-1.5 py-0.2 rounded-full">
                    đang mài mòn
                  </span>
                )}
              </div>
              {/* Thanh điểm đã decay & độ đậm */}
              <div className="w-full bg-slate-200/80 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#004cff] rounded-full transition-all"
                  style={{
                    width: `${barWidthPct}%`,
                    opacity: barOpacity,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Nút chuyển sang tab Feynman bắt đầu trả lời (UI-47).
 */
export function StartAnswerButton() {
  const active_node_id = useWorkbenchStore((s) => s.active_node_id);
  const nodeState = useWorkbenchStore((s) =>
    active_node_id ? s.progress?.nodes?.[active_node_id] : null
  );
  const run = useWorkbenchStore((s) =>
    active_node_id ? s.runs?.[active_node_id] : null
  );
  const isPending = useWorkbenchStore((s) =>
    active_node_id ? Boolean(s.ui.pending["enrich:" + active_node_id]) : false
  );
  const error = useWorkbenchStore((s) =>
    active_node_id ? s.ui.errors["enrich:" + active_node_id] : null
  );
  const reloadRun = useWorkbenchStore((s) => s.reloadRun);
  const setActiveTab = useWorkbenchStore((s) => s.setActiveTab);

  // status khác AVAILABLE ⇒ không hiện
  if (!active_node_id || nodeState?.status !== "AVAILABLE") {
    return null;
  }

  // Đang chờ ⇒ nút tắt "Đang chuẩn bị câu hỏi…"
  if (isPending) {
    return (
      <button
        type="button"
        disabled
        className="w-full py-2.5 px-4 bg-[#ff9640]/60 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed shadow-xs"
      >
        <RefreshCw className="size-3.5 animate-spin" />
        <span>Đang chuẩn bị câu hỏi…</span>
      </button>
    );
  }

  // Lỗi ⇒ "Thử lại" gọi reloadRun(id)
  if (error) {
    return (
      <button
        type="button"
        onClick={() => {
          if (active_node_id) {
            void reloadRun(active_node_id);
          }
        }}
        className="w-full py-2.5 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
      >
        <RefreshCw className="size-3.5" />
        <span>Thử lại</span>
      </button>
    );
  }

  // Không có run ⇒ không hiện
  if (!run) {
    return null;
  }

  // Có run và còn câu chưa xong, trừ DROPPED ⇒ "Bắt đầu trả lời ({n} câu) →"
  const unfinishedCount =
    run.questions?.filter((q) => !q.state.finished && q.state.ended_by !== "DROPPED")
      .length ?? 0;

  if (unfinishedCount <= 0) {
    return null;
  }

  const handleClick = () => {
    setActiveTab("FEYNMAN");
    setTimeout(() => {
      const el = document.getElementById("feynman-explanation");
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full py-2.5 px-4 bg-[#ff9640] hover:bg-[#e07f2e] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
    >
      <span>Bắt đầu trả lời ({unfinishedCount} câu) →</span>
    </button>
  );
}
