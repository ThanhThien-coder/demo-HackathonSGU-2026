"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant?: "pills" | "underline";
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: "pills" | "underline";
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = "pills",
  children,
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (newTab: string) => {
    if (value === undefined) {
      setInternalTab(newTab);
    }
    onValueChange?.(newTab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={cn("flex flex-col w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  const isPill = context?.variant === "pills";

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1.5",
        isPill
          ? "bg-[#f2f3ff] p-1 rounded-[10px]"
          : "border-b border-[#e5e7eb] gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  icon,
  className,
}: {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used inside Tabs");

  const isActive = context.activeTab === value;
  const isPill = context.variant === "pills";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold transition-all duration-150 select-none",
        isPill
          ? isActive
            ? "bg-white text-[#131b2e] shadow-sm rounded-[8px] px-3.5 py-1.5 font-bold"
            : "text-[#625e56] hover:text-[#131b2e] px-3.5 py-1.5 rounded-[8px]"
          : isActive
          ? "border-b-2 border-[#ff9640] text-[#ff9640] pb-2 font-bold"
          : "text-[#625e56] hover:text-[#131b2e] pb-2 border-b-2 border-transparent",
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used inside Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("mt-4 animate-in fade-in duration-150", className)}
    >
      {children}
    </div>
  );
}
