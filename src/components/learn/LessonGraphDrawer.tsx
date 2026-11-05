"use client";
// 30 Mục 4 — ngăn kéo "Đồ thị bài học": thanh canvas (độ tin cậy, ngôn ngữ, cảnh báo) + chú giải + DagCanvas.
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Chip } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";

const DagCanvas = dynamic(() => import("@/components/canvas/DagCanvas").then((m) => m.DagCanvas), { ssr: false, loading: () => <div className="shimmer m-6 h-64 rounded-xl" /> });

export function GraphSidebarButton() {
  const open = useWorkbench((s) => s.ui.drawer_open);
  const setUi = useWorkbench((s) => s.setUi);
  return (
    <button type="button" aria-expanded={open} onClick={() => setUi({ drawer_open: !open })}
      className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm hover:bg-white/5">🗺 Đồ thị bài học</button>
  );
}

export function LessonGraphDrawer() {
  const open = useWorkbench((s) => s.ui.drawer_open);
  const { result, progress, analyses, active_node_id } = useWorkbench();
  const newly = useWorkbench((s) => s.ui.newly_unlocked);
  const { setUi, openNode, retryAnalysis } = useWorkbench.getState();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setUi({ drawer_open: false }); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setUi]);
  if (!open || !result || !progress) return null;

  const rep = result.ingestion_report;
  const fp = result.fingerprint;
  const total = fp.language_breakdown.reduce((a, b) => a + b.code_bytes, 0) || 1;
  const conf = { HIGH: ["green", "Độ tin cậy cao"], MIXED: ["amber", "Độ tin cậy vừa"], LOW: ["red", "Độ tin cậy thấp"] } as const;
  const [tone, confLabel] = conf[fp.graph_confidence];
  const warnings = rep.warnings.filter((w) => !/Bước dựng đồ thị mất/.test(w));

  return (
    <aside aria-label="Đồ thị bài học" className="glass fixed inset-y-0 right-0 z-40 flex w-full max-w-4xl flex-col border-l border-line shadow-2xl">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-bold">Đồ thị bài học</h2>
        <button type="button" aria-label="Đóng ngăn kéo" onClick={() => setUi({ drawer_open: false })} className="rounded p-1 text-muted hover:text-text">✕</button>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 text-xs">
        <Chip tone={tone}>{confLabel}</Chip>
        {fp.language_breakdown.map((l) => (
          <Chip key={l.language}>{l.language.toLowerCase()} {Math.round((l.code_bytes / total) * 100)}%{l.tier === "STRUCTURAL" && " · suy luận"}</Chip>
        ))}
        <Chip>{result.nodes.length} node</Chip>
        {rep.degraded_mode && <Chip tone="amber">Repo tuần tự</Chip>}
        {rep.redacted_secret_count > 0 && <Chip tone="blue">Đã che {rep.redacted_secret_count} nội dung nhạy cảm</Chip>}
        {rep.omitted_node_count > 0 && <Chip tone="amber">{rep.omitted_node_count} luồng khác không hiển thị trên bản đồ</Chip>}
        {rep.truncated && <Chip tone="amber">Repo lớn — chỉ phân tích các tệp ưu tiên</Chip>}
      </div>
      {warnings.length > 0 && <ul className="border-b border-line px-4 py-2 text-xs text-amber">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}
      <div className="min-h-0 flex-1">
        <DagCanvas result={result} progress={progress} analyses={analyses} activeId={active_node_id} newlyUnlocked={newly} onOpen={openNode} onRetry={retryAnalysis} />
      </div>
      <footer className="flex flex-wrap gap-4 border-t border-line px-4 py-2 text-xs text-muted">
        <span className="text-amber">● Sẵn sàng</span><span className="text-green">✓ Hoàn thành</span><span className="text-red">✗ Chưa đạt</span><span>🔒 Chưa mở</span>
        <span>⚠ Node trước chưa vững</span><span>— cạnh liền: chắc chắn · - - cạnh đứt: suy luận, chưa bảo đảm 100%</span>
      </footer>
    </aside>
  );
}
