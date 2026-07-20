import Link from "next/link";
import { db } from "@/lib/db/client";
import { goals, metrics } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
import { desc, eq } from "drizzle-orm";
import { analyzeTrend, buildChartSeries, getWeekNumber } from "@/lib/routines/trendAnalysis";
import { ProgressIndicator } from "@/components/charts/ProgressIndicator";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { StatCard } from "@/components/charts/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Metric } from "@/lib/routines/types";

function latestNumber(rows: Metric[], key: keyof Metric): number | null {
  for (const m of rows) {
    const value = m[key];
    if (typeof value === "number") return value;
  }
  return null;
}

type Trend = {
  series: { date: string; value: number }[];
  latest: number | null;
  delta: number | null;
  sinceDate: string | null;
};

function trendFor(rowsAsc: Metric[], key: keyof Metric, baselineDate: string | null): Trend {
  const scoped = baselineDate ? rowsAsc.filter((m) => m.date >= baselineDate) : rowsAsc;
  const points = scoped
    .filter((m) => typeof m[key] === "number")
    .map((m) => ({ date: m.date, value: m[key] as number }));

  if (points.length === 0) {
    return { series: [], latest: null, delta: null, sinceDate: null };
  }

  const latest = points[points.length - 1].value;
  const first = points[0].value;
  const delta = points.length > 1 ? latest - first : null;

  return { series: points, latest, delta, sinceDate: points.length > 1 ? points[0].date : null };
}

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [[activeGoal], allMetricsDesc] = await Promise.all([
    db.select().from(goals).where(eq(goals.status, "active")).limit(1),
    db.select().from(metrics).orderBy(desc(metrics.date)),
  ]);

  const allMetricsAsc = [...allMetricsDesc].sort((a, b) => (a.date < b.date ? -1 : 1));
  const hasAnyData = allMetricsDesc.length > 0;

  const latestBaseline = allMetricsDesc.find((m) => m.isDexaBaseline);
  const baselineDate = latestBaseline?.date ?? null;

  const weightTrend = trendFor(allMetricsAsc, "weight", baselineDate);
  const bodyFatTrend = trendFor(allMetricsAsc, "bodyFatPct", baselineDate);
  const stepsTrend = trendFor(allMetricsAsc, "stepsAvg4w", baselineDate);
  const caloriesTrend = trendFor(allMetricsAsc, "activeCaloriesAvg4w", baselineDate);

  const goalMetrics = activeGoal ? allMetricsDesc.filter((m) => m.date >= activeGoal.startDate) : [];
  const trend = activeGoal ? analyzeTrend(activeGoal, goalMetrics, today) : null;

  const statTiles: { label: string; value: string }[] = [];
  const addStat = (label: string, value: number | null, unit = "") => {
    if (value != null) statTiles.push({ label, value: `${value}${unit}` });
  };
  addStat("BMI", latestNumber(allMetricsDesc, "bmi"));
  addStat("Body fat mass", latestNumber(allMetricsDesc, "bodyFatMassKg"), " kg");
  addStat("Skeletal muscle", latestNumber(allMetricsDesc, "skeletalMuscleMassKg"), " kg");
  addStat("Bone mass", latestNumber(allMetricsDesc, "boneMassKg"), " kg");
  addStat("Body water", latestNumber(allMetricsDesc, "bodyWaterPct"), "%");
  addStat("Waist", latestNumber(allMetricsDesc, "waistCm"), " cm");
  addStat("Resting HR", latestNumber(allMetricsDesc, "restingHeartRate"), " bpm");
  const bpRow = allMetricsDesc.find((m) => m.systolic != null && m.diastolic != null);
  if (bpRow) statTiles.push({ label: "Blood pressure", value: `${bpRow.systolic}/${bpRow.diastolic}` });
  addStat("Endurance score", latestNumber(allMetricsDesc, "enduranceScore"));

  const bodyCompositionData = allMetricsAsc
    .filter((m) => m.weight != null || m.skeletalMuscleMassKg != null || m.bodyFatMassKg != null)
    .map((m) => ({
      date: m.date,
      weight: m.weight ?? undefined,
      muscle: m.skeletalMuscleMassKg ?? undefined,
      fatMass: m.bodyFatMassKg ?? undefined,
    }));

  const heartRateData = allMetricsAsc
    .filter((m) => m.restingHeartRate != null)
    .map((m) => ({ date: m.date, hr: m.restingHeartRate as number }));

  const weightSeries =
    activeGoal?.startWeight != null && activeGoal?.targetWeight != null
      ? buildChartSeries(
          activeGoal,
          activeGoal.startWeight,
          activeGoal.targetWeight,
          goalMetrics.filter((m) => m.weight != null).map((m) => ({ date: m.date, value: m.weight! }))
        )
      : [];

  const bodyFatSeries =
    activeGoal?.startBodyFatPct != null && activeGoal?.targetBodyFatPct != null
      ? buildChartSeries(
          activeGoal,
          activeGoal.startBodyFatPct,
          activeGoal.targetBodyFatPct,
          goalMetrics.filter((m) => m.bodyFatPct != null).map((m) => ({ date: m.date, value: m.bodyFatPct! }))
        )
      : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        {activeGoal ? (
          <p className="text-sm text-muted-foreground">
            Week {getWeekNumber(activeGoal, today)} of 12 &middot; {activeGoal.startDate} → {activeGoal.endDate}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {baselineDate ? `Your progress since your last DEXA baseline (${baselineDate}).` : "Your progress since your last baseline."}
          </p>
        )}
      </div>

      {hasAnyData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Weight"
            value={weightTrend.latest != null ? `${weightTrend.latest.toFixed(1)} kg` : null}
            delta={weightTrend.delta}
            deltaUnit=" kg"
            sinceDate={weightTrend.sinceDate}
            color="var(--color-chart-1, #2a78d6)"
            series={weightTrend.series}
            axisPadding={5}
          />
          <StatCard
            label="Body fat %"
            value={bodyFatTrend.latest != null ? `${bodyFatTrend.latest.toFixed(1)}%` : null}
            delta={bodyFatTrend.delta}
            deltaUnit="%"
            sinceDate={bodyFatTrend.sinceDate}
            color="var(--color-chart-3, #eda100)"
            series={bodyFatTrend.series}
            axisPadding={5}
            axisMaxCeiling={100}
          />
          <StatCard
            label="Steps (avg/day, 4w)"
            value={stepsTrend.latest != null ? Math.round(stepsTrend.latest).toLocaleString() : null}
            delta={stepsTrend.delta}
            deltaDecimals={0}
            sinceDate={stepsTrend.sinceDate}
            color="var(--color-chart-2, #1baf7a)"
            series={stepsTrend.series}
            axisPadding={2000}
          />
          <StatCard
            label="Active cal (avg/day, 4w)"
            value={caloriesTrend.latest != null ? Math.round(caloriesTrend.latest).toLocaleString() : null}
            delta={caloriesTrend.delta}
            deltaDecimals={0}
            sinceDate={caloriesTrend.sinceDate}
            color="var(--color-chart-5, #4a3aa7)"
            series={caloriesTrend.series}
            axisPadding={100}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No data yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Log an entry or import your Garmin export to see your dashboard.
          </p>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/log" />}>
              Log an entry
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/import" />}>
              Import data
            </Button>
          </div>
        </div>
      )}

      {trend && trend.trends.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {trend.trends.map((t) => (
            <ProgressIndicator key={t.key} trend={t} />
          ))}
        </div>
      )}

      {weightSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight vs. target</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={weightSeries} unit="kg" />
          </CardContent>
        </Card>
      )}

      {bodyFatSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body fat % vs. target</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={bodyFatSeries} unit="%" />
          </CardContent>
        </Card>
      )}

      {statTiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statTiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-1 rounded-xl border p-3">
              <span className="text-xs text-muted-foreground">{tile.label}</span>
              <span className="text-lg font-medium tabular-nums">{tile.value}</span>
            </div>
          ))}
        </div>
      )}

      {bodyCompositionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body composition</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricLineChart
              data={bodyCompositionData}
              unit="kg"
              series={[
                { key: "weight", label: "Weight", color: "var(--color-chart-1, #2a78d6)" },
                { key: "muscle", label: "Skeletal muscle", color: "var(--color-chart-2, #1baf7a)" },
                { key: "fatMass", label: "Body fat mass", color: "var(--color-chart-3, #eda100)" },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {heartRateData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resting heart rate</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricLineChart
              data={heartRateData}
              unit="bpm"
              series={[{ key: "hr", label: "Resting HR", color: "var(--color-chart-1, #2a78d6)" }]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
