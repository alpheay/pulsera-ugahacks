"use client";

import type { AlertData } from "@/lib/api";

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-[#64748B]/30 bg-[#64748B]/10",
  warning: "border-[#F97316]/30 bg-[#F97316]/10",
  critical: "border-[#EF4444]/30 bg-[#EF4444]/10",
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
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const dot = SEVERITY_DOT[alert.severity] || SEVERITY_DOT.info;
  const time = new Date(alert.created_at).toLocaleTimeString();

  return (
    <div className={`rounded-lg border p-4 ${style}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${dot} ${alert.is_active ? "animate-pulse" : ""}`} />
          <span className="text-sm font-semibold text-[#E2E8F0]">{alert.title}</span>
        </div>
        <span className="text-xs text-[#94A3B8]">{time}</span>
      </div>

      <p className="mt-2 text-sm text-[#94A3B8]">{alert.description}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-[#64748B]">{alert.type}</span>
          <span className="text-xs font-mono text-[#F59E0B]">
            Score: {(alert.score * 100).toFixed(0)}%
          </span>
          {alert.affected_devices.length > 0 && (
            <span className="text-xs text-[#64748B]">
              {alert.affected_devices.length} device{alert.affected_devices.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {alert.is_active && onResolve && (
          <button
            onClick={() => onResolve(alert.id)}
            className="rounded-md bg-[#334155] px-3 py-1 text-xs text-[#E2E8F0] hover:bg-[#475569] transition-colors"
          >
            Resolve
          </button>
        )}

        {!alert.is_active && (
          <span className="text-xs text-[#10B981]">Resolved</span>
        )}
      </div>
    </div>
  );
}
