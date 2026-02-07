"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Navbar from "@/components/Navbar";
import PulseRing from "@/components/PulseRing";
import { useWebSocket } from "@/lib/useWebSocket";
import { fetchAPI } from "@/lib/api";

const ZONE_NAMES: Record<string, string> = {
  "zone-downtown": "Downtown",
  "zone-campus": "UGA Campus",
  "zone-riverside": "Riverside",
  "zone-hillcrest": "Hillcrest",
};

interface ZoneDetail {
  id: string;
  name: string;
  score: number;
  status: string;
  active_devices: number;
  anomalous_devices: number;
  is_community_anomaly?: boolean;
  device_scores?: Record<string, number>;
  history?: Array<{ score: number; timestamp: string }>;
  devices?: Array<{ device_id: string; user_id: string; connected_at: string }>;
}

function ZonesContent() {
  const searchParams = useSearchParams();
  const selectedZone = searchParams.get("id") || "zone-downtown";
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{ t: number; score: number }>>([]);

  const handleMessage = useCallback(
    (data: Record<string, unknown>) => {
      if (data.type === "health_update") {
        loadZone();
      }
    },
    [selectedZone]
  );

  const { connected } = useWebSocket(handleMessage);

  async function loadZone() {
    try {
      const data = await fetchAPI<ZoneDetail>(`/api/zones/${selectedZone}`);
      setZone(data);
      if (data.history) {
        setScoreHistory(
          data.history.map((h: { score: number }, i: number) => ({ t: i, score: h.score }))
        );
      }
    } catch {
      setZone({
        id: selectedZone,
        name: ZONE_NAMES[selectedZone] || selectedZone,
        score: 0.08,
        status: "safe",
        active_devices: 0,
        anomalous_devices: 0,
        devices: [],
      });
    }
  }

  useEffect(() => {
    loadZone();
    const interval = setInterval(loadZone, 5000);
    return () => clearInterval(interval);
  }, [selectedZone]);

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar connected={connected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Zone Tabs */}
        <div className="mb-6 flex gap-2">
          {Object.entries(ZONE_NAMES).map(([id, name]) => (
            <a
              key={id}
              href={`/zones?id=${id}`}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedZone === id
                  ? "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30"
                  : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155] border border-[#334155]"
              }`}
            >
              {name}
            </a>
          ))}
        </div>

        {zone && (
          <>
            {/* Zone Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#E2E8F0]">{zone.name}</h1>
                <p className="text-sm text-[#94A3B8]">
                  {zone.active_devices} active devices | {zone.anomalous_devices} anomalous
                </p>
              </div>
              <PulseRing status={zone.status} size={80} score={zone.score} />
            </div>

            {zone.is_community_anomaly && (
              <div className="mb-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4">
                <span className="font-bold text-[#EF4444]">
                  COMMUNITY ANOMALY — Multiple correlated distress signals in this zone
                </span>
              </div>
            )}

            {/* Score History Chart */}
            <div className="mb-6 rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
              <h2 className="mb-4 text-sm font-semibold text-[#94A3B8]">
                Zone Anomaly Score Over Time
              </h2>
              {scoreHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="t" stroke="#64748B" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-[#64748B]">
                  No history data yet
                </div>
              )}
            </div>

            {/* Device List */}
            <div className="rounded-xl bg-[#1E293B] border border-[#334155] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#334155]">
                <h2 className="text-sm font-semibold text-[#94A3B8]">Zone Members</h2>
              </div>
              {zone.devices && zone.devices.length > 0 ? (
                zone.devices.map((device) => (
                  <div
                    key={device.device_id}
                    className="flex items-center justify-between border-b border-[#334155] px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                      <span className="font-mono text-sm text-[#E2E8F0]">
                        {device.device_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                      <span>User: {device.user_id?.slice(0, 12)}</span>
                      {zone.device_scores && (
                        <span className="font-mono text-[#F59E0B]">
                          Score: {((zone.device_scores[device.device_id] || 0) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#64748B]">
                  No devices connected to this zone
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ZonesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#94A3B8]">Loading zones...</div>}>
      <ZonesContent />
    </Suspense>
  );
}
