"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ZoneCard from "@/components/ZoneCard";
import GroupCard from "@/components/GroupCard";
import PulseRing from "@/components/PulseRing";
import { useWS } from "@/lib/WebSocketContext";
import {
  fetchAPI,
  fetchGroups,
  type CommunitySummary,
  type ZoneData,
  type HealthUpdate,
  type GroupData,
} from "@/lib/api";
import GradientText from "@/components/effects/GradientText";
import CountUp from "@/components/effects/CountUp";
import ScrollFloat from "@/components/effects/ScrollFloat";
import PageTransition from "@/components/effects/PageTransition";
import MagicBento from "@/components/effects/MagicBento";
import GradualBlur from "@/components/effects/GradualBlur";
import CircularGallery from "@/components/gallery/CircularGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEMO_GROUPS: GroupData[] = [
  {
    id: "demo-family-1",
    name: "Garcia Family",
    description: "Family safety group",
    type: "family",
    invite_code: "GARC-1234",
    member_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-community-1",
    name: "UGA Campus Watch",
    description: "Campus community safety network",
    type: "community",
    invite_code: "UGAC-3456",
    member_count: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-community-2",
    name: "Downtown Safety Network",
    description: "Downtown community group",
    type: "community",
    invite_code: "DWTN-7890",
    member_count: 6,
    created_at: new Date().toISOString(),
  },
];

