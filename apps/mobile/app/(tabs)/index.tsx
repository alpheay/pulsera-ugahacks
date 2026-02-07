import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FAMILY_MEMBERS,
  SAVED_PLACES,
  MAP_CENTER,
  simulateLocationUpdate,
  timeAgo,
  getStatusColor,
  getBatteryColor,
  type MemberLocation,
} from "@/lib/simulatedData";

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [members, setMembers] = useState<MemberLocation[]>(FAMILY_MEMBERS);
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);

  // Simulate live location updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMembers((prev) => prev.map(simulateLocationUpdate));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
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
            fillColor="rgba(245, 158, 11, 0.08)"
            strokeColor="rgba(245, 158, 11, 0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Member markers */}
        {members.map((member) => (
          <Marker
            key={member.id}
            coordinate={{
              latitude: member.latitude,
              longitude: member.longitude,
            }}
            onPress={() => centerOnMember(member)}
          >
            <View style={{ alignItems: "center" }}>
              {/* Avatar bubble */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: getStatusColor(member.health.status),
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: "#1E293B",
                  shadowColor: getStatusColor(member.health.status),
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: "#0F172A",
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
                  backgroundColor: "#1E293B",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    color: "#E2E8F0",
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
                  backgroundColor: "#1E293B",
                  borderRadius: 12,
                  padding: 12,
                  width: 200,
                  borderWidth: 1,
                  borderColor: "#334155",
                }}
              >
                <Text
                  style={{
                    color: "#E2E8F0",
                    fontWeight: "700",
                    fontSize: 15,
                    marginBottom: 4,
                  }}
                >
                  {member.name}
                  {member.relation !== "self" ? ` (${member.relation})` : ""}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6 }}>
                  {member.locationName}
                </Text>
                {member.isWearingWatch && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="heart" size={12} color="#EF4444" />
                      <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "600" }}>
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
                  <Text style={{ color: "#64748B", fontSize: 11, fontStyle: "italic" }}>
                    Watch not connected
                  </Text>
                )}
                <Text style={{ color: "#64748B", fontSize: 10, marginTop: 4 }}>
                  Tap for details
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Top bar overlay */}
      <View
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          right: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#1E293Bee",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: "#334155",
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#10B981",
            }}
          />
          <Text style={{ color: "#E2E8F0", fontWeight: "700", fontSize: 15 }}>
            Pulsera
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>
            {members.filter((m) => m.isWearingWatch).length}/{members.length} active
          </Text>
        </View>

        <Pressable
          onPress={resetView}
          style={{
            backgroundColor: "#1E293Bee",
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: "#334155",
          }}
        >
          <Ionicons name="locate" size={20} color="#F59E0B" />
        </Pressable>
      </View>

      {/* Bottom member chips */}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          paddingHorizontal: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => centerOnMember(member)}
              style={{
                backgroundColor:
                  selectedMember?.id === member.id ? "#F59E0B" : "#1E293Bee",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor:
                  selectedMember?.id === member.id
                    ? "#F59E0B"
                    : getStatusColor(member.health.status) + "50",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    selectedMember?.id === member.id
                      ? "#0F172A"
                      : getStatusColor(member.health.status),
                }}
              />
              <Text
                style={{
                  color:
                    selectedMember?.id === member.id ? "#0F172A" : "#E2E8F0",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {member.name}
              </Text>
              {member.isWearingWatch && member.health.heartRate > 0 && (
                <Text
                  style={{
                    color:
                      selectedMember?.id === member.id ? "#0F172A" : "#EF4444",
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {member.health.heartRate}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
