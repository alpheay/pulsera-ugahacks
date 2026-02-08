import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { generatePresageData, type PresageResult } from "@/lib/episodeSimulator";
import GlassCard from "@/components/GlassCard";
import { glass } from "@/lib/theme";

type CheckInStage = "ready" | "scanning" | "analyzing" | "complete";

export default function CheckInScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<CheckInStage>("ready");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PresageResult | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const scanPulse = useSharedValue(1);

  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
    opacity: stage === "scanning" ? 0.9 : 0.4,
  }));

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const startScan = () => {
    setStage("scanning");
    setProgress(0);

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          clearInterval(progressRef.current);
          setStage("analyzing");

          // Quick analysis
          setTimeout(() => {
            const presageResult = generatePresageData(Math.random() > 0.4);
            setResult(presageResult);
            setStage("complete");
          }, 800);
        }
        return Math.min(next, 100);
      });
    }, 50); // ~2.5 seconds total scan
  };

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const expressionColor = (expr: string) => {
    switch (expr) {
      case "calm":
        return "#00bc7d";
      case "confused":
        return "#fe9a00";
      case "distressed":
        return "#fe9a00";
      case "pain":
        return "#ff6467";
      default:
        return "#a1a1a1";
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0a0a0a",
        paddingTop: 60,
        paddingHorizontal: 24,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Text style={{ color: "#fafafa", fontSize: 24, fontWeight: "800" }}>
          Quick Check-In
        </Text>
        <Text style={{ color: "#a1a1a1", fontSize: 13, marginTop: 4 }}>
          A brief visual wellness check
        </Text>
      </View>

      {/* Camera view */}
      <View
        style={{
          borderRadius: 20,
          height: 320,
          overflow: "hidden",
          marginBottom: 24,
          borderWidth: 1,
          borderColor: stage === "scanning" ? "#1447e6" : glass.border,
        }}
      >
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="front"
          >
            {/* Face outline overlay */}
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View style={[pulseStyle]}>
                <View
                  style={{
                    width: 140,
                    height: 180,
                    borderRadius: 70,
                    borderWidth: 2,
                    borderColor:
                      stage === "scanning" ? "#1447e6" : "rgba(255,255,255,0.3)",
                    borderStyle: "dashed",
                  }}
                />
              </Animated.View>
            </View>

            {/* Scanning progress overlay */}
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
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      backgroundColor: "#1447e6",
                      borderRadius: 2,
                    }}
                  />
                </View>
                <Text
                  style={{
                    color: "#1447e6",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 6,
                    textShadowColor: "rgba(0,0,0,0.8)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  Scanning... {progress}%
                </Text>
              </View>
            )}

            {stage === "analyzing" && (
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <Ionicons name="analytics" size={36} color="#fe9a00" />
                <Text
                  style={{
                    color: "#fe9a00",
                    fontSize: 13,
                    fontWeight: "600",
                    marginTop: 8,
                  }}
                >
                  Analyzing...
                </Text>
              </View>
            )}
          </CameraView>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: "#050505",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera-outline" size={48} color="#737373" />
            <Text style={{ color: "#a1a1a1", fontSize: 13, marginTop: 8 }}>
              Camera permission required
            </Text>
            <Pressable
              onPress={requestPermission}
              style={{
                backgroundColor: "#1447e6",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginTop: 12,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                Grant Access
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Action / Results */}
      {stage === "ready" && (
        <Pressable
          onPress={startScan}
          style={{
            backgroundColor: "#1447e6",
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
            3-second visual wellness scan
          </Text>
        </Pressable>
      )}

      {stage === "complete" && result && (
        <View>
          <Text
            style={{
              color: "#00bc7d",
              fontSize: 14,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            Analysis Complete
          </Text>

          <GlassCard padding={16} borderRadius={glass.borderRadiusSmall}>
            {/* Readings */}
            <View style={{ gap: 10 }}>
              <ReadingRow
                icon="heart"
                label="Visual Heart Rate"
                value={`${result.visualHeartRate} BPM`}
                color="#ff6467"
              />
              <ReadingRow
                icon="cloud"
                label="Breathing Rate"
                value={`${result.breathingRate} /min`}
                color="#1447e6"
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
                    ? "#00bc7d"
                    : "#fe9a00"
                }
              />
              <ReadingRow
                icon="shield-checkmark"
                label="Confidence"
                value={`${(result.confidenceScore * 100).toFixed(0)}%`}
                color="#fe9a00"
              />
            </View>
          </GlassCard>

          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: "#00bc7d",
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
        <Text style={{ color: "#a1a1a1", fontSize: 13 }}>{label}</Text>
      </View>
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}
