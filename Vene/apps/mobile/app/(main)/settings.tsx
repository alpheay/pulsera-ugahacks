import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Feather } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import { useCaregiverStore } from "../../store/useCaregiverStore"
import { authClient, useSession } from "../../lib/auth"
import { disconnectDevice, requestReconnectPairing } from "../../lib/api"
import { GradientBackground } from "../../components/GradientBackground"
import { Card } from "../../components/Card"
import { CapsuleButton } from "../../components/CapsuleButton"

export default function SettingsScreen() {
  const { data: session } = useSession()
  const patient = useCaregiverStore((s) => s.patient)
  const disconnectPatient = useCaregiverStore((s) => s.disconnectPatient)
  const reconnectPairing = useCaregiverStore((s) => s.reconnectPairing)
  const setReconnectPairing = useCaregiverStore((s) => s.setReconnectPairing)
  const clearReconnectPairing = useCaregiverStore((s) => s.clearReconnectPairing)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const handleSignOut = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          if (isDisconnecting) return
          try {
            await authClient.signOut()
            router.replace("/")
          } catch (err) {
            void err
          }
        },
      },
    ])
  }

  const handleDisconnect = () => {
    Alert.alert("Disconnect patient", "Disconnect this patient from your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          if (isDisconnecting) return
          if (!session?.session?.token) {
            Alert.alert("Error", "Missing session token. Please sign in again.")
            return
          }

          setIsDisconnecting(true)
          const success = await disconnectDevice(session.session.token)
          if (!success) {
            Alert.alert("Error", "Failed to disconnect. Please try again.")
            setIsDisconnecting(false)
            return
          }

          // Update store state first, then navigate
          // This avoids race conditions with useFocusEffect cleanup
          disconnectPatient()
          setIsDisconnecting(false)
          router.replace("/(main)/home")
        },
      },
    ])
  }

  const emailVerified = session?.user?.emailVerified === true
  useEffect(() => {
    if (!reconnectPairing?.expiresAt) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [reconnectPairing?.expiresAt])

  const reconnectExpiresLabel = useMemo(() => {
    if (!reconnectPairing?.expiresAt) return null
    const deltaMs = new Date(reconnectPairing.expiresAt).getTime() - now
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return "Expired"
    const totalSeconds = Math.floor(deltaMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, "0")}`
  }, [reconnectPairing?.expiresAt, now])

  const formattedReconnectCode = useMemo(() => {
    const code = reconnectPairing?.pairingCode || ""
    if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`
    return code
  }, [reconnectPairing?.pairingCode])


  const handleGenerateReconnectCode = async () => {
    if (!session?.session?.token) {
      Alert.alert("Error", "Missing session token. Please sign in again.")
      return
    }

    const result = await requestReconnectPairing(session.session.token)
    if (result.error || !result.pairingCode) {
      Alert.alert("Error", result.error || "Failed to create reconnect code.")
      return
    }

    setReconnectPairing({
      pairingCode: result.pairingCode,
      expiresAt: result.expiresAt ?? null,
    })
  }

  return (
    <GradientBackground variant="welcome">
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-2 pb-4">
          <Text className="text-title font-bold text-foreground">Settings</Text>
        </View>

        <ScrollView
          className="flex-1"
          pointerEvents={isDisconnecting ? "none" : "auto"}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <Card className="p-6 mb-6">
            <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
              Account
            </Text>

            <View className="mt-3">
              <View className="flex-row items-center">
                <Text className="text-title font-bold text-foreground">
                  {session?.user?.name || "User"}
                </Text>
                <View className="ml-2">
                  {emailVerified ? (
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#22C55E"
                      accessibilityLabel="Email verified"
                    />
                  ) : (
                    <Feather
                      name="alert-circle"
                      size={18}
                      color="rgba(250,250,250,0.45)"
                      accessibilityLabel="Email not verified"
                    />
                  )}
                </View>
              </View>
              <Text className="text-body text-foreground/70 mt-1">{session?.user?.email || ""}</Text>
            </View>

            {!emailVerified ? (
              <CapsuleButton
                title="Verify email"
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/verify-email",
                    params: session?.user?.email ? { email: session.user.email } : {},
                  })
                }
                variant="secondary"
                className="w-full mt-4"
              />
            ) : null}
          </Card>

          {patient ? (
            <Card className="p-6 mb-6">
              <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
                Connected patient
              </Text>

              <View className="mt-3">
                <Text className="text-title font-bold text-foreground">{patient.name}</Text>
                {patient.preferences ? (
                  <Text className="text-body text-foreground/70 mt-2">
                    {patient.preferences}
                  </Text>
                ) : null}
              </View>

              <CapsuleButton
                title="Edit patient"
                onPress={() => router.push("/(modals)/edit-patient")}
                variant="secondary"
                className="w-full mt-5"
                disabled={isDisconnecting}
              />
              <CapsuleButton
                title="Disconnect patient"
                onPress={handleDisconnect}
                variant="destructive"
                className="w-full mt-4"
                disabled={isDisconnecting}
                loading={isDisconnecting}
              />
            </Card>
          ) : (
            <Card className="p-6 mb-6">
              <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
                Patient
              </Text>
              <Text className="text-body text-foreground/70 mt-3">
                No patient is connected yet.
              </Text>
              <CapsuleButton
                title="Add a patient"
                onPress={() => router.push("/(modals)/add-patient")}
                variant="primary"
                className="w-full mt-6"
                disabled={isDisconnecting}
              />
            </Card>
          )}

          <Card className="p-6">
            <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
              Account actions
            </Text>
            <Text className="text-body text-foreground/70 mt-3 mb-6">
              Sign out of this device.
            </Text>
            <CapsuleButton
              title="Sign out"
              onPress={handleSignOut}
              variant="destructive"
              className="w-full"
              disabled={isDisconnecting}
            />
          </Card>

          {patient ? (
            <Card className="p-6 mt-6">
              <Text className="text-small font-semibold text-foreground/60 uppercase tracking-widest">
                Reconnect watch
              </Text>
              <Text className="text-body text-foreground/70 mt-3">
                If the watch lost its connection, generate a code and enter it on the watch to reconnect.
              </Text>

              {reconnectPairing?.pairingCode ? (
                <View className="mt-5 bg-foreground/10 border border-foreground/20 rounded-2xl px-5 py-4 items-center">
                  <Text
                    className="text-3xl font-bold text-foreground font-mono"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={{ letterSpacing: 3 }}
                  >
                    {formattedReconnectCode}
                  </Text>
                  {reconnectExpiresLabel ? (
                    <Text className="text-small text-foreground/60 mt-2">
                      Expires in {reconnectExpiresLabel}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Clear reconnect code"
                    onPress={() => clearReconnectPairing(reconnectPairing.pairingCode)}
                    className="mt-3"
                  >
                    <Text className="text-body text-foreground/70">Clear</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <CapsuleButton
                title={reconnectPairing?.pairingCode ? "Generate a new code" : "Generate reconnect code"}
                onPress={handleGenerateReconnectCode}
                variant="secondary"
                className="w-full mt-5"
                disabled={isDisconnecting}
              />
            </Card>
          ) : null}

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  )
}
