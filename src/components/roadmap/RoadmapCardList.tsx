"use client";

import React from "react";
import Link from "next/link";
import { FolderGit2, ArrowRight, Sparkles } from "lucide-react";
import { RoadmapCard } from "./RoadmapCard";
import type { RoadmapCourse } from "./types";
import { Button } from "@/components/ui/Button";

export interface RoadmapCardListProps {
  courses?: RoadmapCourse[];
}

export function RoadmapCardList({ courses = [] }: RoadmapCardListProps) {
  if (courses.length === 0) {
    return (
      <div
        className="bg-white border border-[#eaecef] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[18px] w-full gap-4"
        data-node-id="5:828"
      >
        <div className="size-16 rounded-full bg-[#fff7ed] border border-[#ff9640]/30 flex items-center justify-center text-[#ff9640]">
          <FolderGit2 className="size-8" />
        </div>
        <div className="flex flex-col gap-1 max-w-md">
          <h3 className="font-bold text-[#131b2e] text-lg">
            Chưa có kho lưu trữ nào được phân tích
          </h3>
          <p className="text-sm text-[#625e56]">
            Hãy nhập liên kết GitHub hoặc tải file zip mã nguồn tại Trang chủ để
            SimpliFey dựng đồ thị kiến trúc và bắt đầu bài học đầu tiên của bạn!
          </p>
        </div>
        <Link href="/">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Sparkles className="size-4" />}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Quét kho lưu trữ đầu tiên
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-[#eaecef] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col gap-[16px] items-start p-5 sm:p-[28.8px] rounded-[18px] w-full"
      data-node-id="5:828"
      data-name="Background+Border+Shadow"
    >
      {courses.map((course) => (
        <RoadmapCard key={course.id} course={course} />
      ))}
    </div>
  );
}
