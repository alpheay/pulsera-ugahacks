// Map constants for web — match apps/mobile/lib/simulatedData.ts
// All locations are around UGA campus in Athens, GA

function minutesAgo(m: number): string {
  if (m === 0) return "Just now";
  if (m === 1) return "1 min ago";
  return `${m} min ago`;
}

/** Dashboard family member: mobile roster + web-only fields for map/sidebar/panel */
export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar: string;
  latitude: number;
  longitude: number;
  locationName: string;
  status: "safe" | "elevated" | "warning" | "critical";
  device: string;
  location: string;
  address: string;
  heartRate: number;
  bloodOxygen: number;
  temperature: number;
  steps: number;
  lastSync: string;
  avatarColor: string;
  moving: boolean;
  battery: number;
}

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "me",
    name: "You",
    relation: "self",
    avatar: "ME",
    latitude: 33.948,
    longitude: -83.3773,
    locationName: "UGA Campus",
    status: "safe",
    device: "Apple Watch",
    location: "UGA Campus",
    address: "230 S Jackson St, Athens, GA",
    heartRate: 72,
    bloodOxygen: 98,
    temperature: 97.7,
    steps: 4230,
    lastSync: minutesAgo(0),
    avatarColor: "#6366f1",
    moving: false,
    battery: 78,
  },
  {
    id: "maria",
    name: "Maria",
    relation: "Mom",
    avatar: "MG",
    latitude: 33.952,
    longitude: -83.385,
    locationName: "Home",
    status: "safe",
    device: "Apple Watch",
    location: "Home",
    address: "142 Oakwood Dr",
    heartRate: 68,
    bloodOxygen: 98,
    temperature: 97.5,
    steps: 2100,
    lastSync: minutesAgo(2),
    avatarColor: "#ec4899",
    moving: false,
    battery: 92,
  },
  {
    id: "carlos",
    name: "Carlos",
    relation: "Dad",
    avatar: "CG",
    latitude: 33.9445,
    longitude: -83.374,
    locationName: "Ramsey Center",
    status: "warning",
    device: "Apple Watch",
    location: "Ramsey Center",
    address: "330 River Rd, Athens, GA",
    heartRate: 142,
    bloodOxygen: 97,
    temperature: 99.0,
    steps: 8750,
    lastSync: minutesAgo(5),
    avatarColor: "#0ea5e9",
    moving: false,
    battery: 45,
  },
  {
    id: "sofia",
    name: "Sofia",
    relation: "Sister",
    avatar: "SG",
    latitude: 33.949,
    longitude: -83.376,
    locationName: "Main Library",
    status: "safe",
    device: "Apple Watch",
    location: "Main Library",
    address: "202 W Main St, Athens, GA",
    heartRate: 76,
    bloodOxygen: 98,
    temperature: 97.9,
    steps: 3400,
    lastSync: minutesAgo(1),
    avatarColor: "#22c55e",
    moving: false,
    battery: 63,
  },
  {
    id: "diego",
    name: "Diego",
    relation: "Brother",
    avatar: "DG",
    latitude: 33.946,
    longitude: -83.38,
    locationName: "Sanford Stadium",
    status: "safe",
    device: "—",
    location: "Sanford Stadium",
    address: "100 Sanford Dr, Athens, GA",
    heartRate: 0,
    bloodOxygen: 0,
    temperature: 0,
    steps: 0,
    lastSync: minutesAgo(8),
    avatarColor: "#f59e0b",
    moving: false,
    battery: 31,
  },
];

export const MAP_CENTER = {
  latitude: 33.948,
  longitude: -83.3773,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
} as const;

// For MapLibre: [lng, lat], zoom ~14 for same view as mobile
export const MAP_VIEW = {
  center: [MAP_CENTER.longitude, MAP_CENTER.latitude] as [number, number],
  zoom: 14,
} as const;

export interface SavedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export const SAVED_PLACES: SavedPlace[] = [
  { id: "home", name: "Home", latitude: 33.952, longitude: -83.385, radius: 100 },
  { id: "uga-campus", name: "UGA Campus", latitude: 33.948, longitude: -83.3773, radius: 500 },
  { id: "gym", name: "Ramsey Center", latitude: 33.9445, longitude: -83.374, radius: 80 },
  { id: "library", name: "Main Library", latitude: 33.949, longitude: -83.376, radius: 60 },
];
