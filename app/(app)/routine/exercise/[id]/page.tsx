import { notFound } from "next/navigation";
import { getExerciseSession } from "@/lib/actions/routines";
import { ExerciseSession } from "@/components/routine/ExerciseSession";

export const dynamic = "force-dynamic";

export default async function ExerciseSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getExerciseSession(Number(id));
  if (!session) notFound();

  return <ExerciseSession data={session} />;
}
