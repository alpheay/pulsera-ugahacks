/**
 * StatusIndicator — a small colored dot that reflects health status.
 *
 * Props:
 *   status  — "normal" | "elevated" | "critical" | "unknown" | "no_data" | "safe"
 *   size    — diameter in pixels (default 12)
 */

import React from "react";
import { View } from "react-native";
import { statusColor, type StatusLevel } from "@/lib/theme";

interface StatusIndicatorProps {
  status: StatusLevel;
  size?: number;
}

export default function StatusIndicator({
  status,
  size = 12,
}: StatusIndicatorProps) {
  const color = statusColor(status);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 4,
      }}
    />
  );
}
