"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Lock, RefreshCw, X } from "lucide-react";
import type {
  ClientStaticEngineResult,
  ClientWorkbenchState,
  RepoOverviewView,
  SessionProgress,
} from "@/contracts";
import { aiTitleOf, displayTitle } from "@/lib/derive";
import {
  blockedBy,
  cardAction,
  isGroupOpen,
  lessonGroups,
  nodeStatesOf,
  openGroupsAfter,
  startNodeIds,
  weakParents,
} from "@/lib/lesson-map";
import { useWorkbenchStore } from "@/store/workbench";
import { LessonCard } from "./LessonCard";
import { LessonGroup } from "./LessonGroup";

const TOAST_MS = 2500;

const CONFIDENCE_VIEW: Record<string, { label: string; className: string }> = {
  HIGH: { label: "Cao", className: "bg-status-success/10 text-[#047857]" },
  MEDIUM: { label: "Vừa", className: "bg-status-warning/15 text-brand-dark" },
  LOW: { label: "Thấp", className: "bg-status-danger/10 text-status-danger" },
};

const SKIPPED_LABELS: Record<string, string> = {
  garbage: "File rác",
  binary: "File nhị phân",
  oversized: "File quá lớn",
  unsupported_lang: "Ngôn ngữ chưa hỗ trợ",
  quota: "Vượt hạn mức",
  parse_error: "Lỗi đọc cú pháp",
};

