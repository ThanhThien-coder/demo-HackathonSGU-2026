import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { AuthCardWrapper, LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản — SimpliFey",
  description: "Tiếp tục hành trình học kiến trúc mã nguồn và luyện kỹ năng cùng SimpliFey.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:1086) */}
      <Navbar />

      {/* 2. Main Authentication Content (Figma node 5:1112) */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 relative overflow-hidden bg-white">
        <AuthCardWrapper>
          <LoginForm />
        </AuthCardWrapper>
      </main>

      {/* 3. Global Footer (Figma node 5:1167) */}
      <HomeFooter />
    </div>
  );
}
