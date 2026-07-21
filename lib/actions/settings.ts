"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { weeklyScheduleSchema } from "@/lib/validation/schemas";
import { z } from "zod";

const settingsSchema = z.object({
  unitsWeight: z.enum(["kg", "lb"]),
  trainingDaysPerWeek: z.coerce.number().int().min(1).max(7),
});

export type SettingsFormState = { error?: string } | undefined;

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const parsed = settingsSchema.safeParse({
    unitsWeight: formData.get("unitsWeight"),
    trainingDaysPerWeek: formData.get("trainingDaysPerWeek"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .insert(settings)
    .values({
      id: 1,
      unitsWeight: parsed.data.unitsWeight,
      trainingDaysPerWeek: parsed.data.trainingDaysPerWeek,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        unitsWeight: parsed.data.unitsWeight,
        trainingDaysPerWeek: parsed.data.trainingDaysPerWeek,
      },
    });

  revalidatePath("/settings");
  revalidatePath("/routine");
  return undefined;
}

export type ScheduleFormState = { error?: string } | undefined;

export async function updateWeeklySchedule(
  _prevState: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const rawSchedule = formData.get("schedule");
  let scheduleInput: unknown;
  try {
    scheduleInput = JSON.parse(String(rawSchedule ?? ""));
  } catch {
    return { error: "Invalid schedule" };
  }

  const parsed = weeklyScheduleSchema.safeParse({
    days: (scheduleInput as { days?: unknown })?.days,
    gymId: formData.get("gymId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid schedule" };
  }

  await db
    .insert(settings)
    .values({
      id: 1,
      weeklySchedule: { days: parsed.data.days },
      defaultGymId: parsed.data.gymId ?? null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        weeklySchedule: { days: parsed.data.days },
        defaultGymId: parsed.data.gymId ?? null,
      },
    });

  revalidatePath("/routine");
  return undefined;
}
