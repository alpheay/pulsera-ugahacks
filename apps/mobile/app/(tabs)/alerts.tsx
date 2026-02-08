import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import EpisodeCard from "@/components/EpisodeCard";
import { FAMILY_MEMBERS } from "@/lib/simulatedData";
import {
  type Episode,
  createEpisode,
  simulateEpisodeProgression,
  generatePresageData,
} from "@/lib/episodeSimulator";

const WATCH_MEMBERS = FAMILY_MEMBERS.filter((m) => m.isWearingWatch && m.id !== "me");

export default function AlertsScreen() {
  const router = useRouter();
  const [activeEpisodes, setActiveEpisodes] = useState<Episode[]>([]);
  const [resolvedEpisodes, setResolvedEpisodes] = useState<Episode[]>([]);

  // Auto-trigger a demo episode for a random member on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const member = WATCH_MEMBERS[Math.floor(Math.random() * WATCH_MEMBERS.length)];
      const hr = 130 + Math.floor(Math.random() * 25);
      const hrv = 18 + Math.floor(Math.random() * 10);
      const episode = createEpisode(member.id, member.name, hr, hrv);
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

  const activeCount = activeEpisodes.filter(
    (e) => e.phase !== "resolved"
  ).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 100 }}
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
              color: "#fafafa",
              fontSize: 28,
              fontWeight: "800",
            }}
          >
            Pulses
          </Text>
          <Text style={{ color: "#a1a1a1", fontSize: 14, marginTop: 2 }}>
            Detection & response episodes
          </Text>
        </View>

        {/* Active count badge */}
        {activeCount > 0 && (
          <View
            style={{
              backgroundColor: "#ff6467",
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
              color: "#ff6467",
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
          <Ionicons name="shield-checkmark" size={48} color="#00bc7d" />
          <Text
            style={{
              color: "#fafafa",
              fontSize: 16,
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            All Clear
          </Text>
          <Text
            style={{
              color: "#a1a1a1",
              fontSize: 13,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            No active episodes. Your ring is safe.
          </Text>
        </View>
      )}

      {/* Resolved Episodes */}
      {resolvedEpisodes.length > 0 && (
        <View>
          <Text
            style={{
              color: "#a1a1a1",
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
