import Link from "next/link";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { getRoutineHistory } from "@/lib/actions/routines";
import { GenerateRoutineButton } from "@/components/routine/GenerateRoutineButton";
import { RoutineCard } from "@/components/routine/RoutineCard";
import { Button } from "@/components/ui/button";

export default async function RoutinePage() {
  const [activeGoal] = await db.select().from(goals).where(eq(goals.status, "active")).limit(1);

  if (!activeGoal) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">No active goal yet</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Set a 12-week goal first — the routine generator adapts to it.
        </p>
        <Button nativeButton={false} render={<Link href="/goals" />}>
          Set a goal
        </Button>
      </div>
    );
  }

  const history = await getRoutineHistory();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Routine</h1>
          <p className="text-muted-foreground text-sm">
            Generated weekly, using only your listed equipment.
          </p>
        </div>
        <GenerateRoutineButton />
      </div>

      {history.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No routine generated yet — click &quot;Generate this week&apos;s routine&quot; above.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {history.map((routine) => (
          <RoutineCard
            key={routine.id}
            weekNumber={routine.weekNumber}
            trendStatus={routine.trendStatus}
            rationale={routine.rationale}
            days={routine.days}
          />
        ))}
      </div>
    </div>
  );
}
