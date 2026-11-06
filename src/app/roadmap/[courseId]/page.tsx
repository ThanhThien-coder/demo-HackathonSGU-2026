"use client";
// 30 Mục 2 — danh sách bài (node) của một phiên: mở phiên theo courseId (= session_id) rồi liệt kê theo thứ tự tô-pô.
import Link from "next/link";
import { use, useEffect, useRef } from "react";
import { Route } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui/Page";
import { topoOrder } from "@/lib/derive";
import { useWorkbench } from "@/store/workbench";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { result, progress, session_id } = useWorkbench();
  const auth = useWorkbench((s) => s.ui.auth);
  const { resumeSession, openNode } = useWorkbench.getState();
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const err = useWorkbench((s) => s.ui.ingest_error);
  const tried = useRef<string | null>(null);
  // mỗi courseId chỉ thử mở 1 lần (lỗi thì báo, không gọi lặp)
  useEffect(() => {
    if (auth !== "user" || session_id === courseId || ingesting || tried.current === courseId) return;
    tried.current = courseId;
    void resumeSession(courseId);
  }, [auth, session_id, courseId, ingesting, resumeSession]);
  const mine = session_id === courseId;
  const order = result && mine ? topoOrder(result.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone }))) : [];
  return (
    <>
      <Navbar />
      <main className="anim-fade-up mx-auto max-w-4xl px-6 py-10">
        <PageHeader icon={<Route className="h-5 w-5" />} title={mine ? result?.repo_name : "Phiên học"}
          description={mine && result ? <span className="font-mono text-subtle">{result.snapshot.ref_label ?? ""} @ {result.snapshot.snapshot_id.slice(0, 7)} · {result.nodes.length} node</span> : undefined} />
        <div className="mt-6">
          {auth !== "user" && <EmptyState>Đăng nhập để xem phiên học này.</EmptyState>}
          {ingesting && <div className="shimmer h-40 rounded-xl" />}
          {!ingesting && err && !mine && <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">⚠ {err.message}</p>}
          {order.length > 0 && (
            <ol className="sf-list">
              {order.map((id, i) => {
                const n = result!.nodes.find((x) => x.id === id)!;
                const st = progress?.nodes[id]?.status ?? "LOCKED";
                return (
                  <li key={id} className="sf-row flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-right font-mono text-xs text-subtle">{i + 1}</span>
                      <span className="min-w-0">
                        <b className="text-text">{n.title}</b> {n.is_capstone && <span className="text-amber" title="Capstone">★</span>}
                        <span className="block font-mono text-xs text-subtle">{n.files.length} file · {n.languages.join(", ").toLowerCase()}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={st} />
                      {st !== "LOCKED" && <Link href={`/learn?session=${courseId}`} onClick={() => openNode(id)} className="btn-secondary rounded-lg px-3 py-1 text-xs font-semibold">Mở bài</Link>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}
