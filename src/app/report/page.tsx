"use client";
// 30 Mục 2 — báo cáo phiên: tiến độ node + thống kê lượt nộp theo kỹ năng (số thật từ DB, không số mục tiêu).
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { AttemptHistoryItem, SessionProgress } from "@/contracts";
import { CONFIG } from "@/contracts/config";
import { Navbar } from "@/components/layout/Navbar";
import { STATUS_UI } from "@/components/ui/common";
import { EmptyState, MetricCard, PageHeader } from "@/components/ui/Page";
import { api } from "@/lib/api";
import { useWorkbench } from "@/store/workbench";

const ST_FG = { COMPLETED: "var(--st-done-fg)", FAILED: "var(--st-fail-fg)", AVAILABLE: "var(--st-ready-fg)", LOCKED: "var(--st-lock-fg)" } as const;

function Report() {
  const id = useSearchParams().get("session");
  const auth = useWorkbench((s) => s.ui.auth);
  const [items, setItems] = useState<AttemptHistoryItem[] | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!id || auth !== "user") return;
    void api.getHistory(id).then((r) => (r.ok ? setItems(r.data.items) : setErr(r.error.message)));
    void api.getProgress(id).then((r) => { if (r.ok) setProgress(r.data.progress); });
  }, [id, auth]);
  const bySkill = useMemo(() => {
    const m = new Map<string, { n: number; pass: number }>();
    for (const a of items ?? []) { const c = m.get(a.skill) ?? { n: 0, pass: 0 }; c.n++; if (a.is_passed) c.pass++; m.set(a.skill, c); }
    return [...m.entries()];
  }, [items]);
  const nodes = progress ? Object.values(progress.nodes) : [];
  const count = (s: string) => nodes.filter((n) => n.status === s).length;
  return (
    <>
      <Navbar />
      <main className="anim-fade-up mx-auto max-w-5xl px-6 py-10">
        <PageHeader icon={<FileText className="h-5 w-5" />} title="Báo cáo phiên học"
          description="Số liệu thật lấy từ máy chủ: trạng thái từng node và lượt nộp theo kỹ năng." />
        <div className="mt-6 flex flex-col gap-8">
          {!id && <EmptyState>Chọn một phiên ở trang chủ để xem báo cáo.</EmptyState>}
          {id && auth !== "user" && <EmptyState>Đăng nhập để xem báo cáo.</EmptyState>}
          {err && <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">⚠ {err}</p>}
          {progress && (
            <section aria-label="Tiến độ node">
              <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["COMPLETED", "FAILED", "AVAILABLE", "LOCKED"] as const).map((s) => (
                  <MetricCard key={s} label={STATUS_UI[s].label} icon={<span style={{ color: ST_FG[s] }}>{STATUS_UI[s].icon}</span>} value={count(s)} hint={`/ ${nodes.length} node`} />
                ))}
              </div>
              <MetricCard className="mt-3" label="Token đã dùng trong phiên" value={<span className="font-mono">{progress.tokens_used.toLocaleString("vi-VN")}</span>}
                hint={`hạn mức ${CONFIG.SESSION_TOKEN_QUOTA.toLocaleString("vi-VN")} token / phiên`} />
            </section>
          )}
          {items && (
            <section aria-label="Lượt nộp theo kỹ năng">
              <h2 className="sf-metric-label mb-2">Lượt nộp theo kỹ năng</h2>
              {bySkill.length === 0 ? <EmptyState>Chưa có lượt nộp nào.</EmptyState> : (
                <div className="sf-list">
                  <div className="sf-thead grid grid-cols-[minmax(0,1fr)_80px_80px_minmax(0,160px)] gap-4 px-4 py-2"><span>Kỹ năng</span><span className="text-right">Số lượt</span><span className="text-right">Lượt đạt</span><span>Tỉ lệ đạt</span></div>
                  {bySkill.map(([k, v]) => {
                    const pct = v.n ? Math.round((v.pass / v.n) * 100) : 0;
                    return (
                      <div key={k} className="sf-row grid grid-cols-[minmax(0,1fr)_80px_80px_minmax(0,160px)] items-center gap-4 px-4 py-2.5 text-sm">
                        <span className="truncate font-mono font-semibold text-text">{k}</span>
                        <span className="text-right font-mono text-subtle">{v.n}</span>
                        <span className="text-right font-mono text-subtle">{v.pass}</span>
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="bar-grow block h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pct}%` }} /></span>
                          <span className="w-9 text-right font-mono text-xs text-subtle">{pct}%</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export default function ReportPage() { return <Suspense fallback={null}><Report /></Suspense>; }
