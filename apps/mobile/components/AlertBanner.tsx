/**
 * AlertBanner — a dismissable notification banner for alerts.
 *
 * Severity determines the color:
 *   "critical" -> red
 *   "warning"  -> amber / orange
 *   "info"     -> blue-ish muted
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import GlassCard from "@/components/GlassCard";

interface AlertBannerProps {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  onDismiss: (id: string) => void;
}

const severityConfig = {
  critical: {
    bg: `${colors.critical}18`,
    border: colors.critical,
    icon: "alert-circle" as const,
    iconColor: colors.critical,
  },
  warning: {
    bg: `${colors.primary}18`,
    border: colors.primary,
    icon: "warning" as const,
    iconColor: colors.primary,
  },
  info: {
    bg: `${colors.textMuted}12`,
    border: colors.textMuted,
    icon: "information-circle" as const,
    iconColor: colors.textMuted,
  },
};

export default function AlertBanner({
  id,
  severity,
  title,
  description,
  onDismiss,
}: AlertBannerProps) {
  const cfg = severityConfig[severity] || severityConfig.info;

  return (
    <GlassCard
      padding={12}
      borderRadius={12}
      borderColor={cfg.border}
      style={{ marginBottom: 8, borderLeftWidth: 3, borderLeftColor: cfg.border }}
    >
      <View className="flex-row items-start">
        <Ionicons
          name={cfg.icon}
          size={20}
          color={cfg.iconColor}
          style={{ marginTop: 1, marginRight: 8 }}
        />
        <View className="flex-1">
          <Text
            className="font-semibold"
            style={{ color: colors.text, fontSize: 14 }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5"
            style={{ color: colors.textMuted, fontSize: 12 }}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
        <Pressable
          onPress={() => onDismiss(id)}
          hitSlop={12}
          className="ml-2"
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </GlassCard>
  );
}
