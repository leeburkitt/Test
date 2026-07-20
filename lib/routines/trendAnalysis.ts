import type { Goal, Metric } from "@/lib/routines/types";
import type { TrendStatus } from "@/lib/db/schema";

export type SingleTrend = {
  key: string;
  label: string;
  start: number;
  target: number;
  expected: number;
  actual: number | null;
  unit?: string;
  status: TrendStatus;
  direction: "increase" | "decrease";
};

export type OverallTrend = {
  status: TrendStatus;
  trends: SingleTrend[];
};

const STATUS_SEVERITY: Record<TrendStatus, number> = {
  behind: 0,
  on_track: 1,
  ahead: 2,
};

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export type ChartPoint = { date: string; actual: number; expected: number };

export function buildChartSeries(
  goal: Pick<Goal, "startDate" | "endDate">,
  start: number,
  target: number,
  metricsForField: { date: string; value: number }[]
): ChartPoint[] {
  const totalDays = daysBetween(goal.startDate, goal.endDate);
  return metricsForField
    .filter((m) => m.date >= goal.startDate)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((m) => ({
      date: m.date,
      actual: m.value,
      expected: expectedValue(start, target, daysBetween(goal.startDate, m.date), totalDays),
    }));
}

export function getWeekNumber(goal: Pick<Goal, "startDate" | "endDate">, today: string): number {
  const elapsed = daysBetween(goal.startDate, today);
  return Math.min(12, Math.max(1, Math.ceil((elapsed + 1) / 7)));
}

function expectedValue(start: number, target: number, elapsedDays: number, totalDays: number): number {
  if (totalDays <= 0) return target;
  const ratio = Math.min(1, Math.max(0, elapsedDays / totalDays));
  return start + (target - start) * ratio;
}

function classify(actual: number, expected: number, start: number, target: number): TrendStatus {
  const direction: "increase" | "decrease" = target >= start ? "increase" : "decrease";
  const range = Math.abs(target - start);
  if (range === 0) return "on_track";

  const tolerance = 0.05 * range;
  const deviation = direction === "increase" ? actual - expected : expected - actual;

  if (deviation > tolerance) return "ahead";
  if (deviation < -tolerance) return "behind";
  return "on_track";
}

function smoothedRecent(
  metrics: Metric[],
  field: "weight" | "bodyFatPct" | "waistCm",
  windowDays = 14
): number | null {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const values = metrics
    .filter((m) => new Date(m.date).getTime() >= cutoff && m[field] != null)
    .map((m) => m[field] as number);

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function mostRecentExtra(metrics: Metric[], key: string): number | null {
  const sorted = [...metrics].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const m of sorted) {
    const value = m.extra?.[key];
    if (typeof value === "number") return value;
  }
  return null;
}

export function analyzeTrend(goal: Goal, recentMetrics: Metric[], today: string): OverallTrend {
  const elapsedDays = daysBetween(goal.startDate, today);
  const totalDays = daysBetween(goal.startDate, goal.endDate);
  const trends: SingleTrend[] = [];

  if (goal.startWeight != null && goal.targetWeight != null) {
    const actual = smoothedRecent(recentMetrics, "weight");
    const expected = expectedValue(goal.startWeight, goal.targetWeight, elapsedDays, totalDays);
    trends.push({
      key: "weight",
      label: "Weight",
      start: goal.startWeight,
      target: goal.targetWeight,
      expected,
      actual,
      unit: "kg",
      direction: goal.targetWeight >= goal.startWeight ? "increase" : "decrease",
      status: actual == null ? "on_track" : classify(actual, expected, goal.startWeight, goal.targetWeight),
    });
  }

  if (goal.startBodyFatPct != null && goal.targetBodyFatPct != null) {
    const actual = smoothedRecent(recentMetrics, "bodyFatPct");
    const expected = expectedValue(goal.startBodyFatPct, goal.targetBodyFatPct, elapsedDays, totalDays);
    trends.push({
      key: "bodyFatPct",
      label: "Body fat %",
      start: goal.startBodyFatPct,
      target: goal.targetBodyFatPct,
      expected,
      actual,
      unit: "%",
      direction: goal.targetBodyFatPct >= goal.startBodyFatPct ? "increase" : "decrease",
      status:
        actual == null ? "on_track" : classify(actual, expected, goal.startBodyFatPct, goal.targetBodyFatPct),
    });
  }

  if (goal.startWaistCm != null && goal.targetWaistCm != null) {
    const actual = smoothedRecent(recentMetrics, "waistCm");
    const expected = expectedValue(goal.startWaistCm, goal.targetWaistCm, elapsedDays, totalDays);
    trends.push({
      key: "waistCm",
      label: "Waist",
      start: goal.startWaistCm,
      target: goal.targetWaistCm,
      expected,
      actual,
      unit: "cm",
      direction: goal.targetWaistCm >= goal.startWaistCm ? "increase" : "decrease",
      status: actual == null ? "on_track" : classify(actual, expected, goal.startWaistCm, goal.targetWaistCm),
    });
  }

  for (const [key, target] of Object.entries(goal.strengthTargets ?? {})) {
    const actual = mostRecentExtra(recentMetrics, key);
    const expected = expectedValue(target.start, target.target, elapsedDays, totalDays);
    trends.push({
      key,
      label: key,
      start: target.start,
      target: target.target,
      expected,
      actual,
      unit: target.unit,
      direction: target.target >= target.start ? "increase" : "decrease",
      status: actual == null ? "on_track" : classify(actual, expected, target.start, target.target),
    });
  }

  const overallStatus =
    trends.length === 0
      ? "on_track"
      : trends.reduce<TrendStatus>(
          (worst, t) => (STATUS_SEVERITY[t.status] < STATUS_SEVERITY[worst] ? t.status : worst),
          "ahead"
        );

  return { status: overallStatus, trends };
}
