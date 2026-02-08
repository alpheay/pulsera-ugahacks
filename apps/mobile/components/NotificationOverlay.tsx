/**
 * NotificationOverlay — full-screen popup for ring notifications.
 *
 * Renders animated slide-down cards for:
 *   - Episode alerts (orange/red pulsing border)
 *   - Episode resolved (green)
 *   - Pulse check-in (purple with selfie)
 *
 * Auto-dismisses after a timeout. Tap to dismiss immediately.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, Image, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, glass } from "@/lib/theme";
import {
  type RingNotification,
  subscribe,
  getActiveNotifications,
  dismissNotification,
} from "@/lib/notificationStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AUTO_DISMISS_MS: Record<RingNotification["type"], number> = {
  "episode-alert": 8000,
  "episode-resolved": 5000,
  "pulse-checkin": 6000,
};

export default function NotificationOverlay() {
  const [notifications, setNotifications] = useState<RingNotification[]>([]);

  useEffect(() => {
    setNotifications(getActiveNotifications());
    const unsub = subscribe((all) => {
      setNotifications(all.filter((n) => !n.dismissed));
    });
    return unsub;
  }, []);

  if (notifications.length === 0) return null;

  // Show only the most recent notification
  const latest = notifications[notifications.length - 1];

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        justifyContent: "flex-start",
        alignItems: "center",
        backgroundColor: glass.overlayBg,
      }}
      pointerEvents="box-none"
    >
      <NotificationCard
        key={latest.id}
        notification={latest}
        onDismiss={() => dismissNotification(latest.id)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Individual notification card
// ---------------------------------------------------------------------------

interface CardProps {
  notification: RingNotification;
  onDismiss: () => void;
}

function NotificationCard({ notification, onDismiss }: CardProps) {
  const translateY = useSharedValue(-200);
  const borderOpacity = useSharedValue(0.4);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });

    if (notification.type === "episode-alert") {
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1
      );
    }

    const delay = AUTO_DISMISS_MS[notification.type] ?? 5000;
    timerRef.current = setTimeout(onDismiss, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor:
      notification.type === "episode-alert"
        ? `rgba(254, 154, 0, ${borderOpacity.value})`
        : "transparent",
  }));

  const cfg = cardConfig[notification.type];

  return (
    <Pressable onPress={onDismiss} style={{ width: SCREEN_WIDTH - 32, marginTop: 60 }}>
      <Animated.View
        style={[
          slideStyle,
          borderStyle,
          {
            borderRadius: glass.borderRadius,
            borderWidth: notification.type === "episode-alert" ? 2 : 1,
            borderColor: notification.type === "episode-alert" ? undefined : glass.border,
            overflow: "hidden",
            ...glass.glowShadow,
          },
        ]}
      >
        {/* Blur backdrop */}
        <BlurView
          tint="dark"
          intensity={Platform.OS === "ios" ? glass.blurIntensityIOS : glass.blurIntensityAndroid}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={[glass.gradientStart, glass.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      <View style={{ padding: 20 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: cfg.iconBg,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={cfg.icon} size={22} color={cfg.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              {cfg.title(notification)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {cfg.subtitle(notification)}
            </Text>
          </View>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </View>

        {/* Body content */}
        {notification.type === "episode-alert" && notification.heartRate != null && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${colors.critical}20`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons name="heart" size={24} color={colors.critical} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.critical, fontSize: 28, fontWeight: "800" }}>
              {Math.round(notification.heartRate)}
            </Text>
            <Text style={{ color: colors.critical, fontSize: 14, marginLeft: 4, marginTop: 6 }}>
              BPM
            </Text>
          </View>
        )}

        {notification.type === "episode-resolved" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${colors.safe}20`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.safe}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: colors.safe, fontSize: 15, fontWeight: "600" }}>
              Heart rate returned to normal
            </Text>
          </View>
        )}

        {notification.type === "pulse-checkin" && (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${colors.interactive}30`,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="happy" size={44} color={colors.interactive} />
            </View>
            {notification.message && (
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                "{notification.message}"
              </Text>
            )}
          </View>
        )}

        {/* Tap to dismiss hint */}
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Tap to dismiss
        </Text>
      </View>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Card config per notification type
// ---------------------------------------------------------------------------

type CardConfig = {
  bg: string;
  iconBg: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: (n: RingNotification) => string;
  subtitle: (n: RingNotification) => string;
};

const cardConfig: Record<RingNotification["type"], CardConfig> = {
  "episode-alert": {
    bg: "#171717",
    iconBg: `${colors.elevated}30`,
    icon: "warning",
    iconColor: colors.elevated,
    title: (n) => `${n.memberName} needs support`,
    subtitle: () => "Elevated heart rate detected",
  },
  "episode-resolved": {
    bg: "#171717",
    iconBg: `${colors.safe}30`,
    icon: "checkmark-circle",
    iconColor: colors.safe,
    title: (n) => `${n.memberName} is feeling better`,
    subtitle: () => "Episode resolved",
  },
  "pulse-checkin": {
    bg: "#171717",
    iconBg: `${colors.interactive}30`,
    icon: "heart-circle",
    iconColor: colors.interactive,
    title: (n) => `${n.memberName} sent a Pulse`,
    subtitle: () => "Check-in received",
  },
};
