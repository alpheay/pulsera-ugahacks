"use client";

import { Parallax } from "react-scroll-parallax";
import { cn } from "@/lib/utils";

interface ScrollFloatProps {
  children: React.ReactNode;
  speed?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export default function ScrollFloat({
  children,
  speed = 10,
  direction = "up",
  className,
}: ScrollFloatProps) {
  const getTranslate = () => {
    switch (direction) {
      case "up":
        return { translateY: [speed, -speed] as [number, number] };
      case "down":
        return { translateY: [-speed, speed] as [number, number] };
      case "left":
        return { translateX: [speed, -speed] as [number, number] };
      case "right":
        return { translateX: [-speed, speed] as [number, number] };
    }
  };

  return (
    <Parallax {...getTranslate()} className={cn(className)}>
      {children}
    </Parallax>
  );
}
