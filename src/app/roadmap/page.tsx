"use client";
import { Route } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { SessionList } from "@/components/home/SessionList";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { useWorkbench } from "@/store/workbench";

export default function RoadmapPage() {
  const auth = useWorkbench((s) => s.ui.auth);
  return (
    <>
      <Navbar />
      <main className="anim-fade-up mx-auto max-w-4xl px-6 py-10">
        <PageHeader icon={<Route className="h-5 w-5" />} title="Lộ trình học"
          description="Danh sách các phiên học của bạn; mỗi phiên gắn cố định với một phiên bản repo." />
        <div className="mt-6">
          {auth !== "user" ? <EmptyState>Đăng nhập để xem các phiên học.</EmptyState> : <SessionList compact />}
        </div>
      </main>
    </>
  );
}
