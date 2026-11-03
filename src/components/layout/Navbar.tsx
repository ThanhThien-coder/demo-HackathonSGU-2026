"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Menu, X } from "lucide-react";
import { SettingsDropdown } from "./SettingsDropdown";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export interface NavbarProps {
  user?: {
    name: string;
    avatarUrl?: string;
  } | null;
  className?: string;
}

export function Navbar({ user, className }: NavbarProps) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Cách học cùng SimpliFey", href: "/how-it-works" },
    { label: "Tìm kiếm repo yêu thích của bạn", href: "/roadmap" },
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
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "py-1 text-[14px] font-semibold transition-colors duration-150",
                    isActive
                      ? "text-[#ff9640] font-bold"
                      : "text-[#554337] hover:text-[#ff9640]"
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
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatarUrl}
                alt={user.name}
                fallback={user.name[0]}
                size="md"
              />
              <span className="hidden sm:inline-block text-[15px] font-bold text-[#131b2e]">
                Xin chào {user.name}!
              </span>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-block px-2.5 py-1 text-[14px] font-semibold text-[#554337] hover:text-[#ff9640] transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-[12px] bg-[#ff9640] px-5 py-2 sm:px-6 sm:py-2.5 text-[14px] font-bold text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#f2852e] active:scale-[0.98] transition-all"
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
              className={cn(
                "flex items-center justify-center rounded-[10px] p-2 text-[#554337] hover:bg-[#fff0e4] hover:text-[#944b00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff9640]/40",
                isSettingsOpen && "bg-[#fff0e4] text-[#944b00]"
              )}
            >
              <SlidersHorizontal className="size-5" />
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "px-3 py-2 text-sm font-semibold rounded-[8px] transition-colors",
                pathname === link.href
                  ? "bg-[#fff0e4] text-[#944b00] font-bold"
                  : "text-[#554337] hover:bg-[#f3f4f6]"
              )}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <div className="border-t border-[#f3f4f6] mt-2 pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#554337] hover:bg-[#f3f4f6] rounded-[8px]"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
