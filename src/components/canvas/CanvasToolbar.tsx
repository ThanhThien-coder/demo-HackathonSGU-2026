"use client";

import React, { useState, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Lock,
  Check,
  X,
  Shield,
  Layers,
} from "lucide-react";
import type { ProjectFingerprint, ClientStaticEngineResult } from "@/contracts";

export interface CanvasToolbarProps {
  fingerprint: ProjectFingerprint;
  report: ClientStaticEngineResult["ingestion_report"];
  nodeCount: number;
}

export function CanvasToolbar({
  fingerprint,
  report,
  nodeCount,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [warningDismissed, setWarningDismissed] = useState(false);

  // graph_confidence (xanh/vàng/đỏ, kèm chữ)
  const confidenceMeta = useMemo(() => {
    switch (fingerprint.graph_confidence) {
      case "HIGH":
        return {
          label: "Độ tin cậy cao",
          className: "bg-emerald-50 text-emerald-800 border-emerald-300",
          iconColor: "text-emerald-600",
        };
      case "MIXED":
        return {
          label: "Độ tin cậy trung bình",
          className: "bg-amber-50 text-amber-800 border-amber-300",
          iconColor: "text-amber-600",
        };
      case "LOW":
        return {
          label: "Độ tin cậy thấp",
          className: "bg-red-50 text-red-800 border-red-300",
          iconColor: "text-red-600",
        };
      default:
        return {
          label: fingerprint.graph_confidence,
          className: "bg-slate-100 text-slate-800 border-slate-300",
          iconColor: "text-slate-600",
        };
    }
  }, [fingerprint.graph_confidence]);

  // language_breakdown
  const totalCodeBytes = useMemo(() => {
    return (fingerprint.language_breakdown || []).reduce(
      (sum, item) => sum + item.code_bytes,
      0
    );
  }, [fingerprint.language_breakdown]);

  // Kiểm tra điều kiện có cảnh báo
  const hasWarnings =
    Boolean(report?.truncated) ||
    Boolean(report?.warnings && report.warnings.length > 0) ||
    Boolean(report?.omitted_node_count && report.omitted_node_count > 0);

  const canDismissWarning = fingerprint.graph_confidence !== "LOW";
  const showWarningBox = hasWarnings && (!warningDismissed || !canDismissWarning);

  return (
    <div className="flex flex-col gap-2 p-3 bg-white/95 border-b border-slate-200 backdrop-blur-xs select-none z-10 shrink-0 shadow-xs">
      {/* Hàng 1: Thông tin thanh canvas + Điều khiển thu phóng */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Nhóm chip thông tin đồ thị & ngôn ngữ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Độ tin cậy */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border ${confidenceMeta.className}`}
          >
            <Shield className={`size-3.5 ${confidenceMeta.iconColor}`} />
            <span>{confidenceMeta.label}</span>
          </span>

          {/* Số lượng node */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Layers className="size-3 text-slate-500" />
            <span>{nodeCount} node</span>
          </span>

          {/* Chip language_breakdown theo "{language} {% code_bytes}", thêm "suy luận" nếu STRUCTURAL */}
          {(fingerprint.language_breakdown || []).map((langInfo) => {
            const pct =
              totalCodeBytes > 0
                ? Math.round((langInfo.code_bytes / totalCodeBytes) * 100)
                : 0;
            const isStructural = langInfo.tier === "STRUCTURAL";
            return (
              <span
                key={langInfo.language}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-50 text-slate-700 border border-slate-200"
              >
                <span>
                  {langInfo.language} {pct}%{isStructural ? " suy luận" : ""}
                </span>
              </span>
            );
          })}

          {/* degraded_mode => "Repo tuần tự" */}
          {Boolean(report?.degraded_mode) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Repo tuần tự
            </span>
          )}

          {/* redacted_secret_count > 0 => "Đã che {n} nội dung nhạy cảm" */}
          {Boolean(report?.redacted_secret_count && report.redacted_secret_count > 0) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-300">
              Đã che {report.redacted_secret_count} nội dung nhạy cảm
            </span>
          )}
        </div>

        {/* Nhóm nút thu phóng và căn giữa */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => zoomIn()}
            title="Phóng to"
            className="p-1.5 rounded hover:bg-white text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomOut()}
            title="Thu nhỏ"
            className="p-1.5 rounded hover:bg-white text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => fitView({ padding: 0.2, duration: 200 })}
            title="Căn giữa"
            className="p-1.5 rounded hover:bg-white text-slate-700 hover:text-slate-900 transition-colors border-l border-slate-300 cursor-pointer"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Hàng 2: Bảng chú giải (Legend) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-700 border-t border-slate-100">
        <span className="font-bold text-slate-900">Chú giải:</span>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center size-3.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-400">
            <Check className="size-2.5 stroke-[3]" />
          </span>
          <span>Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#ff9640] animate-pulse" />
          <span>Sẵn sàng</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center size-3.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
            <Lock className="size-2.5" />
          </span>
          <span>Chưa mở</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center size-3.5 rounded bg-red-100 text-red-800 border border-red-400">
            <X className="size-2.5 stroke-[3]" />
          </span>
          <span>Chưa đạt</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="size-3.5 text-amber-600" />
          <span>Node trước chưa vững</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 border-b-2 border-dashed border-slate-500" />
          <span>Cạnh suy luận</span>
        </div>
      </div>

      {/* Khối cảnh báo: truncated, warnings, omitted_node_count > 0 */}
      {showWarningBox && (
        <div className="flex items-start justify-between gap-2 p-2 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-900 mt-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {report?.truncated && (
                <span>Dữ liệu repo bị cắt bớt do vượt quá giới hạn.</span>
              )}
              {Boolean(report?.omitted_node_count && report.omitted_node_count > 0) && (
                <span>
                  {report.omitted_node_count} luồng khác không hiển thị trên bản đồ
                </span>
              )}
              {report?.warnings?.map((w, idx) => (
                <span key={idx}>{w}</span>
              ))}
            </div>
          </div>

          {/* graph_confidence === "LOW" thì không có nút đóng, còn lại có nút đóng */}
          {canDismissWarning && (
            <button
              type="button"
              onClick={() => setWarningDismissed(true)}
              className="p-1 rounded text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors shrink-0 cursor-pointer"
              aria-label="Đóng cảnh báo"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CanvasToolbar;
