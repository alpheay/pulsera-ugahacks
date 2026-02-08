import React, { useState, useEffect, useRef } from "react"
import { Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { Audio, AVPlaybackStatus } from "expo-av"

interface AudioPreviewPlayerProps {
  trackTitle: string
  artistName: string
  albumCoverUrl: string
  previewUrl: string
  isVisible: boolean
  onClose: () => void
}

export function AudioPreviewPlayer({
  trackTitle,
  artistName,
  albumCoverUrl,
  previewUrl,
  isVisible,
  onClose,
}: AudioPreviewPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null)
  const [status, setStatus] = useState<"loading" | "playing" | "stopped" | "error">("stopped")

  useEffect(() => {
    if (isVisible && previewUrl) {
      playPreview()
    } else {
      stopPreview()
    }
    return () => {
      stopPreview()
    }
  }, [isVisible, previewUrl])

  const playPreview = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }

      setStatus("loading")
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      })
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      )
      soundRef.current = sound
      
      sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => {
        if (!s.isLoaded) {
            if ("error" in s && s.error) setStatus("error")
            return
        }
        
        if (s.isPlaying) {
             setStatus("playing")
        }
        
        if (s.didJustFinish) {
          setStatus("stopped")
          onClose()
        }
      })
    } catch (e) {
      console.error("Audio playback error:", e)
      setStatus("error")
    }
  }

  const stopPreview = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync()
      } catch (e) {}
      soundRef.current = null
    }
    setStatus("stopped")
  }

  if (!isVisible) return null

  return (
    <View className="absolute bottom-0 left-0 right-0 h-[72px] bg-card/95 border-t border-white/10 flex-row items-center px-4 pb-safe">
      <Image
        source={{ uri: albumCoverUrl }}
        style={{ width: 48, height: 48, borderRadius: 8 }}
        contentFit="cover"
      />

      <View className="ml-3 flex-1 justify-center">
        <Text className="text-body text-white font-medium" numberOfLines={1}>
          {trackTitle}
        </Text>
        <Text className="text-caption text-white/50" numberOfLines={1}>
          {artistName}
        </Text>
      </View>

      <View className="flex-row items-center">
        {status === "loading" && (
          <ActivityIndicator size="small" color="#34d399" className="mr-3" />
        )}
        
        {status === "playing" && (
          <View className="mr-3 bg-emerald-500/20 w-8 h-8 rounded-full items-center justify-center">
            <View className="w-2 h-2 rounded-full bg-emerald-400" />
          </View>
        )}

        <TouchableOpacity 
          onPress={onClose}
          className="w-11 h-11 items-center justify-center rounded-full bg-white/5"
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