function ScanFacts({ result }: { result: ClientStaticEngineResult }) {
  const { fingerprint, ingestion_report: report } = result;
  const confidence = CONFIDENCE_VIEW[fingerprint.graph_confidence];
  const languages = fingerprint.language_breakdown ?? [];
  const totalBytes = languages.reduce((sum, lang) => sum + lang.code_bytes, 0);
  const skipped = Object.entries(report?.skipped ?? {}).filter(([, count]) => count > 0);
  const skippedTotal = skipped.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
      {confidence && (
        <span className={`rounded-full px-2 py-0.5 font-semibold ${confidence.className}`}>
          Độ tin cậy đồ thị: {confidence.label}
        </span>
      )}
      {languages.map((lang) => (
        <span key={lang.language}>
          {lang.language} {totalBytes > 0 ? Math.round((lang.code_bytes / totalBytes) * 100) : 0}%
          {lang.tier === "STRUCTURAL" ? " · suy luận" : ""}
        </span>
      ))}
      {fingerprint.detected_framework && <span>{fingerprint.detected_framework}</span>}
      {report?.degraded_mode && <span>Repo tuần tự</span>}
      {report?.redacted_secret_count > 0 && (
        <span>Đã che {report.redacted_secret_count} nội dung nhạy cảm</span>
      )}
      {skippedTotal > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer">Bỏ qua {skippedTotal} file</summary>
          <ul className="mt-1 flex flex-col gap-0.5 pl-3">
            {skipped.map(([key, count]) => (
              <li key={key}>
                {SKIPPED_LABELS[key] ?? key}: {count}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ScanWarnings({ result }: { result: ClientStaticEngineResult }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const report = result.ingestion_report;
  const canDismiss = result.fingerprint.graph_confidence !== "LOW";
  const lines = [
    ...new Set([
      ...(report?.truncated ? ["Dữ liệu repo bị cắt bớt do vượt quá giới hạn."] : []),
      ...(report?.omitted_node_count > 0
        ? [`${report.omitted_node_count} luồng khác không hiển thị trên bản đồ`]
        : []),
      ...(report?.warnings ?? []),
    ]),
  ].filter((line) => !dismissed.includes(line));

  if (lines.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {lines.map((line) => (
        <li
          key={line}
          className="flex items-start gap-1.5 rounded-lg bg-status-warning/10 px-2 py-1.5 text-xs text-text-main"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words">{line}</span>
          {canDismiss && (
            <button
              type="button"
              onClick={() => setDismissed((old) => [...old, line])}
              aria-label="Đóng cảnh báo"
              className="cursor-pointer text-text-secondary hover:text-text-main"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border-subtle pt-2 text-[11px] text-text-secondary">
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-status-warning" aria-hidden="true" />
        Sẵn sàng
      </span>
      <span className="inline-flex items-center gap-1">
        <Check className="size-3 text-[#047857]" aria-hidden="true" />
        Hoàn thành
      </span>
      <span className="inline-flex items-center gap-1">
        <X className="size-3 text-status-danger" aria-hidden="true" />
        Chưa đạt
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="size-3" aria-hidden="true" />
        Chưa mở
      </span>
      <span className="inline-flex items-center gap-1">
        <AlertTriangle className="size-3 text-status-warning" aria-hidden="true" />
        Node trước chưa vững
      </span>
    </div>
  );
}

export interface LessonMapViewProps {
  result: ClientStaticEngineResult;
  overview: RepoOverviewView | null;
  progress: SessionProgress | null;
  analyses: ClientWorkbenchState["analyses"];
  activeNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onRetryAnalysis: (nodeId: string) => void;
}

export function LessonMapView({
  result,
  overview,
  progress,
  analyses,
  activeNodeId,
  onSelectNode,
  onRetryAnalysis,
}: LessonMapViewProps) {
  const { nodes, edges } = result;
  const groups = useMemo(() => lessonGroups(result, overview), [result, overview]);
  const states = useMemo(() => nodeStatesOf(nodes, progress), [nodes, progress]);
  const starts = useMemo(() => startNodeIds(nodes, edges), [nodes, edges]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    openGroupsAfter({}, groups, activeNodeId)
  );
  // Mở bài từ nơi khác, ví dụ nút bắt đầu ở Tổng quan, cũng mở nhóm của bài.
  const [seenActiveId, setSeenActiveId] = useState(activeNodeId);
  if (activeNodeId !== seenActiveId) {
    setSeenActiveId(activeNodeId);
    setOpenGroups((old) => openGroupsAfter(old, groups, activeNodeId));
  }

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const namesOf = (ids: string[]) =>
    ids.map((id) => {
      const parent = nodeById.get(id);
      return parent ? displayTitle(parent, overview) : id;
    });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Bản đồ bài học</h2>
          <span className="text-xs text-text-secondary">{nodes.length} bài</span>
        </div>
        <ScanFacts result={result} />
      </div>

      <ScanWarnings result={result} />

      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <LessonGroup
            key={group.group_id}
            group={group}
            isOpen={isGroupOpen(openGroups, group)}
            onToggle={() =>
              setOpenGroups((old) => ({ ...old, [group.group_id]: !isGroupOpen(old, group) }))
            }
          >
            {group.node_ids.map((id) => {
              const node = nodeById.get(id);
              if (!node) return null;
              const state = states[id];
              const blockedNames = namesOf(blockedBy(node, states));
              return (
                <LessonCard
                  key={id}
                  node={node}
                  name={displayTitle(node, overview)}
                  hasAiName={aiTitleOf(id, overview) !== null}
                  state={state}
                  analysis={analyses[id]}
                  active={activeNodeId === id}
                  isStart={starts.has(id)}
                  blockedNames={blockedNames}
                  weakNames={namesOf(weakParents(node, states))}
                  onActivate={() => {
                    const action = cardAction(state.status, blockedNames);
                    if (action.kind === "OPEN") onSelectNode(id);
                    else setToast(action.message);
                  }}
                  onRetryAnalysis={() => onRetryAnalysis(id)}
                />
              );
            })}
          </LessonGroup>
        ))}
      </div>

      <Legend />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-text-main px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

export interface LessonGraphPanelProps {
  hideOnDesktop?: boolean; // Chế độ trình chiếu nhường chỗ cho khung code
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function LessonGraphPanel({
  hideOnDesktop = false,
  isLoading = false,
  errorMessage = null,
  onRetry,
  onSelectNode,
}: LessonGraphPanelProps) {
  const result = useWorkbenchStore((s) => s.result);
  const overview = useWorkbenchStore((s) => s.overview);
  const progress = useWorkbenchStore((s) => s.progress);
  const analyses = useWorkbenchStore((s) => s.analyses);
  const activeNodeId = useWorkbenchStore((s) => s.active_node_id);
  const requestAnalysis = useWorkbenchStore((s) => s.requestAnalysis);

  return (
    <aside
      aria-label="Bản đồ bài học"
      className={`flex max-h-[50vh] w-full flex-col gap-3 overflow-y-auto rounded-[16px] border border-border-default/80 bg-white p-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[280px] xl:shrink-0 ${
        hideOnDesktop ? "lg:hidden" : ""
      }`}
    >
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-status-danger/10 px-2 py-1.5 text-xs text-status-danger">
          <span className="min-w-0 break-words">{errorMessage}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 font-semibold hover:underline"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Thử lại
            </button>
          )}
        </div>
      )}

      {result ? (
        <LessonMapView
          result={result}
          overview={typeof overview === "object" ? overview : null}
          progress={progress}
          analyses={analyses}
          activeNodeId={activeNodeId}
          onSelectNode={onSelectNode}
          onRetryAnalysis={(id) => requestAnalysis(id, true)}
        />
      ) : (
        !errorMessage && (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            {isLoading && <RefreshCw className="size-4 animate-spin" aria-hidden="true" />}
            Đang tải bản đồ…
          </p>
        )
      )}
    </aside>
  );
}
