import Anthropic from "@anthropic-ai/sdk";
import { COACH_SYSTEM_PROMPT, GOAL_VALIDATION_TASK } from "@/lib/coach/persona";

const client = new Anthropic();
const MODEL = process.env.COACH_MODEL ?? "claude-opus-4-8";

export type GoalReview = {
  speech: string;
  feasible: boolean;
  conflicts: string[];
  primaryGoal: string;
  secondaryGoal: string;
  suggestedTargets: {
    targetWeight?: number;
    targetBodyFatPct?: number;
    targetWaistCm?: number;
  };
  rationale: string;
};

const outputFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      speech: { type: "string" },
      feasible: { type: "boolean" },
      conflicts: { type: "array", items: { type: "string" } },
      primaryGoal: { type: "string" },
      secondaryGoal: { type: "string" },
      suggestedTargets: {
        type: "object",
        properties: {
          targetWeight: { type: "number" },
          targetBodyFatPct: { type: "number" },
          targetWaistCm: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
      rationale: { type: "string" },
    },
    required: [
      "speech",
      "feasible",
      "conflicts",
      "primaryGoal",
      "secondaryGoal",
      "suggestedTargets",
      "rationale",
    ],
    additionalProperties: false,
  },
};

export type GoalReviewInput = {
  currentWeight: number | null;
  currentBodyFatPct: number | null;
  currentWaistCm: number | null;
  requestedTargetWeight: number | null;
  requestedTargetBodyFatPct: number | null;
  requestedTargetWaistCm: number | null;
};

function describe(value: number | null, unit: string): string {
  return value != null ? `${value}${unit}` : "not provided";
}

export async function reviewGoal(input: GoalReviewInput): Promise<GoalReview> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: COACH_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content:
          GOAL_VALIDATION_TASK +
          "\n\n" +
          `Current weight: ${describe(input.currentWeight, "kg")}\n` +
          `Current body fat: ${describe(input.currentBodyFatPct, "%")}\n` +
          `Current waist: ${describe(input.currentWaistCm, "cm")}\n\n` +
          `Requested target weight: ${describe(input.requestedTargetWeight, "kg")}\n` +
          `Requested target body fat: ${describe(input.requestedTargetBodyFatPct, "%")}\n` +
          `Requested target waist: ${describe(input.requestedTargetWaistCm, "cm")}\n\n` +
          "This is a 12-week goal window. Review these targets, flag any conflicts, set a primary and secondary goal, and give me a realistic suggested set of targets.",
      },
    ],
    output_config: { format: outputFormat },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }
  return JSON.parse(textBlock.text) as GoalReview;
}
