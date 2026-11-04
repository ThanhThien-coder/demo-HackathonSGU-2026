import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "tinted" | "interactive";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "bg-white border border-[#f3f4f6] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)]",
    elevated:
      "bg-white border border-[#f3f4f6] drop-shadow-[0px_10px_15px_rgba(0,0,0,0.06)]",
    tinted:
      "bg-[#f2f3ff] border border-[#eaedff]",
    interactive:
      "bg-white border border-[#f3f4f6] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] hover:border-[#ff9640]/50 hover:drop-shadow-[0px_10px_20px_rgba(255,150,64,0.12)] transition-all duration-200 cursor-pointer",
  };

  return (
    <div
      className={cn(
        "rounded-[16px] p-6 text-[#131b2e]",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 pb-4", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-bold text-[#131b2e] leading-snug tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[#625e56] leading-relaxed", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-2", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center pt-4 border-t border-[#f3f4f6] mt-4", className)}
      {...props}
    />
  );
}
