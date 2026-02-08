"use client";

import { useEffect, useRef } from "react";

interface FloatingLinesProps {
  lineCount?: number;
  color?: string;
  opacity?: number;
}

export default function FloatingLines({
  lineCount = 20,
  color = "#F59E0B",
  opacity = 0.06,
}: FloatingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    interface Line {
      x: number;
      y: number;
      length: number;
      angle: number;
      speed: number;
      drift: number;
      thickness: number;
    }

    const lines: Line[] = Array.from({ length: lineCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      length: 80 + Math.random() * 200,
      angle: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 0.002,
      thickness: 0.5 + Math.random() * 1.5,
    }));

    let animId: number;

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      for (const line of lines) {
        line.angle += line.drift;
        line.x += Math.cos(line.angle) * line.speed;
        line.y += Math.sin(line.angle) * line.speed;

        if (line.x < -line.length) line.x = w + line.length;
        if (line.x > w + line.length) line.x = -line.length;
        if (line.y < -line.length) line.y = h + line.length;
        if (line.y > h + line.length) line.y = -line.length;

        const endX = line.x + Math.cos(line.angle) * line.length;
        const endY = line.y + Math.sin(line.angle) * line.length;

        const gradient = ctx!.createLinearGradient(line.x, line.y, endX, endY);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, "transparent");

        ctx!.beginPath();
        ctx!.moveTo(line.x, line.y);
        ctx!.lineTo(endX, endY);
        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = line.thickness;
        ctx!.globalAlpha = opacity;
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      }

      animId = requestAnimationFrame(draw);
    }

    function handleResize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    window.addEventListener("resize", handleResize);
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [lineCount, color, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
