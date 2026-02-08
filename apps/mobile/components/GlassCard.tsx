/**
 * GlassCard — cheap glass surface (no blur).
 *
 * Semi-transparent bg + diagonal LinearGradient overlay + glass border + glow shadow.
 * Safe to use in scrollable lists with 10-20 instances on screen.
 */

import React from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { glass } from "@/lib/theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  glow?: boolean;
  borderRadius?: number;
}

export default function GlassCard({
  children,
  style,
  elevated = false,
  borderColor,
  borderWidth = 1,
  padding = 16,
  glow = false,
  borderRadius = glass.borderRadius,
}: GlassCardProps) {
  return (
    <View
      style={[
        {
          borderRadius,
          borderWidth,
          borderColor: borderColor ?? glass.border,
          backgroundColor: elevated ? glass.cardBgElevated : glass.cardBg,
          overflow: "hidden",
        },
        glow ? glass.glowShadow : glass.shadow,
        style,
      ]}
    >
      {/* Diagonal refraction gradient */}
      <LinearGradient
        colors={[glass.gradientStart, glass.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius,
        }}
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
