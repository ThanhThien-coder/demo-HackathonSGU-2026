"use client";

import React from "react";
import { useWorkbenchStore } from "@/store/workbench";
import {
  buildOverviewFacts,
  overviewFallback,
  overviewGroups,
  overviewNodeTitle,
  startNodeId,
} from "@/lib/overview-view";
import { AiText } from "./XRayPanel";

export interface RepoOverviewProps {
  onStart?: () => void;
}

/**
 * Bức tranh chung của repository (D-71, D-83, Việc 3).
 * Hiển thị ở cột giữa khi chưa chọn bài hoặc trong cửa sổ tổng quan.
 */
export function RepoOverview({ onStart }: RepoOverviewProps) {
  const result = useWorkbenchStore((s) => s.result);
  const progress = useWorkbenchStore((s) => s.progress);
  const overview = useWorkbenchStore((s) => s.overview);

  if (!result) {
    return null;
  }

  const facts = buildOverviewFacts(result);
  const fallbackText = overviewFallback(result, facts);
  const groups = overviewGroups(result, overview);
  const startId = startNodeId(result, progress);
  const startTitle = startId
    ? overviewNodeTitle(result, overview, startId)
    : null;

  const handleStart = () => {
    if (!startId) return;
    void useWorkbenchStore.getState().openNode(startId);
    onStart?.();
  };

  const isPending = overview === "PENDING";
  const hasAiSummary =
    typeof overview === "object" &&
    overview !== null &&
    Boolean(overview.ai?.summary?.trim());

  return (
    <div className="flex-1 w-full p-6 bg-white rounded-2xl border border-[#eaedff] flex flex-col gap-4 text-[#131b2e]">
      <h2 className="text-xl font-bold text-[#131b2e]" tabIndex={-1}>
        Bức tranh chung
      </h2>

      {/* Dòng tóm tắt: shimmer khi PENDING, AiText khi có tóm tắt AI, hoặc câu fallback */}
      {isPending ? (
        <p className="text-sm text-[#554337] leading-relaxed animate-pulse">
          {fallbackText}
        </p>
      ) : hasAiSummary ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-[#131b2e] leading-relaxed">
            <AiText text={overview.ai!.summary} />
          </p>
          <div>
            <span className="inline-block text-[11px] font-medium text-[#7c3aed] bg-[#f5f3ff] px-2 py-0.5 rounded border border-[#ddd6fe]">
              Nhận định của AI — có thể chưa chính xác
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#554337] leading-relaxed">
          {fallbackText}
        </p>
      )}

      {/* Lưới thẻ nhóm: mỗi nhóm 1 thẻ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 my-1">
        {groups.map((g) => (
          <div
            key={g.group_id}
            className="p-3 bg-[#faf8ff] rounded-xl border border-[#eaedff] flex flex-col gap-1"
          >
            <b className="block font-bold text-xs text-[#131b2e]">
              {g.name}
            </b>
            <small className="block text-[11px] text-[#625e56] leading-normal">
              {g.node_ids
                .map((nid) => overviewNodeTitle(result, overview, nid))
                .join(" · ")}
            </small>
          </div>
        ))}
      </div>

      {/* Nút chính bắt đầu với bài học đầu tiên */}
      {startId && startTitle && (
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-3 px-4 bg-[#ff9640] hover:bg-[#e07f2e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
        >
          Bắt đầu với: {startTitle} →
        </button>
      )}
    </div>
  );
}
