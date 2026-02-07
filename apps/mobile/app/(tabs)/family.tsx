import React, { useEffect, useState } from "react";
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

export default function FamilyScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberLocation[]>(FAMILY_MEMBERS);

  useEffect(() => {
    const interval = setInterval(() => {
      setMembers((prev) => prev.map(simulateLocationUpdate));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const allSafe = members.every(
    (m) => !m.isWearingWatch || m.health.status === "safe"
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Header */}
      <Text style={{ color: "#E2E8F0", fontSize: 28, fontWeight: "800", marginBottom: 4 }}>
        Garcia Family
      </Text>
      <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 20 }}>
        {members.length} members | {members.filter((m) => m.isWearingWatch).length} watches active
      </Text>

      {/* Status banner */}
      <View
        style={{
          backgroundColor: allSafe ? "#10B98115" : "#F59E0B15",
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          borderLeftWidth: 3,
          borderLeftColor: allSafe ? "#10B981" : "#F59E0B",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Ionicons
          name={allSafe ? "shield-checkmark" : "warning"}
          size={22}
          color={allSafe ? "#10B981" : "#F59E0B"}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#E2E8F0", fontWeight: "700", fontSize: 14 }}>
            {allSafe ? "Everyone is safe" : "Elevated activity detected"}
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>
            {allSafe
              ? "All watch-connected members show normal vitals"
              : "One or more members show elevated heart rate"}
          </Text>
        </View>
      </View>

      {/* Member cards */}
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onPress={() => router.push(`/member/${member.id}`)}
        />
      ))}
    </ScrollView>
  );
}

function MemberCard({
  member,
  onPress,
}: {
  member: MemberLocation;
  onPress: () => void;
}) {
  const heartScale = useSharedValue(1);

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

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const statusColor = getStatusColor(member.health.status);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#1E293B",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#334155",
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
            <Text style={{ color: "#E2E8F0", fontWeight: "700", fontSize: 16 }}>
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

          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
            {member.relation} | {member.locationName}
          </Text>

          {/* Health row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
            {member.isWearingWatch && member.health.heartRate > 0 ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Animated.View style={heartStyle}>
                    <Ionicons name="heart" size={14} color="#EF4444" />
                  </Animated.View>
                  <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>
                    {member.health.heartRate}
                  </Text>
                  <Text style={{ color: "#64748B", fontSize: 10 }}>BPM</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="pulse" size={14} color="#F59E0B" />
                  <Text style={{ color: "#F59E0B", fontWeight: "600", fontSize: 13 }}>
                    {member.health.hrv}
                  </Text>
                  <Text style={{ color: "#64748B", fontSize: 10 }}>HRV</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="footsteps" size={14} color="#3B82F6" />
                  <Text style={{ color: "#3B82F6", fontWeight: "600", fontSize: 13 }}>
                    {member.health.steps.toLocaleString()}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ color: "#64748B", fontSize: 12, fontStyle: "italic" }}>
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
          <Text style={{ color: "#64748B", fontSize: 10 }}>
            {timeAgo(member.lastUpdated)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#64748B" />
        </View>
      </View>
    </Pressable>
  );
}
