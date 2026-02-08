"use client";

import type { AlertData } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const SEVERITY_CARD: Record<string, string> = {
  info: "border-[#64748B]/30",
  warning: "border-[#F97316]/30",
  critical: "border-[#EF4444]/30",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-[#64748B]/20 text-[#94A3B8] border-[#64748B]/30 hover:bg-[#64748B]/20",
  warning: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30 hover:bg-[#F97316]/20",
  critical: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-[#64748B]",
  warning: "bg-[#F97316]",
  critical: "bg-[#EF4444]",
};

export default function AlertCard({
  alert,
  onResolve,
}: {
  alert: AlertData;
  onResolve?: (id: string) => void;
}) {
  const cardClass = SEVERITY_CARD[alert.severity] || SEVERITY_CARD.info;
  const badgeClass = SEVERITY_BADGE[alert.severity] || SEVERITY_BADGE.info;
  const dot = SEVERITY_DOT[alert.severity] || SEVERITY_DOT.info;
  const time = new Date(alert.created_at).toLocaleTimeString();
  const scorePercent = Math.round(alert.score * 100);

  return (
    <Card className={`bg-card/80 backdrop-blur-sm ${cardClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${dot} ${alert.is_active ? "animate-pulse" : ""}`} />
            <span className="text-sm font-semibold text-foreground">{alert.title}</span>
            <Badge variant="outline" className={badgeClass}>
              {alert.severity}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>

        {/* Score bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Anomaly Score</span>
            <span className="text-xs font-mono text-[#F59E0B]">{scorePercent}%</span>
          </div>
          <Progress value={scorePercent} className="h-1.5" />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{alert.type}</span>
            {alert.affected_devices.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {alert.affected_devices.length} device{alert.affected_devices.length !== 1 ? "s" : ""}
              </span>
            )}
            {alert.group_id && (
              <Badge variant="outline" className="bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20">
                Group: {alert.group_name || alert.group_id}
              </Badge>
            )}
          </div>

          {alert.is_active && onResolve && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onResolve(alert.id)}
              className="text-xs"
            >
              Resolve
            </Button>
          )}

          {!alert.is_active && (
            <Badge variant="outline" className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20">
              Resolved
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
