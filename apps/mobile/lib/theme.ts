/**
 * Pulsera color constants — dark theme with amber accent.
 */
export const colors = {
  /** Amber accent — primary brand color */
  primary: "#F59E0B",
  /** Safe / healthy — green */
  safe: "#10B981",
  /** Elevated risk — orange */
  elevated: "#F97316",
  /** Critical alert — red */
  critical: "#EF4444",
  /** Background — dark navy */
  bg: "#0F172A",
  /** Card surface */
  card: "#1E293B",
  /** Border / divider */
  border: "#334155",
  /** Primary text */
  text: "#E2E8F0",
  /** Muted / secondary text */
  textMuted: "#94A3B8",
  /** Pure white for emphasis */
  white: "#FFFFFF",
  /** Transparent black overlays */
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

export type StatusLevel = "normal" | "elevated" | "critical" | "unknown" | "no_data" | "safe";

/**
 * Returns the appropriate color for a given status level.
 */
export function statusColor(status: StatusLevel): string {
  switch (status) {
    case "normal":
    case "safe":
      return colors.safe;
    case "elevated":
      return colors.elevated;
    case "critical":
      return colors.critical;
    case "unknown":
    case "no_data":
    default:
      return colors.textMuted;
  }
}

/**
 * Returns a human-readable label for a status level.
 */
export function statusLabel(status: StatusLevel): string {
  switch (status) {
    case "normal":
    case "safe":
      return "Normal";
    case "elevated":
      return "Elevated";
    case "critical":
      return "Critical";
    case "unknown":
    case "no_data":
    default:
      return "No Data";
  }
}
