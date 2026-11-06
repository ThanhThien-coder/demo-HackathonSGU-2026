"use client";

// Gắn ở bước 0 của tour (D12, Phat107): <RoleCard node={node} onStartTour={…} />

import React from "react";
import type { HybridArchitecturalNode } from "@/contracts";
import { useWorkbenchStore } from "@/store/workbench";
import { buildRoleCard } from "@/lib/role-card";
import { AiText } from "./XRayPanel";

export interface RoleCardProps {
  node: HybridArchitecturalNode;
  onStartTour?: () => void;
}

/**
 * Thẻ vai trò đầu bài học (UI-41, D-84).
 * Hiển thị ở bước 0 của tour trong tab X-Ray.
 */
export function RoleCard({ node, onStartTour }: RoleCardProps) {
  const result = useWorkbenchStore((s) => s.result);
  const analyses = useWorkbenchStore((s) => s.analyses);
  const overview = useWorkbenchStore((s) => s.overview);
  const progress = useWorkbenchStore((s) => s.progress);
  const openNode = useWorkbenchStore((s) => s.openNode);

  const rawAnalysis = analyses[node.id];
  const card = buildRoleCard(node, result, rawAnalysis, overview, progress);

  const isAnalysisPending =
    rawAnalysis === "PENDING" || rawAnalysis === undefined;

  const handleOpenNode = (nodeId: string) => {
    void openNode(nodeId);
  };

  const headingText = card.evidence
    ? `${card.title} · ${card.evidence}`
    : card.title;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="p-4 sm:p-5 bg-white rounded-xl border border-[#eaedff] flex flex-col gap-3 text-sm text-[#131b2e] shadow-2xs">
        {/* Tiêu đề h2 kèm các chip/icon */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h2
            id="rp-title"
            tabIndex={-1}
            className="text-base sm:text-lg font-bold text-[#131b2e] leading-snug outline-none"
          >
            {headingText}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {card.is_capstone && (
              <span
                className="text-xs font-bold text-amber-500"
                title="Capstone"
                aria-label="Capstone"
              >
                ★
              </span>
            )}
            {card.has_warning && (
              <span
                className="text-xs font-bold text-amber-600 cursor-help"
                title="Node trước chưa vững"
                aria-label="Node trước chưa vững"
              >
                ⚠
              </span>
            )}
            {card.is_algorithmic && (
              <span className="text-[10px] font-semibold bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] px-2 py-0.5 rounded-full">
                Thuật toán
              </span>
            )}
            {/* RESOLVED là mặc định ⇒ không hiện; STRUCTURAL ⇒ "suy luận" như bản đồ (Mục 4) */}
            {card.support_tier === "STRUCTURAL" && (
              <span
                className="text-[10px] text-[#625e56] bg-[#f1f5f9] border border-[#e2e8f0] px-1.5 py-0.5 rounded"
                title="Ngôn ngữ chưa phân tích đầy đủ — các bước do engine suy luận"
              >
                suy luận
              </span>
            )}
            {card.support_tier === "UNSUPPORTED" && (
              <span className="text-[10px] text-[#625e56] bg-[#f1f5f9] border border-[#e2e8f0] px-1.5 py-0.5 rounded">
                chưa hỗ trợ
              </span>
            )}
          </div>
        </div>

        {/* Dòng Vai trò: role (bọc <AiText>); analyses[node.id] === "PENDING" hoặc chưa có ⇒ shimmer "đang phân tích…"; role = null vì lý do khác ⇒ ẩn dòng */}
        {isAnalysisPending ? (
          <p className="text-sm leading-relaxed text-[#554337] animate-pulse">
            <b className="font-semibold text-[#131b2e]">Vai trò:</b>{" "}
            <span className="italic text-[#807b97]">đang phân tích…</span>
          </p>
        ) : card.role !== null ? (
          <p className="text-sm leading-relaxed text-[#131b2e]">
            <b className="font-semibold">Vai trò:</b>{" "}
            <AiText text={card.role} />
          </p>
        ) : null}

        {/* Dòng Cần trước: các tên nối " · "; mỗi tên là nút bấm ⇒ openNode(id), bài LOCKED chỉ hiện chữ. Mảng rỗng ⇒ ẩn */}
        {card.prerequisites.length > 0 && (
          <p className="text-sm leading-relaxed text-[#131b2e]">
            <b className="font-semibold">Cần trước:</b>{" "}
            {card.prerequisites.map((p, idx) => {
              const isLocked = progress?.nodes?.[p.node_id]?.status === "LOCKED";
              return (
                <React.Fragment key={p.node_id}>
                  {idx > 0 && " · "}
                  {isLocked ? (
                    <span className="text-[#807b97] cursor-not-allowed">
                      {p.title}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenNode(p.node_id)}
                      className="text-[#004cff] hover:underline cursor-pointer font-medium"
                    >
                      {p.title}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </p>
        )}

        {/* Dòng Mở ra cho: mỗi mục "→ {title}", nút bấm như trên. Mảng rỗng ⇒ ẩn */}
        {card.unlocks.length > 0 && (
          <p className="text-sm leading-relaxed text-[#131b2e]">
            <b className="font-semibold">Mở ra cho:</b>{" "}
            {card.unlocks.map((u, idx) => {
              const isLocked = progress?.nodes?.[u.node_id]?.status === "LOCKED";
              return (
                <React.Fragment key={u.node_id}>
                  {idx > 0 && " · "}
                  {isLocked ? (
                    <span className="text-[#807b97] cursor-not-allowed">
                      → {u.title}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenNode(u.node_id)}
                      className="text-[#004cff] hover:underline cursor-pointer font-medium"
                    >
                      → {u.title}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </p>
        )}

        {/* Dòng Dữ liệu: mỗi thực thể "{name}" + mỗi nhãn ops 1 tag nhỏ; các thực thể nối " · ". Mảng rỗng ⇒ ẩn */}
        {card.entities.length > 0 && (
          <p className="text-sm leading-relaxed text-[#131b2e]">
            <b className="font-semibold">Dữ liệu:</b>{" "}
            {card.entities.map((e, idx) => (
              <React.Fragment key={e.name || idx}>
                {idx > 0 && " · "}
                <span>
                  {e.name}
                  {e.ops.map((op) => (
                    <span
                      key={op}
                      className="inline-block text-[11px] border border-[#eaedff] bg-[#faf8ff] text-[#625e56] rounded-full px-2 py-0.25 mx-0.5 align-middle"
                    >
                      {op}
                    </span>
                  ))}
                </span>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      {/* Nút chính "Bắt đầu tour →" */}
      <button
        type="button"
        onClick={() => onStartTour?.()}
        className="w-full py-3 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
      >
        Bắt đầu tour →
      </button>
    </div>
  );
}
