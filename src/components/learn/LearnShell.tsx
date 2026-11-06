"use client";
// 30 Mục 2.2 (đề xuất D-78) — trang học kiểu IDE: trái Bản đồ bài học, giữa Code (+ bảng dưới), phải 2 tab X-Ray / Feynman.
// Từ `lg`: các khung ẩn/hiện được và kéo đổi tỉ lệ (lưu trong sf.prefs). Dưới `lg` xếp 1 cột dọc, không cuộn ngang.
// Tổng quan kiến trúc là cửa sổ, tự mở 1 lần khi vừa nạp phiên chưa chọn bài.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import { CONFIG } from "@/contracts/config";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/components/ui/common";
import { CockpitHeader } from "./CockpitHeader";
import { CodeSnippetViewer } from "./CodeSnippetViewer";
import { LAYOUT_DEFAULT, useLayout } from "./layout";
import { LearnSidePanel } from "./LearnSidePanel";
import { LessonGraphPanel } from "./LessonGraphPanel";
import { ProblemsPanel } from "./ProblemsPanel";
import { RepoOverviewModal } from "./RepoOverviewModal";
import { Splitter } from "./Splitter";
import { useWorkbench } from "@/store/workbench";

function Workspace() {
  const presentation = useWorkbench((s) => s.ui.presentation);
  const L = useLayout();
  const rowRef = useRef<HTMLElement>(null);
  const midRef = useRef<HTMLDivElement>(null);

  // Trình chiếu: cột code chiếm UI_PRESENTATION_FOCUS_PCT, 2 cột còn lại chia đều phần còn lại (02 CONFIG).
  const side = (100 - CONFIG.UI_PRESENTATION_FOCUS_PCT) / 2;
  const leftW = L.showLeft ? (presentation ? side : L.leftPct) : 0;
  const rightW = L.showRight ? (presentation ? side : L.rightPct) : 0;
  const anim = !L.dragging && "lg:transition-[width,height,opacity] lg:duration-300 lg:ease-[cubic-bezier(.2,.8,.2,1)]";
  const rect = () => rowRef.current?.getBoundingClientRect();

  return (
    <main ref={rowRef} style={{ "--lw": `${leftW}%`, "--rw": `${rightW}%` } as CSSProperties}
      className="flex min-w-0 flex-1 flex-col gap-2 p-2 lg:min-h-0 lg:flex-row lg:gap-0">
      {/* Cột trái */}
      <div aria-hidden={!L.showLeft} className={cn("anim-fade-up min-w-0 lg:h-full lg:shrink-0 lg:overflow-hidden lg:[width:var(--lw)]", anim,
        !L.showLeft && "max-lg:hidden lg:pointer-events-none lg:opacity-0")} style={{ animationDelay: "40ms" }}>
        <div className="h-full lg:min-w-[260px]"><LessonGraphPanel /></div>
      </div>
      {L.showLeft && !presentation && (
        <Splitter orientation="vertical" label="Đổi bề rộng Bản đồ bài học"
          onMove={(x) => { const r = rect(); if (r) L.set({ leftPct: ((x - r.left) / r.width) * 100 }, false); }}
          onStep={(d) => L.set({ leftPct: L.leftPct + d })} onReset={() => L.set({ leftPct: LAYOUT_DEFAULT.leftPct })} />
      )}

      {/* Cột giữa: code + bảng dưới */}
      <div ref={midRef} className="anim-fade-up flex min-w-0 flex-col gap-2 lg:h-full lg:flex-1 lg:gap-0" style={{ animationDelay: "90ms" }}>
        <CodeSnippetViewer />
        {L.showPanel && (
          <Splitter orientation="horizontal" label="Đổi chiều cao bảng dưới"
            onMove={(_, y) => { const r = midRef.current?.getBoundingClientRect(); if (r) L.set({ panelPct: ((r.bottom - y) / r.height) * 100 }, false); }}
            onStep={(d) => L.set({ panelPct: L.panelPct - d })} onReset={() => L.set({ panelPct: LAYOUT_DEFAULT.panelPct })} />
        )}
        <div aria-hidden={!L.showPanel} style={{ "--ph": L.showPanel ? `${L.panelPct}%` : "0%" } as CSSProperties}
          className={cn("min-h-0 shrink-0 overflow-hidden lg:[height:var(--ph)]", anim, L.showPanel ? "h-64" : "hidden lg:block lg:opacity-0")}>
          <div className="h-full lg:min-h-[120px]"><ProblemsPanel /></div>
        </div>
      </div>

      {L.showRight && !presentation && (
        <Splitter orientation="vertical" label="Đổi bề rộng X-Ray / Feynman"
          onMove={(x) => { const r = rect(); if (r) L.set({ rightPct: ((r.right - x) / r.width) * 100 }, false); }}
          onStep={(d) => L.set({ rightPct: L.rightPct - d })} onReset={() => L.set({ rightPct: LAYOUT_DEFAULT.rightPct })} />
      )}
      {/* Cột phải */}
      <div aria-hidden={!L.showRight} className={cn("anim-fade-up min-w-0 lg:h-full lg:shrink-0 lg:overflow-hidden lg:[width:var(--rw)]", anim,
        !L.showRight && "max-lg:hidden lg:pointer-events-none lg:opacity-0")} style={{ animationDelay: "140ms" }}>
        <div className="h-full lg:min-w-[320px]"><LearnSidePanel /></div>
      </div>
    </main>
  );
}

