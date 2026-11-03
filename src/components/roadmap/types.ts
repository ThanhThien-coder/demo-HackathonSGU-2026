export type CourseStatus = "in-progress" | "completed";

export interface RoadmapCourse {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  progress?: number; // 0 - 100 for in-progress
  targetUrl: string;
  dataNodeId?: string;
}
