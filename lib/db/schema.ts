import { sql } from "drizzle-orm";
import { boolean, customType, integer, jsonb, pgTable, real, serial, text, primaryKey } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const routineDayTypeValues = ["gym", "free_weights", "run", "swim", "walk", "rest"] as const;
export type RoutineDayType = (typeof routineDayTypeValues)[number];

export type WeeklySchedule = { days: RoutineDayType[] };

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  unitsWeight: text("units_weight", { enum: ["kg", "lb"] }).notNull().default("kg"),
  trainingDaysPerWeek: integer("training_days_per_week").notNull().default(4),
  timezone: text("timezone").notNull().default("UTC"),
  weeklySchedule: jsonb("weekly_schedule").$type<WeeklySchedule>(),
  defaultGymId: integer("default_gym_id").references(() => gyms.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  weight: real("weight"),
  bodyFatPct: real("body_fat_pct"),
  bmi: real("bmi"),
  skeletalMuscleMassKg: real("skeletal_muscle_mass_kg"),
  boneMassKg: real("bone_mass_kg"),
  bodyWaterPct: real("body_water_pct"),
  waistCm: real("waist_cm"),
  bodyFatMassKg: real("body_fat_mass_kg"),
  restingHeartRate: integer("resting_heart_rate"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  enduranceScore: integer("endurance_score"),
  activeCaloriesAvg4w: integer("active_calories_avg_4w"),
  stepsAvg4w: integer("steps_avg_4w"),
  notes: text("notes"),
  source: text("source", { enum: ["import", "manual"] }).notNull(),
  isDexaBaseline: boolean("is_dexa_baseline").notNull().default(false),
  extra: jsonb("extra").$type<Record<string, number | string>>(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export type StrengthTarget = { start: number; target: number; unit: "kg" | "lb" };

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  startWeight: real("start_weight"),
  targetWeight: real("target_weight"),
  startBodyFatPct: real("start_body_fat_pct"),
  targetBodyFatPct: real("target_body_fat_pct"),
  startWaistCm: real("start_waist_cm"),
  targetWaistCm: real("target_waist_cm"),
  primaryGoal: text("primary_goal"),
  secondaryGoal: text("secondary_goal"),
  strengthTargets: jsonb("strength_targets").$type<Record<string, StrengthTarget>>(),
  status: text("status", { enum: ["active", "completed", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().$type<"goal_review">(),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "cascade" }),
  speech: text("speech").notNull(),
  appData: jsonb("app_data").notNull().$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const gyms = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const gymZones = pgTable("gym_zones", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const equipmentCategoryValues = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "cardio",
  "band",
  "other",
] as const;
export type EquipmentCategory = (typeof equipmentCategoryValues)[number];

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: equipmentCategoryValues }).notNull(),
  notes: text("notes"),
  gymId: integer("gym_id").references(() => gyms.id, { onDelete: "set null" }),
  zoneId: integer("zone_id").references(() => gymZones.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const equipmentPhotos = pgTable("equipment_photos", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  photo: bytea("photo").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const movementPatternValues = [
  "squat",
  "hinge",
  "push",
  "pull",
  "carry",
  "core",
  "cardio",
] as const;
export type MovementPattern = (typeof movementPatternValues)[number];

export const muscleGroupValues = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "full_body",
] as const;
export type MuscleGroup = (typeof muscleGroupValues)[number];

export type SetsRepsScheme = {
  sets: number;
  repsLow: number;
  repsHigh: number;
  type: "strength" | "hypertrophy" | "conditioning";
};

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  movementPattern: text("movement_pattern", { enum: movementPatternValues }).notNull(),
  muscleGroup: text("muscle_group", { enum: muscleGroupValues }).notNull(),
  isCompound: boolean("is_compound").notNull().default(false),
  strengthTargetKey: text("strength_target_key"),
  defaultSetsRepsScheme: jsonb("default_sets_reps_scheme").$type<SetsRepsScheme>().notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const exerciseEquipment = pgTable(
  "exercise_equipment",
  {
    exerciseId: integer("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    equipmentCategory: text("equipment_category", { enum: equipmentCategoryValues }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.exerciseId, table.equipmentCategory] })]
);

export const generatorStrategyValues = ["rule-based", "claude"] as const;
export type GeneratorStrategy = (typeof generatorStrategyValues)[number];

export const trendStatusValues = ["ahead", "on_track", "behind"] as const;
export type TrendStatus = (typeof trendStatusValues)[number];

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").notNull(),
  weekStartDate: text("week_start_date").notNull(),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  gymId: integer("gym_id").references(() => gyms.id, { onDelete: "set null" }),
  generatorStrategy: text("generator_strategy", { enum: generatorStrategyValues }).notNull(),
  trendStatus: text("trend_status", { enum: trendStatusValues }).notNull(),
  rationale: text("rationale").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const routineDays = pgTable("routine_days", {
  id: serial("id").primaryKey(),
  routineId: integer("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  dayIndex: integer("day_index").notNull(),
  dayOfWeek: integer("day_of_week"),
  dayType: text("day_type", { enum: routineDayTypeValues }).notNull().default("gym"),
  zoneId: integer("zone_id").references(() => gymZones.id, { onDelete: "set null" }),
  focus: text("focus").notNull(),
  coachNote: text("coach_note"),
  completed: boolean("completed").notNull().default(false),
});

export const routineExercises = pgTable("routine_exercises", {
  id: serial("id").primaryKey(),
  routineDayId: integer("routine_day_id").notNull().references(() => routineDays.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
  sets: integer("sets").notNull(),
  repsLow: integer("reps_low").notNull(),
  repsHigh: integer("reps_high").notNull(),
  targetWeightKg: real("target_weight_kg"),
  restSeconds: integer("rest_seconds"),
  intensityNote: text("intensity_note"),
  notes: text("notes"),
  actualWeightKg: real("actual_weight_kg"),
  completed: boolean("completed").notNull().default(false),
});
