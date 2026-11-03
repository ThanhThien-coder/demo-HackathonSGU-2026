import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9640] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[#ff9640] text-white hover:bg-[#f2852e] active:bg-[#e6761c] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] drop-shadow-[0px_4px_5px_rgba(255,150,64,0.3)]",
        secondary:
          "bg-[#f2f3ff] text-[#131b2e] hover:bg-[#eaedff] active:bg-[#dde2ff] border border-transparent hover:border-[#eaedff]",
        outline:
          "border border-[#e5e7eb] bg-white text-[#131b2e] hover:bg-[#faf8ff] hover:border-[#ff9640]/40 shadow-sm",
        ghost:
          "bg-transparent text-[#554337] hover:bg-[#fff0e4] hover:text-[#944b00]",
        danger:
          "bg-[#fef2f2] text-[#e7000b] hover:bg-[#fee2e2] active:bg-[#fecaca] border border-[#fecaca]",
        brandDark:
          "bg-[#8b4600] text-white hover:bg-[#944b00] drop-shadow-[0px_4px_5px_rgba(139,70,0,0.3)]",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[8px] gap-1.5",
        md: "h-10 px-5 text-sm rounded-[10px] gap-2",
        lg: "h-12 px-6 text-base rounded-[12px] gap-2.5",
        icon: "size-10 rounded-[10px]",
        iconSm: "size-8 rounded-[8px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
