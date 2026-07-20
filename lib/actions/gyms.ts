"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { gyms, gymZones } from "@/lib/db/schema";
import { gymSchema, gymZoneSchema } from "@/lib/validation/schemas";

export type GymFormState = { error?: string } | undefined;

export async function createGym(
  _prevState: GymFormState,
  formData: FormData
): Promise<GymFormState> {
  const parsed = gymSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.insert(gyms).values({ name: parsed.data.name });

  revalidatePath("/gyms");
  return undefined;
}

export async function createZone(
  _prevState: GymFormState,
  formData: FormData
): Promise<GymFormState> {
  const parsed = gymZoneSchema.safeParse({
    gymId: formData.get("gymId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.insert(gymZones).values({ gymId: parsed.data.gymId, name: parsed.data.name });

  revalidatePath(`/gyms/${parsed.data.gymId}`);
  return undefined;
}
