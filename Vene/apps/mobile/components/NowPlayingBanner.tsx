import React from "react"
import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"

type MediaType = "none" | "music" | "photos"
type IoniconName = keyof typeof Ionicons.glyphMap

interface NowPlayingBannerProps {
  type: MediaType
  label?: string
}

const MEDIA_CONFIG: Record<MediaType, { icon: IoniconName; color: string; defaultLabel: string }> = {
  none: { icon: "pause-circle", color: "#A1A1A1", defaultLabel: "Nothing playing" },
  music: { icon: "musical-notes", color: "#a78bfa", defaultLabel: "Playing music" },
  photos: { icon: "images", color: "#f472b6", defaultLabel: "Displaying photos" },
}

export function NowPlayingBanner({ type, label }: NowPlayingBannerProps) {
  const config = MEDIA_CONFIG[type]
  const displayLabel = label || config.defaultLabel
  const isIdle = type === "none"

  return (
    <View 
      className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 flex-row items-center"
      accessibilityLabel={`Media: ${displayLabel}`}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View className="flex-1">
          <Text className="text-label uppercase tracking-wider text-white/50 mb-0.5">
            Media
          </Text>
          <Text 
            className={`text-body ${isIdle ? "text-white/50" : "text-white"}`}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </View>
      </View>

      {!isIdle && (
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
          <Text className="text-caption text-emerald-400">Live</Text>
        </View>
      )}
    </View>
  )
}
