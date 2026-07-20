import { Sparkline } from "@/components/charts/Sparkline";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function StatCard({
  label,
  value,
  delta,
  deltaUnit = "",
  deltaDecimals = 1,
  sinceDate,
  color,
  series,
  axisPadding = 0,
  axisMinFloor = 0,
  axisMaxCeiling,
}: {
  label: string;
  value: string | null;
  delta: number | null;
  deltaUnit?: string;
  deltaDecimals?: number;
  sinceDate: string | null;
  color: string;
  series: { date: string; value: number }[];
  axisPadding?: number;
  axisMinFloor?: number;
  axisMaxCeiling?: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {value != null ? (
          <span className="text-2xl font-semibold tabular-nums leading-tight">{value}</span>
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground/60">—</span>
        )}
        <span className="text-xs text-muted-foreground">
          {delta != null && sinceDate ? (
            <>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(deltaDecimals)}
              {deltaUnit} since {formatShortDate(sinceDate)}
            </>
          ) : value != null ? (
            "No trend yet"
          ) : (
            "No data yet"
          )}
        </span>
      </div>
      <Sparkline
        data={series}
        color={color}
        padding={axisPadding}
        minFloor={axisMinFloor}
        maxCeiling={axisMaxCeiling}
      />
    </div>
  );
}
