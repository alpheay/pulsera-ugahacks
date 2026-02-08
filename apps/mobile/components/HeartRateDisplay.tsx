/**
 * HeartRateDisplay — animated heart rate number with a heart icon.
 *
 * Shows the BPM value with a pulsing heart icon. When heartRate is
 * null the component shows a "---" placeholder.
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "@/lib/theme";

interface HeartRateDisplayProps {
  heartRate: number | null;
  /** Text size class — "lg" (default) or "sm" */
  size?: "lg" | "sm";
}

export default function HeartRateDisplay({
  heartRate,
  size = "lg",
}: HeartRateDisplayProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (heartRate && heartRate > 0) {
      // Pulse interval derived from heart rate
      const intervalMs = Math.max(400, Math.min(1200, 60000 / heartRate));
      const beatDuration = intervalMs * 0.3;

      scale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: beatDuration }),
          withTiming(1, { duration: beatDuration })
        ),
        -1, // infinite
        false
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }

    return () => {
      cancelAnimation(scale);
    };
  }, [heartRate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isLarge = size === "lg";
  const iconSize = isLarge ? 28 : 18;
  const numberSize = isLarge ? 40 : 24;
  const bpmSize = isLarge ? 14 : 11;

  return (
    <View className="flex-row items-center" style={{ gap: isLarge ? 8 : 4 }}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="heart" size={iconSize} color={colors.critical} />
      </Animated.View>
      <View className="items-start">
        <Text
          style={{
            fontSize: numberSize,
            fontWeight: "800",
            color: colors.text,
            lineHeight: numberSize * 1.1,
          }}
        >
          {heartRate != null ? Math.round(heartRate) : "---"}
        </Text>
        <Text
          style={{
            fontSize: bpmSize,
            color: colors.textMuted,
            marginTop: -2,
          }}
        >
          BPM
        </Text>
      </View>
    </View>
  );
}
