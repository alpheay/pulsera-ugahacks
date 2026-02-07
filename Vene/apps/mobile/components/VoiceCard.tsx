import { View, Text, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { cn } from "../lib/cn"
import { Card } from "./Card"
import { CapsuleButton } from "./CapsuleButton"
import { AudioProgressBar } from "./AudioProgressBar"

type Role = "caregiver" | "patient"

interface VoiceCardProps {
  role: Role
  hasSample: boolean
  isRecording: boolean
  recordingSeconds: number
  isPlaying: boolean
  playbackPosition: number
  playbackDuration: number
  pendingUri: string | null
  isLoading: boolean
  isSaving: boolean
  onPlay: () => void
  onPause: () => void
  onRecord: () => void
  onStopRecording: () => void
  onSave: () => void
}

const roleLabels: Record<Role, string> = {
  caregiver: "Caregiver",
  patient: "Patient",
}

const prompts: Record<Role, string> = {
  caregiver:
    "Hi Vene. I am the caregiver. Today is a calm day. The quick brown fox jumps over the lazy dog. One, two, three, four, five.",
  patient:
    "Hi Vene. I am the patient. Today is a calm day. The quick brown fox jumps over the lazy dog. One, two, three, four, five.",
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function VoiceCard({
  role,
  hasSample,
  isRecording,
  recordingSeconds,
  isPlaying,
  playbackPosition,
  playbackDuration,
  pendingUri,
  isLoading,
  isSaving,
  onPlay,
  onPause,
  onRecord,
  onStopRecording,
  onSave,
}: VoiceCardProps) {
  const label = roleLabels[role]
  const prompt = prompts[role]
  const hasPending = pendingUri !== null
  const showPlayer = (hasSample || hasPending) && !isRecording

  return (
    <Card className="p-5 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
          {label} voice
        </Text>
        <View
          className={cn(
            "px-2 py-1 rounded-full",
            hasSample ? "bg-success/20" : "bg-foreground/10"
          )}
        >
          <Text
            className={cn(
              "text-small font-medium",
              hasSample ? "text-success" : "text-foreground/60"
            )}
          >
            {hasSample ? "Saved" : "Not added"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="text-body text-foreground/60 mt-2">Loading...</Text>
        </View>
      ) : isRecording ? (
        <View className="py-4">
          <View className="bg-foreground/10 border border-foreground/20 rounded-2xl px-4 py-4 mb-4">
            <Text className="text-body text-foreground" selectable>
              {prompt}
            </Text>
          </View>
          <View className="flex-row items-center justify-center mb-4">
            <View className="w-3 h-3 rounded-full bg-destructive mr-2" />
            <Text className="text-body text-foreground/80">
              Recording... {formatClock(recordingSeconds)}
            </Text>
          </View>
          <CapsuleButton
            title="Stop recording"
            onPress={onStopRecording}
            variant="destructive"
            icon="stop-circle"
          />
        </View>
      ) : showPlayer ? (
        <View className="py-2">
          <AudioProgressBar
            position={playbackPosition}
            duration={playbackDuration}
            className="mb-4"
          />
          <View className="flex-row gap-3">
            <CapsuleButton
              title={isPlaying ? "Pause" : "Play"}
              onPress={isPlaying ? onPause : onPlay}
              variant="secondary"
              icon={isPlaying ? "pause" : "play"}
              className="flex-1"
            />
            <CapsuleButton
              title="Re-record"
              onPress={onRecord}
              variant="secondary"
              icon="mic"
              className="flex-1"
              disabled={isSaving}
            />
          </View>
          {hasPending && (
            <CapsuleButton
              title="Save voice sample"
              onPress={onSave}
              variant="primary"
              loading={isSaving}
              disabled={isSaving}
              className="mt-3"
            />
          )}
        </View>
      ) : (
        <View className="py-2">
          <Text className="text-body text-foreground/70 mb-4">
            Record a short voice sample to help Vene recognize who is speaking.
          </Text>
          <CapsuleButton
            title={`Record ${label.toLowerCase()} voice`}
            onPress={onRecord}
            variant="primary"
            icon="mic"
          />
        </View>
      )}
    </Card>
  )
}
