"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CircularGalleryProps {
  items: React.ReactNode[];
  radius?: number;
  autoRotate?: boolean;
  className?: string;
}

export default function CircularGallery({
  items,
  radius = 300,
  autoRotate = true,
  className,
}: CircularGalleryProps) {
  const [rotation, setRotation] = useState(0);
  const angleStep = 360 / items.length;

  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setRotation((r) => r + 0.3);
    }, 50);
    return () => clearInterval(interval);
  }, [autoRotate]);

  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{
        width: radius * 2 + 200,
        height: radius + 250,
        perspective: "1200px",
      }}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transformStyle: "preserve-3d",
          transform: `translateX(-50%) translateY(-50%) rotateY(${rotation}deg)`,
          transition: autoRotate ? undefined : "transform 0.5s ease-out",
        }}
      >
        {items.map((item, i) => {
          const angle = angleStep * i;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                left: "-140px",
                top: "-100px",
              }}
            >
              <div
                style={{
                  transform: `rotateY(-${angle + rotation}deg)`,
                  width: 280,
                  transition: "transform 0.1s",
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
