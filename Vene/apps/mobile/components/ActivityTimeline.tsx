import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { ACCESSIBILITY } from "../lib/design"

type IoniconName = keyof typeof Ionicons.glyphMap

export interface ActivityEntry {
  id: string
  eventType: string
  timestamp: string
  data?: Record<string, unknown>
}

interface ActivityTimelineProps {
  entries: ActivityEntry[]
  maxVisible?: number
  onViewAll: () => void
  now: number
}

const EVENT_ICONS: Record<string, { icon: IoniconName; color: string }> = {
  "session-start": { icon: "mic", color: "#818cf8" },
  "session-end": { icon: "mic-off", color: "#A1A1A1" },
  "session-mode-change": { icon: "swap-horizontal", color: "#fbbf24" },
  "monitoring-start": { icon: "shield-checkmark", color: "#34d399" },
  "monitoring-end": { icon: "shield-outline", color: "#A1A1A1" },
  "call-start": { icon: "call", color: "#60a5fa" },
  "call-end": { icon: "call-outline", color: "#A1A1A1" },
  "tool-call": { icon: "musical-notes", color: "#a78bfa" },
  default: { icon: "pulse", color: "#A1A1A1" },
}

function getEventConfig(entry: ActivityEntry) {
  if (entry.eventType === "tool-call") {
    const toolName = entry.data?.toolName as string | undefined
    if (toolName === "play_music" || toolName === "stop_music") {
      return { icon: "musical-notes" as IoniconName, color: "#a78bfa" }
    }
    if (toolName === "display_images" || toolName === "stop_images") {
      return { icon: "images" as IoniconName, color: "#f472b6" }
    }
  }
  return EVENT_ICONS[entry.eventType] || EVENT_ICONS.default
}

function formatEventLabel(entry: ActivityEntry): string {
  const toolName = entry.data?.toolName as string | undefined

  switch (entry.eventType) {
    case "session-start":
      return entry.data?.initialMode === "distress" ? "Distress session started" : "Session started"
    case "session-end":
      return "Session ended"
    case "session-mode-change":
      if (entry.data?.to === "distress") return "Escalated to distress"
      if (entry.data?.to === "normal") return "De-escalated"
      return "Mode changed"
    case "monitoring-start":
      return "Started watching"
    case "monitoring-end":
      return "Stopped watching"
    case "call-start":
      return "Call started"
    case "call-end":
      return "Call ended"
    case "tool-call":
      if (toolName === "play_music") return "Music started"
      if (toolName === "stop_music") return "Music stopped"
      if (toolName === "display_images") return "Showing photos"
      if (toolName === "stop_images") return "Photos stopped"
      return "Media updated"
    default:
      return entry.eventType.replace(/[-_]/g, " ")
  }
}

function formatRelativeTime(timestamp: string, nowMs: number): string {
  const delta = Math.max(0, nowMs - new Date(timestamp).getTime())
  const seconds = Math.floor(delta / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function ActivityTimeline({ 
  entries, 
  maxVisible = 3, 
  onViewAll,
  now,
}: ActivityTimelineProps) {
  const visibleEntries = entries.slice(0, maxVisible)

  return (
    <View className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-label uppercase tracking-wider text-white/50">
          Recent Activity
        </Text>
      </View>

      {visibleEntries.length === 0 ? (
        <View className="px-5 py-4">
          <Text className="text-body text-white/40">No recent activity</Text>
        </View>
      ) : (
        <View>
          {visibleEntries.map((entry, index) => {
            const config = getEventConfig(entry)
            const isLast = index === visibleEntries.length - 1
            
            return (
              <View 
                key={entry.id}
                className={`flex-row items-center px-5 py-3.5 min-h-[56px] ${!isLast ? "border-b border-white/5" : ""}`}
                accessibilityLabel={`${formatEventLabel(entry)}, ${formatRelativeTime(entry.timestamp, now)}`}
              >
                <View 
                  className="w-9 h-9 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Ionicons name={config.icon} size={18} color={config.color} />
                </View>
                <Text className="text-body text-white flex-1" numberOfLines={1}>
                  {formatEventLabel(entry)}
                </Text>
                <Text className="text-caption text-white/40 ml-3">
                  {formatRelativeTime(entry.timestamp, now)}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        onPress={onViewAll}
        hitSlop={ACCESSIBILITY.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="View all activity"
        className="px-5 py-4 border-t border-white/10 flex-row items-center justify-center"
      >
        <Text className="text-body text-white/60 mr-2">View All Activity</Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  )
}
