"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AntiGravityProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export default function AntiGravity({
  children,
  strength = 10,
  className,
}: AntiGravityProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * strength;
    const rotateY = (x - 0.5) * strength;
    setTransform(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.02)`
    );
  }

  function handleMouseLeave() {
    setTransform("");
  }

  return (
    <div
      ref={ref}
      className={cn("transition-transform duration-300 ease-out", className)}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
