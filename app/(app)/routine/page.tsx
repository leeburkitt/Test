import Link from "next/link";
import { db } from "@/lib/db/client";
import { goals, settings, gyms } from "@/lib/db/schema";
import type { RoutineDayType } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { getRoutineHistory } from "@/lib/actions/routines";
import { getWeekNumber } from "@/lib/routines/trendAnalysis";
import { RoutineSetupForm } from "@/components/routine/RoutineSetupForm";
import { RoutineCard } from "@/components/routine/RoutineCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEFAULT_DAYS: RoutineDayType[] = Array(7).fill("rest");

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

  const [history, [settingsRow], allGyms] = await Promise.all([
    getRoutineHistory(),
    db.select().from(settings).limit(1),
    db.select({ id: gyms.id, name: gyms.name }).from(gyms),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const currentWeekNumber = getWeekNumber(activeGoal, today);
  const hasCurrentWeekRoutine = history.some((r) => r.weekNumber === currentWeekNumber);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Routine</h1>
        <p className="text-muted-foreground text-sm">
          Tell the Coach your weekly schedule — gym days stay within one equipment zone, using
          only what you&apos;ve listed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This week&apos;s schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <RoutineSetupForm
            initialDays={settingsRow?.weeklySchedule?.days ?? DEFAULT_DAYS}
            initialGymId={settingsRow?.defaultGymId ?? null}
            gyms={allGyms}
            hasCurrentWeekRoutine={hasCurrentWeekRoutine}
          />
        </CardContent>
      </Card>

      {history.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No routine generated yet — set your schedule above and save it.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {history.map((routine) => (
          <RoutineCard
            key={routine.id}
            weekNumber={routine.weekNumber}
            weekStartDate={routine.weekStartDate}
            trendStatus={routine.trendStatus}
            rationale={routine.rationale}
            days={routine.days}
          />
        ))}
      </div>
    </div>
  );
}
