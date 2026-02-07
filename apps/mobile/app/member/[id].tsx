import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
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

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<MemberLocation | null>(
    FAMILY_MEMBERS.find((m) => m.id === id) || null
  );

  useEffect(() => {
    if (!member) return;
    const interval = setInterval(() => {
      setMember((prev) => (prev ? simulateLocationUpdate(prev) : null));
    }, 3000);
    return () => clearInterval(interval);
  }, [member?.id]);

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
      <View style={{ flex: 1, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#94A3B8" }}>Member not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(member.health.status);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
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

        <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 24, marginTop: 12 }}>
          {member.name}
        </Text>
        <Text style={{ color: "#94A3B8", fontSize: 14 }}>
          {member.relation} | {member.locationName}
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
            iconColor="#EF4444"
            label="Heart Rate"
            value={`${member.health.heartRate}`}
            unit="BPM"
          />
          <VitalCard
            icon="pulse"
            iconColor="#F59E0B"
            label="HRV"
            value={`${member.health.hrv}`}
            unit="ms"
          />
          <VitalCard
            icon="thermometer"
            iconColor="#8B5CF6"
            label="Skin Temp"
            value={member.health.skinTemp.toFixed(1)}
            unit="°C"
          />
          <VitalCard
            icon="footsteps"
            iconColor="#3B82F6"
            label="Steps"
            value={member.health.steps.toLocaleString()}
            unit="today"
          />
          <VitalCard
            icon="analytics"
            iconColor="#F59E0B"
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
        <View
          style={{
            backgroundColor: "#1E293B",
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#334155",
          }}
        >
          <Ionicons name="watch-outline" size={40} color="#64748B" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>
            Watch not connected
          </Text>
          <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
            No health data available
          </Text>
        </View>
      )}

      {/* Location history */}
      <Text style={{ color: "#E2E8F0", fontWeight: "700", fontSize: 18, marginBottom: 12 }}>
        Location History
      </Text>
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#334155",
          overflow: "hidden",
        }}
      >
        {member.history.map((entry, i) => (
          <View key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: "#334155" }} />}
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
                  backgroundColor: "#F59E0B15",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="location" size={16} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#E2E8F0", fontWeight: "600", fontSize: 14 }}>
                  {entry.locationName}
                </Text>
                <Text style={{ color: "#64748B", fontSize: 11 }}>
                  {timeAgo(entry.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
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
    <View
      style={{
        backgroundColor: "#1E293B",
        borderRadius: 14,
        padding: 14,
        width: "48%",
        borderWidth: 1,
        borderColor: "#334155",
      }}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={{ color: "#64748B", fontSize: 11, marginTop: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
        <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 22 }}>{value}</Text>
        {unit ? <Text style={{ color: "#64748B", fontSize: 12 }}>{unit}</Text> : null}
      </View>
    </View>
  );
}
