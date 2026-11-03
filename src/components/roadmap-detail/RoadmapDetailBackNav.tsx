"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function RoadmapDetailBackNav() {
  return (
    <div className="w-full flex items-center justify-start mb-6">
      <Link
        href="/roadmap"
        className="inline-flex items-center gap-2 text-[#554337] hover:text-[#131b2e] text-[15px] font-semibold transition-colors duration-150 group select-none"
        aria-label="Quay lại lộ trình"
      >
        <ArrowLeft className="size-4 text-[#554337] group-hover:text-[#131b2e] transition-transform duration-150 group-hover:-translate-x-1" />
        <span>Quay lại lộ trình</span>
      </Link>
    </div>
  );
}
