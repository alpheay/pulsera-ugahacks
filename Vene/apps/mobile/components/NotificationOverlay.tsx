/**
 * NotificationOverlay — full-screen popup for ring notifications.
 *
 * Renders animated slide-down cards for:
 *   - Episode alerts (orange pulsing border)
 *   - Episode resolved (green)
 *   - Pulse check-in (purple with message)
 *
 * Auto-dismisses after a timeout. Tap to dismiss immediately.
 */

import React, { useEffect, useState, useRef } from "react"
import { View, Text, Pressable, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated"
import { RAW_COLORS } from "@/lib/design"
import {
  type RingNotification,
  subscribe,
  getActiveNotifications,
  dismissNotification,
} from "@/lib/notificationStore"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

const AUTO_DISMISS_MS: Record<RingNotification["type"], number> = {
  "episode-alert": 8000,
  "episode-resolved": 5000,
  "pulse-checkin": 6000,
}

export default function NotificationOverlay() {
  const [notifications, setNotifications] = useState<RingNotification[]>([])

  useEffect(() => {
    setNotifications(getActiveNotifications())
    const unsub = subscribe((all) => {
      setNotifications(all.filter((n) => !n.dismissed))
    })
    return unsub
  }, [])

  if (notifications.length === 0) return null

  const latest = notifications[notifications.length - 1]

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
        backgroundColor: "rgba(0,0,0,0.6)",
      }}
      pointerEvents="box-none"
    >
      <NotificationCard
        key={latest.id}
        notification={latest}
        onDismiss={() => dismissNotification(latest.id)}
      />
    </View>
  )
}

interface CardProps {
  notification: RingNotification
  onDismiss: () => void
}

function NotificationCard({ notification, onDismiss }: CardProps) {
  const translateY = useSharedValue(-200)
  const borderOpacity = useSharedValue(0.4)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    })

    if (notification.type === "episode-alert") {
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1
      )
    }

    const delay = AUTO_DISMISS_MS[notification.type] ?? 5000
    timerRef.current = setTimeout(onDismiss, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const borderStyle = useAnimatedStyle(() => ({
    borderColor:
      notification.type === "episode-alert"
        ? `rgba(249, 115, 22, ${borderOpacity.value})`
        : "transparent",
  }))

  const cfg = CARD_CONFIG[notification.type]

  return (
    <Pressable
      onPress={onDismiss}
      style={{ width: SCREEN_WIDTH - 32, marginTop: 60 }}
    >
      <Animated.View
        style={[
          slideStyle,
          borderStyle,
          {
            backgroundColor: "#171717",
            borderRadius: 20,
            borderWidth: notification.type === "episode-alert" ? 2 : 0,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
          },
        ]}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
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
            <Text
              style={{
                color: RAW_COLORS.foreground,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {cfg.title(notification)}
            </Text>
            <Text
              style={{
                color: RAW_COLORS.mutedForeground,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {cfg.subtitle(notification)}
            </Text>
          </View>
          <Ionicons name="close" size={20} color={RAW_COLORS.mutedForeground} />
        </View>

        {/* Body content */}
        {notification.type === "episode-alert" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${RAW_COLORS.destructive}20`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="heart"
              size={24}
              color={RAW_COLORS.destructive}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: RAW_COLORS.destructive,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Elevated heart rate detected
            </Text>
          </View>
        )}

        {notification.type === "episode-resolved" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${RAW_COLORS.success}20`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={RAW_COLORS.success}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: RAW_COLORS.success,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              Feeling better now
            </Text>
          </View>
        )}

        {notification.type === "pulse-checkin" && (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#7C3AED30",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="happy" size={40} color="#A78BFA" />
            </View>
            {notification.message && (
              <Text
                style={{
                  color: RAW_COLORS.foreground,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                &ldquo;{notification.message}&rdquo;
              </Text>
            )}
          </View>
        )}

        {/* Tap to dismiss hint */}
        <Text
          style={{
            color: RAW_COLORS.mutedForeground,
            fontSize: 11,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Tap to dismiss
        </Text>
      </Animated.View>
    </Pressable>
  )
}

type CardConfig = {
  iconBg: string
  icon: React.ComponentProps<typeof Ionicons>["name"]
  iconColor: string
  title: (n: RingNotification) => string
  subtitle: (n: RingNotification) => string
}

const CARD_CONFIG: Record<RingNotification["type"], CardConfig> = {
  "episode-alert": {
    iconBg: `${RAW_COLORS.high}30`,
    icon: "warning",
    iconColor: RAW_COLORS.high,
    title: (n) => `${n.memberName} needs support`,
    subtitle: () => "Elevated heart rate detected",
  },
  "episode-resolved": {
    iconBg: `${RAW_COLORS.success}30`,
    icon: "checkmark-circle",
    iconColor: RAW_COLORS.success,
    title: (n) => `${n.memberName} is feeling better`,
    subtitle: () => "Episode resolved",
  },
  "pulse-checkin": {
    iconBg: "#7C3AED30",
    icon: "heart-circle",
    iconColor: "#A78BFA",
    title: (n) => `${n.memberName} sent a Pulse`,
    subtitle: () => "Check-in received",
  },
}
