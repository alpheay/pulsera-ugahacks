"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import PulseraIcon from "@/components/PulseraIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  Activity,
  Thermometer,
  Watch,
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  Zap,
  Shield,
  Bell,
  Footprints,
  Moon,
  Droplets,
  X,
} from "lucide-react";

/* ─────────────────────── MOCK DATA ─────────────────────── */

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar: string; // initials
  avatarColor: string;
  status: "normal" | "elevated" | "critical";
  heartRate: number;
  bloodOxygen: number;
  temperature: number;
  steps: number;
  lastSync: string;
  device: "Apple Watch" | "iPhone";
  location: string;
}

const familyMembers: FamilyMember[] = [
  {
    id: "1",
    name: "Margaret Chen",
    relation: "Grandmother",
    avatar: "MC",
    avatarColor: "#E8524A",
    status: "normal",
    heartRate: 72,
    bloodOxygen: 97,
    temperature: 98.2,
    steps: 3241,
    lastSync: "2 min ago",
    device: "Apple Watch",
    location: "Home",
  },
  {
    id: "2",
    name: "David Chen",
    relation: "Father",
    avatar: "DC",
    avatarColor: "#D4873E",
    status: "elevated",
    heartRate: 98,
    bloodOxygen: 95,
    temperature: 99.1,
    steps: 8762,
    lastSync: "Just now",
    device: "Apple Watch",
    location: "Office",
  },
  {
    id: "3",
    name: "Lily Chen",
    relation: "Sister",
    avatar: "LC",
    avatarColor: "#7B8F4E",
    status: "normal",
    heartRate: 68,
    bloodOxygen: 99,
    temperature: 97.8,
    steps: 12034,
    lastSync: "5 min ago",
    device: "iPhone",
    location: "University",
  },
  {
    id: "4",
    name: "James Chen",
    relation: "Grandfather",
    avatar: "JC",
    avatarColor: "#5B7BA5",
    status: "critical",
    heartRate: 112,
    bloodOxygen: 91,
    temperature: 100.4,
    steps: 876,
    lastSync: "1 min ago",
    device: "Apple Watch",
    location: "Home",
  },
  {
    id: "5",
    name: "Sophie Chen",
    relation: "Mother",
    avatar: "SC",
    avatarColor: "#9B6B9E",
    status: "normal",
    heartRate: 74,
    bloodOxygen: 98,
    temperature: 98.0,
    steps: 6543,
    lastSync: "8 min ago",
    device: "iPhone",
    location: "Market",
  },
];

interface DeviceEvent {
  id: string;
  memberId: string;
  memberName: string;
  type: "health" | "activity" | "system" | "location";
  icon: "heart" | "steps" | "sleep" | "sync" | "location" | "blood" | "temp";
  title: string;
  detail: string;
  timestamp: string;
  priority: "low" | "medium" | "high";
}

const deviceEvents: DeviceEvent[] = [
  {
    id: "e1",
    memberId: "4",
    memberName: "James Chen",
    type: "health",
    icon: "heart",
    title: "Elevated heart rate detected",
    detail: "Heart rate reached 112 BPM during rest period",
    timestamp: "1 min ago",
    priority: "high",
  },
  {
    id: "e2",
    memberId: "2",
    memberName: "David Chen",
    type: "activity",
    icon: "steps",
    title: "Step goal reached",
    detail: "Completed 8,762 steps - 87% of daily goal",
    timestamp: "12 min ago",
    priority: "low",
  },
  {
    id: "e3",
    memberId: "3",
    memberName: "Lily Chen",
    type: "activity",
    icon: "steps",
    title: "Daily step goal exceeded",
    detail: "Lily has walked 12,034 steps today",
    timestamp: "18 min ago",
    priority: "low",
  },
  {
    id: "e4",
    memberId: "1",
    memberName: "Margaret Chen",
    type: "health",
    icon: "blood",
    title: "Blood oxygen stable",
    detail: "SpO2 consistent at 97% over the last hour",
    timestamp: "24 min ago",
    priority: "low",
  },
  {
    id: "e5",
    memberId: "4",
    memberName: "James Chen",
    type: "health",
    icon: "temp",
    title: "Temperature elevated",
    detail: "Body temperature reading 100.4\u00b0F",
    timestamp: "32 min ago",
    priority: "high",
  },
  {
    id: "e6",
    memberId: "5",
    memberName: "Sophie Chen",
    type: "location",
    icon: "location",
    title: "Left home zone",
    detail: "Sophie left the home geofence at 10:23 AM",
    timestamp: "45 min ago",
    priority: "medium",
  },
  {
    id: "e7",
    memberId: "2",
    memberName: "David Chen",
    type: "system",
    icon: "sync",
    title: "Watch synced",
    detail: "Apple Watch data synchronized successfully",
    timestamp: "1 hr ago",
    priority: "low",
  },
  {
    id: "e8",
    memberId: "3",
    memberName: "Lily Chen",
    type: "health",
    icon: "sleep",
    title: "Sleep report ready",
    detail: "7h 42m total sleep, 89% sleep quality",
    timestamp: "2 hr ago",
    priority: "low",
  },
  {
    id: "e9",
    memberId: "1",
    memberName: "Margaret Chen",
    type: "location",
    icon: "location",
    title: "Arrived home",
    detail: "Margaret entered the home geofence",
    timestamp: "3 hr ago",
    priority: "low",
  },
];

