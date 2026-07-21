import type { InferSelectModel } from "drizzle-orm";
import type { goals, metrics, equipment, exercises, gyms, gymZones, coachMessages } from "@/lib/db/schema";
import type { TrendStatus, RoutineDayType, WeeklySchedule } from "@/lib/db/schema";

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
  /** exerciseId -> most recently prescribed (or actually lifted) weight (kg), for progressive overload. */
  previousExerciseWeights: Record<number, number>;
  weeklySchedule: WeeklySchedule;
  selectedGymId: number | null;
  /** Zones belonging to selectedGymId only (empty if no gym selected). */
  gymZones: GymZone[];
};

export type GeneratedExercise = {
  exerciseId: number;
  name: string;
  sets: number;
  repsLow: number;
  repsHigh: number;
  targetWeightKg?: number;
  restSeconds?: number;
  intensityNote?: string;
  notes?: string;
};

export type GeneratedRoutineDay = {
  focus: string;
  dayOfWeek: number;
  dayType: RoutineDayType;
  zoneId?: number;
  coachNote?: string;
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
