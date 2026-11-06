"use client";
// 30 Mục 2.3, 3, 8, 9 — thanh trên: menu trang, nhãn Offline (UI-60), persona, tài khoản.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import type { PersonaMode } from "@/contracts";
import { Button, LogoMark, Modal, cn } from "@/components/ui/common";
import { offlineBundle } from "@/lib/offline";
import { useTheme } from "@/components/ui/theme";
import { PERSONA_LIST, useWorkbench } from "@/store/workbench";

function PersonaSelect() {
  const offline = useWorkbench((s) => s.is_offline_mode);
  const persona = useWorkbench((s) => s.ui.offline_persona);
  const changePersona = useWorkbench((s) => s.changePersona);
  // Online: server không trả persona đang dùng ⇒ chỉ nhớ lựa chọn vừa bấm trong phiên trình duyệt này.
  const [picked, setPicked] = useState<PersonaMode | "">("");
  const value = offline ? persona : picked;
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="hidden md:inline">Persona</span>
      <select aria-label="Persona (demo)" value={value}
        onChange={(e) => { const m = e.target.value as PersonaMode; if (!m) return; setPicked(m); void changePersona(m); }}
        className="h-7 max-w-44 rounded-md border border-line-strong bg-panel px-2 text-xs text-text-2 outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)]">
        {!offline && <option value="">— chọn —</option>}
        {PERSONA_LIST.map(([m, p]) => <option key={m} value={m}>{p.label}</option>)}
      </select>
    </label>
  );
}

function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const dark = theme === "dark";
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={dark ? "Giao diện sáng" : "Giao diện tối"}
      className="relative inline-flex h-8 w-8 items-center justify-center btn-secondary overflow-hidden rounded-md">
      <Sun aria-hidden className={cn("absolute h-4 w-4 text-amber transition-all duration-500", dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
      <Moon aria-hidden className={cn("absolute h-4 w-4 transition-all duration-500", dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
    </button>
  );
}

export function Navbar() {
  const offline = useWorkbench((s) => s.is_offline_mode);
  const sessionId = useWorkbench((s) => s.session_id);
  const user = useWorkbench((s) => s.ui.user);
  const auth = useWorkbench((s) => s.ui.auth);
  const profile = useWorkbench((s) => s.profile);
  const { logout, deleteAccount, enterOffline, leaveOffline } = useWorkbench.getState();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || offline;
  const qs = sessionId && !offline ? `?session=${sessionId}` : "";
  const rec = offline ? offlineBundle()?.recorded_from : null;
  const pages: Array<[string, string, boolean]> = [
    ["/", "Trang chủ", true],
    [`/learn${qs}`, "Trang học", !!sessionId],
    ["/roadmap", "Lộ trình", true],
    [`/history${qs}`, "Lịch sử", !!sessionId && !offline],
    ["/how-it-works", "Cách học", true],
  ];

  return (
    <>
      <nav aria-label="Menu chính" className="relative z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-line bg-[var(--nav-bg)] px-3 py-1.5 backdrop-blur-md">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Link href="/" className="group mr-2 flex items-center gap-2">
            <LogoMark className="h-7 w-7 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105" />
            <span className="text-base font-extrabold tracking-tight"><span className="text-shine">Simpli</span>Fey</span>
          </Link>
          {pages.filter(([, , show]) => show).map(([href, label]) => {
            const active = pathname === href.split("?")[0];
            return (
              <Link key={label} href={href} aria-current={active ? "page" : undefined}
                className={cn("rounded-md px-2.5 py-1 text-xs transition-colors", active ? "bg-[var(--nav-active-bg)] font-semibold text-[var(--nav-active-fg)]" : "text-muted hover:bg-[var(--hover-surface)] hover:text-text")}>{label}</Link>
            );
          })}
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          {offline && (
            <span role="status" title={rec ? `Ghi lại từ ${rec.repo} @ ${rec.snapshot_id.slice(0, 7)} · ${rec.model} · ${new Date(rec.recorded_at).toLocaleString("vi-VN")}` : undefined}
              className="rounded-md border border-amber/50 bg-amber/10 px-2 py-1 text-xs font-semibold text-amber">
              Chế độ Offline — dữ liệu ghi lại, không lưu tiến độ
            </span>
          )}
          {demo && (auth === "user" || offline) && <PersonaSelect />}
          <ThemeToggle />
          {(auth === "user" || offline) && (
            <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
              className="btn-secondary flex h-8 items-center gap-2 rounded-md px-2 text-xs">
              {user?.avatar && !offline
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt="" className="h-5 w-5 rounded-full" />
                : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-[10px] font-bold text-on-accent">{(offline ? "O" : user?.name ?? "T").slice(0, 1).toUpperCase()}</span>}
              <span className="max-w-28 truncate font-semibold">{offline ? "Offline" : user?.name ?? profile?.display_name ?? "Tài khoản"}</span>
              {profile && <span className="rounded border border-accent/50 px-1 font-mono text-[10px] text-violet" title="Bậc tổng">{profile.overall_tier}</span>}
              <ChevronDown aria-hidden className="h-3.5 w-3.5 text-muted" />
            </button>
          )}
          {open && (
            <div role="menu" className="anim-pop glass absolute right-0 top-10 z-40 w-64 rounded-xl border border-line p-1.5 text-sm">
              <button role="menuitem" type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-text-2 hover:bg-panel-2 hover:text-text"
                onClick={() => { setOpen(false); if (offline) void leaveOffline(); else void enterOffline(); }}>
                {offline ? "Tắt chế độ Offline" : "Mở demo Offline (Ctrl+Shift+D)"}
              </button>
              {!offline && (
                <>
                  <button role="menuitem" type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-text-2 hover:bg-panel-2 hover:text-text" onClick={() => { setOpen(false); void logout(); }}>Đăng xuất</button>
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
