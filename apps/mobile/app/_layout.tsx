import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import NotificationOverlay from "@/components/NotificationOverlay";
import { pulseraWS, type IncomingMessage } from "@/lib/websocket";
import { pushNotification } from "@/lib/notificationStore";
import { glass } from "@/lib/theme";

function useRingNotifications() {
  useEffect(() => {
    // Connect to WebSocket for ring notifications (demo credentials)
    if (!pulseraWS.isConnected) {
      pulseraWS.connect("demo-token", "mobile-user", "mobile-demo", [
        "family-demo",
      ]);
    }

    const unsub = pulseraWS.onMessage((msg: IncomingMessage) => {
      if (msg.type === "ring-episode-alert") {
        const m = msg as {
          member_name: string;
          heart_rate: number;
          trigger_type: string;
          timestamp: string;
        };
        pushNotification({
          type: "episode-alert",
          memberName: m.member_name,
          heartRate: m.heart_rate,
          triggerType: m.trigger_type,
          timestamp: m.timestamp,
        });
      } else if (msg.type === "ring-episode-resolved") {
        const m = msg as {
          member_name: string;
          timestamp: string;
        };
        pushNotification({
          type: "episode-resolved",
          memberName: m.member_name,
          timestamp: m.timestamp,
        });
      } else if (msg.type === "ring-pulse-checkin") {
        const m = msg as {
          member_name: string;
          photo_url: string;
          message: string;
          timestamp: string;
          presage_data?: {
            visual_heart_rate: number;
            breathing_rate: number;
            facial_expression: string;
            eye_responsiveness: string;
            confidence_score: number;
          };
        };
        pushNotification({
          type: "pulse-checkin",
          memberName: m.member_name,
          photoUrl: m.photo_url,
          message: m.message,
          timestamp: m.timestamp,
          ...(m.presage_data && {
            presageData: {
              visualHeartRate: m.presage_data.visual_heart_rate,
              breathingRate: m.presage_data.breathing_rate,
              facialExpression: m.presage_data.facial_expression,
              eyeResponsiveness: m.presage_data.eye_responsiveness,
              confidenceScore: m.presage_data.confidence_score,
            },
          }),
        });
      }
    });

    return unsub;
  }, []);
}

export default function RootLayout() {
  useRingNotifications();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0a0a0a" },
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
            headerStyle: { backgroundColor: glass.tabBarBg },
            headerTintColor: "#fafafa",
            headerBlurEffect: "dark",
            headerTransparent: true,
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
            headerStyle: { backgroundColor: glass.tabBarBg },
            headerTintColor: "#fafafa",
            headerBlurEffect: "dark",
            headerTransparent: true,
          }}
        />
      </Stack>
      <NotificationOverlay />
    </View>
  );
}
