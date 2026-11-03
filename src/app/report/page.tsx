import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportClientView } from "./components/ReportClientView";
import { ReportLoadingSkeleton } from "./components/ReportStateViews";

export const metadata: Metadata = {
  title: "Báo cáo phiên học — SimpliFey",
  description:
    "Đánh giá chi tiết phiên học, độ thông hiểu kiến trúc theo mô hình Feynman & Bayesian Knowledge Tracing (BKT).",
};

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportLoadingSkeleton />}>
      <ReportClientView />
    </Suspense>
  );
}
