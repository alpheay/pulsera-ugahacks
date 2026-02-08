import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import {
  generatePresageData,
  mapSmartSpectraToPresage,
  type PresageResult,
} from "@/lib/episodeSimulator";
import GlassCard from "@/components/GlassCard";
import { glass, colors } from "@/lib/theme";
import {
  configure,
  startScan as sdkStartScan,
  stopScan as sdkStopScan,
  isAvailable as sdkIsAvailable,
  addProgressListener,
} from "../modules/smartspectra-bridge";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type CheckInStage =
  | "ready"
  | "initializing"
  | "scanning"
  | "analyzing"
  | "complete"
  | "error";

const SCAN_DURATION = 20; // seconds — SDK minimum
const DEMO_DURATION = 3; // seconds — fast fake scan for simulator
const PROGRESS_RING_SIZE = 200;
const STROKE_WIDTH = 6;
const RADIUS = (PROGRESS_RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CheckInScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<CheckInStage>("ready");
  const [secondsLeft, setSecondsLeft] = useState(SCAN_DURATION);
  const [result, setResult] = useState<PresageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const demoTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Check SDK availability on mount
  const sdkAvailable = useRef(false);
  useEffect(() => {
    try {
      sdkAvailable.current = sdkIsAvailable();
    } catch {
      sdkAvailable.current = false;
    }
    setIsDemoMode(!sdkAvailable.current);
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, []);

  // Pulse animation for face guide
  const scanPulse = useSharedValue(1);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
  }));

  // Progress ring animation
  const progress = useSharedValue(0);
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const startRealScan = useCallback(async () => {
    setStage("initializing");
    setSecondsLeft(SCAN_DURATION);
    progress.value = 0;

    try {
      configure("PRESAGE_API_KEY"); // Will be replaced with real key
    } catch {
      setErrorMsg("Failed to initialize SDK.");
      setStage("error");
      return;
    }

    setStage("scanning");

    const sub = addProgressListener((event) => {
      setSecondsLeft(event.secondsRemaining);
      progress.value = withTiming(event.progress, { duration: 900 });
    });

    try {
      const scanResult = await sdkStartScan(SCAN_DURATION);
      sub.remove();

      progress.value = withTiming(1, { duration: 300 });
      setStage("analyzing");

      // Brief analysis delay for UX
      setTimeout(() => {
        if (scanResult.metrics.hasData) {
          const mapped = mapSmartSpectraToPresage(scanResult.metrics);
          setResult(mapped);
          setStage("complete");
        } else {
          setErrorMsg("Not enough facial data captured. Please try again.");
          setStage("error");
        }
      }, 600);
    } catch (e: any) {
      sub.remove();
      if (e?.code !== "ERR_CANCELLED") {
        setErrorMsg(e?.message ?? "Scan failed. Please try again.");
        setStage("error");
      }
    }
  }, []);

  const startDemoScan = useCallback(() => {
    setStage("scanning");
    setSecondsLeft(DEMO_DURATION);
    progress.value = 0;

    let elapsed = 0;
    demoTimerRef.current = setInterval(() => {
      elapsed += 1;
      const remaining = DEMO_DURATION - elapsed;
      const p = elapsed / DEMO_DURATION;

      setSecondsLeft(Math.max(0, remaining));
      progress.value = withTiming(Math.min(p, 1), { duration: 900 });

      if (elapsed >= DEMO_DURATION) {
        clearInterval(demoTimerRef.current);
        progress.value = withTiming(1, { duration: 300 });
        setStage("analyzing");

        setTimeout(() => {
          const presageResult = generatePresageData(Math.random() > 0.4);
          setResult(presageResult);
          setStage("complete");
        }, 600);
      }
    }, 1000);
  }, []);

  const handleStart = useCallback(() => {
    if (sdkAvailable.current) {
      startRealScan();
    } else {
      startDemoScan();
    }
  }, [startRealScan, startDemoScan]);

  const handleCancel = useCallback(() => {
    if (sdkAvailable.current) {
      try { sdkStopScan(); } catch {}
    }
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    progress.value = 0;
    setStage("ready");
    setSecondsLeft(isDemoMode ? DEMO_DURATION : SCAN_DURATION);
  }, [isDemoMode]);

  const handleRetry = useCallback(() => {
    setErrorMsg("");
    setResult(null);
    setStage("ready");
    progress.value = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
      try { sdkStopScan(); } catch {}
    };
  }, []);

  const expressionColor = (expr: string) => {
    switch (expr) {
      case "calm": return colors.safe;
      case "confused": return colors.elevated;
      case "distressed": return colors.elevated;
      case "pain": return colors.critical;
      default: return colors.textMuted;
    }
  };

  const isScanning = stage === "scanning" || stage === "initializing";
  const scanDuration = isDemoMode ? DEMO_DURATION : SCAN_DURATION;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quick Check-In</Text>
        <Text style={styles.subtitle}>
          {isDemoMode
            ? "Demo Mode — simulated vitals"
            : "Contactless vital signs via front camera"}
        </Text>
        {isDemoMode && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>Demo Mode</Text>
          </View>
        )}
      </View>

      {/* Scan area */}
      <View
        style={[
          styles.scanArea,
          { borderColor: isScanning ? colors.info : glass.border },
        ]}
      >
        {/* Camera preview (or dark fallback) with face guide */}
        {cameraPermission?.granted ? (
          <CameraView style={styles.scanBackground} facing="front" mirror>
            {(stage === "ready" || isScanning) && (
              <View style={styles.faceGuideContainer}>
                {/* Progress ring */}
                {isScanning && (
                  <Svg
                    width={PROGRESS_RING_SIZE}
                    height={PROGRESS_RING_SIZE}
                    style={styles.progressRing}
                  >
                    <Circle
                      cx={PROGRESS_RING_SIZE / 2}
                      cy={PROGRESS_RING_SIZE / 2}
                      r={RADIUS}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                    />
                    <AnimatedCircle
                      cx={PROGRESS_RING_SIZE / 2}
                      cy={PROGRESS_RING_SIZE / 2}
                      r={RADIUS}
                      stroke={colors.info}
                      strokeWidth={STROKE_WIDTH}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      animatedProps={animatedCircleProps}
                      transform={`rotate(-90 ${PROGRESS_RING_SIZE / 2} ${PROGRESS_RING_SIZE / 2})`}
                    />
                  </Svg>
                )}

                <Animated.View style={[styles.faceOvalWrapper, pulseStyle]}>
                  <View
                    style={[
                      styles.faceOval,
                      {
                        borderColor: isScanning
                          ? colors.info
                          : "rgba(255,255,255,0.25)",
                      },
                    ]}
                  />
                </Animated.View>

                {isScanning && (
                  <View style={styles.countdownContainer}>
                    <Text style={styles.countdownText}>{secondsLeft}s</Text>
                    <Text style={styles.instructionText}>
                      {secondsLeft > scanDuration - 3
                        ? "Hold still, face the camera"
                        : `${secondsLeft} seconds remaining`}
                    </Text>
                  </View>
                )}

                {stage === "ready" && (
                  <View style={styles.countdownContainer}>
                    <Ionicons name="scan-outline" size={28} color="rgba(255,255,255,0.4)" />
                    <Text style={[styles.instructionText, { marginTop: 8 }]}>
                      Position your face in the oval
                    </Text>
                  </View>
                )}
              </View>
            )}

            {stage === "analyzing" && (
              <View style={styles.analyzingOverlay}>
                <Ionicons name="analytics" size={36} color={colors.warning} />
                <Text style={styles.analyzingText}>Analyzing vitals...</Text>
              </View>
            )}

            {stage === "error" && (
              <View style={styles.analyzingOverlay}>
                <Ionicons name="alert-circle" size={42} color={colors.critical} />
                <Text style={styles.errorText}>Could not capture vitals</Text>
                <Text style={styles.errorSubtext}>{errorMsg}</Text>
              </View>
            )}
          </CameraView>
        ) : (
          <View style={styles.scanBackground}>
            <View style={styles.faceGuideContainer}>
              <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={[styles.instructionText, { marginTop: 12 }]}>
                Camera permission required
              </Text>
              <Pressable
                onPress={requestCameraPermission}
                style={styles.permissionButton}
              >
                <Text style={styles.permissionButtonText}>Grant Access</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Cancel button during scan */}
        {isScanning && (
          <Pressable onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Action buttons / Results */}
      {stage === "ready" && (
        <Pressable onPress={handleStart} style={styles.startButton}>
          <Text style={styles.startButtonText}>Tap to Start</Text>
          <Text style={styles.startButtonSub}>
            {isDemoMode
              ? `${DEMO_DURATION}-second simulated scan`
              : `${SCAN_DURATION}-second contactless scan`}
          </Text>
        </Pressable>
      )}

      {stage === "error" && (
        <Pressable onPress={handleRetry} style={styles.retryButton}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      )}

      {stage === "complete" && result && (
        <View>
          <Text style={styles.completeHeader}>
            Analysis Complete
          </Text>

          <GlassCard padding={16} borderRadius={glass.borderRadiusSmall}>
            <View style={{ gap: 10 }}>
              <ReadingRow
                icon="heart"
                label="Visual Heart Rate"
                value={`${result.visualHeartRate} BPM`}
                color={colors.critical}
              />
              <ReadingRow
                icon="cloud"
                label="Breathing Rate"
                value={`${result.breathingRate} /min`}
                color={colors.info}
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
                    ? colors.safe
                    : colors.elevated
                }
              />
              <ReadingRow
                icon="shield-checkmark"
                label="Confidence"
                value={`${(result.confidenceScore * 100).toFixed(0)}%`}
                color={colors.warning}
              />
            </View>
          </GlassCard>

          <Pressable onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
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
    <View style={styles.readingRow}>
      <View style={styles.readingLabel}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={styles.readingLabelText}>{label}</Text>
      </View>
      <Text style={[styles.readingValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  demoBadge: {
    backgroundColor: "rgba(254,154,0,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(254,154,0,0.3)",
  },
  demoBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  scanArea: {
    borderRadius: 20,
    height: 320,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
  },
  scanBackground: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  faceGuideContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: PROGRESS_RING_SIZE,
    height: PROGRESS_RING_SIZE + 60,
  },
  progressRing: {
    position: "absolute",
    top: 0,
  },
  faceOvalWrapper: {
    position: "absolute",
    top: (PROGRESS_RING_SIZE - 160) / 2,
  },
  faceOval: {
    width: 120,
    height: 160,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  countdownContainer: {
    position: "absolute",
    bottom: -10,
    alignItems: "center",
  },
  countdownText: {
    color: colors.info,
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  instructionText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  analyzingText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  errorText: {
    color: colors.critical,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  errorSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  permissionButton: {
    marginTop: 16,
    backgroundColor: colors.info,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelButton: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: colors.info,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  startButtonSub: {
    color: "#FFFFFF",
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: colors.critical,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  completeHeader: {
    color: colors.safe,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  doneButton: {
    backgroundColor: colors.safe,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readingLabelText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  readingValue: {
    fontSize: 13,
    fontWeight: "600",
  },
});
