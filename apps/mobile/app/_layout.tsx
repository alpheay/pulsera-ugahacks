import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0F172A" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="member/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Member Details",
            headerStyle: { backgroundColor: "#1E293B" },
            headerTintColor: "#E2E8F0",
          }}
        />
        <Stack.Screen
          name="checkin"
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="episode/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Episode Details",
            headerStyle: { backgroundColor: "#1E293B" },
            headerTintColor: "#E2E8F0",
          }}
        />
      </Stack>
    </>
  );
}
