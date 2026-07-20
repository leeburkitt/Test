import type {
  RoutineGenerator,
  RoutineContext,
  GeneratedRoutine,
  GeneratedRoutineDay,
  GeneratedExercise,
  ExerciseWithEquipment,
} from "@/lib/routines/types";
import type { MovementPattern, TrendStatus } from "@/lib/db/schema";
import { analyzeTrend } from "@/lib/routines/trendAnalysis";
import { filterAvailableExercises } from "@/lib/routines/equipmentFilter";

const DAY_SPLITS: Record<number, string[]> = {
  1: ["Full Body"],
  2: ["Full Body", "Full Body"],
  3: ["Push", "Pull", "Legs"],
  4: ["Upper", "Lower", "Upper", "Lower"],
  5: ["Push", "Pull", "Legs", "Upper", "Lower"],
  6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
};

const FOCUS_MOVEMENT_PATTERNS: Record<string, MovementPattern[]> = {
  "Full Body": ["squat", "hinge", "push", "pull", "carry"],
  Push: ["push"],
  Pull: ["pull"],
  Legs: ["squat", "hinge", "carry"],
  Upper: ["push", "pull"],
  Lower: ["squat", "hinge", "carry"],
};

function dayFocusPlan(trainingDaysPerWeek: number): string[] {
  const clamped = Math.min(6, Math.max(1, trainingDaysPerWeek));
  return DAY_SPLITS[clamped];
}

export class RuleBasedRoutineGenerator implements RoutineGenerator {
  async generate(ctx: RoutineContext): Promise<GeneratedRoutine> {
    const today = new Date().toISOString().slice(0, 10);
    const trend = analyzeTrend(ctx.goal, ctx.recentMetrics, today);

    const available = filterAvailableExercises(ctx.exerciseLibrary, ctx.equipment);

    const deloadWeek =
      ctx.recentTrendStatuses.length >= 3 &&
      ctx.recentTrendStatuses.slice(-3).every((s: TrendStatus) => s === "behind");

    const focuses = dayFocusPlan(ctx.trainingDaysPerWeek);
    const coreExercises = available.filter((ex) => ex.movementPattern === "core");
    const cardioExercises = available.filter((ex) => ex.movementPattern === "cardio");

    const usedAccessoryIds = new Set<number>();
    const days: GeneratedRoutineDay[] = focuses.map((focus, dayIndex) =>
      this.buildDay({
        focus,
        dayIndex,
        available,
        coreExercises,
        cardioExercises,
        ctx,
        trend,
        deloadWeek,
        usedAccessoryIds,
      })
    );

    return {
      weekNumber: ctx.weekNumber,
      trendStatus: trend.status,
      rationale: this.buildRationale(trend, deloadWeek),
      days,
    };
  }

  private buildDay(params: {
    focus: string;
    dayIndex: number;
    available: ExerciseWithEquipment[];
    coreExercises: ExerciseWithEquipment[];
    cardioExercises: ExerciseWithEquipment[];
    ctx: RoutineContext;
    trend: ReturnType<typeof analyzeTrend>;
    deloadWeek: boolean;
    usedAccessoryIds: Set<number>;
  }): GeneratedRoutineDay {
    const { focus, dayIndex, available, coreExercises, cardioExercises, ctx, trend, deloadWeek, usedAccessoryIds } =
      params;

    const patterns = FOCUS_MOVEMENT_PATTERNS[focus] ?? [];
    const candidates = available.filter((ex) => patterns.includes(ex.movementPattern));

    const exercises: GeneratedExercise[] = [];
    const addedIds = new Set<number>();

    const addExercise = (ex: ExerciseWithEquipment, extraSets = 0) => {
      if (addedIds.has(ex.id)) return;
      addedIds.add(ex.id);
      usedAccessoryIds.add(ex.id);

      const targetTrend = ex.strengthTargetKey
        ? trend.trends.find((t) => t.key === ex.strengthTargetKey)
        : undefined;
      const isBehind = targetTrend?.status === "behind";

      let sets = ex.defaultSetsRepsScheme.sets + extraSets + (isBehind ? 1 : 0);
      let intensityNote: string | undefined;

      if (deloadWeek) {
        sets = Math.max(1, Math.round(sets * 0.6));
        intensityNote = "Deload week — reduce load ~40% and focus on form.";
      } else if (isBehind) {
        intensityNote = `Behind pace on ${targetTrend?.label} — extra set added.`;
      } else if (targetTrend?.status === "ahead") {
        intensityNote = "Ahead of pace — hold steady, no need to push harder.";
      }

      exercises.push({
        exerciseId: ex.id,
        name: ex.name,
        sets,
        repsLow: ex.defaultSetsRepsScheme.repsLow,
        repsHigh: ex.defaultSetsRepsScheme.repsHigh,
        intensityNote,
      });
    };

    // Guarantee exercises linked to active strength targets appear first.
    const priorityExercises = candidates.filter((ex) => ex.strengthTargetKey);
    for (const ex of priorityExercises) {
      const targetTrend = trend.trends.find((t) => t.key === ex.strengthTargetKey);
      if (targetTrend) addExercise(ex);
    }

    // Fill remaining slots with compound movements first, then accessories, rotated by
    // week number AND day index — the latter keeps repeated focuses in the same week
    // (e.g. two "Upper" days in a 4-day split) from picking identical accessories.
    const rest = candidates
      .filter((ex) => !addedIds.has(ex.id))
      .sort((a, b) => Number(b.isCompound) - Number(a.isCompound));

    const targetSlotCount = focus === "Full Body" ? 5 : 4;
    const offset = (ctx.weekNumber + dayIndex * 2) % Math.max(1, rest.length);
    for (let i = 0; i < rest.length && exercises.length < targetSlotCount; i++) {
      const ex = rest[(i + offset) % rest.length];
      addExercise(ex);
    }

    // One core exercise per day, rotated by day index + week number.
    if (coreExercises.length > 0) {
      const core = coreExercises[(dayIndex + ctx.weekNumber) % coreExercises.length];
      addExercise(core);
    }

    // Extend conditioning when behind on weight/body-fat goals.
    const weightOrFatBehind = trend.trends.some(
      (t) => (t.key === "weight" || t.key === "bodyFatPct") && t.status === "behind"
    );
    if (weightOrFatBehind && cardioExercises.length > 0) {
      const cardio = cardioExercises[(dayIndex + ctx.weekNumber) % cardioExercises.length];
      addExercise(cardio);
    }

    return { focus, exercises };
  }

  private buildRationale(trend: ReturnType<typeof analyzeTrend>, deloadWeek: boolean): string {
    if (deloadWeek) {
      return "Three consecutive weeks behind pace — this week is a planned deload (~40% volume cut) before resuming progression.";
    }

    const behind = trend.trends.filter((t) => t.status === "behind");
    const ahead = trend.trends.filter((t) => t.status === "ahead");

    if (behind.length > 0) {
      const parts = behind.map((t) => {
        const diff = Math.abs((t.actual ?? t.start) - t.expected).toFixed(1);
        return `${t.label} is ${diff}${t.unit ?? ""} behind trajectory`;
      });
      return `${parts.join("; ")} — added extra volume/sessions to catch up.`;
    }

    if (ahead.length > 0) {
      return `Ahead of pace on ${ahead.map((t) => t.label).join(", ")} — holding volume steady this week.`;
    }

    return "On track across all goals — following the standard progression.";
  }
}
