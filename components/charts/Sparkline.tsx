"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatAxisNumber(value: number): string {
  return Number(value.toFixed(1)).toLocaleString();
}

export function Sparkline({
  data,
  color,
  padding = 0,
  minFloor = 0,
  maxCeiling,
}: {
  data: { date: string; value: number }[];
  color: string;
  /** How far above the highest reading and below the lowest reading the y-axis extends. */
  padding?: number;
  minFloor?: number;
  maxCeiling?: number;
}) {
  const gradientId = useId();

  if (data.length < 2) {
    return (
      <div className="flex h-28 items-center text-xs text-muted-foreground">Not enough data yet</div>
    );
  }

  const values = data.map((d) => d.value);
  const domainMin = Math.max(minFloor, Math.min(...values) - padding);
  const rawMax = Math.max(...values) + padding;
  const domainMax = maxCeiling != null ? Math.min(maxCeiling, rawMax) : rawMax;

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={formatShortDate}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fontSize: 10 }}
            tickFormatter={formatAxisNumber}
            width={38}
            tickCount={4}
            axisLine={false}
            tickLine={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
