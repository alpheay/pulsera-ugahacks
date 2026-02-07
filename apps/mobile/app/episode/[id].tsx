import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  type Episode,
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";

export default function EpisodeDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ id: string; data: string }>();

  let episode: Episode | null = null;
  try {
    const parsed = JSON.parse(data || "null");
    if (parsed) {
      episode = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        calmingStartedAt: parsed.calmingStartedAt
          ? new Date(parsed.calmingStartedAt)
          : undefined,
        calmingEndedAt: parsed.calmingEndedAt
          ? new Date(parsed.calmingEndedAt)
          : undefined,
        resolvedAt: parsed.resolvedAt ? new Date(parsed.resolvedAt) : undefined,
        timeline: (parsed.timeline || []).map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
      };
    }
  } catch {
    // Invalid data
  }

  if (!episode) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#94A3B8", fontSize: 16 }}>
          Episode not found
        </Text>
      </View>
    );
  }

  const phaseColor = getPhaseColor(episode.phase);
  const isActive = episode.phase !== "resolved";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0F172A" }}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
    >
      {/* Episode Header */}
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: phaseColor + "40",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                color: "#E2E8F0",
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              {episode.memberName}
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
              Episode {episode.id}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View
              style={{
                backgroundColor: phaseColor + "20",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: phaseColor,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {getPhaseLabel(episode.phase)}
              </Text>
            </View>
            {episode.severityScore > 0 && (
              <Text
                style={{
                  color: phaseColor,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                {(episode.severityScore * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Watch Biometrics */}
      <SectionHeader title="Watch Biometrics" icon="watch" color="#F59E0B" />
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", gap: 20 }}>
          <StatBox
            label="Heart Rate"
            value={`${episode.triggerData.heartRate}`}
            unit="BPM"
            color="#EF4444"
          />
          <StatBox
            label="HRV"
            value={`${episode.triggerData.hrv}`}
            unit="ms"
            color="#F59E0B"
          />
          <StatBox
            label="Type"
            value={episode.triggerData.anomalyType
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())
              .slice(0, 12)}
            unit=""
            color="#3B82F6"
          />
        </View>
      </View>

      {/* Presage Data */}
      {episode.presageData && (
        <>
          <SectionHeader
            title="Visual Check-In"
            icon="camera"
            color="#06B6D4"
          />
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ gap: 8 }}>
              <DataRow
                label="Visual HR"
                value={`${episode.presageData.visualHeartRate} BPM`}
                color="#EF4444"
              />
              <DataRow
                label="Breathing"
                value={`${episode.presageData.breathingRate} /min`}
                color="#3B82F6"
              />
              <DataRow
                label="Expression"
                value={episode.presageData.facialExpression}
                color={
                  episode.presageData.facialExpression === "calm"
                    ? "#10B981"
                    : "#F97316"
                }
              />
              <DataRow
                label="Eyes"
                value={episode.presageData.eyeResponsiveness}
                color={
                  episode.presageData.eyeResponsiveness === "normal"
                    ? "#10B981"
                    : "#F97316"
                }
              />
              <DataRow
                label="Confidence"
                value={`${(episode.presageData.confidenceScore * 100).toFixed(0)}%`}
                color="#F59E0B"
              />
            </View>
          </View>
        </>
      )}

      {/* Fusion Decision */}
      {episode.fusionResult && (
        <>
          <SectionHeader
            title="Fusion Analysis"
            icon="git-merge"
            color="#8B5CF6"
          />
          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor:
                episode.fusionResult.decision === "escalate"
                  ? "#EF444440"
                  : episode.fusionResult.decision === "false_positive"
                    ? "#10B98140"
                    : "#F59E0B40",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  backgroundColor:
                    (episode.fusionResult.decision === "escalate"
                      ? "#EF4444"
                      : episode.fusionResult.decision === "false_positive"
                        ? "#10B981"
                        : "#F59E0B") + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      episode.fusionResult.decision === "escalate"
                        ? "#EF4444"
                        : episode.fusionResult.decision === "false_positive"
                          ? "#10B981"
                          : "#F59E0B",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {episode.fusionResult.decision
                    .replace(/_/g, " ")
                    .toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  color: "#E2E8F0",
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                {(episode.fusionResult.combinedScore * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
              <ScoreBar
                label="Watch"
                score={episode.fusionResult.watchScore}
                color="#F59E0B"
              />
              {episode.fusionResult.presageScore !== null && (
                <ScoreBar
                  label="Visual"
                  score={episode.fusionResult.presageScore}
                  color="#06B6D4"
                />
              )}
            </View>

            <Text
              style={{
                color: "#94A3B8",
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {episode.fusionResult.explanation}
            </Text>
          </View>
        </>
      )}

      {/* Timeline */}
      <SectionHeader title="Timeline" icon="time" color="#94A3B8" />
      <View
        style={{
          backgroundColor: "#1E293B",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {episode.timeline.map((entry, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              marginBottom: index < episode!.timeline.length - 1 ? 14 : 0,
            }}
          >
            {/* Timeline dot & line */}
            <View style={{ alignItems: "center", width: 20, marginRight: 12 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: getPhaseColor(
                    entry.phase as any
                  ),
                  marginTop: 2,
                }}
              />
              {index < episode!.timeline.length - 1 && (
                <View
                  style={{
                    width: 1,
                    flex: 1,
                    backgroundColor: "#334155",
                    marginTop: 4,
                  }}
                />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#E2E8F0",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {entry.phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 10, marginTop: 2 }}>
                {formatTimestamp(entry.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      {isActive && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: "#10B981",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
            >
              Acknowledge & Resolve
            </Text>
          </Pressable>
          <Pressable
            style={{
              backgroundColor: "#EF444420",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#EF444460",
            }}
          >
            <Text
              style={{ color: "#EF4444", fontSize: 15, fontWeight: "700" }}
            >
              Call Emergency Services
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// --- Helper Components ---

function SectionHeader({
  title,
  icon,
  color,
}: {
  title: string;
  icon: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
      }}
    >
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={{ color, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function StatBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: "#64748B", fontSize: 10 }}>{label}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: "800", marginTop: 2 }}>
        {value}
      </Text>
      {unit ? (
        <Text style={{ color: "#64748B", fontSize: 10 }}>{unit}</Text>
      ) : null}
    </View>
  );
}

function DataRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#94A3B8", fontSize: 13 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={{ color: "#94A3B8", fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
          {(score * 100).toFixed(0)}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: "#0F172A",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${score * 100}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

function formatTimestamp(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
