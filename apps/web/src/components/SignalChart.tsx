"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignalChartProps {
  data: number[][];
  reconstruction?: number[][];
  anomalyScores?: number[];
  title?: string;
}

export default function SignalChart({
  data,
  reconstruction,
  anomalyScores,
  title,
}: SignalChartProps) {
  const LABELS = ["Heart Rate", "HRV", "Acceleration", "Skin Temp"];
  const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#8B5CF6"];

  const chartData = data.map((row, i) => {
    const point: Record<string, number> = { t: i };
    row.forEach((val, j) => {
      point[LABELS[j]] = parseFloat(val.toFixed(2));
    });
    if (reconstruction && reconstruction[i]) {
      reconstruction[i].forEach((val, j) => {
        point[`${LABELS[j]} (recon)`] = parseFloat(val.toFixed(2));
      });
    }
    if (anomalyScores) {
      point["Anomaly Score"] = parseFloat((anomalyScores[i] * 100).toFixed(1));
    }
    return point;
  });

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "pt-0" : "p-4"}>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="t" stroke="#64748B" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            {LABELS.map((label, i) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={COLORS[i]}
                strokeWidth={2}
                dot={false}
              />
            ))}

            {reconstruction &&
              LABELS.map((label, i) => (
                <Line
                  key={`${label}-recon`}
                  type="monotone"
                  dataKey={`${label} (recon)`}
                  stroke={COLORS[i]}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  opacity={0.6}
                />
              ))}

            {anomalyScores && (
              <Bar
                dataKey="Anomaly Score"
                fill="#EF4444"
                opacity={0.3}
                yAxisId="right"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
