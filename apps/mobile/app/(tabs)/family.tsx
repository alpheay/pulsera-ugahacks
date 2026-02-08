import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  FAMILY_MEMBERS,
  simulateLocationUpdate,
  timeAgo,
  getStatusColor,
  getBatteryColor,
  type MemberLocation,
} from "@/lib/simulatedData";
import {
  type Episode,
  createEpisode,
  simulateEpisodeProgression,
  generatePresageData,
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";

export default function FamilyScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberLocation[]>(FAMILY_MEMBERS);
  const [demoEpisode, setDemoEpisode] = useState<Episode | null>(null);

  const [demoMemberId, setDemoMemberId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMembers((prev) =>
        prev.map((m) => {
          const updated = simulateLocationUpdate(m);
          if (m.id === demoMemberId && demoEpisode) {
            return { ...updated, activeEpisode: demoEpisode };
          }
          return { ...updated, activeEpisode: undefined };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [demoEpisode, demoMemberId]);

  // Auto-trigger demo episode for a random watch-wearing member after 5 seconds
  useEffect(() => {
    const watchMembers = FAMILY_MEMBERS.filter((m) => m.isWearingWatch && m.id !== "me");
    const member = watchMembers[Math.floor(Math.random() * watchMembers.length)];
    const timer = setTimeout(() => {
      const hr = 130 + Math.floor(Math.random() * 25);
      const hrv = 18 + Math.floor(Math.random() * 10);
      const episode = createEpisode(member.id, member.name, hr, hrv);
      setDemoMemberId(member.id);
      setDemoEpisode(episode);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-progress demo episode
  useEffect(() => {
    if (!demoEpisode || demoEpisode.phase === "resolved") return;

    const timer = setTimeout(() => {
      let updated = simulateEpisodeProgression(demoEpisode);
      if (updated.phase === "visual_check" && !updated.presageData) {
        updated = { ...updated, presageData: generatePresageData(true) };
      }
      setDemoEpisode(updated);
    }, 6000);
    return () => clearTimeout(timer);
  }, [demoEpisode]);

  const allSafe = members.every(
    (m) => !m.isWearingWatch || (m.health.status === "safe" && !m.activeEpisode)
  );

  const hasActiveEpisode = members.some(
    (m) => m.activeEpisode && m.activeEpisode.phase !== "resolved"
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Header */}
      <Text style={{ color: "#fafafa", fontSize: 28, fontWeight: "800", marginBottom: 4 }}>
        Saha Ring
      </Text>
      <Text style={{ color: "#a1a1a1", fontSize: 14, marginBottom: 20 }}>
        {members.length} members | {members.filter((m) => m.isWearingWatch).length} watches active
      </Text>

      {/* Status banner */}
      <View
        style={{
          backgroundColor: hasActiveEpisode
            ? "#ff646715"
            : allSafe
              ? "#00bc7d15"
              : "#fe9a0015",
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          borderLeftWidth: 3,
          borderLeftColor: hasActiveEpisode
            ? "#ff6467"
            : allSafe
              ? "#00bc7d"
              : "#fe9a00",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Ionicons
          name={
            hasActiveEpisode
              ? "alert-circle"
              : allSafe
                ? "shield-checkmark"
                : "warning"
          }
          size={22}
          color={
            hasActiveEpisode
              ? "#ff6467"
              : allSafe
                ? "#00bc7d"
                : "#fe9a00"
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 14 }}>
            {hasActiveEpisode
              ? "Active episode detected"
              : allSafe
                ? "Everyone is safe"
                : "Elevated activity detected"}
          </Text>
          <Text style={{ color: "#a1a1a1", fontSize: 12 }}>
            {hasActiveEpisode
              ? "An episode is in progress — check the Alerts tab"
              : allSafe
                ? "All watch-connected members show normal vitals"
                : "One or more ring members show elevated heart rate"}
          </Text>
        </View>
      </View>

      {/* Member cards */}
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onPress={() => router.push(`/member/${member.id}`)}
          onCheckIn={() => router.push("/checkin")}
          onViewEpisode={(ep) =>
            router.push({
              pathname: "/episode/[id]",
              params: { id: ep.id, data: JSON.stringify(ep) },
            })
          }
        />
      ))}
    </ScrollView>
  );
}

function MemberCard({
  member,
  onPress,
  onCheckIn,
  onViewEpisode,
}: {
  member: MemberLocation;
  onPress: () => void;
  onCheckIn: () => void;
  onViewEpisode: (episode: Episode) => void;
}) {
  const heartScale = useSharedValue(1);
  const episodePulse = useSharedValue(1);

  const episode = member.activeEpisode;
  const hasEpisode = episode && episode.phase !== "resolved";

  useEffect(() => {
    if (member.isWearingWatch && member.health.heartRate > 0) {
      const interval = Math.max(400, Math.min(1200, 60000 / member.health.heartRate));
      heartScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: interval * 0.3 }),
          withTiming(1, { duration: interval * 0.3 })
        ),
        -1,
        false
      );
    }
  }, [member.health.heartRate, member.isWearingWatch]);

  useEffect(() => {
    if (hasEpisode) {
      episodePulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    }
  }, [hasEpisode]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const cardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hasEpisode ? episodePulse.value : 1 }],
  }));

  const statusColor = getStatusColor(member.health.status);
  const episodePhaseColor = episode ? getPhaseColor(episode.phase) : statusColor;

  return (
    <Animated.View style={cardPulseStyle}>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: "#171717",
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: hasEpisode ? 1.5 : 1,
          borderColor: hasEpisode ? episodePhaseColor : "rgba(255, 255, 255, 0.10)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Avatar */}
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: statusColor + "25",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: statusColor + "60",
              marginRight: 14,
            }}
          >
            <Text style={{ color: statusColor, fontWeight: "800", fontSize: 16 }}>
              {member.avatar}
            </Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 16 }}>
                {member.name}
              </Text>
              <View
                style={{
                  backgroundColor: statusColor + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: statusColor, fontSize: 10, fontWeight: "600" }}>
                  {member.health.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={{ color: "#a1a1a1", fontSize: 12, marginTop: 2 }}>
              {member.relation} | {member.locationName}
            </Text>

            {/* Health row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
              {member.isWearingWatch && member.health.heartRate > 0 ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Animated.View style={heartStyle}>
                      <Ionicons name="heart" size={14} color="#ff6467" />
                    </Animated.View>
                    <Text style={{ color: "#ff6467", fontWeight: "700", fontSize: 14 }}>
                      {member.health.heartRate}
                    </Text>
                    <Text style={{ color: "#737373", fontSize: 10 }}>BPM</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="pulse" size={14} color="#fe9a00" />
                    <Text style={{ color: "#fe9a00", fontWeight: "600", fontSize: 13 }}>
                      {Number(member.health.hrv).toFixed(1)}
                    </Text>
                    <Text style={{ color: "#737373", fontSize: 10 }}>HRV</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="footsteps" size={14} color="#1447e6" />
                    <Text style={{ color: "#1447e6", fontWeight: "600", fontSize: 13 }}>
                      {member.health.steps.toLocaleString()}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={{ color: "#737373", fontSize: 12, fontStyle: "italic" }}>
                  Watch not connected
                </Text>
              )}
            </View>
          </View>

          {/* Right side - battery + time */}
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons
                name={
                  member.batteryLevel > 50
                    ? "battery-full"
                    : member.batteryLevel > 20
                    ? "battery-half"
                    : "battery-dead"
                }
                size={16}
                color={getBatteryColor(member.batteryLevel)}
              />
              <Text
                style={{
                  color: getBatteryColor(member.batteryLevel),
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {member.batteryLevel}%
              </Text>
            </View>
            <Text style={{ color: "#737373", fontSize: 10 }}>
              {timeAgo(member.lastUpdated)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#737373" />
          </View>
        </View>

        {/* Episode Alert Banner */}
        {hasEpisode && episode && (
          <View style={{ marginTop: 12 }}>
            <View
              style={{
                backgroundColor: episodePhaseColor + "15",
                borderRadius: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: episodePhaseColor + "30",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="alert-circle" size={14} color={episodePhaseColor} />
                  <Text
                    style={{
                      color: episodePhaseColor,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {getPhaseLabel(episode.phase)}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onViewEpisode(episode);
                  }}
                >
                  <Text style={{ color: "#a1a1a1", fontSize: 11 }}>View Details</Text>
                </Pressable>
              </View>

              {/* Check-In button during visual_check phase */}
              {episode.phase === "visual_check" && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onCheckIn();
                  }}
                  style={{
                    backgroundColor: "#1447e6",
                    borderRadius: 8,
                    padding: 10,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    Check In Requested
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
