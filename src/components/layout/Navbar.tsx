"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { SettingsDropdown } from "./SettingsDropdown";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/stores/userStore";

export interface NavbarProps {
  user?: {
    name: string;
    avatarUrl?: string;
  } | null;
  className?: string;
}

export function Navbar({ user: propUser, className }: NavbarProps) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lấy state từ User Store (quản lý tập trung hồ sơ BKT và thông báo)
  const {
    user: storeUser,
    profile,
    isLoading,
    toast,
    hideToast,
    fetchProfile,
    setUser,
  } = useUserStore();

  useEffect(() => {
    // 1. Tự động đồng bộ phiên Supabase Auth và thông tin người dùng
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        const u = data?.session?.user;
        if (u) {
          const name =
            u.user_metadata?.user_name ||
            u.user_metadata?.preferred_username ||
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "User";
          const avatarUrl = u.user_metadata?.avatar_url;
          setUser({ name, avatarUrl, email: u.email });
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user;
        if (u) {
          const name =
            u.user_metadata?.user_name ||
            u.user_metadata?.preferred_username ||
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "User";
          const avatarUrl = u.user_metadata?.avatar_url;
          setUser({ name, avatarUrl, email: u.email });
        } else if (process.env.NEXT_PUBLIC_BYPASS_AUTH !== "true") {
          setUser(null);
        }
      });

      // 2. Tự động gọi Bước 1: GET /api/me để nạp hồ sơ BKT & tier
      fetchProfile();

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Bỏ qua lỗi kết nối trong môi trường SSR/test
      if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        fetchProfile();
      }
    }
  }, [fetchProfile, setUser]);

  // Ưu tiên propUser truyền vào tường minh (dành cho storybook, test hoặc report page mockup)
  const activeUser =
    propUser !== undefined ? propUser : storeUser;

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Cách học cùng SimpliFey", href: "/how-it-works" },
    { label: "Tìm kiếm repo yêu thích của bạn", href: "https://github.com" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-white border-b-[0.8px] border-[#e5e7eb] px-4 md:px-9 transition-all",
        className
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-2 sm:px-6">
        {/* Brand Logo & Desktop Nav Links */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link
            href="/"
            className="flex items-center select-none"
            aria-label="SimpliFey Trang chủ"
          >
            <span className="text-[28px] sm:text-[32px] font-black tracking-[-0.8px] text-[#ff9640] text-shadow-brand-logo">
              SIMPLIFEY
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              const isExternal = link.href.startsWith("http");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className={cn(
                    "text-[14px] font-medium text-[#131b2e] transition-all duration-200 ease-out origin-center hover:font-semibold hover:underline hover:underline-offset-4 hover:decoration-1 hover:decoration-[#131b2e]/60 hover:scale-105 active:scale-95",
                    pathname === link.href &&
                      "font-semibold text-black underline underline-offset-4 decoration-2 decoration-[#ff9640]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Actions & Settings */}
        <div className="flex items-center gap-3 sm:gap-5">
          {isLoading && !activeUser ? (
            /* Loading State: Skeleton Shimmer */
            <div
              className="flex items-center gap-2 animate-pulse py-1"
              aria-label="Đang tải thông tin người dùng"
            >
              <div className="size-9 rounded-full bg-[#f3f4f6]" />
              <div className="h-4 w-24 rounded bg-[#f3f4f6] hidden sm:block" />
            </div>
          ) : activeUser ? (
            /* Success State: User Profile with Tier Badge */
            <div className="flex items-center gap-3">
              <Avatar
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                fallback={activeUser.name ? activeUser.name[0] : "U"}
                size="md"
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline-block text-[15px] font-bold text-[#131b2e]">
                  Xin chào {activeUser.name}!
                </span>
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
                    className="hidden lg:inline-flex"
                  >
                    {profile.overall_tier === "ARCHITECT"
                      ? "Kiến trúc sư"
                      : profile.overall_tier === "PRACTITIONER"
                      ? "Thực hành"
                      : "Tập sự"}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            /* Empty / Guest State: Login CTA buttons */
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block px-2.5 py-1 text-[14px] font-medium text-[#131b2e] transition-all duration-200 ease-out origin-center hover:font-semibold hover:underline hover:underline-offset-4 hover:decoration-1 hover:decoration-[#131b2e]/60 hover:scale-105 active:scale-95"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-[12px] bg-[#ff9640] px-5 py-2 sm:px-6 sm:py-2.5 text-[14px] font-bold text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f2852e] hover:scale-105 active:scale-95 transition-all duration-200 ease-out origin-center"
              >
                Đăng ký
              </Link>
            </>
          )}

          {/* Settings Trigger with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              aria-label="Cài đặt hệ thống"
              aria-expanded={isSettingsOpen}
              className="group flex items-center justify-center p-2 text-black transition-colors focus:outline-none cursor-pointer bg-transparent"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "size-5 text-black transition-all duration-500 ease-in-out origin-center group-hover:rotate-[360deg] group-hover:text-[#ff9640]",
                  isSettingsOpen && "text-[#ff9640]"
                )}
              >
                <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            <SettingsDropdown
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
            />
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu điều hướng"
            className="md:hidden flex items-center justify-center rounded-[8px] p-2 text-[#554337] hover:bg-[#f3f4f6]"
          >
            {isMobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Links drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#f3f4f6] py-3 px-2 flex flex-col gap-1 bg-white animate-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => {
            const isExternal = link.href.startsWith("http");
            return (
              <Link
                key={link.href}
                href={link.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-[8px] text-[#131b2e] transition-all duration-200 ease-out hover:font-semibold hover:underline hover:underline-offset-4 hover:decoration-1 hover:decoration-[#131b2e]/60 hover:scale-[1.02]",
                  pathname === link.href && "font-semibold text-black bg-[#f3f4f6]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {!activeUser && (
            <div className="border-t border-[#f3f4f6] mt-2 pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#131b2e] hover:font-semibold hover:underline hover:underline-offset-4 hover:decoration-1 hover:decoration-[#131b2e]/60 hover:scale-[1.02] rounded-[8px] transition-all duration-200 ease-out"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed top-20 right-4 sm:right-9 z-50 flex items-center gap-3 rounded-[12px] px-4 py-3 shadow-lg border transition-all animate-in slide-in-from-top-3 duration-200 max-w-[380px]",
            toast.type === "success" &&
              "bg-white border-[#00bc7d]/30 text-[#131b2e] drop-shadow-[0_8px_16px_rgba(0,188,125,0.15)]",
            toast.type === "error" &&
              "bg-white border-[#e7000b]/30 text-[#131b2e] drop-shadow-[0_8px_16px_rgba(231,0,11,0.15)]",
            toast.type === "info" &&
              "bg-white border-[#004cff]/30 text-[#131b2e] drop-shadow-[0_8px_16px_rgba(0,76,255,0.15)]"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-5 text-[#00bc7d] shrink-0" />
          ) : toast.type === "error" ? (
            <AlertCircle className="size-5 text-[#e7000b] shrink-0" />
          ) : (
            <Info className="size-5 text-[#004cff] shrink-0" />
          )}
          <span className="text-[13px] font-semibold flex-1 leading-snug">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={hideToast}
            aria-label="Đóng thông báo"
            className="text-[#99a1af] hover:text-[#131b2e] p-1 rounded-md transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </header>
  );
}
