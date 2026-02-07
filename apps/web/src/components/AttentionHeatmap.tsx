"use client";

interface AttentionHeatmapProps {
  data: number[][];
  title?: string;
}

export default function AttentionHeatmap({ data, title }: AttentionHeatmapProps) {
  if (!data || data.length === 0) return null;

  const rows = data.length;
  const cols = data[0]?.length || 0;
  const cellSize = Math.min(8, Math.floor(600 / Math.max(rows, cols)));

  const maxVal = Math.max(...data.flat());
  const minVal = Math.min(...data.flat());
  const range = maxVal - minVal || 1;

  function getColor(val: number): string {
    const norm = (val - minVal) / range;
    if (norm < 0.25) {
      const t = norm / 0.25;
      return `rgb(${Math.round(15 + t * 15)}, ${Math.round(23 + t * 20)}, ${Math.round(42 + t * 40)})`;
    } else if (norm < 0.5) {
      const t = (norm - 0.25) / 0.25;
      return `rgb(${Math.round(30 + t * 70)}, ${Math.round(43 + t * 40)}, ${Math.round(82 - t * 30)})`;
    } else if (norm < 0.75) {
      const t = (norm - 0.5) / 0.25;
      return `rgb(${Math.round(100 + t * 145)}, ${Math.round(83 + t * 75)}, ${Math.round(52 - t * 41)})`;
    } else {
      const t = (norm - 0.75) / 0.25;
      return `rgb(${Math.round(245)}, ${Math.round(158 - t * 50)}, ${Math.round(11 + t * 10)})`;
    }
  }

  return (
    <div className="rounded-xl bg-[#1E293B] p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-[#94A3B8]">{title}</h3>}
      <div className="overflow-auto">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gap: 1,
          }}
        >
          {data.map((row, i) =>
            row.map((val, j) => (
              <div
                key={`${i}-${j}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getColor(val),
                  borderRadius: 1,
                }}
                title={`[${i},${j}]: ${val.toFixed(4)}`}
              />
            ))
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]">
        <span>Low attention</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 8,
                backgroundColor: getColor(minVal + (i / 19) * range),
              }}
            />
          ))}
        </div>
        <span>High attention</span>
      </div>
    </div>
  );
}
