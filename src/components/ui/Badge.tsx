import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-bold transition-colors select-none",
  {
    variants: {
      variant: {
        brand:
          "bg-[#fff0e4] text-[#944b00] border border-[#ff9640]/30",
        bkt:
          "bg-[#ffedd4] text-[#944b00] font-extrabold",
        info:
          "bg-[#eaedff] text-[#004cff] border border-[#004cff]/20",
        success:
          "bg-[#ecfdf5] text-[#00bc7d] border border-[#00bc7d]/20",
        warning:
          "bg-[#fffbeb] text-[#b45309] border border-[#f59e0b]/20",
        danger:
          "bg-[#fef2f2] text-[#e7000b] border border-[#e7000b]/20",
        neutral:
          "bg-[#f3f4f6] text-[#554337] border border-[#e5e7eb]",
        dark:
          "bg-[#131b2e] text-white",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] leading-tight rounded-full",
        md: "px-2.5 py-0.5 text-[11px] leading-relaxed rounded-full",
        lg: "px-3 py-1 text-[13px] leading-relaxed rounded-full",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            variant === "success" && "bg-[#00bc7d]",
            variant === "warning" && "bg-[#f59e0b]",
            variant === "danger" && "bg-[#e7000b]",
            variant === "info" && "bg-[#004cff]",
            variant === "brand" && "bg-[#ff9640]",
            variant === "bkt" && "bg-[#944b00]",
            (!variant || variant === "neutral") && "bg-[#554337]"
          )}
        />
      )}
      {children}
    </span>
  );
}
