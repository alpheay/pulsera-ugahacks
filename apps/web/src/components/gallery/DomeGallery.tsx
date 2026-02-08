"use client";

import { cn } from "@/lib/utils";

interface DomeGalleryProps {
  items: React.ReactNode[];
  className?: string;
}

export default function DomeGallery({ items, className }: DomeGalleryProps) {
  const count = items.length;

  return (
    <div
      className={cn(
        "relative mx-auto flex flex-wrap items-end justify-center gap-4 py-8",
        className
      )}
      style={{ perspective: "1000px" }}
    >
      {items.map((item, i) => {
        const angle = (i / (count - 1 || 1)) * Math.PI;
        const x = Math.cos(angle) * 40;
        const y = -Math.sin(angle) * 60;
        const scale = 0.85 + Math.sin(angle) * 0.15;

        return (
          <div
            key={i}
            className="transition-all duration-500 ease-out"
            style={{
              transform: `translateX(${x}px) translateY(${y}px) scale(${scale})`,
              zIndex: Math.round(Math.sin(angle) * 10),
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
