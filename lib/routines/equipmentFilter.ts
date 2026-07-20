import type { Equipment, ExerciseWithEquipment } from "@/lib/routines/types";

function equipmentSatisfied(ex: ExerciseWithEquipment, availableCategories: Set<string>): boolean {
  return ex.requiredCategories.length === 0 || ex.requiredCategories.every((c) => availableCategories.has(c));
}

export function filterAvailableExercises(
  exerciseLibrary: ExerciseWithEquipment[],
  equipmentList: Equipment[]
): ExerciseWithEquipment[] {
  const availableCategories = new Set(equipmentList.map((e) => e.category));
  return exerciseLibrary.filter((ex) => equipmentSatisfied(ex, availableCategories));
}
