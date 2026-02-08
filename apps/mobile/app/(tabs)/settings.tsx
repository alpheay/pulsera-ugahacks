import React, { useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "@/components/GlassCard";
import { glass } from "@/lib/theme";

export default function SettingsScreen() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 100 }}
    >
      <Text style={{ color: "#fafafa", fontSize: 28, fontWeight: "800", marginBottom: 20 }}>
        Settings
      </Text>

      {/* Profile */}
      <GlassCard elevated padding={16} borderRadius={16} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#e5e5e520",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#e5e5e5", fontWeight: "800", fontSize: 20 }}>ME</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 18 }}>
            Saha Ring
          </Text>
          <Text style={{ color: "#a1a1a1", fontSize: 13 }}>
            5 members | 4 watches active
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#00bc7d20",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#00bc7d", fontSize: 11, fontWeight: "600" }}>ACTIVE</Text>
        </View>
        </View>
      </GlassCard>

      {/* Notifications */}
      <Text style={{ color: "#a1a1a1", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        NOTIFICATIONS
      </Text>
      <GlassCard padding={0} borderRadius={16} style={{ marginBottom: 20 }}>
        <SettingToggle
          icon="notifications"
          label="Push Pulses"
          description="Get notified when a family member's status changes"
          value={alertsEnabled}
          onToggle={setAlertsEnabled}
          color="#fe9a00"
        />
        <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />
        <SettingToggle
          icon="alert-circle"
          label="Critical Only"
          description="Only alert for critical health events"
          value={criticalOnly}
          onToggle={setCriticalOnly}
          color="#ff6467"
        />
        <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />
        <SettingToggle
          icon="location"
          label="Location Sharing"
          description="Share your location with family members"
          value={locationSharing}
          onToggle={setLocationSharing}
          color="#1447e6"
        />
      </GlassCard>

      {/* Watch */}
      <Text style={{ color: "#a1a1a1", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        APPLE WATCH
      </Text>
      <GlassCard padding={0} borderRadius={16} style={{ marginBottom: 20 }}>
        <SettingRow icon="watch" label="Pulsera Watch" value="Connected" valueColor="#00bc7d" />
        <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />
        <SettingRow icon="heart" label="Health Monitoring" value="Active" valueColor="#ff6467" />
        <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />
        <SettingRow icon="battery-full" label="Watch Battery" value="78%" valueColor="#00bc7d" />
      </GlassCard>

      {/* About */}
      <Text style={{ color: "#a1a1a1", fontSize: 12, fontWeight: "600", marginBottom: 8, marginLeft: 4 }}>
        ABOUT
      </Text>
      <GlassCard padding={0} borderRadius={16} style={{ marginBottom: 20 }}>
        <SettingRow icon="information-circle" label="Version" value="1.0.0" />
        <View style={{ height: 1, backgroundColor: glass.borderSubtle }} />
        <SettingRow icon="shield-checkmark" label="PulseNet AI" value="Active" valueColor="#fe9a00" />
      </GlassCard>
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
        <Text style={{ color: "#fafafa", fontSize: 15, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: "#737373", fontSize: 11, marginTop: 1 }}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(255, 255, 255, 0.10)", true: color + "60" }}
        thumbColor={value ? color : "#a1a1a1"}
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
      <Ionicons name={icon} size={20} color="#a1a1a1" />
      <Text style={{ color: "#fafafa", fontSize: 15, flex: 1 }}>{label}</Text>
      <Text style={{ color: valueColor || "#a1a1a1", fontSize: 14, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}
