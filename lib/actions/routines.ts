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
  routines,
  routineDays,
  routineExercises,
} from "@/lib/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { getRoutineGenerator } from "@/lib/routines/factory";
import { getWeekNumber } from "@/lib/routines/trendAnalysis";
import type { ExerciseWithEquipment } from "@/lib/routines/types";

async function loadPreviousExerciseWeights(goalId: number): Promise<Record<number, number>> {
  const [lastRoutine] = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, goalId))
    .orderBy(desc(routines.weekNumber))
    .limit(1);
  if (!lastRoutine) return {};

  const rows = await db
    .select({ exerciseId: routineExercises.exerciseId, targetWeightKg: routineExercises.targetWeightKg })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineExercises.routineDayId, routineDays.id))
    .where(eq(routineDays.routineId, lastRoutine.id));

  const weights: Record<number, number> = {};
  for (const row of rows) {
    if (row.targetWeightKg != null) weights[row.exerciseId] = row.targetWeightKg;
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

export async function generateRoutineForCurrentWeek(): Promise<{ error?: string }> {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);
  if (!activeGoal) {
    return { error: "Set a 12-week goal before generating a routine." };
  }

  const [settingsRow] = await db.select().from(settings).limit(1);
  const trainingDaysPerWeek = settingsRow?.trainingDaysPerWeek ?? 4;

  const today = new Date().toISOString().slice(0, 10);
  const weekNumber = getWeekNumber(activeGoal, today);

  const existing = await db
    .select()
    .from(routines)
    .where(eq(routines.goalId, activeGoal.id));
  const existingForWeek = existing.find((r) => r.weekNumber === weekNumber);
  if (existingForWeek) {
    return {};
  }

  const [recentMetrics, equipmentList, exerciseLibrary, previousExerciseWeights] = await Promise.all([
    db.select().from(metrics).where(gte(metrics.date, activeGoal.startDate)),
    db.select().from(equipment),
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
  });

  const [insertedRoutine] = await db
    .insert(routines)
    .values({
      weekNumber: generated.weekNumber,
      weekStartDate: today,
      goalId: activeGoal.id,
      generatorStrategy: process.env.ROUTINE_GENERATOR_STRATEGY === "claude" ? "claude" : "rule-based",
      trendStatus: generated.trendStatus,
      rationale: generated.rationale,
    })
    .returning({ id: routines.id });

  for (let dayIndex = 0; dayIndex < generated.days.length; dayIndex++) {
    const day = generated.days[dayIndex];
    const [insertedDay] = await db
      .insert(routineDays)
      .values({ routineId: insertedRoutine.id, dayIndex, focus: day.focus })
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
        intensityNote: ex.intensityNote ?? null,
        notes: ex.notes ?? null,
      });
    }
  }

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
          intensityNote: routineExercises.intensityNote,
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
