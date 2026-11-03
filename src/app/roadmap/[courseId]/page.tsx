import { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { RoadmapFooter } from "@/components/roadmap";
import {
  RoadmapDetailBackNav,
  RoadmapDetailHeader,
  LessonList,
  getCourseDetail,
} from "@/components/roadmap-detail";

interface RoadmapDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({
  params,
}: RoadmapDetailPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = getCourseDetail(courseId);
  return {
    title: `${course.title} | Lộ trình SimpliFey`,
    description: course.description,
  };
}

export default async function RoadmapDetailPage({
  params,
}: RoadmapDetailPageProps) {
  const { courseId } = await params;
  const course = getCourseDetail(courseId);

  return (
    <div
      className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]"
      data-node-id="5:954"
      data-name="RoadmapDetailPage"
    >
      {/* 1. Global Navigation Header with Logged-in User Profile */}
      <Navbar user={{ name: "User" }} />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col items-start w-full max-w-[960px]">
          {/* Back Navigation Button "Quay lại lộ trình" */}
          <RoadmapDetailBackNav />

          {/* Header Title with Flow/Branch Icon & Course Name */}
          <RoadmapDetailHeader
            title={course.title}
            description={course.description}
          />

          {/* Container with Course Lessons List (Completed, In-Progress, Locked) */}
          <LessonList lessons={course.lessons} />
        </div>
      </main>

      {/* 3. Global Footer */}
      <RoadmapFooter />
    </div>
  );
}
