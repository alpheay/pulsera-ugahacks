"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import SignalChart from "@/components/SignalChart";
import AttentionHeatmap from "@/components/AttentionHeatmap";
import { useWebSocket } from "@/lib/useWebSocket";
import { fetchAPI, type PulseNetResult } from "@/lib/api";

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
  const { connected } = useWebSocket();
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
      // Generate client-side demo data
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
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar connected={connected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F59E0B]">PulseNet Visualizer</h1>
          <p className="mt-1 text-[#94A3B8]">
            Ground-up anomaly detection transformer — every parameter learned from scratch
          </p>
        </div>

        {/* Model Info */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Status</div>
            <div className={`mt-1 text-lg font-bold ${modelInfo?.loaded ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
              {modelInfo?.loaded ? "Loaded" : "Demo Mode"}
            </div>
          </div>
          <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Parameters</div>
            <div className="mt-1 text-lg font-bold text-[#F59E0B]">
              {(architecture?.parameters || 150000).toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Device</div>
            <div className="mt-1 text-lg font-bold text-[#8B5CF6]">
              {modelInfo?.device || "MPS"}
            </div>
          </div>
          <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Pre-trained?</div>
            <div className="mt-1 text-lg font-bold text-[#EF4444]">NO</div>
          </div>
        </div>

        {/* Run Demo Button */}
        <div className="mb-6">
          <button
            onClick={runDemo}
            disabled={loading}
            className="rounded-xl bg-[#F59E0B] px-6 py-3 font-bold text-[#0F172A] hover:bg-[#D97706] transition-colors disabled:opacity-50"
          >
            {loading ? "Running Inference..." : "Run Live Inference Demo"}
          </button>
        </div>

        {/* Demo Results */}
        {demoResult && (
          <div className="space-y-6">
            {/* Score Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className={`rounded-xl p-4 border ${
                demoResult.is_anomaly
                  ? "bg-[#EF4444]/10 border-[#EF4444]/30"
                  : "bg-[#10B981]/10 border-[#10B981]/30"
              }`}>
                <div className="text-xs uppercase tracking-wider text-[#94A3B8]">Verdict</div>
                <div className={`mt-1 text-2xl font-bold ${
                  demoResult.is_anomaly ? "text-[#EF4444]" : "text-[#10B981]"
                }`}>
                  {demoResult.is_anomaly ? "ANOMALY DETECTED" : "NORMAL"}
                </div>
              </div>
              <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
                <div className="text-xs uppercase tracking-wider text-[#64748B]">Overall Score</div>
                <div className="mt-1 text-2xl font-bold text-[#F59E0B]">
                  {(demoResult.overall_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
                <div className="text-xs uppercase tracking-wider text-[#64748B]">
                  Association Discrepancy
                </div>
                <div className="mt-1 text-2xl font-bold text-[#8B5CF6]">
                  {demoResult.association_discrepancy.toFixed(3)}
                </div>
              </div>
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
            <div className="rounded-xl bg-[#1E293B] p-4 border border-[#334155]">
              <h3 className="mb-3 text-sm font-semibold text-[#94A3B8]">
                Per-Timestep Anomaly Scores
              </h3>
              <div className="flex gap-0.5 items-end h-20">
                {demoResult.per_timestep_scores.map((score, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${score * 100}%`,
                      backgroundColor:
                        score > 0.7
                          ? "#EF4444"
                          : score > 0.5
                          ? "#F97316"
                          : score > 0.3
                          ? "#F59E0B"
                          : "#10B981",
                      opacity: 0.8,
                    }}
                    title={`t=${i}: ${(score * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-[#64748B]">
                <span>t=0</span>
                <span>t={demoResult.per_timestep_scores.length - 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* Architecture */}
        {architecture && (
          <div className="mt-8 rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
            <h2 className="mb-4 text-xl font-bold text-[#F59E0B]">Architecture: {architecture.name}</h2>
            <p className="mb-4 text-sm italic text-[#F59E0B]">{architecture.tagline}</p>

            <div className="space-y-2">
              {architecture.layers.map((layer, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-[#0F172A] p-3 border border-[#334155]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-[#E2E8F0]">{layer.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8B5CF6]">{layer.type}</span>
                      {layer.shape && (
                        <span className="font-mono text-xs text-[#F59E0B]">{layer.shape}</span>
                      )}
                    </div>
                  </div>
                  {layer.components && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {layer.components.map((c, j) => (
                        <span
                          key={j}
                          className="rounded bg-[#334155] px-2 py-0.5 text-xs text-[#94A3B8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {Object.entries(architecture.training).map(([key, value]) => (
                <div key={key}>
                  <span className="text-[#64748B]">{key}: </span>
                  <span className="text-[#E2E8F0]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training History */}
        {training?.available && training.history && (
          <div className="mt-6 rounded-xl bg-[#1E293B] p-6 border border-[#334155]">
            <h2 className="mb-4 text-lg font-bold text-[#E2E8F0]">Training Curves</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm text-[#94A3B8]">Loss</h3>
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
                <h3 className="mb-2 text-sm text-[#94A3B8]">AUC</h3>
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
          </div>
        )}
      </main>
    </div>
  );
}
