import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { AuthCardWrapper, RegisterForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Tạo tài khoản học tập — SimpliFey",
  description: "Bắt đầu phân tích codebase, hiểu sâu kiến trúc và rèn luyện kỹ năng phần mềm thực chiến cùng SimpliFey.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:1178) */}
      <Navbar />

      {/* 2. Main Authentication Content (Figma node 5:1204) */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 relative overflow-hidden bg-white">
        <AuthCardWrapper>
          <RegisterForm />
        </AuthCardWrapper>
      </main>

      {/* 3. Global Footer (Figma node 5:1267) */}
      <HomeFooter />
    </div>
  );
}
