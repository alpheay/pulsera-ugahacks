import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Animated } from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import GlassBlurCard from "@/components/GlassBlurCard";
import { glass } from "@/lib/theme";
import {
  SAVED_PLACES,
  MAP_CENTER,
  getStatusColor,
  type MemberLocation,
} from "@/lib/simulatedData";
import {
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";
import { useMembersStore } from "@/lib/membersStore";

const { width } = Dimensions.get("window");

function PulsingRing({ color, size }: { color: string; size: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        opacity,
      }}
    />
  );
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const members = useMembersStore((s) => s.members);
  const startTick = useMembersStore((s) => s.startTick);
  const triggerDemoEpisode = useMembersStore((s) => s.triggerDemoEpisode);
  const demoEpisode = useMembersStore((s) => s.demoEpisode);
  const progressDemoEpisode = useMembersStore((s) => s.progressDemoEpisode);
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);

  // Start the shared simulation tick
  useEffect(() => {
    startTick();
  }, []);

  // Auto-trigger demo episode after 5 seconds
  useEffect(() => {
    const timer = setTimeout(triggerDemoEpisode, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-progress demo episode
  useEffect(() => {
    if (!demoEpisode || demoEpisode.phase === "resolved") return;
    const timer = setTimeout(progressDemoEpisode, 8000);
    return () => clearTimeout(timer);
  }, [demoEpisode]);

  const centerOnMember = (member: MemberLocation) => {
    setSelectedMember(member);
    mapRef.current?.animateToRegion(
      {
        latitude: member.latitude,
        longitude: member.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  };

  const resetView = () => {
    setSelectedMember(null);
    mapRef.current?.animateToRegion(MAP_CENTER, 500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={MAP_CENTER}
        userInterfaceStyle="dark"
        showsUserLocation={false}
        showsCompass={false}
      >
        {/* Saved places circles */}
        {SAVED_PLACES.map((place) => (
          <Circle
            key={place.id}
            center={{ latitude: place.latitude, longitude: place.longitude }}
            radius={place.radius}
            fillColor="rgba(0, 188, 125, 0.08)"
            strokeColor="rgba(0, 188, 125, 0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Member markers */}
        {members.map((member) => {
          const ep = member.activeEpisode;
          const epColor = ep ? getPhaseColor(ep.phase) : null;

          return (
            <Marker
              key={member.id}
              coordinate={{
                latitude: member.latitude,
                longitude: member.longitude,
              }}
              onPress={() => centerOnMember(member)}
            >
              <View style={{ alignItems: "center" }}>
                {/* Episode pulsing ring */}
                {ep && epColor && (
                  <PulsingRing color={epColor} size={54} />
                )}
                {/* Avatar bubble */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: ep ? epColor! : getStatusColor(member.health.status),
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "#171717",
                    shadowColor: ep ? epColor! : getStatusColor(member.health.status),
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#171717",
                      fontWeight: "800",
                      fontSize: 14,
                    }}
                  >
                    {member.avatar}
                  </Text>
                </View>
                {/* Name label */}
                <View
                  style={{
                    backgroundColor: glass.cardBg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginTop: 2,
                    borderWidth: 0.5,
                    borderColor: glass.borderSubtle,
                  }}
                >
                  <Text
                    style={{
                      color: "#fafafa",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {member.name}
                  </Text>
                </View>
              </View>
              <Callout tooltip onPress={() => router.push(`/member/${member.id}`)}>
                <View
                  style={{
                    backgroundColor: "rgba(23, 23, 23, 0.95)",
                    borderRadius: glass.borderRadiusSmall,
                    padding: 12,
                    width: 220,
                    borderWidth: 1,
                    borderColor: ep ? epColor! : glass.border,
                  }}
                >
                  <Text
                    style={{
                      color: "#fafafa",
                      fontWeight: "700",
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    {member.name}
                    {member.relation !== "self" ? ` (${member.relation})` : ""}
                  </Text>
                  <Text style={{ color: "#a1a1a1", fontSize: 12, marginBottom: 6 }}>
                    {member.locationName}
                  </Text>

                  {/* Episode phase badge */}
                  {ep && (
                    <View style={{ marginBottom: 6 }}>
                      <View
                        style={{
                          backgroundColor: epColor! + "25",
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          alignSelf: "flex-start",
                          borderWidth: 1,
                          borderColor: epColor! + "60",
                        }}
                      >
                        <Text style={{ color: epColor!, fontSize: 11, fontWeight: "700" }}>
                          {getPhaseLabel(ep.phase)}
                        </Text>
                      </View>
                      <Text style={{ color: "#a1a1a1", fontSize: 10, marginTop: 3 }}>
                        Severity: {(ep.severityScore * 100).toFixed(0)}%
                      </Text>
                    </View>
                  )}

                  {member.isWearingWatch && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="heart" size={12} color="#ff6467" />
                        <Text style={{ color: "#ff6467", fontSize: 12, fontWeight: "600" }}>
                          {member.health.heartRate}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: getStatusColor(member.health.status) + "30",
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: getStatusColor(member.health.status),
                            fontSize: 10,
                            fontWeight: "600",
                          }}
                        >
                          {member.health.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                  {!member.isWearingWatch && (
                    <Text style={{ color: "#737373", fontSize: 11, fontStyle: "italic" }}>
                      Watch not connected
                    </Text>
                  )}
                  <Text style={{ color: "#737373", fontSize: 10, marginTop: 4 }}>
                    Tap for details
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Top-left overlay: header + member chips */}
      <View
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          right: 16,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <GlassBlurCard borderRadius={12} padding={0}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#00bc7d",
                }}
              />
              <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 15 }}>
                Aritra Ring
              </Text>
              <Text style={{ color: "#a1a1a1", fontSize: 12 }}>
                {members.filter((m) => m.isWearingWatch).length}/{members.length} active
              </Text>
            </View>
          </GlassBlurCard>

          <GlassBlurCard borderRadius={12} padding={10}>
            <Pressable onPress={resetView}>
              <Ionicons name="locate" size={20} color="#e5e5e5" />
            </Pressable>
          </GlassBlurCard>
        </View>

        {/* Member chips below header — horizontally scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 5 }}
        >
          {[...members.filter((m) => m.id === "me"), ...members.filter((m) => m.id !== "me")].map((member) => {
            const hasEpisode = !!member.activeEpisode;
            return (
              <Pressable
                key={member.id}
                onPress={() => centerOnMember(member)}
                style={{
                  backgroundColor:
                    selectedMember?.id === member.id
                      ? "rgba(229, 229, 229, 0.95)"
                      : "rgba(23, 23, 23, 0.75)",
                  borderRadius: 14,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderColor:
                    selectedMember?.id === member.id
                      ? "#e5e5e5"
                      : hasEpisode
                        ? "#ff6467"
                        : getStatusColor(member.health.status) + "40",
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      selectedMember?.id === member.id
                        ? "#171717"
                        : getStatusColor(member.health.status),
                  }}
                />
                <Text
                  style={{
                    color: selectedMember?.id === member.id ? "#171717" : "#fafafa",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  {member.name}
                </Text>
                {member.isWearingWatch && member.health.heartRate > 0 && (
                  <Text
                    style={{
                      color: selectedMember?.id === member.id ? "#171717" : "#ff6467",
                      fontSize: 9,
                      fontWeight: "700",
                    }}
                  >
                    {member.health.heartRate}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
