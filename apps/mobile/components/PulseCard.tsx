/**
 * PulseCard — member health card showing name, heart rate, status, and anomaly score.
 */

import React from "react";
import { View, Text } from "react-native";
import HeartRateDisplay from "./HeartRateDisplay";
import StatusIndicator from "./StatusIndicator";
import { colors, type StatusLevel } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";

interface PulseCardProps {
  name: string;
  displayName?: string | null;
  heartRate: number | null;
  status: StatusLevel;
  anomalyScore: number;
  lastUpdated?: string | null;
}

export default function PulseCard({
  name,
  displayName,
  heartRate,
  status,
  anomalyScore,
  lastUpdated,
}: PulseCardProps) {
  const clampedScore = Math.min(1, Math.max(0, anomalyScore));
  const barColor =
    clampedScore > 0.8
      ? colors.critical
      : clampedScore > 0.5
        ? colors.elevated
        : colors.safe;

  const timeLabel = lastUpdated
    ? formatRelativeTime(lastUpdated)
    : "No data";

  return (
    <GlassCard padding={16} borderRadius={16}>
      {/* Header: name + status dot */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 mr-2">
          <Text
            className="font-bold"
            style={{ color: colors.text, fontSize: 16 }}
            numberOfLines={1}
          >
            {displayName || name}
          </Text>
          {displayName && displayName !== name && (
            <Text
              style={{ color: colors.textMuted, fontSize: 12 }}
              numberOfLines={1}
            >
              {name}
            </Text>
          )}
        </View>
        <StatusIndicator status={status} size={14} />
      </View>

      {/* Heart rate */}
      <HeartRateDisplay heartRate={heartRate} size="sm" />

      {/* Anomaly score bar */}
      <View className="mt-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
            Anomaly
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
            {(clampedScore * 100).toFixed(0)}%
          </Text>
        </View>
        <View
          className="rounded-full overflow-hidden"
          style={{ height: 4, backgroundColor: colors.border }}
        >
          <View
            className="rounded-full"
            style={{
              height: 4,
              width: `${clampedScore * 100}%`,
              backgroundColor: barColor,
            }}
          />
        </View>
      </View>

      {/* Last updated */}
      <Text
        className="mt-2"
        style={{ color: colors.textMuted, fontSize: 10 }}
      >
        {timeLabel}
      </Text>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return "Unknown";
  }
}
