"use client";

import React, { useEffect, useState } from "react";
import { Lottie } from "lottie-react";

export interface HeroAnimationProps {
  className?: string;
}

export function HeroAnimation({ className }: HeroAnimationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[257px] w-full max-w-[480px] items-center justify-center">
        <div className="size-10 rounded-full border-2 border-[#ff9640]/30 border-t-[#ff9640] animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-[260px] w-full max-w-[480px] items-center justify-center ${
        className || ""
      }`}
    >
      <Lottie
        src="/assets/animation-robot.json"
        loop
        autoplay
        className="h-full w-full object-contain drop-shadow-[0px_10px_20px_rgba(255,150,64,0.12)]"
      />
    </div>
  );
}
