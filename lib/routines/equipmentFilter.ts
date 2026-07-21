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
export function filterAvailableExercises(
  exerciseLibrary: ExerciseWithEquipment[],
  equipmentList: Equipment[],
  scope?: { zoneId?: number; categoryOnly?: EquipmentCategory }
): ExerciseWithEquipment[] {
  let scoped = equipmentList;
  if (scope?.categoryOnly) {
    scoped = scoped.filter((e) => e.category === scope.categoryOnly);
  } else if (scope?.zoneId != null) {
    scoped = scoped.filter((e) => e.zoneId === scope.zoneId);
  }

  const availableCategories = new Set(scoped.map((e) => e.category));
  return exerciseLibrary.filter((ex) => equipmentSatisfied(ex, availableCategories));
}
