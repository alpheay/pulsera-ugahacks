"use client";

import { cn } from "@/lib/utils";

interface BentoItem {
  size: "small" | "medium" | "large";
  content: React.ReactNode;
  className?: string;
}

interface MagicBentoProps {
  items: BentoItem[];
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-1 row-span-1 md:col-span-2 md:row-span-1",
  large: "col-span-1 row-span-1 md:col-span-2 md:row-span-2",
};

export default function MagicBento({ items, className }: MagicBentoProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[180px]",
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-border bg-card p-4 overflow-hidden transition-all hover:border-primary/30",
            SIZE_CLASSES[item.size],
            item.className
          )}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
