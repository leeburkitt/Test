"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/routines/trendAnalysis";

export function TrendLineChart({
  data,
  unit,
}: {
  data: ChartPoint[];
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Not enough data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis
          tick={{ fontSize: 12 }}
          domain={["auto", "auto"]}
          unit={unit ? ` ${unit}` : undefined}
          width={50}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="var(--color-chart-1, #2563eb)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expected"
          name="Target trajectory"
          stroke="var(--color-chart-2, #9ca3af)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
