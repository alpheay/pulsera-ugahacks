"use client";

import { useCallback, useEffect, useState } from "react";
import { useWS } from "@/lib/WebSocketContext";
import { fetchAPI, type EpisodeData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  anomaly_detected: { label: "Anomaly Detected", color: "#F97316" },
  calming: { label: "Calming Exercise", color: "#3B82F6" },
  re_evaluating: { label: "Re-evaluating", color: "#8B5CF6" },
  visual_check: { label: "Visual Check-In", color: "#06B6D4" },
  fusing: { label: "Analyzing Data", color: "#F59E0B" },
  escalating: { label: "Escalating", color: "#EF4444" },
  resolved: { label: "Resolved", color: "#10B981" },
};

function getPhaseConfig(phase: string) {
  return PHASE_CONFIG[phase] || { label: phase, color: "#94A3B8" };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function EpisodeCard({ episode }: { episode: EpisodeData }) {
  const { label, color } = getPhaseConfig(episode.phase);
  const isActive = episode.phase !== "resolved";
  const severity = Math.round(episode.severity_score * 100);
  const fusion = episode.fusion_result;

  return (
    <Card className={`border-l-4 bg-card/60 backdrop-blur-sm ${isActive ? "animate-pulse-subtle" : ""}`}
      style={{ borderLeftColor: color }}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-xs text-muted-foreground">
              {episode.device_id.slice(0, 12)}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0"
            style={{ color, borderColor: `${color}40` }}
          >
            {label}
          </Badge>
        </div>

        {/* Severity bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Severity</span>
            <span className="text-xs font-mono font-bold" style={{ color }}>
              {severity}%
            </span>
          </div>
          <Progress value={severity} className="h-1.5" />
        </div>

        {/* Timeline dots */}
        <div className="flex items-center gap-1">
          {episode.timeline.slice(-6).map((entry, i) => {
            const entryConfig = getPhaseConfig(entry.phase);
            return (
              <div key={i} className="flex items-center">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entryConfig.color }}
                  title={`${entryConfig.label} — ${timeAgo(entry.timestamp)}`}
                />
                {i < Math.min(episode.timeline.length, 6) - 1 && (
                  <div className="h-px w-3 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Gemini CMO Analysis */}
        {fusion && fusion.analysis_engine === "gemini" && (
          <div className="rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                CMO Analysis
              </span>
              {fusion.confidence && (
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(fusion.confidence * 100)}% confidence
                </span>
              )}
            </div>
            {fusion.caregiver_report && (
              <p className="text-xs text-foreground/80 leading-relaxed">
                {fusion.caregiver_report}
              </p>
            )}
            {fusion.likely_cause && (
              <Badge variant="outline" className="text-[10px] text-[#8B5CF6] border-[#8B5CF6]/30">
                {fusion.likely_cause.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        )}

        {/* Threshold fallback indicator */}
        {fusion && fusion.analysis_engine === "threshold" && (
          <div className="text-[10px] text-muted-foreground/60">
            Analysis: threshold engine — {fusion.explanation?.slice(0, 80)}...
          </div>
        )}

        {/* Timestamp */}
        <div className="text-[10px] text-muted-foreground/50">
          Started {timeAgo(episode.created_at)}
          {episode.resolved_at && ` — Resolved ${timeAgo(episode.resolved_at)}`}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EpisodePanel() {
  const [activeEpisodes, setActiveEpisodes] = useState<EpisodeData[]>([]);
  const [recentHistory, setRecentHistory] = useState<EpisodeData[]>([]);
  const { subscribe } = useWS();

  // Load initial active episodes
  useEffect(() => {
    fetchAPI<EpisodeData[]>("/api/episodes/active").then(setActiveEpisodes).catch(() => {});
  }, []);

  // Subscribe to real-time episode updates
  useEffect(() => {
    const unsub = subscribe("episode-update", (data) => {
      const episode = (data as { episode?: EpisodeData }).episode;
      if (!episode) return;

      if (episode.phase === "resolved") {
        // Move from active to history
        setActiveEpisodes((prev) => prev.filter((e) => e.id !== episode.id));
        setRecentHistory((prev) => [episode, ...prev].slice(0, 10));
      } else {
        // Update or add to active
        setActiveEpisodes((prev) => {
          const idx = prev.findIndex((e) => e.id === episode.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = episode;
            return updated;
          }
          return [episode, ...prev];
        });
      }
    });
    return unsub;
  }, [subscribe]);

  if (activeEpisodes.length === 0 && recentHistory.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mb-12">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            Active Episodes
            {activeEpisodes.length > 0 && (
              <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30" variant="outline">
                {activeEpisodes.length} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active episodes */}
          {activeEpisodes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeEpisodes.map((ep) => (
                <EpisodeCard key={ep.id} episode={ep} />
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              No active episodes
            </div>
          )}

          {/* Recent history */}
          {recentHistory.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Recent History
              </h4>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {recentHistory.map((ep) => (
                    <EpisodeCard key={ep.id} episode={ep} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
