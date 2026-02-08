"use client";

import Link from "next/link";
import PulseRing from "./PulseRing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AntiGravity from "@/components/effects/AntiGravity";
import type { GroupData } from "@/lib/api";

const TYPE_BADGE: Record<string, { className: string; label: string }> = {
  family: {
    className: "bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20",
    label: "Family",
  },
  community: {
    className: "bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/30 hover:bg-[#3B82F6]/20",
    label: "Community",
  },
};

const STATUS_BADGE: Record<string, string> = {
  safe: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20",
  elevated: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/20",
  warning: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30 hover:bg-[#F97316]/20",
  critical: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20",
};

const STATUS_LABELS: Record<string, string> = {
  safe: "All Clear",
  elevated: "Elevated",
  warning: "Warning",
  critical: "CRITICAL",
};

interface GroupCardProps {
  group: GroupData;
  status?: "safe" | "elevated" | "warning" | "critical";
}

export default function GroupCard({ group, status = "safe" }: GroupCardProps) {
  const badge = TYPE_BADGE[group.type] || TYPE_BADGE.community;
  const statusBadge = STATUS_BADGE[status] || STATUS_BADGE.safe;
  const statusLabel = STATUS_LABELS[status] || status;

  return (
    <Link href={`/groups/${group.id}`}>
      <AntiGravity strength={8}>
        <Card className="cursor-pointer border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {group.name}
                  </h3>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                </p>
              </div>
              <PulseRing status={status} size={56} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Badge variant="outline" className={statusBadge}>
                {statusLabel}
              </Badge>
            </div>

            {group.description && (
              <p className="mt-2 text-xs text-muted-foreground/70 truncate">
                {group.description}
              </p>
            )}
          </CardContent>
        </Card>
      </AntiGravity>
    </Link>
  );
}
