"use client";

import { motion } from "framer-motion";

const STATUS_COLORS: Record<string, string> = {
  safe: "#10B981",
  elevated: "#F59E0B",
  warning: "#F97316",
  critical: "#EF4444",
};

interface PulseRingProps {
  status: string;
  size?: number;
  score?: number;
}

export default function PulseRing({ status, size = 64, score }: PulseRingProps) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.safe;
  const isCritical = status === "critical";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <motion.div
        animate={{
          scale: [1, isCritical ? 1.25 : 1.15, 1],
          opacity: [0.4, 0.1, 0.4],
        }}
        transition={{
          duration: isCritical ? 1 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          boxShadow: `0 0 ${size * 0.3}px ${color}40`,
        }}
      />
      {/* Middle ring */}
      <div
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: "50%",
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Core dot with glow */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 ${size * 0.15}px ${color}60`,
              `0 0 ${size * 0.3}px ${color}90`,
              `0 0 ${size * 0.15}px ${color}60`,
            ],
          }}
          transition={{
            duration: isCritical ? 0.8 : 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: 0.9,
          }}
        />
      </div>
      {score !== undefined && (
        <span
          className="absolute -bottom-5 text-xs font-mono"
          style={{ color }}
        >
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
