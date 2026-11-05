import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Boot } from "@/components/layout/Boot";
import { Toasts } from "@/components/ui/Toasts";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], variable: "--font-plus-jakarta", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "SimpliFey — Học kiến trúc mã nguồn",
  description: "Dán link repo GitHub, nhận bản đồ lát cắt nghiệp vụ xuyên file và học bằng câu hỏi Feynman.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Boot />
        {children}
        <Toasts />
      </body>
    </html>
  );
}
