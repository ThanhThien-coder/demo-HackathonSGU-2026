"use client";

import React from "react";
import { RoadmapCard } from "./RoadmapCard";
import type { RoadmapCourse } from "./types";

export const DEFAULT_ROADMAP_COURSES: RoadmapCourse[] = [
  {
    id: "java-backend",
    title: "Java Backend",
    description: "Hệ thống quản lý xuất nhập hàng",
    status: "in-progress",
    progress: 75,
    targetUrl: "/roadmap/java-backend",
    dataNodeId: "5:829",
  },
  {
    id: "react-frontend",
    title: "React Frontend",
    description: "Giao diện nhanh, đẹp cùng React",
    status: "in-progress",
    progress: 75,
    targetUrl: "/roadmap/react-frontend",
    dataNodeId: "5:853",
  },
  {
    id: "sql-server",
    title: "SQL Server",
    description: "Làm chủ cơ sở dữ liệu quan hệ",
    status: "completed",
    targetUrl: "/roadmap/sql-server",
    dataNodeId: "5:877",
  },
  {
    id: "postgresql",
    title: "Postgresql",
    description: "Cơ sở về database thông dụng nhất",
    status: "completed",
    targetUrl: "/roadmap/postgresql",
    dataNodeId: "5:898",
  },
];

export interface RoadmapCardListProps {
  courses?: RoadmapCourse[];
}

export function RoadmapCardList({
  courses = DEFAULT_ROADMAP_COURSES,
}: RoadmapCardListProps) {
  return (
    <div
      className="bg-white border border-[#c0c0c0] drop-shadow-[0px_4px_8px_rgba(0,0,0,0.06)] flex flex-col gap-[16px] items-start p-5 sm:p-[28.8px] rounded-[18px] w-full"
      data-node-id="5:828"
      data-name="Background+Border+Shadow"
    >
      {courses.map((course) => (
        <RoadmapCard key={course.id} course={course} />
      ))}
    </div>
  );
}
