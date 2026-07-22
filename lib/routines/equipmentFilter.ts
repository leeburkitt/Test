import type { Equipment, ExerciseWithEquipment } from "@/lib/routines/types";
import type { EquipmentCategory } from "@/lib/db/schema";

function equipmentSatisfied(ex: ExerciseWithEquipment, availableCategories: Set<string>): boolean {
  return ex.requiredCategories.length === 0 || ex.requiredCategories.every((c) => availableCategories.has(c));
}

/**
 * `equipmentList` is expected to already be scoped to the week's selected gym (or all gyms,
 * if none selected). `scope` narrows further to a single day's session: one zone (gym days,
 * so the day never wanders between zones) or a single category regardless of zone
 * (free-weights days — dumbbell equipment anywhere in the gym).
 */
export function scopeEquipment(
  equipmentList: Equipment[],
  scope?: { zoneId?: number; categoryOnly?: EquipmentCategory }
): Equipment[] {
  if (scope?.categoryOnly) {
    return equipmentList.filter((e) => e.category === scope.categoryOnly);
  }
  if (scope?.zoneId != null) {
    return equipmentList.filter((e) => e.zoneId === scope.zoneId);
  }
  return equipmentList;
}

export function filterAvailableExercises(
  exerciseLibrary: ExerciseWithEquipment[],
  equipmentList: Equipment[],
  scope?: { zoneId?: number; categoryOnly?: EquipmentCategory }
): ExerciseWithEquipment[] {
  const scoped = scopeEquipment(equipmentList, scope);
  const availableCategories = new Set(scoped.map((e) => e.category));
  return exerciseLibrary.filter((ex) => equipmentSatisfied(ex, availableCategories));
}
