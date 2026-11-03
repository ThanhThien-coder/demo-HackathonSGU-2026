import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { GitBranch, ArrowRight, Code, Sparkles, TrendingUp, Layers } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col">
      {/* Global Navbar */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center pt-10 pb-16 px-4 sm:px-6">
        {/* Hero Section (Figma node 5:248) */}
        <div className="mx-auto max-w-[1344px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-6 lg:py-12">
          {/* Left Column: Heading & Scanner Form */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-black leading-[1.12] tracking-tight text-[#131b2e]">
                Học thú vị hơn <br />
                cùng{" "}
                <span className="italic text-[#ff9640]">SimpliFey</span>
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-[#625e56] max-w-xl leading-relaxed">
                Người đồng hành, hỗ trợ phân tích và học tập từ chính mã nguồn của bạn.
              </p>
            </div>

            {/* Git Repo Scanner Card (Figma node 5:256) */}
            <div className="w-full max-w-xl rounded-[16px] bg-white border border-[#f3f4f6] p-6 drop-shadow-[0px_10px_15px_rgba(0,0,0,0.06)] shadow-sm">
              <div className="flex items-center gap-2.5 mb-3 text-[17px] font-semibold text-[#131b2e]">
                <Code className="size-5 text-[#ff9640]" />
                <span>Phân tích mã nguồn tự động</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="flex-1">
                  <Input
                    defaultValue="https://github.com/simplifey/nest-store-core"
                    leftIcon={<GitBranch className="size-4 text-[#ff9640]" />}
                    placeholder="https://github.com/owner/repository"
                  />
                </div>
                <Link href="/learn" className="shrink-0">
                  <Button
                    variant="primary"
                    rightIcon={<ArrowRight className="size-4" />}
                    className="w-full sm:w-auto h-full min-h-[46px]"
                  >
                    Quét Dự Án
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="text-xs font-bold text-[#944b00] uppercase tracking-wider">
                TRUY CẬP NHANH:
              </span>
              <Link href="/ui-preview">
                <Button size="sm" variant="outline" className="text-xs">
                  ✨ Xem UI Preview Catalog
                </Button>
              </Link>
              <Link href="/learn">
                <Button size="sm" variant="secondary" className="text-xs">
                  Buồng lái Feynman (Learn)
                </Button>
              </Link>
              <Link href="/roadmap">
                <Button size="sm" variant="secondary" className="text-xs">
                  Lộ trình mẫu
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Graphic Preview */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-[420px] aspect-square rounded-[24px] bg-gradient-to-br from-[#fff0e4] via-[#faf8ff] to-[#f2f3ff] border border-[#eaedff] p-8 flex flex-col justify-between shadow-[0px_16px_30px_rgba(255,150,64,0.12)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#ff9640] bg-white px-3 py-1 rounded-full shadow-sm border border-[#ff9640]/20">
                  Feynman Cockpit
                </span>
                <span className="text-xs font-bold text-[#004cff] bg-white px-3 py-1 rounded-full shadow-sm border border-[#004cff]/20">
                  BKT-v2 Engine
                </span>
              </div>

              <div className="space-y-3 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm">
                <div className="text-xs font-bold text-[#944b00] uppercase tracking-wider">
                  CÂU HỎI PHẢN BIỆN
                </div>
                <p className="text-sm font-semibold text-[#131b2e] leading-snug">
                  Tại sao cách trừ kho lắt nhắt ở dòng 22 lại làm máy chủ bị đơ khi có 100 người cùng mua một lúc?
                </p>
                <div className="text-xs text-[#625e56] italic">
                  &ldquo;Tưởng tượng 1 bàn gọi 10 món...&rdquo;
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#554337] font-medium pt-2">
                <span>Codebase Cognitive Twin</span>
                <span className="font-bold text-[#ff9640]">SimpliFey 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section (Figma node 5:505, 5:516) */}
        <div className="mx-auto max-w-[1344px] w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <Card variant="default">
            <CardHeader>
              <div className="size-12 rounded-[8px] bg-white border border-[#ff9640] flex items-center justify-center text-[#ff9640] mb-3">
                <Layers className="size-6" />
              </div>
              <CardTitle>Xây dựng nền móng</CardTitle>
              <CardDescription>
                Phù hợp để bắt đầu và xây dựng nền tảng vững chắc với kiến thức cốt lõi, cú pháp chuẩn và tư duy giải thuật sơ cấp.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card variant="default">
            <CardHeader>
              <div className="size-12 rounded-[8px] bg-white border border-[#ff9640] flex items-center justify-center text-[#ff9640] mb-3">
                <Sparkles className="size-6" />
              </div>
              <CardTitle>Phong cách học trực tuyến mới lạ</CardTitle>
              <CardDescription>
                Trải nghiệm học tập cùng AI bằng cách “đảo ngược vai trò sư phạm” mới lạ và hiệu quả theo phương pháp Feynman.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card variant="default">
            <CardHeader>
              <div className="size-12 rounded-[8px] bg-white border border-[#ff9640] flex items-center justify-center text-[#ff9640] mb-3">
                <TrendingUp className="size-6" />
              </div>
              <CardTitle>Theo dõi và cải thiện</CardTitle>
              <CardDescription>
                Trải nghiệm học tập toàn diện với nhiều tính năng phân tích nâng cao, đánh giá độ phức tạp thuật toán và mô hình BKT.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Footer (Figma node 5:526) */}
      <footer className="w-full bg-[#fff0e4] border-t-[0.8px] border-[#ffe0cc] py-6 px-4 sm:px-9">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#ff9640]">SIMPLIFEY</span>
            <span className="text-[13px] text-[#554337]">
              © 2025 SimpliFey by MeoMeo Team - Hackathon 2026
            </span>
          </div>
          <div className="text-xs text-[#625e56]">
            Học kiến trúc mã nguồn qua phương pháp Feynman
          </div>
        </div>
      </footer>
    </div>
  );
}
