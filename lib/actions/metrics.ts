"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { metrics } from "@/lib/db/schema";
import { metricEntrySchema, importRowsSchema } from "@/lib/validation/schemas";
import { sql } from "drizzle-orm";
import type { z } from "zod";

export type MetricFormState = { error?: string; success?: boolean } | undefined;

export async function logMetric(
  _prevState: MetricFormState,
  formData: FormData
): Promise<MetricFormState> {
  const extra: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("extra_") && typeof value === "string" && value.trim() !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        extra[key.slice("extra_".length)] = num;
      }
    }
  }

  const customKeys = formData.getAll("customKey");
  const customValues = formData.getAll("customValue");
  customKeys.forEach((rawKey, i) => {
    const key = String(rawKey).trim();
    const rawValue = customValues[i];
    if (!key || rawValue === undefined || rawValue === "") return;
    const num = Number(rawValue);
    if (!Number.isNaN(num)) {
      extra[key] = num;
    }
  });

  const parsed = metricEntrySchema.safeParse({
    date: formData.get("date"),
    weight: formData.get("weight") || undefined,
    bodyFatPct: formData.get("bodyFatPct") || undefined,
    bmi: formData.get("bmi") || undefined,
    skeletalMuscleMassKg: formData.get("skeletalMuscleMassKg") || undefined,
    boneMassKg: formData.get("boneMassKg") || undefined,
    bodyWaterPct: formData.get("bodyWaterPct") || undefined,
    waistCm: formData.get("waistCm") || undefined,
    bodyFatMassKg: formData.get("bodyFatMassKg") || undefined,
    restingHeartRate: formData.get("restingHeartRate") || undefined,
    systolic: formData.get("systolic") || undefined,
    diastolic: formData.get("diastolic") || undefined,
    enduranceScore: formData.get("enduranceScore") || undefined,
    activeCaloriesAvg4w: formData.get("activeCaloriesAvg4w") || undefined,
    stepsAvg4w: formData.get("stepsAvg4w") || undefined,
    notes: formData.get("notes") || undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
    isDexaBaseline: formData.get("isDexaBaseline") ? true : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const fields = {
    weight: parsed.data.weight ?? null,
    bodyFatPct: parsed.data.bodyFatPct ?? null,
    bmi: parsed.data.bmi ?? null,
    skeletalMuscleMassKg: parsed.data.skeletalMuscleMassKg ?? null,
    boneMassKg: parsed.data.boneMassKg ?? null,
    bodyWaterPct: parsed.data.bodyWaterPct ?? null,
    waistCm: parsed.data.waistCm ?? null,
    bodyFatMassKg: parsed.data.bodyFatMassKg ?? null,
    restingHeartRate: parsed.data.restingHeartRate ?? null,
    systolic: parsed.data.systolic ?? null,
    diastolic: parsed.data.diastolic ?? null,
    enduranceScore: parsed.data.enduranceScore ?? null,
    activeCaloriesAvg4w: parsed.data.activeCaloriesAvg4w ?? null,
    stepsAvg4w: parsed.data.stepsAvg4w ?? null,
    notes: parsed.data.notes || null,
    extra: parsed.data.extra ?? null,
    source: "manual" as const,
    isDexaBaseline: parsed.data.isDexaBaseline ?? false,
  };

  await db
    .insert(metrics)
    .values({ date: parsed.data.date, ...fields })
    .onConflictDoUpdate({
      target: metrics.date,
      set: fields,
    });

  revalidatePath("/log");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function importMetrics(
  rows: z.infer<typeof importRowsSchema>
): Promise<{ imported: number }> {
  const parsed = importRowsSchema.parse(rows);

  for (const row of parsed) {
    await db
      .insert(metrics)
      .values({
        date: row.date,
        weight: row.weight ?? null,
        bodyFatPct: row.bodyFatPct ?? null,
        bmi: row.bmi ?? null,
        skeletalMuscleMassKg: row.skeletalMuscleMassKg ?? null,
        boneMassKg: row.boneMassKg ?? null,
        bodyWaterPct: row.bodyWaterPct ?? null,
        waistCm: row.waistCm ?? null,
        bodyFatMassKg: row.bodyFatMassKg ?? null,
        restingHeartRate: row.restingHeartRate ?? null,
        systolic: row.systolic ?? null,
        diastolic: row.diastolic ?? null,
        enduranceScore: row.enduranceScore ?? null,
        activeCaloriesAvg4w: row.activeCaloriesAvg4w ?? null,
        stepsAvg4w: row.stepsAvg4w ?? null,
        notes: row.notes || null,
        extra: row.extra ?? null,
        source: "import",
      })
      .onConflictDoUpdate({
        target: metrics.date,
        set: {
          weight: sql`excluded.weight`,
          bodyFatPct: sql`excluded.body_fat_pct`,
          bmi: sql`excluded.bmi`,
          skeletalMuscleMassKg: sql`excluded.skeletal_muscle_mass_kg`,
          boneMassKg: sql`excluded.bone_mass_kg`,
          bodyWaterPct: sql`excluded.body_water_pct`,
          waistCm: sql`excluded.waist_cm`,
          bodyFatMassKg: sql`excluded.body_fat_mass_kg`,
          restingHeartRate: sql`excluded.resting_heart_rate`,
          systolic: sql`excluded.systolic`,
          diastolic: sql`excluded.diastolic`,
          enduranceScore: sql`excluded.endurance_score`,
          activeCaloriesAvg4w: sql`excluded.active_calories_avg_4w`,
          stepsAvg4w: sql`excluded.steps_avg_4w`,
          notes: sql`excluded.notes`,
          extra: sql`excluded.extra`,
          source: "import",
        },
      });
  }

  revalidatePath("/log");
  revalidatePath("/dashboard");
  return { imported: parsed.length };
}
