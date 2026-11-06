"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import type { RepoOverviewView } from "@/contracts";
import { useWorkbenchStore } from "@/store/workbench";
import { buildOverviewFacts, buildDiscovered } from "@/lib/overview-view";
import { ARCHITECTURE_PATTERN_LABELS, AiText } from "./XRayPanel";

interface RepoOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview?: RepoOverviewView | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function RepoOverviewModal({
  isOpen,
  onClose,
  overview,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: RepoOverviewModalProps) {
  const storeResult = useWorkbenchStore((s) => s.result);
  const storeAnalyses = useWorkbenchStore((s) => s.analyses);
  const storeProgress = useWorkbenchStore((s) => s.progress);
  const storeOverview = useWorkbenchStore((s) => s.overview);

  const effectiveOverview =
    overview ??
    (typeof storeOverview === "object" && storeOverview !== null
      ? storeOverview
      : null);

  const computedFacts = storeResult ? buildOverviewFacts(storeResult) : null;
  const facts = effectiveOverview?.facts
    ? {
        archetype: effectiveOverview.facts.archetype,
        framework: effectiveOverview.facts.framework,
        tech_stack: effectiveOverview.facts.tech_stack,
        root_node_ids: effectiveOverview.facts.root_node_ids,
        main_path_node_ids: effectiveOverview.facts.main_path_node_ids,
        layer_map: computedFacts?.layer_map ?? [],
      }
    : computedFacts;

  const discovered = buildDiscovered(storeResult, storeAnalyses, storeProgress);
  const allNodes = storeResult?.nodes || [];

  // Chip node hiện tên node, bấm thì openNode(id) rồi onClose(); node LOCKED chỉ hiện chữ
  const renderNodeChip = (id: string) => {
    const matched = allNodes.find((n) => n.id === id);
    const title = matched?.title || id;
    const isLocked = storeProgress?.nodes?.[id]?.status === "LOCKED";

    if (isLocked) {
      return (
        <span
          key={id}
          className="text-[11px] font-medium text-[#64748b] bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
          title="Bài học đang bị khóa"
        >
          {title}
        </span>
      );
    }

    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          void useWorkbenchStore.getState().openNode(id);
          onClose();
        }}
        className="text-[11px] font-semibold text-[#004cff] bg-[#f2f3ff] hover:bg-[#eaedff] active:bg-[#dce3ff] px-2 py-0.5 rounded border border-[#eaedff] cursor-pointer transition-colors"
        title={`Mở bài học: ${title}`}
      >
        {title}
      </button>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#fff0e4] border border-[#ff9640]/40 flex items-center justify-center text-[#ff9640]">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#131b2e]">
              Bức Tranh Toàn Cảnh Kiến Trúc Hệ Thống (Repo Overview)
            </h3>
            <span className="text-xs text-[#625e56]">
              Tổng hợp cấu trúc phân tầng, luồng xử lý chính và công nghệ cốt lõi
            </span>
          </div>
        </div>
      }
      description="Phân tích kiến trúc toàn cảnh repository từ AI SimpliFey"
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <RefreshCw className="size-8 text-[#ff9640] animate-spin" />
            <span className="font-bold text-sm text-[#131b2e]">
              AI đang tổng hợp toàn bộ các lát cắt kiến trúc...
            </span>
            <span className="text-xs text-[#625e56]">
              Đối chiếu luồng dữ liệu từ Entry Point tới tầng Cơ sở dữ liệu
            </span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-[12px] bg-[#fff7ed] border border-[#fed7aa] flex flex-col items-center text-center gap-3">
            <div className="size-10 rounded-full bg-[#ffedd5] flex items-center justify-center text-[#c2410c]">
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex flex-col gap-1 max-w-[480px]">
              <span className="font-bold text-sm text-[#131b2e]">
                Chưa thể tải tổng quan
              </span>
              <p className="text-xs text-[#7c2d12] leading-relaxed">
                {errorMessage}
              </p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="mt-1 bg-[#ff9640] hover:bg-[#e07f2e] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Kiểm tra lại
              </button>
            )}
          </div>
        )}

        {/* Nội dung chính theo 3 giai đoạn D-71 */}
        {!isLoading && (
          <div className="flex flex-col gap-5">
            {/* Giai đoạn 1: Facts */}
            {facts && (
              <div className="bg-[#faf8ff] border border-[#eaedff] rounded-[12px] p-4 flex flex-col gap-3">
                {/* Dòng tóm tắt: Archetype, Framework, Công nghệ */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eaedff] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#625e56] font-semibold">
                      Archetype:
                    </span>
                    <span className="text-xs font-bold text-[#131b2e] bg-white px-2.5 py-1 rounded-md border border-[#eaedff]">
                      {facts.archetype}
                    </span>
                  </div>
                  {facts.framework && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#625e56] font-semibold">
                        Framework:
                      </span>
                      <span className="text-xs font-bold text-[#004cff] bg-[#eaedff]/60 px-2.5 py-1 rounded-md">
                        {facts.framework}
                      </span>
                    </div>
                  )}
                  {facts.tech_stack && facts.tech_stack.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-[#625e56] font-semibold mr-1">
                        Công nghệ:
                      </span>
                      {facts.tech_stack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-semibold bg-white text-[#554337] px-2 py-0.5 rounded border border-[#eaedff]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bắt đầu từ (1 chip mỗi node gốc) */}
                {facts.root_node_ids && facts.root_node_ids.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#554337] font-bold">
                      Bắt đầu từ:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {facts.root_node_ids.map((id) => renderNodeChip(id))}
                    </div>
                  </div>
                )}

                {/* Luồng chính (chip theo main_path_node_ids nối bằng →) */}
                {facts.main_path_node_ids &&
                  facts.main_path_node_ids.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#554337] font-bold">
                        Luồng chính:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {facts.main_path_node_ids.map((id, idx) => (
                          <React.Fragment key={id}>
                            {idx > 0 && (
                              <span className="text-[#a78bfa] font-bold">→</span>
                            )}
                            {renderNodeChip(id)}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Bản đồ tầng (mỗi tầng 1 dòng chip node) */}
                {facts.layer_map && facts.layer_map.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-xs text-[#554337] font-bold">
                      Bản đồ tầng:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {facts.layer_map.map(({ layer, node_ids }) => (
                        <div
                          key={layer}
                          className="flex items-center gap-2 flex-wrap bg-white p-2 rounded-lg border border-[#eaedff]"
                        >
                          <span className="text-[11px] font-bold text-[#004cff] font-mono min-w-[120px]">
                            {layer}:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {node_ids.map((id) => renderNodeChip(id))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Giai đoạn 2: "Đã phát hiện ({done}/{total} node)" khi done > 0 */}
            {discovered.done > 0 && (
              <div className="bg-white border border-[#fed7aa] rounded-[12px] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#944b00] uppercase tracking-wider">
                    Đã phát hiện ({discovered.done}/{discovered.total} node)
                  </span>
                </div>

                {/* Mẫu kiến trúc kèm số node */}
                {discovered.patterns.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#625e56] font-semibold">
                      Mẫu kiến trúc:
                    </span>
                    {discovered.patterns.map(({ pattern, count }) => {
                      const label =
                        ARCHITECTURE_PATTERN_LABELS[pattern] || pattern;
                      return (
                        <span
                          key={pattern}
                          className="text-[11px] font-bold bg-[#ffedd4] text-[#944b00] px-2.5 py-0.5 rounded-full border border-[#ff9640]/30"
                        >
                          {label} ({count} node)
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Kỹ năng */}
                {discovered.skills.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#625e56] font-semibold">
                      Kỹ năng:
                    </span>
                    {discovered.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] font-semibold bg-[#f2f3ff] text-[#004cff] px-2 py-0.5 rounded-md border border-[#eaedff]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Điểm dở: mỗi điểm dở "chip node · what" */}
                {discovered.weak_points.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[#fed7aa]/50">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#9a3412]">
                      <ShieldAlert className="size-3.5 text-[#ea580c]" />
                      <span>Các điểm dở được ghi nhận:</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {discovered.weak_points.map((wp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-[#7c2d12] flex-wrap bg-[#fff7ed] p-2 rounded-lg border border-[#fed7aa]/60"
                        >
                          {renderNodeChip(wp.node_id)}
                          <span>·</span>
                          <span className="font-semibold text-[#131b2e]">
                            <AiText text={wp.what} />
                          </span>
                          <span className="text-[10px] font-mono text-[#9a3412] bg-[#ffedd5] px-1.5 py-0.5 rounded ml-auto">
                            {wp.skill}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Giai đoạn 3: overview?.ai có ⇒ khung "Nhận định của AI — có thể chưa chính xác" (D-83: gọi đầu phiên) */}
            {effectiveOverview?.ai && (
              <div className="flex flex-col gap-4">
                <div className="rounded-[12px] bg-gradient-to-r from-[#fff0e4] to-[#ffdcc5]/40 border border-[#ff9640]/40 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-end flex-wrap gap-2">
                    {/* Nhãn bắt buộc (UI-78) */}
                    <span className="text-[11px] font-bold text-[#944b00] bg-white/70 px-2 py-0.5 rounded-full border border-[#ff9640]/30 flex items-center gap-1">
                      <Sparkles className="size-3 text-[#ff9640]" />
                      Nhận định của AI — có thể chưa chính xác
                    </span>
                  </div>

                  <p className="text-sm text-[#131b2e] leading-relaxed font-medium">
                    <AiText text={effectiveOverview.ai.summary} />
                  </p>
                </div>

                {/* Tên nhóm do AI đặt (D-83); bundle offline cũ chưa có trường này ⇒ ẩn */}
                {(effectiveOverview.ai.groups ?? []).length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#554337] uppercase tracking-wider">
                      Nhóm chức năng
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(effectiveOverview.ai.groups ?? []).map((g) => (
                        <span
                          key={g.group_id}
                          className="text-xs bg-white border border-[#e5e7eb] rounded-full px-2.5 py-0.5 text-[#334155]"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tên bài do AI đặt (D-83): chỉ để hiện, node.id không đổi */}
                {(effectiveOverview.ai.node_titles ?? []).length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#554337] uppercase tracking-wider">
                      Tên bài
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {(effectiveOverview.ai.node_titles ?? []).map((nt) => (
                        <div key={nt.node_id} className="flex items-center gap-2 text-xs">
                          {renderNodeChip(nt.node_id)}
                          <span className="text-[#334155]">{nt.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Close Action */}
        <div className="flex justify-end pt-3 border-t border-[#f3f4f6]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] font-semibold text-xs rounded-[8px] transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </Dialog>
  );
}
