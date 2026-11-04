"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, Layers, GitBranch, Activity } from "lucide-react";
import type { NodeAnalysisView, HybridArchitecturalNode } from "@/contracts";

export const ARCHITECTURE_PATTERN_LABELS: Record<string, string> = {
  LAYERED: "Tách tầng",
  MIDDLEWARE_CHAIN: "Chuỗi middleware",
  DEPENDENCY_INJECTION: "Tiêm phụ thuộc",
  OBSERVER_EVENT: "Observer",
  PIPELINE: "Chuỗi xử lý",
  ALGORITHMIC: "Thuật toán",
  PROCEDURAL: "Tuần tự",
  OTHER: "Khác",
};

export interface XRayPanelProps {
  analysis: NodeAnalysisView;
  node?: HybridArchitecturalNode | null;
  activeStep?: number | null;
  onSelectStep?: (step: number) => void;
  allNodes?: HybridArchitecturalNode[];
}

export function XRayPanel({
  analysis,
  node = null,
  activeStep = null,
  onSelectStep,
  allNodes = [],
}: XRayPanelProps) {
  const currentNodeId = node?.id || analysis.node_id;

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#faf8ff] border-b border-[#eaedff] text-xs">
      {/* 0. Skeleton-only warning if AI failed to fully analyze */}
      {analysis.skeleton_only && (
        <div className="bg-[#fffbeb] border border-[#f59e0b]/40 rounded-lg p-2.5 text-xs text-[#92400e] font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0 text-[#f59e0b]" />
          <span>AI chưa giải thích được node này — chỉ hiện khung do code dựng</span>
        </div>
      )}

      {/* 1. Kỹ năng */}
      {analysis.skills && analysis.skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="size-3.5 text-[#004cff]" />
            Kỹ năng
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.skills.map((s, idx) => {
              const tooltip = `Vì: ${s.reason} — bước ${s.step} · ${s.symbol} · ${s.file_path} dòng ${s.line_start}–${s.line_end}`;
              return (
                <button
                  key={idx}
                  type="button"
                  title={tooltip}
                  onClick={() => onSelectStep?.(s.step)}
                  className="text-[11px] font-semibold bg-[#f2f3ff] hover:bg-[#eaedff] active:bg-[#dce3ff] text-[#004cff] px-2.5 py-1 rounded-md border border-[#eaedff] cursor-pointer transition-colors"
                >
                  {s.skill}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Kiến trúc */}
      {analysis.architecture && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="size-3.5 text-[#ff9640]" />
            Kiến trúc
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {analysis.architecture.patterns?.map((pattern, idx) => {
              const label = ARCHITECTURE_PATTERN_LABELS[pattern] || pattern;
              const isPrimary = idx === 0;
              return (
                <span
                  key={idx}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isPrimary
                      ? "bg-[#ffedd4] text-[#944b00] border-[#ff9640]/40"
                      : "bg-[#f2f3ff] text-[#004cff] border-[#eaedff]"
                  }`}
                  title={isPrimary ? "Mẫu kiến trúc chính" : undefined}
                >
                  {label}
                  {isPrimary && analysis.architecture.patterns.length > 1 && " (chính)"}
                </span>
              );
            })}
          </div>
          {analysis.architecture.summary && (
            <p className="text-xs text-[#131b2e] leading-relaxed bg-white/70 p-2.5 rounded-lg border border-[#eaedff]">
              {analysis.architecture.summary}
            </p>
          )}
        </div>
      )}

      {/* 3. Luồng */}
      {analysis.steps && analysis.steps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="size-3.5 text-[#00bc7d]" />
            Luồng thực thi
          </span>
          <div className="flex flex-col gap-1.5">
            {analysis.steps.map((st) => {
              const isSelected = activeStep === st.step;
              const hasWeakPoint = analysis.weak_points?.some((wp) => wp.step === st.step);
              const traceStep = node?.trace_steps?.find((ts) => ts.step_number === st.step);
              const functionName = traceStep?.function_name;

              return (
                <div
                  key={st.step}
                  onClick={() => onSelectStep?.(st.step)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#fff0e4] border-[#ff9640] ring-1 ring-[#ff9640]"
                      : "bg-white border-[#eaedff] hover:bg-[#faf8ff]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-semibold">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#ff9640]">Bước {st.step}</span>
                      <span>·</span>
                      <span className="text-[#004cff] font-bold">{st.layer}</span>
                      <span>·</span>
                      <span className="text-[#554337] font-mono">{st.file_path}</span>
                      <span>·</span>
                      <span className="text-[#625e56]">dòng {st.line_start}–{st.line_end}</span>
                      {functionName && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-[#131b2e]">{functionName}</span>
                        </>
                      )}
                    </div>
                    {hasWeakPoint && (
                      <span
                        className="text-[#dc2626] font-bold flex items-center gap-0.5 text-[11px] bg-[#fee2e2] px-1.5 py-0.5 rounded"
                        title="Bước này có điểm dở"
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                  {st.text !== null && st.text !== undefined && (
                    <p className="mt-1 text-[#131b2e] leading-relaxed">
                      {st.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Điểm hay */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-[#16a34a]" />
            Điểm hay
          </span>
          <div className="flex flex-col gap-1 text-xs text-[#14532d]">
            {analysis.strengths.map((st, idx) => (
              <div
                key={idx}
                className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-2 leading-relaxed"
              >
                ✅ (bước {st.step}) {st.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Điểm dở */}
      {analysis.weak_points && analysis.weak_points.length > 0 && (
        <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[#944b00] text-xs">
            <ShieldAlert className="size-4 text-[#ea580c] shrink-0" />
            <span>Điểm dở — Nhận định của AI</span>
          </div>
          <div className="flex flex-col gap-2">
            {analysis.weak_points.map((wp, idx) => (
              <div
                key={idx}
                onClick={() => onSelectStep?.(wp.step)}
                className="bg-white/80 hover:bg-white border border-[#fed7aa]/60 rounded-lg p-2.5 text-xs text-[#7c2d12] cursor-pointer transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5 flex-wrap font-semibold text-[11px] text-[#9a3412]">
                  <span>{wp.file_path} dòng {wp.line_start}–{wp.line_end}</span>
                  <span>·</span>
                  <span className="bg-[#ffedd5] text-[#9a3412] px-1.5 py-0.5 rounded font-mono font-bold">
                    {wp.skill}
                  </span>
                </div>
                <div className="font-semibold text-[#131b2e]">
                  {wp.what}
                </div>
                <div className="text-[#7c2d12]">
                  Hậu quả: {wp.consequence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Liên quan */}
      {analysis.shared_files && analysis.shared_files.length > 0 && (() => {
        const items: Array<{ basename: string; otherNodeNames: string[] }> = [];

        for (const sf of analysis.shared_files) {
          const basename = sf.file_path.split("/").pop() || sf.file_path;
          const otherNodeIds = sf.node_ids.filter((nid) => nid !== currentNodeId);
          if (otherNodeIds.length > 0) {
            const otherNodeNames = otherNodeIds.map((nid) => {
              const matched = allNodes.find((n) => n.id === nid);
              return matched?.title || nid;
            });
            items.push({ basename, otherNodeNames });
          }
        }

        if (items.length === 0) return null;

        return (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
              Liên quan
            </span>
            <div className="flex flex-col gap-1 text-xs text-[#554337]">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#eaedff] rounded-lg p-2 leading-relaxed flex flex-col gap-1"
                >
                  {item.otherNodeNames.map((targetName, nIdx) => (
                    <div key={nIdx}>
                      dùng chung {item.basename} với {targetName}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 7. Chỉ số */}
      {node && (node.uncle_bob || node.cognitive_complexity !== undefined) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-[#554337] uppercase tracking-wider">
            Chỉ số
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs bg-white border border-[#eaedff] p-2.5 rounded-lg text-[#334155]">
            {node.uncle_bob && (
              <>
                <span>
                  <strong>I:</strong> {node.uncle_bob.instability}
                </span>
                <span>·</span>
                <span>
                  <strong>A:</strong> {node.uncle_bob.abstractness}
                </span>
                <span>·</span>
                <span>
                  <strong>D:</strong> {node.uncle_bob.distance}
                </span>
                <span>·</span>
                <span>
                  <strong>Chẩn đoán:</strong>{" "}
                  {node.uncle_bob.is_exempt ? "Miễn trừ" : node.uncle_bob.diagnosis}
                </span>
              </>
            )}
            {node.cognitive_complexity !== undefined && (
              <>
                {node.uncle_bob && <span>·</span>}
                <span>
                  <strong>Độ phức tạp nhận thức:</strong> {node.cognitive_complexity}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
