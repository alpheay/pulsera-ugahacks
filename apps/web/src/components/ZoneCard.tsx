"use client";

import Link from "next/link";
import PulseRing from "./PulseRing";
import type { ZoneData } from "@/lib/api";

const ZONE_NAMES: Record<string, string> = {
  "zone-downtown": "Downtown",
  "zone-campus": "UGA Campus",
  "zone-riverside": "Riverside",
  "zone-hillcrest": "Hillcrest",
};

const STATUS_LABELS: Record<string, string> = {
  safe: "All Clear",
  elevated: "Elevated",
  warning: "Warning",
  critical: "CRITICAL",
};

const STATUS_BG: Record<string, string> = {
  safe: "bg-[#10B981]/10 border-[#10B981]/30",
  elevated: "bg-[#F59E0B]/10 border-[#F59E0B]/30",
  warning: "bg-[#F97316]/10 border-[#F97316]/30",
  critical: "bg-[#EF4444]/10 border-[#EF4444]/30",
};

export default function ZoneCard({ zone }: { zone: ZoneData }) {
  const name = ZONE_NAMES[zone.zone_id] || zone.zone_id;
  const label = STATUS_LABELS[zone.status] || zone.status;
  const bg = STATUS_BG[zone.status] || STATUS_BG.safe;

  return (
    <Link href={`/zones?id=${zone.zone_id}`}>
      <div
        className={`rounded-xl border p-6 transition-all hover:scale-[1.02] cursor-pointer ${bg}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#E2E8F0]">{name}</h3>
            <p className="text-sm text-[#94A3B8] mt-1">
              {zone.active_devices} active device{zone.active_devices !== 1 ? "s" : ""}
            </p>
          </div>
          <PulseRing status={zone.status} size={56} score={zone.score} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            Status
          </span>
          <span
            className={`text-sm font-bold ${
              zone.status === "critical"
                ? "text-[#EF4444]"
                : zone.status === "warning"
                ? "text-[#F97316]"
                : zone.status === "elevated"
                ? "text-[#F59E0B]"
                : "text-[#10B981]"
            }`}
          >
            {label}
          </span>
        </div>

        {zone.anomalous_devices > 0 && (
          <div className="mt-2 text-xs text-[#F97316]">
            {zone.anomalous_devices} anomalous device{zone.anomalous_devices !== 1 ? "s" : ""}
          </div>
        )}

        {zone.is_community_anomaly && (
          <div className="mt-2 rounded-md bg-[#EF4444]/20 px-2 py-1 text-xs font-bold text-[#EF4444] text-center">
            COMMUNITY ANOMALY DETECTED
          </div>
        )}
      </div>
    </Link>
  );
}
