import { useState } from "react"
import { ActivityIndicator, Pressable, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { Feather } from "@expo/vector-icons"
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated"
import { socketManager } from "../../lib/socket"
import { INPUT_COLORS } from "../../lib/design"

export default function CheckInModalScreen() {
  const router = useRouter()

  const [instruction, setInstruction] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleSendCheckIn = () => {
    if (!instruction.trim()) return

    setIsSubmitting(true)
    socketManager.sendCaregiverEvent("check_in", { instruction: instruction.trim() })
    router.back()
  }

  const handleClose = () => {
    router.back()
  }

  const canSubmit = instruction.trim().length > 0

  return (
    <Animated.View entering={FadeIn} className="flex-1">
      <Pressable
        className="absolute inset-0 bg-black/60"
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss check-in"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Animated.View
          entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
          className="bg-[#171717] border-t border-white/10 rounded-t-[32px] px-6 pt-4 pb-10"
        >
          <View className="items-center">
            <View className="w-10 h-1 rounded-full bg-white/20 mb-6" />
          </View>

          <Text className="text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2">
            Check In
          </Text>

          <Text className="text-2xl font-bold text-white tracking-tight">
            Send instruction
          </Text>
          <Text className="text-base text-white/60 mt-2 leading-relaxed">
            This message will be spoken to the patient by their assistant.
          </Text>

          <View className="mt-8">
            <Text className="text-sm font-semibold text-white/80 mb-3 ml-1">
              Instruction
            </Text>
            <View
              className={`rounded-2xl bg-white/5 border px-4 py-3 ${
                isFocused ? "border-white/30" : "border-white/10"
              }`}
            >
              <TextInput
                placeholder="e.g., Ask how they're feeling, remind them to take medication…"
                placeholderTextColor={INPUT_COLORS.placeholder}
                value={instruction}
                onChangeText={setInstruction}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSubmitting}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="text-base text-white min-h-[100px] leading-relaxed"
                returnKeyType="done"
              />
            </View>
          </View>

          <View className="flex-row justify-end mt-8 gap-4">
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel check-in"
              accessibilityState={{ disabled: isSubmitting }}
              className="w-16 h-16 rounded-full bg-white/5 border border-white/5 items-center justify-center active:bg-white/10"
              activeOpacity={0.86}
            >
              <Feather name="x" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendCheckIn}
              disabled={isSubmitting || !canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Send check-in"
              accessibilityState={{ disabled: isSubmitting || !canSubmit }}
              className={`w-16 h-16 rounded-full items-center justify-center ${
                canSubmit
                  ? "bg-white"
                  : "bg-white/10"
              }`}
              activeOpacity={0.86}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Feather
                  name="send"
                  size={24}
                  color={canSubmit ? "#000000" : "rgba(255,255,255,0.2)"}
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  )
}
