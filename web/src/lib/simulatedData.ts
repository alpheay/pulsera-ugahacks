// Map constants for web — match apps/mobile/lib/simulatedData.ts
// All locations are around UGA campus in Athens, GA

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
