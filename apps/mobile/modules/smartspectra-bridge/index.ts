import { requireNativeModule, EventEmitter, type Subscription } from "expo-modules-core";
import type {
  SmartSpectraRawMetrics,
  ScanProgressEvent,
  ScanResult,
} from "./src/SmartSpectraBridge.types";

export type { SmartSpectraRawMetrics, ScanProgressEvent, ScanResult };

// Safely load the native module — returns null if the SDK isn't linked yet.
// This lets the app run in demo/fallback mode without crashing.
let SmartSpectraBridge: any = null;
let emitter: EventEmitter | null = null;

try {
  SmartSpectraBridge = requireNativeModule("SmartSpectraBridge");
  emitter = new EventEmitter(SmartSpectraBridge);
} catch {
  // Native module not linked — SDK functions will be no-ops and isAvailable() returns false
}

/** Configure the SDK with an API key. Call once before scanning. */
export function configure(apiKey: string): void {
  SmartSpectraBridge?.configure(apiKey);
}

/** Start a scan for the given duration (seconds). Resolves with raw metrics. */
export function startScan(duration: number): Promise<ScanResult> {
  if (!SmartSpectraBridge) {
    return Promise.reject(new Error("SmartSpectra SDK not available"));
  }
  return SmartSpectraBridge.startScan(duration);
}

/** Cancel an in-progress scan. */
export function stopScan(): void {
  SmartSpectraBridge?.stopScan();
}

/** Returns false if SDK isn't linked or on simulator. */
export function isAvailable(): boolean {
  if (!SmartSpectraBridge) return false;
  try {
    return SmartSpectraBridge.isAvailable();
  } catch {
    return false;
  }
}

/** Subscribe to progress events emitted every second during a scan. */
export function addProgressListener(
  listener: (event: ScanProgressEvent) => void
): Subscription {
  if (!emitter) {
    // Return a no-op subscription so callers don't need to null-check
    return { remove: () => {} } as Subscription;
  }
  return emitter.addListener("onScanProgress", listener);
}
