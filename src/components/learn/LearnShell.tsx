"use client";
// 30 Mục 2.2 — trang học: Navbar, CockpitHeader; cột trái code + X-Ray, cột phải Feynman; đồ thị trong ngăn kéo; Tổng quan trong cửa sổ.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CONFIG } from "@/contracts/config";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/components/ui/common";
import { CockpitHeader } from "./CockpitHeader";
import { CodeSnippetViewer } from "./CodeSnippetViewer";
import { FeynmanQuestionSection } from "./FeynmanQuestionSection";
import { LessonGraphDrawer } from "./LessonGraphDrawer";
import { RepoOverviewModal } from "./RepoOverviewModal";
import { useWorkbench } from "@/store/workbench";

export function LearnShell() {
  const params = useSearchParams();
  const wanted = params.get("session");
  const sessionId = useWorkbench((s) => s.session_id);
  const auth = useWorkbench((s) => s.ui.auth);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const presentation = useWorkbench((s) => s.ui.presentation);
  const offline = useWorkbench((s) => s.is_offline_mode);
  const activeNode = useWorkbench((s) => s.active_node_id);
  const { resumeSession, setUi } = useWorkbench.getState();

  // mở lại phiên theo URL (tải lại trang / liên kết)
  useEffect(() => {
    if (!sessionId && wanted && auth === "user" && !ingesting && !offline) void resumeSession(wanted);
  }, [sessionId, wanted, auth, ingesting, offline, resumeSession]);

  // chưa chọn bài ⇒ mở Tổng quan (một lần khi vừa nạp phiên)
  useEffect(() => { if (sessionId && !activeNode) setUi({ overview_open: true }); }, [sessionId, activeNode, setUi]);

  const pct = CONFIG.UI_PRESENTATION_FOCUS_PCT;
  return (
    <>
      <Navbar />
      {sessionId ? (
        <>
          <CockpitHeader />
          <main className={cn("grid gap-4 p-4", !presentation && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}
            style={presentation ? { gridTemplateColumns: `${pct}% ${100 - pct}%` } : undefined}>
            <div className="min-w-0"><CodeSnippetViewer /></div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel"><FeynmanQuestionSection /></div>
          </main>
          <LessonGraphDrawer />
          <RepoOverviewModal />
        </>
      ) : (
        <main className="mx-auto max-w-xl px-6 py-24 text-center text-muted">
          {ingesting || (wanted && auth === "user") ? <p>Đang mở phiên học…</p> : (
            <>
              <p>Chưa có phiên học nào đang mở.</p>
              <Link href="/" className="mt-4 inline-block rounded-lg bg-amber px-4 py-2 font-semibold text-bg">Về trang chủ</Link>
            </>
          )}
        </main>
      )}
    </>
  );
}
