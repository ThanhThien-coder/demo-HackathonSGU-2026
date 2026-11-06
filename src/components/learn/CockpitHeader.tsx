"use client";
// 30 Mục 2.3 — thanh trên trang học: repo, vân tay, đo, token, nút Tổng quan / Lịch sử / Báo cáo / Repo khác.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, FolderTree, GitBranch, History, LayoutDashboard, RotateCcw } from "lucide-react";
import { CONFIG } from "@/contracts/config";
import { Button, Chip, Modal, cn } from "@/components/ui/common";
import { useWorkbench } from "@/store/workbench";
import { LayoutControls } from "./LayoutControls";

const btn = "btn-secondary inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium";

export function CockpitHeader() {
  const { result, progress, session_id } = useWorkbench();
  const offline = useWorkbench((s) => s.is_offline_mode);
  const metrics = useWorkbench((s) => s.ui.metrics);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const { setUi, resetSession, scanUrl } = useWorkbench.getState();
  const router = useRouter();
  const [dirOpen, setDirOpen] = useState(false);
  const [dir, setDir] = useState("");
  if (!result) return null;
  const fp = result.fingerprint;
  const rep = result.ingestion_report;
  const k = result.snapshot;
  const sha = k.snapshot_id.slice(0, 7);
  const used = progress?.tokens_used ?? 0;
  const over = used >= CONFIG.SESSION_TOKEN_QUOTA;
  const cost = ((used * (CONFIG.LLM_PRICE_INPUT_USD_PER_M + CONFIG.LLM_PRICE_OUTPUT_USD_PER_M)) / 2 / 1e6).toFixed(4);
  const canReselect = (fp.is_monorepo || rep.selective_fetch) && !offline && k.source === "GITHUB";

  const reselect = async () => {
    setDirOpen(false);
    await scanUrl(`https://github.com/${k.repo_key}`, dir.trim());
    const s = useWorkbench.getState();
    if (s.session_id && !s.ui.ingest_error) router.replace(`/learn?session=${s.session_id}`);
    else if (s.ui.ingest_error) s.toast(s.ui.ingest_error.message, "error");
  };

  return (
    <>
    <header className="anim-fade relative z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-line bg-panel-2/80 px-3 py-1.5 backdrop-blur">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 font-mono font-semibold text-text shadow-[var(--shadow)]">
          <GitBranch aria-hidden className="h-3.5 w-3.5 shrink-0 text-violet" />
          <span className="truncate">{result.repo_name} · {k.ref_label ?? ""} @ {sha}{k.snapshot_id_kind === "ARCHIVE_HASH" ? " zip" : ""}</span>
        </span>
        <Chip tone="blue">{fp.archetype}</Chip>
        {fp.is_monorepo && <Chip tone="amber">Monorepo · {fp.root_dir_offset}</Chip>}
        {rep.selective_fetch && <Chip tone="amber">Repo lớn · {fp.root_dir_offset}</Chip>}
        {canReselect && (
          <button type="button" disabled={ingesting} onClick={() => { setDir(fp.root_dir_offset); setDirOpen(true); }}
            className="inline-flex items-center gap-1 text-amber underline-offset-2 hover:underline disabled:opacity-50">
            <FolderTree aria-hidden className="h-3.5 w-3.5" />{ingesting ? "Đang quét lại…" : "Đổi thư mục"}
          </button>
        )}
        <button type="button" onClick={() => setUi({ metrics: !metrics })} aria-expanded={metrics} title="Bấm để xem chi tiết"
          className="text-subtle underline-offset-2 hover:text-text hover:underline">
          Bản đồ <b className="font-mono text-text">{rep.ingest_ms + rep.engine_ms}</b> ms · 0 token
        </button>
        {metrics && <span className="font-mono text-subtle">Tải+lọc {rep.ingest_ms} ms · đồ thị {rep.engine_ms} ms · {rep.code_file_count} file code</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span title={offline ? "Offline: không gọi AI" : `~${cost} USD (ước tính)`}
          className={cn("inline-flex h-7 items-center rounded-md border bg-panel px-2 font-mono text-xs", over ? "border-red text-red" : "border-line text-subtle")}>
          {offline ? "0 token" : `${used} / ${CONFIG.SESSION_TOKEN_QUOTA}`}
        </span>
        <button type="button" className={btn} onClick={() => setUi({ overview_open: true })}><LayoutDashboard aria-hidden className="h-3.5 w-3.5 text-blue" />Tổng quan kiến trúc</button>
        {!offline && session_id && <Link href={`/history?session=${session_id}`} className={btn}><History aria-hidden className="h-3.5 w-3.5" />Lịch sử</Link>}
        {!offline && session_id && <Link href={`/report?session=${session_id}`} className={btn}><FileText aria-hidden className="h-3.5 w-3.5" />Báo cáo</Link>}
        <button type="button" className={btn} onClick={() => { resetSession(); router.push("/"); }}><RotateCcw aria-hidden className="h-3.5 w-3.5" />Repo khác</button>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line lg:block" />
        <LayoutControls />
      </div>

    </header>
      <Modal open={dirOpen} onClose={() => setDirOpen(false)} title="Đổi thư mục phân tích"
        footer={<><Button variant="ghost" onClick={() => setDirOpen(false)}>Hủy</Button><Button onClick={() => void reselect()}>Quét lại</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); void reselect(); }}>
          <label htmlFor="subdir" className="text-sm text-muted">Thư mục muốn phân tích (VD <code className="font-mono">server/</code>), để trống = gốc repo</label>
          <input id="subdir" value={dir} onChange={(e) => setDir(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line-strong bg-panel px-3 py-2 font-mono text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]" />
        </form>
      </Modal>
    </>
  );
}
