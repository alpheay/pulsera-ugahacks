import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import EpisodeCard from "@/components/EpisodeCard";
import {
  type Episode,
  createEpisode,
  simulateEpisodeProgression,
  generatePresageData,
} from "@/lib/episodeSimulator";

export default function AlertsScreen() {
  const router = useRouter();
  const [activeEpisodes, setActiveEpisodes] = useState<Episode[]>([]);
  const [resolvedEpisodes, setResolvedEpisodes] = useState<Episode[]>([]);

  // Auto-trigger a demo episode on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const episode = createEpisode("carlos", "Carlos", 142, 22);
      setActiveEpisodes([episode]);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-progress active episodes for demo
  useEffect(() => {
    if (activeEpisodes.length === 0) return;

    const interval = setInterval(() => {
      setActiveEpisodes((prev) =>
        prev.map((ep) => {
          if (ep.phase === "resolved") return ep;

          let updated = simulateEpisodeProgression(ep);

          // Auto-add presage data at visual_check phase
          if (updated.phase === "visual_check" && !updated.presageData) {
            updated = {
              ...updated,
              presageData: generatePresageData(true),
            };
          }

          // Move resolved episodes to history
          if (updated.phase === "resolved") {
            setTimeout(() => {
              setActiveEpisodes((curr) =>
                curr.filter((e) => e.id !== updated.id)
              );
              setResolvedEpisodes((curr) => [updated, ...curr]);
            }, 3000);
          }

          return updated;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [activeEpisodes.length]);

  const triggerDemoEpisode = useCallback(() => {
    const episode = createEpisode("carlos", "Carlos", 148, 18);
    setActiveEpisodes((prev) => [...prev, episode]);
  }, []);

  const activeCount = activeEpisodes.filter(
    (e) => e.phase !== "resolved"
  ).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View>
          <Text
            style={{
              color: "#E2E8F0",
              fontSize: 28,
              fontWeight: "800",
            }}
          >
            Alerts
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 2 }}>
            Detection & response episodes
          </Text>
        </View>

        {/* Active count badge */}
        {activeCount > 0 && (
          <View
            style={{
              backgroundColor: "#EF4444",
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 6,
              minWidth: 36,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}
            >
              {activeCount}
            </Text>
          </View>
        )}
      </View>

      {/* Active Episodes */}
      {activeEpisodes.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: "#EF4444",
              fontSize: 13,
              fontWeight: "700",
              marginBottom: 10,
              letterSpacing: 0.5,
            }}
          >
            ACTIVE EPISODES
          </Text>
          {activeEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              onPress={() =>
                router.push({
                  pathname: "/episode/[id]",
                  params: { id: episode.id, data: JSON.stringify(episode) },
                })
              }
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {activeEpisodes.length === 0 && resolvedEpisodes.length === 0 && (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          <Text
            style={{
              color: "#E2E8F0",
              fontSize: 16,
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            All Clear
          </Text>
          <Text
            style={{
              color: "#94A3B8",
              fontSize: 13,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            No active episodes. Your family is safe.
          </Text>
        </View>
      )}

      {/* Demo button */}
      <Pressable
        onPress={triggerDemoEpisode}
        style={{
          backgroundColor: "#F59E0B20",
          borderRadius: 12,
          padding: 14,
          alignItems: "center",
          marginBottom: 24,
          borderWidth: 1,
          borderColor: "#F59E0B40",
        }}
      >
        <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 14 }}>
          Trigger Demo Episode
        </Text>
        <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
          Simulates a detection event for Carlos
        </Text>
      </Pressable>

      {/* Resolved Episodes */}
      {resolvedEpisodes.length > 0 && (
        <View>
          <Text
            style={{
              color: "#94A3B8",
              fontSize: 13,
              fontWeight: "700",
              marginBottom: 10,
              letterSpacing: 0.5,
            }}
          >
            RECENT EPISODES
          </Text>
          {resolvedEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              compact
              onPress={() =>
                router.push({
                  pathname: "/episode/[id]",
                  params: { id: episode.id, data: JSON.stringify(episode) },
                })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
