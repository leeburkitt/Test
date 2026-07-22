import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { findExerciseImage } from "@/lib/exercises/exerciseDb";

const client = new Anthropic();
const MODEL = process.env.EXERCISE_DEMO_MODEL ?? "claude-opus-4-8";

export type ExerciseDemo = { steps: string[]; hasImage: boolean };

const outputFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      steps: { type: "array", items: { type: "string" } },
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
    `Task: write a short technique breakdown for the exercise "${exerciseName}".\n` +
    `${equipmentLine}\n` +
    "Write 3-6 short, coach-voiced steps covering setup, the movement itself, and tempo/breathing " +
    "cues — the kind of concrete guidance a good in-person trainer gives before a set."
  );
}

async function generateSteps(exerciseName: string, equipmentName?: string): Promise<string[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(exerciseName, equipmentName) }],
    output_config: { format: outputFormat },
  });

  const text = lastTextBlock(response.content);
  const parsed = text ? (JSON.parse(text) as { steps?: string[] }) : {};
  return parsed.steps ?? [];
}

/** Fetches + caches a demo image on first request; `demoImageAttempted` avoids re-querying
 * ExerciseDB (a metered API) for exercises it already told us it has no good match for. */
async function ensureImageCached(
  exerciseId: number,
  exerciseName: string,
  existing: { demoImage: Buffer | null; demoImageAttempted: boolean }
): Promise<boolean> {
  if (existing.demoImageAttempted) return existing.demoImage != null;

  const found = await findExerciseImage(exerciseName);
  await db
    .update(exercises)
    .set({
      demoImage: found?.buffer ?? null,
      demoImageMimeType: found?.mimeType ?? null,
      demoImageAttempted: true,
    })
    .where(eq(exercises.id, exerciseId));

  return found != null;
}

/**
 * Technique steps and a demo image are static reference content for a given exercise — they
 * don't change by user or week — so both are generated/fetched once ever and cached on the
 * `exercises` row. Every call after the first is an instant DB read.
 */
export async function getExerciseDemo(exerciseId: number, equipmentName?: string): Promise<ExerciseDemo> {
  const [existing] = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
  if (!existing) throw new Error("Exercise not found");

  const [steps, hasImage] = await Promise.all([
    existing.demoSteps
      ? Promise.resolve(existing.demoSteps)
      : generateSteps(existing.name, equipmentName).then(async (generated) => {
          await db.update(exercises).set({ demoSteps: generated }).where(eq(exercises.id, exerciseId));
          return generated;
        }),
    ensureImageCached(exerciseId, existing.name, existing),
  ]);

  return { steps, hasImage };
}
