// Episode simulation for demo — full 6-phase detection & response flow

export type EpisodePhase =
  | "anomaly_detected"
  | "calming"
  | "re_evaluating"
  | "visual_check"
  | "fusing"
  | "escalating"
  | "resolved";

export interface TimelineEntry {
  phase: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface PresageResult {
  visualHeartRate: number;
  breathingRate: number;
  facialExpression: "calm" | "distressed" | "confused" | "pain";
  blinkRate: number;
  eyeResponsiveness: "normal" | "slow" | "unresponsive";
  confidenceScore: number;
}

export interface FusionResult {
  decision: "escalate" | "false_positive" | "ambiguous";
  watchScore: number;
  presageScore: number | null;
  combinedScore: number;
  explanation: string;
}

export interface Episode {
  id: string;
  memberId: string;
  memberName: string;
  phase: EpisodePhase;
  triggerData: { heartRate: number; hrv: number; anomalyType: string };
  timeline: TimelineEntry[];
  calmingStartedAt?: Date;
  calmingEndedAt?: Date;
  presageData?: PresageResult;
  fusionResult?: FusionResult;
  severityScore: number;
  escalationLevel: number;
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

let episodeIdCounter = 0;

export function createEpisode(
  memberId: string,
  memberName: string,
  heartRate: number,
  hrv: number
): Episode {
  episodeIdCounter++;
  const now = new Date();

  return {
    id: `ep-${episodeIdCounter}-${Date.now().toString(36)}`,
    memberId,
    memberName,
    phase: "anomaly_detected",
    triggerData: {
      heartRate,
      hrv,
      anomalyType: "sustained_elevated_hr",
    },
    timeline: [
      {
        phase: "anomaly_detected",
        timestamp: now,
        data: { heartRate, hrv, anomalyType: "sustained_elevated_hr" },
      },
    ],
    severityScore: 0.5,
    escalationLevel: 0,
    createdAt: now,
  };
}

// Progress episode to next phase for demo auto-progression
export function simulateEpisodeProgression(episode: Episode): Episode {
  const now = new Date();

  switch (episode.phase) {
    case "anomaly_detected":
      return {
        ...episode,
        phase: "calming",
        calmingStartedAt: now,
        timeline: [
          ...episode.timeline,
          { phase: "calming", timestamp: now, data: { duration: 75 } },
        ],
      };

    case "calming":
      return {
        ...episode,
        phase: "re_evaluating",
        calmingEndedAt: now,
        timeline: [
          ...episode.timeline,
          {
            phase: "re_evaluating",
            timestamp: now,
            data: { postVitals: { heartRate: 128, hrv: 24 } },
          },
        ],
      };

    case "re_evaluating":
      return {
        ...episode,
        phase: "visual_check",
        timeline: [
          ...episode.timeline,
          {
            phase: "visual_check",
            timestamp: now,
            data: { reason: "post_calming_still_elevated" },
          },
        ],
      };

    case "visual_check":
      return {
        ...episode,
        phase: "fusing",
        timeline: [
          ...episode.timeline,
          {
            phase: "fusing",
            timestamp: now,
            data: { presageReceived: true },
          },
        ],
      };

    case "fusing": {
      const fusion = runLocalFusion(
        episode.triggerData,
        episode.presageData
      );
      return {
        ...episode,
        phase: fusion.decision === "false_positive" ? "resolved" : "escalating",
        fusionResult: fusion,
        severityScore: fusion.combinedScore,
        escalationLevel: fusion.decision === "false_positive" ? 0 : 1,
        resolution:
          fusion.decision === "false_positive" ? "false_positive" : undefined,
        resolvedAt:
          fusion.decision === "false_positive" ? now : undefined,
        timeline: [
          ...episode.timeline,
          {
            phase: "fusion_complete",
            timestamp: now,
            data: fusion as unknown as Record<string, unknown>,
          },
        ],
      };
    }

    case "escalating":
      return {
        ...episode,
        phase: "resolved",
        resolution: "caregiver_acknowledged",
        resolvedAt: now,
        timeline: [
          ...episode.timeline,
          {
            phase: "resolved",
            timestamp: now,
            data: { resolution: "caregiver_acknowledged" },
          },
        ],
      };

    case "resolved":
      return episode;
  }
}

// Map real SmartSpectra SDK metrics to our PresageResult format
export function mapSmartSpectraToPresage(raw: {
  pulseRate: number;
  pulseConfidence: number;
  breathingRate: number;
  breathingConfidence: number;
  blinkRate: number;
  isTalking: boolean;
  hasData: boolean;
}): PresageResult {
  const hr = Math.round(raw.pulseRate);
  const br = Math.round(raw.breathingRate);
  const blink = Math.round(raw.blinkRate);
  const confidence =
    (raw.pulseConfidence + raw.breathingConfidence) / 2;

  // Facial expression heuristic based on vitals
  let facialExpression: PresageResult["facialExpression"] = "calm";
  if (hr > 130 && br > 24) {
    facialExpression = "pain";
  } else if (hr > 110 && br > 20) {
    facialExpression = "distressed";
  } else if (blink < 5 || blink > 35) {
    facialExpression = "confused";
  }

  // Eye responsiveness from blink rate
  let eyeResponsiveness: PresageResult["eyeResponsiveness"] = "normal";
  if (blink < 3) {
    eyeResponsiveness = "unresponsive";
  } else if (blink < 10) {
    eyeResponsiveness = "slow";
  }

  return {
    visualHeartRate: hr,
    breathingRate: br,
    facialExpression,
    blinkRate: blink,
    eyeResponsiveness,
    confidenceScore: Math.min(1, Math.max(0, confidence)),
  };
}

export function generatePresageData(isDistressed: boolean): PresageResult {
  if (isDistressed) {
    return {
      visualHeartRate: 130 + Math.floor(Math.random() * 20),
      breathingRate: 22 + Math.floor(Math.random() * 6),
      facialExpression: Math.random() > 0.3 ? "distressed" : "pain",
      blinkRate: 25 + Math.floor(Math.random() * 10),
      eyeResponsiveness: Math.random() > 0.5 ? "slow" : "unresponsive",
      confidenceScore: 0.75 + Math.random() * 0.2,
    };
  }

  return {
    visualHeartRate: 70 + Math.floor(Math.random() * 15),
    breathingRate: 12 + Math.floor(Math.random() * 4),
    facialExpression: "calm",
    blinkRate: 14 + Math.floor(Math.random() * 6),
    eyeResponsiveness: "normal",
    confidenceScore: 0.85 + Math.random() * 0.1,
  };
}

export function runLocalFusion(
  watchData: { heartRate: number; hrv: number },
  presageData?: PresageResult
): FusionResult {
  // Normalize watch score
  const hrScore = Math.min(1, Math.max(0, (watchData.heartRate - 80) / 80));
  const hrvScore = Math.min(1, Math.max(0, (50 - watchData.hrv) / 40));
  const watchScore = hrScore * 0.7 + hrvScore * 0.3;

  if (presageData) {
    const expressionScores: Record<string, number> = {
      calm: 0.1,
      confused: 0.4,
      distressed: 0.8,
      pain: 0.95,
    };
    const eyeScores: Record<string, number> = {
      normal: 0.1,
      slow: 0.5,
      unresponsive: 0.95,
    };

    const presageScore =
      ((expressionScores[presageData.facialExpression] ?? 0.5) * 0.6 +
        (eyeScores[presageData.eyeResponsiveness] ?? 0.3) * 0.4) *
      presageData.confidenceScore;

    const combinedScore = watchScore * 0.5 + presageScore * 0.5;

    let decision: FusionResult["decision"];
    let explanation: string;

    if (combinedScore >= 0.6) {
      decision = "escalate";
      explanation = `Watch vitals elevated (HR=${watchData.heartRate}) and visual check shows ${presageData.facialExpression} expression. Combined severity ${(combinedScore * 100).toFixed(0)}% warrants escalation.`;
    } else if (combinedScore <= 0.3) {
      decision = "false_positive";
      explanation = `Despite elevated watch readings, visual check shows ${presageData.facialExpression} expression with normal responsiveness. Likely exercise or stress.`;
    } else {
      decision = "ambiguous";
      explanation = `Mixed signals: watch score ${(watchScore * 100).toFixed(0)}%, visual score ${(presageScore * 100).toFixed(0)}%. Monitoring recommended.`;
    }

    return {
      decision,
      watchScore: Math.round(watchScore * 1000) / 1000,
      presageScore: Math.round(presageScore * 1000) / 1000,
      combinedScore: Math.round(combinedScore * 1000) / 1000,
      explanation,
    };
  }

  // No presage data
  const combinedScore = watchScore;
  return {
    decision: watchScore >= 0.7 ? "ambiguous" : "false_positive",
    watchScore: Math.round(watchScore * 1000) / 1000,
    presageScore: null,
    combinedScore: Math.round(combinedScore * 1000) / 1000,
    explanation: `No visual check-in data. Watch score: ${(watchScore * 100).toFixed(0)}%. ${watchScore >= 0.7 ? "Recommending monitoring." : "Watch-only data suggests false positive."}`,
  };
}

// Phase display helpers
export function getPhaseLabel(phase: EpisodePhase): string {
  switch (phase) {
    case "anomaly_detected":
      return "Anomaly Detected";
    case "calming":
      return "Calming Exercise";
    case "re_evaluating":
      return "Re-evaluating";
    case "visual_check":
      return "Visual Check-In";
    case "fusing":
      return "Analyzing Data";
    case "escalating":
      return "Escalating";
    case "resolved":
      return "Resolved";
  }
}

export function getPhaseColor(phase: EpisodePhase): string {
  switch (phase) {
    case "anomaly_detected":
      return "#F97316";
    case "calming":
      return "#3B82F6";
    case "re_evaluating":
      return "#8B5CF6";
    case "visual_check":
      return "#06B6D4";
    case "fusing":
      return "#F59E0B";
    case "escalating":
      return "#EF4444";
    case "resolved":
      return "#10B981";
  }
}
