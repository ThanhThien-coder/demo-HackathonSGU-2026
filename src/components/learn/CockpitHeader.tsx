"use client";
// 30 Mục 2.3 — thanh trên trang học: repo, vân tay, đo, token, nút.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/contracts/config";
import { Button, Chip, cn } from "@/components/ui/common";
import { GraphSidebarButton } from "./LessonGraphDrawer";
import { useWorkbench } from "@/store/workbench";

export function CockpitHeader() {
  const { result, progress, session_id } = useWorkbench();
  const offline = useWorkbench((s) => s.is_offline_mode);
  const metrics = useWorkbench((s) => s.ui.metrics);
  const { setUi, resetSession, scanUrl } = useWorkbench.getState();
  const router = useRouter();
  if (!result) return null;
  const fp = result.fingerprint;
  const rep = result.ingestion_report;
  const k = result.snapshot;
  const sha = k.snapshot_id.slice(0, 7);
  const used = progress?.tokens_used ?? 0;
  const over = used >= CONFIG.SESSION_TOKEN_QUOTA;
  const cost = ((used * (CONFIG.LLM_PRICE_INPUT_USD_PER_M + CONFIG.LLM_PRICE_OUTPUT_USD_PER_M)) / 2 / 1e6).toFixed(4);
  const reselect = async () => {
    const dir = window.prompt("Nhập thư mục muốn phân tích (VD server/):", fp.root_dir_offset);
    if (dir === null || k.source !== "GITHUB") return;
    await scanUrl(`https://github.com/${k.repo_key}`, dir);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-semibold">{result.repo_name} · {k.ref_label ?? ""} @ {sha}</span>
        <Chip tone="blue">{fp.archetype}</Chip>
        {fp.detected_framework && <Chip>{fp.detected_framework}</Chip>}
        {fp.is_monorepo && <Chip tone="amber">Monorepo · {fp.root_dir_offset}</Chip>}
        {rep.selective_fetch && <Chip tone="amber">Repo lớn · {fp.root_dir_offset}</Chip>}
        {(fp.is_monorepo || rep.selective_fetch) && !offline && k.source === "GITHUB" && <button type="button" onClick={() => void reselect()} className="text-xs text-amber underline">Đổi thư mục</button>}
        <button type="button" onClick={() => setUi({ metrics: !metrics })} className="text-xs text-muted underline"
          title="Bấm để xem chi tiết">Bản đồ {rep.ingest_ms + rep.engine_ms} ms · 0 token</button>
        {metrics && <span className="text-xs text-muted">Tải+lọc {rep.ingest_ms} ms · đồ thị {rep.engine_ms} ms · {rep.code_file_count} file code</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span title={`~${cost} USD (ước tính)`} className={cn("rounded-md border px-2 py-1 text-xs", over ? "border-red text-red" : "border-line text-muted")}>
          {offline ? "0 token" : `${used} / ${CONFIG.SESSION_TOKEN_QUOTA}`}
        </span>
        <GraphSidebarButton />
        <Button variant="ghost" onClick={() => setUi({ overview_open: true })}>Tổng quan kiến trúc</Button>
        {!offline && session_id && <Link href={`/history?session=${session_id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5">Lịch sử</Link>}
        {!offline && session_id && <Link href={`/report?session=${session_id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5">Báo cáo</Link>}
        <Button variant="ghost" onClick={() => { resetSession(); router.push("/"); }}>Repo khác</Button>
      </div>
    </header>
  );
}
