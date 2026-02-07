"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AlertCard from "@/components/AlertCard";
import { useWebSocket } from "@/lib/useWebSocket";
import { fetchAPI, postAPI, type AlertData } from "@/lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    if (data.type === "alert") {
      const alert = data.alert as unknown as AlertData;
      setAlerts((prev) => [alert, ...prev]);
    }
    if (data.type === "alert_resolved") {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === data.alert_id ? { ...a, is_active: false } : a
        )
      );
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

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
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar connected={connected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E2E8F0]">Alert Feed</h1>
            <p className="text-sm text-[#94A3B8]">
              {activeCount} active alert{activeCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2">
            {(["all", "active", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl bg-[#1E293B] border border-[#334155] p-12 text-center">
              <div className="text-4xl mb-3">
                {filter === "active" ? "" : ""}
              </div>
              <p className="text-[#64748B]">
                {filter === "active"
                  ? "No active alerts. Community is safe."
                  : "No alerts recorded yet."}
              </p>
            </div>
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
      </main>
    </div>
  );
}
