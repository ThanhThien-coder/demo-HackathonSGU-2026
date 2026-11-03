import { Navbar } from "@/components/layout/Navbar";
import {
  HeroScanner,
  HeroVisual,
  HeroAnimation,
  TrainingFramework,
  HomeFooter,
} from "@/components/home";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:535) */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center">
        {/* 2. Hero Section (Figma node 5:248) */}
        <section className="w-full max-w-[1344px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-center">
            {/* Left Column: Heading, Subtitle, Scanner Form, Lottie Animation */}
            <div className="lg:col-span-6 flex flex-col items-start gap-6 sm:gap-8 w-full max-w-[648px] mx-auto lg:mx-0">
              {/* Heading 1 & Description matching Figma node 5:251 */}
              <div className="flex flex-col gap-4">
                <h1 className="font-black text-[#131b2e] text-[40px] sm:text-[52px] lg:text-[62px] leading-[1.12] sm:leading-[1.15] lg:leading-[69.44px] tracking-[-1.55px]">
                  <span>Học thú vị hơn</span>
                  <br />
                  <span>
                    cùng{" "}
                    <span className="italic text-[#ff9640] inline-block font-black">
                      SimpliFey
                    </span>
                  </span>
                </h1>
                <p className="font-normal text-[#625e56] text-[18px] sm:text-[22px] leading-relaxed sm:leading-[35.75px] max-w-[540px]">
                  Người đồng hành, hỗ trợ phân tích và học tập từ chính mã nguồn của bạn.
                </p>
              </div>

              {/* Automatic Code Scanner Card (Figma node 5:256) */}
              <HeroScanner />

              {/* Interactive Lottie Character Animation (Figma node 5:280) */}
              <div className="w-full flex items-center justify-center pt-2 sm:pt-4">
                <HeroAnimation />
              </div>
            </div>

            {/* Right Column: Hero Graphic Canvas & 3 Floating Badges (Figma node 5:431) */}
            <div className="lg:col-span-6 flex items-center justify-center w-full">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* 3. Training Framework Section (Figma node 5:480) */}
        <TrainingFramework />
      </main>

      {/* 4. Global Footer (Figma node 5:526) */}
      <HomeFooter />
    </div>
  );
}
