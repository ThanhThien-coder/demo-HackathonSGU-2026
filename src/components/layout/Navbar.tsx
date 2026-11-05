"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Modal, cn } from "@/components/ui/common";
import { PERSONA_LIST, useWorkbench } from "@/store/workbench";

export function Navbar() {
  const offline = useWorkbench((s) => s.is_offline_mode);
  const sessionId = useWorkbench((s) => s.session_id);
  const user = useWorkbench((s) => s.ui.user);
  const auth = useWorkbench((s) => s.ui.auth);
  const profile = useWorkbench((s) => s.profile);
  const persona = useWorkbench((s) => s.ui.offline_persona);
  const { logout, deleteAccount, changePersona, enterOffline, leaveOffline } = useWorkbench.getState();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || offline;
  const qs = sessionId && !offline ? `?session=${sessionId}` : "";
  const link = "rounded-md px-3 py-1.5 text-sm text-muted hover:bg-white/5 hover:text-text";

  return (
    <>
      {offline && (
        <div role="status" className="border-b border-amber/40 bg-amber/10 px-4 py-1.5 text-center text-xs font-semibold text-amber">
          Chế độ Offline — dữ liệu ghi lại, không lưu tiến độ
        </div>
      )}
      <nav aria-label="Menu chính" className="flex items-center justify-between gap-4 border-b border-line bg-panel-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="mr-2 text-lg font-extrabold tracking-tight"><span className="text-amber">Simpli</span>Fey</Link>
          <Link href="/" className={link}>Trang chủ</Link>
          {sessionId && <Link href={`/learn${qs}`} className={link}>Trang học</Link>}
          <Link href="/roadmap" className={link}>Lộ trình</Link>
          {sessionId && !offline && <Link href={`/history${qs}`} className={link}>Lịch sử</Link>}
          <Link href="/how-it-works" className={link}>Cách học</Link>
        </div>
        <div className="relative flex items-center gap-2">
          {profile && <span className="hidden text-xs text-muted sm:inline">Bậc: {profile.overall_tier}</span>}
          {(auth === "user" || offline) && (
            <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-sm hover:bg-white/5">
              {user?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt="" className="h-6 w-6 rounded-full" />
                : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber text-xs font-bold text-bg">{(user?.name ?? "O").slice(0, 1).toUpperCase()}</span>}
              <span className="max-w-32 truncate">{offline ? "Offline" : user?.name ?? profile?.display_name ?? "Tài khoản"}</span>
            </button>
          )}
          {open && (
            <div role="menu" className="glass absolute right-0 top-11 z-40 w-72 rounded-xl border border-line p-2 text-sm shadow-xl">
              {demo && (
                <div className="mb-2 border-b border-line pb-2">
                  <p className="px-2 pb-1 text-xs uppercase tracking-wide text-muted">Persona (demo)</p>
                  {PERSONA_LIST.map(([m, p]) => (
                    <button key={m} role="menuitemradio" aria-checked={offline && persona === m} type="button"
                      onClick={() => { void changePersona(m); setOpen(false); }}
                      className={cn("block w-full rounded-md px-2 py-1.5 text-left hover:bg-white/5", offline && persona === m && "text-amber")}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <button role="menuitem" type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-white/5"
                onClick={() => { setOpen(false); if (offline) void leaveOffline(); else void enterOffline(); }}>
                {offline ? "Tắt chế độ Offline" : "Mở demo Offline (Ctrl+Shift+D)"}
              </button>
              {!offline && (
                <>
                  <button role="menuitem" type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-white/5" onClick={() => { setOpen(false); void logout(); }}>Đăng xuất</button>
                  <button role="menuitem" type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-red hover:bg-red/10" onClick={() => { setOpen(false); setConfirmDelete(true); }}>Xóa tài khoản và dữ liệu</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Xóa tài khoản và dữ liệu"
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Hủy</Button><Button variant="danger" onClick={() => { setConfirmDelete(false); void deleteAccount(); }}>Xóa vĩnh viễn</Button></>}>
        <p className="text-sm text-muted">Xóa toàn bộ điểm kỹ năng, phiên học, câu trả lời. Không hoàn tác.</p>
      </Modal>
    </>
  );
}
