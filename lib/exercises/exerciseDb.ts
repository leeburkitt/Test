const RAPIDAPI_HOST = "exercisedb.p.rapidapi.com";

function headers() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set");
  return { "x-rapidapi-host": RAPIDAPI_HOST, "x-rapidapi-key": key };
}

// ExerciseDB's own naming rarely matches ours verbatim (e.g. our "Barbell Back Squat" vs
// their "barbell full squat") — equipment/brand qualifiers narrow its fuzzy search too much,
// so search on the core movement words and re-score candidates ourselves.
const QUALIFIER_WORDS = new Set([
  "barbell",
  "dumbbell",
  "machine",
  "band",
  "cable",
  "assisted",
  "bodyweight",
  "kettlebell",
  "smith",
  "weighted",
]);

function words(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function searchQuery(exerciseName: string): string {
  const all = words(exerciseName);
  const core = all.filter((w) => !QUALIFIER_WORDS.has(w));
  return (core.length > 0 ? core : all).join(" ");
}

function overlapScore(a: string[], b: string[]): number {
  const bSet = new Set(b);
  return a.filter((w) => bSet.has(w)).length;
}

type Candidate = { id: string; name: string };

async function searchCandidates(query: string): Promise<Candidate[]> {
  const url = `https://${RAPIDAPI_HOST}/exercises/name/${encodeURIComponent(query)}?limit=10`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) return [];
  const data = (await response.json()) as Candidate[];
  return Array.isArray(data) ? data : [];
}

async function fetchImage(exerciseId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const url = `https://${RAPIDAPI_HOST}/image?exerciseId=${exerciseId}&resolution=180`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) return null;
  const mimeType = response.headers.get("content-type") ?? "image/gif";
  if (!mimeType.startsWith("image/")) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, mimeType };
}

/**
 * Best-effort lookup of a real exercise demo image from ExerciseDB. Only claims a match when
 * a candidate shares real vocabulary with our exercise's name — same principle as gym
 * equipment matching: no confident match means no image, not a guess.
 */
export async function findExerciseImage(exerciseName: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const candidates = await searchCandidates(searchQuery(exerciseName));
    if (candidates.length === 0) return null;

    const targetWords = words(exerciseName);
    let best: Candidate | undefined;
    let bestScore = 0;
    for (const candidate of candidates) {
      const score = overlapScore(targetWords, words(candidate.name));
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) return null;

    return await fetchImage(best.id);
  } catch {
    return null;
  }
}
