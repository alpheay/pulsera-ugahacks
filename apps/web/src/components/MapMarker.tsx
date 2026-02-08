"use client";

import { Navigation } from "lucide-react";

export interface MapMarkerMember {
  avatar: string;
  avatarColor: string;
  name: string;
  location: string;
  moving: boolean;
  status: string;
}

interface MapMarkerProps {
  member: MapMarkerMember;
  isSelected?: boolean;
  isHovered?: boolean;
}

/**
 * Presentational marker UI: 40px avatar circle + name pill.
 * Used inside MapLibre Marker in MapScreen (same as previous FamilyMap pins).
 */
export default function MapMarker({ member, isSelected = false, isHovered = false }: MapMarkerProps) {
  return (
    <div className="relative flex flex-col items-center cursor-pointer">
      {/* Pin body */}
      <div
        className="relative flex items-center justify-center transition-transform duration-300"
        style={{
          width: "40px",
          height: "40px",
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
}
