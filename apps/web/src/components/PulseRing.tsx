"use client";

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
      <div
        className={isCritical ? "animate-pulse-ring-fast" : "animate-pulse-ring"}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          opacity: 0.4,
        }}
      />
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
        <div
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: 0.8,
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
