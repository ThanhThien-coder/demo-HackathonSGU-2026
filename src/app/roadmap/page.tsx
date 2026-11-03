import { Navbar } from "@/components/layout/Navbar";
import {
  RoadmapHeader,
  RoadmapCardList,
  RoadmapFooter,
} from "@/components/roadmap";

export default function RoadmapPage() {
  return (
    <div
      className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]"
      data-node-id="5:818"
      data-name="Html → Body"
    >
      {/* 1. Global Navigation Header with Logged-in User Profile (Figma node 5:928) */}
      <Navbar user={{ name: "User" }} />

      {/* 2. Main Content Area (Figma node 5:819 / 5:820) */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div
          className="flex flex-col gap-8 sm:gap-10 items-center w-full max-w-[960px]"
          data-node-id="5:820"
          data-name="Main"
        >
          {/* Header Title with Graduation Cap Icon (Figma node 5:821) */}
          <RoadmapHeader />

          {/* Card Container with In-Progress and Completed Courses (Figma node 5:828) */}
          <RoadmapCardList />
        </div>
      </main>

      {/* 3. Global Footer (Figma node 5:919) */}
      <RoadmapFooter />
    </div>
  );
}
