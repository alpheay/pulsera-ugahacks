import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { glass } from "@/lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: glass.border,
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 30,
          paddingTop: 8,
          position: "absolute",
        },
        tabBarBackground: () => (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
            <BlurView
              tint="dark"
              intensity={Platform.OS === "ios" ? glass.blurIntensityIOS : glass.blurIntensityAndroid}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <LinearGradient
              colors={[glass.gradientStart, "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </View>
        ),
        tabBarActiveTintColor: "#e5e5e5",
        tabBarInactiveTintColor: "#737373",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Ring",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Pulses",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
