"use server";

import { db } from "@/lib/db/client";
import { metrics } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { reviewGoal, type GoalReview } from "@/lib/coach/reviewGoal";

export type ReviewGoalInput = {
  requestedTargetWeight: number | null;
  requestedTargetBodyFatPct: number | null;
  requestedTargetWaistCm: number | null;
};

export async function reviewGoalFeasibility(
  input: ReviewGoalInput
): Promise<GoalReview | { error: string }> {
  try {
    const [latestMetric] = await db.select().from(metrics).orderBy(desc(metrics.date)).limit(1);

    return await reviewGoal({
      currentWeight: latestMetric?.weight ?? null,
      currentBodyFatPct: latestMetric?.bodyFatPct ?? null,
      currentWaistCm: latestMetric?.waistCm ?? null,
      requestedTargetWeight: input.requestedTargetWeight,
      requestedTargetBodyFatPct: input.requestedTargetBodyFatPct,
      requestedTargetWaistCm: input.requestedTargetWaistCm,
    });
  } catch (err) {
    console.error("reviewGoalFeasibility failed:", err);
    return { error: err instanceof Error ? err.message : "Coach is unavailable right now" };
  }
}
