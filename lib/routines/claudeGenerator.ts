import Anthropic from "@anthropic-ai/sdk";
import { COACH_SYSTEM_PROMPT, DAILY_WORKOUT_TASK } from "@/lib/coach/persona";
import { analyzeTrend } from "@/lib/routines/trendAnalysis";
import { buildDaySlots, dayTypeLabel } from "@/lib/routines/daySlots";
import type {
  RoutineGenerator,
  RoutineContext,
  GeneratedRoutine,
  GeneratedRoutineDay,
} from "@/lib/routines/types";

const client = new Anthropic();
// Routine generation runs weekly (unlike goal review, which is infrequent) and, in
// side-by-side testing, Haiku correctly respected the equipment-only constraint and
// applied progressive overload accurately — so it defaults to the cheaper model here.
const MODEL = process.env.ROUTINE_MODEL ?? "claude-haiku-4-5";

const outputFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      rationale: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dayOfWeek: { type: "integer" },
            coachNote: { type: "string" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  exerciseId: { type: "integer" },
                  sets: { type: "integer" },
                  repsLow: { type: "integer" },
                  repsHigh: { type: "integer" },
                  targetWeightKg: { type: "number" },
                  restSeconds: { type: "integer" },
                  intensityNote: { type: "string" },
                },
                required: ["exerciseId", "sets", "repsLow", "repsHigh", "restSeconds"],
                additionalProperties: false,
              },
            },
          },
          required: ["dayOfWeek", "exercises"],
          additionalProperties: false,
        },
      },
    },
    required: ["rationale", "days"],
    additionalProperties: false,
  },
};

type RawDay = {
  dayOfWeek: number;
  coachNote?: string;
  exercises: {
    exerciseId: number;
    sets: number;
    repsLow: number;
    repsHigh: number;
    targetWeightKg?: number;
    restSeconds: number;
    intensityNote?: string;
  }[];
};

export class ClaudeRoutineGenerator implements RoutineGenerator {
  async generate(ctx: RoutineContext): Promise<GeneratedRoutine> {
    const today = new Date().toISOString().slice(0, 10);
    const trend = analyzeTrend(ctx.goal, ctx.recentMetrics, today);
    const slots = buildDaySlots(ctx);

    const daySlotPayload = slots.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      dayType: slot.dayType,
      label: slot.zoneName ?? dayTypeLabel(slot.dayType),
      allowedExerciseIds: slot.available.map((ex) => ex.id),
      allowedExerciseCatalog: slot.available.map((ex) => ({
        id: ex.id,
        name: ex.name,
        movementPattern: ex.movementPattern,
        muscleGroup: ex.muscleGroup,
        isCompound: ex.isCompound,
        strengthTargetKey: ex.strengthTargetKey,
        defaultSets: ex.defaultSetsRepsScheme,
      })),
    }));

    const previousWeightLines = Object.entries(ctx.previousExerciseWeights).map(([id, kg]) => {
      const ex = ctx.exerciseLibrary.find((e) => e.id === Number(id));
      return `${ex?.name ?? `Exercise #${id}`} (exerciseId ${id}): last prescribed/lifted ${kg}kg`;
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: COACH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            DAILY_WORKOUT_TASK +
            "\n\n" +
            `Week ${ctx.weekNumber} of 12. Training days per week: ${ctx.trainingDaysPerWeek}.\n` +
            `Primary goal: ${ctx.goal.primaryGoal ?? "general fitness"}.\n` +
            `Secondary goal: ${ctx.goal.secondaryGoal ?? "none set"}.\n` +
            `Current trend status: ${trend.status}.\n\n` +
            "This week's day slots (one entry per real calendar day that isn't a rest day — " +
            "produce exactly one output day per slot, matched by dayOfWeek; for 'gym'/'free_weights' " +
            "dayType slots, exerciseId MUST come from that slot's own allowedExerciseIds; for " +
            "'run'/'swim'/'walk' dayType slots, allowedExerciseIds is empty — leave exercises empty and " +
            "write a coachNote instead):\n" +
            JSON.stringify(daySlotPayload) +
            "\n\nPrevious week's prescribed/actual weights (for progressive overload):\n" +
            (previousWeightLines.length > 0
              ? previousWeightLines.join("\n")
              : "None on record — this is a fresh start."),
        },
      ],
      output_config: { format: outputFormat },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }
    const parsed = JSON.parse(textBlock.text) as { rationale: string; days: RawDay[] };

    const exerciseById = new Map(ctx.exerciseLibrary.map((ex) => [ex.id, ex]));
    const rawDayByDayOfWeek = new Map(parsed.days.map((d) => [d.dayOfWeek, d]));

    const days: GeneratedRoutineDay[] = slots.map((slot) => {
      const rawDay = rawDayByDayOfWeek.get(slot.dayOfWeek);
      const allowedIds = new Set(slot.available.map((ex) => ex.id));

      const exercises = (rawDay?.exercises ?? [])
        // Defensive: never trust the model to have honored the per-slot allowed-id list —
        // this is what actually enforces "stay within one zone," not the prompt prose.
        .filter((ex) => allowedIds.has(ex.exerciseId) && exerciseById.has(ex.exerciseId))
        .map((ex) => ({
          exerciseId: ex.exerciseId,
          name: exerciseById.get(ex.exerciseId)!.name,
          sets: ex.sets,
          repsLow: ex.repsLow,
          repsHigh: ex.repsHigh,
          targetWeightKg: ex.targetWeightKg,
          restSeconds: ex.restSeconds,
          intensityNote: ex.intensityNote,
        }));

      return {
        focus: slot.zoneName ?? dayTypeLabel(slot.dayType),
        dayOfWeek: slot.dayOfWeek,
        dayType: slot.dayType,
        zoneId: slot.zoneId,
        coachNote: rawDay?.coachNote,
        exercises,
      };
    });

    return {
      weekNumber: ctx.weekNumber,
      trendStatus: trend.status,
      rationale: parsed.rationale,
      days,
    };
  }
}