interface PanicEvent {
  id: string;
  memberId: string;
  memberName: string;
  avatar: string;
  avatarColor: string;
  type: "panic" | "stress" | "fall" | "irregular";
  severity: "warning" | "critical" | "resolved";
  title: string;
  detail: string;
  timestamp: string;
  location: string;
  metrics: { label: string; value: string }[];
  resolved: boolean;
}

const panicEvents: PanicEvent[] = [
  {
    id: "p1",
    memberId: "4",
    memberName: "James Chen",
    avatar: "JC",
    avatarColor: "#5B7BA5",
    type: "irregular",
    severity: "critical",
    title: "Irregular heartbeat pattern",
    detail:
      "Apple Watch detected an irregular heart rhythm. Heart rate spiked to 112 BPM with arrhythmic patterns during a resting period. Duration: 4 minutes.",
    timestamp: "1 min ago",
    location: "Home - Living Room",
    metrics: [
      { label: "Heart Rate", value: "112 BPM" },
      { label: "Duration", value: "4 min" },
      { label: "SpO2", value: "91%" },
    ],
    resolved: false,
  },
  {
    id: "p2",
    memberId: "2",
    memberName: "David Chen",
    avatar: "DC",
    avatarColor: "#D4873E",
    type: "stress",
    severity: "warning",
    title: "Prolonged stress detected",
    detail:
      "Elevated heart rate variability and increased cortisol indicators over the past 2 hours. HRV dropped below baseline threshold.",
    timestamp: "38 min ago",
    location: "Office",
    metrics: [
      { label: "HRV", value: "22ms" },
      { label: "Heart Rate", value: "98 BPM" },
      { label: "Duration", value: "2 hr" },
    ],
    resolved: false,
  },
  {
    id: "p3",
    memberId: "1",
    memberName: "Margaret Chen",
    avatar: "MC",
    avatarColor: "#E8524A",
    type: "fall",
    severity: "resolved",
    title: "Fall detection triggered",
    detail:
      "Apple Watch detected a potential fall event. User confirmed they are okay via watch prompt. Automatic SOS was cancelled.",
    timestamp: "3 hr ago",
    location: "Home - Kitchen",
    metrics: [
      { label: "Impact", value: "Moderate" },
      { label: "Response", value: "Self-cleared" },
      { label: "Heart Rate", value: "89 BPM" },
    ],
    resolved: true,
  },
  {
    id: "p4",
    memberId: "4",
    memberName: "James Chen",
    avatar: "JC",
    avatarColor: "#5B7BA5",
    type: "panic",
    severity: "resolved",
    title: "SOS button activated",
    detail:
      "James triggered the emergency SOS from his Apple Watch. Emergency contacts were notified. Situation was resolved after check-in call.",
    timestamp: "Yesterday, 8:12 PM",
    location: "Home - Bedroom",
    metrics: [
      { label: "Heart Rate", value: "128 BPM" },
      { label: "Response", value: "3 min" },
      { label: "Contacts notified", value: "2" },
    ],
    resolved: true,
  },
];

/* ─────────────────────── HELPERS ─────────────────────── */

const statusColor = (status: FamilyMember["status"]) => {
  switch (status) {
    case "normal":
      return { bg: "rgba(123,143,78,0.15)", dot: "#7B8F4E", text: "#7B8F4E" };
    case "elevated":
      return { bg: "rgba(212,135,62,0.15)", dot: "#D4873E", text: "#D4873E" };
    case "critical":
      return { bg: "rgba(232,82,74,0.15)", dot: "#E8524A", text: "#E8524A" };
  }
};

