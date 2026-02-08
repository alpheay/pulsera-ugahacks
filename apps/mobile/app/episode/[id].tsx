import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  type Episode,
  getPhaseLabel,
  getPhaseColor,
} from "@/lib/episodeSimulator";
import GlassCard from "@/components/GlassCard";
import { glass } from "@/lib/theme";

const ANOMALY_LABELS: Record<string, string> = {
  sustained_elevated_hr: "Elevated HR",
  sudden_spike: "HR Spike",
  irregular_rhythm: "Irregular Rhythm",
  low_hrv: "Low HRV",
};

const MEDICAL_GLOSSARY: { term: string; definition: string }[] = [
  { term: "HRV", definition: "Heart Rate Variability — the variation in time between heartbeats. Lower HRV can indicate stress or a health event." },
  { term: "BPM", definition: "Beats Per Minute — how many times the heart beats in one minute. Resting adult range is typically 60–100 BPM." },
  { term: "Anomaly Score", definition: "A 0–100% severity rating computed from watch biometrics indicating how far vitals deviate from the wearer's baseline." },
  { term: "Fusion Analysis", definition: "Combines watch biometric data with visual check-in data to produce a more accurate severity assessment." },
  { term: "Sustained Elevated HR", definition: "Heart rate remains above the wearer's expected range for an extended period, which may signal distress." },
  { term: "Visual Check-In", definition: "A camera-based assessment that reads facial expression, breathing rate, and eye responsiveness to corroborate watch data." },
];

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
          backgroundColor: "#0a0a0a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#a1a1a1", fontSize: 16 }}>
          Episode not found
        </Text>
      </View>
    );
  }

  const phaseColor = getPhaseColor(episode.phase);
  const isActive = episode.phase !== "resolved";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
    >
      {/* Episode Header */}
      <GlassCard
        padding={18}
        borderRadius={16}
        borderColor={phaseColor + "40"}
        glow={isActive}
        style={{ marginBottom: 16 }}
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
                color: "#fafafa",
                fontSize: 20,
                fontWeight: "800",
              }}
            >
              {episode.memberName}
            </Text>
            <Text style={{ color: "#a1a1a1", fontSize: 12, marginTop: 2 }}>
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
      </GlassCard>

      {/* Watch Biometrics */}
      <SectionHeader title="Watch Biometrics" icon="watch" color="#fe9a00" />
      <GlassCard padding={16} borderRadius={glass.borderRadiusSmall} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", gap: 20 }}>
          <StatBox
            label="Heart Rate"
            value={`${episode.triggerData.heartRate}`}
            unit="BPM"
            color="#ff6467"
          />
          <StatBox
            label="HRV"
            value={`${Number(episode.triggerData.hrv).toFixed(1)}`}
            unit="ms"
            color="#fe9a00"
          />
          <StatBox
            label="Type"
            value={ANOMALY_LABELS[episode.triggerData.anomalyType] ?? episode.triggerData.anomalyType.replace(/_/g, " ")}
            unit=""
            color="#1447e6"
          />
        </View>
      </GlassCard>

      {/* Presage Data */}
      {episode.presageData && (
        <>
          <SectionHeader
            title="Visual Check-In"
            icon="camera"
            color="#1447e6"
          />
          <GlassCard padding={16} borderRadius={glass.borderRadiusSmall} style={{ marginBottom: 16 }}>
            <View style={{ gap: 8 }}>
              <DataRow
                label="Visual HR"
                value={`${episode.presageData.visualHeartRate} BPM`}
                color="#ff6467"
              />
              <DataRow
                label="Breathing"
                value={`${episode.presageData.breathingRate} /min`}
                color="#1447e6"
              />
              <DataRow
                label="Expression"
                value={episode.presageData.facialExpression}
                color={
                  episode.presageData.facialExpression === "calm"
                    ? "#00bc7d"
                    : "#fe9a00"
                }
              />
              <DataRow
                label="Eyes"
                value={episode.presageData.eyeResponsiveness}
                color={
                  episode.presageData.eyeResponsiveness === "normal"
                    ? "#00bc7d"
                    : "#fe9a00"
                }
              />
              <DataRow
                label="Confidence"
                value={`${(episode.presageData.confidenceScore * 100).toFixed(0)}%`}
                color="#fe9a00"
              />
            </View>
          </GlassCard>
        </>
      )}

      {/* Fusion Decision */}
      {episode.fusionResult && (
        <>
          <SectionHeader
            title="Fusion Analysis"
            icon="git-merge"
            color="#ad46ff"
          />
          <GlassCard
            padding={16}
            borderRadius={glass.borderRadiusSmall}
            borderColor={
              episode.fusionResult.decision === "escalate"
                ? "#ff646740"
                : episode.fusionResult.decision === "false_positive"
                  ? "#00bc7d40"
                  : "#fe9a0040"
            }
            style={{ marginBottom: 16 }}
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
                      ? "#ff6467"
                      : episode.fusionResult.decision === "false_positive"
                        ? "#00bc7d"
                        : "#fe9a00") + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      episode.fusionResult.decision === "escalate"
                        ? "#ff6467"
                        : episode.fusionResult.decision === "false_positive"
                          ? "#00bc7d"
                          : "#fe9a00",
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
                  color: "#fafafa",
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
                color="#fe9a00"
              />
              {episode.fusionResult.presageScore !== null && (
                <ScoreBar
                  label="Visual"
                  score={episode.fusionResult.presageScore}
                  color="#1447e6"
                />
              )}
            </View>

            <Text
              style={{
                color: "#a1a1a1",
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {episode.fusionResult.explanation}
            </Text>
          </GlassCard>
        </>
      )}

      {/* Timeline */}
      <SectionHeader title="Timeline" icon="time" color="#a1a1a1" />
      <GlassCard padding={16} borderRadius={glass.borderRadiusSmall} style={{ marginBottom: 16 }}>
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
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    marginTop: 4,
                  }}
                />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#fafafa",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {entry.phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={{ color: "#737373", fontSize: 10, marginTop: 2 }}>
                {formatTimestamp(entry.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </GlassCard>

      {/* Medical Glossary */}
      <GlossarySection />

      {/* Action Buttons */}
      {isActive && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: "#00bc7d",
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
              backgroundColor: "#ff646720",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#ff646760",
            }}
          >
            <Text
              style={{ color: "#ff6467", fontSize: 15, fontWeight: "700" }}
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
      <Text style={{ color: "#737373", fontSize: 10 }}>{label}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: "800", marginTop: 2 }}>
        {value}
      </Text>
      {unit ? (
        <Text style={{ color: "#737373", fontSize: 10 }}>{unit}</Text>
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
      <Text style={{ color: "#a1a1a1", fontSize: 13 }}>{label}</Text>
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
        <Text style={{ color: "#a1a1a1", fontSize: 11 }}>{label}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
          {(score * 100).toFixed(0)}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: "#0a0a0a",
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

function GlossarySection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Ionicons name="help-circle" size={14} color="#a1a1a1" />
        <Text
          style={{
            color: "#a1a1a1",
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.3,
          }}
        >
          WHAT DO THESE MEAN?
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color="#a1a1a1"
        />
      </Pressable>

      {expanded && (
        <GlassCard padding={16} borderRadius={glass.borderRadiusSmall} style={{ marginBottom: 16 }}>
          <View style={{ gap: 12 }}>
          {MEDICAL_GLOSSARY.map((item) => (
            <View key={item.term}>
              <Text
                style={{
                  color: "#fafafa",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {item.term}
              </Text>
              <Text
                style={{
                  color: "#a1a1a1",
                  fontSize: 12,
                  lineHeight: 17,
                  marginTop: 2,
                }}
              >
                {item.definition}
              </Text>
            </View>
          ))}
          </View>
        </GlassCard>
      )}
    </>
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
