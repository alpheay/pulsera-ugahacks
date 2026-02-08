// Simulated data for Life360-style tracking demo
// All locations are around UGA campus in Athens, GA

import { type Episode } from "./episodeSimulator";

export interface MemberLocation {
  id: string;
  name: string;
  avatar: string; // initials
  relation: string;
  latitude: number;
  longitude: number;
  locationName: string;
  lastUpdated: Date;
  batteryLevel: number;
  isWearingWatch: boolean;
  activeEpisode?: Episode;
  health: {
    heartRate: number;
    hrv: number;
    status: "safe" | "elevated" | "warning" | "critical";
    anomalyScore: number;
    skinTemp: number;
    steps: number;
  };
  history: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
    locationName: string;
  }>;
}

export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  icon: string;
}

// UGA campus center
export const MAP_CENTER = {
  latitude: 33.9480,
  longitude: -83.3773,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export const SAVED_PLACES: Place[] = [
  {
    id: "home",
    name: "Home",
    latitude: 33.9520,
    longitude: -83.3850,
    radius: 100,
    icon: "home",
  },
  {
    id: "uga-campus",
    name: "UGA Campus",
    latitude: 33.9480,
    longitude: -83.3773,
    radius: 500,
    icon: "school",
  },
  {
    id: "gym",
    name: "Ramsey Center",
    latitude: 33.9445,
    longitude: -83.3740,
    radius: 80,
    icon: "fitness-center",
  },
  {
    id: "library",
    name: "Main Library",
    latitude: 33.9490,
    longitude: -83.3760,
    radius: 60,
    icon: "local-library",
  },
];

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);

export const FAMILY_MEMBERS: MemberLocation[] = [
  {
    id: "me",
    name: "You",
    avatar: "ME",
    relation: "self",
    latitude: 33.9480,
    longitude: -83.3773,
    locationName: "UGA Campus",
    lastUpdated: minutesAgo(0),
    batteryLevel: 78,
    isWearingWatch: true,
    health: {
      heartRate: 72,
      hrv: 55,
      status: "safe",
      anomalyScore: 0.05,
      skinTemp: 36.5,
      steps: 4230,
    },
    history: [
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(180), locationName: "Home" },
      { latitude: 33.9490, longitude: -83.3810, timestamp: minutesAgo(120), locationName: "Five Points" },
      { latitude: 33.9480, longitude: -83.3773, timestamp: minutesAgo(30), locationName: "UGA Campus" },
    ],
  },
  {
    id: "maria",
    name: "Maria",
    avatar: "MS",
    relation: "Mom",
    latitude: 33.9520,
    longitude: -83.3850,
    locationName: "Home",
    lastUpdated: minutesAgo(2),
    batteryLevel: 92,
    isWearingWatch: true,
    health: {
      heartRate: 68,
      hrv: 48,
      status: "safe",
      anomalyScore: 0.03,
      skinTemp: 36.4,
      steps: 2100,
    },
    history: [
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(300), locationName: "Home" },
      { latitude: 33.9510, longitude: -83.3830, timestamp: minutesAgo(90), locationName: "Grocery Store" },
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(30), locationName: "Home" },
    ],
  },
  {
    id: "carlos",
    name: "Carlos",
    avatar: "CS",
    relation: "Dad",
    latitude: 33.9445,
    longitude: -83.3740,
    locationName: "Ramsey Center",
    lastUpdated: minutesAgo(5),
    batteryLevel: 45,
    isWearingWatch: true,
    health: {
      heartRate: 142,
      hrv: 28,
      status: "elevated",
      anomalyScore: 0.35,
      skinTemp: 37.2,
      steps: 8750,
    },
    history: [
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(240), locationName: "Home" },
      { latitude: 33.9500, longitude: -83.3800, timestamp: minutesAgo(60), locationName: "Downtown" },
      { latitude: 33.9445, longitude: -83.3740, timestamp: minutesAgo(30), locationName: "Ramsey Center" },
    ],
  },
  {
    id: "sofia",
    name: "Sofia",
    avatar: "SS",
    relation: "Sister",
    latitude: 33.9490,
    longitude: -83.3760,
    locationName: "Main Library",
    lastUpdated: minutesAgo(1),
    batteryLevel: 63,
    isWearingWatch: true,
    health: {
      heartRate: 76,
      hrv: 52,
      status: "safe",
      anomalyScore: 0.08,
      skinTemp: 36.6,
      steps: 3400,
    },
    history: [
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(360), locationName: "Home" },
      { latitude: 33.9480, longitude: -83.3773, timestamp: minutesAgo(180), locationName: "UGA Campus" },
      { latitude: 33.9490, longitude: -83.3760, timestamp: minutesAgo(45), locationName: "Main Library" },
    ],
  },
  {
    id: "diego",
    name: "Diego",
    avatar: "DS",
    relation: "Brother",
    latitude: 33.9460,
    longitude: -83.3800,
    locationName: "Sanford Stadium",
    lastUpdated: minutesAgo(8),
    batteryLevel: 31,
    isWearingWatch: false,
    health: {
      heartRate: 0,
      hrv: 0,
      status: "safe",
      anomalyScore: 0,
      skinTemp: 0,
      steps: 0,
    },
    history: [
      { latitude: 33.9520, longitude: -83.3850, timestamp: minutesAgo(300), locationName: "Home" },
      { latitude: 33.9460, longitude: -83.3800, timestamp: minutesAgo(60), locationName: "Sanford Stadium" },
    ],
  },
];

// Simulate location drift for realism
export function simulateLocationUpdate(member: MemberLocation): MemberLocation {
  const drift = 0.0001;
  const newLat = member.latitude + (Math.random() - 0.5) * drift;
  const newLng = member.longitude + (Math.random() - 0.5) * drift;

  const hrDrift = member.isWearingWatch ? (Math.random() - 0.5) * 4 : 0;
  const newHR = Math.max(50, Math.min(180, member.health.heartRate + hrDrift));

  return {
    ...member,
    latitude: newLat,
    longitude: newLng,
    lastUpdated: new Date(),
    health: member.isWearingWatch
      ? {
          ...member.health,
          heartRate: Math.round(newHR),
          hrv: Math.max(15, Math.min(80, member.health.hrv + (Math.random() - 0.5) * 3)),
          steps: member.health.steps + Math.floor(Math.random() * 5),
        }
      : member.health,
  };
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "safe": return "#00bc7d";
    case "elevated": return "#fe9a00";
    case "warning": return "#fe9a00";
    case "critical": return "#ff6467";
    default: return "#a1a1a1";
  }
}

export function getBatteryColor(level: number): string {
  if (level > 50) return "#00bc7d";
  if (level > 20) return "#fe9a00";
  return "#ff6467";
}

export function attachEpisodeToMember(member: MemberLocation, episode: Episode): MemberLocation {
  return { ...member, activeEpisode: episode };
}

export function clearEpisodeFromMember(member: MemberLocation): MemberLocation {
  const { activeEpisode: _, ...rest } = member;
  return rest as MemberLocation;
}