const eventIconMap = {
  heart: Heart,
  steps: Footprints,
  sleep: Moon,
  sync: Watch,
  location: MapPin,
  blood: Droplets,
  temp: Thermometer,
};

const eventPriorityColor = (priority: DeviceEvent["priority"]) => {
  switch (priority) {
    case "low":
      return "#6B6B5E";
    case "medium":
      return "#D4873E";
    case "high":
      return "#E8524A";
  }
};

const panicSeverityStyle = (severity: PanicEvent["severity"]) => {
  switch (severity) {
    case "critical":
      return {
        border: "rgba(232,82,74,0.4)",
        bg: "rgba(232,82,74,0.06)",
        badge: "#E8524A",
        badgeBg: "rgba(232,82,74,0.15)",
        pulse: true,
      };
    case "warning":
      return {
        border: "rgba(212,135,62,0.4)",
        bg: "rgba(212,135,62,0.06)",
        badge: "#D4873E",
        badgeBg: "rgba(212,135,62,0.15)",
        pulse: false,
      };
    case "resolved":
      return {
        border: "rgba(107,107,94,0.2)",
        bg: "rgba(107,107,94,0.03)",
        badge: "#6B6B5E",
        badgeBg: "rgba(107,107,94,0.12)",
        pulse: false,
      };
  }
};

const panicTypeIcon = (type: PanicEvent["type"]) => {
  switch (type) {
    case "panic":
      return Phone;
    case "stress":
      return Activity;
    case "fall":
      return AlertTriangle;
    case "irregular":
      return Heart;
  }
};

/* ─────────────────────── EASE ─────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;

/* ─────────────────────── COMPONENT ─────────────────────── */

