"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  goals,
  metrics,
  equipment,
  exercises,
  exerciseEquipment,
  settings,
  gyms,
  gymZones,
  routines,
  routineDays,
  routineExercises,
} from "@/lib/db/schema";
import type { WeeklySchedule } from "@/lib/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { getRoutineGenerator } from "@/lib/routines/factory";
import { getWeekNumber, getMondayOfWeek } from "@/lib/routines/trendAnalysis";
import { weeklyScheduleSchema, routineDayProgressSchema } from "@/lib/validation/schemas";
import type { ExerciseWithEquipment } from "@/lib/routines/types";
import type { z } from "zod";

const DEFAULT_SCHEDULE: WeeklySchedule = { days: Array(7).fill("rest") };

async function loadPreviousExerciseWeights(goalId: number): Promise<Record<number, number>> {
  const [lastRoutine] = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, goalId))
    .orderBy(desc(routines.weekNumber))
    .limit(1);
  if (!lastRoutine) return {};

  const rows = await db
    .select({
      exerciseId: routineExercises.exerciseId,
      targetWeightKg: routineExercises.targetWeightKg,
      actualWeightKg: routineExercises.actualWeightKg,
    })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineExercises.routineDayId, routineDays.id))
    .where(eq(routineDays.routineId, lastRoutine.id));

  const weights: Record<number, number> = {};
  for (const row of rows) {
    // Prefer what was actually lifted over what was merely prescribed.
    const weight = row.actualWeightKg ?? row.targetWeightKg;
    if (weight != null) weights[row.exerciseId] = weight;
  }
  return weights;
}

async function loadExerciseLibrary(): Promise<ExerciseWithEquipment[]> {
  const [allExercises, allLinks] = await Promise.all([
    db.select().from(exercises),
    db.select().from(exerciseEquipment),
  ]);

  const categoriesByExercise = new Map<number, string[]>();
  for (const link of allLinks) {
    const list = categoriesByExercise.get(link.exerciseId) ?? [];
    list.push(link.equipmentCategory);
    categoriesByExercise.set(link.exerciseId, list);
  }

  return allExercises.map((ex) => ({
    ...ex,
    requiredCategories: categoriesByExercise.get(ex.id) ?? [],
  }));
}

async function resolveSelectedGymId(defaultGymId: number | null): Promise<number | null> {
  if (defaultGymId != null) return defaultGymId;
  const allGyms = await db.select({ id: gyms.id }).from(gyms);
  return allGyms.length === 1 ? allGyms[0].id : null;
}

export async function generateRoutineForCurrentWeek(): Promise<{ error?: string }> {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  if (!activeGoal) {
    return { error: "Set a 12-week goal before generating a routine." };
  }

  const [settingsRow] = await db.select().from(settings).limit(1);
  const trainingDaysPerWeek = settingsRow?.trainingDaysPerWeek ?? 4;
  const weeklySchedule = settingsRow?.weeklySchedule ?? DEFAULT_SCHEDULE;
  const selectedGymId = await resolveSelectedGymId(settingsRow?.defaultGymId ?? null);

  const today = new Date().toISOString().slice(0, 10);
  const weekNumber = getWeekNumber(activeGoal, today);
  const weekStartDate = getMondayOfWeek(today);

  const existing = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, activeGoal.id));
  const existingForWeek = existing.find((r) => r.weekNumber === weekNumber);
  if (existingForWeek) {
    return {};
  }

  const [recentMetrics, equipmentList, gymZonesList, exerciseLibrary, previousExerciseWeights] = await Promise.all([
    db.select().from(metrics).where(gte(metrics.date, activeGoal.startDate)),
    selectedGymId != null
      ? db.select().from(equipment).where(eq(equipment.gymId, selectedGymId))
      : db.select().from(equipment),
    selectedGymId != null
      ? db.select().from(gymZones).where(eq(gymZones.gymId, selectedGymId))
      : Promise.resolve([]),
    loadExerciseLibrary(),
    loadPreviousExerciseWeights(activeGoal.id),
  ]);

  const recentTrendStatuses = existing
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .slice(-3)
    .map((r) => r.trendStatus);

  const generator = getRoutineGenerator();
  const generated = await generator.generate({
    goal: activeGoal,
    recentMetrics,
    equipment: equipmentList,
    exerciseLibrary,
    weekNumber,
    trainingDaysPerWeek,
    recentTrendStatuses,
    previousExerciseWeights,
    weeklySchedule,
    selectedGymId,
    gymZones: gymZonesList,
  });

  const [insertedRoutine] = await db
    .insert(routines)
    .values({
      weekNumber: generated.weekNumber,
      weekStartDate,
      goalId: activeGoal.id,
      gymId: selectedGymId,
      generatorStrategy: process.env.ROUTINE_GENERATOR_STRATEGY === "claude" ? "claude" : "rule-based",
      trendStatus: generated.trendStatus,
      rationale: generated.rationale,
    })
    .returning({ id: routines.id });

  for (let dayIndex = 0; dayIndex < generated.days.length; dayIndex++) {
    const day = generated.days[dayIndex];
    const [insertedDay] = await db
      .insert(routineDays)
      .values({
        routineId: insertedRoutine.id,
        dayIndex,
        dayOfWeek: day.dayOfWeek,
        dayType: day.dayType,
        zoneId: day.zoneId ?? null,
        focus: day.focus,
        coachNote: day.coachNote ?? null,
      })
      .returning({ id: routineDays.id });

    for (let orderIndex = 0; orderIndex < day.exercises.length; orderIndex++) {
      const ex = day.exercises[orderIndex];
      await db.insert(routineExercises).values({
        routineDayId: insertedDay.id,
        exerciseId: ex.exerciseId,
        orderIndex,
        sets: ex.sets,
        repsLow: ex.repsLow,
        repsHigh: ex.repsHigh,
        targetWeightKg: ex.targetWeightKg ?? null,
        restSeconds: ex.restSeconds ?? null,
        intensityNote: ex.intensityNote ?? null,
        notes: ex.notes ?? null,
      });
    }
  }

  revalidatePath("/routine");
  return {};
}

