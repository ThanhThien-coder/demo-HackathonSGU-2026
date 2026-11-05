"use client";
// 30 Mục 2 — danh sách bài (node) của một phiên: mở phiên theo courseId (= session_id) rồi liệt kê theo thứ tự tô-pô.
import Link from "next/link";
import { use, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { STATUS_UI } from "@/components/ui/common";
import { topoOrder } from "@/lib/derive";
import { useWorkbench } from "@/store/workbench";

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { result, progress, session_id } = useWorkbench();
  const auth = useWorkbench((s) => s.ui.auth);
  const { resumeSession, openNode } = useWorkbench.getState();
  useEffect(() => { if (auth === "user" && session_id !== courseId) void resumeSession(courseId); }, [auth, session_id, courseId, resumeSession]);
  const order = result ? topoOrder(result.nodes.map((n) => ({ node_id: n.id, title: n.title, prerequisites: n.prerequisites, is_capstone: n.is_capstone }))) : [];
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">{result?.repo_name ?? "Phiên học"}</h1>
        <ol className="mt-6 flex flex-col gap-2">
          {order.map((id, i) => {
            const n = result!.nodes.find((x) => x.id === id)!;
            const st = progress?.nodes[id]?.status ?? "LOCKED";
            const ui = STATUS_UI[st];
            return (
              <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
                <span><span className="mr-2 text-muted">{i + 1}.</span><b>{n.title}</b> {n.is_capstone && <span className="text-amber">★</span>}</span>
                <span className="flex items-center gap-3"><span className={`text-xs ${ui.color}`}>{ui.icon} {ui.label}</span>
                  {st !== "LOCKED" && <Link href={`/learn?session=${courseId}`} onClick={() => openNode(id)} className="rounded border border-line px-2 py-1 text-xs hover:bg-white/5">Mở bài</Link>}</span>
              </li>
            );
          })}
        </ol>
      </main>
    </>
  );
}
