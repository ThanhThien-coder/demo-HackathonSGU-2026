"use client";
// 30 Mục 2.1 — trang chủ: nhập link, thả .zip, tiếp tục học, màn hình đăng nhập GitHub.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, FolderArchive, Link2, WifiOff, Workflow } from "lucide-react";
import { CONFIG } from "@/contracts/config";
import { Button, Kbd, LogoMark, cn } from "@/components/ui/common";
import { Navbar } from "@/components/layout/Navbar";
import { HeroArt } from "./HeroArt";
import { SessionList } from "./SessionList";
import { ERROR_MESSAGES } from "@/lib/messages";
import { useWorkbench } from "@/store/workbench";

/** Bật Offline rồi vào thẳng trang học (30 Mục 8). */
function useOpenOffline() {
  const router = useRouter();
  // Chuyển trang trước: thẻ gọi hàm này có thể bị gỡ khỏi cây khi trạng thái đăng nhập đổi.
  return async () => {
    router.push("/learn");
    await useWorkbench.getState().enterOffline();
    if (!useWorkbench.getState().session_id) router.push("/");
  };
}

/** Thẻ mở bản demo Offline (30 Mục 8: nút + phím tắt Ctrl+Shift+D). */
function OfflineCard() {
  const router = useRouter();
  const openOffline = useOpenOffline();
  const offline = useWorkbench((s) => s.is_offline_mode);
  const hasSession = useWorkbench((s) => !!s.session_id);
  const leaveOffline = useWorkbench((s) => s.leaveOffline);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-line bg-panel-2/60 px-4 py-3">
      <WifiOff aria-hidden className="h-5 w-5 shrink-0 text-violet" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{offline ? "Đang ở chế độ Offline" : "Bản demo Offline"}</p>
        <p className="text-muted">Dữ liệu ghi lại sẵn, không gọi API, không lưu tiến độ.</p>
      </div>
      {offline ? (
        <div className="flex gap-2">
          {hasSession ? <Button onClick={() => router.push("/learn")}>Vào trang học</Button> : <Button onClick={() => void openOffline()}>Mở lại bản demo</Button>}
          <Button variant="ghost" onClick={() => void leaveOffline()}>Tắt Offline</Button>
        </div>
      ) : <Button variant="ghost" onClick={() => void openOffline()}>Mở bản demo Offline</Button>}
      <p className="flex w-full items-center gap-1 text-xs text-muted">Phím tắt: <Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>D</Kbd></p>
    </div>
  );
}

function Hero({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="stagger">
        <LogoMark className="h-11 w-11 rounded-xl" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {children}
      </div>
      <div className="sf-dotgrid hidden rounded-2xl border border-line bg-panel/50 p-3 shadow-[var(--shadow)] lg:block"><HeroArt className="anim-float w-full" /></div>
    </div>
  );
}

export function LoginScreen() {
  const signIn = useWorkbench((s) => s.signIn);
  return (
    <main className="stagger mx-auto flex max-w-4xl flex-col px-6 py-16">
      <Hero title={<><span className="text-shine">Simpli</span>Fey</>}>
        <p className="mt-3 text-muted">Dán link repo GitHub, nhận bản đồ lát cắt nghiệp vụ xuyên file và học kiến trúc bằng câu hỏi Feynman.</p>
      </Hero>
      <div className="mt-8"><Button className="px-6 py-3 text-base" onClick={() => void signIn()}>Đăng nhập GitHub</Button></div>
      <OfflineCard />
    </main>
  );
}

const MB = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;

/** 30 Mục 2.1 — đang quét: lớp phủ vòng quét + đồng hồ thật. */
function IngestOverlay() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setMs(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
      <div className="glass flex flex-col items-center gap-4 rounded-2xl border border-line px-10 py-8 shadow-2xl">
        <span className="spinner inline-block h-12 w-12 rounded-full border-4 border-accent/25 border-t-accent" />
        <p className="font-semibold">Đang tải và dựng bản đồ…</p>
        <p className="text-shine font-mono text-2xl font-bold">{(ms / 1000).toFixed(1)} s</p>
        <p className="max-w-xs text-center text-xs text-muted">Tải mã nguồn, lọc file, dựng đồ thị lát cắt bằng code thuần — chưa gọi AI ở bước này.</p>
      </div>
    </div>
  );
}

/** Lỗi ingest nên mở vùng thả .zip (30 Mục 10). */
const OPEN_DROPZONE = new Set(["ERR_PREFLIGHT_404_OR_PRIVATE", "ERR_GITHUB_RATE_LIMIT_CDN", "ERR_STREAM_QUOTA_EXCEEDED", "ERR_UPLOAD_INVALID"]);

