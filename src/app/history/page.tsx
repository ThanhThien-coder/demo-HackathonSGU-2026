"use client";
// 30 Mục 2 — lịch sử nộp bài của 1 phiên (AttemptHistoryItem, xem student_answer).
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import type { AttemptHistoryItem } from "@/contracts";
import { Navbar } from "@/components/layout/Navbar";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { api } from "@/lib/api";
import { useWorkbench } from "@/store/workbench";

function History() {
  const id = useSearchParams().get("session");
  const auth = useWorkbench((s) => s.ui.auth);
  const [items, setItems] = useState<AttemptHistoryItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!id || auth !== "user") return;
    void api.getHistory(id).then((r) => (r.ok ? setItems(r.data.items) : setErr(r.error.message)));
  }, [id, auth]);
  return (
    <>
      <Navbar />
      <main className="anim-fade-up mx-auto max-w-5xl px-6 py-10">
        <PageHeader icon={<HistoryIcon className="h-5 w-5" />} title="Lịch sử nộp bài"
          description={id ? <>Mọi lượt nộp của phiên <span className="font-mono text-subtle">{id.slice(0, 8)}</span>, mới nhất trước.</> : undefined} />
        <div className="mt-6">
          {!id && <EmptyState>Chọn một phiên ở trang chủ để xem lịch sử.</EmptyState>}
          {id && auth !== "user" && <EmptyState>Đăng nhập để xem lịch sử.</EmptyState>}
          {err && <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">⚠ {err}</p>}
          {id && auth === "user" && !items && !err && <div className="shimmer h-40 rounded-xl" />}
          {items && items.length === 0 && <EmptyState>Chưa có lượt nộp nào.</EmptyState>}
          {items && items.length > 0 && (
            <ul className="sf-list">
              <li className="sf-thead hidden grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-2 sm:grid"><span>Bài · câu · kỹ năng</span><span>Kết quả</span></li>
              {items.map((a, i) => (
                <li key={i} className="sf-row px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text">{a.node_title}</p>
                      <p className="mt-0.5 font-mono text-xs text-subtle">
                        Câu {a.question_index} · {a.skill} · lượt {a.attempt_number} · {new Date(a.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs text-subtle">độ chính xác <b className="text-text">{a.core_accuracy}</b></span>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                        style={a.is_passed
                          ? { background: "var(--st-done-bg)", borderColor: "var(--st-done-border)", color: "var(--st-done-fg)" }
                          : { background: "var(--st-fail-bg)", borderColor: "var(--st-fail-border)", color: "var(--st-fail-fg)" }}>
                        {a.is_passed ? "✓ Đạt" : "✗ Chưa đạt"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-panel-2 px-3 py-2 text-muted">{a.student_answer}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

export default function HistoryPage() { return <Suspense fallback={null}><History /></Suspense>; }
