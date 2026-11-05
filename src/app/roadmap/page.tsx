"use client";
import { Navbar } from "@/components/layout/Navbar";
import { SessionList } from "@/components/home/SessionList";
import { useWorkbench } from "@/store/workbench";

export default function RoadmapPage() {
  const auth = useWorkbench((s) => s.ui.auth);
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Lộ trình học</h1>
        <p className="mt-1 text-sm text-muted">Danh sách các phiên học của bạn; mỗi phiên gắn cố định với một phiên bản repo.</p>
        {auth !== "user" ? <p className="mt-6 text-muted">Đăng nhập để xem các phiên học.</p> : <SessionList compact />}
      </main>
    </>
  );
}
