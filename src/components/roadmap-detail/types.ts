export type LessonStatus = "completed" | "in-progress" | "locked" | "failed";

export interface LessonItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  status: LessonStatus;
  progress?: number;
  targetUrl: string;
  dataNodeId?: string;
}

export interface CourseDetail {
  id: string;
  title: string;
  description: string;
  lessons: LessonItem[];
}
