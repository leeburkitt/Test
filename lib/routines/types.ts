import type { InferSelectModel } from "drizzle-orm";
import type { goals, metrics, equipment, exercises, gyms, gymZones, coachMessages } from "@/lib/db/schema";
import type { TrendStatus } from "@/lib/db/schema";

export type Goal = InferSelectModel<typeof goals>;
export type Metric = InferSelectModel<typeof metrics>;
export type Equipment = InferSelectModel<typeof equipment>;
export type Exercise = InferSelectModel<typeof exercises>;
export type Gym = InferSelectModel<typeof gyms>;
export type GymZone = InferSelectModel<typeof gymZones>;
export type CoachMessage = InferSelectModel<typeof coachMessages>;

export type ExerciseWithEquipment = Exercise & { requiredCategories: string[] };

export type RoutineContext = {
  goal: Goal;
  recentMetrics: Metric[];
  equipment: Equipment[];
  exerciseLibrary: ExerciseWithEquipment[];
  weekNumber: number;
  trainingDaysPerWeek: number;
  recentTrendStatuses: TrendStatus[];
  /** exerciseId -> most recently prescribed weight (kg), for progressive overload. */
  previousExerciseWeights: Record<number, number>;
};

export type GeneratedExercise = {
  exerciseId: number;
  name: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  targetWeightKg?: number;
  intensityNote?: string;
  notes?: string;
};

export type GeneratedRoutineDay = {
  focus: string;
  exercises: GeneratedExercise[];
};

export type GeneratedRoutine = {
  weekNumber: number;
  trendStatus: TrendStatus;
  rationale: string;
  days: GeneratedRoutineDay[];
};

export interface RoutineGenerator {
  generate(ctx: RoutineContext): Promise<GeneratedRoutine>;
}
