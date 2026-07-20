"use server";

import { revalidatePath } from "next/cache";
import { addWeeks, format } from "date-fns";
import { db } from "@/lib/db/client";
import { goals, metrics, coachMessages, type StrengthTarget } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { goalSchema } from "@/lib/validation/schemas";

export type GoalFormState = { error?: string } | undefined;

export async function createGoal(
  _prevState: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const strengthTargetKeys = formData.getAll("strengthKey");
  const strengthTargetStarts = formData.getAll("strengthStart");
  const strengthTargetTargets = formData.getAll("strengthTarget");
  const strengthTargetUnits = formData.getAll("strengthUnit");

  const strengthTargets: { key: string; start: number; target: number; unit: "kg" | "lb" }[] = [];
  strengthTargetKeys.forEach((rawKey, i) => {
    const key = String(rawKey).trim();
    const start = Number(strengthTargetStarts[i]);
    const target = Number(strengthTargetTargets[i]);
    const unit = strengthTargetUnits[i] === "lb" ? "lb" : "kg";
    if (key && !Number.isNaN(start) && !Number.isNaN(target)) {
      strengthTargets.push({ key, start, target, unit });
    }
  });

  const parsed = goalSchema.safeParse({
    startDate: formData.get("startDate"),
    targetWeight: formData.get("targetWeight") || undefined,
    targetBodyFatPct: formData.get("targetBodyFatPct") || undefined,
    targetWaistCm: formData.get("targetWaistCm") || undefined,
    strengthTargets,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [latestMetric] = await db.select().from(metrics).orderBy(desc(metrics.date)).limit(1);

  const strengthTargetsRecord: Record<string, StrengthTarget> = {};
  for (const t of parsed.data.strengthTargets ?? []) {
    strengthTargetsRecord[t.key] = { start: t.start, target: t.target, unit: t.unit };
  }

  const startDate = parsed.data.startDate;
  const endDate = format(addWeeks(new Date(startDate), 12), "yyyy-MM-dd");

  await db.update(goals).set({ status: "archived" }).where(eq(goals.status, "active"));

  const primaryGoal = formData.get("primaryGoal");
  const secondaryGoal = formData.get("secondaryGoal");
  const coachSpeech = formData.get("coachSpeech");
  const coachAppData = formData.get("coachAppData");

  const [insertedGoal] = await db
    .insert(goals)
    .values({
      startDate,
      endDate,
      startWeight: latestMetric?.weight ?? null,
      targetWeight: parsed.data.targetWeight ?? null,
      startBodyFatPct: latestMetric?.bodyFatPct ?? null,
      targetBodyFatPct: parsed.data.targetBodyFatPct ?? null,
      startWaistCm: latestMetric?.waistCm ?? null,
      targetWaistCm: parsed.data.targetWaistCm ?? null,
      primaryGoal: typeof primaryGoal === "string" && primaryGoal ? primaryGoal : null,
      secondaryGoal: typeof secondaryGoal === "string" && secondaryGoal ? secondaryGoal : null,
      strengthTargets: Object.keys(strengthTargetsRecord).length > 0 ? strengthTargetsRecord : null,
      status: "active",
    })
    .returning({ id: goals.id });

  if (typeof coachSpeech === "string" && coachSpeech && typeof coachAppData === "string" && coachAppData) {
    await db.insert(coachMessages).values({
      kind: "goal_review",
      goalId: insertedGoal.id,
      speech: coachSpeech,
      appData: JSON.parse(coachAppData),
    });
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/log");
  return undefined;
}

export async function archiveGoal(id: number): Promise<void> {
  await db.update(goals).set({ status: "archived" }).where(eq(goals.id, id));
  revalidatePath("/goals");
}
