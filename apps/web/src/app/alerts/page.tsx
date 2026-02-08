"use client";

import { useCallback, useEffect, useState } from "react";
import AlertCard from "@/components/AlertCard";
import { useWS } from "@/lib/WebSocketContext";
import { fetchAPI, postAPI, type AlertData } from "@/lib/api";
import GradientText from "@/components/effects/GradientText";
import CountUp from "@/components/effects/CountUp";
import PageTransition from "@/components/effects/PageTransition";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [filter, setFilter] = useState("all");
  const { subscribe } = useWS();

  useEffect(() => {
    const unsub1 = subscribe("alert", (data) => {
      const alert = data.alert as unknown as AlertData;
      setAlerts((prev) => [alert, ...prev]);
    });
    const unsub2 = subscribe("alert_resolved", (data) => {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === data.alert_id ? { ...a, is_active: false } : a
        )
      );
    });
    return () => { unsub1(); unsub2(); };
  }, [subscribe]);

  async function loadAlerts() {
    try {
      const data = await fetchAPI<{ alerts: AlertData[] }>("/api/alerts");
      setAlerts(data.alerts);
    } catch {
      // No alerts yet
    }
  }

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleResolve(alertId: string) {
    try {
      await postAPI(`/api/alerts/${alertId}/resolve`, { acknowledged_by: "dashboard" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_active: false } : a))
      );
    } catch {
      // ignore
    }
  }

  const filtered = alerts.filter((a) => {
    if (filter === "active") return a.is_active;
    if (filter === "resolved") return !a.is_active;
    return true;
  });

  const activeCount = alerts.filter((a) => a.is_active).length;

  return (
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            <GradientText colors={["#EF4444", "#F97316", "#F59E0B", "#EF4444"]}>
              Alert Feed
            </GradientText>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <CountUp end={activeCount} duration={1} /> active alert{activeCount !== 1 ? "s" : ""}
          </p>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {filter === "active"
                  ? "No active alerts. Community is safe."
                  : "No alerts recorded yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={handleResolve}
            />
          ))
        )}
      </div>
    </PageTransition>
  );
}
