import type { SingleTrend } from "@/lib/routines/trendAnalysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<SingleTrend["status"], string> = {
  ahead: "Ahead",
  on_track: "On track",
  behind: "Behind",
};

const STATUS_CLASS: Record<SingleTrend["status"], string> = {
  ahead: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  on_track: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  behind: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function ProgressIndicator({ trend }: { trend: SingleTrend }) {
  const progressPct =
    trend.target === trend.start
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            (((trend.actual ?? trend.start) - trend.start) / (trend.target - trend.start)) * 100
          )
        );

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{trend.label}</span>
        <Badge className={cn("border-none", STATUS_CLASS[trend.status])}>
          {STATUS_LABEL[trend.status]}
        </Badge>
      </div>
      <div className="text-muted-foreground text-xs">
        {trend.actual != null ? trend.actual.toFixed(1) : "—"} {trend.unit} (target {trend.target}{" "}
        {trend.unit})
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
