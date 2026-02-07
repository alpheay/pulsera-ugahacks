export type GradientVariant = "welcome" | "passive" | "normal" | "critical" | "call" | "monitoring" | "distress"

export const GRADIENTS: Record<GradientVariant, readonly [string, string, string]> = {
  welcome: ["#171717", "#262626", "#0A0A0A"],
  passive: ["#171717", "#262626", "#0A0A0A"],
  normal: ["#064e3b", "#065f46", "#022c22"],
  monitoring: ["#064e3b", "#065f46", "#022c22"],
  critical: ["#7f1d1d", "#991b1b", "#450a0a"],
  distress: ["#7f1d1d", "#991b1b", "#450a0a"],
  call: ["#171717", "#115e59", "#042f2e"],
} as const

export const INPUT_COLORS = {
  placeholder: "rgba(255,255,255,0.4)",
  placeholderSubtle: "rgba(255,255,255,0.2)",
} as const

export const RAW_COLORS = {
  background: "#0A0A0A",
  foreground: "#FAFAFA",
  mutedForeground: "#A1A1A1",
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  high: "#f97316",
  destructive: "#ef4444",
} as const

export const STATE_ACCENTS = {
  PASSIVE: RAW_COLORS.primary,
  MONITORING: RAW_COLORS.success,
  SESSION: RAW_COLORS.success,
  DISTRESS: RAW_COLORS.warning,
} as const

export type HeroStatus = "PASSIVE" | "MONITORING" | "SESSION" | "DISTRESS"

export const HERO_CONFIGS = {
  PASSIVE: {
    icon: "moon" as const,
    title: "Standby",
    subtitle: "Tap Monitor to start watching over",
    iconColor: "rgba(250,250,250,0.7)",
    textColor: "text-foreground/80",
    gradientVariant: "welcome" as const,
  },
  MONITORING: {
    icon: "shield-checkmark" as const,
    title: "Watching Over",
    subtitle: "Everything looks good",
    iconColor: "#34d399",
    textColor: "text-emerald-400",
    gradientVariant: "normal" as const,
  },
  SESSION: {
    icon: "chatbubbles" as const,
    title: "In Conversation",
    subtitle: "AI assistant is helping",
    iconColor: "#818cf8",
    textColor: "text-indigo-400",
    gradientVariant: "normal" as const,
  },
  DISTRESS: {
    icon: "alert-circle" as const,
    title: "Needs Attention",
    subtitle: "May need your help",
    iconColor: "#f87171",
    textColor: "text-red-400",
    gradientVariant: "critical" as const,
  },
} as const

export const ACCESSIBILITY = {
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
  minTouchTarget: 44,
  preferredTouchTarget: 56,
  largeTouchTarget: 64,
} as const