export function Home() {
  const auth = useWorkbench((s) => s.ui.auth);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const err = useWorkbench((s) => s.ui.ingest_error);
  const bootErr = useWorkbench((s) => s.ui.boot_error);
  const { scanUrl, scanZip, init } = useWorkbench.getState();
  const openOffline = useOpenOffline();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastScan = useRef<(() => Promise<void>) | null>(null);
  const curId = useWorkbench((s) => (s.is_offline_mode ? null : s.session_id));
  const curName = useWorkbench((s) => s.result?.repo_name ?? null);
  const current = curId && curName ? { id: curId, name: curName } : null;
  const trimmedLink = /github\.com\/[^/]+\/[^/]+\/(tree|blob)\//i.test(url);

  const go = async (fn: () => Promise<void>) => {
    lastScan.current = fn;
    await fn();
    const s = useWorkbench.getState();
    if (s.session_id && !s.ui.ingest_error) router.push(`/learn?session=${s.session_id}`);
  };

  const onZip = (f: File | undefined) => {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) { setLocalErr(ERROR_MESSAGES.ERR_UPLOAD_INVALID); return; }
    if (f.size > CONFIG.MAX_UPLOAD_BYTES) {
      setLocalErr(`File .zip vượt ${MB(CONFIG.MAX_UPLOAD_BYTES)} MB — giới hạn tải lên của máy chủ. Hãy nén riêng thư mục mã nguồn chính, hoặc dán link GitHub (không bị giới hạn này).`);
      return;
    }
    setLocalErr(null);
    void go(() => scanZip(f));
  };

  if (auth === "loading") return <><Navbar /><main className="p-24 text-center text-muted">Đang khởi động…</main></>;
  if (auth === "anon") return <><Navbar /><LoginScreen /></>;
  if (bootErr) {
    return (
      <><Navbar />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <p className="mb-4 text-red">⚠ {bootErr.message || "Không kết nối được máy chủ"}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => void init()}>Thử lại</Button>
            <Button variant="ghost" onClick={() => void openOffline()}>Mở bản demo Offline</Button>
          </div>
        </main></>
    );
  }

  const message = localErr ?? err?.message ?? null;
  const invalidUrl = err?.code === "ERR_INVALID_GITHUB_URL";
  const dropHint = !localErr && !!err && OPEN_DROPZONE.has(err.code);

  return (
    <>
      <Navbar />
      <main className="stagger mx-auto max-w-4xl px-6 py-14">
        <Hero title={<>Biến repo thành <span className="text-shine whitespace-nowrap">bản đồ học tập</span></>}>
          <p className="mt-3 text-muted">Mỗi node là một lát cắt nghiệp vụ xuyên file. Bản đồ dựng bằng code thuần, 0 token; AI chỉ phân tích và đặt câu hỏi sau đó.</p>
        </Hero>

        <form className="mt-8 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (url.trim()) { setLocalErr(null); void go(() => scanUrl(url)); } }}>
          <label className={cn("sf-field flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-panel px-3",
            invalidUrl ? "border-red" : "border-line")}>
            <Link2 aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <input aria-label="Link repo GitHub" aria-invalid={invalidUrl} value={url} onChange={(e) => setUrl(e.target.value)} disabled={ingesting}
              placeholder="https://github.com/owner/repo"
              className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-sm outline-none placeholder:text-muted/70 focus-visible:outline-none" />
          </label>
          <Button type="submit" disabled={ingesting || !url.trim()} className="flex items-center justify-center gap-1.5 px-5 py-2.5">
            <Workflow aria-hidden className="h-4 w-4" />{ingesting ? "Đang quét…" : "Quét repo"}
          </Button>
        </form>
        <p className={cn("mt-2 text-xs", trimmedLink ? "text-amber" : "text-muted")}>Chỉ hỗ trợ nhánh mặc định{trimmedLink && " — link /tree/… hoặc /blob/… sẽ được cắt về gốc repo"}.</p>

        <div role="button" tabIndex={0} aria-label="Thả file .zip vào đây hoặc bấm để chọn" aria-disabled={ingesting}
          onClick={() => !ingesting && fileRef.current?.click()} onKeyDown={(e) => { if (!ingesting && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (!ingesting) onZip(e.dataTransfer.files[0]); }}
          className={cn("mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm text-muted transition-colors",
            drag || dropHint ? "border-accent bg-accent/5" : "border-line hover:border-muted", ingesting && "cursor-not-allowed opacity-60")}>
          <FolderArchive aria-hidden className="h-4 w-4 shrink-0" />
          <span>Hoặc kéo thả file <b className="text-text">.zip</b> (≤ {MB(CONFIG.MAX_UPLOAD_BYTES)} MB) vào đây</span>
          <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { onZip(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        <div aria-live="polite" className="min-h-6">
          {message && (
            <div className="mt-3 flex flex-wrap items-start gap-3 rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-sm text-red">
              <p className="min-w-0 flex-1">⚠ {message}</p>
              {!localErr && err?.retryable && lastScan.current && <Button variant="ghost" onClick={() => void go(lastScan.current!)}>Thử lại</Button>}
            </div>
          )}
        </div>

        {ingesting && <IngestOverlay />}

        {current && !ingesting && (
          <button type="button" onClick={() => router.push(`/learn?session=${current.id}`)}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl sf-gradient-border px-4 py-3 text-left text-sm transition-transform hover:-translate-y-px">
            <span>Đang mở phiên <b className="font-mono">{current.name}</b></span>
            <span className="inline-flex items-center gap-1 font-semibold text-violet">Vào trang học<ArrowRight aria-hidden className="h-4 w-4" /></span>
          </button>
        )}

        {!ingesting && <OfflineCard />}

        <SessionList />
        <p className="mt-10 border-t border-line pt-4 text-xs text-muted">Mọi con số độ trễ / token hiển thị trên giao diện là số đo thật của lần chạy; chưa có số đo nào được hứa trước.</p>
      </main>
    </>
  );
}