export default function Home() {
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<HealthUpdate[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const { subscribe, connected } = useWS();

  useEffect(() => {
    const unsub1 = subscribe("health_update", (data) => {
      setRecentUpdates((prev) => [data as unknown as HealthUpdate, ...prev].slice(0, 20));
    });
    const unsub2 = subscribe("device_connected", () => loadSummary());
    const unsub3 = subscribe("device_disconnected", () => loadSummary());
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe]);

  async function loadSummary() {
    try {
      const data = await fetchAPI<CommunitySummary>("/api/community/summary");
      setSummary(data);
    } catch {
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

  async function loadGroups() {
    const token = typeof window !== "undefined" ? localStorage.getItem("pulsera_token") : null;
    if (token) {
      try {
        const data = await fetchGroups(token);
        if (data.length > 0) {
          setGroups(data.slice(0, 3));
          return;
        }
      } catch {}
    }
    setGroups(DEMO_GROUPS);
  }

  useEffect(() => {
    loadSummary();
    loadGroups();
    const interval = setInterval(loadSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = summary?.overall_status || "safe";

  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="relative px-4 py-12 sm:px-6 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <ScrollFloat speed={5} direction="up">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                <GradientText colors={["#F59E0B", "#F97316", "#EF4444", "#8B5CF6", "#F59E0B"]}>
                  Community Safety Pulse Network
                </GradientText>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Real-time wearable health monitoring powered by PulseNet AI.
                Protecting communities through collective awareness.
              </p>
            </div>
          </ScrollFloat>
        </div>
      </section>

      {/* Community Status Banner */}
      {summary && summary.community_anomalies > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-6">
          <Card className="border-[#EF4444]/30 bg-[#EF4444]/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="font-bold text-[#EF4444]">
                  COMMUNITY ANOMALY — {summary.community_anomalies} zone{summary.community_anomalies !== 1 ? "s" : ""} affected
                </span>
              </div>
              <p className="mt-1 text-sm text-[#FCA5A5]">
                Correlated distress patterns detected across multiple community members.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mb-12">
        <MagicBento
          items={[
            {
              size: "large",
              content: (
                <div className="flex flex-col items-center justify-center h-full">
                  <PulseRing status={overallStatus} size={100} />
                  <div className="mt-6 text-center">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Community Status
                    </div>
                    <div className={`text-2xl font-bold ${
                      overallStatus === "safe" ? "text-[#10B981]" :
                      overallStatus === "elevated" ? "text-[#F59E0B]" :
                      overallStatus === "warning" ? "text-[#F97316]" :
                      "text-[#EF4444]"
                    }`}>
                      {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              size: "small",
              content: (
                <div className="flex flex-col justify-center h-full">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Devices</div>
                  <div className="mt-2 text-3xl font-bold text-[#F59E0B]">
                    <CountUp end={summary?.total_devices || 0} duration={2} />
                  </div>
                </div>
              ),
            },
            {
              size: "small",
              content: (
                <div className="flex flex-col justify-center h-full">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Anomalous</div>
                  <div className="mt-2 text-3xl font-bold text-[#F97316]">
                    <CountUp end={summary?.total_anomalous || 0} duration={2} />
                  </div>
                </div>
              ),
            },
            {
              size: "small",
              content: (
                <div className="flex flex-col justify-center h-full">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Community Alerts</div>
                  <div className="mt-2 text-3xl font-bold text-[#EF4444]">
                    <CountUp end={summary?.community_anomalies || 0} duration={2} />
                  </div>
                </div>
              ),
            },
            {
              size: "small",
              content: (
                <div className="flex flex-col justify-center h-full">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Zones Active</div>
                  <div className="mt-2 text-3xl font-bold text-[#3B82F6]">
                    <CountUp end={summary?.zones?.length || 4} duration={2} />
                  </div>
                </div>
              ),
            },
            {
              size: "medium",
              content: (
                <div className="h-full flex flex-col">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Live Feed</div>
                  <div className="flex-1 relative overflow-hidden">
                    <ScrollArea className="h-full">
                      {recentUpdates.length === 0 ? (
                        <div className="text-xs text-muted-foreground/50 text-center pt-4">
                          Waiting for device data...
                        </div>
                      ) : (
                        recentUpdates.slice(0, 5).map((update, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 text-xs border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className={`h-1.5 w-1.5 rounded-full ${update.anomaly?.is_anomaly ? "bg-[#EF4444]" : "bg-[#10B981]"}`} />
                              <span className="font-mono text-muted-foreground">{update.device_id?.slice(0, 10)}</span>
                            </div>
                            <span className="font-mono text-[#F59E0B]">
                              {((update.anomaly?.overall_score || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                    <GradualBlur direction="bottom" height="40px" blurAmount={4} />
                  </div>
                </div>
              ),
            },
            {
              size: "medium",
              content: (
                <div className="h-full flex flex-col">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Zone Overview</div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {(summary?.zones || []).slice(0, 4).map((zone) => {
                      const names: Record<string, string> = {
                        "zone-downtown": "Downtown",
                        "zone-campus": "Campus",
                        "zone-riverside": "Riverside",
                        "zone-hillcrest": "Hillcrest",
                      };
                      return (
                        <div key={zone.zone_id} className="rounded-lg bg-background/50 p-2 border border-border/30">
                          <div className="text-xs font-medium text-foreground truncate">{names[zone.zone_id] || zone.zone_id}</div>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                              zone.status === "safe" ? "text-[#10B981] border-[#10B981]/30" :
                              zone.status === "elevated" ? "text-[#F59E0B] border-[#F59E0B]/30" :
                              zone.status === "warning" ? "text-[#F97316] border-[#F97316]/30" :
                              "text-[#EF4444] border-[#EF4444]/30"
                            }`}>
                              {zone.status}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {(zone.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </section>

      {/* Zone Overview - Circular Gallery */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mb-12">
        <ScrollFloat speed={3} direction="up">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            <GradientText colors={["#10B981", "#F59E0B", "#10B981"]}>Zone Overview</GradientText>
          </h2>
        </ScrollFloat>
        {(summary?.zones?.length || 0) > 0 ? (
          <CircularGallery
            items={(summary?.zones || []).map((zone) => (
              <ZoneCard key={zone.zone_id} zone={zone} />
            ))}
            radius={280}
            autoRotate
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(summary?.zones || []).map((zone) => (
              <ZoneCard key={zone.zone_id} zone={zone} />
            ))}
          </div>
        )}
      </section>

      {/* Groups Preview */}
      {groups.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              <GradientText colors={["#8B5CF6", "#3B82F6", "#8B5CF6"]}>Groups</GradientText>
            </h2>
            <Link
              href="/groups"
              className="text-sm text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
            >
              View all groups
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} status="safe" />
            ))}
          </div>
        </section>
      )}

      {/* Live Feed */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <Card className="bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Live Feed
              <Badge variant="outline" className={`text-xs ${
                connected
                  ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                  : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
              }`}>
                {connected ? "Connected" : "Disconnected"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {recentUpdates.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Waiting for device data...</p>
                <p className="mt-2 text-xs">Start the simulator or connect a wearable device</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                {recentUpdates.map((update, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-border/30 px-2 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          update.anomaly?.is_anomaly ? "bg-[#EF4444]" : "bg-[#10B981]"
                        }`}
                      />
                      <span className="font-mono text-xs text-muted-foreground">
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
              </ScrollArea>
            )}
            <GradualBlur direction="bottom" height="80px" blurAmount={6} />
          </CardContent>
        </Card>
      </section>
    </PageTransition>
  );
}
