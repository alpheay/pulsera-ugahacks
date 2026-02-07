import React, { useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 60 }}
    >
      <Text style={{ color: "#E2E8F0", fontSize: 28, fontWeight: "800", marginBottom: 20 }}>
        Settings
      </Text>

      {/* Profile */}
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#334155",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#F59E0B20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#F59E0B", fontWeight: "800", fontSize: 20 }}>ME</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#E2E8F0", fontWeight: "700", fontSize: 18 }}>
            Garcia Family
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>
            5 members | 4 watches active
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#10B98120",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "600" }}>ACTIVE</Text>
        </View>
      </View>

      {/* Notifications */}
      <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        NOTIFICATIONS
      </Text>
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#334155",
          overflow: "hidden",
        }}
      >
        <SettingToggle
          icon="notifications"
          label="Push Alerts"
          description="Get notified when a family member's status changes"
          value={alertsEnabled}
          onToggle={setAlertsEnabled}
          color="#F59E0B"
        />
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <SettingToggle
          icon="alert-circle"
          label="Critical Only"
          description="Only alert for critical health events"
          value={criticalOnly}
          onToggle={setCriticalOnly}
          color="#EF4444"
        />
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <SettingToggle
          icon="location"
          label="Location Sharing"
          description="Share your location with family members"
          value={locationSharing}
          onToggle={setLocationSharing}
          color="#3B82F6"
        />
      </View>

      {/* Watch */}
      <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        APPLE WATCH
      </Text>
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#334155",
          overflow: "hidden",
        }}
      >
        <SettingRow icon="watch" label="Pulsera Watch" value="Connected" valueColor="#10B981" />
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <SettingRow icon="heart" label="Health Monitoring" value="Active" valueColor="#EF4444" />
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <SettingRow icon="battery-full" label="Watch Battery" value="78%" valueColor="#10B981" />
      </View>

      {/* About */}
      <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        ABOUT
      </Text>
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#334155",
          overflow: "hidden",
        }}
      >
        <SettingRow icon="information-circle" label="Version" value="1.0.0" />
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <SettingRow icon="shield-checkmark" label="PulseNet AI" value="Active" valueColor="#F59E0B" />
      </View>
    </ScrollView>
  );
}

function SettingToggle({
  icon,
  label,
  description,
  value,
  onToggle,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  color: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 15, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: "#64748B", fontSize: 11, marginTop: 1 }}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#334155", true: color + "60" }}
        thumbColor={value ? color : "#94A3B8"}
      />
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}>
      <Ionicons name={icon} size={20} color="#94A3B8" />
      <Text style={{ color: "#E2E8F0", fontSize: 15, flex: 1 }}>{label}</Text>
      <Text style={{ color: valueColor || "#94A3B8", fontSize: 14, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}
