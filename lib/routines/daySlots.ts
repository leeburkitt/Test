import type { RoutineContext, ExerciseWithEquipment } from "@/lib/routines/types";
import type { RoutineDayType } from "@/lib/db/schema";
import { filterAvailableExercises } from "@/lib/routines/equipmentFilter";

export type DaySlot = {
  dayOfWeek: number; // 0=Mon..6=Sun
  dayType: Exclude<RoutineDayType, "rest">;
  zoneId?: number;
  zoneName?: string;
  /** Exercises available for this specific day — zone-scoped for 'gym', dumbbell-only for 'free_weights', empty for cardio types. */
  available: ExerciseWithEquipment[];
};

export function dayTypeLabel(dayType: RoutineDayType): string {
  switch (dayType) {
    case "run":
      return "Run";
    case "swim":
      return "Swim";
    case "walk":
      return "Walk";
    case "free_weights":
      return "Free Weights";
    default:
      return "Gym";
  }
}

/**
 * Walks the week's schedule in real Mon-Sun order, skipping rest days entirely, and assigns
 * each gym day a zone (round-robin across the selected gym's zones) so a single day's exercises
 * never span more than one zone. Shared between generators so both apply the exact same
 * day/zone assignment for a given schedule.
 */
export function buildDaySlots(ctx: RoutineContext): DaySlot[] {
  const slots: DaySlot[] = [];
  // Only real 'gym' (zone-scoped) days advance the round-robin — 'free_weights' days don't
  // consume a zone, so interleaving them must not skip zones for the surrounding gym days.
  let zoneRoundRobin = 0;

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayType = ctx.weeklySchedule.days[dayOfWeek];
    if (!dayType || dayType === "rest") continue;

    if (dayType === "run" || dayType === "swim" || dayType === "walk") {
      slots.push({ dayOfWeek, dayType, available: [] });
      continue;
    }

    let zoneId: number | undefined;
    if (dayType === "gym" && ctx.gymZones.length > 0) {
      zoneId = ctx.gymZones[zoneRoundRobin % ctx.gymZones.length].id;
      zoneRoundRobin++;
    }
    const zoneName = zoneId != null ? ctx.gymZones.find((z) => z.id === zoneId)?.name : undefined;

    const available = filterAvailableExercises(
      ctx.exerciseLibrary,
      ctx.equipment,
      dayType === "free_weights" ? { categoryOnly: "dumbbell" } : { zoneId }
    );

    slots.push({ dayOfWeek, dayType, zoneId, zoneName, available });
  }

  return slots;
}
