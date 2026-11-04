"use client";

import React from "react";
import type { QuestionState, NodeStatus } from "@/contracts";
import { useWorkbenchStore } from "@/store/workbench";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function RunSummary({
  questions,
  status,
  unlockedNodeIds,
}: {
  questions: QuestionState[];
  status: NodeStatus;
  unlockedNodeIds: string[];
}) {
  const result = useWorkbenchStore((s) => s.result);
  const openNode = useWorkbenchStore((s) => s.openNode);

  const activeQuestions = (questions || []).filter(
    (q) => q.ended_by !== "DROPPED"
  );

  const summaryItems = activeQuestions.map((q) => {
    if (q.disputed) {
      return `🚩 ${q.skill}`;
    }
    if (q.outcome === "PASS_FIRST" || q.outcome === "PASS_AFTER_HINT") {
      return `✅ ${q.skill}`;
    }
    return `❌ ${q.skill}`;
  });

  return (
    <div className="flex flex-col gap-3 p-4 rounded-[12px] bg-[#faf8ff] border border-[#eaedff]">
      {summaryItems.length > 0 && (
        <div className="text-xs font-bold text-[#131b2e] leading-relaxed">
          {summaryItems.join(" · ")}
        </div>
      )}

      {status === "COMPLETED" && (
        <div className="p-3 rounded-[10px] bg-[#f0fdf4] border border-[#86efac] text-[#166534] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="size-4 text-[#16a34a] shrink-0" />
            <span>Hoàn thành node.</span>
          </div>

          {unlockedNodeIds && unlockedNodeIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-[#14532d]">Vừa mở:</span>
              {unlockedNodeIds.map((id) => {
                const node = result?.nodes?.find((n) => n.id === id);
                const title = node?.title || id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void openNode(id)}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-[#86efac] text-xs font-medium text-[#166534] hover:bg-[#dcfce7] transition-colors cursor-pointer"
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {status === "FAILED" && (
        <div className="p-3 rounded-[10px] bg-[#fef2f2] border border-[#fca5a5] text-[#991b1b] flex items-center gap-2 text-xs font-bold">
          <AlertTriangle className="size-4 text-[#dc2626] shrink-0" />
          <span>Chưa đạt — các node sau vẫn mở, kèm ⚠</span>
        </div>
      )}
    </div>
  );
}
