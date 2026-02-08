"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import circle from "@turf/circle";
import { MAP_VIEW, SAVED_PLACES } from "@/lib/simulatedData";
import MapMarker from "./MapMarker";

const FOCUS_ZOOM = 16;

function savedPlacesToGeoJSON(): GeoJSON.FeatureCollection {
  const features = SAVED_PLACES.map((place) =>
    circle([place.longitude, place.latitude], place.radius, { steps: 64, units: "meters" })
  );
  return { type: "FeatureCollection", features };
}

export interface MapScreenMember {
  id: string;
  name: string;
  location: string;
  avatar: string;
  avatarColor: string;
  moving: boolean;
  status: string;
  latitude: number;
  longitude: number;
}

interface MapScreenProps {
  members: MapScreenMember[];
  selectedMember: string | null;
  onSelectMember: (id: string | null) => void;
}

export default function MapScreen({ members, selectedMember, onSelectMember }: MapScreenProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({ center: MAP_VIEW.center, zoom: MAP_VIEW.zoom, duration: 500 });
  }, []);

  useEffect(() => {
    if (!selectedMember) return;
    const member = members.find((m) => m.id === selectedMember);
    if (member) {
      mapRef.current?.flyTo({
        center: [member.longitude, member.latitude],
        zoom: FOCUS_ZOOM,
        duration: 500,
      });
    }
  }, [selectedMember, members]);

  const onMapLoad = useCallback(
    (e: { target: import("maplibre-gl").Map } | import("maplibre-gl").Map) => {
      const map = "target" in e ? e.target : e;
      map.getCanvas().setAttribute("aria-label", "Family map");
      const sourceId = "saved-places";
      if (map.getSource(sourceId)) return;
      map.addSource(sourceId, {
        type: "geojson",
        data: savedPlacesToGeoJSON(),
      });
      map.addLayer({
        id: "saved-places-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#E8524A",
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "saved-places-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "rgba(232, 82, 74, 0.4)",
          "line-width": 1.5,
        },
      });
    },
    []
  );

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_VIEW.center[0],
          latitude: MAP_VIEW.center[1],
          zoom: MAP_VIEW.zoom,
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: "100%", height: "100%" }}
        onLoad={onMapLoad}
      >
        {members.map((member) => (
          <Marker
            key={member.id}
            longitude={member.longitude}
            latitude={member.latitude}
            anchor="bottom"
            onClick={(evt) => {
              evt.originalEvent.stopPropagation();
              onSelectMember(selectedMember === member.id ? null : member.id);
            }}
          >
            <div
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
            >
              <MapMarker
                member={{
                  avatar: member.avatar,
                  avatarColor: member.avatarColor,
                  name: member.name,
                  location: member.location,
                  moving: member.moving,
                  status: member.status,
                }}
                isSelected={selectedMember === member.id}
                isHovered={hoveredMember === member.id}
              />
            </div>
          </Marker>
        ))}
      </Map>
      <button
        type="button"
        onClick={resetView}
        className="absolute top-4 right-4 px-3 py-2 rounded-full text-[10px] font-medium uppercase tracking-wide transition-all hover:opacity-90"
        style={{
          background: "rgba(12,6,4,0.8)",
          border: "1px solid rgba(232,82,74,0.15)",
          color: "#E8524A",
          backdropFilter: "blur(12px)",
          fontFamily: "'DM Sans', sans-serif",
        }}
        aria-label="Reset map view"
      >
        Reset view
      </button>
    </div>
  );
}