export async function regenerateRoutineForCurrentWeek(): Promise<{ error?: string }> {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  if (!activeGoal) {
    return { error: "Set a 12-week goal before generating a routine." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekNumber = getWeekNumber(activeGoal, today);

  const existing = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, activeGoal.id));
  const existingForWeek = existing.find((r) => r.weekNumber === weekNumber);
  if (existingForWeek) {
    // routineDays/routineExercises cascade on delete.
    await db.delete(routines).where(eq(routines.id, existingForWeek.id));
  }

  return generateRoutineForCurrentWeek();
}

export type LogRoutineDayInput = z.infer<typeof routineDayProgressSchema>;

export async function logRoutineDay(input: LogRoutineDayInput): Promise<{ error?: string }> {
  const parsed = routineDayProgressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.transaction(async (tx) => {
    if (parsed.data.completed !== undefined) {
      await tx
        .update(routineDays)
        .set({ completed: parsed.data.completed })
        .where(eq(routineDays.id, parsed.data.dayId));
    }

    for (const entry of parsed.data.exercises ?? []) {
      await tx
        .update(routineExercises)
        .set({
          actualWeightKg: entry.actualWeightKg ?? null,
          completed: entry.completed,
        })
        .where(eq(routineExercises.id, entry.routineExerciseId));
    }
  });

  revalidatePath("/routine");
  return {};
}

export async function getRoutineHistory() {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  if (!activeGoal) return [];

  const routineRows = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, activeGoal.id))
    .orderBy(desc(routines.weekNumber));

  const result = [];
  for (const routine of routineRows) {
    const days = await db
      .select()
      .from(routineDays)
      .where(eq(routineDays.routineId, routine.id))
      .orderBy(routineDays.dayIndex);

    const daysWithExercises = [];
    for (const day of days) {
      const dayExercises = await db
        .select({
          id: routineExercises.id,
          sets: routineExercises.sets,
          repsLow: routineExercises.repsLow,
          repsHigh: routineExercises.repsHigh,
          targetWeightKg: routineExercises.targetWeightKg,
          restSeconds: routineExercises.restSeconds,
          intensityNote: routineExercises.intensityNote,
          actualWeightKg: routineExercises.actualWeightKg,
          completed: routineExercises.completed,
          exerciseName: exercises.name,
        })
        .from(routineExercises)
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(eq(routineExercises.routineDayId, day.id))
        .orderBy(routineExercises.orderIndex);

      daysWithExercises.push({ ...day, exercises: dayExercises });
    }

    result.push({ ...routine, days: daysWithExercises });
  }

  return result;
}