export default function Dashboard() {
  const [selectedMember, setSelectedMember] = useState<string | null>("4");
  const [expandedPanic, setExpandedPanic] = useState<string | null>("p1");

  const selected = familyMembers.find((m) => m.id === selectedMember);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=Work+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.12); }
          28% { transform: scale(1); }
          42% { transform: scale(1.08); }
          56% { transform: scale(1); }
        }
        .noise-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          background-size: 256px;
          pointer-events: none;
          z-index: 1;
          border-radius: inherit;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,241,230,0.1); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,241,230,0.2); }
      `}</style>

      <div
        className="min-h-screen flex flex-col relative noise-overlay"
        style={{
          background: "linear-gradient(145deg, #1A1410 0%, #0F0D0B 40%, #12100E 100%)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ── Background textures ── */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(232,82,74,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 80% 80%, rgba(212,135,62,0.03) 0%, transparent 70%)",
          }}
        />

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="relative z-20 flex items-center justify-between px-6 md:px-10 pt-6 pb-4"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <PulseraIcon size={28} color="#FFF1E6" />
              <div
                className="absolute -inset-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(circle, rgba(232,82,74,0.2) 0%, transparent 70%)" }}
              />
            </div>
            <span
              style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" }}
              className="text-lg text-[#FFF1E6]"
            >
              Pulsera
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="relative">
              <Bell size={18} className="text-[#FFF1E6]/40 hover:text-[#FFF1E6]/70 transition-colors cursor-pointer" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E8524A]" />
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: "rgba(232,82,74,0.15)", color: "#E8524A" }}
              >
                YC
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-[#FFF1E6]/80">Your Circle</p>
                <p className="text-[10px] text-[#FFF1E6]/30">{familyMembers.length} members active</p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── Page title ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="relative z-20 px-6 md:px-10 pb-6"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#E8524A] mb-1.5">
                Family Dashboard
              </p>
              <h1
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-2xl md:text-3xl font-bold text-[#FFF1E6] leading-tight"
              >
                Everyone at <span className="italic font-normal text-[#E8524A]/80">a glance</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-[#FFF1E6]/30">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7B8F4E] animate-pulse" />
              <span>Live sync active</span>
            </div>
          </div>
        </motion.div>

        {/* ── Dashboard grid ── */}
        <main className="relative z-10 flex-1 px-4 md:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 max-w-[1600px] mx-auto">
            {/* ═══════════════════════════════════════════════════
                REGION 1: FAMILY TRACKING (left column)
            ═══════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease }}
              className="lg:col-span-5 flex flex-col gap-4"
            >
              {/* Family member cards */}
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, rgba(255,241,230,0.04) 0%, rgba(255,241,230,0.01) 100%)",
                  border: "1px solid rgba(255,241,230,0.06)",
                }}
              >
                <div className="p-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield size={14} className="text-[#E8524A]/70" />
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-sm font-bold text-[#FFF1E6]/90"
                    >
                      Family Circle
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#FFF1E6]/25 tracking-wide">
                    {familyMembers.filter((m) => m.status === "normal").length}/{familyMembers.length} normal
                  </span>
                </div>

                <ScrollArea className="h-[420px] md:h-[480px]">
                  <div className="px-4 pb-4 space-y-2.5">
                    {familyMembers.map((member, i) => {
                      const sc = statusColor(member.status);
                      const isSelected = selectedMember === member.id;
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 + i * 0.06, ease }}
                          onClick={() => setSelectedMember(isSelected ? null : member.id)}
                          className="group cursor-pointer relative"
                        >
                          <div
                            className="rounded-xl p-4 transition-all duration-300"
                            style={{
                              background: isSelected
                                ? "rgba(255,241,230,0.06)"
                                : "rgba(255,241,230,0.02)",
                              border: `1px solid ${isSelected ? "rgba(255,241,230,0.1)" : "rgba(255,241,230,0.03)"}`,
                            }}
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Avatar with status ring */}
                              <div className="relative flex-shrink-0">
                                <div
                                  className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold tracking-wide"
                                  style={{
                                    background: `linear-gradient(135deg, ${member.avatarColor}20, ${member.avatarColor}35)`,
                                    color: member.avatarColor,
                                    boxShadow: `0 0 20px ${member.avatarColor}10`,
                                  }}
                                >
                                  {member.avatar}
                                </div>
                                {/* Status dot */}
                                <div className="absolute -bottom-0.5 -right-0.5">
                                  <div
                                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                    style={{
                                      background: "#1A1410",
                                      border: `2px solid ${sc.dot}`,
                                    }}
                                  >
                                    {member.status === "critical" && (
                                      <div
                                        className="absolute w-3.5 h-3.5 rounded-full"
                                        style={{
                                          background: sc.dot,
                                          animation: "pulse-ring 2s ease-out infinite",
                                        }}
                                      />
                                    )}
                                    <div
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ background: sc.dot }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-sm font-semibold text-[#FFF1E6]/90 truncate">
                                    {member.name}
                                  </h3>
                                  <span
                                    className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                                    style={{ background: sc.bg, color: sc.text }}
                                  >
                                    {member.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2.5">
                                  <span className="text-[10px] text-[#FFF1E6]/30">
                                    {member.relation}
                                  </span>
                                  <span className="text-[#FFF1E6]/10">|</span>
                                  <span className="text-[10px] text-[#FFF1E6]/30 flex items-center gap-1">
                                    <Watch size={9} />
                                    {member.device}
                                  </span>
                                  <span className="text-[#FFF1E6]/10">|</span>
                                  <span className="text-[10px] text-[#FFF1E6]/30 flex items-center gap-1">
                                    <MapPin size={9} />
                                    {member.location}
                                  </span>
                                </div>

                                {/* Vitals row */}
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="flex flex-col items-center rounded-lg py-1.5 px-1" style={{ background: "rgba(255,241,230,0.02)" }}>
                                    <Heart
                                      size={11}
                                      className="mb-0.5"
                                      style={{
                                        color: member.status === "critical" ? "#E8524A" : "#FFF1E6",
                                        opacity: member.status === "critical" ? 1 : 0.3,
                                        animation: member.status === "critical" ? "heartbeat 1.5s infinite" : "none",
                                      }}
                                    />
                                    <span
                                      className="text-[11px] font-bold"
                                      style={{ color: member.heartRate > 100 ? "#E8524A" : "#FFF1E6", opacity: member.heartRate > 100 ? 1 : 0.7 }}
                                    >
                                      {member.heartRate}
                                    </span>
                                    <span className="text-[8px] text-[#FFF1E6]/25 uppercase">bpm</span>
                                  </div>
                                  <div className="flex flex-col items-center rounded-lg py-1.5 px-1" style={{ background: "rgba(255,241,230,0.02)" }}>
                                    <Droplets size={11} className="text-[#FFF1E6]/30 mb-0.5" />
                                    <span
                                      className="text-[11px] font-bold"
                                      style={{ color: member.bloodOxygen < 94 ? "#E8524A" : "#FFF1E6", opacity: member.bloodOxygen < 94 ? 1 : 0.7 }}
                                    >
                                      {member.bloodOxygen}%
                                    </span>
                                    <span className="text-[8px] text-[#FFF1E6]/25 uppercase">SpO2</span>
                                  </div>
                                  <div className="flex flex-col items-center rounded-lg py-1.5 px-1" style={{ background: "rgba(255,241,230,0.02)" }}>
                                    <Thermometer size={11} className="text-[#FFF1E6]/30 mb-0.5" />
                                    <span
                                      className="text-[11px] font-bold"
                                      style={{ color: member.temperature > 99.5 ? "#E8524A" : "#FFF1E6", opacity: member.temperature > 99.5 ? 1 : 0.7 }}
                                    >
                                      {member.temperature}
                                    </span>
                                    <span className="text-[8px] text-[#FFF1E6]/25 uppercase">&deg;F</span>
                                  </div>
                                  <div className="flex flex-col items-center rounded-lg py-1.5 px-1" style={{ background: "rgba(255,241,230,0.02)" }}>
                                    <Footprints size={11} className="text-[#FFF1E6]/30 mb-0.5" />
                                    <span className="text-[11px] font-bold text-[#FFF1E6]/70">
                                      {(member.steps / 1000).toFixed(1)}k
                                    </span>
                                    <span className="text-[8px] text-[#FFF1E6]/25 uppercase">steps</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded detail panel */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-3 mt-3 border-t border-[#FFF1E6]/5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-[10px] text-[#FFF1E6]/40">
                                        <Clock size={10} />
                                        Last synced {member.lastSync}
                                      </div>
                                      <button
                                        className="text-[10px] font-medium text-[#E8524A]/70 hover:text-[#E8524A] transition-colors flex items-center gap-1 px-2.5 py-1 rounded-full"
                                        style={{ background: "rgba(232,82,74,0.08)" }}
                                      >
                                        View Details
                                        <ChevronRight size={10} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════
                RIGHT SIDE: Events + Panic (stacked)
            ═══════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 flex flex-col gap-4 md:gap-5">
              {/* ═══════════════════════════════════════════════════
                  REGION 2: DEVICE EVENTS FEED
              ═══════════════════════════════════════════════════ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35, ease }}
                className="rounded-2xl overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, rgba(255,241,230,0.035) 0%, rgba(255,241,230,0.01) 100%)",
                  border: "1px solid rgba(255,241,230,0.06)",
                }}
              >
                <div className="p-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Zap size={14} className="text-[#D4873E]/70" />
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-sm font-bold text-[#FFF1E6]/90"
                    >
                      Device Events
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#FFF1E6]/25 tracking-wide">
                      Apple Watch & iPhone
                    </span>
                  </div>
                </div>

                <ScrollArea className="h-[240px] md:h-[220px]">
                  <div className="px-4 pb-4">
                    {deviceEvents.map((event, i) => {
                      const IconComp = eventIconMap[event.icon];
                      const priorityColor = eventPriorityColor(event.priority);
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.4 + i * 0.04, ease }}
                          className="group flex items-start gap-3 py-2.5 border-b border-[#FFF1E6]/[0.03] last:border-0 hover:bg-[#FFF1E6]/[0.02] px-2 -mx-2 rounded-lg transition-colors cursor-default"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: `${priorityColor}15`,
                              border: `1px solid ${priorityColor}20`,
                            }}
                          >
                            <IconComp size={13} style={{ color: priorityColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-[#FFF1E6]/80 truncate">
                                {event.title}
                              </span>
                              {event.priority === "high" && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: "#E8524A" }}
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-[#FFF1E6]/30 truncate">
                              {event.memberName} &middot; {event.detail}
                            </p>
                          </div>
                          <span className="text-[9px] text-[#FFF1E6]/20 flex-shrink-0 mt-1">
                            {event.timestamp}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </motion.div>

              {/* ═══════════════════════════════════════════════════
                  REGION 3: PANIC / STRESS EVENTS
              ═══════════════════════════════════════════════════ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease }}
                className="rounded-2xl overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg, rgba(232,82,74,0.04) 0%, rgba(255,241,230,0.01) 100%)",
                  border: "1px solid rgba(232,82,74,0.1)",
                }}
              >
                <div className="p-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <AlertTriangle size={14} className="text-[#E8524A]" />
                      <div
                        className="absolute -inset-1 rounded-full"
                        style={{
                          background: "rgba(232,82,74,0.3)",
                          animation: "pulse-ring 3s ease-out infinite",
                        }}
                      />
                    </div>
                    <h2
                      style={{ fontFamily: "'Playfair Display', serif" }}
                      className="text-sm font-bold text-[#FFF1E6]/90"
                    >
                      Panic & Stress Alerts
                    </h2>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(232,82,74,0.15)",
                        color: "#E8524A",
                      }}
                    >
                      {panicEvents.filter((e) => !e.resolved).length} active
                    </span>
                  </div>
                </div>

                <ScrollArea className="h-[260px] md:h-[280px]">
                  <div className="px-4 pb-4 space-y-3">
                    {panicEvents.map((event, i) => {
                      const style = panicSeverityStyle(event.severity);
                      const IconComp = panicTypeIcon(event.type);
                      const isExpanded = expandedPanic === event.id;

                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.55 + i * 0.08, ease }}
                          onClick={() => setExpandedPanic(isExpanded ? null : event.id)}
                          className="cursor-pointer"
                        >
                          <div
                            className="rounded-xl p-4 transition-all duration-300 relative overflow-hidden"
                            style={{
                              background: style.bg,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {/* Shimmer effect for critical */}
                            {style.pulse && (
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: "linear-gradient(90deg, transparent 0%, rgba(232,82,74,0.05) 50%, transparent 100%)",
                                  backgroundSize: "200% 100%",
                                  animation: "shimmer 3s ease-in-out infinite",
                                }}
                              />
                            )}

                            <div className="relative z-10">
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: style.badgeBg,
                                    border: `1px solid ${style.badge}30`,
                                  }}
                                >
                                  <IconComp size={16} style={{ color: style.badge }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#FFF1E6]/90">
                                      {event.title}
                                    </span>
                                    <span
                                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                      style={{
                                        background: style.badgeBg,
                                        color: style.badge,
                                      }}
                                    >
                                      {event.severity}
                                    </span>
                                    {event.resolved && (
                                      <span className="text-[9px] text-[#7B8F4E]/80 font-medium">
                                        Resolved
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[#FFF1E6]/30">
                                    <span
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                                      style={{
                                        background: `${event.avatarColor}25`,
                                        color: event.avatarColor,
                                      }}
                                    >
                                      {event.avatar}
                                    </span>
                                    <span>{event.memberName}</span>
                                    <span className="text-[#FFF1E6]/10">|</span>
                                    <MapPin size={9} />
                                    <span>{event.location}</span>
                                    <span className="text-[#FFF1E6]/10">|</span>
                                    <Clock size={9} />
                                    <span>{event.timestamp}</span>
                                  </div>
                                </div>

                                <ChevronRight
                                  size={14}
                                  className="text-[#FFF1E6]/20 flex-shrink-0 mt-1 transition-transform duration-300"
                                  style={{
                                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                  }}
                                />
                              </div>

                              {/* Expanded details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pt-3 mt-3 border-t" style={{ borderColor: `${style.border}` }}>
                                      <p className="text-[11px] text-[#FFF1E6]/50 leading-relaxed mb-3">
                                        {event.detail}
                                      </p>

                                      {/* Metrics chips */}
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {event.metrics.map((metric) => (
                                          <div
                                            key={metric.label}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                                            style={{
                                              background: "rgba(255,241,230,0.03)",
                                              border: "1px solid rgba(255,241,230,0.05)",
                                            }}
                                          >
                                            <span className="text-[9px] text-[#FFF1E6]/30 uppercase tracking-wide">
                                              {metric.label}
                                            </span>
                                            <span className="text-[11px] font-bold text-[#FFF1E6]/80">
                                              {metric.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      {!event.resolved && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-[1.02]"
                                            style={{
                                              background: "#E8524A",
                                              color: "#FFF1E6",
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Contact {event.memberName.split(" ")[0]}
                                          </button>
                                          <button
                                            className="text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-[#FFF1E6]/50 hover:text-[#FFF1E6]/80"
                                            style={{
                                              background: "rgba(255,241,230,0.04)",
                                              border: "1px solid rgba(255,241,230,0.06)",
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Mark Resolved
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </motion.div>
            </div>
          </div>
        </main>

        {/* ── Bottom bar ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="relative z-10 px-6 md:px-10 pb-6 pt-2 flex items-center justify-between"
        >
          <span
            className="text-[9px] tracking-[0.3em] uppercase text-[#FFF1E6]/15"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Pulsera &mdash; Est. 2026
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-[#FFF1E6]/15">
              All data is mocked for demonstration
            </span>
          </div>
        </motion.footer>
      </div>
    </>
  );
}
