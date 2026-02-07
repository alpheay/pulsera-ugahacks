"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import PulseraLogo from "@/components/PulseraLogo";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Shield,
  Watch,
  MapPin,
  Heart,
  Droplets,
  Thermometer,
  Footprints,
  Clock,
  ChevronRight,
  ChevronDown,
  Zap,
  AlertTriangle,
  Activity,
  Battery,
  RefreshCw,
  Wifi,
  Navigation,
  Phone,
  MessageCircle,
  Home,
  X,
  Signal,
  Eye,
} from "lucide-react";

/* ═══════════════════════════════════════════
   MOCK DATA & TYPES
   ═══════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  status: "normal" | "critical" | "warning";
  device: string;
  location: string;
  locationCoords: { x: number; y: number }; // % positions on the map
  heartRate: number;
  bloodOxygen: number;
  temperature: number;
  steps: number;
  lastSync: string;
  avatar: string;
  avatarColor: string;
  moving: boolean;
  battery: number;
  address: string;
}

const familyMembers: FamilyMember[] = [
  {
    id: "1",
    name: "Grandma Helen",
    relation: "Grandmother",
    status: "normal",
    device: "Pulsera Band",
    location: "Home",
    locationCoords: { x: 38, y: 42 },
    heartRate: 72,
    bloodOxygen: 98,
    temperature: 98.6,
    steps: 1240,
    lastSync: "2m ago",
    avatar: "GH",
    avatarColor: "#E8524A",
    moving: false,
    battery: 85,
    address: "142 Oakwood Dr",
  },
  {
    id: "2",
    name: "Dad (Robert)",
    relation: "Father",
    status: "normal",
    device: "Pulsera Pro",
    location: "Work",
    locationCoords: { x: 72, y: 28 },
    heartRate: 68,
    bloodOxygen: 99,
    temperature: 98.4,
    steps: 4500,
    lastSync: "5m ago",
    avatar: "RD",
    avatarColor: "#7B8F4E",
    moving: false,
    battery: 62,
    address: "800 Commerce Blvd",
  },
  {
    id: "3",
    name: "Mom (Sarah)",
    relation: "Mother",
    status: "critical",
    device: "Pulsera Band",
    location: "Garden",
    locationCoords: { x: 42, y: 58 },
    heartRate: 115,
    bloodOxygen: 95,
    temperature: 99.1,
    steps: 3200,
    lastSync: "Just now",
    avatar: "SD",
    avatarColor: "#D4873E",
    moving: true,
    battery: 15,
    address: "142 Oakwood Dr",
  },
  {
    id: "4",
    name: "Lily",
    relation: "Daughter",
    status: "normal",
    device: "Pulsera Mini",
    location: "School",
    locationCoords: { x: 60, y: 65 },
    heartRate: 82,
    bloodOxygen: 99,
    temperature: 98.2,
    steps: 6800,
    lastSync: "8m ago",
    avatar: "LM",
    avatarColor: "#8B6CC1",
    moving: false,
    battery: 91,
    address: "Athens Academy",
  },
];

const deviceEvents = [
  {
    id: "e1",
    icon: "battery" as const,
    priority: "high" as const,
    title: "Low Battery",
    memberName: "Mom (Sarah)",
    memberAvatar: "SD",
    memberColor: "#D4873E",
    detail: "Battery at 15% -- charge soon",
    timestamp: "2m ago",
  },
  {
    id: "e2",
    icon: "sync" as const,
    priority: "low" as const,
    title: "Sync Complete",
    memberName: "Dad (Robert)",
    memberAvatar: "RD",
    memberColor: "#7B8F4E",
    detail: "Health report uploaded",
    timestamp: "25m ago",
  },
  {
    id: "e3",
    icon: "wifi" as const,
    priority: "medium" as const,
    title: "Weak Signal",
    memberName: "Lily",
    memberAvatar: "LM",
    memberColor: "#8B6CC1",
    detail: "Connection intermittent",
    timestamp: "40m ago",
  },
  {
    id: "e4",
    icon: "sync" as const,
    priority: "low" as const,
    title: "Sync Complete",
    memberName: "Grandma Helen",
    memberAvatar: "GH",
    memberColor: "#E8524A",
    detail: "Vitals updated",
    timestamp: "1h ago",
  },
];

const panicEvents = [
  {
    id: "p1",
    severity: "critical" as const,
    type: "fall" as const,
    title: "Hard Fall Detected",
    resolved: false,
    avatar: "SD",
    avatarColor: "#D4873E",
    memberName: "Mom (Sarah)",
    location: "Garden",
    timestamp: "2m ago",
    detail: "Accelerometer detected sudden impact followed by lack of movement for 30 seconds.",
    metrics: [
      { label: "Impact Force", value: "4.2g" },
      { label: "Heart Rate", value: "115 bpm" },
      { label: "Immobile", value: "30s" },
    ],
  },
  {
    id: "p2",
    severity: "medium" as const,
    type: "hr" as const,
    title: "High Heart Rate",
    resolved: true,
    avatar: "GH",
    avatarColor: "#E8524A",
    memberName: "Grandma Helen",
    location: "Kitchen",
    timestamp: "Yesterday",
    detail: "Heart rate exceeded threshold (120bpm) while stationary for over 5 minutes.",
    metrics: [
      { label: "Peak HR", value: "124 bpm" },
      { label: "Duration", value: "5m 12s" },
    ],
  },
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

const statusColor = (status: string) => {
  switch (status) {
    case "critical":
      return { bg: "rgba(232,82,74,0.2)", text: "#E8524A", dot: "#E8524A", glow: "rgba(232,82,74,0.4)" };
    case "warning":
      return { bg: "rgba(212,135,62,0.2)", text: "#D4873E", dot: "#D4873E", glow: "rgba(212,135,62,0.4)" };
    default:
      return { bg: "rgba(123,143,78,0.2)", text: "#7B8F4E", dot: "#7B8F4E", glow: "rgba(123,143,78,0.4)" };
  }
};

const eventPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "#E8524A";
    case "medium": return "#D4873E";
    default: return "#7B8F4E";
  }
};

const eventIconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  battery: Battery,
  sync: RefreshCw,
  wifi: Wifi,
  default: Zap,
};

const panicSeverityStyle = (severity: string) => {
  switch (severity) {
    case "critical":
      return { bg: "rgba(232,82,74,0.06)", border: "rgba(232,82,74,0.2)", badge: "#E8524A", badgeBg: "rgba(232,82,74,0.15)", pulse: true };
    case "medium":
      return { bg: "rgba(212,135,62,0.04)", border: "rgba(212,135,62,0.12)", badge: "#D4873E", badgeBg: "rgba(212,135,62,0.12)", pulse: false };
    default:
      return { bg: "rgba(255,241,230,0.02)", border: "rgba(255,241,230,0.05)", badge: "#FFF1E6", badgeBg: "rgba(255,241,230,0.05)", pulse: false };
  }
};

const panicTypeIcon = (type: string) => {
  switch (type) {
    case "fall": return Activity;
    case "hr": return Heart;
    case "sos": return AlertTriangle;
    default: return AlertTriangle;
  }
};

/* ═══════════════════════════════════════════
   MAP COMPONENT
   ═══════════════════════════════════════════ */

