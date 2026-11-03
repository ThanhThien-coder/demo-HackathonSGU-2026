import { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import {
  ReportHeader,
  StudentOverview,
  KnowledgeBreakdown,
  ReviewRecommendations,
} from "@/components/report";

export const metadata: Metadata = {
  title: "Báo cáo phiên học — SimpliFey",
  description:
    "Đánh giá chi tiết phiên học, độ thông hiểu kiến trúc theo mô hình Feynman & Bayesian Knowledge Tracing (BKT).",
};

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:792) */}
      <Navbar
        user={{
          name: "Quý",
          avatarUrl: "/assets/report/avatar-quy.png",
        }}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* Back Link to Cockpit (Figma node 5:563) */}
        <ReportHeader />

        {/* Report Content Container (Figma node 5:574) */}
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pb-12 flex flex-col gap-6">
          {/* Top Section: Student greeting + 3 stat cards + Weekly goal gauge (Figma node 5:576) */}
          <StudentOverview />

          {/* Middle Section: Today's knowledge list + average understanding & continue CTA (Figma node 5:651) */}
          <KnowledgeBreakdown />

          {/* Bottom Section: Improvement recommendations & review points (Figma node 5:751) */}
          <ReviewRecommendations />
        </div>
      </main>

      {/* 3. Global Footer (Figma node 5:783) */}
      <HomeFooter />
    </div>
  );
}
