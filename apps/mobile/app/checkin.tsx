import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { generatePresageData, type PresageResult } from "@/lib/episodeSimulator";

type CheckInStage = "ready" | "scanning" | "analyzing" | "complete";

export default function CheckInScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<CheckInStage>("ready");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PresageResult | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const scanPulse = useSharedValue(1);

  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1.0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
    opacity: stage === "scanning" ? 0.9 : 0.4,
  }));

  const startScan = () => {
    setStage("scanning");
    setProgress(0);

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(progressRef.current);
          setStage("analyzing");

          // Generate results after brief analysis
          setTimeout(() => {
            const presageResult = generatePresageData(Math.random() > 0.4);
            setResult(presageResult);
            setStage("complete");
          }, 2000);
        }
        return Math.min(next, 100);
      });
    }, 150); // 15 seconds total
  };

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const expressionColor = (expr: string) => {
    switch (expr) {
      case "calm":
        return "#10B981";
      case "confused":
        return "#F59E0B";
      case "distressed":
        return "#F97316";
      case "pain":
        return "#EF4444";
      default:
        return "#94A3B8";
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0F172A",
        paddingTop: 60,
        paddingHorizontal: 24,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 30 }}>
        <Text style={{ color: "#E2E8F0", fontSize: 24, fontWeight: "800" }}>
          Quick Check-In
        </Text>
        <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>
          A brief visual wellness check
        </Text>
      </View>

      {/* Camera simulation */}
      <View
        style={{
          backgroundColor: "#0D1117",
          borderRadius: 20,
          height: 320,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          borderWidth: 1,
          borderColor: stage === "scanning" ? "#06B6D4" : "#334155",
          overflow: "hidden",
        }}
      >
        {/* Face outline */}
        <Animated.View style={[pulseStyle]}>
          <View
            style={{
              width: 140,
              height: 180,
              borderRadius: 70,
              borderWidth: 2,
              borderColor:
                stage === "scanning" ? "#06B6D4" : "#334155",
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="person"
              size={60}
              color={stage === "scanning" ? "#06B6D4" : "#4A5568"}
            />
          </View>
        </Animated.View>

        {/* Scanning overlay */}
        {stage === "scanning" && (
          <View
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: "#1E293B",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#06B6D4",
                  borderRadius: 2,
                }}
              />
            </View>
            <Text
              style={{
                color: "#06B6D4",
                fontSize: 11,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Scanning... {progress}%
            </Text>
          </View>
        )}

        {stage === "analyzing" && (
          <View
            style={{
              position: "absolute",
              alignItems: "center",
            }}
          >
            <Ionicons name="analytics" size={36} color="#F59E0B" />
            <Text
              style={{
                color: "#F59E0B",
                fontSize: 13,
                fontWeight: "600",
                marginTop: 8,
              }}
            >
              Analyzing...
            </Text>
          </View>
        )}
      </View>

      {/* Action / Results */}
      {stage === "ready" && (
        <Pressable
          onPress={startScan}
          style={{
            backgroundColor: "#06B6D4",
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            Tap to Start
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 11,
              opacity: 0.7,
              marginTop: 2,
            }}
          >
            15-second visual wellness scan
          </Text>
        </Pressable>
      )}

      {stage === "complete" && result && (
        <View>
          <Text
            style={{
              color: "#10B981",
              fontSize: 14,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            Analysis Complete
          </Text>

          <View
            style={{
              backgroundColor: "#1E293B",
              borderRadius: 14,
              padding: 16,
            }}
          >
            {/* Readings */}
            <View style={{ gap: 10 }}>
              <ReadingRow
                icon="heart"
                label="Visual Heart Rate"
                value={`${result.visualHeartRate} BPM`}
                color="#EF4444"
              />
              <ReadingRow
                icon="cloud"
                label="Breathing Rate"
                value={`${result.breathingRate} /min`}
                color="#3B82F6"
              />
              <ReadingRow
                icon="happy"
                label="Expression"
                value={result.facialExpression}
                color={expressionColor(result.facialExpression)}
              />
              <ReadingRow
                icon="eye"
                label="Eye Response"
                value={result.eyeResponsiveness}
                color={
                  result.eyeResponsiveness === "normal"
                    ? "#10B981"
                    : "#F97316"
                }
              />
              <ReadingRow
                icon="shield-checkmark"
                label="Confidence"
                value={`${(result.confidenceScore * 100).toFixed(0)}%`}
                color="#F59E0B"
              />
            </View>
          </View>

          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: "#10B981",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
            >
              Done
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ReadingRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={{ color: "#94A3B8", fontSize: 13 }}>{label}</Text>
      </View>
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}
