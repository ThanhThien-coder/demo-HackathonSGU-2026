"use client";
// 30 Mục 4 (đề xuất D-78) — cột trái "Bản đồ bài học", luôn hiện: thanh canvas (độ tin cậy, ngôn ngữ, framework, cảnh báo) + DagCanvas + chú giải.
import dynamic from "next/dynamic";
import { useState } from "react";
import { Network, TriangleAlert, X } from "lucide-react";
import { Chip } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";

const DagCanvas = dynamic(() => import("@/components/canvas/DagCanvas").then((m) => m.DagCanvas), { ssr: false, loading: () => <div className="shimmer m-4 h-64 rounded-xl" /> });

const SKIP_LABEL: Record<string, string> = {
  garbage: "thư mục rác / build", binary: "file nhị phân", oversized: "file quá lớn", unsupported_lang: "ngôn ngữ chưa hỗ trợ", quota: "vượt hạn mức", parse_error: "lỗi cú pháp",
};

function Legend() {
  return (
    <footer className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-[11px] text-muted">
      <span className="text-amber">● Sẵn sàng</span>
      <span className="text-green">✓ Hoàn thành</span>
      <span className="text-red">✗ Chưa đạt</span>
      <span>🔒 Chưa mở</span>
      <span className="text-amber">⚠ Node trước chưa vững</span>
      <span title="Cạnh liền: chắc chắn · cạnh đứt: suy luận, chưa bảo đảm 100%">— chắc chắn · - - suy luận</span>
    </footer>
  );
}

export function LessonGraphPanel() {
  const { result, progress, analyses, active_node_id } = useWorkbench();
  const newly = useWorkbench((s) => s.ui.newly_unlocked);
  const { openNode, retryAnalysis } = useWorkbench.getState();
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (!result || !progress) return null;

  const rep = result.ingestion_report;
  const fp = result.fingerprint;
  const total = fp.language_breakdown.reduce((a, b) => a + b.code_bytes, 0) || 1;
  const conf = { HIGH: ["green", "Cao"], MIXED: ["amber", "Vừa"], LOW: ["red", "Thấp"] } as const;
  const [tone, confLabel] = conf[fp.graph_confidence];
  const low = fp.graph_confidence === "LOW";
  const skippedEntries = Object.entries(rep.skipped).filter(([, v]) => v > 0);
  const skippedTotal = skippedEntries.reduce((a, [, v]) => a + v, 0);

  // cảnh báo: truncated / warnings / omitted_node_count (D-53); bỏ cảnh báo thời gian engine_ms; LOW ⇒ không đóng được
  const warnings = [
    ...(low ? ["Độ tin cậy đồ thị thấp — nhiều cạnh là suy luận, chưa bảo đảm 100%."] : []),
    ...(rep.truncated ? ["Repo lớn — chỉ phân tích các tệp ưu tiên."] : []),
    ...(rep.omitted_node_count > 0 ? [`${rep.omitted_node_count} luồng khác không hiển thị trên bản đồ`] : []),
    ...rep.warnings.filter((w) => !/Bước dựng đồ thị mất/.test(w)),
  ].filter((w) => low || !dismissed.includes(w));

  return (
    <section aria-label="Bản đồ bài học" className="sf-panel flex h-[460px] min-w-0 flex-col overflow-hidden rounded-xl lg:h-full lg:min-h-0">
      <header className="border-b border-line px-3 pb-2 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            <Network aria-hidden className="h-3.5 w-3.5 text-violet" />Bản đồ bài học
          </h2>
          <span className="font-mono text-[11px] text-subtle">{result.nodes.length} node</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Chip tone={tone}>Độ tin cậy đồ thị: {confLabel}</Chip>
          {fp.language_breakdown.map((l) => (
            <Chip key={l.language} title={l.tier === "STRUCTURAL" ? "Ngôn ngữ chỉ phân tích cấu trúc — cạnh gọi hàm là suy luận" : undefined}>
              {l.language.toLowerCase()} {Math.round((l.code_bytes / total) * 100)}%{l.tier === "STRUCTURAL" && " · suy luận"}
            </Chip>
          ))}
          {fp.detected_framework && <Chip tone="blue">{fp.detected_framework}</Chip>}
          {rep.degraded_mode && <Chip tone="amber">Repo tuần tự</Chip>}
          {rep.redacted_secret_count > 0 && <Chip tone="violet">Đã che {rep.redacted_secret_count} nội dung nhạy cảm</Chip>}
          {skippedTotal > 0 && (
            <details className="relative">
              <summary className="cursor-pointer list-none"><Chip>Bỏ qua {skippedTotal} file ▾</Chip></summary>
              <ul className="glass absolute left-0 top-7 z-30 w-56 rounded-lg border border-line p-2 text-xs shadow-xl">
                {skippedEntries.map(([k, v]) => <li key={k} className="flex justify-between gap-2 py-0.5"><span className="text-muted">{SKIP_LABEL[k] ?? k}</span><b className="font-mono">{v}</b></li>)}
              </ul>
            </details>
          )}
        </div>
      </header>
      {warnings.length > 0 && (
        <ul className="border-b border-line bg-amber/5 px-3 py-1.5 text-[11px] text-amber">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 py-0.5">
              <TriangleAlert aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1">{w}</span>
              {!low && <button type="button" aria-label="Ẩn cảnh báo" onClick={() => setDismissed((d) => [...d, w])} className="text-muted hover:text-text"><X className="h-3 w-3" /></button>}
            </li>
          ))}
        </ul>
      )}
      <div className="relative min-h-0 flex-1">
        <DagCanvas result={result} progress={progress} analyses={analyses} activeId={active_node_id} newlyUnlocked={newly} onOpen={openNode} onRetry={retryAnalysis} />
      </div>
      <Legend />
    </section>
  );
}
