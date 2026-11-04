"use client";

import React from "react";
import { GitFork } from "lucide-react";

export interface RoadmapDetailHeaderProps {
  title: string;
  description?: string;
}

export function RoadmapDetailHeader({
  title,
  description,
}: RoadmapDetailHeaderProps) {
  return (
    <div
      className="flex items-center gap-4 w-full mb-8"
      data-node-id="5:950"
      data-name="Header"
    >
      {/* Brand Icon Box */}
      <div
        className="size-12 sm:size-14 rounded-2xl bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center shrink-0 shadow-sm"
        data-name="IconBox"
      >
        <GitFork
          className="size-6 text-[#ff9640] stroke-[2.2]"
          aria-hidden="true"
        />
      </div>

      {/* Course Title and Subtitle */}
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#131b2e] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-[#554337] mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