export function LearnShell() {
  const params = useSearchParams();
  const wanted = params.get("session");
  const sessionId = useWorkbench((s) => s.session_id);
  const auth = useWorkbench((s) => s.ui.auth);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const offline = useWorkbench((s) => s.is_offline_mode);
  const activeNode = useWorkbench((s) => s.active_node_id);
  const ingestError = useWorkbench((s) => s.ui.ingest_error);
  const { resumeSession, setUi, signIn, enterOffline } = useWorkbench.getState();
  const tried = useRef<string | null>(null);

  // mở lại phiên theo URL (tải lại trang / liên kết) — mỗi id chỉ thử 1 lần, lỗi thì báo, không gọi lặp
  useEffect(() => {
    if (sessionId || !wanted || auth !== "user" || ingesting || offline || tried.current === wanted) return;
    tried.current = wanted;
    void resumeSession(wanted);
  }, [sessionId, wanted, auth, ingesting, offline, resumeSession]);
  const failed = !!wanted && tried.current === wanted && !ingesting && !sessionId && !!ingestError;

  // chưa chọn bài ⇒ mở Tổng quan (một lần khi vừa nạp phiên)
  useEffect(() => { if (sessionId && !activeNode) setUi({ overview_open: true }); }, [sessionId, activeNode, setUi]);

  // tùy chọn bố cục + phím tắt kiểu VS Code: Ctrl+B (trái), Ctrl+Alt+B (phải), Ctrl+Alt+J (bảng dưới)
  useEffect(() => {
    useLayout.getState().hydrate();
    const h = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.metaKey) return;
      const t = useLayout.getState().toggle;
      if (e.code === "KeyB" && !e.altKey) { e.preventDefault(); t("showLeft"); }
      else if (e.code === "KeyB" && e.altKey) { e.preventDefault(); t("showRight"); }
      else if (e.code === "KeyJ" && e.altKey) { e.preventDefault(); t("showPanel"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <Navbar />
      {sessionId ? (
        <>
          <CockpitHeader />
          <Workspace />
          <RepoOverviewModal />
        </>
      ) : (
        <main className="anim-fade-up mx-auto max-w-xl px-6 py-24 text-center text-muted">
          {auth === "anon" && !offline && !ingesting ? (
            <>
              <p>Đăng nhập để mở phiên học, hoặc dùng bản demo Offline.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button type="button" onClick={() => void signIn()} className="btn-primary rounded-lg px-4 py-2 font-semibold">Đăng nhập GitHub</button>
                <button type="button" onClick={() => void enterOffline()} className="rounded-lg border border-line px-4 py-2 text-text transition-colors hover:bg-white/5">Mở bản demo Offline</button>
              </div>
            </>
          ) : failed ? (
            <>
              <p className="text-red">⚠ {ingestError?.message}</p>
              <Link href="/" className="btn-primary mt-4 inline-block rounded-lg px-4 py-2 font-semibold">Về trang chủ</Link>
            </>
          ) : ingesting || (wanted && auth !== "anon") || auth === "loading" ? (
            <p className="flex items-center justify-center gap-2"><span className="spinner inline-block h-4 w-4 rounded-full border-2 border-amber border-t-transparent" />Đang mở phiên học…</p>
          ) : (
            <>
              <p>Chưa có phiên học nào đang mở.</p>
              <Link href="/" className="btn-primary mt-4 inline-block rounded-lg px-4 py-2 font-semibold">Về trang chủ</Link>
            </>
          )}
        </main>
      )}
    </div>
  );
}
