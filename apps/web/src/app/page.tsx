"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ZoneCard from "@/components/ZoneCard";
import PulseRing from "@/components/PulseRing";
import { useWebSocket } from "@/lib/useWebSocket";
import { fetchAPI, type CommunitySummary, type ZoneData, type HealthUpdate } from "@/lib/api";

export default function Home() {
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<HealthUpdate[]>([]);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    if (data.type === "health_update") {
      setRecentUpdates((prev) => [data as unknown as HealthUpdate, ...prev].slice(0, 20));
    }
    if (data.type === "device_connected" || data.type === "device_disconnected") {
      loadSummary();
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  async function loadSummary() {
    try {
      const data = await fetchAPI<CommunitySummary>("/api/community/summary");
      setSummary(data);
    } catch {
      // Server not available — use demo data
      setSummary({
        overall_status: "safe",
        total_devices: 0,
        total_anomalous: 0,
        community_anomalies: 0,
        zones: [
          { zone_id: "zone-downtown", score: 0.12, status: "safe", active_devices: 0, anomalous_devices: 0 },
          { zone_id: "zone-campus", score: 0.08, status: "safe", active_devices: 0, anomalous_devices: 0 },
          { zone_id: "zone-riverside", score: 0.05, status: "safe", active_devices: 0, anomalous_devices: 0 },
          { zone_id: "zone-hillcrest", score: 0.15, status: "safe", active_devices: 0, anomalous_devices: 0 },
        ],
        timestamp: new Date().toISOString(),
      });
    }
  }

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = summary?.overall_status || "safe";

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar connected={connected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E2E8F0]">Community Pulse</h1>
            <p className="mt-1 text-[#94A3B8]">
              Real-time safety monitoring across your community
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-[#F59E0B]">
                {summary?.total_devices || 0}
              </div>
              <div className="text-xs text-[#94A3B8]">Active Devices</div>
            </div>
            <PulseRing status={overallStatus} size={72} />
          </div>
        </div>

        {/* Community Status Banner */}
        {summary && summary.community_anomalies > 0 && (
          <div className="mb-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="font-bold text-[#EF4444]">
                COMMUNITY ANOMALY — {summary.community_anomalies} zone{summary.community_anomalies !== 1 ? "s" : ""} affected
              </span>
            </div>
            <p className="mt-1 text-sm text-[#FCA5A5]">
              Correlated distress patterns detected across multiple community members.
              Possible environmental hazard or coordinated event.
            </p>
          </div>
        )}

        {/* Zone Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(summary?.zones || []).map((zone) => (
            <ZoneCard key={zone.zone_id} zone={zone} />
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Total Anomalous</div>
            <div className="mt-2 text-3xl font-bold text-[#F97316]">
              {summary?.total_anomalous || 0}
            </div>
          </div>
          <div className="rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Community Alerts</div>
            <div className="mt-2 text-3xl font-bold text-[#EF4444]">
              {summary?.community_anomalies || 0}
            </div>
          </div>
          <div className="rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Network Status</div>
            <div className={`mt-2 text-3xl font-bold ${
              overallStatus === "safe" ? "text-[#10B981]" :
              overallStatus === "elevated" ? "text-[#F59E0B]" :
              overallStatus === "warning" ? "text-[#F97316]" :
              "text-[#EF4444]"
            }`}>
              {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-[#E2E8F0]">Live Feed</h2>
          <div className="rounded-xl bg-[#1E293B] border border-[#334155] overflow-hidden">
            {recentUpdates.length === 0 ? (
              <div className="p-8 text-center text-[#64748B]">
                <p>Waiting for device data...</p>
                <p className="mt-2 text-xs">Start the simulator or connect a wearable device</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {recentUpdates.map((update, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[#334155] px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          update.anomaly?.is_anomaly ? "bg-[#EF4444]" : "bg-[#10B981]"
                        }`}
                      />
                      <span className="font-mono text-xs text-[#94A3B8]">
                        {update.device_id?.slice(0, 16)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#EF4444]">
                        HR: {update.reading?.heart_rate?.toFixed(0)}
                      </span>
                      <span className="text-[#F59E0B]">
                        HRV: {update.reading?.hrv?.toFixed(0)}
                      </span>
                      <span className="font-mono text-[#F59E0B]">
                        Score: {((update.anomaly?.overall_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
