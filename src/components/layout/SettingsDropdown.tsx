"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  User,
  Sparkles,
  HelpCircle,
  LogOut,
  ChevronRight,
  Loader2,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/supabase/client";
import { useUserStore } from "@/stores/userStore";
import { PERSONAS, type PersonaMode } from "@/contracts/learner";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function SettingsDropdown({
  isOpen,
  onClose,
  className,
}: SettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [targetPersona, setTargetPersona] = useState<PersonaMode | null>(null);

  const {
    user,
    profile,
    currentPersona,
    tokensUsed,
    tokenQuota,
    isSwitchingPersona,
    isDeletingAccount,
    isDemoModeDisabled,
    changePersona,
    resetAccount,
  } = useUserStore();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Đảm bảo không đóng dropdown nếu click vào trong Dialog modal
      if (isConfirmDeleteOpen) return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isConfirmDeleteOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, isConfirmDeleteOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    } finally {
      setIsLoggingOut(false);
      onClose();
      router.push("/login");
      router.refresh();
    }
  };

  const handleSwitchPersona = async (mode: PersonaMode) => {
    if (isSwitchingPersona || currentPersona === mode) return;
    setTargetPersona(mode);
    try {
      await changePersona(mode);
    } finally {
      setTargetPersona(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const ok = await resetAccount();
      if (ok) {
        setIsConfirmDeleteOpen(false);
        onClose();
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Lỗi khi xóa tài khoản:", err);
    }
  };

  if (!isOpen && !isConfirmDeleteOpen) return null;

  const personaModes: PersonaMode[] = ["NEWBIE", "MID_LEVEL", "SENIOR_RUSTY"];

  return (
    <>
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-label="Cài đặt hệ thống"
          className={cn(
            "absolute right-0 top-full mt-2 w-[310px] z-50 rounded-[16px] border border-[#f3f4f6] bg-white p-[8.8px] drop-shadow-[0px_16px_20px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-150 select-none max-h-[85vh] overflow-y-auto",
            className
          )}
        >
          {/* Header với Profile & Token Quota */}
          <div className="border-b-[0.8px] border-[#f3f4f6] px-3 pb-[8.8px] pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#131b2e] leading-snug">
                Cài đặt SimpliFey
              </h4>
              {profile?.overall_tier && (
                <Badge
                  variant={
                    profile.overall_tier === "ARCHITECT"
                      ? "bkt"
                      : profile.overall_tier === "PRACTITIONER"
                      ? "info"
                      : "brand"
                  }
                  size="sm"
                >
                  {profile.overall_tier === "ARCHITECT"
                    ? "Kiến trúc sư"
                    : profile.overall_tier === "PRACTITIONER"
                    ? "Thực hành"
                    : "Tập sự"}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[#625e56] leading-tight mt-0.5">
              {user?.name ? `Tài khoản: ${user.name}` : "Tùy chỉnh cá nhân và học tập"}
            </p>

            {/* Token Quota Progress bar */}
            <div className="mt-2 pt-1 border-t border-[#f3f4f6]/80 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] text-[#625e56]">
                <span>Hạn mức Token AI:</span>
                <span className="font-semibold text-[#131b2e]">
                  {tokensUsed.toLocaleString("vi-VN")} / {tokenQuota.toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#f3f4f6] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    tokensUsed >= tokenQuota
                      ? "bg-[#e7000b]"
                      : tokensUsed >= tokenQuota * 0.8
                      ? "bg-[#f59e0b]"
                      : "bg-[#ff9640]"
                  )}
                  style={{
                    width: `${Math.min(100, Math.round((tokensUsed / tokenQuota) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="flex flex-col gap-[2px] py-1">
            <Link
              href="/roadmap"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="size-4 text-[#554337] group-hover:text-[#ff9640] transition-colors" />
                <span className="text-[14px] font-semibold">Lộ trình của tôi</span>
              </div>
              <ChevronRight className="size-3.5 text-[#99a1af]" />
            </Link>

            <Link
              href="/report"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <User className="size-4 text-[#554337] group-hover:text-[#ff9640] transition-colors" />
                <span className="text-[14px] font-semibold">Hồ sơ năng lực (BKT)</span>
              </div>
              <ChevronRight className="size-3.5 text-[#99a1af]" />
            </Link>

            <Link
              href="/learn"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-[#ff9640]" />
                <span className="text-[14px] font-semibold">Buồng lái Feynman</span>
              </div>
              <span className="bg-[#ffedd4] text-[#944b00] rounded-full px-2 py-0.5 text-[11px] font-bold">
                BKT-v2
              </span>
            </Link>

            <Link
              href="/how-it-works"
              onClick={onClose}
              className="flex items-center px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="size-4 text-[#554337] group-hover:text-[#ff9640] transition-colors" />
                <span className="text-[14px] font-semibold">Trợ giúp & Hướng dẫn</span>
              </div>
            </Link>
          </div>

          {/* Bước 2: Chuyển đổi Persona Demo (D-09) */}
          {!isDemoModeDisabled && (
            <div className="border-t-[0.8px] border-[#f3f4f6] px-2 py-2">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[11px] font-bold text-[#625e56] uppercase tracking-wider">
                  Hồ sơ Demo (D-09)
                </span>
                <span className="text-[10px] text-[#99a1af]">Tự động đổi điểm</span>
              </div>
              <div className="flex flex-col gap-1">
                {personaModes.map((mode) => {
                  const info = PERSONAS[mode];
                  const isActive = currentPersona === mode;
                  const isCurrentTarget = isSwitchingPersona && targetPersona === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={isSwitchingPersona}
                      onClick={() => handleSwitchPersona(mode)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-left transition-all text-[12px]",
                        isActive
                          ? "bg-[#fff0e4] text-[#944b00] font-bold border border-[#ff9640]/40"
                          : "hover:bg-[#f3f4f6] text-[#131b2e] font-medium border border-transparent",
                        isSwitchingPersona && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrentTarget ? (
                          <Loader2 className="size-3.5 animate-spin text-[#ff9640]" />
                        ) : isActive ? (
                          <Check className="size-3.5 text-[#ff9640]" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-[#d1d5db]" />
                        )}
                        <span>{info.label}</span>
                      </div>
                      <span className="text-[10px] text-[#99a1af] font-mono">
                        P={info.initial_p_mastery}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bước 3: Xóa tài khoản & Làm lại từ đầu (DELETE /api/me) */}
          <div className="border-t-[0.8px] border-[#f3f4f6] pt-1">
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              disabled={isDeletingAccount}
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-[12px] hover:bg-[#fef2f2] text-[#e7000b] transition-colors disabled:opacity-50 cursor-pointer text-left"
            >
              <Trash2 className="size-4 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold">
                  Xóa tài khoản & làm lại
                </span>
                <span className="text-[10px] text-[#e7000b]/80">
                  Reset toàn bộ điểm BKT & phiên học
                </span>
              </div>
            </button>
          </div>

          {/* Footer / Logout */}
          <div className="border-t-[0.8px] border-[#f3f4f6] pt-[6.8px] mt-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-[12px] hover:bg-[#f3f4f6] text-[#554337] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin text-[#ff9640]" />
              ) : (
                <LogOut className="size-4" />
              )}
              <span className="text-[14px] font-semibold">
                {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog cho DELETE /api/me */}
      <Dialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          if (!isDeletingAccount) setIsConfirmDeleteOpen(false);
        }}
        title={
          <div className="flex items-center gap-2.5 text-[#e7000b]">
            <AlertTriangle className="size-5" />
            <span>Xác nhận xóa tài khoản & làm lại từ đầu</span>
          </div>
        }
        description="Toàn bộ lịch sử học tập, phiên quét repository và điểm số 16 kỹ năng BKT sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác."
      >
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-[10px] bg-[#fef2f2] p-3 text-xs text-[#911b1b] border border-[#fecaca]">
            <p className="font-semibold">⚠️ Cảnh báo bất biến:</p>
            <p className="mt-1">
              Sau khi xác nhận, phiên đăng nhập hiện tại sẽ bị hủy và bạn sẽ được chuyển hướng về trang chủ ở trạng thái khách.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={isDeletingAccount}
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              isLoading={isDeletingAccount}
              onClick={handleDeleteAccount}
              leftIcon={<Trash2 className="size-4" />}
            >
              {isDeletingAccount ? "Đang xóa dữ liệu..." : "Xác nhận xóa vĩnh viễn"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
