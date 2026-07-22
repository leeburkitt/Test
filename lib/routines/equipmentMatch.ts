import type { Equipment, ExerciseWithEquipment } from "@/lib/routines/types";

const STOP_WORDS = new Set(["the", "a", "an", "machine", "press", "of", "technogym"]);

function significantWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const word of a) if (b.has(word)) score++;
  return score;
}

/**
 * Picks the specific piece of equipment (e.g. the real "Leg Press Machine" scanned into a
 * zone) that best matches a prescribed exercise (e.g. "Leg Press"), so a session can show the
 * user the actual machine they're about to use rather than just its category.
 */
export function pickEquipmentForExercise(
  ex: ExerciseWithEquipment,
  pool: Equipment[]
): Equipment | undefined {
  if (ex.requiredCategories.length === 0) return undefined;

  const candidates = pool.filter((e) => ex.requiredCategories.includes(e.category));
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  // With multiple same-category candidates, only claim a specific match when there's real
  // evidence for it (a shared word) — e.g. don't show a "Chest Press" photo for a "Leg Press"
  // exercise just because it's the first machine in the zone. No match means no photo, which
  // is more honest than confidently pointing at the wrong equipment.
  const exerciseWords = significantWords(ex.name);
  let best: Equipment | undefined;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = overlapScore(exerciseWords, significantWords(candidate.name));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}
