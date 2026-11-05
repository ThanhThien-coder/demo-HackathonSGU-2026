"use client";
// 30 Mục 2.1 — trang chủ: nhập link, thả .zip, tiếp tục học, màn hình đăng nhập GitHub.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CONFIG } from "@/contracts/config";
import { Button, cn } from "@/components/ui/common";
import { Navbar } from "@/components/layout/Navbar";
import { SessionList } from "./SessionList";
import { ERROR_MESSAGES } from "@/lib/messages";
import { useWorkbench } from "@/store/workbench";

export function LoginScreen() {
  const signIn = useWorkbench((s) => s.signIn);
  const enterOffline = useWorkbench((s) => s.enterOffline);
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight"><span className="text-amber">Simpli</span>Fey</h1>
      <p className="text-muted">Dán link repo GitHub, nhận bản đồ lát cắt nghiệp vụ xuyên file và học kiến trúc bằng câu hỏi Feynman.</p>
      <Button className="px-6 py-3 text-base" onClick={() => void signIn()}>Đăng nhập GitHub</Button>
      <button type="button" onClick={() => void enterOffline()} className="text-sm text-muted underline hover:text-text">Mở bản demo Offline (không cần đăng nhập)</button>
    </main>
  );
}

const MB = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;

export function Home() {
  const auth = useWorkbench((s) => s.ui.auth);
  const ingesting = useWorkbench((s) => s.ui.ingesting);
  const err = useWorkbench((s) => s.ui.ingest_error);
  const bootErr = useWorkbench((s) => s.ui.boot_error);
  const { scanUrl, scanZip, enterOffline, init } = useWorkbench.getState();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const trimmedLink = /github\.com\/[^/]+\/[^/]+\/(tree|blob)\//i.test(url);

  const go = async (fn: () => Promise<void>) => {
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
            <Button variant="ghost" onClick={() => void enterOffline()}>Mở bản demo Offline</Button>
          </div>
        </main></>
    );
  }

  const message = localErr ?? err?.message ?? null;
  const invalidUrl = err?.code === "ERR_INVALID_GITHUB_URL";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Biến repo thành <span className="text-amber">bản đồ học tập</span></h1>
        <p className="mt-2 text-muted">Mỗi node là một lát cắt nghiệp vụ xuyên file. Bản đồ dựng bằng code thuần, 0 token; AI chỉ phân tích và đặt câu hỏi sau đó.</p>

        <form className="mt-8 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (url.trim()) { setLocalErr(null); void go(() => scanUrl(url)); } }}>
          <input aria-label="Link repo GitHub" aria-invalid={invalidUrl} value={url} onChange={(e) => setUrl(e.target.value)} disabled={ingesting}
            placeholder="https://github.com/owner/repo"
            className={cn("min-w-0 flex-1 rounded-lg border bg-panel px-4 py-2.5 font-mono text-sm outline-none focus:border-amber", invalidUrl ? "border-red" : "border-line")} />
          <Button type="submit" disabled={ingesting || !url.trim()} className="px-5">{ingesting ? "Đang quét…" : "Quét repo"}</Button>
        </form>
        <p className={cn("mt-2 text-xs", trimmedLink ? "text-amber" : "text-muted")}>Chỉ hỗ trợ nhánh mặc định{trimmedLink && " — link /tree/… hoặc /blob/… sẽ được cắt về gốc repo"}.</p>

        <div role="button" tabIndex={0} aria-label="Thả file .zip vào đây hoặc bấm để chọn"
          onClick={() => !ingesting && fileRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (!ingesting) onZip(e.dataTransfer.files[0]); }}
          className={cn("mt-4 cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm text-muted transition-colors", drag ? "border-amber bg-amber/5" : "border-line hover:border-muted")}>
          Hoặc kéo thả file <b>.zip</b> (≤ {MB(CONFIG.MAX_UPLOAD_BYTES)} MB) vào đây
          <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { onZip(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        <div aria-live="polite" className="min-h-6">{message && <p className="mt-3 text-sm text-red">⚠ {message}</p>}</div>

        {ingesting && (
          <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-panel p-4 text-sm">
            <span className="spinner inline-block h-5 w-5 rounded-full border-2 border-amber border-t-transparent" />
            Đang tải và dựng bản đồ…
          </div>
        )}

        <SessionList />
        <p className="mt-10 text-xs text-muted">Mọi con số độ trễ / token hiển thị trên giao diện là số đo thật của lần chạy; chưa có số đo nào được hứa trước.</p>
      </main>
    </>
  );
}
