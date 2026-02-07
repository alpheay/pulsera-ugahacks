"use client";

import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}

export default function GradientText({
  children,
  className,
  colors = ["#F59E0B", "#F97316", "#EF4444", "#F59E0B"],
}: GradientTextProps) {
  return (
    <span
      className={cn("animate-gradient-text font-bold", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, ${colors.join(", ")})`,
      }}
    >
      {children}
    </span>
  );
}
