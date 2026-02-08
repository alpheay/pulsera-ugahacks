"use client";

import Link from "next/link";
import PulseRing from "./PulseRing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AntiGravity from "@/components/effects/AntiGravity";
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

const STATUS_BADGE: Record<string, string> = {
  safe: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20",
  elevated: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/20",
  warning: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30 hover:bg-[#F97316]/20",
  critical: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20",
};

export default function ZoneCard({ zone }: { zone: ZoneData }) {
  const name = ZONE_NAMES[zone.zone_id] || zone.zone_id;
  const label = STATUS_LABELS[zone.status] || zone.status;
  const badgeClass = STATUS_BADGE[zone.status] || STATUS_BADGE.safe;

  return (
    <Link href={`/zones?id=${zone.zone_id}`}>
      <AntiGravity strength={8}>
        <Card className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {zone.active_devices} active device{zone.active_devices !== 1 ? "s" : ""}
                </p>
              </div>
              <PulseRing status={zone.status} size={56} score={zone.score} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Badge variant="outline" className={badgeClass}>
                {label}
              </Badge>
            </div>

            {zone.anomalous_devices > 0 && (
              <div className="mt-2 text-xs text-[#F97316]">
                {zone.anomalous_devices} anomalous device{zone.anomalous_devices !== 1 ? "s" : ""}
              </div>
            )}

            {zone.is_community_anomaly && (
              <Badge variant="destructive" className="mt-2 w-full justify-center">
                COMMUNITY ANOMALY DETECTED
              </Badge>
            )}
          </CardContent>
        </Card>
      </AntiGravity>
    </Link>
  );
}
