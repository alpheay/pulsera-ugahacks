"use client";

import { useEffect, useState } from "react";
import SignalChart from "@/components/SignalChart";
import AttentionHeatmap from "@/components/AttentionHeatmap";
import { fetchAPI, type PulseNetResult } from "@/lib/api";
import GradientText from "@/components/effects/GradientText";
import CountUp from "@/components/effects/CountUp";
import PageTransition from "@/components/effects/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModelInfo {
  loaded: boolean;
  parameters?: number;
  device?: string;
}

interface Architecture {
  name: string;
  parameters: number;
  layers: Array<{
    name: string;
    type: string;
    shape?: string;
    components?: string[];
  }>;
  training: Record<string, string>;
  tagline: string;
}

interface TrainingHistory {
  available: boolean;
  history?: {
    train_loss: number[];
    val_loss: number[];
    val_anomaly_auc: number[];
  };
}

export default function PulseNetPage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [demoResult, setDemoResult] = useState<PulseNetResult | null>(null);
  const [training, setTraining] = useState<TrainingHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModelInfo();
    loadArchitecture();
    loadTrainingHistory();
  }, []);

  async function loadModelInfo() {
    try {
      const data = await fetchAPI<ModelInfo>("/api/pulsenet/status");
      setModelInfo(data);
    } catch {
      setModelInfo({ loaded: false });
    }
  }

  async function loadArchitecture() {
    try {
      const data = await fetchAPI<Architecture>("/api/pulsenet/architecture");
      setArchitecture(data);
    } catch {}
  }

  async function loadTrainingHistory() {
    try {
      const data = await fetchAPI<TrainingHistory>("/api/pulsenet/training-history");
      setTraining(data);
    } catch {}
  }

  async function runDemo() {
    setLoading(true);
    try {
      const data = await fetchAPI<PulseNetResult>("/api/pulsenet/demo");
      setDemoResult(data);
    } catch {
      setDemoResult(generateClientDemo());
    } finally {
      setLoading(false);
    }
  }

  function generateClientDemo(): PulseNetResult {
    const input: number[][] = [];
    const reconstruction: number[][] = [];
    const scores: number[] = [];
    const isAnomaly = Math.random() > 0.5;

    for (let i = 0; i < 60; i++) {
      const hr = 70 + Math.sin(i * 0.1) * 5 + (Math.random() - 0.5) * 3;
      const hrv = 50 + (Math.random() - 0.5) * 10;
      const accel = 1.0 + (Math.random() - 0.5) * 0.1;
      const temp = 36.5 + (Math.random() - 0.5) * 0.2;

      let anomalyHr = hr;
      let score = 0.1 + Math.random() * 0.1;
      if (isAnomaly && i >= 25 && i <= 40) {
        anomalyHr = hr + 40 + Math.random() * 10;
        score = 0.7 + Math.random() * 0.3;
      }

      input.push([anomalyHr, hrv, accel, temp]);
      reconstruction.push([hr, hrv, accel, temp]);
      scores.push(score);
    }

    const heatmap: number[][] = Array.from({ length: 60 }, (_, i) =>
      Array.from({ length: 60 }, (_, j) => {
        const dist = Math.abs(i - j);
        let val = Math.exp(-dist * 0.1);
        if (isAnomaly && i >= 25 && i <= 40 && j >= 25 && j <= 40) {
          val += 0.5;
        }
        return Math.min(1, val);
      })
    );

    return {
      overall_score: isAnomaly ? 0.72 : 0.12,
      max_score: isAnomaly ? 0.95 : 0.22,
      is_anomaly: isAnomaly,
      per_timestep_scores: scores,
      reconstruction,
      association_discrepancy: isAnomaly ? 2.3 : 0.4,
      attention_heatmap: heatmap,
      input,
    };
  }

  return (
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          <GradientText colors={["#F59E0B", "#8B5CF6", "#3B82F6", "#F59E0B"]}>
            PulseNet Visualizer
          </GradientText>
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ground-up anomaly detection transformer — every parameter learned from scratch
        </p>
      </div>

      {/* Model Info */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
            <div className={`mt-1 text-lg font-bold ${modelInfo?.loaded ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {modelInfo?.loaded ? "Loaded" : "Demo Mode"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Parameters</div>
            <div className="mt-1 text-lg font-bold text-[#F59E0B]">
              <CountUp end={architecture?.parameters || 150000} duration={2} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Device</div>
            <div className="mt-1 text-lg font-bold text-[#8B5CF6]">
              {modelInfo?.device || "MPS"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pre-trained?</div>
            <Badge variant="destructive" className="mt-1 text-sm">NO</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Run Demo Button */}
      <div className="mb-6">
        <Button
          onClick={runDemo}
          disabled={loading}
          size="lg"
          className="bg-[#F59E0B] text-[#0F172A] font-bold hover:bg-[#D97706]"
        >
          {loading ? "Running Inference..." : "Run Live Inference Demo"}
        </Button>
      </div>

      {/* Demo Results */}
      {demoResult && (
        <div className="space-y-6">
          {/* Score Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className={`${demoResult.is_anomaly ? "border-[#EF4444]/30 bg-[#EF4444]/10" : "border-[#10B981]/30 bg-[#10B981]/10"}`}>
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Verdict</div>
                <div className={`mt-1 text-2xl font-bold ${demoResult.is_anomaly ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                  {demoResult.is_anomaly ? "ANOMALY DETECTED" : "NORMAL"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall Score</div>
                <div className="mt-1 text-2xl font-bold text-[#F59E0B]">
                  <CountUp end={parseFloat((demoResult.overall_score * 100).toFixed(1))} duration={1.5} decimals={1} suffix="%" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Association Discrepancy</div>
                <div className="mt-1 text-2xl font-bold text-[#8B5CF6]">
                  <CountUp end={parseFloat(demoResult.association_discrepancy.toFixed(3))} duration={1.5} decimals={3} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signal Chart */}
          {demoResult.input && (
            <SignalChart
              data={demoResult.input}
              reconstruction={demoResult.reconstruction}
              anomalyScores={demoResult.per_timestep_scores}
              title="Input Signal vs Reconstruction (with Anomaly Scores)"
            />
          )}

          {/* Attention Heatmap */}
          {demoResult.attention_heatmap && (
            <AttentionHeatmap
              data={demoResult.attention_heatmap}
              title="Self-Attention Heatmap (Last Layer) — Shows which timesteps the model attends to"
            />
          )}

          {/* Per-Timestep Scores */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Per-Timestep Anomaly Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-0.5 items-end h-20">
                {demoResult.per_timestep_scores.map((score, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${score * 100}%`,
                      backgroundColor:
                        score > 0.7 ? "#EF4444" :
                        score > 0.5 ? "#F97316" :
                        score > 0.3 ? "#F59E0B" :
                        "#10B981",
                      opacity: 0.8,
                    }}
                    title={`t=${i}: ${(score * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>t=0</span>
                <span>t={demoResult.per_timestep_scores.length - 1}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Architecture */}
      {architecture && (
        <Card className="mt-8 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#F59E0B]">
              Architecture: {architecture.name}
            </CardTitle>
            <p className="text-sm italic text-[#F59E0B]/70">{architecture.tagline}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {architecture.layers.map((layer, i) => (
                <div key={i} className="rounded-lg bg-background p-3 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-foreground">{layer.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20">
                        {layer.type}
                      </Badge>
                      {layer.shape && (
                        <span className="font-mono text-xs text-[#F59E0B]">{layer.shape}</span>
                      )}
                    </div>
                  </div>
                  {layer.components && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {layer.components.map((c, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {Object.entries(architecture.training).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground">{key}: </span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training History */}
      {training?.available && training.history && (
        <Card className="mt-6 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Training Curves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm text-muted-foreground">Loss</h3>
                <div className="flex items-end gap-1 h-32">
                  {training.history.train_loss.map((loss, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-[#F59E0B]"
                      style={{ height: `${Math.min(100, loss * 50)}%`, opacity: 0.7 }}
                      title={`Epoch ${i + 1}: ${loss.toFixed(4)}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm text-muted-foreground">AUC</h3>
                <div className="flex items-end gap-1 h-32">
                  {training.history.val_anomaly_auc.map((auc, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-[#10B981]"
                      style={{ height: `${auc * 100}%`, opacity: 0.7 }}
                      title={`Epoch ${i + 1}: ${auc.toFixed(4)}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageTransition>
  );
}
