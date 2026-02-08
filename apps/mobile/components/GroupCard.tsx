/**
 * GroupCard — summary card for a group in the community list.
 *
 * Shows group name, type badge, member count, and an overall status indicator.
 * Calls onPress when tapped.
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusIndicator from "./StatusIndicator";
import { colors, type StatusLevel } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";

interface GroupCardProps {
  name: string;
  type: "family" | "community";
  memberCount: number;
  status: StatusLevel;
  onPress: () => void;
}

export default function GroupCard({
  name,
  type,
  memberCount,
  status,
  onPress,
}: GroupCardProps) {
  const isFamily = type === "family";
  const badgeBg = isFamily ? colors.primary : colors.safe;
  const badgeLabel = isFamily ? "Family" : "Community";
  const iconName = isFamily ? "people" : "earth";

  return (
    <GlassCard padding={0} borderRadius={16} style={{ marginBottom: 12 }}>
    <Pressable
      onPress={onPress}
      className="p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        {/* Left section */}
        <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
          <View
            className="items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 44,
              backgroundColor: `${badgeBg}20`,
            }}
          >
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={22}
              color={badgeBg}
            />
          </View>

          <View className="flex-1">
            <Text
              className="font-bold"
              style={{ color: colors.text, fontSize: 16 }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
              {/* Type badge */}
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${badgeBg}25` }}
              >
                <Text style={{ color: badgeBg, fontSize: 11, fontWeight: "600" }}>
                  {badgeLabel}
                </Text>
              </View>

              {/* Member count */}
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </Text>
            </View>
          </View>
        </View>

        {/* Right section: status + chevron */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <StatusIndicator status={status} />
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
    </GlassCard>
  );
}
