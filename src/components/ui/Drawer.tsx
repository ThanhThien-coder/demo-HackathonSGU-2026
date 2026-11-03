"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  side = "right",
  size = "md",
  className,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 320);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
    full: "max-w-full",
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-10 flex h-full w-full flex-col bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.15)] border-[#e5e7eb] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          sizeClasses[size],
          side === "left"
            ? "left-0 top-0 bottom-0 border-r"
            : "right-0 top-0 bottom-0 border-l",
          visible
            ? "translate-x-0"
            : side === "left"
            ? "-translate-x-full"
            : "translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f3f4f6] px-6 py-4 bg-white shrink-0">
          <div>
            {title && (
              <h2 className="text-lg font-bold text-[#131b2e]">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-[#625e56] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Đóng thanh trượt"
            className="rounded-[8px] p-2 text-[#99a1af] hover:bg-[#f3f4f6] hover:text-[#131b2e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff9640]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
