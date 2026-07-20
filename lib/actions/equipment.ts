"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { equipment, equipmentPhotos } from "@/lib/db/schema";
import { gymEquipmentSchema, equipmentEditSchema } from "@/lib/validation/schemas";
import { scanEquipmentLabel, scanEquipmentDescription, type ScannedLabel } from "@/lib/equipment/scanLabel";
import { eq } from "drizzle-orm";

export async function deleteEquipment(id: number): Promise<void> {
  await db.delete(equipment).where(eq(equipment.id, id));
  revalidatePath("/settings");
}

export type EquipmentEditFormState = { error?: string } | undefined;

export async function updateEquipment(
  _prevState: EquipmentEditFormState,
  formData: FormData
): Promise<EquipmentEditFormState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid equipment" };
  }

  const parsed = equipmentEditSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .update(equipment)
    .set({
      name: parsed.data.name,
      category: parsed.data.category,
      notes: parsed.data.notes || null,
    })
    .where(eq(equipment.id, id));

  revalidatePath("/settings");
  return undefined;
}

export async function scanEquipmentPhoto(formData: FormData): Promise<ScannedLabel> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No photo provided");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return scanEquipmentLabel(buffer.toString("base64"), file.type);
}

export async function scanEquipmentText(formData: FormData): Promise<ScannedLabel> {
  const description = formData.get("description");
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("No description provided");
  }
  return scanEquipmentDescription(description.trim());
}

export type GymEquipmentFormState = { error?: string } | undefined;

export async function createGymEquipment(
  _prevState: GymEquipmentFormState,
  formData: FormData
): Promise<GymEquipmentFormState> {
  const parsed = gymEquipmentSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    notes: formData.get("notes") || undefined,
    gymId: formData.get("gymId"),
    zoneId: formData.get("zoneId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("photo");
  const hasPhoto = file instanceof File && file.size > 0;

  const [row] = await db
    .insert(equipment)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      notes: parsed.data.notes || null,
      gymId: parsed.data.gymId,
      zoneId: parsed.data.zoneId,
    })
    .returning({ id: equipment.id });

  if (hasPhoto) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await db.insert(equipmentPhotos).values({
      equipmentId: row.id,
      photo: buffer,
      mimeType: file.type,
    });
  }

  revalidatePath("/settings");
  revalidatePath(`/gyms/${parsed.data.gymId}`);
  return undefined;
}
