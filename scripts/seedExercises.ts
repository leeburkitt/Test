import { config } from "dotenv";
config({ path: ".env.local" });

import type {
  EquipmentCategory,
  MovementPattern,
  MuscleGroup,
  SetsRepsScheme,
} from "@/lib/db/schema";

type SeedExercise = {
  name: string;
  movementPattern: MovementPattern;
  muscleGroup: MuscleGroup;
  isCompound: boolean;
  strengthTargetKey?: string;
  scheme: SetsRepsScheme;
  requiredCategories: EquipmentCategory[];
};

const strength = (sets: number, repsLow: number, repsHigh: number): SetsRepsScheme => ({
  sets,
  repsLow,
  repsHigh,
  type: "strength",
});
const hypertrophy = (sets: number, repsLow: number, repsHigh: number): SetsRepsScheme => ({
  sets,
  repsLow,
  repsHigh,
  type: "hypertrophy",
});
const conditioning = (sets: number, repsLow: number, repsHigh: number): SetsRepsScheme => ({
  sets,
  repsLow,
  repsHigh,
  type: "conditioning",
});

const SEED_EXERCISES: SeedExercise[] = [
  // Squat pattern
  { name: "Barbell Back Squat", movementPattern: "squat", muscleGroup: "legs", isCompound: true, strengthTargetKey: "squat", scheme: strength(4, 4, 6), requiredCategories: ["barbell"] },
  { name: "Leg Press", movementPattern: "squat", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["machine"] },
  { name: "Goblet Squat", movementPattern: "squat", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Bulgarian Split Squat", movementPattern: "squat", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Bodyweight Squat", movementPattern: "squat", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 12, 20), requiredCategories: [] },
  { name: "Band Squat", movementPattern: "squat", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 12, 20), requiredCategories: ["band"] },

  // Hinge pattern
  { name: "Barbell Deadlift", movementPattern: "hinge", muscleGroup: "legs", isCompound: true, strengthTargetKey: "deadlift", scheme: strength(3, 3, 5), requiredCategories: ["barbell"] },
  { name: "Romanian Deadlift", movementPattern: "hinge", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 6, 10), requiredCategories: ["barbell"] },
  { name: "Dumbbell Romanian Deadlift", movementPattern: "hinge", muscleGroup: "legs", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Machine Back Extension", movementPattern: "hinge", muscleGroup: "back", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["machine"] },
  { name: "Kettlebell Swing", movementPattern: "hinge", muscleGroup: "full_body", isCompound: true, scheme: conditioning(3, 12, 20), requiredCategories: ["dumbbell"] },

  // Horizontal push
  { name: "Barbell Bench Press", movementPattern: "push", muscleGroup: "chest", isCompound: true, strengthTargetKey: "bench", scheme: strength(4, 4, 6), requiredCategories: ["barbell"] },
  { name: "Dumbbell Bench Press", movementPattern: "push", muscleGroup: "chest", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Machine Chest Press", movementPattern: "push", muscleGroup: "chest", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["machine"] },
  { name: "Cable Chest Fly", movementPattern: "push", muscleGroup: "chest", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["cable"] },
  { name: "Push-Up", movementPattern: "push", muscleGroup: "chest", isCompound: true, scheme: hypertrophy(3, 10, 20), requiredCategories: [] },

  // Vertical push
  { name: "Barbell Overhead Press", movementPattern: "push", muscleGroup: "shoulders", isCompound: true, strengthTargetKey: "overhead_press", scheme: strength(4, 4, 6), requiredCategories: ["barbell"] },
  { name: "Dumbbell Shoulder Press", movementPattern: "push", muscleGroup: "shoulders", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Machine Shoulder Press", movementPattern: "push", muscleGroup: "shoulders", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["machine"] },
  { name: "Pike Push-Up", movementPattern: "push", muscleGroup: "shoulders", isCompound: true, scheme: hypertrophy(3, 8, 15), requiredCategories: [] },
  { name: "Band Face Pull", movementPattern: "pull", muscleGroup: "shoulders", isCompound: false, scheme: hypertrophy(3, 12, 20), requiredCategories: ["band"] },

  // Horizontal pull
  { name: "Barbell Row", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 6, 10), requiredCategories: ["barbell"] },
  { name: "Dumbbell Row", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Seated Cable Row", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["cable"] },
  { name: "Machine Row", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["machine"] },
  { name: "Inverted Row", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 8, 15), requiredCategories: [] },
  { name: "Band Pull-Apart", movementPattern: "pull", muscleGroup: "shoulders", isCompound: false, scheme: hypertrophy(3, 15, 25), requiredCategories: ["band"] },

  // Vertical pull
  { name: "Pull-Up", movementPattern: "pull", muscleGroup: "back", isCompound: true, strengthTargetKey: "pullup", scheme: strength(4, 4, 8), requiredCategories: [] },
  { name: "Lat Pulldown", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 8, 12), requiredCategories: ["cable"] },
  { name: "Assisted Pull-Up Machine", movementPattern: "pull", muscleGroup: "back", isCompound: true, scheme: hypertrophy(3, 6, 10), requiredCategories: ["machine"] },

  // Arms
  { name: "Barbell Curl", movementPattern: "pull", muscleGroup: "arms", isCompound: false, scheme: hypertrophy(3, 8, 12), requiredCategories: ["barbell"] },
  { name: "Dumbbell Curl", movementPattern: "pull", muscleGroup: "arms", isCompound: false, scheme: hypertrophy(3, 8, 12), requiredCategories: ["dumbbell"] },
  { name: "Cable Tricep Pushdown", movementPattern: "push", muscleGroup: "arms", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["cable"] },
  { name: "Dumbbell Tricep Extension", movementPattern: "push", muscleGroup: "arms", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["dumbbell"] },
  { name: "Dip", movementPattern: "push", muscleGroup: "arms", isCompound: true, scheme: hypertrophy(3, 8, 15), requiredCategories: [] },

  // Core
  { name: "Plank", movementPattern: "core", muscleGroup: "core", isCompound: false, scheme: conditioning(3, 30, 60), requiredCategories: [] },
  { name: "Hanging Leg Raise", movementPattern: "core", muscleGroup: "core", isCompound: false, scheme: hypertrophy(3, 8, 15), requiredCategories: [] },
  { name: "Cable Woodchop", movementPattern: "core", muscleGroup: "core", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["cable"] },
  { name: "Machine Ab Crunch", movementPattern: "core", muscleGroup: "core", isCompound: false, scheme: hypertrophy(3, 10, 15), requiredCategories: ["machine"] },

  // Carry / full body
  { name: "Farmer's Carry", movementPattern: "carry", muscleGroup: "full_body", isCompound: true, scheme: conditioning(3, 20, 40), requiredCategories: ["dumbbell"] },

  // Cardio
  { name: "Treadmill Run", movementPattern: "cardio", muscleGroup: "full_body", isCompound: false, scheme: conditioning(1, 15, 30), requiredCategories: ["cardio"] },
  { name: "Rowing Machine", movementPattern: "cardio", muscleGroup: "full_body", isCompound: false, scheme: conditioning(1, 10, 20), requiredCategories: ["cardio"] },
  { name: "Stationary Bike", movementPattern: "cardio", muscleGroup: "full_body", isCompound: false, scheme: conditioning(1, 15, 30), requiredCategories: ["cardio"] },
  { name: "Jump Rope", movementPattern: "cardio", muscleGroup: "full_body", isCompound: false, scheme: conditioning(3, 1, 3), requiredCategories: [] },
];

async function main() {
  const { db } = await import("@/lib/db/client");
  const { exercises, exerciseEquipment } = await import("@/lib/db/schema");

  console.log(`Seeding ${SEED_EXERCISES.length} exercises...`);

  for (const ex of SEED_EXERCISES) {
    const [inserted] = await db
      .insert(exercises)
      .values({
        name: ex.name,
        movementPattern: ex.movementPattern,
        muscleGroup: ex.muscleGroup,
        isCompound: ex.isCompound,
        strengthTargetKey: ex.strengthTargetKey ?? null,
        defaultSetsRepsScheme: ex.scheme,
      })
      .returning({ id: exercises.id });

    if (ex.requiredCategories.length > 0) {
      await db.insert(exerciseEquipment).values(
        ex.requiredCategories.map((category) => ({
          exerciseId: inserted.id,
          equipmentCategory: category,
        }))
      );
    }
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
