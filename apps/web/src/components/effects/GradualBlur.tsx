"use client";

import { cn } from "@/lib/utils";

interface GradualBlurProps {
  direction?: "top" | "bottom";
  blurAmount?: number;
  height?: string;
  className?: string;
}

export default function GradualBlur({
  direction = "bottom",
  blurAmount = 10,
  height = "120px",
  className,
}: GradualBlurProps) {
  const isTop = direction === "top";

  return (
    <div
      className={cn("pointer-events-none absolute left-0 right-0 z-10", className)}
      style={{
        [isTop ? "top" : "bottom"]: 0,
        height,
        background: isTop
          ? `linear-gradient(to bottom, var(--background), transparent)`
          : `linear-gradient(to top, var(--background), transparent)`,
        backdropFilter: `blur(${blurAmount}px)`,
        WebkitBackdropFilter: `blur(${blurAmount}px)`,
        maskImage: isTop
          ? "linear-gradient(to bottom, black, transparent)"
          : "linear-gradient(to top, black, transparent)",
        WebkitMaskImage: isTop
          ? "linear-gradient(to bottom, black, transparent)"
          : "linear-gradient(to top, black, transparent)",
      }}
    />
  );
}
