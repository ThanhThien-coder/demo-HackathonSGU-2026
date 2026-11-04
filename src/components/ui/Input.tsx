import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      wrapperClassName,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[14px] font-semibold text-[#131b2e] select-none"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative flex items-center w-full rounded-[8px] bg-[#f2f3ff] border border-transparent transition-all duration-150 focus-within:border-[#ff9640] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff9640]/20",
            error && "border-[#e7000b] bg-[#fef2f2] focus-within:border-[#e7000b] focus-within:ring-[#e7000b]/20",
            disabled && "opacity-60 cursor-not-allowed bg-gray-100"
          )}
        >
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-[#99a1af] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full bg-transparent px-4 py-3 text-[14px] font-medium text-[#131b2e] placeholder:text-[#99a1af] focus:outline-none disabled:cursor-not-allowed",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-[#99a1af]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#e7000b] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#625e56]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
