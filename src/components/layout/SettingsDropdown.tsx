"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Compass,
  User,
  Sparkles,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Cài đặt hệ thống"
      className={cn(
        "absolute right-0 top-full mt-2 w-[280px] z-50 rounded-[16px] border border-[#f3f4f6] bg-white p-[8.8px] drop-shadow-[0px_16px_20px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-150 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="border-b-[0.8px] border-[#f3f4f6] px-3 pb-[8.8px] pt-2">
        <h4 className="text-[13px] font-bold text-[#131b2e] leading-snug">
          Cài đặt SimpliFey
        </h4>
        <p className="text-[11px] text-[#625e56] leading-tight mt-0.5">
          Tùy chỉnh cá nhân và học tập
        </p>
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

        <button
          type="button"
          onClick={() => {
            alert("Tính năng Hồ sơ cá nhân đang được hoàn thiện!");
            onClose();
          }}
          className="flex w-full items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <User className="size-4 text-[#554337] group-hover:text-[#ff9640] transition-colors" />
            <span className="text-[14px] font-semibold">Hồ sơ cá nhân</span>
          </div>
          <ChevronRight className="size-3.5 text-[#99a1af]" />
        </button>

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

        <div className="flex items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-[#f2f3ff] text-[#131b2e] transition-colors">
          <div className="flex items-center gap-2.5">
            <Moon className="size-4 text-[#554337]" />
            <span className="text-[14px] font-semibold">Chế độ nền tối</span>
          </div>
          <span className="text-[12px] text-[#99a1af]">Tắt</span>
        </div>

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

      {/* Footer / Logout */}
      <div className="border-t-[0.8px] border-[#f3f4f6] pt-[6.8px]">
        <button
          type="button"
          onClick={() => {
            alert("Đã đăng xuất phiên làm việc!");
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-[12px] hover:bg-[#fef2f2] text-[#e7000b] transition-colors"
        >
          <LogOut className="size-4" />
          <span className="text-[14px] font-semibold">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
