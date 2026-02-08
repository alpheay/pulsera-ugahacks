import { Stack, useRouter, useSegments, useNavigationContainerRef } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "../global.css"
import { View, Text, ActivityIndicator } from "react-native"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { authClient, useSession } from "../lib/auth"
import { socketManager } from "../lib/socket"
import { useCaregiverStore } from "../store/useCaregiverStore"
import NotificationOverlay from "../components/NotificationOverlay"
import { pushNotification } from "../lib/notificationStore"

export default function RootLayout() {
  const { data: session, isPending, error } = useSession()
  const segments = useSegments() as string[]
  const router = useRouter()
  const rootNavigation = useNavigationContainerRef()
  const disconnectPatient = useCaregiverStore((s) => s.disconnectPatient)
  const patient = useCaregiverStore((s) => s.patient)
  const updatePatientContext = useCaregiverStore((s) => s.updatePatientContext)
  const initializeFromApi = useCaregiverStore((s) => s.initializeFromApi)
  const setActiveSession = useCaregiverStore((s) => s.setActiveSession)
  const setActiveMonitoring = useCaregiverStore((s) => s.setActiveMonitoring)

  useEffect(() => {
    if (__DEV__) {
      const ErrorUtils = (globalThis as any).ErrorUtils
      if (ErrorUtils) {
        const originalHandler = ErrorUtils.getGlobalHandler()
        ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          if (originalHandler && isFatal) {
            originalHandler(error, isFatal)
          }
        })
      }
    }
  }, [])

  useEffect(() => {
    const token = session?.session?.token
    const verified = session?.user?.emailVerified === true

    if (!token || !verified) {
      socketManager.disconnect()
      return
    }

    socketManager.setToken(token)
    socketManager.connect()
    void initializeFromApi(token)
  }, [session?.session?.token, session?.user?.emailVerified, initializeFromApi])

  useEffect(() => {
    const handleDeviceUnpaired = () => {
      disconnectPatient()
    }

    const handlePatientContextUpdated = (data: any) => {
      if (!data) return
      const name = data.patientName || data.patient?.name
      const preferences = data.patientPreferences || data.patient?.preferences
      if (!name) return
      updatePatientContext({
        name,
        preferences,
      })
    }

    socketManager.on("device-unpaired", handleDeviceUnpaired)
    socketManager.on("patient-context-updated", handlePatientContextUpdated)

    const handleSocketDisconnected = () => {
      if (!patient) return
      setActiveSession(null)
      setActiveMonitoring(false)
    }
    socketManager.on("disconnect", handleSocketDisconnected)

    const handlePairingRequest = (data: any) => {
      const pairingCode = data?.pairingCode
      if (!pairingCode) return

      const inConnectRequest = segments[0] === "(modals)" && segments[1] === "connect-request"
      if (inConnectRequest) return

      const nav = {
        pathname: "/(modals)/connect-request" as const,
        params: {
          pairingCode,
          patientName: data?.patientName,
          patientPreferences: data?.patientPreferences,
          isReconnect: data?.isReconnect ? "true" : "false",
          watchName: data?.watchName,
          watchModel: data?.watchModel,
          watchSystemName: data?.watchSystemName,
          watchSystemVersion: data?.watchSystemVersion,
        },
      }

      const inAddPatient = segments[0] === "(modals)" && segments[1] === "add-patient"
      if (inAddPatient) {
        router.replace(nav)
      } else {
        router.push(nav)
      }
    }
    socketManager.on("pairing-request", handlePairingRequest)

    const handleAuthError = async () => {
      try {
        await authClient.signOut()
        router.replace("/")
      } catch (err) {
        void err
      }
    }
    socketManager.on("auth-error", handleAuthError)

    const handleEpisodeAlert = (data: any) => {
      pushNotification({
        type: "episode-alert",
        memberName: data.member_name || "Patient",
        heartRate: data.heart_rate,
        triggerType: data.trigger_type,
        deviceId: data.device_id,
        timestamp: data.timestamp || new Date().toISOString(),
      })
    }
    socketManager.on("ring-episode-alert", handleEpisodeAlert)

    const handleEpisodeResolved = (data: any) => {
      pushNotification({
        type: "episode-resolved",
        memberName: data.member_name || "Patient",
        resolution: data.resolution,
        deviceId: data.device_id,
        timestamp: data.timestamp || new Date().toISOString(),
      })
    }
    socketManager.on("ring-episode-resolved", handleEpisodeResolved)

    const handlePulseCheckin = (data: any) => {
      pushNotification({
        type: "pulse-checkin",
        memberName: data.member_name || "Patient",
        photoUrl: data.photo_url,
        message: data.message || "I'm okay!",
        deviceId: data.device_id,
        timestamp: data.timestamp || new Date().toISOString(),
      })
    }
    socketManager.on("ring-pulse-checkin", handlePulseCheckin)

    return () => {
      socketManager.off("device-unpaired", handleDeviceUnpaired)
      socketManager.off("patient-context-updated", handlePatientContextUpdated)
      socketManager.off("disconnect", handleSocketDisconnected)
      socketManager.off("pairing-request", handlePairingRequest)
      socketManager.off("auth-error", handleAuthError)
      socketManager.off("ring-episode-alert", handleEpisodeAlert)
      socketManager.off("ring-episode-resolved", handleEpisodeResolved)
      socketManager.off("ring-pulse-checkin", handlePulseCheckin)
    }
  }, [disconnectPatient, patient, setActiveSession, setActiveMonitoring, router, segments, updatePatientContext])

  useEffect(() => {
    if (isPending) return
    if (!rootNavigation?.isReady()) return

    const rootSegment = segments[0]
    const inAuthGroup = rootSegment === "(auth)"
    const inMainGroup = rootSegment === "(main)"
    const inModalsGroup = rootSegment === "(modals)"
    const inOnboardingGroup = rootSegment === "(onboarding)"
    const inIndexRoute = (segments.length as number) === 0 || rootSegment === "index"
    const inVerifyEmailRoute = inAuthGroup && segments[1] === "verify-email"

    if (!session) {
      if (inMainGroup || inModalsGroup || inOnboardingGroup || rootSegment === "call") {
        router.replace("/")
      }
      return
    }

    const isVerified = session.user?.emailVerified === true
    if (!isVerified) {
      if (!inVerifyEmailRoute) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: session.user?.email ? { email: session.user.email } : {},
        })
      }
      return
    }

    const isOnboardingComplete = session.user?.onboardingComplete === true

    if (!isOnboardingComplete) {
      if (inMainGroup) {
        router.replace("/(onboarding)")
      } else if (inAuthGroup || inIndexRoute) {
        router.replace("/(onboarding)")
      }
      return
    }

      if (inAuthGroup || inIndexRoute || inOnboardingGroup) {
        router.replace("/(main)/home")
      }

  }, [session, isPending, segments, router, rootNavigation])

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        <SafeAreaProvider>
          <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-foreground/70 mt-4">Loading...</Text>
            <StatusBar style="light" />
          </View>
        </SafeAreaProvider>
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        <SafeAreaProvider>
          <View className="flex-1 items-center justify-center bg-background px-6">
            <Text className="text-destructive text-headline mb-2">Auth Error</Text>
            <Text className="text-foreground/70 text-center">{String(error)}</Text>
            <StatusBar style="light" />
          </View>
        </SafeAreaProvider>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0A0A0A" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(modals)/add-patient" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="(modals)/connect-request"
            options={{
              presentation: "transparentModal",
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen name="(modals)/edit-patient" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="(modals)/check-in"
            options={{
              presentation: "transparentModal",
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen name="(modals)/activity" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/voice-samples" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/add-photo" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/add-music" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/photo-gallery" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/edit-photo" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/music-library" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/edit-music" options={{ presentation: "modal" }} />
          <Stack.Screen name="call" />
        </Stack>
        <StatusBar style="light" />
        <NotificationOverlay />
      </SafeAreaProvider>
    </View>
  )
}
