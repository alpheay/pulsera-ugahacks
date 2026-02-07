import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  type Episode,
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";

interface EpisodeCardProps {
  episode: Episode;
  onPress: () => void;
  compact?: boolean;
}

export default function EpisodeCard({
  episode,
  onPress,
  compact = false,
}: EpisodeCardProps) {
  const phaseColor = getPhaseColor(episode.phase);
  const isActive = episode.phase !== "resolved";
  const borderColor = isActive ? phaseColor : "#334155";

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#1E293B",
        borderRadius: 14,
        padding: compact ? 12 : 16,
        marginBottom: 10,
        borderWidth: isActive ? 1.5 : 1,
        borderColor,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: phaseColor,
            }}
          />
          <Text
            style={{
              color: "#E2E8F0",
              fontSize: compact ? 14 : 16,
              fontWeight: "700",
            }}
          >
            {episode.memberName}
          </Text>
          <View
            style={{
              backgroundColor: phaseColor + "20",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                color: phaseColor,
                fontSize: 10,
                fontWeight: "600",
              }}
            >
              {getPhaseLabel(episode.phase).toUpperCase()}
            </Text>
          </View>
        </View>

        {episode.escalationLevel > 0 && (
          <View
            style={{
              backgroundColor: "#EF444420",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "700" }}>
              L{episode.escalationLevel}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      {!compact && (
        <View style={{ marginTop: 10 }}>
          {/* Trigger vitals */}
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="heart" size={14} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>
                {episode.triggerData.heartRate}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 10 }}>BPM</Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="pulse" size={14} color="#F59E0B" />
              <Text style={{ color: "#F59E0B", fontWeight: "600", fontSize: 13 }}>
                {episode.triggerData.hrv}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 10 }}>HRV</Text>
            </View>
            {episode.severityScore > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="warning" size={14} color={phaseColor} />
                <Text style={{ color: phaseColor, fontWeight: "600", fontSize: 13 }}>
                  {(episode.severityScore * 100).toFixed(0)}%
                </Text>
              </View>
            )}
          </View>

          {/* Fusion result */}
          {episode.fusionResult && (
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 11,
                marginTop: 8,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {episode.fusionResult.explanation}
            </Text>
          )}

          {/* Resolution */}
          {episode.resolution && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "600" }}>
                {episode.resolution.replace(/_/g, " ")}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: compact ? 6 : 10,
        }}
      >
        <Text style={{ color: "#64748B", fontSize: 10 }}>
          {episode.timeline.length} events
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#64748B", fontSize: 10 }}>
            {formatTime(episode.createdAt)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#64748B" />
        </View>
      </View>
    </Pressable>
  );
}

function formatTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
