import React, { useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  timeAgo,
  getStatusColor,
  getBatteryColor,
} from "@/lib/simulatedData";
import {
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";
import { useMembersStore } from "@/lib/membersStore";
import GlassCard from "@/components/GlassCard";
import { glass } from "@/lib/theme";

export default function MemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = useMembersStore((s) => s.members.find((m) => m.id === id) ?? null);

  const ringScale = useSharedValue(1);
  useEffect(() => {
    ringScale.value = withRepeat(withTiming(1.3, { duration: 1500 }), -1, true);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 2 - ringScale.value,
  }));

  if (!member) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#a1a1a1" }}>Member not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(member.health.status);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ padding: 20, paddingTop: 100, paddingBottom: 40 }}
    >
      {/* Pulse ring + avatar */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 130,
                height: 130,
                borderRadius: 65,
                borderWidth: 2,
                borderColor: statusColor,
              },
              ringStyle,
            ]}
          />
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: statusColor + "20",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: statusColor + "50",
            }}
          >
            <Text style={{ color: statusColor, fontWeight: "800", fontSize: 32 }}>
              {member.avatar}
            </Text>
          </View>
        </View>

        <Text style={{ color: "#fafafa", fontWeight: "800", fontSize: 24, marginTop: 12 }}>
          {member.name}
        </Text>
        <Text style={{ color: "#a1a1a1", fontSize: 14 }}>
          {member.relation} | {member.locationName}
        </Text>
        <Text style={{ color: "#737373", fontSize: 11, marginTop: 4 }}>
          Updated {timeAgo(member.lastUpdated)}
        </Text>
        <View
          style={{
            backgroundColor: statusColor + "20",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          <Text style={{ color: statusColor, fontWeight: "700", fontSize: 12 }}>
            {member.health.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Health vitals grid */}
      {member.isWearingWatch ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          <VitalCard
            icon="heart"
            iconColor="#ff6467"
            label="Heart Rate"
            value={`${member.health.heartRate}`}
            unit="BPM"
          />
          <VitalCard
            icon="pulse"
            iconColor="#fe9a00"
            label="HRV"
            value={`${Number(member.health.hrv).toFixed(1)}`}
            unit="ms"
          />
          <VitalCard
            icon="thermometer"
            iconColor="#ad46ff"
            label="Skin Temp"
            value={member.health.skinTemp.toFixed(1)}
            unit="°C"
          />
          <VitalCard
            icon="footsteps"
            iconColor="#1447e6"
            label="Steps"
            value={member.health.steps.toLocaleString()}
            unit="today"
          />
          <VitalCard
            icon="analytics"
            iconColor="#fe9a00"
            label="Anomaly Score"
            value={`${(member.health.anomalyScore * 100).toFixed(0)}%`}
            unit=""
          />
          <VitalCard
            icon="battery-full"
            iconColor={getBatteryColor(member.batteryLevel)}
            label="Battery"
            value={`${member.batteryLevel}%`}
            unit=""
          />
        </View>
      ) : (
        <GlassCard padding={24} borderRadius={16} style={{ marginBottom: 20, alignItems: "center" }}>
          <Ionicons name="watch-outline" size={40} color="#737373" />
          <Text style={{ color: "#a1a1a1", fontSize: 14, marginTop: 8 }}>
            Watch not connected
          </Text>
          <Text style={{ color: "#737373", fontSize: 12, marginTop: 4 }}>
            No health data available
          </Text>
        </GlassCard>
      )}

      {/* Episode Alert Banner */}
      {member.activeEpisode && member.activeEpisode.phase !== "resolved" && (() => {
        const episode = member.activeEpisode;
        const episodePhaseColor = getPhaseColor(episode.phase);
        return (
          <GlassCard
            padding={14}
            borderRadius={12}
            borderColor={episodePhaseColor + "40"}
            glow
            style={{ marginBottom: 20 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color={episodePhaseColor} />
                <View>
                  <Text style={{ color: episodePhaseColor, fontSize: 14, fontWeight: "700" }}>
                    {getPhaseLabel(episode.phase)}
                  </Text>
                  <Text style={{ color: "#a1a1a1", fontSize: 11, marginTop: 2 }}>
                    Severity: {(episode.severityScore * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/episode/[id]",
                    params: { id: episode.id, data: JSON.stringify(episode) },
                  })
                }
                style={{
                  backgroundColor: episodePhaseColor + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: episodePhaseColor, fontSize: 12, fontWeight: "600" }}>
                  View Details
                </Text>
              </Pressable>
            </View>

            {/* Watch biometrics from episode trigger */}
            <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="heart" size={14} color="#ff6467" />
                <Text style={{ color: "#ff6467", fontWeight: "700", fontSize: 14 }}>
                  {episode.triggerData.heartRate}
                </Text>
                <Text style={{ color: "#737373", fontSize: 10 }}>BPM</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="pulse" size={14} color="#fe9a00" />
                <Text style={{ color: "#fe9a00", fontWeight: "600", fontSize: 13 }}>
                  {Number(episode.triggerData.hrv).toFixed(1)}
                </Text>
                <Text style={{ color: "#737373", fontSize: 10 }}>HRV</Text>
              </View>
            </View>

            {/* Check-In button during visual_check phase */}
            {episode.phase === "visual_check" && (
              <Pressable
                onPress={() => router.push("/checkin")}
                style={{
                  backgroundColor: "#1447e6",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                  Check In Requested
                </Text>
              </Pressable>
            )}
          </GlassCard>
        );
      })()}

      {/* Location history */}
      <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 18, marginBottom: 12 }}>
        Location History
      </Text>
      <GlassCard padding={0} borderRadius={16}>
        {member.history.map((entry, i) => (
          <View key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#fe9a0015",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="location" size={16} color="#fe9a00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fafafa", fontWeight: "600", fontSize: 14 }}>
                  {entry.locationName}
                </Text>
                <Text style={{ color: "#737373", fontSize: 11 }}>
                  {timeAgo(entry.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

function VitalCard({
  icon,
  iconColor,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <GlassCard borderRadius={glass.borderRadiusSmall} padding={14} style={{ width: "48%" }}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={{ color: "#737373", fontSize: 11, marginTop: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <Text style={{ color: "#fafafa", fontWeight: "800", fontSize: 22 }}>{value}</Text>
        {unit ? <Text style={{ color: "#737373", fontSize: 12 }}>{unit}</Text> : null}
      </View>
    </GlassCard>
  );
}
