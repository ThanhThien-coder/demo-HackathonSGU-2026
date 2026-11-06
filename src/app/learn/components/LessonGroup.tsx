"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import type { LessonGroupView } from "@/lib/lesson-map";

export interface LessonGroupProps {
  group: LessonGroupView;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function LessonGroup({ group, isOpen, onToggle, children }: LessonGroupProps) {
  const bodyId = `lesson-${group.group_id}`;
  return (
    <section className="overflow-hidden rounded-[12px] border border-border-default">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center gap-2 bg-surface-tint-alt px-3 py-2.5 text-left outline-none hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
      >
        <ChevronRight
          className={`size-4 shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        <span className="min-w-0 break-words text-sm font-bold text-text-main">{group.name}</span>
        {group.recommended && (
          <span className="shrink-0 rounded-full border border-brand-primary px-1.5 text-[11px] font-semibold text-brand-dark">
            ★ Nên học trước
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs text-text-secondary">{group.node_ids.length} bài</span>
      </button>
      <div id={bodyId} hidden={!isOpen} className="flex flex-col gap-2 p-2">
        {children}
      </div>
    </section>
  );
}
