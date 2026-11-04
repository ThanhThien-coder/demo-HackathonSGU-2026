import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SimpliFey — Codebase Cognitive Twin",
  description: "Người đồng hành, hỗ trợ phân tích và học tập kiến trúc từ chính mã nguồn của bạn theo phương pháp Feynman.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-white text-[#131b2e] antialiased">
        {children}
      </body>
    </html>
  );
}
