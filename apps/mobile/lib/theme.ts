/**
 * Pulsera color constants — neutral dark palette matching web dashboard.
 * Derived from the shadcn/tailwind CSS dark theme (oklch values).
 */
export const colors = {
  // ── Neutral palette ──────────────────────────────────────
  /** Primary accent (light gray on dark) */
  primary: "#e5e5e5",
  /** Safe / healthy — chart-2 green */
  safe: "#00bc7d",
  /** Elevated risk — chart-3 amber */
  elevated: "#fe9a00",
  /** Critical alert — destructive red */
  critical: "#ff6467",
  /** Background — near black */
  bg: "#0a0a0a",
  /** Card surface */
  card: "#171717",
  /** Border / divider (white 10%) */
  border: "rgba(255, 255, 255, 0.10)",
  /** Primary text */
  text: "#fafafa",
  /** Muted / secondary text */
  textMuted: "#a1a1a1",
  /** Pure white for emphasis */
  white: "#FFFFFF",
  /** Transparent black overlays */
  overlay: "rgba(0, 0, 0, 0.5)",

  // ── Extended neutral palette ─────────────────────────────
  primaryForeground: "#171717",
  secondary: "#262626",
  muted: "#262626",
  ring: "#737373",
  destructive: "#ff6467",
  input: "rgba(255, 255, 255, 0.15)",
  cardBackground: "rgba(255, 255, 255, 0.06)",

  // ── Chart / Status colors (match web dashboard) ──────────
  /** chart-1 — info / blue */
  info: "#1447e6",
  /** chart-3 — warning / amber */
  warning: "#fe9a00",
  /** chart-5 — danger / vivid red */
  danger: "#ff2056",
  /** chart-4 — interactive / purple */
  interactive: "#ad46ff",
} as const;

/** Liquid-glass design tokens (glassmorphism surfaces). */
export const glass = {
  cardBg: "rgba(255,255,255,0.08)",
  cardBgElevated: "rgba(255,255,255,0.12)",
  border: "rgba(255,255,255,0.18)",
  borderSubtle: "rgba(255,255,255,0.12)",
  gradientStart: "rgba(255,255,255,0.15)",
  gradientEnd: "rgba(255,255,255,0.02)",
  blurIntensityIOS: 35,
  blurIntensityAndroid: 25,
  borderRadius: 20,
  borderRadiusSmall: 14,
  shadow: {
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  glowShadow: {
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  tabBarBg: "rgba(23,23,23,0.65)",
  overlayBg: "rgba(0,0,0,0.55)",
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
