/**
 * GlassBlurCard — real blur glass surface (expensive).
 *
 * BlurView + LinearGradient + glass border.
 * Use sparingly — max 1-3 on screen at once (tab bar, map overlays, notification overlay).
 */

import React from "react";
import { View, Platform, type ViewStyle, type StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { glass } from "@/lib/theme";

interface GlassBlurCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  borderRadius?: number;
  tint?: "dark" | "light" | "default";
  intensity?: number;
}

export default function GlassBlurCard({
  children,
  style,
  borderColor,
  borderWidth = 1,
  padding = 12,
  borderRadius = glass.borderRadius,
  tint = "dark",
  intensity,
}: GlassBlurCardProps) {
  const blurIntensity =
    intensity ??
    (Platform.OS === "ios" ? glass.blurIntensityIOS : glass.blurIntensityAndroid);

  return (
    <View
      style={[
        {
          borderRadius,
          borderWidth,
          borderColor: borderColor ?? glass.border,
          overflow: "hidden",
        },
        glass.shadow,
        style,
      ]}
    >
      <BlurView
        tint={tint}
        intensity={blurIntensity}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
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
        }}
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
