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
import PulseRing from "@/components/PulseRing";
import { useWS } from "@/lib/WebSocketContext";
import { fetchAPI } from "@/lib/api";
import PageTransition from "@/components/effects/PageTransition";
import GradientText from "@/components/effects/GradientText";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const { subscribe } = useWS();

  useEffect(() => {
    const unsub = subscribe("health_update", () => {
      loadZone();
    });
    return unsub;
  }, [subscribe, selectedZone]);

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
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Zone Tabs */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          <GradientText colors={["#10B981", "#F59E0B", "#3B82F6", "#10B981"]}>
            Zone Analysis
          </GradientText>
        </h1>
        <Tabs value={selectedZone} className="w-full">
          <TabsList className="bg-secondary">
            {Object.entries(ZONE_NAMES).map(([id, name]) => (
              <TabsTrigger key={id} value={id} asChild>
                <a href={`/zones?id=${id}`}>{name}</a>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {zone && (
        <>
          {/* Zone Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{zone.name}</h2>
              <p className="text-sm text-muted-foreground">
                {zone.active_devices} active devices | {zone.anomalous_devices} anomalous
              </p>
            </div>
            <PulseRing status={zone.status} size={80} score={zone.score} />
          </div>

          {zone.is_community_anomaly && (
            <Card className="mb-6 border-[#EF4444]/30 bg-[#EF4444]/10">
              <CardContent className="p-4">
                <Badge variant="destructive" className="font-bold">
                  COMMUNITY ANOMALY — Multiple correlated distress signals in this zone
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Score History Chart */}
          <Card className="mb-6 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Zone Anomaly Score Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scoreHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="t" stroke="#64748B" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1E293B",
                        border: "1px solid rgba(255,255,255,0.1)",
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
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  No history data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Table */}
          <Card className="bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Zone Members
              </CardTitle>
            </CardHeader>
            {zone.devices && zone.devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Device</TableHead>
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zone.devices.map((device) => (
                    <TableRow key={device.device_id} className="border-border/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                          <span className="font-mono text-sm text-foreground">{device.device_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.user_id?.slice(0, 12)}
                      </TableCell>
                      <TableCell className="text-right">
                        {zone.device_scores && (
                          <span className="font-mono text-xs text-[#F59E0B]">
                            {((zone.device_scores[device.device_id] || 0) * 100).toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CardContent className="p-8 text-center text-muted-foreground">
                No devices connected to this zone
              </CardContent>
            )}
          </Card>
        </>
      )}
    </PageTransition>
  );
}

export default function ZonesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Loading zones...
        </div>
      }
    >
      <ZonesContent />
    </Suspense>
  );
}
