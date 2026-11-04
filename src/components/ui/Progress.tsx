import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "brand" | "blue" | "success" | "warning";
  size?: "sm" | "md" | "lg";
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "brand",
  size = "md",
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantBarClasses = {
    brand: "bg-[#ff9640] shadow-[0px_2px_4px_rgba(255,150,64,0.4)]",
    blue: "bg-[#004cff]",
    success: "bg-[#00bc7d]",
    warning: "bg-[#f59e0b]",
  };

  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-semibold text-[#131b2e]">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full overflow-hidden rounded-full bg-[#f2f3ff] border border-[#eaedff]",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            variantBarClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
