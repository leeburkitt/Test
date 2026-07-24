import type { RoutineContext, ExerciseWithEquipment, Equipment } from "@/lib/routines/types";
import type { RoutineDayType } from "@/lib/db/schema";
import { filterAvailableExercises, scopeEquipment } from "@/lib/routines/equipmentFilter";

export type DaySlot = {
  dayOfWeek: number; // 0=Mon..6=Sun
  dayType: Exclude<RoutineDayType, "rest">;
  zoneId?: number;
  zoneName?: string;
  /** Exercises available for this specific day — zone-scoped for 'gym', dumbbell-only for 'free_weights', empty for cardio types. */
  available: ExerciseWithEquipment[];
  /** The narrowed equipment pool itself (same scope as `available`) — used to match a specific machine to a chosen exercise. */
  scopedEquipment: Equipment[];
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

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "Monday · 20 Jul" — the real calendar date for a day, from the week's Monday anchor + offset. */
export function formatDayHeading(weekStartDate: string, dayOfWeek: number | null): string | null {
  if (dayOfWeek == null) return null;
  const date = new Date(`${weekStartDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOfWeek);
  const dateLabel = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${WEEKDAY_NAMES[dayOfWeek]} · ${dateLabel}`;
}

/** Zones that actually contain at least one piece of equipment in the given category — picking
 * only from these avoids assigning a free-weights day to a zone with no dumbbells at all. */
function zonesWithCategory(
  equipment: RoutineContext["equipment"],
  zones: RoutineContext["gymZones"],
  category: string
): RoutineContext["gymZones"] {
  const zoneIds = new Set(
    equipment.filter((e) => e.category === category && e.zoneId != null).map((e) => e.zoneId as number)
  );
  return zones.filter((z) => zoneIds.has(z.id));
}

/**
 * Walks the week's schedule in real Mon-Sun order, skipping rest days entirely, and assigns
 * each gym/free-weights day a single zone so a day's exercises never span more than one
 * physical part of the gym — mixing zones within a day makes for a bad in-gym experience,
 * walking back and forth between machines. 'gym' days round-robin across all zones;
 * 'free_weights' days round-robin only across zones that actually have dumbbells. Shared
 * between generators so both apply the exact same day/zone assignment for a given schedule.
 */
export function buildDaySlots(ctx: RoutineContext): DaySlot[] {
  const slots: DaySlot[] = [];
  let gymZoneRoundRobin = 0;
  let freeWeightsZoneRoundRobin = 0;
  const dumbbellZones = zonesWithCategory(ctx.equipment, ctx.gymZones, "dumbbell");

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayType = ctx.weeklySchedule.days[dayOfWeek];
    if (!dayType || dayType === "rest") continue;

    if (dayType === "run" || dayType === "swim" || dayType === "walk") {
      slots.push({ dayOfWeek, dayType, available: [], scopedEquipment: [] });
      continue;
    }

    let zoneId: number | undefined;
    if (dayType === "gym" && ctx.gymZones.length > 0) {
      zoneId = ctx.gymZones[gymZoneRoundRobin % ctx.gymZones.length].id;
      gymZoneRoundRobin++;
    } else if (dayType === "free_weights" && dumbbellZones.length > 0) {
      zoneId = dumbbellZones[freeWeightsZoneRoundRobin % dumbbellZones.length].id;
      freeWeightsZoneRoundRobin++;
    }
    const zoneName = zoneId != null ? ctx.gymZones.find((z) => z.id === zoneId)?.name : undefined;

    const scope = dayType === "free_weights" ? ({ zoneId, categoryOnly: "dumbbell" } as const) : { zoneId };
    const scopedEquipment = scopeEquipment(ctx.equipment, scope);
    const available = filterAvailableExercises(ctx.exerciseLibrary, ctx.equipment, scope);

    slots.push({ dayOfWeek, dayType, zoneId, zoneName, available, scopedEquipment });
  }

  return slots;
}
