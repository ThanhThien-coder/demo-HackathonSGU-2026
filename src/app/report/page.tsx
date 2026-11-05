"use client";
// 30 Mục 2 — báo cáo phiên: tiến độ node + thống kê lượt nộp theo kỹ năng (số thật từ DB, không số mục tiêu).
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { AttemptHistoryItem, SessionProgress } from "@/contracts";
import { Navbar } from "@/components/layout/Navbar";
import { STATUS_UI } from "@/components/ui/common";
import { api } from "@/lib/api";
import { useWorkbench } from "@/store/workbench";

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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Báo cáo phiên học</h1>
        {!id && <p className="mt-4 text-muted">Chọn một phiên ở trang chủ để xem báo cáo.</p>}
        {err && <p className="mt-4 text-red">⚠ {err}</p>}
        {progress && (
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["COMPLETED", "FAILED", "AVAILABLE", "LOCKED"] as const).map((s) => (
              <div key={s} className="rounded-xl border border-line bg-panel p-4 text-center">
                <p className={`text-2xl font-bold ${STATUS_UI[s].color}`}>{count(s)}</p><p className="text-xs text-muted">{STATUS_UI[s].icon} {STATUS_UI[s].label}</p>
              </div>
            ))}
            <p className="col-span-full text-xs text-muted">Token đã dùng trong phiên: {progress.tokens_used}</p>
          </section>
        )}
        {items && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Lượt nộp theo kỹ năng</h2>
            {bySkill.length === 0 ? <p className="text-sm text-muted">Chưa có lượt nộp nào.</p> : (
              <table className="w-full text-sm"><thead className="text-left text-xs text-muted"><tr><th>Kỹ năng</th><th>Số lượt</th><th>Lượt đạt</th></tr></thead>
                <tbody>{bySkill.map(([k, v]) => <tr key={k} className="border-t border-line"><td className="py-1.5 font-mono">{k}</td><td>{v.n}</td><td>{v.pass}</td></tr>)}</tbody></table>
            )}
          </section>
        )}
      </main>
    </>
  );
}

export default function ReportPage() { return <Suspense fallback={null}><Report /></Suspense>; }
