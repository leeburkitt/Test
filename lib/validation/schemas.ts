import { z } from "zod";
import { equipmentCategoryValues, routineDayTypeValues } from "@/lib/db/schema";

export const gymEquipmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.enum(equipmentCategoryValues),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  gymId: z.coerce.number().int().positive(),
  zoneId: z.coerce.number().int().positive(),
});

export const equipmentEditSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.enum(equipmentCategoryValues),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const gymSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const gymZoneSchema = z.object({
  gymId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name is required").max(100),
});

const metricNumberFields = {
  bmi: z.coerce.number().positive().optional(),
  skeletalMuscleMassKg: z.coerce.number().positive().optional(),
  boneMassKg: z.coerce.number().positive().optional(),
  bodyWaterPct: z.coerce.number().min(0).max(100).optional(),
  waistCm: z.coerce.number().positive().optional(),
  bodyFatMassKg: z.coerce.number().positive().optional(),
  restingHeartRate: z.coerce.number().int().positive().optional(),
  systolic: z.coerce.number().int().positive().optional(),
  diastolic: z.coerce.number().int().positive().optional(),
  enduranceScore: z.coerce.number().int().positive().optional(),
  activeCaloriesAvg4w: z.coerce.number().int().positive().optional(),
  stepsAvg4w: z.coerce.number().int().positive().optional(),
};

export const metricEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  weight: z.coerce.number().positive().optional(),
  bodyFatPct: z.coerce.number().min(0).max(100).optional(),
  ...metricNumberFields,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  extra: z.record(z.string(), z.coerce.number()).optional(),
  isDexaBaseline: z.coerce.boolean().optional(),
});

export const strengthTargetInputSchema = z.object({
  key: z.string().trim().min(1),
  start: z.coerce.number(),
  target: z.coerce.number(),
  unit: z.enum(["kg", "lb"]),
});

export const goalSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeight: z.coerce.number().positive().optional(),
  targetBodyFatPct: z.coerce.number().min(0).max(100).optional(),
  targetWaistCm: z.coerce.number().positive().optional(),
  strengthTargets: z.array(strengthTargetInputSchema).optional(),
});

export const importedRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  ...metricNumberFields,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  extra: z.record(z.string(), z.number()).optional(),
});

export const importRowsSchema = z.array(importedRowSchema).min(1).max(5000);

export const weeklyScheduleSchema = z.object({
  days: z.array(z.enum(routineDayTypeValues)).length(7),
  gymId: z.coerce.number().int().positive().optional(),
});

export const routineDayProgressSchema = z.object({
  dayId: z.coerce.number().int().positive(),
  completed: z.coerce.boolean(),
});

export const logSetSchema = z.object({
  routineExerciseId: z.coerce.number().int().positive(),
  setIndex: z.coerce.number().int().min(0),
  weightKg: z.coerce.number().positive().optional(),
});
