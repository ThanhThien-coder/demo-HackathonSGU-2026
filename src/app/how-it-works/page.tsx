import { Navbar } from "@/components/layout/Navbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import {
  HowItWorksHero,
  FourStepsSection,
  ComparisonSection,
  FaqSection,
  CtaBanner,
} from "@/components/how-it-works";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:1525) */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center">
        {/* 2. Hero Section: Biến đống code xa lạ thành kiến thức dễ ợt (Figma node 5:1279) */}
        <HowItWorksHero />

        {/* 3. 4 Steps Section: 4 Bước siêu đơn giản (Figma node 5:1294) */}
        <FourStepsSection />

        {/* 4. Comparison Section: Khác biệt rõ rệt (Figma node 5:1400) */}
        <ComparisonSection />

        {/* 5. FAQ & Dark CTA Banner Section (Figma node 5:1457) */}
        <section className="w-full max-w-[1040px] mx-auto px-4 sm:px-12 py-16 sm:py-24 flex flex-col gap-16">
          <FaqSection />
          <CtaBanner />
        </section>
      </main>

      {/* 6. Global Footer (Figma node 5:1516) */}
      <HomeFooter />
    </div>
  );
}
