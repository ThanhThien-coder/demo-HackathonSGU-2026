"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Sparkles,
  Layers,
  History,
  Activity,
  CheckCircle2,
  ShieldCheck,
  FileCode2,
  Clock,
} from "lucide-react";
import { CONFIG } from "@/contracts";
import type {
  ProjectFingerprint,
  IngestionReport,
  ClientStaticEngineResult,
} from "@/contracts";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface EngineMetricsData {
  ingest_ms?: number;
  engine_ms?: number;
  code_file_count?: number;
  redacted_secret_count?: number;
}

export interface CockpitHeaderProps {
  repoName?: string;
  filePath?: string;
  categoryTag?: string;
  sessionId?: string;
  tokensUsed?: number;
  tokensQuota?: number;
  onOpenOverview?: () => void;
  isLoadingOverview?: boolean;
  engineMetrics?: EngineMetricsData;
  refLabel?: string | null;
  snapshotId?: string;
  fingerprint?: ProjectFingerprint | null;
  report?: ClientStaticEngineResult["ingestion_report"] | IngestionReport | null;
  isGithub?: boolean;
  isOffline?: boolean;
  onOtherRepo?: () => void;
  onChangeDir?: (subdir: string) => Promise<string | void | undefined>;
}

export function CockpitHeader({
  repoName = "",
  filePath = "",
  categoryTag = "",
  sessionId,
  tokensUsed = 0,
  tokensQuota = CONFIG.SESSION_TOKEN_QUOTA,
  onOpenOverview,
  isLoadingOverview = false,
  engineMetrics,
  refLabel,
  snapshotId,
  fingerprint,
  report,
  isGithub = false,
  isOffline = false,
  onOtherRepo,
  onChangeDir,
}: CockpitHeaderProps) {
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [isChangeDirOpen, setIsChangeDirOpen] = useState(false);
  const [newSubdir, setNewSubdir] = useState("");
  const [changeDirError, setChangeDirError] = useState<string | null>(null);
  const [isChangingDir, setIsChangingDir] = useState(false);

  const cleanPath = (filePath || "").trim().replace(/^\/+/, "");
  const pathParts = cleanPath ? cleanPath.split("/") : [];
  const fileName = pathParts.length > 0 ? pathParts.pop() : "";

  const isQuotaExceeded = tokensUsed >= tokensQuota;
  const tokenPercentage = Math.min(
    100,
    Math.round((tokensUsed / tokensQuota) * 100)
  );

  // Tính chi phí ước tính theo LLM_PRICE_INPUT_USD_PER_M (USD / 1M tokens)
  const estimatedCost = (
    (tokensUsed / 1_000_000) *
    CONFIG.LLM_PRICE_INPUT_USD_PER_M
  ).toFixed(4);

  const effectiveReport = report ?? engineMetrics;
  const ingestMs = effectiveReport?.ingest_ms ?? 0;
  const engineMs = effectiveReport?.engine_ms ?? 0;
  const totalMapMs = ingestMs + engineMs;
  const fileCount = effectiveReport?.code_file_count ?? 0;
  const secretCount = effectiveReport?.redacted_secret_count ?? 0;

  const sha7 = snapshotId ? snapshotId.slice(0, 7) : "";
  let repoRefInfo = "";
  if (refLabel && sha7) {
    repoRefInfo = `· ${refLabel} @ ${sha7}`;
  } else if (refLabel) {
    repoRefInfo = `· ${refLabel}`;
  } else if (sha7) {
    repoRefInfo = `· @ ${sha7}`;
  }

  const isMonorepo = Boolean(fingerprint?.is_monorepo);
  const isSelectiveFetch = Boolean(report?.selective_fetch);
  const rootDirOffset = fingerprint?.root_dir_offset || "";

  const monorepoLabel = rootDirOffset
    ? `Monorepo · ${rootDirOffset}`
    : "Monorepo";
  const selectiveLabel = rootDirOffset
    ? `Repo lớn · ${rootDirOffset}`
    : "Repo lớn";

  return (
    <>
      <div
        className="bg-[#ff9640] border-b-[0.8px] border-black/10 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.08)] flex min-h-[64px] flex-wrap items-center justify-between px-4 sm:px-8 lg:px-[45px] py-1.5 sm:py-0 w-full z-20 shrink-0 select-none"
        data-node-id="5:29"
        data-name="Background+HorizontalBorder+Shadow"
      >
        {/* Left side: Back button & Breadcrumb path */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 overflow-hidden">
          {/* Back Link */}
          <Link
            href="/roadmap"
            className="bg-black/10 hover:bg-black/20 active:bg-black/30 text-white p-2 rounded-[8px] transition-colors shrink-0 flex items-center justify-center"
            title="Quay lại danh sách lộ trình"
            aria-label="Quay lại danh sách lộ trình"
            data-node-id="5:31"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white overflow-x-auto no-scrollbar py-1">
            {/* Repo icon */}
            <div className="relative size-6 shrink-0 opacity-95">
              <Image
                src="/assets/learn/repo-icon.svg"
                alt="Repo"
                width={24}
                height={20}
                className="object-contain"
              />
            </div>

            <span className="font-semibold text-base sm:text-[18px] text-white shrink-0">
              {repoName}
              {repoRefInfo ? (
                <span className="font-normal text-sm sm:text-base text-white/90 ml-1.5">
                  {repoRefInfo}
                </span>
              ) : null}
            </span>

            {/* Nút "Repo khác" (ẩn khi isOffline) */}
            {!isOffline && onOtherRepo && (
              <button
                type="button"
                onClick={onOtherRepo}
                className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-semibold text-xs px-2.5 py-1 rounded-[8px] border border-white/30 transition-all cursor-pointer shrink-0 ml-1"
                title="Quay lại trang chủ để chọn repo khác"
              >
                Repo khác
              </button>
            )}

            {cleanPath && fileName ? (
              <>
                {pathParts.map((part, index) => (
                  <React.Fragment key={index}>
                    <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">
                      /
                    </span>
                    <span className="font-semibold text-base sm:text-[18px] text-white shrink-0">
                      {part}
                    </span>
                  </React.Fragment>
                ))}

                <span className="text-white/80 font-normal text-base sm:text-[18px] shrink-0">
                  /
                </span>
                <span className="font-bold text-base sm:text-[18px] text-white underline decoration-white/70 decoration-2 underline-offset-4 shrink-0">
                  {fileName}
                </span>
              </>
            ) : null}
          </div>

          {/* Badges: Tech Stack, Monorepo, Repo lớn, Đổi thư mục */}
          <div className="hidden md:flex items-center gap-2 pl-2 shrink-0">
            {categoryTag && (
              <div
                className="backdrop-blur-[4px] bg-white/20 border border-white/25 text-white font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-sm shrink-0"
                data-node-id="5:55"
              >
                {categoryTag}
              </div>
            )}

            {isMonorepo && (
              <div className="backdrop-blur-[4px] bg-white/20 border border-white/25 text-white font-medium text-xs px-3 py-1 rounded-full shadow-sm shrink-0">
                {monorepoLabel}
              </div>
            )}

            {isSelectiveFetch && (
              <div className="backdrop-blur-[4px] bg-white/20 border border-white/25 text-white font-medium text-xs px-3 py-1 rounded-full shadow-sm shrink-0">
                {selectiveLabel}
              </div>
            )}

            {(isMonorepo || isSelectiveFetch) && isGithub && onChangeDir && (
              <button
                type="button"
                onClick={() => {
                  setNewSubdir(rootDirOffset);
                  setChangeDirError(null);
                  setIsChangeDirOpen(true);
                }}
                className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-semibold text-xs px-2.5 py-1 rounded-full border border-white/30 transition-all cursor-pointer shrink-0"
                title="Đổi thư mục con làm việc"
              >
                Đổi thư mục
              </button>
            )}
          </div>
        </div>

        {/* Right side: Engine Metrics, Token Meter, Overview, History & Report */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 pl-1 sm:pl-3">
          {/* C2: Engine Metrics Button (Bản đồ {ms} ms · 0 token) */}
          <button
            type="button"
            onClick={() => setShowMetricsDialog(true)}
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold border border-white/25 transition-all cursor-pointer backdrop-blur-sm"
            title="Xem chỉ số đo lường hiệu năng Engine phân tích tĩnh"
          >
            <Activity className="size-3.5 text-white" />
            <span>
              Bản đồ {totalMapMs} ms · 0 token
            </span>
          </button>

          {/* Token Meter Display với tooltip ước tính USD theo spec/30_UI */}
          <div
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-sm cursor-help ${
              isQuotaExceeded && !isOffline
                ? "bg-[#e7000b]/20 border-[#e7000b]/40 text-white"
                : "bg-white/15 border-white/25 text-white"
            }`}
            title={
              isOffline
                ? "Chế độ Offline — 0 token"
                : `~${estimatedCost} USD (ước tính) · Hạn mức: ${tokensUsed.toLocaleString("vi-VN")} / ${tokensQuota.toLocaleString("vi-VN")} tokens`
            }
          >
            <Sparkles className="size-3.5" />
            <span>
              {isOffline
                ? "0 token"
                : `${tokensUsed.toLocaleString("vi-VN")} / ${tokensQuota.toLocaleString("vi-VN")} tokens (${tokenPercentage}%)`}
            </span>
          </div>

          {/* Step 9: Repo Architecture Overview Button */}
          {onOpenOverview && (
            <button
              onClick={onOpenOverview}
              type="button"
              disabled={isLoadingOverview}
              aria-label="Tổng quan kiến trúc"
              className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold text-xs sm:text-sm px-2.5 sm:px-3.5 py-2 rounded-[10px] border border-white/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60"
              title="Xem tổng quan kiến trúc toàn cảnh repo (Bước 9)"
            >
              <Layers className="size-4 shrink-0" />
              <span className="hidden sm:inline">
                {isLoadingOverview ? "Đang tải tổng quan..." : "Tổng quan kiến trúc"}
              </span>
            </button>
          )}

          {/* History Page Link Button */}
          <Link
            href={
              sessionId
                ? `/history?session=${encodeURIComponent(sessionId)}`
                : "/history"
            }
            aria-label="Lịch sử"
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold text-xs sm:text-sm px-2.5 sm:px-3.5 py-2 rounded-[10px] border border-white/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Xem lịch sử trả lời câu hỏi Feynman"
          >
            <History className="size-4 shrink-0" />
            <span className="hidden sm:inline">Lịch sử</span>
          </Link>

          {/* Session Report Button */}
          <Link
            href={
              sessionId
                ? `/report?session=${encodeURIComponent(sessionId)}`
                : "/report"
            }
            aria-label="Báo cáo"
            className="bg-[#8b4600] hover:bg-[#944b00] active:bg-[#723900] text-white font-bold text-xs sm:text-sm px-2.5 sm:px-4 py-2 rounded-[10px] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)] flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            data-node-id="5:57"
          >
            <div className="relative size-4 shrink-0">
              <Image
                src="/assets/learn/report-icon.svg"
                alt="Report"
                width={16}
                height={16}
                className="object-contain"
              />
            </div>
            <span className="hidden sm:inline">Báo cáo</span>
          </Link>
        </div>
      </div>

      {/* C2: Engine Metrics Dialog (ui.metrics) */}
      <Dialog
        isOpen={showMetricsDialog}
        onClose={() => setShowMetricsDialog(false)}
        title="Chỉ số hiệu năng Engine SimpliFey"
        description="Thông số đo lường hiệu năng của các tầng phân tích tĩnh (Tầng 0 Ingestion và Tầng 1–2 Static Engine)"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f9faff] border border-[#eaedff] rounded-[10px] p-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-[#625e56]">
                <Clock className="size-3.5 text-[#ff9640]" />
                <span>Ingest (Tầng 0)</span>
              </div>
              <span className="text-xl font-black text-[#131b2e] font-mono">
                {ingestMs} ms
              </span>
              <span className="text-[11px] text-[#99a1af]">
                Giải nén, kiểm tra an toàn & lọc nhiễu
              </span>
            </div>

            <div className="bg-[#f9faff] border border-[#eaedff] rounded-[10px] p-3.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-[#625e56]">
                <Activity className="size-3.5 text-[#ff9640]" />
                <span>Engine AST & SCC (Tầng 1-2)</span>
              </div>
              <span className="text-xl font-black text-[#131b2e] font-mono">
                {engineMs} ms
              </span>
              <span className="text-[11px] text-[#99a1af]">
                Web Tree-sitter & PageRank
              </span>
            </div>
          </div>

          <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-[10px] p-3.5 flex items-center justify-between text-xs text-[#065f46]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#047857]" />
              <span className="font-semibold">
                Tổng thời gian dựng bản đồ kiến trúc:
              </span>
            </div>
            <span className="font-mono font-bold text-sm">
              {totalMapMs} ms · 0 token AI
            </span>
          </div>

          <div className="border border-[#f3f4f6] rounded-[10px] p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#625e56]">
                <FileCode2 className="size-4 text-[#ff9640]" />
                <span>Tổng số file mã nguồn đã xử lý:</span>
              </div>
              <span className="font-bold text-[#131b2e] font-mono">
                {fileCount} files
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#625e56]">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Khóa bí mật (secrets/tokens) đã che:</span>
              </div>
              <span className="font-bold text-emerald-700 font-mono">
                {secretCount} đã lọc
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetricsDialog(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog Đổi thư mục con */}
      <Dialog
        isOpen={isChangeDirOpen}
        onClose={() => {
          if (!isChangingDir) {
            setIsChangeDirOpen(false);
            setChangeDirError(null);
          }
        }}
        title="Đổi thư mục làm việc"
        description="Nhập đường dẫn thư mục con trong repo để phân tích lại (ví dụ: server/ hoặc packages/backend/)"
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!onChangeDir) return;
            setIsChangingDir(true);
            setChangeDirError(null);
            try {
              const err = await onChangeDir(newSubdir.trim());
              if (err) {
                setChangeDirError(err);
              } else {
                setIsChangeDirOpen(false);
              }
            } catch (error) {
              setChangeDirError(
                error instanceof Error ? error.message : "Đã có lỗi xảy ra."
              );
            } finally {
              setIsChangingDir(false);
            }
          }}
          className="flex flex-col gap-4 mt-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="subdir-input"
              className="text-xs font-semibold text-[#131b2e]"
            >
              Đường dẫn thư mục con
            </label>
            <input
              id="subdir-input"
              type="text"
              value={newSubdir}
              onChange={(e) => {
                setNewSubdir(e.target.value);
                if (changeDirError) setChangeDirError(null);
              }}
              placeholder="VD: server/"
              disabled={isChangingDir}
              className="w-full px-3 py-2 text-sm border border-[#d8dbeb] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#ff9640] text-[#131b2e] placeholder:text-[#99a1af]"
              autoFocus
            />
          </div>

          {changeDirError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[8px] text-xs text-red-600 font-medium">
              {changeDirError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isChangingDir}
              onClick={() => {
                setIsChangeDirOpen(false);
                setChangeDirError(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isChangingDir}
              className="bg-[#ff9640] hover:bg-[#f2852e] text-white cursor-pointer"
            >
              {isChangingDir ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
