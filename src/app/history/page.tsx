"use client";
// 30 Mục 2 — lịch sử nộp bài của 1 phiên (AttemptHistoryItem, xem student_answer).
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { AttemptHistoryItem } from "@/contracts";
import { Navbar } from "@/components/layout/Navbar";
import { Chip } from "@/components/ui/common";
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
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Lịch sử nộp bài</h1>
        {!id && <p className="mt-4 text-muted">Chọn một phiên ở trang chủ để xem lịch sử.</p>}
        {err && <p className="mt-4 text-red">⚠ {err}</p>}
        {items && items.length === 0 && <p className="mt-4 text-muted">Chưa có lượt nộp nào.</p>}
        <ul className="mt-4 flex flex-col gap-3">
          {items?.map((a, i) => (
            <li key={i} className="rounded-xl border border-line bg-panel p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <b className="text-text">{a.node_title}</b><span>Câu {a.question_index} · {a.skill} · lượt {a.attempt_number}</span>
                <Chip tone={a.is_passed ? "green" : "red"}>{a.is_passed ? "✓ Đạt" : "✗ Chưa đạt"}</Chip><span>độ chính xác {a.core_accuracy}</span>
                <span>{new Date(a.created_at).toLocaleString("vi-VN")}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{a.student_answer}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

export default function HistoryPage() { return <Suspense fallback={null}><History /></Suspense>; }
