import React from "react";
import { cn } from "@/lib/utils";

export interface AuthCardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCardWrapper({ children, className }: AuthCardWrapperProps) {
  return (
    <div className="relative w-full max-w-[480px]">
      {/* Decorative Layer 1: Warm orange tint card rotated 2 degrees (Figma node 5:1113 / 5:1205) */}
      <div
        aria-hidden="true"
        className="absolute -inset-3 sm:-inset-5 bg-[#ffdcc5] opacity-50 rounded-[48px] rotate-2 pointer-events-none transition-transform duration-300"
      />

      {/* Decorative Layer 2: Soft purple-blue tint card rotated -3 degrees (Figma node 5:1114 / 5:1206) */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 sm:-inset-3 bg-[#e2e7ff] opacity-40 rounded-[40px] -rotate-3 pointer-events-none transition-transform duration-300"
      />

      {/* Foreground Main Authentication Card */}
      <div
        className={cn(
          "relative bg-white border border-[#f3f4f6] rounded-[16px] p-6 sm:p-10 shadow-[0px_16px_20px_rgba(0,0,0,0.08)] flex flex-col gap-8 w-full",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