function FamilyMap({
  members,
  selectedMember,
  onSelectMember,
}: {
  members: FamilyMember[];
  selectedMember: string | null;
  onSelectMember: (id: string | null) => void;
}) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Draw connection lines between family members at home
  const homeMembers = members.filter((m) => m.address === "142 Oakwood Dr");

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl" style={{ background: "#0f0505" }}>
      {/* Topographic grid background - Red Stylized */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topo-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E8524A" strokeWidth="0.5" />
          </pattern>
          <pattern id="topo-grid-lg" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#E8524A" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-grid)" className="animate-grid-fade" />
        <rect width="100%" height="100%" fill="url(#topo-grid-lg)" />
      </svg>

      {/* Topographic contour rings - Red Stylized */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="contour-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8524A" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#E8524A" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Organic contour lines */}
        {[180, 250, 340, 420].map((r, i) => (
          <ellipse
            key={i}
            cx="45%"
            cy="48%"
            rx={r}
            ry={r * 0.7}
            fill="none"
            stroke="#E8524A"
            strokeWidth="0.5"
            strokeDasharray="6 8"
            opacity={0.06 - i * 0.012}
            className="animate-contour-drift"
            style={{ animationDelay: `${i * 3}s`, animationDuration: `${25 + i * 5}s` }}
          />
        ))}
        {/* Second cluster of contours */}
        {[120, 200].map((r, i) => (
          <ellipse
            key={`b-${i}`}
            cx="72%"
            cy="30%"
            rx={r}
            ry={r * 0.65}
            fill="none"
            stroke="#E8524A"
            strokeWidth="0.4"
            strokeDasharray="4 10"
            opacity={0.04}
            className="animate-contour-drift"
            style={{ animationDelay: `${i * 4 + 2}s`, animationDuration: `${30 + i * 8}s` }}
          />
        ))}
      </svg>

      {/* Ambient glow spots for key locations */}
      <div
        className="absolute rounded-full animate-glow-pulse"
        style={{
          left: "36%", top: "40%",
          width: "180px", height: "180px",
          background: "radial-gradient(circle, rgba(232,82,74,0.15) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute rounded-full animate-glow-pulse"
        style={{
          left: "72%", top: "28%",
          width: "120px", height: "120px",
          background: "radial-gradient(circle, rgba(232,82,74,0.1) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          animationDelay: "2s",
        }}
      />

      {/* Connection lines between family members at same address */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {homeMembers.length >= 2 &&
          homeMembers.slice(0, -1).map((m, i) => {
            const next = homeMembers[i + 1];
            return (
              <line
                key={`conn-${m.id}-${next.id}`}
                x1={`${m.locationCoords.x}%`}
                y1={`${m.locationCoords.y}%`}
                x2={`${next.locationCoords.x}%`}
                y2={`${next.locationCoords.y}%`}
                stroke="rgba(232,82,74,0.2)"
                strokeWidth="1"
                strokeDasharray="4 6"
                style={{
                  animation: "connection-line-draw 2s ease-out forwards",
                  strokeDashoffset: 200,
                  strokeDasharray: "200",
                }}
              />
            );
          })}
      </svg>

      {/* Location labels - Red Stylized */}
      <div
        className="absolute text-[9px] tracking-[0.2em] uppercase text-[#E8524A]/40 pointer-events-none"
        style={{ left: "28%", top: "33%", fontFamily: "'DM Sans', sans-serif" }}
      >
        <Home size={8} className="inline mr-1 mb-0.5 text-[#E8524A]/60" />
        Oakwood Dr
      </div>
      <div
        className="absolute text-[9px] tracking-[0.2em] uppercase text-[#E8524A]/40 pointer-events-none"
        style={{ left: "66%", top: "20%", fontFamily: "'DM Sans', sans-serif" }}
      >
        Commerce District
      </div>
      <div
        className="absolute text-[9px] tracking-[0.2em] uppercase text-[#E8524A]/40 pointer-events-none"
        style={{ left: "54%", top: "58%", fontFamily: "'DM Sans', sans-serif" }}
      >
        Athens Academy
      </div>

      {/* Simulated roads / paths - Enhanced & Red */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0% 45% L 100% 45%" fill="none" stroke="#E8524A" strokeWidth="1" />
        <path d="M 45% 0% L 45% 100%" fill="none" stroke="#E8524A" strokeWidth="1" />
        <path d="M 10% 45% Q 30% 44% 50% 42% T 85% 35%" fill="none" stroke="#E8524A" strokeWidth="1.5" />
        <path d="M 35% 15% Q 38% 35% 42% 55% T 48% 85%" fill="none" stroke="#E8524A" strokeWidth="1" />
        <path d="M 50% 42% Q 58% 48% 62% 60%" fill="none" stroke="#E8524A" strokeWidth="0.8" />
        <path d="M 65% 20% Q 68% 35% 75% 50%" fill="none" stroke="#E8524A" strokeWidth="0.8" />
        <path d="M 20% 0% L 25% 100%" fill="none" stroke="#E8524A" strokeWidth="0.5" strokeDasharray="4 4" />
        <path d="M 0% 80% L 100% 75%" fill="none" stroke="#E8524A" strokeWidth="0.5" strokeDasharray="4 4" />
        <circle cx="45%" cy="48%" r="100" fill="none" stroke="#E8524A" strokeWidth="0.5" opacity="0.5" />
      </svg>

      {/* Radar sweep from center */}
      <div
        className="absolute animate-subtle-rotate pointer-events-none"
        style={{
          left: "45%", top: "48%",
          width: "500px", height: "500px",
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg viewBox="0 0 500 500" className="w-full h-full opacity-[0.05]">
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8524A" stopOpacity="0" />
              <stop offset="100%" stopColor="#E8524A" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M 250 250 L 250 0 A 250 250 0 0 1 500 250 Z" fill="url(#sweep-grad)" />
        </svg>
      </div>

      {/* Family member pins */}
      {members.map((member, i) => {
        const sc = statusColor(member.status);
        const isSelected = selectedMember === member.id;
        const isHovered = hoveredMember === member.id;

        return (
          <div
            key={member.id}
            className="absolute cursor-pointer"
            style={{
              left: `${member.locationCoords.x}%`,
              top: `${member.locationCoords.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isSelected ? 30 : isHovered ? 20 : 10,
              animation: `map-pin-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.15}s both`,
            }}
            onClick={() => onSelectMember(isSelected ? null : member.id)}
            onMouseEnter={() => setHoveredMember(member.id)}
            onMouseLeave={() => setHoveredMember(null)}
          >
            {/* Pin body */}
            <div
              className="relative flex items-center justify-center transition-transform duration-300"
              style={{
                width: "40px", height: "40px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${member.avatarColor}30, ${member.avatarColor}60)`,
                border: `2px solid ${member.avatarColor}90`,
                boxShadow: `0 4px 16px ${member.avatarColor}30, inset 0 1px 0 ${member.avatarColor}40`,
                transform: isHovered ? "scale(1.15)" : "scale(1)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-[11px] font-bold tracking-wide" style={{ color: "#FFF1E6" }}>
                {member.avatar}
              </span>

              {/* Moving indicator */}
              {member.moving && (
                <div className="absolute -top-1 -right-1">
                  <Navigation size={10} className="text-[#FFF1E6]" style={{ filter: `drop-shadow(0 0 4px ${member.avatarColor})` }} />
                </div>
              )}
            </div>

            {/* Name label below pin */}
            <div
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none transition-opacity duration-300"
              style={{
                top: "calc(100% + 6px)",
                opacity: isSelected || isHovered ? 1 : 0.7,
              }}
            >
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wide"
                style={{
                  background: "rgba(12,6,4,0.85)",
                  border: `1px solid ${member.avatarColor}40`,
                  color: "#FFF1E6",
                  backdropFilter: "blur(8px)",
                }}
              >
                {member.name.split(" ")[0]}
                <span className="ml-1 opacity-50">{member.location}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Map overlay - top bar with zoom controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div
          className="px-3 py-1.5 rounded-full text-[9px] font-medium tracking-[0.15em] uppercase flex items-center gap-1.5"
          style={{
            background: "rgba(12,6,4,0.8)",
            border: "1px solid rgba(232,82,74,0.15)",
            color: "#E8524A",
            backdropFilter: "blur(12px)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Eye size={10} className="opacity-50" />
          Live View
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8524A] ml-1 animate-pulse" />
        </div>
      </div>

      {/* Map overlay - scale bar */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex items-center gap-1 text-[8px] text-[#E8524A]/40 tracking-wider uppercase">
          <div className="w-12 h-px bg-[#E8524A]/30" />
          <span>0.5 mi</span>
        </div>
      </div>

      {/* Map overlay - coordinates */}
      <div
        className="absolute bottom-4 right-4 text-[8px] text-[#E8524A]/30 tracking-wider"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        33.9519&deg; N, 83.3576&deg; W
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MEMBER DETAIL PANEL
   ═══════════════════════════════════════════ */

function MemberDetailPanel({
  member,
  onClose,
}: {
  member: FamilyMember;
  onClose: () => void;
}) {
  const sc = statusColor(member.status);

  const vitals = [
    { icon: Heart, label: "Heart Rate", value: `${member.heartRate}`, unit: "bpm", alert: member.heartRate > 100, color: "#E8524A" },
    { icon: Droplets, label: "Blood Oxygen", value: `${member.bloodOxygen}`, unit: "%", alert: member.bloodOxygen < 94, color: "#5B9BD5" },
    { icon: Thermometer, label: "Temperature", value: `${member.temperature}`, unit: "\u00B0F", alert: member.temperature > 99.5, color: "#D4873E" },
    { icon: Footprints, label: "Steps", value: member.steps >= 1000 ? `${(member.steps / 1000).toFixed(1)}k` : `${member.steps}`, unit: "today", alert: false, color: "#7B8F4E" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.97 }}
      transition={{ duration: 0.4, ease }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold tracking-wide"
                style={{
                  background: `linear-gradient(135deg, ${member.avatarColor}25, ${member.avatarColor}45)`,
                  color: member.avatarColor,
                  border: `2px solid ${member.avatarColor}50`,
                  boxShadow: `0 0 24px ${member.avatarColor}15`,
                }}
              >
                {member.avatar}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "rgba(12,6,4,0.9)", border: `2px solid ${sc.dot}` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#FFF1E6]/95" style={{ fontFamily: "var(--font-garet), 'Playfair Display', serif" }}>
                {member.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#FFF1E6]/40">{member.relation}</span>
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{ background: sc.bg, color: sc.text }}
                >
                  {member.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-[#FFF1E6]/10"
            style={{ background: "rgba(255,241,230,0.05)" }}
          >
            <X size={12} className="text-[#FFF1E6]/50" />
          </button>
        </div>

        {/* Location + Device row */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{ background: "rgba(255,241,230,0.04)", border: "1px solid rgba(255,241,230,0.06)" }}
          >
            <MapPin size={10} className="text-[#FFF1E6]/40" />
            <span className="text-[#FFF1E6]/70">{member.location}</span>
            <span className="text-[#FFF1E6]/25">&middot;</span>
            <span className="text-[#FFF1E6]/40">{member.address}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{ background: "rgba(255,241,230,0.04)", border: "1px solid rgba(255,241,230,0.06)" }}
          >
            <Watch size={10} className="text-[#FFF1E6]/40" />
            <span className="text-[#FFF1E6]/70">{member.device}</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{
              background: member.battery < 20 ? "rgba(232,82,74,0.08)" : "rgba(255,241,230,0.04)",
              border: `1px solid ${member.battery < 20 ? "rgba(232,82,74,0.15)" : "rgba(255,241,230,0.06)"}`,
            }}
          >
            <Battery size={10} style={{ color: member.battery < 20 ? "#E8524A" : "rgba(255,241,230,0.4)" }} />
            <span style={{ color: member.battery < 20 ? "#E8524A" : "rgba(255,241,230,0.7)" }}>{member.battery}%</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{ background: "rgba(255,241,230,0.04)", border: "1px solid rgba(255,241,230,0.06)" }}
          >
            <Clock size={10} className="text-[#FFF1E6]/40" />
            <span className="text-[#FFF1E6]/50">{member.lastSync}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,241,230,0.08), transparent)" }} />

      {/* Vitals Grid */}
      <div className="p-5 flex-1">
        <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-[#FFF1E6]/30 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Live Vitals
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {vitals.map((vital) => {
            const Icon = vital.icon;
            return (
              <div
                key={vital.label}
                className="rounded-xl p-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: vital.alert ? `linear-gradient(135deg, ${vital.color}08, ${vital.color}04)` : "rgba(255,241,230,0.03)",
                  border: `1px solid ${vital.alert ? `${vital.color}25` : "rgba(255,241,230,0.05)"}`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon
                    size={12}
                    style={{
                      color: vital.alert ? vital.color : "rgba(255,241,230,0.3)",
                      animation: vital.label === "Heart Rate" && vital.alert ? "heartbeat 1.5s infinite" : "none",
                    }}
                  />
                  <span className="text-[9px] text-[#FFF1E6]/40 uppercase tracking-wider">{vital.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-xl font-bold"
                    style={{
                      color: vital.alert ? vital.color : "#FFF1E6",
                      opacity: vital.alert ? 1 : 0.85,
                      fontFamily: "var(--font-garet), sans-serif",
                    }}
                  >
                    {vital.value}
                  </span>
                  <span className="text-[9px] text-[#FFF1E6]/35">{vital.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${member.avatarColor}30, ${member.avatarColor}15)`,
              border: `1px solid ${member.avatarColor}35`,
              color: "#FFF1E6",
            }}
          >
            <Phone size={12} />
            Call
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: "rgba(255,241,230,0.05)",
              border: "1px solid rgba(255,241,230,0.08)",
              color: "#FFF1E6",
            }}
          >
            <MessageCircle size={12} />
            Message
          </button>
          <button
            className="flex items-center justify-center w-10 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: "rgba(255,241,230,0.05)",
              border: "1px solid rgba(255,241,230,0.08)",
              color: "#FFF1E6",
            }}
          >
            <Navigation size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */

export default function Dashboard() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [expandedPanic, setExpandedPanic] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [activeTab, setActiveTab] = useState<"map" | "alerts">("map");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedMemberData = familyMembers.find((m) => m.id === selectedMember);
  const activeAlerts = panicEvents.filter((e) => !e.resolved);

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #0F0705 0%, #1A0B08 40%, #140806 100%)",
      }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient background blurs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full animate-glow-pulse pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(232,82,74,0.04) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full animate-glow-pulse pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(123,143,78,0.03) 0%, transparent 70%)", animationDelay: "3s" }}
      />

      {/* ── TOP HEADER BAR ── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-20 flex items-center justify-between px-5 md:px-7 py-4 flex-shrink-0"
      >
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 transition-all duration-300 hover:opacity-80"
          >
            <PulseraLogo size={20} color="#FFF1E6" />
          </Link>
          <div className="h-5 w-px bg-[#FFF1E6]/10" />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-sm font-bold text-[#FFF1E6]/90 tracking-tight"
                style={{ fontFamily: "var(--font-garet), sans-serif" }}
              >
                Family Dashboard
              </h1>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(123,143,78,0.15)", color: "#7B8F4E" }}
              >
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Right: Time + Status */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            {familyMembers.map((m) => {
              const sc = statusColor(m.status);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
                  className="relative group transition-transform duration-200 hover:scale-110"
                  title={m.name}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold tracking-wide"
                    style={{
                      background: `linear-gradient(135deg, ${m.avatarColor}20, ${m.avatarColor}40)`,
                      color: m.avatarColor,
                      border: selectedMember === m.id ? `2px solid ${m.avatarColor}` : `1px solid ${m.avatarColor}30`,
                      boxShadow: selectedMember === m.id ? `0 0 12px ${m.avatarColor}30` : "none",
                    }}
                  >
                    {m.avatar}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: sc.dot,
                      border: "1.5px solid #0F0705",
                      boxShadow: m.status === "critical" ? `0 0 6px ${sc.dot}` : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div className="h-5 w-px bg-[#FFF1E6]/08 hidden md:block" />
          <div className="flex items-center gap-2">
            <Signal size={12} className="text-[#7B8F4E]/60" />
            <span className="text-[10px] text-[#FFF1E6]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {currentTime}
            </span>
          </div>

          {/* Alert badge */}
          {activeAlerts.length > 0 && (
            <button
              onClick={() => setActiveTab("alerts")}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 hover:scale-105"
              style={{
                background: "rgba(232,82,74,0.15)",
                border: "1px solid rgba(232,82,74,0.25)",
              }}
            >
              <AlertTriangle size={11} className="text-[#E8524A]" />
              <span className="text-[10px] font-bold text-[#E8524A]">{activeAlerts.length}</span>
              <div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E8524A] animate-ping-slow"
              />
            </button>
          )}
        </div>
      </motion.header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="relative z-10 flex-1 flex gap-0 px-4 md:px-6 pb-4 min-h-0">
        {/* ══════════════════════════════════
            LEFT SIDEBAR - Family + Events
            ══════════════════════════════════ */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="hidden lg:flex flex-col w-[320px] flex-shrink-0 mr-4 gap-3"
        >
          {/* Family Circle Panel */}
          <div
            className="rounded-2xl overflow-hidden flex-1 flex flex-col"
            style={{
              background: "linear-gradient(180deg, rgba(255,241,230,0.05) 0%, rgba(255,241,230,0.02) 100%)",
              border: "1px solid rgba(255,241,230,0.06)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div className="p-4 pb-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={13} className="text-[#E8524A]/60" />
                <h2
                  className="text-[11px] font-bold text-[#FFF1E6]/80 uppercase tracking-[0.12em]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Family Circle
                </h2>
              </div>
              <span className="text-[9px] text-[#FFF1E6]/30">
                {familyMembers.filter((m) => m.status === "normal").length}/{familyMembers.length} ok
              </span>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-3 pb-3 space-y-1.5">
                {familyMembers.map((member, i) => {
                  const sc = statusColor(member.status);
                  const isSelected = selectedMember === member.id;
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease }}
                      onClick={() => setSelectedMember(isSelected ? null : member.id)}
                      className="group cursor-pointer"
                    >
                      <div
                        className="rounded-xl p-3 transition-all duration-300"
                        style={{
                          background: isSelected ? "rgba(255,241,230,0.08)" : "rgba(255,241,230,0.02)",
                          border: `1px solid ${isSelected ? "rgba(255,241,230,0.1)" : "transparent"}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide"
                              style={{
                                background: `linear-gradient(135deg, ${member.avatarColor}20, ${member.avatarColor}40)`,
                                color: member.avatarColor,
                                border: `1.5px solid ${member.avatarColor}40`,
                              }}
                            >
                              {member.avatar}
                            </div>
                            <div
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                              style={{ background: "#0F0705", border: `1.5px solid ${sc.dot}` }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[12px] font-semibold text-[#FFF1E6]/85 truncate">
                                {member.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin size={8} className="text-[#FFF1E6]/30" />
                              <span className="text-[9px] text-[#FFF1E6]/40 truncate">{member.location}</span>
                              <span className="text-[#FFF1E6]/15">&middot;</span>
                              <span className="text-[9px] text-[#FFF1E6]/30">{member.lastSync}</span>
                            </div>
                          </div>

                          {/* Quick vitals */}
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <Heart
                                size={9}
                                style={{
                                  color: member.heartRate > 100 ? "#E8524A" : "rgba(255,241,230,0.3)",
                                  animation: member.heartRate > 100 ? "heartbeat 1.5s infinite" : "none",
                                }}
                              />
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: member.heartRate > 100 ? "#E8524A" : "rgba(255,241,230,0.6)" }}
                              >
                                {member.heartRate}
                              </span>
                            </div>
                            <span
                              className="text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                              style={{ background: sc.bg, color: sc.text }}
                            >
                              {member.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Device Events - Compact */}
          <div
            className="rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background: "linear-gradient(180deg, rgba(255,241,230,0.04) 0%, rgba(255,241,230,0.015) 100%)",
              border: "1px solid rgba(255,241,230,0.05)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <div className="p-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-[#D4873E]/60" />
                <h2
                  className="text-[11px] font-bold text-[#FFF1E6]/70 uppercase tracking-[0.12em]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Events
                </h2>
              </div>
              <span className="text-[9px] text-[#FFF1E6]/25">{deviceEvents.length} recent</span>
            </div>

            <ScrollArea className="h-[180px]">
              <div className="px-3 pb-3">
                {deviceEvents.map((event, i) => {
                  const IconComp = eventIconMap[event.icon] || eventIconMap.default;
                  const priorityColor = eventPriorityColor(event.priority);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + i * 0.04, ease }}
                      className="flex items-center gap-2.5 py-2 border-b border-[#FFF1E6]/[0.03] last:border-0"
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${priorityColor}15`, border: `1px solid ${priorityColor}20` }}
                      >
                        <IconComp size={11} style={{ color: priorityColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium text-[#FFF1E6]/70 block truncate">
                          {event.title}
                        </span>
                        <span className="text-[9px] text-[#FFF1E6]/30 truncate block">
                          {event.memberName}
                        </span>
                      </div>
                      <span className="text-[8px] text-[#FFF1E6]/20 flex-shrink-0">{event.timestamp}</span>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </motion.aside>

        {/* ══════════════════════════════════
            CENTER - MAP (Hero)
            ══════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="flex-1 min-w-0 relative"
        >
          <div
            className="h-full rounded-2xl overflow-hidden relative"
            style={{
              border: "1px solid rgba(255,241,230,0.06)",
              boxShadow: "0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,241,230,0.05)",
            }}
          >
            <FamilyMap
              members={familyMembers}
              selectedMember={selectedMember}
              onSelectMember={setSelectedMember}
            />

            {/* Mobile tab switcher overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:hidden flex items-center gap-1 p-1 rounded-full" style={{ background: "rgba(12,6,4,0.85)", border: "1px solid rgba(255,241,230,0.08)", backdropFilter: "blur(12px)" }}>
              <button
                onClick={() => setActiveTab("map")}
                className="px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
                style={{
                  background: activeTab === "map" ? "rgba(255,241,230,0.1)" : "transparent",
                  color: activeTab === "map" ? "#FFF1E6" : "rgba(255,241,230,0.4)",
                }}
              >
                Map
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                className="px-3 py-1.5 rounded-full text-[10px] font-medium transition-all flex items-center gap-1"
                style={{
                  background: activeTab === "alerts" ? "rgba(232,82,74,0.15)" : "transparent",
                  color: activeTab === "alerts" ? "#E8524A" : "rgba(255,241,230,0.4)",
                }}
              >
                Alerts
                {activeAlerts.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8524A]" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════
            RIGHT PANEL - Detail / Alerts
            ══════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {(selectedMember || activeTab === "alerts") && (
            <motion.aside
              key={selectedMember ? `member-${selectedMember}` : "alerts"}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 340 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.4, ease }}
              className="hidden lg:flex flex-col flex-shrink-0 ml-4 overflow-hidden"
            >
              <div
                className="h-full rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: "linear-gradient(180deg, rgba(255,241,230,0.05) 0%, rgba(255,241,230,0.02) 100%)",
                  border: "1px solid rgba(255,241,230,0.06)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                }}
              >
                {selectedMemberData ? (
                  <MemberDetailPanel
                    member={selectedMemberData}
                    onClose={() => setSelectedMember(null)}
                  />
                ) : (
                  /* Alerts Panel */
                  <div className="flex flex-col h-full">
                    <div className="p-4 pb-3 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <AlertTriangle size={13} className="text-[#E8524A]" />
                          {activeAlerts.length > 0 && (
                            <div className="absolute -inset-1 rounded-full animate-pulse-ring" style={{ background: "rgba(232,82,74,0.3)" }} />
                          )}
                        </div>
                        <h2
                          className="text-[11px] font-bold text-[#FFF1E6]/80 uppercase tracking-[0.12em]"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          Alerts
                        </h2>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(232,82,74,0.2)", color: "#E8524A" }}
                        >
                          {activeAlerts.length} active
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab("map")}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#FFF1E6]/10"
                        style={{ background: "rgba(255,241,230,0.05)" }}
                      >
                        <X size={10} className="text-[#FFF1E6]/40" />
                      </button>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="px-3 pb-3 space-y-2.5">
                        {panicEvents.map((event, i) => {
                          const style = panicSeverityStyle(event.severity);
                          const IconComp = panicTypeIcon(event.type);
                          const isExpanded = expandedPanic === event.id;

                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease }}
                              onClick={() => setExpandedPanic(isExpanded ? null : event.id)}
                              className="cursor-pointer"
                            >
                              <div
                                className="rounded-xl p-3.5 transition-all duration-300 relative overflow-hidden"
                                style={{ background: style.bg, border: `1px solid ${style.border}` }}
                              >
                                {style.pulse && (
                                  <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                      background: "linear-gradient(90deg, transparent 0%, rgba(232,82,74,0.04) 50%, transparent 100%)",
                                      backgroundSize: "200% 100%",
                                      animation: "shimmer 3s ease-in-out infinite",
                                    }}
                                  />
                                )}
                                <div className="relative z-10">
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ background: style.badgeBg, border: `1px solid ${style.badge}25` }}
                                    >
                                      <IconComp size={14} style={{ color: style.badge }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-semibold text-[#FFF1E6]/90">{event.title}</span>
                                        {event.resolved && (
                                          <span className="text-[8px] text-[#7B8F4E]/70 font-medium bg-[#7B8F4E]/10 px-1.5 py-0.5 rounded-full">Resolved</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[9px] text-[#FFF1E6]/35">
                                        <span
                                          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                                          style={{ background: `${event.avatarColor}30`, color: event.avatarColor }}
                                        >
                                          {event.avatar}
                                        </span>
                                        <span>{event.memberName}</span>
                                        <span className="text-[#FFF1E6]/15">&middot;</span>
                                        <span>{event.timestamp}</span>
                                      </div>
                                    </div>
                                    <ChevronDown
                                      size={12}
                                      className="text-[#FFF1E6]/25 flex-shrink-0 mt-1 transition-transform duration-300"
                                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                                    />
                                  </div>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease }}
                                        className="overflow-hidden"
                                      >
                                        <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${style.border}` }}>
                                          <p className="text-[10px] text-[#FFF1E6]/50 leading-relaxed mb-3">{event.detail}</p>
                                          <div className="flex flex-wrap gap-1.5 mb-3">
                                            {event.metrics.map((metric) => (
                                              <div
                                                key={metric.label}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                                style={{ background: "rgba(255,241,230,0.04)", border: "1px solid rgba(255,241,230,0.06)" }}
                                              >
                                                <span className="text-[8px] text-[#FFF1E6]/35 uppercase tracking-wide">{metric.label}</span>
                                                <span className="text-[10px] font-bold text-[#FFF1E6]/75">{metric.value}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex items-center gap-1 text-[9px] text-[#FFF1E6]/30">
                                            <MapPin size={8} />
                                            <span>{event.location}</span>
                                          </div>
                                          {!event.resolved && (
                                            <div className="flex items-center gap-2 mt-3">
                                              <button
                                                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
                                                style={{ background: "#E8524A", color: "#FFF1E6" }}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Contact {event.memberName.split(" ")[0]}
                                              </button>
                                              <button
                                                className="text-[10px] font-medium px-3 py-1.5 rounded-lg text-[#FFF1E6]/50 hover:text-[#FFF1E6]/80"
                                                style={{ background: "rgba(255,241,230,0.05)", border: "1px solid rgba(255,241,230,0.08)" }}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Resolve
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
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* ── BOTTOM TICKER BAR ── */}
      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease }}
        className="relative z-10 flex-shrink-0 px-5 md:px-7 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,241,230,0.04)" }}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <span
            className="text-[8px] tracking-[0.2em] uppercase text-[#E8524A]/40 flex-shrink-0"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Feed
          </span>
          <div className="overflow-hidden flex-1">
            <div
              className="flex items-center gap-6 whitespace-nowrap"
              style={{ animation: "ticker-scroll 40s linear infinite" }}
            >
              {[...deviceEvents, ...deviceEvents].map((event, i) => {
                const color = eventPriorityColor(event.priority);
                return (
                  <span key={`${event.id}-${i}`} className="flex items-center gap-1.5 text-[9px] text-[#FFF1E6]/25" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                    <span className="text-[#FFF1E6]/40 font-medium">{event.memberName}</span>
                    {event.title}
                    <span className="text-[#FFF1E6]/15">{event.timestamp}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[8px] text-[#FFF1E6]/15" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Demo Mode
          </span>
          <span
            className="text-[8px] tracking-[0.2em] uppercase text-[#FFF1E6]/15"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Pulsera &mdash; 2026
          </span>
        </div>
      </motion.footer>
    </div>
  );
}
