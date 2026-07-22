import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic();
// web_search_20260209 requires a search-capable model (Opus 4.8/4.7/4.6, Sonnet 5, Sonnet
// 4.6) — Haiku 4.5 doesn't support it, so this can't default to the cheaper model used
// elsewhere. Runs at most once per exercise ever (cached on the exercises row), so the cost
// difference is negligible.
const MODEL = process.env.EXERCISE_DEMO_MODEL ?? "claude-opus-4-8";

export type ExerciseDemo = { steps: string[]; videoUrl: string | null };

const outputFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      steps: { type: "array", items: { type: "string" } },
      videoUrl: { type: "string" },
    },
    required: ["steps"],
    additionalProperties: false,
  },
};

function lastTextBlock(content: Anthropic.Message["content"]): string | undefined {
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block.type === "text") return block.text;
  }
  return undefined;
}

function buildPrompt(exerciseName: string, equipmentName?: string): string {
  const equipmentLine = equipmentName
    ? `The user will perform this on their actual gym's equipment: "${equipmentName}".`
    : "";
  return (
    `Task: write a short technique breakdown for the exercise "${exerciseName}" and, if you can ` +
    "find one via web search, a real, currently-accessible demonstration video URL.\n" +
    `${equipmentLine}\n` +
    "Write 3-6 short, coach-voiced steps covering setup, the movement itself, and tempo/breathing " +
    "cues — the kind of concrete guidance a good in-person trainer gives before a set. " +
    "Search the web for one real, reputable demonstration video for this specific exercise " +
    "(a well-known fitness channel or exercise database). Only include a videoUrl if you found a " +
    "specific, confident match — omit it entirely rather than guessing or inventing a URL."
  );
}

async function generateCombined(exerciseName: string, equipmentName?: string): Promise<ExerciseDemo | null> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages: [{ role: "user", content: buildPrompt(exerciseName, equipmentName) }],
      output_config: { format: outputFormat },
    });

    if (response.stop_reason === "pause_turn") return null;

    const text = lastTextBlock(response.content);
    if (!text) return null;

    const parsed = JSON.parse(text) as { steps?: string[]; videoUrl?: string };
    if (!parsed.steps || parsed.steps.length === 0) return null;

    return { steps: parsed.steps, videoUrl: parsed.videoUrl ?? null };
  } catch {
    return null;
  }
}

async function generateStepsOnly(exerciseName: string, equipmentName?: string): Promise<ExerciseDemo> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(exerciseName, equipmentName) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { steps: { type: "array", items: { type: "string" } } },
          required: ["steps"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = lastTextBlock(response.content);
  const parsed = text ? (JSON.parse(text) as { steps?: string[] }) : {};
  return { steps: parsed.steps ?? [], videoUrl: null };
}

/**
 * Technique steps and a demo video link are static reference content for a given exercise —
 * they don't change by user or week — so this is generated once ever and cached on the
 * `exercises` row. Every call after the first is an instant DB read.
 */
export async function getExerciseDemo(exerciseId: number, equipmentName?: string): Promise<ExerciseDemo> {
  const [existing] = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
  if (!existing) throw new Error("Exercise not found");
  if (existing.demoSteps) {
    return { steps: existing.demoSteps, videoUrl: existing.demoVideoUrl ?? null };
  }

  let demo = await generateCombined(existing.name, equipmentName);
  if (!demo) demo = await generateCombined(existing.name, equipmentName);
  if (!demo) demo = await generateStepsOnly(existing.name, equipmentName);

  await db
    .update(exercises)
    .set({ demoSteps: demo.steps, demoVideoUrl: demo.videoUrl })
    .where(eq(exercises.id, exerciseId));

  return demo;
}
