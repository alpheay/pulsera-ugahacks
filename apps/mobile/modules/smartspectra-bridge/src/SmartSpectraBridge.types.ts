export interface SmartSpectraRawMetrics {
  pulseRate: number;
  pulseConfidence: number;
  breathingRate: number;
  breathingConfidence: number;
  blinkRate: number;
  isTalking: boolean;
  hasData: boolean;
}

export interface ScanProgressEvent {
  secondsRemaining: number;
  totalSeconds: number;
  progress: number; // 0.0 – 1.0
}

export interface ScanResult {
  metrics: SmartSpectraRawMetrics;
  durationSeconds: number;
}
