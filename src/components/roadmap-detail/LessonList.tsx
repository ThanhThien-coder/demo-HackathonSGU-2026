"use client";

import React from "react";
import { LessonCard } from "./LessonCard";
import type { LessonItem } from "./types";

export interface LessonListProps {
  lessons: LessonItem[];
}

export function LessonList({ lessons }: LessonListProps) {
  return (
    <div
      className="bg-white border border-[#c0c0c0] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col gap-[16px] items-start p-5 sm:p-[28.8px] rounded-[18px] w-full"
      data-node-id="5:954"
      data-name="LessonsContainer"
    >
      {lessons.map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}
