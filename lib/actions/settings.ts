"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
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
